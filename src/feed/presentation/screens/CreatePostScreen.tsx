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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
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
  AtSign,
  ChevronDown,
  Globe2,
  Hash,
  ImagePlus,
  Lock,
  Music2,
  Smile,
  Square,
  Users,
  X,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { useCreatePostViewModel } from '../../application/view-models/useCreatePostViewModel';
import { postCreatedEvents } from '../../application/events/postCreatedEvents';
import {
  formatAudioDuration,
  pickSupportedAudioFile,
} from '../../../shared-kernel/application/utils/audioFiles';
import { useWavAudioRecorder } from '../../../shared-kernel/application/hooks/useWavAudioRecorder';
import { AudioPlayer } from '../../../shared-kernel/presentation/components/AudioPlayer';
import { AudioWaveform } from '../../../shared-kernel/presentation/components/AudioWaveform';
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

// Common Facebook feelings. WoWonder's `feeling_type='feelings'` only
// accepts the 18 keys defined in `$wo['feelingIcons']`
// (phtml/assets/includes/data.php) — anything else gets SILENTLY
// REJECTED by `new_post.php` line 353:
//
//   if (array_key_exists($_POST['feeling'], $wo['feelingIcons'])) {
//       $feeling = $_POST['feeling'];
//   }
//
// That's why earlier values like 'excited' / 'grateful' / 'thoughtful'
// looked fine in the app but never showed up on the post — the backend
// dropped them and saved an empty `postFeeling`. Every value below is
// guaranteed-valid against the current whitelist.
const FEELING_OPTIONS: PostFeeling[] = [
  { type: 'feelings', value: 'happy', emoji: '😊', label: 'vui vẻ' },
  { type: 'feelings', value: 'loved', emoji: '🥰', label: 'được yêu' },
  { type: 'feelings', value: 'lovely', emoji: '❤️', label: 'yêu thương' },
  { type: 'feelings', value: 'funny', emoji: '😂', label: 'vui nhộn' },
  { type: 'feelings', value: 'cool', emoji: '😎', label: 'ngầu' },
  { type: 'feelings', value: 'blessed', emoji: '😇', label: 'may mắn' },
  { type: 'feelings', value: 'pretty', emoji: '☺️', label: 'thư thái' },
  { type: 'feelings', value: 'smirk', emoji: '😏', label: 'đắc ý' },
  { type: 'feelings', value: 'sad', emoji: '😞', label: 'buồn' },
  { type: 'feelings', value: 'so_sad', emoji: '😭', label: 'rất buồn' },
  { type: 'feelings', value: 'angry', emoji: '😠', label: 'tức giận' },
  { type: 'feelings', value: 'tired', emoji: '😩', label: 'mệt mỏi' },
  { type: 'feelings', value: 'sleepy', emoji: '😴', label: 'buồn ngủ' },
  { type: 'feelings', value: 'bored', emoji: '😒', label: 'chán' },
  { type: 'feelings', value: 'confused', emoji: '😕', label: 'bối rối' },
  { type: 'feelings', value: 'shocked', emoji: '😱', label: 'sốc' },
  { type: 'feelings', value: 'broke', emoji: '💔', label: 'tan vỡ' },
  { type: 'feelings', value: 'expressionless', emoji: '😑', label: 'vô cảm' },
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
  const wavRecorder = useWavAudioRecorder();

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

  // ── Caption mention/hashtag plumbing ──────────────────────────────
  // Refs + keyboard tracking so the floating suggestion bar can sit
  // right above the keyboard like FB/TikTok do. Mirrors the working
  // setup in `CreateReelScreen` so behaviour is identical between the
  // two composers.
  const textInputRef = useRef<TextInput | null>(null);
  const [isTextFocused, setIsTextFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Android with adjustResize already shrinks the view above the keyboard,
  // so we anchor the bar at bottom=0. iOS overlays the keyboard, so we
  // lift the bar by `keyboardHeight`.
  const suggestionBarBottom = Platform.OS === 'ios' ? keyboardHeight : 0;
  const isSuggestionBarVisible = isTextFocused && keyboardHeight > 0;

  /** Insert `#` or `@` at the end of the text, with a leading space if needed. */
  const insertCaptionChar = useCallback(
    (char: '#' | '@') => {
      const current = vm.draft.text;
      const needsSpace = current.length > 0 && !/\s$/.test(current);
      vm.setText(`${current}${needsSpace ? ' ' : ''}${char}`);
      // Keep focus so the suggestion fetcher actually runs.
      textInputRef.current?.focus();
    },
    [vm],
  );

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

  const handlePickAudio = useCallback(async () => {
    try {
      const audio = await pickSupportedAudioFile();
      if (audio) vm.setAudio(audio);
    } catch (caught) {
      Alert.alert(
        'Không chọn được âm thanh',
        caught instanceof Error ? caught.message : 'Vui lòng thử lại.',
      );
    }
  }, [vm]);

  const handleToggleAudioRecording = useCallback(async () => {
    try {
      if (wavRecorder.isRecording) {
        const audio = await wavRecorder.stopRecording();
        if (audio) vm.setAudio(audio);
        return;
      }

      vm.setAudio(undefined);
      await wavRecorder.startRecording();
    } catch (caught) {
      Alert.alert(
        'Không ghi âm được',
        caught instanceof Error ? caught.message : 'Vui lòng thử lại.',
      );
    }
  }, [vm, wavRecorder]);

  const handleAudioAction = useCallback(() => {
    if (wavRecorder.isRecording) {
      handleToggleAudioRecording().catch(() => undefined);
      return;
    }

    Alert.alert('Thêm âm thanh', 'Bạn muốn thêm âm thanh theo cách nào?', [
      {
        text: 'Ghi âm trực tiếp',
        onPress: () => {
          handleToggleAudioRecording().catch(() => undefined);
        },
      },
      {
        text: 'Chọn tệp MP3/WAV',
        onPress: () => {
          handlePickAudio().catch(() => undefined);
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  }, [handlePickAudio, handleToggleAudioRecording, wavRecorder.isRecording]);

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
      vm.draft.text.trim().length > 0 ||
      vm.draft.photos.length > 0 ||
      Boolean(vm.draft.audio);
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

  const renderBottomActions = (isFloating: boolean) => (
    <View className={`border-t border-slate-200 bg-white px-4 ${isFloating ? 'py-1' : 'py-3'}`}>
      {!isFloating && <Text className="mb-2 text-caption-primary">Thêm vào bài viết</Text>}
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
          onPress={handleAudioAction}
          activeOpacity={0.7}
          className="flex-1 flex-row items-center justify-center py-2"
        >
          {wavRecorder.isRecording ? (
            <Square size={20} color="#DC2626" fill="#DC2626" />
          ) : (
            <Music2 size={22} color="#EC4899" />
          )}
          <Text className="ml-2 text-title-secondary">Âm thanh</Text>
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
  );

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
          ref={textInputRef}
          value={vm.draft.text}
          onChangeText={vm.setText}
          onFocus={() => setIsTextFocused(true)}
          onBlur={() => setIsTextFocused(false)}
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

        {wavRecorder.isRecording ? (
          <View className="mx-4 mt-3 flex-row items-center rounded-xl border border-red-100 bg-red-50 p-3">
            <View className="mr-3 h-3 w-3 rounded-full bg-red-500" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-red-700">
                Đang ghi âm {formatAudioDuration(wavRecorder.durationMs)}
              </Text>
              <View className="mt-2 h-5">
                <AudioWaveform
                  animated
                  color="#DC2626"
                  inactiveColor="#FECACA"
                  height={18}
                  barCount={34}
                />
              </View>
              <Text className="mt-1 text-xs text-red-500">
                Nhấn nút dừng để dùng bản ghi này.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => wavRecorder.cancelRecording()}
              className="h-9 w-9 items-center justify-center rounded-full bg-white"
            >
              <X size={17} color="#DC2626" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleToggleAudioRecording()}
              className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-red-600"
            >
              <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : vm.draft.audio ? (
          <View className="mx-4 mt-3 flex-row items-center rounded-xl border border-blue-100 bg-blue-50 p-3">
            <View className="flex-1">
              <Text className="mb-2 text-sm font-semibold text-slate-700" numberOfLines={1}>
                {vm.draft.audio.name}
              </Text>
              <AudioPlayer uri={vm.draft.audio.uri} compact />
            </View>
            <TouchableOpacity
              onPress={() => vm.setAudio(undefined)}
              className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-white"
            >
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Error banner ───────────────────────────────────────── */}
        {vm.error ? (
          <View className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2">
            <Text style={{ color: '#B91C1C', fontSize: 13 }}>{vm.error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Bottom action row ────────────────────────────────────── */}
      {!isSuggestionBarVisible && renderBottomActions(false)}

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

      {/* ── Floating mention / hashtag bar above the keyboard ── */}
      {isSuggestionBarVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: suggestionBarBottom,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 8,
          }}
        >
          {/* Render the bottom actions shifted above the hashtag/mention selection when keyboard is open */}
          {renderBottomActions(true)}
          {/* Row 1: Suggestion chips (only when there are matches or loading) */}
          {(vm.isLoadingCaptionSuggestions ||
            vm.captionSuggestions.length > 0) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                gap: 8,
                alignItems: 'center',
              }}
            >
              {vm.isLoadingCaptionSuggestions &&
              vm.captionSuggestions.length === 0 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <ActivityIndicator color="#0866FF" size="small" />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 13,
                      color: '#64748B',
                      fontWeight: '500',
                    }}
                  >
                    Đang tìm gợi ý...
                  </Text>
                </View>
              ) : (
                vm.captionSuggestions.map(suggestion => {
                  const isMention = suggestion.kind === 'mention';
                  return (
                    <TouchableOpacity
                      key={`${suggestion.kind}-${suggestion.id}`}
                      activeOpacity={0.75}
                      onPress={() => vm.applyCaptionSuggestion(suggestion)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: isMention ? '#EFF6FF' : '#F5F3FF',
                        borderWidth: 1,
                        borderColor: isMention ? '#DBEAFE' : '#EDE9FE',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: isMention ? '#1D4ED8' : '#6D28D9',
                        }}
                        numberOfLines={1}
                      >
                        {suggestion.label}
                      </Text>
                      {suggestion.subtitle ? (
                        <Text
                          style={{
                            marginLeft: 6,
                            fontSize: 11,
                            color: isMention ? '#60A5FA' : '#A78BFA',
                          }}
                          numberOfLines={1}
                        >
                          {suggestion.subtitle}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Row 2: Quick-insert toolbar (# / @ / Done) */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderTopWidth:
                vm.isLoadingCaptionSuggestions ||
                vm.captionSuggestions.length > 0
                  ? 1
                  : 0,
              borderTopColor: '#F1F5F9',
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => insertCaptionChar('#')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 4,
              }}
            >
              <Hash size={20} color="#475569" strokeWidth={2.2} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => insertCaptionChar('@')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AtSign size={20} color="#475569" strokeWidth={2.2} />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => Keyboard.dismiss()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: '#0866FF',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: '#FFFFFF',
                }}
              >
                Hoàn tất
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default CreatePostScreen;
