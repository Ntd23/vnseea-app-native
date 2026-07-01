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
  Animated,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import VideoPlayer from 'react-native-video';
import {
  launchImageLibrary,
  type Asset,
  type MediaType,
} from 'react-native-image-picker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AtSign,
  ChevronDown,
  ChevronRight,
  Globe2,
  Hash,
  Image as ImageIcon,
  Lock,
  Music2,
  Smile,
  Square,
  Users,
  Video as VideoIcon,
  X,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
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
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import CreateActionSheet, {
  CREATE_ACTIONS,
} from '../../../shared-kernel/presentation/components/CreateActionSheet';
import type { RootStackRouteName } from '../../../navigation/types';
import type {
  PostFeeling,
  PostPhotoAttachment,
  PostPrivacy,
  PostVideoAttachment,
  PostAudioAttachment,
} from '../../domain/types/feed.types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type CreatePostRoute = RouteProp<RootStackParamList, typeof ROUTES.CREATE_POST>;

const COMPOSER_PHOTO_LIMIT = 9;
const PHOTO_GRID_COLUMNS = 3;
const PHOTO_GRID_GAP = 8;

// ── Translation copy dictionary ───────────────────────────────────────
const CREATE_POST_COPY = {
  vi: {
    headerTitle: 'Tạo bài viết',
    post: 'Đăng',
    privacyTitle: 'Đối tượng',
    placeholder: 'Bạn đang nghĩ gì?',
    addPhoto: 'Thêm ảnh',
    selectedPhotos: 'Ảnh đã chọn',
    clearPhotos: 'Xóa tất cả',
    viewMore: 'Xem thêm',
    discardTitle: 'Bỏ bài viết?',
    discardMessage: 'Bạn sẽ mất nội dung đã soạn.',
    discardCancel: 'Tiếp tục soạn',
    discardConfirm: 'Bỏ',
    feelingsTitle: 'Cảm xúc của bạn',
    feelingsClear: 'Xoá',
    recording: 'Đang ghi âm',
    recordingTip: 'Nhấn nút dừng để dùng bản ghi này.',
    audioError: 'Không chọn được âm thanh',
    audioErrorTip: 'Vui lòng thử lại.',
    audioAdd: 'Thêm âm thanh',
    audioAddPrompt: 'Bạn muốn thêm âm thanh theo cách nào?',
    audioRecord: 'Ghi âm trực tiếp',
    audioPick: 'Chọn tệp MP3/WAV',
    audioCancel: 'Hủy',
    limitTitle: 'Đã đạt giới hạn',
    limitMsg: 'Tối đa {max} ảnh.',
    libraryError: 'Không mở được thư viện',
    addPost: 'Thêm vào bài viết',
    photo: 'Ảnh',
    feeling: 'Cảm xúc',
    audio: 'Âm thanh',
    video: 'Video',
    more: 'Thêm',
    moreShort: 'Thêm',
    videoError: 'Không chọn được video',
    videoErrorTip: 'Vui lòng thử lại.',
    addVideo: 'Thêm video',
    done: 'Hoàn tất',
    privacyPublic: 'Công khai',
    privacyFriends: 'Bạn bè',
    privacyOnlyMe: 'Chỉ mình tôi',
    privacyPublicDesc: 'Bất kỳ ai cũng có thể xem',
    privacyFriendsDesc: 'Chỉ bạn bè của bạn',
    privacyOnlyMeDesc: 'Chỉ mình bạn nhìn thấy',
    feelingLabel: 'đang cảm thấy',
    suggestionsLoading: 'Đang tìm gợi ý...',
    processing: 'Đang xử lý...',
    tapToPlay: 'Nhấp để phát',
    tapToPause: 'Nhấp để tạm dừng',
    postAsPage: 'Đăng với tư cách Trang',
    poll: 'Cuộc thăm dò',
    product: 'Sản phẩm',
    live: 'Live',
    page: 'Trang',
  },
  en: {
    headerTitle: 'Create Post',
    post: 'Post',
    privacyTitle: 'Audience',
    placeholder: 'What is on your mind?',
    addPhoto: 'Add photo',
    selectedPhotos: 'Selected photos',
    clearPhotos: 'Remove all',
    viewMore: 'More',
    discardTitle: 'Discard post?',
    discardMessage: 'You will lose your drafted content.',
    discardCancel: 'Keep writing',
    discardConfirm: 'Discard',
    feelingsTitle: 'Your feelings',
    feelingsClear: 'Clear',
    recording: 'Recording',
    recordingTip: 'Press stop to use this recording.',
    audioError: 'Could not select audio',
    audioErrorTip: 'Please try again.',
    audioAdd: 'Add Audio',
    audioAddPrompt: 'How do you want to add audio?',
    audioRecord: 'Record Audio',
    audioPick: 'Pick MP3/WAV file',
    audioCancel: 'Cancel',
    limitTitle: 'Limit reached',
    limitMsg: 'Maximum {max} photos.',
    libraryError: 'Cannot open library',
    addPost: 'Add to your post',
    photo: 'Photo',
    feeling: 'Feeling',
    audio: 'Audio',
    video: 'Video',
    more: 'More',
    moreShort: 'More',
    videoError: 'Could not select video',
    videoErrorTip: 'Please try again.',
    addVideo: 'Add video',
    done: 'Done',
    privacyPublic: 'Public',
    privacyFriends: 'Friends',
    privacyOnlyMe: 'Only me',
    privacyPublicDesc: 'Anyone can see',
    privacyFriendsDesc: 'Your friends only',
    privacyOnlyMeDesc: 'Only you can see',
    feelingLabel: 'is feeling',
    suggestionsLoading: 'Finding suggestions...',
    processing: 'Processing...',
    tapToPlay: 'Tap to play',
    tapToPause: 'Tap to pause',
    postAsPage: 'Post as Page',
    poll: 'Poll',
    product: 'Product',
    live: 'Live',
    page: 'Page',
  },
};

