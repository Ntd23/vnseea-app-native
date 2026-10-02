// Description: Facebook-style "Create Story" composer.
//
// Layout (two states):
//
//   EMPTY (no media yet):
//   ┌────────────────────────────────┐
//   │ X        Tạo tin               │
//   ├────────────────────────────────┤
//   │                                │
//   │   Hai nút lớn: Ảnh / Video     │
//   │                                │
//   └────────────────────────────────┘
//
//   EDITOR (media picked): full-screen StoryEditor — the photo or video
//   plays behind a tool rail (stickers, text, mention, filter, link) whose
//   items can be dragged, pinched and rotated; "Chia sẻ" posts the story.
//
// On submit success we emit through `storyCreatedEvents` so the FeedScreen
// can prepend the new story to its rail (Phase 3 wires that listener).

import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  launchImageLibrary,
  type Asset,
  type MediaType,
} from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, ImagePlus, ShieldCheck, Video as VideoIcon, X } from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { useCreateStoryViewModel } from '../../application/view-models/useCreateStoryViewModel';
import { storyCreatedEvents } from '../../application/events/storyCreatedEvents';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type {
  CreateStoryDraft,
  StoryMediaUpload,
  StoryItem,
} from '../../domain/types/stories.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { showSnackbar as showToast } from '../../../shared-kernel/presentation/components/Snackbar';
import { showSystemActionSheet } from '../../../shared-kernel/presentation/utils/systemActionSheet';
import type { ContentAudience } from '../../../shared-kernel/domain/types/contentAudience';
import { StoryEditor } from '../components/overlay/StoryEditor';

const STORY_AUDIENCES: ContentAudience[] = ['public', 'friends', 'followers', 'only_me'];

type Nav = NativeStackNavigationProp<RootStackParamList>;

// react-native-image-picker tolerates some MIME-less Android assets, so
// we provide sensible defaults the same way CreatePostScreen does.
function assetToUpload(
  asset: Asset,
  fileType: 'image' | 'video',
): StoryMediaUpload | null {
  if (!asset.uri) return null;
  const uri =
    Platform.OS === 'android' && !asset.uri.startsWith('file://')
      ? `file://${asset.uri}`
      : asset.uri;
  const defaultExt = fileType === 'video' ? 'mp4' : 'jpg';
  const defaultMime = fileType === 'video' ? 'video/mp4' : 'image/jpeg';
  return {
    uri,
    name: asset.fileName ?? `story-${Date.now()}.${defaultExt}`,
    type: asset.type ?? defaultMime,
    fileType,
    width: asset.width,
    height: asset.height,
    durationSeconds: asset.duration,
  };
}

const CREATE_STORY_COPY = {
  vi: {
    headerTitle: 'Tạo tin',
    illustrationTitle: 'Chia sẻ khoảnh khắc của bạn',
    illustrationDesc: 'Tạo tin ảnh hoặc video.\nTin sẽ tự động biến mất sau 24 giờ.',
    selectPhoto: 'Chọn ảnh',
    selectPhotoDesc: 'Từ thư viện ảnh\ncủa bạn',
    selectVideo: 'Chọn video',
    selectVideoDesc: 'Tối đa {duration} giây',
    securityBanner: 'Tin của bạn được bảo mật và chỉ hiển thị trong 24 giờ.',
    discardTitle: 'Bỏ tin?',
    discardMsg: 'Bạn sẽ mất nội dung đã chọn.',
    continue: 'Tiếp tục',
    discard: 'Bỏ',
    publishedMsg: 'Đã đăng tin',
    libraryError: 'Không mở được thư viện',
    audience: 'Ai có thể xem tin này?',
    audiences: { public: 'Công khai', friends: 'Bạn bè', followers: 'Người theo dõi', only_me: 'Chỉ mình tôi' },
  },
  en: {
    headerTitle: 'Create Story',
    illustrationTitle: 'Share your moments',
    illustrationDesc: 'Create a photo or video story.\nStory will automatically disappear after 24 hours.',
    selectPhoto: 'Select photo',
    selectPhotoDesc: 'From your photo\nlibrary',
    selectVideo: 'Select video',
    selectVideoDesc: 'Up to {duration} seconds',
    securityBanner: 'Your story is secure and only visible for 24 hours.',
    discardTitle: 'Discard story?',
    discardMsg: 'You will lose the selected content.',
    continue: 'Continue',
    discard: 'Discard',
    publishedMsg: 'Story published',
    libraryError: 'Cannot open library',
    audience: 'Who can see this story?',
    audiences: { public: 'Public', friends: 'Friends', followers: 'Followers', only_me: 'Only me' },
  },
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ScaleButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
  activeOpacity?: number;
  className?: string;
}

