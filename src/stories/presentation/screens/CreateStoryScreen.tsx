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
//   PREVIEW (media picked):
//   ┌────────────────────────────────┐
//   │ X        Tạo tin       Đăng    │
//   ├────────────────────────────────┤
//   │                                │
//   │   [ full-screen preview ]      │  ← image OR video
//   │                                │
//   ├────────────────────────────────┤
//   │ Tiêu đề (optional)             │
//   │ Mô tả (optional, 10–300 chars) │
//   └────────────────────────────────┘
//
// On submit success we emit through `storyCreatedEvents` so the FeedScreen
// can prepend the new story to its rail (Phase 3 wires that listener).

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import VideoPlayer from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  launchImageLibrary,
  type Asset,
  type MediaType,
} from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, ImagePlus, ShieldCheck, Trash2, Video as VideoIcon, X } from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { useCreateStoryViewModel } from '../../application/view-models/useCreateStoryViewModel';
import { storyCreatedEvents } from '../../application/events/storyCreatedEvents';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type {
  StoryMediaUpload,
  StoryItem,
} from '../../domain/types/stories.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';

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
    publishButton: 'Đăng',
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
    titlePlaceholder: 'Tiêu đề (tuỳ chọn)',
    descPlaceholder: 'Mô tả (tuỳ chọn, {min}–{max} ký tự)',
  },
  en: {
    headerTitle: 'Create Story',
    publishButton: 'Publish',
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
    titlePlaceholder: 'Title (optional)',
    descPlaceholder: 'Description (optional, {min}–{max} characters)',
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

function CreateStoryScreen() {
  const navigation = useNavigation<Nav>();
  const language = useAppLanguage();
  const copy = useMemo(() => CREATE_STORY_COPY[language], [language]);

  const vm = useCreateStoryViewModel({
    onCreated: result => {
      // Build an optimistic `StoryItem` so the home rail can prepend
      // without waiting for a refetch. We DON'T have the canonical
      // server response shape — just an id + message — so we synthesise
      // from the cached profile + the local draft. The next reload will
      // overwrite this with the authoritative version.
      const profile = sessionStorage.getUserProfile();
      const sessionUserId = sessionStorage.getSession()?.userId;
      if (vm.media && result.storyId && sessionUserId) {
        const optimistic: StoryItem = {
          id: result.storyId,
          publisher: {
            userId: sessionUserId,
            username: profile?.username ?? '',
            name: profile?.name ?? 'Bạn',
            avatarUrl: profile?.avatarUrl,
            isVerified: false,
          },
          title: vm.title.trim() || undefined,
          description: vm.description.trim() || undefined,
          postedAt: Math.floor(Date.now() / 1000), // CRITICAL: Always use current timestamp
          expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
          thumbnailUrl: vm.media.uri, // local URI — replaced on next fetch
          media: [
            {
              id: `local-${Date.now()}`,
              type: vm.media.fileType,
              url: vm.media.uri,
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
    },
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
      Alert.alert(copy.publishedMsg, result.message);
      navigation.goBack();
    }
  }, [navigation, vm, copy]);

  const handleDiscard = useCallback(() => {
    const hasContent =
      vm.media !== null || vm.title.length > 0 || vm.description.length > 0;
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
        <ScaleButton
          onPress={handleSubmit}
          disabled={!vm.canSubmit}
          activeOpacity={0.8}
          className="rounded-full px-5 py-2"
          style={{
            backgroundColor: vm.canSubmit ? '#1d4ed8' : '#eff6ff',
          }}
        >
          {vm.isUploading ? (
            <ActivityIndicator color={vm.canSubmit ? '#FFFFFF' : '#93c5fd'} size="small" />
          ) : (
            <Text
              style={{
                color: vm.canSubmit ? '#FFFFFF' : '#93c5fd',
                fontWeight: '700',
                fontSize: 14,
              }}
            >
              {copy.publishButton}
            </Text>
          )}
        </ScaleButton>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Media area ─────────────────────────────────────────── */}
        {vm.media ? (
          /* Preview state */
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <View
              style={{
                position: 'relative',
                borderRadius: 24,
                overflow: 'hidden',
                backgroundColor: '#0f172a',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              {vm.media.fileType === 'image' ? (
                <Image
                  source={{ uri: vm.media.uri }}
                  style={{
                    width: '100%',
                    height: 440,
                  }}
                  resizeMode="contain"
                />
              ) : (
                <View
                  style={{
                    width: '100%',
                    height: 440,
                  }}
                >
                  <VideoPlayer
                    source={{ uri: vm.media.uri }}
                    style={{ width: '100%', height: '100%' }}
                    controls
                    paused={false}
                    resizeMode="contain"
                    repeat
                  />
                </View>
              )}

              {/* Floating delete button to clear the picked media and pick again */}
              <TouchableOpacity
                onPress={() => vm.setMedia(null)}
                activeOpacity={0.85}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Empty state - styled precisely like the mockup */
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

              {/* Blue photo card (front left, tilted) */}
              <View
                style={{
                  width: 100,
                  height: 130,
                  borderRadius: 16,
                  backgroundColor: '#eff6ff',
                  borderWidth: 2,
                  borderColor: '#bfdbfe',
                  position: 'absolute',
                  transform: [{ rotate: '-12deg' }, { translateX: -22 }, { translateY: 5 }],
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <ImagePlus size={36} color="#3b82f6" strokeWidth={1.8} />
              </View>

              {/* Tiny sparkles/stars around */}
              {/* Top-left Sparkle */}
              <View style={{ position: 'absolute', top: 12, left: '30%' }}>
                <Text style={{ fontSize: 16, color: '#93c5fd' }}>✦</Text>
              </View>
              {/* Top-right Sparkle */}
              <View style={{ position: 'absolute', top: 20, right: '32%' }}>
                <Text style={{ fontSize: 20, color: '#c7d2fe' }}>✦</Text>
              </View>
              {/* Bottom-left Sparkle */}
              <View style={{ position: 'absolute', bottom: 18, left: '26%' }}>
                <Text style={{ fontSize: 18, color: '#bfdbfe' }}>✦</Text>
              </View>
              {/* Far Right tiny Sparkle */}
              <View style={{ position: 'absolute', bottom: 35, right: '28%' }}>
                <Text style={{ fontSize: 12, color: '#e0e7ff' }}>✦</Text>
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
                    backgroundColor: '#eff6ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <ImagePlus size={28} color="#1d4ed8" strokeWidth={2} />
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
                    backgroundColor: '#eff6ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronRight size={16} color="#1d4ed8" strokeWidth={2.5} />
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
                    backgroundColor: '#eff6ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <ShieldCheck size={20} color="#1d4ed8" strokeWidth={2} />
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
        )}

        {/* ── Caption inputs (only when media is picked) ─────────── */}
        {vm.media ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <TextInput
              value={vm.title}
              onChangeText={vm.setTitle}
              placeholder={copy.titlePlaceholder}
              placeholderTextColor="#94a3b8"
              maxLength={vm.maxTitleLength}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                fontSize: 15,
                color: '#0f172a',
                marginBottom: 12,
              }}
            />
            <TextInput
              value={vm.description}
              onChangeText={vm.setDescription}
              placeholder={copy.descPlaceholder
                .replace('{min}', String(vm.minDescriptionLength))
                .replace('{max}', String(vm.maxDescriptionLength))}
              placeholderTextColor="#94a3b8"
              maxLength={vm.maxDescriptionLength}
              multiline
              textAlignVertical="top"
              style={{
                paddingHorizontal: 16,
                paddingTop: 14,
                paddingBottom: 14,
                borderRadius: 16,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                fontSize: 15,
                color: '#0f172a',
                minHeight: 100,
                lineHeight: 20,
              }}
            />
          </View>
        ) : null}

        {/* ── Error banner ───────────────────────────────────────── */}
        {vm.error ? (
          <View className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2">
            <Text style={{ color: '#B91C1C', fontSize: 13 }}>{vm.error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default CreateStoryScreen;
