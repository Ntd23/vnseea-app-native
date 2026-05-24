// Description: Facebook-style "Create Post" composer — text + multi-photo +
// privacy + feeling. Wired to /api/new_post via useCreatePostViewModel.
//
// Entry points (both navigate here):
//   • Header "+" button → CreateActionSheet → "Create Post" entry
//   • Home feed "Bạn đang nghĩ gì?" ComposerCard tap
//
// On successful submit we emit a `postCreatedEvents` so the home FeedScreen
// can optimistically prepend the new post and the user lands back on a
// feed that already shows their content.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  launchImageLibrary,
  type Asset,
  type MediaType,
} from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronDown,
  Globe2,
  ImagePlus,
  Lock,
  Smile,
  Users,
  X,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { useCreatePostViewModel } from '../../application/view-models/useCreatePostViewModel';
import { postCreatedEvents } from '../../application/events/postCreatedEvents';
import type {
  PostFeeling,
  PostPhotoAttachment,
  PostPrivacy,
} from '../../domain/types/feed.types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Lookup tables ─────────────────────────────────────────────────────
// Hardcoded here (not in domain) because they're presentational —
// emoji + Vietnamese label only the UI cares about. Maps 1:1 to
// PostPrivacy and PostFeeling.value.

const PRIVACY_OPTIONS: Array<{
  value: PostPrivacy;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  description: string;
}> = [
  {
    value: 'public',
    label: 'Công khai',
    Icon: Globe2,
    description: 'Bất kỳ ai cũng có thể xem',
  },
  {
    value: 'friends',
    label: 'Bạn bè',
    Icon: Users,
    description: 'Chỉ bạn bè của bạn',
  },
  {
    value: 'only_me',
    label: 'Chỉ mình tôi',
    Icon: Lock,
    description: 'Chỉ mình bạn nhìn thấy',
  },
];

// Common Facebook feelings. WoWonder's `feeling_type='feelings'` accepts
// these `value` strings — they're keys into the backend's `feelingIcons`
// table. Add more as needed; deleting one here doesn't affect existing
// posts, just hides it from the picker.
const FEELING_OPTIONS: PostFeeling[] = [
  { type: 'feelings', value: 'happy', emoji: '😊', label: 'vui vẻ' },
  { type: 'feelings', value: 'loved', emoji: '🥰', label: 'được yêu' },
  { type: 'feelings', value: 'sad', emoji: '😢', label: 'buồn' },
  { type: 'feelings', value: 'angry', emoji: '😠', label: 'tức giận' },
  { type: 'feelings', value: 'excited', emoji: '🤩', label: 'phấn khích' },
  { type: 'feelings', value: 'tired', emoji: '😩', label: 'mệt mỏi' },
  { type: 'feelings', value: 'blessed', emoji: '🙏', label: 'biết ơn' },
  { type: 'feelings', value: 'grateful', emoji: '💖', label: 'hạnh phúc' },
  { type: 'feelings', value: 'thoughtful', emoji: '🤔', label: 'suy nghĩ' },
  { type: 'feelings', value: 'cool', emoji: '😎', label: 'ngầu' },
];

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Convert react-native-image-picker `Asset` → our `PostPhotoAttachment`.
 * The picker sometimes omits `fileName` / `type` (especially on Android)
 * so we synthesise sensible defaults — WoWonder rejects uploads with
 * empty filename.
 */
function assetToAttachment(asset: Asset): PostPhotoAttachment | null {
  if (!asset.uri) return null;
  const uri =
    Platform.OS === 'android' && !asset.uri.startsWith('file://')
      ? `file://${asset.uri}`
      : asset.uri;
  // Pick a name + type, falling back to safe defaults.
  const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
  const type = asset.type ?? 'image/jpeg';
  return {
    uri,
    name,
    type,
    width: asset.width,
    height: asset.height,
  };
}

function findPrivacyLabel(value: PostPrivacy) {
  return PRIVACY_OPTIONS.find(opt => opt.value === value) ?? PRIVACY_OPTIONS[0];
}

// ── Sub-components ────────────────────────────────────────────────────