function ScaleButton({
  children,
  onPress,
  style,
  disabled,
  activeOpacity = 0.8,
  ...props
}: ScaleButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  }, [scale]);

  return (
    <AnimatedTouchableOpacity
      activeOpacity={activeOpacity}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      style={[style, { transform: [{ scale }] }]}
      {...props}
    >
      {children}
    </AnimatedTouchableOpacity>
  );
}

/**
 * Builds an optimistic `StoryItem` so the home rail can prepend without
 * waiting for a refetch. We DON'T have the canonical server response shape —
 * just an id — so we synthesise from the cached profile + the local draft. The
 * next reload will overwrite this with the authoritative version.
 */
function emitOptimisticStory(
  storyId: string,
  draft: Pick<CreateStoryDraft, 'media' | 'title' | 'description' | 'overlay'>,
) {
  const profile = sessionStorage.getUserProfile();
  const sessionUserId = sessionStorage.getSession()?.userId;
  if (!sessionUserId) return;
  const optimistic: StoryItem = {
    id: storyId,
    publisher: {
      userId: sessionUserId,
      username: profile?.username ?? '',
      name: profile?.name ?? 'Bạn',
      avatarUrl: profile?.avatarUrl,
      isVerified: false,
    },
    title: draft.title,
    description: draft.description,
    postedAt: Math.floor(Date.now() / 1000), // CRITICAL: Always use current timestamp
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    thumbnailUrl: draft.media.uri, // local URI — replaced on next fetch
    media: [
      {
        id: `local-${Date.now()}`,
        type: draft.media.fileType,
        url: draft.media.uri,
        overlay: draft.overlay,
      },
    ],
    isOwner: true,
    isViewed: false,
    hasUnseen: true,
    myReaction: null,
    reactionCount: 0,
  };
  storyCreatedEvents.emit(optimistic);
}

