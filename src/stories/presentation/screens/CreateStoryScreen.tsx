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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { ChevronRight, ImagePlus, ShieldCheck, Trash2, Video as VideoIcon, X, ArrowLeft, Plus, Image as LucideImage } from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { useCreateStoryViewModel } from '../../application/view-models/useCreateStoryViewModel';
import { storyCreatedEvents } from '../../application/events/storyCreatedEvents';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type {
  StoryMediaUpload,
  StoryItem,
} from '../../domain/types/stories.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { showToast } from '../../../shared-kernel/presentation/components/ToastNotification';

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
    headerTitle: 'Tạo trạng thái mới',
    publishButton: 'Tạo ra',
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
    descLabel: 'Chuyện gì đang xảy ra',
    mediaLabel: 'Tệp phương tiện',
    mediaPlaceholder: 'Thả hình ảnh và video tại đây HOẶC Duyệt để tải lên',
  },
  en: {
    headerTitle: 'Create new status',
    publishButton: 'Create',
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
    descLabel: 'What is happening',
    mediaLabel: 'Media file',
    mediaPlaceholder: 'Drop images and videos here OR Browse to upload',
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

  // Unified mixed picker that opens library for both images and videos directly
  const handlePickMedia = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'mixed' as MediaType,
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

    // Detect if picked asset is image or video
    const isVideo = asset.type?.startsWith('video/') || 
                    (asset.duration !== undefined && asset.duration > 0) ||
                    /\.(mp4|mov|m4v|3gp|mkv)$/i.test(asset.uri || '');
    const fileType = isVideo ? 'video' : 'image';
    const upload = assetToUpload(asset, fileType);
    if (upload) vm.setMedia(upload);
  }, [vm, copy]);

  const handleSubmit = useCallback(async () => {
    const result = await vm.submit();
    if (result) {
      navigation.goBack();
    }
  }, [navigation, vm]);

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

  // Media press handler
  const handleMediaPress = handlePickMedia;

  // Submit handler with empty media check
  const handleCreatePress = () => {
    if (!vm.media) {
      Alert.alert(
        language === 'vi' ? 'Thông báo' : 'Notice',
        language === 'vi' ? 'Vui lòng chọn hình ảnh hoặc video cho tin!' : 'Please select an image or video for your story!'
      );
      return;
    }
    handleSubmit();
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#ffffff' }} edges={['top']}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <View 
        className="h-14 flex-row items-center border-b px-4"
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#f1f5f9',
        }}
      >
        <TouchableOpacity
          onPress={handleDiscard}
          activeOpacity={0.7}
          style={{
            marginRight: 12,
            padding: 4,
          }}
        >
          <ArrowLeft size={24} color="#334155" />
        </TouchableOpacity>
        
        {/* Blue circular icon with white plus */}
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: '#0000ff',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Plus size={14} color="#ffffff" strokeWidth={3} />
        </View>

        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
          {copy.headerTitle}
        </Text>
      </View>

      {/* Blue Banner strip */}
      <View
        style={{
          height: 12,
          backgroundColor: '#f1f5f9',
          borderBottomWidth: 1,
          borderColor: '#e2e8f0',
        }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Caption Label */}
        <Text
          style={{
            fontSize: 15,
            fontWeight: '800',
            color: '#1e293b',
            marginTop: 24,
            marginBottom: 10,
          }}
        >
          {copy.descLabel}
        </Text>

        {/* Caption Input */}
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
            borderRadius: 12,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#e2e8f0',
            fontSize: 15,
            color: '#0f172a',
            minHeight: 120,
            lineHeight: 20,
          }}
        />

        {/* Media Label */}
        <Text
          style={{
            fontSize: 15,
            fontWeight: '800',
            color: '#1e293b',
            marginTop: 20,
            marginBottom: 10,
          }}
        >
          {copy.mediaLabel}
        </Text>

        {/* Media Picker / Preview */}
        {vm.media ? (
          /* Preview state */
          <View style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', backgroundColor: '#0f172a' }}>
            {vm.media.fileType === 'image' ? (
              <Image
                source={{ uri: vm.media.uri }}
                style={{ width: '100%', height: 200 }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ width: '100%', height: 200 }}>
                <VideoPlayer
                  source={{ uri: vm.media.uri }}
                  style={{ width: '100%', height: '100%' }}
                  controls
                  paused={false}
                  resizeMode="cover"
                  repeat
                />
              </View>
            )}

            {/* Floating delete button */}
            <TouchableOpacity
              onPress={() => vm.setMedia(null)}
              activeOpacity={0.85}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(0,0,0,0.6)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          /* Placeholder button */
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleMediaPress}
            style={{
              height: 200,
              backgroundColor: '#cbd5e1', // Slate background matching screenshot
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <LucideImage size={24} color="#ffffff" />
            </View>
            <Text
              style={{
                color: '#ffffff',
                fontSize: 14,
                fontWeight: '600',
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              {copy.mediaPlaceholder}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Error banner ───────────────────────────────────────── */}
        {vm.error ? (
          <View className="mt-3 rounded-lg bg-red-50 px-3 py-2">
            <Text style={{ color: '#B91C1C', fontSize: 13 }}>{vm.error}</Text>
          </View>
        ) : null}

        {/* Publish/Submit Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleCreatePress}
          disabled={vm.isUploading}
          style={{
            backgroundColor: '#0000ff', // Match bright blue button in screenshot
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 32,
          }}
        >
          {vm.isUploading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>
              {copy.publishButton}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

export default CreateStoryScreen;