const FEELING_LABELS: Record<string, Record<string, string>> = {
  vi: {
    happy: 'vui vẻ',
    loved: 'được yêu',
    lovely: 'yêu thương',
    funny: 'vui nhộn',
    cool: 'ngầu',
    blessed: 'may mắn',
    pretty: 'thư thái',
    smirk: 'đắc ý',
    sad: 'buồn',
    so_sad: 'rất buồn',
    angry: 'tức giận',
    tired: 'mệt mỏi',
    sleepy: 'buồn ngủ',
    bored: 'chán',
    confused: 'bối rối',
    shocked: 'sốc',
    broke: 'tan vỡ',
    expressionless: 'vô cảm',
  },
  en: {
    happy: 'happy',
    loved: 'loved',
    lovely: 'lovely',
    funny: 'funny',
    cool: 'cool',
    blessed: 'blessed',
    pretty: 'pretty',
    smirk: 'smirk',
    sad: 'sad',
    so_sad: 'very sad',
    angry: 'angry',
    tired: 'tired',
    sleepy: 'sleepy',
    bored: 'bored',
    confused: 'confused',
    shocked: 'shocked',
    broke: 'brokenhearted',
    expressionless: 'expressionless',
  }
};

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

function assetToAttachment(asset: Asset): PostPhotoAttachment | null {
  if (!asset.uri) return null;
  const uri =
    Platform.OS === 'android' && !asset.uri.startsWith('file://')
      ? `file://${asset.uri}`
      : asset.uri;
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

/**
 * Convert an image-picker Asset (with `mediaType: 'video'`) into a
 * `PostVideoAttachment` ready for multipart upload. The picker gives us
 * the same shape as photos — we just synthesise a stable name when
 * the device didn't surface one.
 */
function assetToVideoAttachment(asset: Asset): PostVideoAttachment | null {
  if (!asset.uri) return null;
  const uri =
    Platform.OS === 'android' && !asset.uri.startsWith('file://')
      ? `file://${asset.uri}`
      : asset.uri;
  // RN's image picker reports the duration in seconds under
  // `duration` (only for video picks). The composer doesn't
  // display it yet but the server may want it as a hint.
  const name = asset.fileName ?? `video-${Date.now()}.mp4`;
  const type = asset.type ?? 'video/mp4';
  return {
    uri,
    name,
    type,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
  };
}

// ── Sub-components ────────────────────────────────────────────────────
function PrivacyPickerSheet({
  visible,
  current,
  onClose,
  onPick,
  options,
  title,
}: {
  visible: boolean;
  current: PostPrivacy;
  onClose: () => void;
  onPick: (p: PostPrivacy) => void;
  options: Array<{
    value: PostPrivacy;
    label: string;
    Icon: React.ComponentType<{ size: number; color: string }>;
    description: string;
  }>;
  title: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <Pressable onPress={() => {}} className="mt-auto bg-white pt-2 pb-6 rounded-t-[24px]">
          <View className="mb-2 self-center h-1 w-12 rounded-full bg-slate-300" />
          <Text className="px-5 py-3 text-heading">{title}</Text>
          {options.map(({ value, label, Icon, description }) => {
            const isActive = current === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => {
                  onPick(value);
                  onClose();
                }}
                activeOpacity={0.7}
                className="flex-row items-center px-5 py-3.5"
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
                  <Text className="text-title-primary font-bold text-slate-800">{label}</Text>
                  <Text className="text-caption-secondary mt-0.5">{description}</Text>
                </View>
                {isActive ? (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 6,
                      borderColor: '#0000ff',
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
  options,
  title,
  clearLabel,
}: {
  visible: boolean;
  current?: PostFeeling;
  onClose: () => void;
  onPick: (f: PostFeeling) => void;
  onClear: () => void;
  options: PostFeeling[];
  title: string;
  clearLabel: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <Pressable onPress={() => {}} className="mt-auto bg-white pt-2 pb-6 rounded-t-[24px] max-h-[70%]">
          <View className="mb-2 self-center h-1 w-12 rounded-full bg-slate-300" />
          <View className="flex-row items-center justify-between px-5 py-3">
            <Text className="text-heading">{title}</Text>
            {current ? (
              <TouchableOpacity
                onPress={() => {
                  onClear();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text className="text-title-secondary text-brand font-bold text-[#0000ff]">{clearLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView
            horizontal={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
          >
            <View className="flex-row flex-wrap">
              {options.map(feeling => {
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
                          ? 'ml-3 text-title-primary font-bold text-[#0000ff]'
                          : 'ml-3 text-title-primary text-slate-700'
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

// ── Screen ────────────────────────────────────────────────────────────

// ── Sub-components React.memo ──────────────────────────────────────────

interface CreatePostHeaderProps {
  onDiscard: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  isProcessingPhotos: boolean;
  copy: any;
}

const CreatePostHeader = React.memo(({
  onDiscard,
  onSubmit,
  canSubmit,
  isSubmitting,
  isProcessingPhotos,
  copy,
}: CreatePostHeaderProps) => {
  return (
    <View className="h-16 flex-row items-center justify-between px-4 bg-transparent">
      <TouchableOpacity
        onPress={onDiscard}
        activeOpacity={0.7}
        style={{
          shadowColor: '#94a3b8',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 3,
        }}
        className="h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-100"
      >
        <X size={24} color="#0F172A" />
      </TouchableOpacity>

      <Text className="text-[20px] font-bold text-slate-800">{copy.headerTitle}</Text>

      <TouchableOpacity
        onPress={onSubmit}
        disabled={!canSubmit || isProcessingPhotos}
        activeOpacity={0.7}
        className={
          canSubmit && !isProcessingPhotos
            ? 'rounded-full bg-[#0000ff] px-6 py-2.5'
            : 'rounded-full bg-slate-200 px-6 py-2.5'
        }
      >
        {isSubmitting ? (
          <ActivityIndicator color={canSubmit && !isProcessingPhotos ? '#FFFFFF' : '#94A3B8'} size="small" />
        ) : (
          <Text
            style={{
              color: canSubmit && !isProcessingPhotos ? '#FFFFFF' : '#94A3B8',
              fontWeight: '700',
              fontSize: 15,
            }}
          >
            {copy.post}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
});

interface AuthorPrivacyCardProps {
  avatarUrl?: string;
  displayName: string;
  feeling?: PostFeeling;
  feelingLabel: string | null;
  targetPage?: any;
  currentPrivacy: PostPrivacy;
  privacyOptions: Array<{ value: PostPrivacy; label: string; Icon: any; description: string }>;
  onSelectPrivacy: (privacy: PostPrivacy) => void;
  copy: any;
}

const AuthorPrivacyCard = React.memo(({
  avatarUrl,
  displayName,
  feeling,
  feelingLabel,
  targetPage,
  currentPrivacy,
  privacyOptions,
  onSelectPrivacy,
  copy,
}: AuthorPrivacyCardProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentOpt = useMemo(() => {
    return privacyOptions.find(opt => opt.value === currentPrivacy) ?? privacyOptions[0];
  }, [privacyOptions, currentPrivacy]);

  const PrivacyIcon = currentOpt.Icon;

  return (
    <View
      style={{
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        zIndex: 100,
      }}
      className="mx-4 mt-4 bg-white rounded-[20px] border border-slate-100 p-4 flex-row items-center"
    >
      <View className="relative">
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ height: 56, width: 56, borderRadius: 28 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              height: 56,
              width: 56,
              borderRadius: 28,
              backgroundColor: '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22, color: '#64748B', fontWeight: 'bold' }}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View className="absolute bottom-0 right-0 h-4.5 w-4.5 rounded-full bg-[#0000ff] border border-white items-center justify-center">
          <Text className="text-white text-[10px] font-bold leading-none">+</Text>
        </View>
      </View>
      <View style={{ flex: 1, marginLeft: 16, zIndex: 200 }}>
        <View className="flex-row items-center flex-wrap">
          <Text className="text-[16px] font-bold text-slate-800" numberOfLines={1}>
            {displayName}
          </Text>
          {feeling ? (
            <Text
              className="ml-1.5 text-[14px] text-slate-500 font-medium"
              numberOfLines={1}
            >
              {copy.feelingLabel} {feeling.emoji}{' '}
              {feelingLabel}
            </Text>
          ) : null}
        </View>
        {targetPage ? (
          <Text className="mt-1 text-[12px] font-semibold text-[#0000ff]">
            {copy.postAsPage}
          </Text>
        ) : null}
        <View style={{ position: 'relative', zIndex: 300 }} className="mt-1.5 self-start">
          <TouchableOpacity
            onPress={() => setIsDropdownOpen(prev => !prev)}
            activeOpacity={0.7}
            className="flex-row items-center rounded-full bg-slate-100 px-3 py-1"
          >
            <PrivacyIcon size={12} color="#475569" />
            <Text className="mx-1.5 text-[12px] font-semibold text-slate-600">
              {currentOpt.label}
            </Text>
            <ChevronDown size={12} color="#475569" />
          </TouchableOpacity>

          {isDropdownOpen && (
            <View
              style={{
                position: 'absolute',
                top: 28,
                left: 0,
                width: 180,
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 10,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                zIndex: 999,
              }}
            >
              {privacyOptions.map(opt => {
                const OptIcon = opt.Icon;
                const isSelected = opt.value === currentPrivacy;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      onSelectPrivacy(opt.value);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                    }}
                  >
                    <OptIcon size={14} color={isSelected ? '#3b82f6' : '#64748B'} />
                    <Text
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? '#1d4ed8' : '#334155',
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

interface CaptionComposerProps {
  textInputRef: React.RefObject<TextInput | null>;
  text: string;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  placeholder: string;
  onInsertChar: (char: '#' | '@') => void;
  onFeelingPress: () => void;
}

const CharacterCounter = React.memo(({ length }: { length: number }) => {
  return (
    <Text className="ml-2 text-[13px] text-slate-400 font-medium">
      {length}/5000
    </Text>
  );
});

const CaptionComposer = React.memo(({
  textInputRef,
  text,
  onChangeText,
  onFocus,
  onBlur,
  placeholder,
  onInsertChar,
  onFeelingPress,
}: CaptionComposerProps) => {
  return (
    <View
      style={{
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
      className="mx-4 mt-4 bg-white rounded-[20px] border border-slate-100 p-4 min-h-[160px] justify-between"
    >
      <TextInput
        ref={textInputRef}
        value={text}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline
        autoFocus
        textAlignVertical="top"
        style={{
          fontSize: 17,
          lineHeight: 24,
          color: '#1e293b',
          padding: 0,
          minHeight: 82,
        }}
      />

      {/* Word counts & inline shortcuts */}
      <View className="flex-row items-center justify-end mt-3 gap-3">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onInsertChar('#')}
          className="h-10 w-10 rounded-xl border border-slate-200 items-center justify-center bg-white"
        >
          <Hash size={18} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onInsertChar('@')}
          className="h-10 w-10 rounded-xl border border-slate-200 items-center justify-center bg-white"
        >
          <AtSign size={18} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onFeelingPress}
          className="h-10 w-10 rounded-xl border border-slate-200 items-center justify-center bg-white"
        >
          <Smile size={18} color="#64748b" />
        </TouchableOpacity>

        <CharacterCounter length={text.length} />
      </View>
    </View>
  );
});

interface MediaPreviewStripProps {
  photos: PostPhotoAttachment[];
  onRemovePhoto: (uri: string) => void;
  onClearPhotos: () => void;
  onPickPhotos: () => void;
  isProcessing: boolean;
  maxPhotos: number;
  copy: any;
}

const MediaPreviewStrip = React.memo(({
  photos,
  onRemovePhoto,
  onClearPhotos,
  onPickPhotos,
  isProcessing,
  maxPhotos,
  copy,
}: MediaPreviewStripProps) => {
  const { width } = useWindowDimensions();
  const visiblePhotos = useMemo(
    () => photos.slice(0, COMPOSER_PHOTO_LIMIT),
    [photos],
  );

  if (photos.length === 0 && !isProcessing) {
    return null;
  }

  const effectiveMaxPhotos = Math.min(maxPhotos, COMPOSER_PHOTO_LIMIT);
  const containerWidth = Math.max(width - 32, 0);
  const itemSize = Math.floor(
    (containerWidth - PHOTO_GRID_GAP * (PHOTO_GRID_COLUMNS - 1)) / PHOTO_GRID_COLUMNS,
  );
  const canAddMore = photos.length < effectiveMaxPhotos;

  const renderAddTile = canAddMore && photos.length > 0;
  const showSummaryHeader = photos.length > 0 || isProcessing;

  return (
    <View className="mx-4 mt-4">
      {showSummaryHeader ? (
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-[15px] font-bold text-slate-900">
              {copy.selectedPhotos}
            </Text>
            <Text className="mt-0.5 text-[12px] font-semibold text-slate-400">
              {Math.min(photos.length, COMPOSER_PHOTO_LIMIT)}/{effectiveMaxPhotos}
            </Text>
          </View>

          {photos.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={onClearPhotos}
              className="rounded-full bg-red-50 px-3.5 py-2"
            >
              <Text className="text-[12px] font-bold text-red-500">
                {copy.clearPhotos}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {visiblePhotos.map((photo, index) => {
          const isLastInRow = index % PHOTO_GRID_COLUMNS === PHOTO_GRID_COLUMNS - 1;
          const hasHiddenPhotos =
            index === COMPOSER_PHOTO_LIMIT - 1 && photos.length > COMPOSER_PHOTO_LIMIT;
          const hiddenCount = Math.max(photos.length - COMPOSER_PHOTO_LIMIT, 0);
          const cellStyle = {
            width: itemSize,
            height: itemSize,
            borderRadius: 18,
            overflow: 'hidden' as const,
            marginBottom: PHOTO_GRID_GAP,
            marginRight: isLastInRow ? 0 : PHOTO_GRID_GAP,
            backgroundColor: '#f8fafc',
            position: 'relative' as const,
          };

          return (
            <View key={photo.uri} style={cellStyle}>
              <Image
                source={{ uri: photo.uri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                resizeMethod="resize"
              />

              {hasHiddenPhotos ? (
                <View
                  style={StyleSheet.absoluteFill}
                  className="items-center justify-center bg-black/60"
                >
                  <Text className="text-[22px] font-black text-white">
                    +{hiddenCount}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => onRemovePhoto(photo.uri)}
                className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-sm"
              >
                <X size={14} color="#0F172A" strokeWidth={2.6} />
              </TouchableOpacity>
            </View>
          );
        })}

        {isProcessing ? (() => {
          const index = visiblePhotos.length;
          const isLastInRow = index % PHOTO_GRID_COLUMNS === PHOTO_GRID_COLUMNS - 1;
          return (
            <View
              key="grid-processing"
              style={{
                width: itemSize,
                height: itemSize,
                borderRadius: 18,
                marginBottom: PHOTO_GRID_GAP,
                marginRight: isLastInRow ? 0 : PHOTO_GRID_GAP,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator color="#0000ff" size="small" />
              <Text className="mt-2 text-center text-[10px] font-bold text-slate-500">
                {copy.processing}
              </Text>
            </View>
          );
        })() : null}

        {renderAddTile ? (() => {
          const index = visiblePhotos.length + (isProcessing ? 1 : 0);
          const isLastInRow = index % PHOTO_GRID_COLUMNS === PHOTO_GRID_COLUMNS - 1;
          return (
            <Pressable
              key="grid-add-btn"
              onPress={onPickPhotos}
              style={({ pressed }) => ({
                width: itemSize,
                height: itemSize,
                marginBottom: PHOTO_GRID_GAP,
                marginRight: isLastInRow ? 0 : PHOTO_GRID_GAP,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 18,
                  borderStyle: 'dashed',
                  borderWidth: 2,
                  borderColor: '#BAC7D6',
                  backgroundColor: '#F8FAFC',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text className="text-[32px] font-light leading-8 text-slate-400">
                  +
                </Text>
                <Text className="mt-1 text-center text-[12px] font-bold text-slate-500">
                  {copy.addPhoto}
                </Text>
              </View>
            </Pressable>
          );
        })() : null}
      </View>
    </View>
  );
});

interface VideoPreviewCardProps {
  video: PostVideoAttachment;
  onRemove: () => void;
  copy: any;
  isKeyboardActive: boolean;
}

const VideoPreviewCard = React.memo(({
  video,
  onRemove,
  copy,
  isKeyboardActive,
}: VideoPreviewCardProps) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const { width, height } = useWindowDimensions();
  const frameWidth = Math.max(width - 52, 240);
  const frameHeight = Math.min(
    Math.floor(height * 0.22),
    Math.max(132, Math.floor(frameWidth * 9 / 16)),
  );

  // Pause video if keyboard becomes active
  useEffect(() => {
    if (isKeyboardActive) {
      setIsPlaying(false);
    }
  }, [isKeyboardActive]);

  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const handleLoad = () => {
    setIsVideoLoaded(true);
  };

  return (
    <View
      className="mx-4 mt-4 overflow-hidden rounded-[20px] border border-slate-800 bg-slate-950 shadow-lg"
      style={{ maxHeight: frameHeight + 54 }}
    >
      <View className="flex-row items-center border-b border-white/5 bg-black/25 px-3 py-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
          <VideoIcon size={15} color="#3b82f6" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[13px] font-bold text-slate-100" numberOfLines={1}>
            {video.name}
          </Text>
          <Text className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            {copy.addVideo}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onRemove}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="h-8 w-8 items-center justify-center rounded-full bg-white/10 active:scale-95"
        >
          <X size={15} color="#E2E8F0" />
        </TouchableOpacity>
      </View>

      <Pressable
        onPress={handlePlayPause}
        style={({ pressed }) => [
          {
            margin: 10,
            width: frameWidth,
            maxWidth: '100%',
            height: frameHeight,
            borderRadius: 14,
            overflow: 'hidden',
            backgroundColor: '#020617',
            position: 'relative',
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ scale: pressed ? 0.98 : 1 }],
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.08)',
          }
        ]}
      >
        {/* Skeleton/Placeholder until first frame loads */}
        {!isVideoLoaded && (
          <View style={StyleSheet.absoluteFill} className="items-center justify-center bg-slate-950 z-10">
            <ActivityIndicator color="#3b82f6" size="small" />
            <Text className="mt-2 text-xs text-slate-400 font-semibold">{copy.processing}</Text>
          </View>
        )}

        <VideoPlayer
          source={{ uri: video.uri }}
          style={{ width: '100%', height: '100%' }}
          paused={!isPlaying}
          resizeMode="contain"
          onLoad={handleLoad}
          repeat
        />

        {/* Play/Pause Overlay */}
        <View
          style={StyleSheet.absoluteFill}
          className="bg-black/30 items-center justify-center"
          pointerEvents="none"
        >
          {!isPlaying ? (
            <View className="h-14 w-14 items-center justify-center rounded-full border border-blue-400/30 bg-blue-600/90 shadow-lg">
              <View style={{
                width: 0,
                height: 0,
                borderLeftWidth: 15,
                borderTopWidth: 9,
                borderBottomWidth: 9,
                borderStyle: 'solid',
                borderLeftColor: '#FFFFFF',
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                marginLeft: 5
              }} />
            </View>
          ) : null}
        </View>

        {/* Meta Info overlay (Duration) */}
        {video.duration ? (
          <View className="absolute bottom-2.5 right-2.5 rounded-lg border border-white/10 bg-black/70 px-2.5 py-1">
            <Text className="text-[11px] font-bold text-slate-100">
              {formatAudioDuration(video.duration * 1000)}
            </Text>
          </View>
        ) : null}

        {/* Click to Play/Pause Hint */}
        <View className="absolute bottom-2.5 left-2.5 rounded-lg border border-white/5 bg-black/55 px-2.5 py-1">
          <Text className="text-[10px] font-semibold text-slate-300">
            {isPlaying ? copy.tapToPause : copy.tapToPlay}
          </Text>
        </View>
      </Pressable>
    </View>
  );
});

interface AudioPreviewCardProps {
  isRecording: boolean;
  durationMs: number;
  audio?: PostAudioAttachment;
  onCancelRecording: () => void;
  onStopRecording: () => void;
  onRemoveAudio: () => void;
  copy: any;
}

const AudioPreviewCard = React.memo(({
  isRecording,
  durationMs,
  audio,
  onCancelRecording,
  onStopRecording,
  onRemoveAudio,
  copy,
}: AudioPreviewCardProps) => {
  if (isRecording) {
    return (
      <View className="mx-4 mt-4 flex-row items-center rounded-[20px] border border-red-100 bg-red-50 p-4">
        <View className="mr-3 h-3 w-3 rounded-full bg-red-500" />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-red-700">
            {copy.recording} {formatAudioDuration(durationMs)}
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
            {copy.recordingTip}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onCancelRecording}
          className="h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <X size={17} color="#DC2626" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onStopRecording}
          className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-red-600 shadow-sm"
        >
          <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  if (audio) {
    return (
      <View className="mx-4 mt-4 flex-row items-center rounded-[20px] border border-blue-100 bg-blue-50 p-4">
        <View className="flex-1">
          <Text className="mb-2 text-sm font-semibold text-slate-700" numberOfLines={1}>
            {audio.name}
          </Text>
          <AudioPlayer uri={audio.uri} compact />
        </View>
        <TouchableOpacity
          onPress={onRemoveAudio}
          className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <X size={16} color="#64748B" />
        </TouchableOpacity>
      </View>
    );
  }

  return null;
});

interface DiscardPostDialogProps {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const DiscardPostDialog = React.memo(({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: DiscardPostDialogProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable
        onPress={onCancel}
        style={StyleSheet.absoluteFill}
        className="items-center justify-center bg-slate-950/45 px-6"
      >
        <Pressable
          onPress={event => event.stopPropagation()}
          className="w-full overflow-hidden rounded-[28px] bg-white p-5 shadow-2xl"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 18 },
            shadowOpacity: 0.18,
            shadowRadius: 28,
            elevation: 18,
          }}
        >
          <View className="mb-4 flex-row items-center">
            <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
              <X size={22} color="#EF4444" strokeWidth={2.8} />
            </View>
            <View className="flex-1">
              <Text className="text-[20px] font-black text-slate-950">
                {title}
              </Text>
              <Text className="mt-1 text-[14px] font-semibold leading-5 text-slate-500">
                {message}
              </Text>
            </View>
          </View>

          <View className="mt-2 flex-row gap-3">
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={onCancel}
              className="h-[52px] flex-1 items-center justify-center rounded-2xl bg-slate-100"
            >
              <Text className="text-[15px] font-black text-slate-700">
                {cancelLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={onConfirm}
              className="h-[52px] flex-1 items-center justify-center rounded-2xl bg-red-500"
            >
              <Text className="text-[15px] font-black text-white">
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

interface ComposerActionTrayProps {
  isFloating: boolean;
  copy: any;
  language: string;
  onPickPhotos: () => void;
  onFeelingPress: () => void;
  onAudioAction: () => void;
  onPickVideo: () => void;
  onNavigate: (route: string) => void;
  isRecording: boolean;
  insetsBottom: number;
}

const ComposerActionTray = React.memo(({
  isFloating,
  copy,
  language,
  onPickPhotos,
  onFeelingPress,
  onAudioAction,
  onPickVideo,
  onNavigate,
  isRecording,
  insetsBottom,
}: ComposerActionTrayProps) => {
  const compactButtons = useMemo(() => [
    {
      key: 'photo',
      label: copy.photo,
      onPress: onPickPhotos,
      Icon: ImageIcon,
      iconBg: '#f0fdf4',
      iconColor: '#22c55e',
    },
    {
      key: 'feeling',
      label: copy.feeling,
      onPress: onFeelingPress,
      Icon: Smile,
      iconBg: '#fef9c3',
      iconColor: '#eab308',
    },
    {
      key: 'audio',
      label: copy.audio,
      onPress: onAudioAction,
      Icon: Music2,
      iconBg: '#fdf2f8',
      iconColor: '#ec4899',
      altIcon: <Square size={14} color="#ec4899" fill="#ec4899" />,
    },
    {
      key: 'video',
      label: copy.video,
      onPress: onPickVideo,
      Icon: VideoIcon,
      iconBg: '#eff6ff',
      iconColor: '#3b82f6',
    },
  ], [copy, onPickPhotos, onFeelingPress, onAudioAction, onPickVideo]);

  const expandedRow2 = useMemo(() => [
    {
      actionKey: 'poll' as const,
      label: copy.poll,
      route: ROUTES.CREATE_POLL,
    },
    {
      actionKey: 'product' as const,
      label: copy.product,
      route: ROUTES.CREATE_PRODUCT,
    },
    {
      actionKey: 'live' as const,
      label: copy.live,
      route: ROUTES.GO_LIVE,
    },
    {
      actionKey: 'page' as const,
      label: copy.page,
      route: ROUTES.CREATE_PAGE,
    },
  ], [copy]);

  const SECONDARY_LABEL_COLOR = '#475569';

  const renderShortcutButton = (
    button: typeof compactButtons[number],
    size: 44 | 48,
  ) => {
    const Icon = button.Icon;
    const showAlt = button.altIcon && button.key === 'audio' && isRecording;
    return (
      <TouchableOpacity
        key={button.key}
        onPress={button.onPress}
        activeOpacity={0.7}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: button.iconBg,
            alignItems: 'center',
            justifyContent: 'center',
            ...(size === 48 ? { marginBottom: 8 } : null),
          }}
        >
          {showAlt ? (
            button.altIcon
          ) : (
            <Icon size={size === 44 ? 20 : 22} color={button.iconColor} />
          )}
        </View>
        {isFloating ? null : (
          <Text style={{ fontSize: 12, fontWeight: '600', color: SECONDARY_LABEL_COLOR }}>
            {button.label}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderMoreButton = () => (
    <TouchableOpacity
      key="more"
      onPress={() => onNavigate('more_sheet')}
      activeOpacity={0.7}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
      }}
    >
      <View
        style={{
          width: isFloating ? 44 : 48,
          height: isFloating ? 44 : 48,
          borderRadius: isFloating ? 22 : 24,
          backgroundColor: '#f8fafc',
          borderWidth: 1,
          borderColor: '#e2e8f0',
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          ...(isFloating ? null : { marginBottom: 8 }),
        }}
      >
        <ChevronRight
          size={isFloating ? 18 : 20}
          color="#475569"
          strokeWidth={2.4}
        />
      </View>
      {isFloating ? null : (
        <Text style={{ fontSize: 12, fontWeight: '600', color: SECONDARY_LABEL_COLOR }}>
          {copy.moreShort}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderRow2Shortcut = (
    entry: typeof expandedRow2[number],
  ) => {
    const action = CREATE_ACTIONS.find(a => a.key === entry.actionKey);
    if (!action) return null;
    const Icon = action.Icon;
    return (
      <TouchableOpacity
        key={entry.actionKey}
        onPress={() => onNavigate(entry.route)}
        activeOpacity={0.7}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: action.iconBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}
        >
          <Icon size={22} color={action.iconColor} strokeWidth={2} />
        </View>
        <Text style={{ fontSize: 12, fontWeight: '600', color: SECONDARY_LABEL_COLOR }}>
          {entry.label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isFloating) {
    return (
      <View
        style={{
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {compactButtons.map(b => renderShortcutButton(b, 44))}
        {renderMoreButton()}
      </View>
    );
  }

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: Math.max(insetsBottom, 16),
        marginTop: 16,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* Header Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1e293b' }}>{copy.addPost}</Text>
        <TouchableOpacity
          onPress={() => onNavigate('more_sheet')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#0000ff', marginRight: 2 }}>
            {copy.more}
          </Text>
          <ChevronRight size={16} color="#0000ff" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      {/* Row 1 — post-flow shortcuts (Photo / Feeling / Audio / Video). */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {compactButtons.map(b => renderShortcutButton(b, 48))}
      </View>

      {/* Row 2 — quick creation routes (Ad / Product / Event / Page). */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        {expandedRow2.map(renderRow2Shortcut)}
      </View>
    </View>
  );
});

function CreatePostScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<CreatePostRoute>();
  const language = useAppLanguage();
  const copy = CREATE_POST_COPY[language];
  const targetPage = route.params?.page;

  const vm = useCreatePostViewModel({
    pageId: targetPage?.pageId,
    onCreated: post => {
      postCreatedEvents.emit(post);
    },
  });
  const wavRecorder = useWavAudioRecorder();
  const insets = useSafeAreaInsets();

  const profile = useMemo(() => sessionStorage.getUserProfile(), []);
  const displayName =
    targetPage?.pageTitle ||
    profile?.name?.trim() ||
    (language === 'vi' ? 'Bạn' : 'You');
  const avatarUrl = targetPage?.avatar || profile?.avatarUrl;

  const [privacySheetVisible, setPrivacySheetVisible] = useState(false);
  const [feelingSheetVisible, setFeelingSheetVisible] = useState(false);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  const [discardDialogVisible, setDiscardDialogVisible] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);

  const privacyOptions = useMemo(() => [
    {
      value: 'public' as PostPrivacy,
      label: copy.privacyPublic,
      Icon: Globe2,
      description: copy.privacyPublicDesc,
    },
    {
      value: 'friends' as PostPrivacy,
      label: copy.privacyFriends,
      Icon: Users,
      description: copy.privacyFriendsDesc,
    },
    {
      value: 'only_me' as PostPrivacy,
      label: copy.privacyOnlyMe,
      Icon: Lock,
      description: copy.privacyOnlyMeDesc,
    },
  ], [copy]);

  const currentPrivacy = useMemo(() => {
    return privacyOptions.find(opt => opt.value === vm.draft.privacy) ?? privacyOptions[0];
  }, [privacyOptions, vm.draft.privacy]);

  const translatedFeelings = useMemo(() => {
    return FEELING_OPTIONS.map(feeling => ({
      ...feeling,
      label: FEELING_LABELS[language]?.[feeling.value] ?? feeling.label,
    }));
  }, [language]);

  const currentFeelingLabel = useMemo(() => {
    if (!vm.draft.feeling) return null;
    return FEELING_LABELS[language]?.[vm.draft.feeling.value] ?? vm.draft.feeling.label;
  }, [vm.draft.feeling, language]);

  const textInputRef = useRef<TextInput | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [isTextFocused, setIsTextFocused] = useState(false);

  // Keyboard Animated transitions
  const keyboardTransitionAnim = useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  useEffect(() => {
    // On iOS, we want to animate with the keyboard event because it has 'keyboardWillShow' and 'keyboardWillHide' which fire immediately.
    // On Android, those events don't exist. We use keyboardDidHide as a fallback to detect back-button dismiss.
    if (Platform.OS !== 'ios') {
      const hideSub = Keyboard.addListener('keyboardDidHide', () => {
        setIsKeyboardActive(false);
        Animated.timing(keyboardTransitionAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
        textInputRef.current?.blur();
      });
      return () => hideSub.remove();
    }

    const showSub = Keyboard.addListener('keyboardWillShow', (e) => {
      const height = e.endCoordinates?.height ?? 0;
      setKeyboardHeight(height);
      setIsKeyboardActive(true);
      Animated.timing(keyboardTransitionAnim, {
        toValue: 1,
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener('keyboardWillHide', (e) => {
      setIsKeyboardActive(false);
      Animated.timing(keyboardTransitionAnim, {
        toValue: 0,
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardTransitionAnim]);

  const handleInputFocus = useCallback(() => {
    setIsTextFocused(true);
    // Smooth scroll caption input card to top when keyboard opens
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });

    if (Platform.OS === 'android') {
      setIsKeyboardActive(true);
      Animated.timing(keyboardTransitionAnim, {
        toValue: 1,
        duration: 180, // fast & responsive transition on Android focus
        useNativeDriver: true,
      }).start();
    }
  }, [keyboardTransitionAnim]);

  const handleInputBlur = useCallback(() => {
    setIsTextFocused(false);

    if (Platform.OS === 'android') {
      setIsKeyboardActive(false);
      Animated.timing(keyboardTransitionAnim, {
        toValue: 0,
        duration: 180, // fast & responsive transition on Android blur
        useNativeDriver: true,
      }).start();
    }
  }, [keyboardTransitionAnim]);

  // Save callbacks in refs to make handlers stable & prevent re-renders
  const vmRef = useRef(vm);
  vmRef.current = vm;

  const insertCaptionChar = useCallback(
    (char: '#' | '@') => {
      const current = vmRef.current.draft.text;
      const needsSpace = current.length > 0 && !/\s$/.test(current);
      vmRef.current.setText(`${current}${needsSpace ? ' ' : ''}${char}`);
      textInputRef.current?.focus();
    },
    [],
  );

  const handlePickPhotos = useCallback(async () => {
    const maxPhotos = Math.min(vmRef.current.maxPhotos, COMPOSER_PHOTO_LIMIT);
    const remaining = maxPhotos - vmRef.current.draft.photos.length;
    if (remaining <= 0) {
      Alert.alert(copy.limitTitle, copy.limitMsg.replace('{max}', String(maxPhotos)));
      return;
    }
    setIsProcessingPhotos(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo' as MediaType,
        selectionLimit: remaining,
        includeBase64: false,
        maxWidth: 1080,
        maxHeight: 1080,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert(copy.libraryError, result.errorMessage ?? '');
        return;
      }
      const assets = result.assets ?? [];
      const attachments = assets
        .map(assetToAttachment)
        .filter((a): a is PostPhotoAttachment => a !== null);
      if (attachments.length > 0) {
        vmRef.current.addPhotos(attachments.slice(0, remaining));
      }
    } finally {
      setIsProcessingPhotos(false);
    }
  }, [copy]);

  const handlePickAudio = useCallback(async () => {
    try {
      const audio = await pickSupportedAudioFile();
      if (audio) vmRef.current.setAudio(audio);
    } catch (caught) {
      Alert.alert(
        copy.audioError,
        caught instanceof Error ? caught.message : copy.audioErrorTip,
      );
    }
  }, [copy]);

  const handlePickVideo = useCallback(async () => {
    setIsProcessingPhotos(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'video' as MediaType,
        selectionLimit: 1,
        videoQuality: 'high',
        includeBase64: false,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert(copy.videoError, result.errorMessage ?? copy.videoErrorTip);
        return;
      }
      const asset = result.assets?.[0];
      if (!asset) return;
      const attachment = assetToVideoAttachment(asset);
      if (attachment) {
        vmRef.current.setVideo(attachment);
      }
    } finally {
      setIsProcessingPhotos(false);
    }
  }, [copy]);

  const handleToggleAudioRecording = useCallback(async () => {
    try {
      if (wavRecorder.isRecording) {
        const audio = await wavRecorder.stopRecording();
        if (audio) vmRef.current.setAudio(audio);
        return;
      }

      vmRef.current.setAudio(undefined);
      await wavRecorder.startRecording();
    } catch (caught) {
      Alert.alert(
        copy.audioError,
        caught instanceof Error ? caught.message : copy.audioErrorTip,
      );
    }
  }, [wavRecorder, copy]);

  const handleAudioAction = useCallback(() => {
    if (wavRecorder.isRecording) {
      handleToggleAudioRecording().catch(() => undefined);
      return;
    }

    Alert.alert(copy.audioAdd, copy.audioAddPrompt, [
      {
        text: copy.audioRecord,
        onPress: () => {
          handleToggleAudioRecording().catch(() => undefined);
        },
      },
      {
        text: copy.audioPick,
        onPress: () => {
          handlePickAudio().catch(() => undefined);
        },
      },
      { text: copy.audioCancel, style: 'cancel' },
    ]);
  }, [handlePickAudio, handleToggleAudioRecording, wavRecorder.isRecording, copy]);

  const handleSubmit = useCallback(async () => {
    const result = await vmRef.current.submit();
    if (result) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleMoreNavigate = useCallback(
    (route: RootStackRouteName) => {
      setMoreSheetVisible(false);
      navigation.navigate(route as never);
    },
    [navigation],
  );

  const handleMoreNavigateRef = useRef(handleMoreNavigate);
  handleMoreNavigateRef.current = handleMoreNavigate;
  const stableMoreNavigate = useCallback((route: string) => {
    handleMoreNavigateRef.current(route as RootStackRouteName);
  }, []);

  const handleActionNavigate = useCallback((route: string) => {
    if (route === 'more_sheet') {
      setMoreSheetVisible(true);
    } else {
      stableMoreNavigate(route);
    }
  }, [stableMoreNavigate]);

  const handleDiscard = useCallback(() => {
    const hasContent =
      vmRef.current.draft.text.trim().length > 0 ||
      vmRef.current.draft.photos.length > 0 ||
      Boolean(vmRef.current.draft.audio) ||
      Boolean(vmRef.current.draft.video);
    if (!hasContent) {
      navigation.goBack();
      return;
    }
    Keyboard.dismiss();
    setDiscardDialogVisible(true);
  }, [navigation]);

  const handleConfirmDiscard = useCallback(() => {
    setDiscardDialogVisible(false);
    vmRef.current.reset();
    navigation.goBack();
  }, [navigation]);

  const handleRemovePhoto = useCallback((uri: string) => {
    vmRef.current.removePhoto(uri);
  }, []);

  const handleClearPhotos = useCallback(() => {
    vmRef.current.clearPhotos();
  }, []);

  const handleRemoveVideo = useCallback(() => {
    vmRef.current.setVideo(undefined);
  }, []);

  const handleRemoveAudio = useCallback(() => {
    vmRef.current.setAudio(undefined);
  }, []);

  const handleCancelAudioRecording = useCallback(() => {
    wavRecorder.cancelRecording();
  }, [wavRecorder]);

  // Set up animated styles for trays
  const expandedTrayStyle = {
    opacity: keyboardTransitionAnim.interpolate({
      inputRange: [0, 0.8, 1],
      outputRange: [1, 0, 0],
    }),
    transform: [{
      translateY: keyboardTransitionAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 100],
      }),
    }],
  };

  const floatingBarContainerStyle = {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 99,
    opacity: keyboardTransitionAnim.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [0, 0, 1],
    }),
    transform: [{
      translateY: keyboardTransitionAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [300, Platform.OS === 'ios' ? -keyboardHeight : 0],
      }),
    }],
  };

  const stableSetText = useCallback((txt: string) => {
    vmRef.current.setText(txt);
  }, []);

  const stableSetPrivacy = useCallback((prv: PostPrivacy) => {
    vmRef.current.setPrivacy(prv);
  }, []);

  const stableSetFeeling = useCallback((flg: PostFeeling) => {
    vmRef.current.setFeeling(flg);
  }, []);

  const stableClearFeeling = useCallback(() => {
    vmRef.current.setFeeling(undefined);
  }, []);

  return (
    <SafeAreaView style={{ backgroundColor: '#f4f7fa' }} className="flex-1" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#f4f7fa" />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="flex-1">
          {/* Header */}
          <CreatePostHeader
            onDiscard={handleDiscard}
            onSubmit={handleSubmit}
            canSubmit={vm.canSubmit}
            isSubmitting={vm.isSubmitting}
            isProcessingPhotos={isProcessingPhotos}
            copy={copy}
          />

          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 150 }}
            className="flex-1"
            showsVerticalScrollIndicator={false}
          >
            {/* Viewer + privacy card */}
            <AuthorPrivacyCard
              avatarUrl={avatarUrl}
              displayName={displayName}
              feeling={vm.draft.feeling}
              feelingLabel={currentFeelingLabel}
              targetPage={targetPage}
              currentPrivacy={vm.draft.privacy}
              privacyOptions={privacyOptions}
              onSelectPrivacy={stableSetPrivacy}
              copy={copy}
            />

            {/* Caption Input card */}
            <CaptionComposer
              textInputRef={textInputRef}
              text={vm.draft.text}
              onChangeText={stableSetText}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={copy.placeholder}
              onInsertChar={insertCaptionChar}
              onFeelingPress={() => setFeelingSheetVisible(true)}
            />

            {/* Photos Preview Strip */}
            {!vm.draft.video ? (
              <MediaPreviewStrip
                photos={vm.draft.photos}
                onRemovePhoto={handleRemovePhoto}
                onClearPhotos={handleClearPhotos}
                onPickPhotos={handlePickPhotos}
                isProcessing={isProcessingPhotos}
                maxPhotos={Math.min(vm.maxPhotos, COMPOSER_PHOTO_LIMIT)}
                copy={copy}
              />
            ) : null}

            {/* Audio Preview Card */}
            <AudioPreviewCard
              isRecording={wavRecorder.isRecording}
              durationMs={wavRecorder.durationMs}
              audio={vm.draft.audio}
              onCancelRecording={handleCancelAudioRecording}
              onStopRecording={handleToggleAudioRecording}
              onRemoveAudio={handleRemoveAudio}
              copy={copy}
            />

            {/* Video Preview Card */}
            {vm.draft.video ? (
              <VideoPreviewCard
                video={vm.draft.video}
                onRemove={handleRemoveVideo}
                copy={copy}
                isKeyboardActive={isKeyboardActive}
              />
            ) : null}

            {/* Error banner */}
            {vm.error ? (
              <View className="mx-4 mt-4 rounded-lg bg-red-50 px-3 py-2">
                <Text style={{ color: '#B91C1C', fontSize: 13 }}>{vm.error}</Text>
              </View>
            ) : null}

            {/* Expanded Action Tray */}
            <Animated.View
              pointerEvents={isKeyboardActive ? 'none' : 'auto'}
              style={expandedTrayStyle}
            >
              <ComposerActionTray
                isFloating={false}
                copy={copy}
                language={language}
                onPickPhotos={handlePickPhotos}
                onFeelingPress={() => setFeelingSheetVisible(true)}
                onAudioAction={handleAudioAction}
                onPickVideo={handlePickVideo}
                onNavigate={handleActionNavigate}
                isRecording={wavRecorder.isRecording}
                insetsBottom={insets.bottom}
              />
            </Animated.View>
          </ScrollView>

          {/* Floating compact action bar and suggestions above keyboard */}
          <Animated.View
            pointerEvents={isKeyboardActive ? 'auto' : 'none'}
            style={floatingBarContainerStyle}
          >
            <ComposerActionTray
              isFloating={true}
              copy={copy}
              language={language}
              onPickPhotos={handlePickPhotos}
              onFeelingPress={() => setFeelingSheetVisible(true)}
              onAudioAction={handleAudioAction}
              onPickVideo={handlePickVideo}
              onNavigate={handleActionNavigate}
              isRecording={wavRecorder.isRecording}
              insetsBottom={insets.bottom}
            />

            {/* Suggestion chips */}
            {(vm.isLoadingCaptionSuggestions || vm.captionSuggestions.length > 0) && (
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
                {vm.isLoadingCaptionSuggestions && vm.captionSuggestions.length === 0 ? (
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
                      {copy.suggestionsLoading}
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

            {/* Quick-insert toolbar (# / @ / Done) */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderTopWidth:
                  vm.isLoadingCaptionSuggestions || vm.captionSuggestions.length > 0
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
                  backgroundColor: '#0000ff',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#FFFFFF',
                  }}
                >
                  {copy.done}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>


      <FeelingPickerSheet
        visible={feelingSheetVisible}
        current={vm.draft.feeling}
        onClose={() => setFeelingSheetVisible(false)}
        onPick={stableSetFeeling}
        onClear={stableClearFeeling}
        options={translatedFeelings}
        title={copy.feelingsTitle}
        clearLabel={copy.feelingsClear}
      />

      <DiscardPostDialog
        visible={discardDialogVisible}
        title={copy.discardTitle}
        message={copy.discardMessage}
        cancelLabel={copy.discardCancel}
        confirmLabel={copy.discardConfirm}
        onCancel={() => setDiscardDialogVisible(false)}
        onConfirm={handleConfirmDiscard}
      />

      <CreateActionSheet
        visible={moreSheetVisible}
        onClose={() => setMoreSheetVisible(false)}
        onNavigate={handleMoreNavigate}
      />
    </SafeAreaView>
  );
}

export default CreatePostScreen;