function CreateStoryScreen() {
  const navigation = useNavigation<Nav>();
  const language = useAppLanguage();
  const copy = useMemo(() => CREATE_STORY_COPY[language], [language]);

  const vm = useCreateStoryViewModel({
    onCreated: result => {
      if (vm.media && result.storyId) {
        emitOptimisticStory(result.storyId, {
          media: vm.media,
          title: vm.title.trim() || undefined,
          description: vm.description.trim() || undefined,
          overlay: vm.overlay,
        });
      }
    },
    // A video story on Bunny Stream only exists once its video is encoded.
    onPublishedInBackground: (storyId, draft) => emitOptimisticStory(storyId, draft),
  });

  // Animation for mounting empty state layout elements
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!vm.media) {
      animValue.setValue(0);
      Animated.spring(animValue, {
        toValue: 1,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [vm.media, animValue]);

  // Local picker — we DON'T need camera here; the library picker covers
  // both image and video selection.
  const handlePickImage = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo' as MediaType,
      selectionLimit: 1,
      quality: 0.8,
      includeBase64: false,
    });
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert(copy.libraryError, result.errorMessage ?? '');
      return;
    }
    const asset = result.assets?.[0];
    if (!asset) return;
    const upload = assetToUpload(asset, 'image');
    if (upload) vm.setMedia(upload);
  }, [vm, copy]);

  const handlePickVideo = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'video' as MediaType,
      selectionLimit: 1,
      includeBase64: false,
    });
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert(copy.libraryError, result.errorMessage ?? '');
      return;
    }
    const asset = result.assets?.[0];
    if (!asset) return;
    const upload = assetToUpload(asset, 'video');
    if (upload) vm.setMedia(upload);
  }, [vm, copy]);

  const handleSubmit = useCallback(async () => {
    const result = await vm.submit();
    if (result) {
      showToast({
        message: result.message || 'Tin của bạn đã được đăng lên thành công!',
        type: 'success',
      });
      navigation.goBack();
    }
  }, [navigation, vm]);

  const handleChooseAudience = useCallback(() => {
    showSystemActionSheet({
      title: copy.audience,
      options: STORY_AUDIENCES.map(audience => ({
        label: copy.audiences[audience],
      })),
      cancelLabel: copy.continue,
    })
      .then(index => {
        if (index !== null) vm.setAudience(STORY_AUDIENCES[index]);
      })
      .catch(() => undefined);
  }, [copy, vm]);

  const handleDiscard = useCallback(() => {
    const hasContent = vm.media !== null;
    if (!hasContent) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      copy.discardTitle,
      copy.discardMsg,
      [
        { text: copy.continue, style: 'cancel' },
        {
          text: copy.discard,
          style: 'destructive',
          onPress: () => {
            vm.reset();
            navigation.goBack();
          },
        },
      ],
      { cancelable: true },
    );
  }, [navigation, vm, copy]);

  const introTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  const introOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const cardsScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  if (vm.media) {
    return (
      <StoryEditor
        media={vm.media}
        overlay={vm.overlay}
        onChangeOverlay={vm.setOverlay}
        audience={vm.audience}
        audienceLabel={copy.audiences[vm.audience]}
        onPressAudience={handleChooseAudience}
        isSharing={vm.isUploading}
        onShare={handleSubmit}
        onBack={handleDiscard}
        errorMessage={vm.error}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#ffffff' }} edges={['top']}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <View
        className="h-14 flex-row items-center justify-between border-b px-4"
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#f1f5f9',
          position: 'relative',
        }}
      >
        <ScaleButton
          onPress={handleDiscard}
          activeOpacity={0.7}
          className="h-10 w-10 items-center justify-center rounded-full border border-slate-200"
          style={{ backgroundColor: '#f1f5f9' }}
        >
          <X size={20} color="#334155" strokeWidth={2.5} />
        </ScaleButton>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>
          {copy.headerTitle}
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Media pickers (the editor takes over once media is picked) ── */}
          <View style={{ paddingTop: 10 }}>
            {/* Overlapping cards illustration */}
            <Animated.View
              style={{
                height: 160,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 24,
                marginBottom: 24,
                position: 'relative',
                opacity: introOpacity,
                transform: [{ scale: cardsScale }]
              }}
            >
              {/* Purple video card (back right, tilted) */}
              <View
                style={{
                  width: 100,
                  height: 130,
                  borderRadius: 16,
                  backgroundColor: '#f3e8ff',
                  borderWidth: 2,
                  borderColor: '#e9d5ff',
                  position: 'absolute',
                  transform: [{ rotate: '15deg' }, { translateX: 20 }, { translateY: -5 }],
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#8b5cf6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#c084fc', alignItems: 'center', justifyContent: 'center' }}>
                  <VideoIcon size={16} color="#ffffff" fill="#ffffff" />
                </View>
              </View>

              {/* Brand photo card (front left, tilted) */}
              <View
                style={{
                  width: 100,
                  height: 130,
                  borderRadius: 16,
                  backgroundColor: APP_COLORS.brand.soft,
                  borderWidth: 2,
                  borderColor: APP_COLORS.brand.border,
                  position: 'absolute',
                  transform: [{ rotate: '-12deg' }, { translateX: -22 }, { translateY: 5 }],
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: APP_COLORS.brand.shadow,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <ImagePlus size={36} color={APP_BRAND_COLOR} strokeWidth={1.8} />
              </View>

              {/* Tiny sparkles/stars around */}
              {/* Top-left Sparkle */}
              <View style={{ position: 'absolute', top: 12, left: '30%' }}>
                <Text style={{ fontSize: 16, color: APP_COLORS.brand.primary }}>✦</Text>
              </View>
              {/* Top-right Sparkle */}
              <View style={{ position: 'absolute', top: 20, right: '32%' }}>
                <Text style={{ fontSize: 20, color: APP_COLORS.brand.onPrimaryMuted }}>✦</Text>
              </View>
              {/* Bottom-left Sparkle */}
              <View style={{ position: 'absolute', bottom: 18, left: '26%' }}>
                <Text style={{ fontSize: 18, color: APP_COLORS.brand.border }}>✦</Text>
              </View>
              {/* Far Right tiny Sparkle */}
              <View style={{ position: 'absolute', bottom: 35, right: '28%' }}>
                <Text style={{ fontSize: 12, color: APP_COLORS.brand.softPressed }}>✦</Text>
              </View>
            </Animated.View>

            {/* Intro text */}
            <Animated.View style={{ opacity: introOpacity, transform: [{ translateY: introTranslateY }], paddingHorizontal: 20, marginBottom: 32 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' }}>
                {copy.illustrationTitle}
              </Text>
              <Text style={{ fontSize: 14.5, color: '#64748b', textAlign: 'center', lineHeight: 22 }}>
                {copy.illustrationDesc}
              </Text>
            </Animated.View>

            {/* Two Side-by-Side Choose Media Cards */}
            <Animated.View
              style={{
                flexDirection: 'row',
                gap: 16,
                paddingHorizontal: 20,
                marginBottom: 32,
                opacity: introOpacity,
                transform: [{ scale: cardsScale }]
              }}
            >
              {/* Choose Photo Card */}
              <TouchableOpacity
                onPress={handlePickImage}
                activeOpacity={0.9}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 24,
                  padding: 20,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 220,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.04,
                  shadowRadius: 10,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: '#f1f5f9',
                }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: APP_COLORS.brand.soft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <ImagePlus size={28} color={APP_BRAND_COLOR} strokeWidth={2} />
                </View>
                <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6, textAlign: 'center' }}>
                    {copy.selectPhoto}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 16 }}>
                    {copy.selectPhotoDesc}
                  </Text>
                </View>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: APP_COLORS.brand.soft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronRight size={16} color={APP_BRAND_COLOR} strokeWidth={2.5} />
                </View>
              </TouchableOpacity>

              {/* Choose Video Card */}
              <TouchableOpacity
                onPress={handlePickVideo}
                activeOpacity={0.9}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 24,
                  padding: 20,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 220,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.04,
                  shadowRadius: 10,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: '#f1f5f9',
                }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: '#faf5ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <VideoIcon size={28} color="#7c3aed" strokeWidth={2} />
                </View>
                <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6, textAlign: 'center' }}>
                    {copy.selectVideo}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 16 }}>
                    {copy.selectVideoDesc.replace('{duration}', String(vm.maxVideoDurationSeconds))}
                  </Text>
                </View>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#faf5ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronRight size={16} color="#7c3aed" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Security Banner */}
            <Animated.View style={{ opacity: introOpacity, paddingHorizontal: 20, marginBottom: 20 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderWidth: 1,
                  borderColor: '#f1f5f9',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: APP_COLORS.brand.soft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <ShieldCheck size={20} color={APP_BRAND_COLOR} strokeWidth={2} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 12.5,
                    fontWeight: '500',
                    color: '#475569',
                    lineHeight: 17,
                  }}
                >
                  {copy.securityBanner}
                </Text>
                <ChevronRight size={16} color="#94a3b8" strokeWidth={2} />
              </View>
            </Animated.View>
          </View>

        {/* ── Error banner ───────────────────────────────────────── */}
        {vm.error ? (
          <View className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2">
            <Text style={{ color: APP_COLORS.status.error, fontSize: 13 }}>{vm.error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default CreateStoryScreen;