function PrivacyPickerSheet({
  visible,
  current,
  onClose,
  onPick,
}: {
  visible: boolean;
  current: PostPrivacy;
  onClose: () => void;
  onPick: (p: PostPrivacy) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <Pressable onPress={() => {}} className="mt-auto bg-white pt-2 pb-6">
          <View className="mb-2 self-center h-1 w-12 rounded-full bg-slate-300" />
          <Text className="px-5 py-3 text-heading">Đối tượng</Text>
          {PRIVACY_OPTIONS.map(({ value, label, Icon, description }) => {
            const isActive = current === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => {
                  onPick(value);
                  onClose();
                }}
                activeOpacity={0.7}
                className="flex-row items-center px-5 py-3"
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={20} color="#0F172A" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-title-primary">{label}</Text>
                  <Text className="text-caption-secondary">{description}</Text>
                </View>
                {isActive ? (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 6,
                      borderColor: '#0866ff',
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: '#CBD5E1',
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FeelingPickerSheet({
  visible,
  current,
  onClose,
  onPick,
  onClear,
}: {
  visible: boolean;
  current?: PostFeeling;
  onClose: () => void;
  onPick: (f: PostFeeling) => void;
  onClear: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <Pressable onPress={() => {}} className="mt-auto bg-white pt-2 pb-6">
          <View className="mb-2 self-center h-1 w-12 rounded-full bg-slate-300" />
          <View className="flex-row items-center justify-between px-5 py-3">
            <Text className="text-heading">Cảm xúc của bạn</Text>
            {current ? (
              <TouchableOpacity
                onPress={() => {
                  onClear();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text className="text-title-secondary text-brand">Xoá</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView
            horizontal={false}
            contentContainerStyle={{ paddingHorizontal: 12 }}
          >
            <View className="flex-row flex-wrap">
              {FEELING_OPTIONS.map(feeling => {
                const isActive =
                  current?.type === feeling.type &&
                  current?.value === feeling.value;
                return (
                  <TouchableOpacity
                    key={feeling.value}
                    onPress={() => {
                      onPick(feeling);
                      onClose();
                    }}
                    activeOpacity={0.7}
                    style={{ width: '50%' }}
                    className="flex-row items-center p-3"
                  >
                    <Text style={{ fontSize: 28 }}>{feeling.emoji}</Text>
                    <Text
                      className={
                        isActive
                          ? 'ml-3 text-title-primary text-brand'
                          : 'ml-3 text-title-primary'
                      }
                    >
                      {feeling.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PhotoGrid({
  photos,
  onRemove,
}: {
  photos: PostPhotoAttachment[];
  onRemove: (uri: string) => void;
}) {
  if (photos.length === 0) return null;
  // Match Facebook's behaviour: 1 photo → big, 2 → side-by-side,
  // 3+ → 2-column grid with same-size cells. Implementation just uses
  // a 2-column flex-wrap for everything ≥ 2, which is good enough.
  const single = photos.length === 1;
  return (
    <View className="mt-3 flex-row flex-wrap">
      {photos.map(photo => (
        <View
          key={photo.uri}
          style={{
            width: single ? '100%' : '50%',
            aspectRatio: single ? 1 : 1,
            padding: 2,
          }}
        >
          <View
            style={{
              flex: 1,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: '#F1F5F9',
            }}
          >
            <Image
              source={{ uri: photo.uri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={() => onRemove(photo.uri)}
              activeOpacity={0.8}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: 'rgba(0,0,0,0.6)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────

function CreatePostScreen() {
  const navigation = useNavigation<Nav>();
  const vm = useCreatePostViewModel({
    onCreated: post => {
      // Notify FeedScreen so it can optimistically prepend before we
      // pop the stack — by the time the feed re-renders, the new post
      // is already there.
      postCreatedEvents.emit(post);
    },
  });

  // Display name + avatar of the viewer, pulled from MMKV cache. We
  // intentionally do NOT show a loading state here — falling back to
  // "Bạn" + default avatar is fine, the composer must always render
  // instantly.
  const profile = useMemo(() => sessionStorage.getUserProfile(), []);
  const displayName = profile?.name?.trim() || 'Bạn';
  const avatarUrl = profile?.avatarUrl;

  const [privacySheetVisible, setPrivacySheetVisible] = useState(false);
  const [feelingSheetVisible, setFeelingSheetVisible] = useState(false);

  const currentPrivacy = findPrivacyLabel(vm.draft.privacy);

  const handlePickPhotos = useCallback(async () => {
    const remaining = vm.maxPhotos - vm.draft.photos.length;
    if (remaining <= 0) {
      Alert.alert('Đã đạt giới hạn', `Tối đa ${vm.maxPhotos} ảnh.`);
      return;
    }
    const result = await launchImageLibrary({
      mediaType: 'photo' as MediaType,
      selectionLimit: remaining,
      quality: 0.8,
      includeBase64: false,
    });
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert('Không mở được thư viện', result.errorMessage ?? '');
      return;
    }
    const assets = result.assets ?? [];
    const attachments = assets
      .map(assetToAttachment)
      .filter((a): a is PostPhotoAttachment => a !== null);
    if (attachments.length > 0) {
      vm.addPhotos(attachments);
    }
  }, [vm]);

  const handleSubmit = useCallback(async () => {
    const result = await vm.submit();
    if (result) {
      // Tiny delay so the user sees the "Đang đăng..." state flicker —
      // confirms the action took effect. Then pop back to the feed.
      navigation.goBack();
    }
  }, [navigation, vm]);

  const handleDiscard = useCallback(() => {
    const hasContent =
      vm.draft.text.trim().length > 0 || vm.draft.photos.length > 0;
    if (!hasContent) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'Bỏ bài viết?',
      'Bạn sẽ mất nội dung đã soạn.',
      [
        { text: 'Tiếp tục soạn', style: 'cancel' },
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

  // Reset error when text changes so the inline banner doesn't linger
  // after the user starts addressing it.
  useEffect(() => {
    // intentionally empty — vm.setText already clears nothing; we keep
    // this hook reserved for future "auto-save draft" wiring.
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <View className="h-14 flex-row items-center justify-between border-b border-slate-200 px-3">
        <TouchableOpacity
          onPress={handleDiscard}
          activeOpacity={0.7}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <X size={26} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-heading">Tạo bài viết</Text>
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
          {vm.isSubmitting ? (
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
        {/* ── Viewer + privacy chip ──────────────────────────────── */}
        <View className="flex-row items-center px-4 pt-4">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ height: 44, width: 44, borderRadius: 22 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                height: 44,
                width: 44,
                borderRadius: 22,
                backgroundColor: '#E2E8F0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, color: '#64748B' }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text className="text-title-primary" numberOfLines={1}>
                {displayName}
              </Text>
              {vm.draft.feeling ? (
                <Text
                  className="ml-1 text-title-secondary"
                  numberOfLines={1}
                >
                  đang cảm thấy {vm.draft.feeling.emoji}{' '}
                  {vm.draft.feeling.label}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => setPrivacySheetVisible(true)}
              activeOpacity={0.7}
              className="mt-1 self-start flex-row items-center rounded-md bg-slate-100 px-2 py-1"
            >
              <currentPrivacy.Icon size={12} color="#475569" />
              <Text className="mx-1 text-caption-primary">
                {currentPrivacy.label}
              </Text>
              <ChevronDown size={12} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Text input ─────────────────────────────────────────── */}
        <TextInput
          value={vm.draft.text}
          onChangeText={vm.setText}
          placeholder="Bạn đang nghĩ gì?"
          placeholderTextColor="#94A3B8"
          multiline
          autoFocus
          textAlignVertical="top"
          style={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 8,
            fontSize: 20,
            lineHeight: 28,
            color: '#0F172A',
            minHeight: 120,
          }}
        />

        {/* ── Photo grid ─────────────────────────────────────────── */}
        <View className="px-3">
          <PhotoGrid photos={vm.draft.photos} onRemove={vm.removePhoto} />
        </View>

        {/* ── Error banner ───────────────────────────────────────── */}
        {vm.error ? (
          <View className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2">
            <Text style={{ color: '#B91C1C', fontSize: 13 }}>{vm.error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Bottom action row ────────────────────────────────────── */}
      <View className="border-t border-slate-200 bg-white px-4 py-3">
        <Text className="mb-2 text-caption-primary">Thêm vào bài viết</Text>
        <View className="flex-row items-center justify-around">
          <TouchableOpacity
            onPress={handlePickPhotos}
            activeOpacity={0.7}
            className="flex-1 flex-row items-center justify-center py-2"
          >
            <ImagePlus size={22} color="#22C55E" />
            <Text className="ml-2 text-title-secondary">Ảnh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFeelingSheetVisible(true)}
            activeOpacity={0.7}
            className="flex-1 flex-row items-center justify-center py-2"
          >
            <Smile size={22} color="#F59E0B" />
            <Text className="ml-2 text-title-secondary">Cảm xúc</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPrivacySheetVisible(true)}
            activeOpacity={0.7}
            className="flex-1 flex-row items-center justify-center py-2"
          >
            <currentPrivacy.Icon size={22} color="#3B82F6" />
            <Text className="ml-2 text-title-secondary">Quyền</Text>
          </TouchableOpacity>
        </View>
      </View>

      <PrivacyPickerSheet
        visible={privacySheetVisible}
        current={vm.draft.privacy}
        onClose={() => setPrivacySheetVisible(false)}
        onPick={vm.setPrivacy}
      />
      <FeelingPickerSheet
        visible={feelingSheetVisible}
        current={vm.draft.feeling}
        onClose={() => setFeelingSheetVisible(false)}
        onPick={vm.setFeeling}
        onClear={() => vm.setFeeling(undefined)}
      />
    </SafeAreaView>
  );
}

export default CreatePostScreen;
