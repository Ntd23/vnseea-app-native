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

import React, { useCallback, useState } from 'react';
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
import { Camera, ImagePlus, Trash2, Video as VideoIcon, X } from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { useCreateStoryViewModel } from '../../application/view-models/useCreateStoryViewModel';
import { storyCreatedEvents } from '../../application/events/storyCreatedEvents';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type {
  StoryMediaUpload,
  StoryItem,
} from '../../domain/types/stories.types';

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

function CreateStoryScreen() {
  const navigation = useNavigation<Nav>();
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
        const now = Math.floor(Date.now() / 1000);
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
          postedAt: now,
          expiresAt: now + 60 * 60 * 24,
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

  // Local picker — we DON'T need camera here; the library picker covers
  // both image and video selection. (Camera launch was a planned Phase 2
  // extension but the WoWonder web composer also doesn't have it.)
  const handlePickImage = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo' as MediaType,
      selectionLimit: 1,
      quality: 0.8,
      includeBase64: false,
    });
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert('Không mở được thư viện', result.errorMessage ?? '');
      return;
    }
    const asset = result.assets?.[0];
    if (!asset) return;
    const upload = assetToUpload(asset, 'image');
    if (upload) vm.setMedia(upload);
  }, [vm]);

  const handlePickVideo = useCallback(async () => {
    // Note: `durationLimit` only applies to the CAMERA picker on Android.
    // For library picks we rely on the view-model's validate() to reject
    // videos longer than `maxVideoDurationSeconds` after the user picks.
    const result = await launchImageLibrary({
      mediaType: 'video' as MediaType,
      selectionLimit: 1,
      includeBase64: false,
    });
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert('Không mở được thư viện', result.errorMessage ?? '');
      return;
    }
    const asset = result.assets?.[0];
    if (!asset) return;
    const upload = assetToUpload(asset, 'video');
    if (upload) vm.setMedia(upload);
  }, [vm]);

  const handleSubmit = useCallback(async () => {
    const result = await vm.submit();
    if (result) {
      // Tiny success toast then dismiss. Using Alert is cheap and
      // consistent with the rest of the create-* screens.
      Alert.alert('Đã đăng tin', result.message);
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
      'Bỏ tin?',
      'Bạn sẽ mất nội dung đã chọn.',
      [
        { text: 'Tiếp tục', style: 'cancel' },
        {
          text: 'Bỏ',
          style: 'destructive',
          onPress: () => {
            vm.reset();
            navigation.goBack();
          },
        },
      ],
      { cancelable: true },
    );
  }, [navigation, vm]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <View className="h-14 flex-row items-center justify-between border-b border-slate-200 px-3">
        <TouchableOpacity
          onPress={handleDiscard}
          activeOpacity={0.7}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <X size={26} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-heading">Tạo tin</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!vm.canSubmit}
          activeOpacity={0.7}
          className={
            vm.canSubmit
              ? 'rounded-full bg-blue-600 px-4 py-2'
              : 'rounded-full bg-slate-200 px-4 py-2'
          }
        >
          {vm.isUploading ? (
            <ActivityIndicator color={vm.canSubmit ? '#FFFFFF' : '#94A3B8'} />
          ) : (
            <Text
              style={{
                color: vm.canSubmit ? '#FFFFFF' : '#94A3B8',
                fontWeight: '700',
              }}
            >
              Đăng
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* ── Media area ─────────────────────────────────────────── */}
        {vm.media ? (
          <View style={{ position: 'relative' }}>
            {vm.media.fileType === 'image' ? (
              <Image
                source={{ uri: vm.media.uri }}
                style={{
                  width: '100%',
                  height: 480,
                  backgroundColor: '#0F172A',
                }}
                resizeMode="contain"
              />
            ) : (
              <View
                style={{
                  width: '100%',
                  height: 480,
                  backgroundColor: '#000',
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
                top: 12,
                right: 12,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.55)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          // Empty state — two big tappable cards for image vs video.
          // Mirrors the FB Stories first-time UX: explicit choice, no
          // hidden camera button to discover.
          <View className="px-5 pt-8">
            <Text className="mb-1 text-center text-heading">
              Chia sẻ khoảnh khắc của bạn
            </Text>
            <Text className="mb-6 text-center text-caption-secondary">
              Tin sẽ tự động ẩn sau 24 giờ
            </Text>

            <TouchableOpacity
              onPress={handlePickImage}
              activeOpacity={0.85}
              className="mb-3 flex-row items-center rounded-2xl bg-blue-50 p-5"
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#3B82F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ImagePlus size={22} color="#fff" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-title-primary">Chọn ảnh</Text>
                <Text className="text-caption-secondary">
                  Từ thư viện của bạn
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickVideo}
              activeOpacity={0.85}
              className="flex-row items-center rounded-2xl bg-purple-50 p-5"
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#8B5CF6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <VideoIcon size={22} color="#fff" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-title-primary">Chọn video</Text>
                <Text className="text-caption-secondary">
                  Tối đa {vm.maxVideoDurationSeconds} giây
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Caption inputs (only when media is picked) ─────────── */}
        {vm.media ? (
          <View className="px-4 pt-4">
            <TextInput
              value={vm.title}
              onChangeText={vm.setTitle}
              placeholder="Tiêu đề (tuỳ chọn)"
              placeholderTextColor="#94A3B8"
              maxLength={vm.maxTitleLength}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: '#F1F5F9',
                fontSize: 15,
                color: '#0F172A',
                marginBottom: 10,
              }}
            />
            <TextInput
              value={vm.description}
              onChangeText={vm.setDescription}
              placeholder={`Mô tả (tuỳ chọn, ${vm.minDescriptionLength}–${vm.maxDescriptionLength} ký tự)`}
              placeholderTextColor="#94A3B8"
              maxLength={vm.maxDescriptionLength}
              multiline
              textAlignVertical="top"
              style={{
                paddingHorizontal: 14,
                paddingTop: 12,
                paddingBottom: 12,
                borderRadius: 12,
                backgroundColor: '#F1F5F9',
                fontSize: 15,
                color: '#0F172A',
                minHeight: 80,
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
