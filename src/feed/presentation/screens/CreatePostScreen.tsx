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

import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
import {
  initialWindowMetrics,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Ellipsis,
  Globe2,
  Image as ImageIcon,
  Lock,
  MapPin,
  Pause,
  Pencil,
  Play,
  Search,
  Smile,
  Square,
  UserPlus,
  Users,
  Video as VideoIcon,
  X,
  BarChart3,
  Radio,
  ShoppingCart,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { useCreatePostViewModel } from '../../application/view-models/useCreatePostViewModel';
import { postCreatedEvents } from '../../application/events/postCreatedEvents';
import {
  formatAudioDuration,
} from '../../../shared-kernel/application/utils/audioFiles';
import { createVideoUploadThumbnail } from '../../../shared-kernel/application/utils/videoThumbnails';
import { useWavAudioRecorder } from '../../../shared-kernel/application/hooks/useWavAudioRecorder';
import { AudioPlayer } from '../../../shared-kernel/presentation/components/AudioPlayer';
import { AudioWaveform } from '../../../shared-kernel/presentation/components/AudioWaveform';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { KeyboardSafeView } from '../../../shared-kernel/presentation/components/KeyboardSafeView';
import CreateActionSheet, {
  CREATE_ACTIONS,
} from '../../../shared-kernel/presentation/components/CreateActionSheet';
import type { PagesItem } from '../../../pages/domain/types/pages.types';
import type { RootStackRouteName } from '../../../navigation/types';
import type {
  PostFeeling,
  PostLocation,
  PostPhotoAttachment,
  PostPrivacy,
  PostTaggedUser,
  PostVideoAttachment,
  PostAudioAttachment,
} from '../../domain/types/feed.types';
import type { ReelCaptionSuggestion } from '../../../reels/domain/types/reels.types';
import AddressSearchContent from '../../../shared-kernel/presentation/components/AddressSearchContent';
import type { ResolvedAddress } from '../../../shared-kernel/domain/types/addressSearch.types';
import {
  buildPostActivityContext,
  getPostFeelingLabel,
} from '../../application/composer/postActivityContext';
import { FeedMediaFrame } from '../components/FeedCardChrome';
import {
  getPhotoGridItemGutterStyle,
  getPhotoGridItemLayout,
  getPhotoGridRows,
} from '../components/photoGridLayout';
import {
  CREATE_POST_KEYBOARD_ACTION_KEYS,
  CREATE_POST_MORE_EXCLUDED_ACTION_KEYS,
  CREATE_POST_TRAY_ACTION_KEYS,
  type CreatePostTrayActionKey,
} from './createPostActionConfig';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type CreatePostRoute = RouteProp<RootStackParamList, typeof ROUTES.CREATE_POST>;

const COMPOSER_PHOTO_LIMIT = 9;
const CAPTION_LINE_HEIGHT = 24;
const CAPTION_MAX_LINES = 12;
const PHOTO_GRID_GAP = 2;
const MAX_TAGGED_USERS = 20;
// react-native-image-picker owns a single mutable native callback. Keep this
// lock module-wide so two composer instances cannot open the picker together.
let isNativeMediaPickerActive = false;
const createPostMoreExcludedActionKeys = new Set<string>(
  CREATE_POST_MORE_EXCLUDED_ACTION_KEYS,
);
const createPostMoreActions = CREATE_ACTIONS.filter(
  action => !createPostMoreExcludedActionKeys.has(action.key),
);

// ── Translation copy dictionary ───────────────────────────────────────
const CREATE_POST_COPY = {
  vi: {
    headerTitle: 'Tạo bài viết',
    post: 'Chia sẻ',
    privacyTitle: 'Phạm vi bài viết',
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
    tagPeople: 'Gắn thẻ',
    tagPeopleTitle: 'Gắn thẻ mọi người',
    tagPeopleSearch: 'Tìm bạn bè hoặc người bạn đang theo dõi',
    tagPeopleEmpty: 'Không tìm thấy người phù hợp.',
    tagPeopleLimit: 'Bạn chỉ có thể gắn tối đa 20 người.',
    tagPeopleSelected: 'Đã chọn {count}/20',
    taggedPeopleTitle: 'Những người được gắn thẻ',
    location: 'Vị trí',
    locationTitle: 'Thêm vị trí',
    locationClear: 'Xóa vị trí',
    tagsRemovedForPrivacy: 'Đã bỏ {count} người không thể xem bài viết với phạm vi mới.',
    editMedia: 'Chỉnh sửa',
    editMediaTitle: 'Chỉnh sửa nội dung đa phương tiện',
    removeMedia: 'Xóa',
    addMorePhotos: 'Thêm ảnh',
    loadMore: 'Tải thêm',
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
    photo: 'Hình ảnh',
    feeling: 'Cảm xúc',
    audio: 'Âm thanh',
    video: 'Video',
    more: 'Khác',
    moreShort: 'Khác',
    videoError: 'Không chọn được video',
    videoErrorTip: 'Vui lòng thử lại.',
    addVideo: 'Thêm video',
    done: 'Hoàn tất',
    privacyPublic: 'Công khai',
    privacyFollowing: 'Những người tôi theo dõi',
    privacyFriends: 'Bạn bè',
    privacyFollowers: 'Mọi người theo dõi tôi',
    privacyOnlyMe: 'Chỉ mình tôi',
    privacyAnonymous: 'Ẩn danh',
    privacyPublicDesc: 'Bất kỳ ai cũng có thể xem',
    privacyFollowingDesc: 'Chỉ những người bạn đang theo dõi',
    privacyFriendsDesc: 'Chỉ bạn bè có thể xem',
    privacyFollowersDesc: 'Chỉ những người đang theo dõi bạn',
    privacyOnlyMeDesc: 'Chỉ mình bạn nhìn thấy',
    privacyAnonymousDesc: 'Đăng bài dưới chế độ ẩn danh',
    feelingLabel: 'đang cảm thấy',
    suggestionsLoading: 'Đang tìm gợi ý...',
    processing: 'Đang xử lý...',
    tapToPlay: 'Nhấp để phát',
    tapToPause: 'Nhấp để tạm dừng',
    postAsPage: 'Đăng với tư cách Trang',
    poll: 'Thăm dò',
    product: 'Sản phẩm',
    job: 'Công việc',
    ad: 'Quảng cáo',
    live: 'Trực tiếp',
    page: 'Trang',
  },
  en: {
    headerTitle: 'Create Post',
    post: 'Post',
    privacyTitle: 'Post audience',
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
    tagPeople: 'Tag people',
    tagPeopleTitle: 'Tag people',
    tagPeopleSearch: 'Search friends or people you follow',
    tagPeopleEmpty: 'No eligible people found.',
    tagPeopleLimit: 'You can tag up to 20 people.',
    tagPeopleSelected: '{count}/20 selected',
    taggedPeopleTitle: 'Tagged people',
    location: 'Location',
    locationTitle: 'Add location',
    locationClear: 'Remove location',
    tagsRemovedForPrivacy: '{count} people were removed because they cannot view the new audience.',
    editMedia: 'Edit',
    editMediaTitle: 'Edit media',
    removeMedia: 'Remove',
    addMorePhotos: 'Add photos',
    loadMore: 'Load more',
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
    photo: 'Photos',
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
    privacyFollowing: 'People I follow',
    privacyFriends: 'Friends',
    privacyFollowers: 'People following me',
    privacyOnlyMe: 'Only me',
    privacyAnonymous: 'Anonymous',
    privacyPublicDesc: 'Anyone can see',
    privacyFollowingDesc: 'Only people you follow',
    privacyFriendsDesc: 'Only friends can see',
    privacyFollowersDesc: 'Only people following you',
    privacyOnlyMeDesc: 'Only you can see',
    privacyAnonymousDesc: 'Post without showing your identity',
    feelingLabel: 'is feeling',
    suggestionsLoading: 'Finding suggestions...',
    processing: 'Processing...',
    tapToPlay: 'Tap to play',
    tapToPause: 'Tap to pause',
    postAsPage: 'Post as Page',
    poll: 'Poll',
    product: 'Product',
    job: 'Job',
    ad: 'Advertisement',
    live: 'Live',
    page: 'Page',
  },
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

function normalizePickerAssetUri(uri: string) {
  if (
    Platform.OS === 'android' &&
    !uri.startsWith('file://') &&
    !uri.startsWith('content://')
  ) {
    return `file://${uri}`;
  }
  return uri;
}

function assetToAttachment(asset: Asset): PostPhotoAttachment | null {
  if (!asset.uri) return null;
  const uri = normalizePickerAssetUri(asset.uri);
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
  const uri = normalizePickerAssetUri(asset.uri);
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
const TOKEN_BRAND = APP_BRAND_COLOR;
const COMPOSER_TOKEN_PATTERN = /([@#][^\s@#.,!?;:()[\]{}"']+)/g;

function renderHighlightedText(value: string) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  COMPOSER_TOKEN_PATTERN.lastIndex = 0;
  while ((match = COMPOSER_TOKEN_PATTERN.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index));
    }
    nodes.push(
      <Text key={`${match[0]}-${match.index}`} style={{ color: TOKEN_BRAND }}>
        {match[0]}
      </Text>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : value;
}

function HighlightedComposerInput({
  inputRef,
  value,
  onChangeText,
  placeholder,
  onFocus,
  onBlur,
}: {
  inputRef: React.RefObject<TextInput | null>;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const hasValue = value.length > 0;
  const textStyle = {
    fontSize: 16,
    lineHeight: 22,
    padding: 0,
  };

  return (
    <View
      style={{
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
        minHeight: 42,
        maxHeight: 120,
      }}
    >
      {hasValue ? (
        <Text
          pointerEvents="none"
          style={{
            ...textStyle,
            color: '#0f172a',
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            zIndex: 2,
            elevation: 2,
          }}
        >
          {renderHighlightedText(value)}
        </Text>
      ) : null}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        multiline
        scrollEnabled
        cursorColor={TOKEN_BRAND}
        selectionColor={TOKEN_BRAND}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          ...textStyle,
          backgroundColor: 'transparent',
          color: hasValue ? 'transparent' : '#0f172a',
          minHeight: 42,
          maxHeight: 120,
          textAlignVertical: 'top',
          zIndex: 1,
        }}
      />
    </View>
  );
}

function CaptionSuggestionBar({
  isVisible,
  isLoading,
  suggestions,
  loadingLabel,
  onPick,
}: {
  isVisible: boolean;
  isLoading: boolean;
  suggestions: ReelCaptionSuggestion[];
  loadingLabel: string;
  onPick: (suggestion: ReelCaptionSuggestion) => void;
}) {
  if (!isVisible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 48,
        left: 0,
        right: 0,
        zIndex: 50,
        elevation: 50,
        maxHeight: 220,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{
          paddingVertical: 4,
        }}
      >
        {isLoading && suggestions.length === 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 }}>
            <ActivityIndicator color={TOKEN_BRAND} size="small" />
            <Text style={{ marginLeft: 8, fontSize: 13, color: '#64748b', fontWeight: '600' }}>
              {loadingLabel}
            </Text>
          </View>
        ) : (
          suggestions.map(suggestion => {
            const isMention = suggestion.kind === 'mention';
            return (
              <TouchableOpacity
                key={`${suggestion.kind}-${suggestion.id}-${suggestion.value}`}
                activeOpacity={0.75}
                onPress={() => onPick(suggestion)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                  backgroundColor: '#ffffff',
                }}
              >
                {isMention && suggestion.avatarUrl ? (
                  <Image
                    source={{ uri: suggestion.avatarUrl }}
                    style={{ width: 34, height: 34, borderRadius: 17, marginRight: 10 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      marginRight: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: APP_COLORS.brand.soft,
                    }}
                  >
                    <Text style={{ color: TOKEN_BRAND, fontWeight: '800', fontSize: 13 }}>
                      {isMention ? '@' : '#'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: isMention ? '#0f172a' : TOKEN_BRAND,
                      fontSize: 14,
                      fontWeight: '800',
                    }}
                  >
                    {isMention ? suggestion.label : suggestion.value}
                  </Text>
                  {suggestion.subtitle ? (
                    <Text numberOfLines={1} style={{ color: '#64748b', fontSize: 11 }}>
                      {suggestion.subtitle}
                    </Text>
                  ) : null}
                </View>
                <ChevronRight size={18} color={TOKEN_BRAND} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
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
        <Pressable onPress={() => { }} className="mt-auto bg-white pt-2 pb-6 rounded-t-[24px] max-h-[70%]">
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
                <Text className="text-title-secondary font-bold text-brand">{clearLabel}</Text>
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
                          ? 'ml-3 text-title-primary font-bold text-brand'
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

type TaggableUsersResult = {
  users: PostTaggedUser[];
  nextCursor?: string;
  hasMore: boolean;
};

function TagPeoplePickerSheet({
  visible,
  selected,
  onClose,
  onDone,
  onSearch,
  copy,
}: {
  visible: boolean;
  selected: PostTaggedUser[];
  onClose: () => void;
  onDone: (users: PostTaggedUser[]) => void;
  onSearch: (input: {
    query?: string;
    cursor?: string;
    userIds?: string[];
  }) => Promise<TaggableUsersResult>;
  copy: any;
}) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<PostTaggedUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<PostTaggedUser[]>(selected);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const safeAreaInsets = useSafeAreaInsets();
  const safeTopInset = Math.max(
    safeAreaInsets.top,
    initialWindowMetrics?.insets.top ?? 0,
  );

  useEffect(() => {
    if (!visible) return;
    setSelectedUsers(selected);
  }, [selected, visible]);

  useEffect(() => {
    if (!visible) return;
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const page = await onSearch({ query });
        if (requestId !== requestIdRef.current) return;
        setUsers(page.users);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setUsers([]);
        setNextCursor(undefined);
        setHasMore(false);
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [onSearch, query, visible]);

  const toggleUser = (user: PostTaggedUser) => {
    setSelectedUsers(current => {
      const exists = current.some(item => item.id === user.id);
      if (exists) return current.filter(item => item.id !== user.id);
      if (current.length >= MAX_TAGGED_USERS) {
        Alert.alert(copy.tagPeopleTitle, copy.tagPeopleLimit);
        return current;
      }
      return [...current, user];
    });
  };

  const loadMore = async () => {
    if (!hasMore || !nextCursor || isLoading) return;
    setIsLoading(true);
    try {
      const page = await onSearch({ query, cursor: nextCursor });
      setUsers(current => {
        const merged = new Map(current.map(user => [user.id, user]));
        page.users.forEach(user => merged.set(user.id, user));
        return Array.from(merged.values());
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        style={{
          flex: 1,
          paddingTop: safeTopInset,
          backgroundColor: '#F8FAFC',
        }}
      >
        <FocusAwareStatusBar
          backgroundColor="#F8FAFC"
          barStyle="dark-content"
        />
        <View className="h-16 flex-row items-center border-b border-slate-200 bg-white px-4">
          <TouchableOpacity
            onPress={onClose}
            className="h-11 w-11 items-center justify-center rounded-full bg-slate-100"
          >
            <X size={21} color="#0F172A" />
          </TouchableOpacity>
          <View className="ml-3 flex-1">
            <Text className="text-[17px] font-bold text-slate-900">
              {copy.tagPeopleTitle}
            </Text>
            <Text className="mt-0.5 text-[12px] font-semibold text-slate-500">
              {copy.tagPeopleSelected.replace(
                '{count}',
                String(selectedUsers.length),
              )}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onDone(selectedUsers)}
            className="h-11 items-center justify-center rounded-full bg-brand px-4"
          >
            <Text className="text-[14px] font-bold text-white">{copy.done}</Text>
          </TouchableOpacity>
        </View>

        <View className="mx-4 mt-4 h-12 flex-row items-center rounded-xl border border-slate-200 bg-white px-3">
          <Search size={18} color="#94A3B8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={copy.tagPeopleSearch}
            placeholderTextColor="#94A3B8"
            autoCorrect={false}
            className="ml-2 flex-1 text-[15px] text-slate-900"
          />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 32,
          }}
        >
          {users.map(user => {
            const isSelected = selectedUsers.some(item => item.id === user.id);
            return (
              <TouchableOpacity
                key={user.id}
                onPress={() => toggleUser(user)}
                activeOpacity={0.72}
                className="mb-2 flex-row items-center rounded-xl border border-slate-200 bg-white p-3"
              >
                {user.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={{ width: 44, height: 44, borderRadius: 22 }}
                  />
                ) : (
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-slate-200">
                    <Text className="font-bold text-slate-600">
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="mx-3 flex-1">
                  <Text className="text-[14px] font-bold text-slate-900">
                    {user.name}
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-slate-500">
                    @{user.username}
                  </Text>
                </View>
                <View
                  className={
                    isSelected
                      ? 'h-7 w-7 items-center justify-center rounded-full bg-brand'
                      : 'h-7 w-7 rounded-full border-2 border-slate-300'
                  }
                >
                  {isSelected ? <Check size={16} color="#FFFFFF" /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
          {!isLoading && users.length === 0 ? (
            <Text className="py-10 text-center text-[14px] text-slate-500">
              {copy.tagPeopleEmpty}
            </Text>
          ) : null}
          {isLoading ? (
            <ActivityIndicator
              style={{ marginVertical: 20 }}
              color={APP_BRAND_COLOR}
            />
          ) : null}
          {hasMore && !isLoading ? (
            <TouchableOpacity
              onPress={() => void loadMore()}
              className="h-11 items-center justify-center rounded-xl bg-slate-100"
            >
              <Text className="text-[13px] font-bold text-brand">
                {copy.loadMore}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function LocationPickerSheet({
  visible,
  current,
  onClose,
  onPick,
  onClear,
  copy,
}: {
  visible: boolean;
  current?: PostLocation;
  onClose: () => void;
  onPick: (location: PostLocation) => void;
  onClear: () => void;
  copy: any;
}) {
  const [query, setQuery] = useState(current?.label ?? '');

  useEffect(() => {
    if (visible) setQuery(current?.label ?? '');
  }, [current?.label, visible]);

  const chooseResolved = (address: ResolvedAddress) => {
    onPick({ label: address.formattedAddress.trim() });
    onClose();
  };

  const chooseTyped = (address: string) => {
    const label = address.trim();
    if (!label) return;
    onPick({ label });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {current ? (
          <TouchableOpacity
            onPress={() => {
              onClear();
              onClose();
            }}
            className="absolute right-4 top-3 z-20 h-10 justify-center rounded-full bg-red-50 px-3"
          >
            <Text className="text-[13px] font-bold text-red-600">
              {copy.locationClear}
            </Text>
          </TouchableOpacity>
        ) : null}
        <AddressSearchContent
          key={`${visible ? 'visible' : 'hidden'}:${current?.label ?? ''}`}
          initialQuery={query}
          onClose={onClose}
          onQueryChange={setQuery}
          onResolvedAddress={chooseResolved}
          onUseTypedAddress={chooseTyped}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────

// ── Sub-components React.memo ──────────────────────────────────────────

interface CreatePostHeaderProps {
  onDiscard: () => void;
  onSubmit: () => void;
  onLivePress: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  isProcessingPhotos: boolean;
  copy: any;
}

const CreatePostHeader = React.memo(({
  onDiscard,
  onSubmit,
  onLivePress,
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

      <View style={{ flex: 1 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={onLivePress}
          activeOpacity={0.7}
          className="rounded-full bg-red-500 px-5 py-2.5 mr-2 flex-row items-center"
          style={{ backgroundColor: '#ef4444' }}
        >
          <Radio size={16} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 4 }} />
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
            Live
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSubmit}
          disabled={!canSubmit || isProcessingPhotos}
          activeOpacity={0.7}
          className={
            canSubmit && !isProcessingPhotos
              ? 'rounded-full bg-brand px-6 py-2.5'
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
    </View>
  );
});

interface AuthorPrivacyCardProps {
  avatarUrl?: string;
  displayName: string;
  feeling?: PostFeeling;
  taggedUsers: PostTaggedUser[];
  location?: PostLocation;
  targetPage?: any;
  currentPrivacy: PostPrivacy;
  privacyOptions: Array<{ value: PostPrivacy; label: string; Icon: any; description: string }>;
  canSelectPrivacy: boolean;
  onSelectPrivacy: (privacy: PostPrivacy) => void | Promise<void>;
  onTagPeoplePress: () => void;
  onTaggedPeopleLabelPress: () => void;
  onLocationPress: () => void;
  onFeelingPress: () => void;
  language: 'vi' | 'en';
  copy: any;
}

const AuthorPrivacyCard = React.memo(({
  avatarUrl,
  displayName,
  feeling,
  taggedUsers,
  location,
  targetPage,
  currentPrivacy,
  privacyOptions,
  canSelectPrivacy,
  onSelectPrivacy,
  onTagPeoplePress,
  onTaggedPeopleLabelPress,
  onLocationPress,
  onFeelingPress,
  language,
  copy,
}: AuthorPrivacyCardProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentOpt = useMemo(() => {
    return privacyOptions.find(opt => opt.value === currentPrivacy) ?? privacyOptions[0];
  }, [privacyOptions, currentPrivacy]);
  const activity = useMemo(
    () =>
      buildPostActivityContext({
        language,
        feeling,
        taggedUsers,
        location,
      }),
    [feeling, language, location, taggedUsers],
  );

  const PrivacyIcon = currentOpt.Icon;
  const metadataActions = [
    {
      key: 'tag',
      label: copy.tagPeople,
      Icon: UserPlus,
      onPress: onTagPeoplePress,
      disabled: currentPrivacy === 'only_me',
      active: taggedUsers.length > 0,
    },
    {
      key: 'location',
      label: copy.location,
      Icon: MapPin,
      onPress: onLocationPress,
      disabled: false,
      active: Boolean(location),
    },
    {
      key: 'feeling',
      label: copy.feeling,
      Icon: Smile,
      onPress: onFeelingPress,
      disabled: false,
      active: Boolean(feeling),
    },
  ];

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
      className="mx-4 mt-4 bg-white rounded-[20px] border border-slate-100 p-4"
    >
      <View className="flex-row items-center">
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
        </View>
        <View style={{ flex: 1, marginLeft: 16, minWidth: 0 }}>
          <Text
            style={{ color: '#1E293B', fontSize: 16, lineHeight: 21 }}
            numberOfLines={2}
          >
            <Text style={{ fontWeight: '800' }}>{displayName}</Text>
            {activity.fullText ? (
              <>
                {' '}
                {activity.segments.map((segment, index) => {
                  if (segment.kind === 'tagged_users') {
                    return (
                      <Text
                        key={`${segment.kind}:${index}`}
                        onPress={onTaggedPeopleLabelPress}
                        style={{ color: APP_BRAND_COLOR, fontWeight: '700' }}
                      >
                        {segment.text}
                      </Text>
                    );
                  }

                  const isEmphasized =
                    segment.kind === 'feeling' ||
                    segment.kind === 'location';
                  return (
                    <Text
                      key={`${segment.kind}:${index}`}
                      style={{
                        color: isEmphasized ? '#1E293B' : '#64748B',
                        fontWeight: isEmphasized ? '700' : '500',
                      }}
                    >
                      {segment.text}
                    </Text>
                  );
                })}
              </>
            ) : null}
          </Text>
          {targetPage ? (
            <Text className="mt-1 text-[12px] font-semibold text-brand">
              {copy.postAsPage}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={{
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'center',
          columnGap: 6,
          zIndex: 300,
        }}
      >
        <View
          style={{
            position: 'relative',
            width: 112,
            flexShrink: 0,
            zIndex: 400,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (canSelectPrivacy) setIsDropdownOpen(prev => !prev);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={currentOpt.label}
            style={{
              height: 44,
              minWidth: 0,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              backgroundColor: '#F1F5F9',
              paddingHorizontal: 10,
            }}
          >
            <PrivacyIcon size={15} color="#475569" />
            <Text
              className="mx-1.5 text-[12px] font-semibold text-slate-600"
              numberOfLines={1}
            >
              {currentOpt.label}
            </Text>
            {canSelectPrivacy ? <ChevronDown size={13} color="#475569" /> : null}
          </TouchableOpacity>

          {isDropdownOpen && canSelectPrivacy ? (
            <View
              style={{
                position: 'absolute',
                top: 48,
                left: 0,
                width: 260,
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
                      void onSelectPrivacy(opt.value);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: isSelected ? APP_COLORS.brand.soft : 'transparent',
                    }}
                  >
                    <OptIcon size={14} color={isSelected ? APP_BRAND_COLOR : '#64748B'} />
                    <Text
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? APP_BRAND_COLOR : '#334155',
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>

        <ScrollView
          testID="create-post-metadata-actions"
          horizontal
          style={{ flex: 1 }}
          contentContainerStyle={{
            alignItems: 'center',
            columnGap: 6,
            paddingRight: 2,
          }}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {metadataActions.map(action => {
            const ActionIcon = action.Icon;
            return (
              <TouchableOpacity
                key={action.key}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={action.onPress}
                disabled={action.disabled}
                activeOpacity={0.72}
                style={{
                  height: 44,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 10,
                  backgroundColor: action.active
                    ? APP_COLORS.brand.softPressed
                    : '#F8FAFC',
                  borderWidth: 1,
                  borderColor: action.active
                    ? APP_COLORS.brand.border
                    : '#E2E8F0',
                  opacity: action.disabled ? 0.4 : 1,
                }}
              >
                <ActionIcon
                  size={17}
                  color={action.active ? APP_BRAND_COLOR : '#64748B'}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    marginLeft: 6,
                    color: action.active ? APP_BRAND_COLOR : '#475569',
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
  copy: any;
  onPickPhotos: () => void;
  onPickVideo: () => void;
  onCreateProduct: () => void;
  onCreatePoll: () => void;
  showPrimaryActions?: boolean;
  embedded?: boolean;
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
  copy,
  onPickPhotos,
  onPickVideo,
  onCreateProduct,
  onCreatePoll,
  showPrimaryActions = true,
  embedded = false,
}: CaptionComposerProps) => {
  const [inputHeight, setInputHeight] = useState(CAPTION_LINE_HEIGHT);
  const [isCaptionOverflowing, setIsCaptionOverflowing] = useState(false);
  const maxInputHeight = CAPTION_LINE_HEIGHT * CAPTION_MAX_LINES;
  const isVi = copy.photo === 'Ảnh';
  const photoLabel = isVi ? 'Đăng tải hình ảnh' : 'Upload photos';
  const videoLabel = isVi ? 'Tải đoạn phim lên' : 'Upload video';
  const productLabel = isVi ? 'Bán sản phẩm' : 'Sell product';
  const pollLabel = isVi ? 'Tạo cuộc thăm dò ý kiến' : 'Create poll';

  return (
    <View
      style={
        embedded
          ? undefined
          : {
              shadowColor: '#94a3b8',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }
      }
      className={
        embedded
          ? 'bg-white px-4 pb-3 pt-4'
          : 'mx-4 mt-4 rounded-[20px] border border-slate-100 bg-white p-4'
      }
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
        scrollEnabled={isCaptionOverflowing}
        textAlignVertical="top"
        onContentSizeChange={event => {
          const contentHeight = Math.ceil(event.nativeEvent.contentSize.height);
          setIsCaptionOverflowing(contentHeight > maxInputHeight);
          const nextHeight = Math.max(
            CAPTION_LINE_HEIGHT,
            Math.min(
              maxInputHeight,
              contentHeight,
            ),
          );
          setInputHeight(nextHeight);
        }}
        style={{
          fontSize: 17,
          lineHeight: CAPTION_LINE_HEIGHT,
          color: '#1e293b',
          padding: 0,
          height: inputHeight,
          minHeight: CAPTION_LINE_HEIGHT,
          maxHeight: maxInputHeight,
        }}
      />

      <View className="mt-2 flex-row items-center justify-end">
        <CharacterCounter length={text.length} />
      </View>

      {showPrimaryActions ? (
        <View className="mt-4 border-t border-slate-100 pt-4">
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onPickPhotos}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f1f5f9',
                borderRadius: 20,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <ImageIcon size={18} color={APP_BRAND_COLOR} strokeWidth={2.5} />
              <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#475569' }} numberOfLines={1}>
                {photoLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onPickVideo}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f1f5f9',
                borderRadius: 20,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <VideoIcon size={18} color="#22c55e" strokeWidth={2.5} />
              <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#475569' }} numberOfLines={1}>
                {videoLabel}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onCreateProduct}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f1f5f9',
                borderRadius: 20,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <ShoppingCart size={18} color="#f97316" strokeWidth={2.5} />
              <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#475569' }} numberOfLines={1}>
                {productLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onCreatePoll}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f1f5f9',
                borderRadius: 20,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <BarChart3 size={18} color="#0d9488" strokeWidth={2.5} />
              <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#475569' }} numberOfLines={1}>
                {pollLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
});

const PostContentPreview = React.memo(({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <View
      testID="create-post-content-preview"
      className="mx-4 mt-4 overflow-hidden rounded-[20px] border border-slate-100 bg-white"
      style={{
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      {children}
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
  embedded?: boolean;
}

const MediaPreviewStrip = React.memo(({
  photos,
  onRemovePhoto,
  onClearPhotos,
  onPickPhotos,
  isProcessing,
  maxPhotos,
  copy,
  embedded = false,
}: MediaPreviewStripProps) => {
  const { width } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(Math.max(width - 32, 0));
  const [isEditing, setIsEditing] = useState(false);
  const visiblePhotos = useMemo(() => photos.slice(0, 4), [photos]);
  const photoRows = useMemo(
    () => getPhotoGridRows(photos.length),
    [photos.length],
  );

  if (photos.length === 0 && !isProcessing) {
    return null;
  }

  const effectiveMaxPhotos = Math.min(maxPhotos, COMPOSER_PHOTO_LIMIT);
  const canAddMore = photos.length < effectiveMaxPhotos;
  const singlePhoto = photos[0];
  const singleAspectRatio =
    singlePhoto?.width && singlePhoto?.height
      ? Math.max(0.75, Math.min(1.91, singlePhoto.width / singlePhoto.height))
      : 1.4;

  return (
    <View className={embedded ? 'mt-1' : 'mx-4 mt-4'}>
      <View
        className={
          embedded
            ? 'mb-2 flex-row items-center justify-between px-4'
            : 'mb-2 flex-row items-center justify-between'
        }
      >
        <Text className="text-[13px] font-semibold text-slate-500">
          {photos.length}/{effectiveMaxPhotos}
        </Text>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setIsEditing(true)}
          accessibilityRole="button"
          accessibilityLabel={copy.editMedia}
          className="h-9 flex-row items-center rounded-full bg-slate-100 px-3"
        >
          <Pencil size={15} color={APP_BRAND_COLOR} />
          <Text className="ml-1.5 text-[13px] font-bold text-brand">
            {copy.editMedia}
          </Text>
        </TouchableOpacity>
      </View>

      {photos.length === 1 ? (
        <FeedMediaFrame
          className="overflow-hidden bg-slate-100"
          style={{ width: '100%', aspectRatio: singleAspectRatio }}
        >
          <Image
            source={{ uri: photos[0].uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </FeedMediaFrame>
      ) : photos.length > 1 ? (
        <FeedMediaFrame
          className="overflow-hidden bg-transparent"
          onLayout={event => setGridWidth(event.nativeEvent.layout.width)}
          style={{ width: '100%' }}
        >
          {photoRows.map((row, rowIndex) => {
            const rowHeight = getPhotoGridItemLayout(
              row[0],
              photos.length,
              gridWidth,
            ).height;

            return (
              <View
                key={`row:${rowIndex}`}
                style={{
                  width: '100%',
                  height: rowHeight,
                  flexDirection: 'row',
                }}
              >
                {row.map(index => {
                  const photo = visiblePhotos[index];
                  if (!photo) return null;
                  const layout = getPhotoGridItemLayout(
                    index,
                    photos.length,
                    gridWidth,
                  );
                  const gutter = getPhotoGridItemGutterStyle(
                    index,
                    photos.length,
                    PHOTO_GRID_GAP,
                  );
                  const hiddenCount =
                    index === 3 ? Math.max(photos.length - 4, 0) : 0;

                  return (
                    <View
                      key={photo.uri}
                      style={[
                        {
                          width: layout.width,
                          height: '100%',
                        },
                        gutter,
                      ]}
                    >
                      <View
                        style={{
                          width: '100%',
                          height: '100%',
                          overflow: 'hidden',
                          backgroundColor: '#F1F5F9',
                        }}
                      >
                        <Image
                          source={{ uri: photo.uri }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                        {hiddenCount > 0 ? (
                          <View
                            style={[
                              StyleSheet.absoluteFill,
                              {
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                              },
                            ]}
                          >
                            <Text className="text-[22px] font-black text-white">
                              +{hiddenCount}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </FeedMediaFrame>
      ) : null}

      {isProcessing ? (
        <View
          className={
            embedded
              ? 'mx-4 mt-2 h-20 items-center justify-center rounded-lg bg-slate-100'
              : 'mt-2 h-20 items-center justify-center rounded-lg bg-slate-100'
          }
        >
          <ActivityIndicator color={APP_BRAND_COLOR} size="small" />
          <Text className="mt-2 text-[11px] font-semibold text-slate-500">
            {copy.processing}
          </Text>
        </View>
      ) : null}

      <Modal
        visible={isEditing}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsEditing(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <View className="h-16 flex-row items-center border-b border-slate-200 bg-white px-4">
            <TouchableOpacity
              onPress={() => setIsEditing(false)}
              className="h-11 w-11 items-center justify-center rounded-full bg-slate-100"
            >
              <X size={21} color="#0F172A" />
            </TouchableOpacity>
            <Text className="ml-3 flex-1 text-[17px] font-bold text-slate-900">
              {copy.editMediaTitle}
            </Text>
            {canAddMore ? (
              <TouchableOpacity
                onPress={onPickPhotos}
                className="h-11 flex-row items-center rounded-full bg-brand px-3"
              >
                <ImageIcon size={17} color="#FFFFFF" />
                <Text className="ml-1.5 text-[13px] font-bold text-white">
                  {copy.addMorePhotos}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {photos.map((photo, index) => (
              <View
                key={photo.uri}
                className="mb-3 flex-row items-center rounded-xl border border-slate-200 bg-white p-2"
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={{ width: 72, height: 72, borderRadius: 8 }}
                  resizeMode="cover"
                />
                <Text className="mx-3 flex-1 text-[14px] font-semibold text-slate-700">
                  {copy.photo} {index + 1}
                </Text>
                <TouchableOpacity
                  onPress={() => onRemovePhoto(photo.uri)}
                  accessibilityLabel={copy.removeMedia}
                  className="h-11 w-11 items-center justify-center rounded-full bg-red-50"
                >
                  <X size={18} color={APP_COLORS.status.error} />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length > 0 ? (
              <TouchableOpacity
                onPress={onClearPhotos}
                className="mt-2 h-12 items-center justify-center rounded-xl border border-red-200 bg-red-50"
              >
                <Text className="text-[14px] font-bold text-red-600">
                  {copy.clearPhotos}
                </Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
});

interface VideoPreviewCardProps {
  video: PostVideoAttachment;
  onRemove: () => void;
  copy: any;
  isKeyboardActive: boolean;
  embedded?: boolean;
}

const VideoPreviewCard = React.memo(({
  video,
  onRemove,
  copy,
  isKeyboardActive,
  embedded = false,
}: VideoPreviewCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const aspectRatio =
    video.width && video.height
      ? Math.max(0.75, Math.min(1.91, video.width / video.height))
      : 16 / 9;

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

  const handleEdit = () => {
    Alert.alert(copy.editMediaTitle, video.name, [
      { text: copy.audioCancel, style: 'cancel' },
      { text: copy.removeMedia, style: 'destructive', onPress: onRemove },
    ]);
  };

  return (
    <View className={embedded ? 'mt-1' : 'mx-4 mt-4'}>
      <View
        className={
          embedded
            ? 'mb-2 flex-row items-center justify-between px-4'
            : 'mb-2 flex-row items-center justify-between'
        }
      >
        <Text
          className="mr-3 flex-1 text-[13px] font-semibold text-slate-500"
          numberOfLines={1}
        >
          {video.name}
        </Text>
        <TouchableOpacity
          onPress={handleEdit}
          activeOpacity={0.75}
          accessibilityLabel={copy.editMedia}
          className="h-9 flex-row items-center rounded-full bg-slate-100 px-3"
        >
          <Pencil size={15} color={APP_BRAND_COLOR} />
          <Text className="ml-1.5 text-[13px] font-bold text-brand">
            {copy.editMedia}
          </Text>
        </TouchableOpacity>
      </View>

      <FeedMediaFrame
        className="overflow-hidden bg-black"
        style={{ width: '100%', aspectRatio }}
      >
        <View
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Skeleton/Placeholder until first frame loads */}
          {!isVideoLoaded && (
            <View style={StyleSheet.absoluteFill} className="items-center justify-center bg-slate-950 z-10">
              {video.thumbnailUri ? (
                <Image
                  source={{ uri: video.thumbnailUri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : null}
              <View style={StyleSheet.absoluteFill} className="bg-black/25" />
              <ActivityIndicator color={APP_BRAND_COLOR} size="small" />
              <Text className="mt-2 text-xs font-semibold text-slate-400">
                {copy.processing}
              </Text>
            </View>
          )}

          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <VideoPlayer
              source={{ uri: video.uri }}
              style={{ width: '100%', height: '100%' }}
              paused={!isPlaying}
              resizeMode="cover"
              onLoad={handleLoad}
              repeat
            />
          </View>

          <View
            style={StyleSheet.absoluteFill}
            className="bg-black/20"
            pointerEvents="none"
          />

          <TouchableOpacity
            onPress={handlePlayPause}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? copy.tapToPause : copy.tapToPlay}
            className="absolute h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/55"
            style={{
              top: '50%',
              left: '50%',
              marginTop: -28,
              marginLeft: -28,
            }}
          >
            {isPlaying ? (
              <Pause size={24} color="#FFFFFF" fill="#FFFFFF" />
            ) : (
              <Play
                size={24}
                color="#FFFFFF"
                fill="#FFFFFF"
                style={{ marginLeft: 3 }}
              />
            )}
          </TouchableOpacity>

          {/* Meta Info overlay (Duration) */}
          {video.duration ? (
            <View className="absolute bottom-2.5 right-2.5 rounded-lg border border-white/10 bg-black/70 px-2.5 py-1">
              <Text className="text-[11px] font-bold text-slate-100">
                {formatAudioDuration(video.duration * 1000)}
              </Text>
            </View>
          ) : null}
        </View>
      </FeedMediaFrame>
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
      <View className="mx-4 mt-4 flex-row items-center rounded-[20px] border border-info-border bg-info-soft p-4">
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
  onPickPhotos: () => void;
  onPickVideo: () => void;
  onNavigate: (route: string) => void;
  insetsBottom: number;
  mediaPickerBusy: boolean;
}

interface ComposerShortcutButton {
  key: CreatePostTrayActionKey;
  label: string;
  onPress: () => void;
  Icon: React.ComponentType<{
    size: number;
    color: string;
    strokeWidth?: number;
  }>;
  iconBg: string;
  iconColor: string;
  disabled?: boolean;
}

const ComposerActionTray = React.memo(({
  isFloating,
  copy,
  onPickPhotos,
  onPickVideo,
  onNavigate,
  insetsBottom,
  mediaPickerBusy,
}: ComposerActionTrayProps) => {
  const allButtons = useMemo<ComposerShortcutButton[]>(() => {
    const createRouteButton = (
      key: Exclude<CreatePostTrayActionKey, 'photo' | 'video'>,
      label: string,
      route: RootStackRouteName,
    ): ComposerShortcutButton | null => {
      const action = CREATE_ACTIONS.find(candidate => candidate.key === key);
      if (!action) return null;

      return {
        key,
        label,
        onPress: () => onNavigate(route),
        Icon: action.Icon,
        iconBg: action.iconBg,
        iconColor: action.iconColor,
      };
    };

    const buttons: Array<ComposerShortcutButton | null> = [
      {
        key: 'photo',
        label: copy.photo,
        onPress: onPickPhotos,
        Icon: ImageIcon,
        iconBg: '#f0fdf4',
        iconColor: '#22c55e',
        disabled: mediaPickerBusy,
      },
      {
        key: 'video',
        label: copy.video,
        onPress: onPickVideo,
        Icon: VideoIcon,
        iconBg: APP_COLORS.brand.soft,
        iconColor: APP_BRAND_COLOR,
        disabled: mediaPickerBusy,
      },
      createRouteButton('product', copy.product, ROUTES.CREATE_PRODUCT),
      createRouteButton('job', copy.job, ROUTES.CREATE_JOB),
      createRouteButton('live', copy.live, ROUTES.GO_LIVE),
      createRouteButton('poll', copy.poll, ROUTES.CREATE_POLL),
      createRouteButton('ad', copy.ad, ROUTES.CREATE_AD),
    ];
    const buttonByKey = new Map(
      buttons
        .filter(
          (button): button is ComposerShortcutButton => button !== null,
        )
        .map(button => [button.key, button]),
    );

    return CREATE_POST_TRAY_ACTION_KEYS.map(key => buttonByKey.get(key)).filter(
      (button): button is ComposerShortcutButton => Boolean(button),
    );
  }, [
    copy.ad,
    copy.job,
    copy.live,
    copy.photo,
    copy.poll,
    copy.product,
    copy.video,
    onNavigate,
    onPickPhotos,
    onPickVideo,
    mediaPickerBusy,
  ]);

  const visibleButtons = useMemo(() => {
    const visibleKeys = isFloating
      ? CREATE_POST_KEYBOARD_ACTION_KEYS
      : CREATE_POST_TRAY_ACTION_KEYS;
    const buttonByKey = new Map(
      allButtons.map(button => [button.key, button]),
    );

    return visibleKeys
      .map(key => buttonByKey.get(key))
      .filter(
        (button): button is ComposerShortcutButton => Boolean(button),
      );
  }, [allButtons, isFloating]);

  const SECONDARY_LABEL_COLOR = '#475569';

  const renderShortcutButton = (
    button: ComposerShortcutButton,
    size: 44 | 48,
  ) => {
    const Icon = button.Icon;
    return (
      <TouchableOpacity
        key={button.key}
        onPress={button.onPress}
        disabled={button.disabled}
        activeOpacity={0.7}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flex: isFloating ? 1 : undefined,
          width: isFloating ? undefined : '25%',
          paddingHorizontal: 2,
          marginBottom: isFloating ? 0 : 14,
          opacity: button.disabled ? 0.45 : 1,
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
          <Icon size={size === 44 ? 20 : 22} color={button.iconColor} />
        </View>
        {isFloating ? null : (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={{
              width: '100%',
              fontSize: 12,
              fontWeight: '600',
              color: SECONDARY_LABEL_COLOR,
              textAlign: 'center',
            }}
          >
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
        <Ellipsis
          size={isFloating ? 20 : 22}
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
        {visibleButtons.map(button => renderShortcutButton(button, 44))}
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
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1e293b' }}>{copy.addPost}</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          marginHorizontal: -2,
          marginBottom: -14,
        }}
      >
        {visibleButtons.map(button => renderShortcutButton(button, 48))}
      </View>
    </View>
  );
});

export interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
  page?: PagesItem;
  groupId?: string;
  eventId?: string;
  initialAction?: 'photo' | 'video' | 'product' | 'poll';
  initialText?: string;
  replaceRouteOnNavigate?: boolean;
  presentation?: 'modal' | 'screen';
}

export function CreatePostModal({
  visible,
  onClose,
  onCreated,
  page,
  groupId,
  eventId,
  initialAction,
  initialText,
  replaceRouteOnNavigate = false,
  presentation = 'modal',
}: CreatePostModalProps) {
  const navigation = useNavigation<Nav>();
  const route = useRoute<CreatePostRoute>();
  const language = useAppLanguage();
  const copy = CREATE_POST_COPY[language];
  const targetPage = page ?? route.params?.page;
  const targetGroupId = groupId ?? route.params?.groupId;
  const composerContext = targetPage
    ? 'page'
    : targetGroupId
    ? 'group'
    : eventId
    ? 'event'
    : 'personal';
  const canSelectPrivacy =
    composerContext === 'personal' || composerContext === 'page';
  const initialTextValue = initialText ?? route.params?.initialText;

  const vm = useCreatePostViewModel({
    pageId: targetPage?.pageId,
    groupId: targetGroupId,
    eventId,
    onCreated: post => {
      if (!targetGroupId && !eventId) {
        postCreatedEvents.emit(post);
      }
      onCreated?.();
      onClose();
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

  const [privacyMenuVisible, setPrivacyMenuVisible] = useState(false);
  const [feelingSheetVisible, setFeelingSheetVisible] = useState(false);
  const [tagPeopleSheetVisible, setTagPeopleSheetVisible] = useState(false);
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  const [discardDialogVisible, setDiscardDialogVisible] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);

  const privacyOptions = useMemo(() => {
    const options = [
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
        value: 'followers' as PostPrivacy,
        label: copy.privacyFollowers,
        Icon: Users,
        description: copy.privacyFollowersDesc,
      },
      {
        value: 'only_me' as PostPrivacy,
        label: copy.privacyOnlyMe,
        Icon: Lock,
        description: copy.privacyOnlyMeDesc,
      },
    ];
    return composerContext === 'page'
      ? options.filter(
          option => option.value === 'public' || option.value === 'followers',
        )
      : options;
  }, [composerContext, copy]);

  const translatedFeelings = useMemo(() => {
    return FEELING_OPTIONS.map(feeling => ({
      ...feeling,
      label: getPostFeelingLabel(feeling, language),
    }));
  }, [language]);

  const textInputRef = useRef<TextInput | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const appliedInitialTextRef = useRef('');
  const consumedInitialActionRef = useRef(false);
  const mediaPickerInFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [isContentDragging, setIsContentDragging] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardActive(true));
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardActive(false);
      if (Platform.OS !== 'ios') {
        textInputRef.current?.blur();
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleInputFocus = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    if (Platform.OS === 'android') {
      setIsKeyboardActive(true);
    }
  }, []);

  const handleInputBlur = useCallback(() => {
    if (Platform.OS === 'android') {
      setIsKeyboardActive(false);
    }
  }, []);

  const handleContentScrollBegin = useCallback(() => {
    setIsContentDragging(true);
  }, []);

  const handleContentScrollEnd = useCallback(() => {
    setIsContentDragging(false);
  }, []);

  // Save callbacks in refs to make handlers stable & prevent re-renders
  const vmRef = useRef(vm);
  vmRef.current = vm;

  const handlePickPhotos = useCallback(async () => {
    if (mediaPickerInFlightRef.current || isNativeMediaPickerActive) return;

    const maxPhotos = Math.min(vmRef.current.maxPhotos, COMPOSER_PHOTO_LIMIT);
    const remaining = maxPhotos - vmRef.current.draft.photos.length;
    if (remaining <= 0) {
      Alert.alert(copy.limitTitle, copy.limitMsg.replace('{max}', String(maxPhotos)));
      return;
    }

    mediaPickerInFlightRef.current = true;
    isNativeMediaPickerActive = true;
    setIsProcessingPhotos(true);
    Keyboard.dismiss();
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
    } catch (caught) {
      if (isMountedRef.current) {
        Alert.alert(
          copy.libraryError,
          caught instanceof Error ? caught.message : '',
        );
      }
    } finally {
      mediaPickerInFlightRef.current = false;
      isNativeMediaPickerActive = false;
      if (isMountedRef.current) {
        setIsProcessingPhotos(false);
      }
    }
  }, [copy]);

  const handlePickVideo = useCallback(async () => {
    if (mediaPickerInFlightRef.current || isNativeMediaPickerActive) return;

    mediaPickerInFlightRef.current = true;
    isNativeMediaPickerActive = true;
    setIsProcessingPhotos(true);
    Keyboard.dismiss();
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
        const thumbnail = await createVideoUploadThumbnail(attachment.uri);
        vmRef.current.setVideo({
          ...attachment,
          thumbnailUri: thumbnail?.uri,
          thumbnailName: thumbnail?.name,
          thumbnailType: thumbnail?.type,
        });
      }
    } catch (caught) {
      if (isMountedRef.current) {
        Alert.alert(
          copy.videoError,
          caught instanceof Error ? caught.message : copy.videoErrorTip,
        );
      }
    } finally {
      mediaPickerInFlightRef.current = false;
      isNativeMediaPickerActive = false;
      if (isMountedRef.current) {
        setIsProcessingPhotos(false);
      }
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

  const handleSubmit = useCallback(async () => {
    await vmRef.current.submit();
  }, []);

  const handleMoreNavigate = useCallback(
    (targetRoute: RootStackRouteName) => {
      setMoreSheetVisible(false);
      if (targetRoute === ROUTES.CREATE_POST) {
        return;
      }

      if (replaceRouteOnNavigate) {
        (navigation as any).replace(targetRoute);
        return;
      }

      onClose();
      (navigation as any).navigate(targetRoute);
    },
    [navigation, onClose, replaceRouteOnNavigate],
  );

  const handleMoreNavigateRef = useRef(handleMoreNavigate);
  handleMoreNavigateRef.current = handleMoreNavigate;
  const stableMoreNavigate = useCallback((route: string) => {
    handleMoreNavigateRef.current(route as RootStackRouteName);
  }, []);

  const handleActionNavigate = useCallback((route: string) => {
    if (route === 'more_sheet') {
      Keyboard.dismiss();
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
      Boolean(vmRef.current.draft.video) ||
      Boolean(vmRef.current.draft.feeling) ||
      Boolean(vmRef.current.draft.location) ||
      Boolean(vmRef.current.draft.taggedUsers?.length);
    if (!hasContent) {
      onClose();
      return;
    }
    Keyboard.dismiss();
    setDiscardDialogVisible(true);
  }, [onClose]);

  const handleConfirmDiscard = useCallback(() => {
    setDiscardDialogVisible(false);
    vmRef.current.reset();
    onClose();
  }, [onClose]);

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



  const stableSetText = useCallback((txt: string) => {
    vmRef.current.setText(txt);
  }, []);

  const stableSetPrivacy = useCallback(async (prv: PostPrivacy) => {
    const removedCount = await vmRef.current.setPrivacy(prv);
    if (removedCount > 0) {
      Alert.alert(
        copy.privacyTitle,
        copy.tagsRemovedForPrivacy.replace('{count}', String(removedCount)),
      );
    }
  }, [copy]);

  const stableSetFeeling = useCallback((flg: PostFeeling) => {
    vmRef.current.setFeeling(flg);
  }, []);

  const stableClearFeeling = useCallback(() => {
    vmRef.current.setFeeling(undefined);
  }, []);

  const stableSetTaggedUsers = useCallback((users: PostTaggedUser[]) => {
    vmRef.current.setTaggedUsers(users);
    setTagPeopleSheetVisible(false);
  }, []);

  const stableSetLocation = useCallback((location: PostLocation) => {
    vmRef.current.setLocation(location);
  }, []);

  const stableClearLocation = useCallback(() => {
    vmRef.current.setLocation(undefined);
  }, []);

  const stableSearchTaggableUsers = useCallback(
    (input: {
      query?: string;
      cursor?: string;
      userIds?: string[];
    }) => vmRef.current.getTaggableUsers(input),
    [],
  );

  const handleCreateProduct = useCallback(() => {
    stableMoreNavigate(ROUTES.CREATE_PRODUCT);
  }, [stableMoreNavigate]);

  const handleCreatePoll = useCallback(() => {
    stableMoreNavigate(ROUTES.CREATE_POLL);
  }, [stableMoreNavigate]);

  const initialActionVal = initialAction ?? route.params?.initialAction;

  useEffect(() => {
    if (!visible || !initialTextValue) return;
    if (appliedInitialTextRef.current === initialTextValue) return;

    appliedInitialTextRef.current = initialTextValue;
    vmRef.current.setText(initialTextValue);
    if (route.params?.initialText) {
      navigation.setParams({ initialText: undefined } as any);
    }
  }, [initialTextValue, navigation, route.params?.initialText, visible]);

  useEffect(() => {
    if (!visible || !initialActionVal || consumedInitialActionRef.current) return;

    const timer = setTimeout(() => {
      if (consumedInitialActionRef.current) return;
      consumedInitialActionRef.current = true;
      if (route.params?.initialAction) {
        navigation.setParams({ initialAction: undefined } as any);
      }
      if (initialActionVal === 'photo') {
        handlePickPhotos().catch(() => undefined);
      } else if (initialActionVal === 'video') {
        handlePickVideo().catch(() => undefined);
      } else if (initialActionVal === 'product') {
        handleCreateProduct();
      } else if (initialActionVal === 'poll') {
        handleCreatePoll();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    initialActionVal,
    handlePickPhotos,
    handlePickVideo,
    handleCreateProduct,
    handleCreatePoll,
    navigation,
    route.params?.initialAction,
    visible,
  ]);

  if (presentation === 'screen') {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: '#f4f7fa' }}
        edges={['top', 'bottom']}
      >
        <FocusAwareStatusBar
          barStyle="dark-content"
          backgroundColor="#f4f7fa"
        />
        <KeyboardSafeView style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <CreatePostHeader
              onDiscard={handleDiscard}
              onSubmit={handleSubmit}
              onLivePress={() => handleMoreNavigate(ROUTES.GO_LIVE)}
              canSubmit={vm.canSubmit}
              isSubmitting={vm.isSubmitting}
              isProcessingPhotos={isProcessingPhotos}
              copy={copy}
            />

            <ScrollView
              ref={scrollViewRef}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'on-drag'
              }
              nestedScrollEnabled={Platform.OS === 'android'}
              onScrollBeginDrag={handleContentScrollBegin}
              onScrollEndDrag={handleContentScrollEnd}
              onMomentumScrollBegin={handleContentScrollBegin}
              onMomentumScrollEnd={handleContentScrollEnd}
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom + 24, 60),
              }}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
                <AuthorPrivacyCard
                  avatarUrl={avatarUrl}
                  displayName={displayName}
                  feeling={vm.draft.feeling}
                  taggedUsers={vm.draft.taggedUsers ?? []}
                  location={vm.draft.location}
                  targetPage={targetPage}
                  currentPrivacy={vm.draft.privacy}
                  privacyOptions={privacyOptions}
                  canSelectPrivacy={canSelectPrivacy}
                  onSelectPrivacy={stableSetPrivacy}
                  onTagPeoplePress={() => setTagPeopleSheetVisible(true)}
                  onTaggedPeopleLabelPress={() => setTagPeopleSheetVisible(true)}
                  onLocationPress={() => setLocationSheetVisible(true)}
                  onFeelingPress={() => setFeelingSheetVisible(true)}
                  language={language}
                  copy={copy}
                />

                <PostContentPreview>
                  <CaptionComposer
                    textInputRef={textInputRef}
                    text={vm.draft.text}
                    onChangeText={stableSetText}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder={copy.placeholder}
                    copy={copy}
                    onPickPhotos={handlePickPhotos}
                    onPickVideo={handlePickVideo}
                    onCreateProduct={handleCreateProduct}
                    onCreatePoll={handleCreatePoll}
                    showPrimaryActions={false}
                    embedded
                  />

                  {!vm.draft.video ? (
                    <MediaPreviewStrip
                      photos={vm.draft.photos}
                      onRemovePhoto={handleRemovePhoto}
                      onClearPhotos={handleClearPhotos}
                      onPickPhotos={handlePickPhotos}
                      isProcessing={isProcessingPhotos}
                      maxPhotos={Math.min(
                        vm.maxPhotos,
                        COMPOSER_PHOTO_LIMIT,
                      )}
                      copy={copy}
                      embedded
                    />
                  ) : null}

                  {vm.draft.video ? (
                    <VideoPreviewCard
                      video={vm.draft.video}
                      onRemove={handleRemoveVideo}
                      copy={copy}
                      isKeyboardActive={isKeyboardActive}
                      embedded
                    />
                  ) : null}
                </PostContentPreview>

                <AudioPreviewCard
                  isRecording={wavRecorder.isRecording}
                  durationMs={wavRecorder.durationMs}
                  audio={vm.draft.audio}
                  onCancelRecording={handleCancelAudioRecording}
                  onStopRecording={handleToggleAudioRecording}
                  onRemoveAudio={handleRemoveAudio}
                  copy={copy}
                />

                {vm.error ? (
                  <View className="mx-4 mt-4 rounded-lg bg-red-50 px-3 py-2">
                    <Text
                      style={{
                        color: APP_COLORS.status.error,
                        fontSize: 13,
                      }}
                    >
                      {vm.error}
                    </Text>
                  </View>
                ) : null}

                {!isKeyboardActive ? (
                  <ComposerActionTray
                    isFloating={false}
                    copy={copy}
                    onPickPhotos={handlePickPhotos}
                    onPickVideo={handlePickVideo}
                    onNavigate={handleActionNavigate}
                    insetsBottom={0}
                    mediaPickerBusy={isProcessingPhotos}
                  />
                ) : null}
            </ScrollView>
          </View>

          {isKeyboardActive && !isContentDragging ? (
            <ComposerActionTray
              isFloating
              copy={copy}
              onPickPhotos={handlePickPhotos}
              onPickVideo={handlePickVideo}
              onNavigate={handleActionNavigate}
              insetsBottom={insets.bottom}
              mediaPickerBusy={isProcessingPhotos}
            />
          ) : null}

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

          <TagPeoplePickerSheet
            visible={tagPeopleSheetVisible}
            selected={vm.draft.taggedUsers ?? []}
            onClose={() => setTagPeopleSheetVisible(false)}
            onDone={stableSetTaggedUsers}
            onSearch={stableSearchTaggableUsers}
            copy={copy}
          />

          <LocationPickerSheet
            visible={locationSheetVisible}
            current={vm.draft.location}
            onClose={() => setLocationSheetVisible(false)}
            onPick={stableSetLocation}
            onClear={stableClearLocation}
            copy={copy}
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
            actions={createPostMoreActions}
          />
        </KeyboardSafeView>
      </SafeAreaView>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardSafeView style={{ flex: 1 }}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={handleDiscard}
        >
          <Pressable
            style={{
              width: '92%',
              backgroundColor: '#ffffff',
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 5,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <AuthorPrivacyCard
              avatarUrl={avatarUrl}
              displayName={displayName}
              feeling={vm.draft.feeling}
              taggedUsers={vm.draft.taggedUsers ?? []}
              location={vm.draft.location}
              targetPage={targetPage}
              currentPrivacy={vm.draft.privacy}
              privacyOptions={privacyOptions}
              canSelectPrivacy={canSelectPrivacy}
              onSelectPrivacy={stableSetPrivacy}
              onTagPeoplePress={() => setTagPeopleSheetVisible(true)}
              onTaggedPeopleLabelPress={() => setTagPeopleSheetVisible(true)}
              onLocationPress={() => setLocationSheetVisible(true)}
              onFeelingPress={() => setFeelingSheetVisible(true)}
              language={language}
              copy={copy}
            />
            <View style={{ position: 'relative', zIndex: 20, elevation: 20 }}>
              {/* Row 1: Avatar, highlighted text input, hashtag/mention shortcuts */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Image source={{ uri: avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzOiwu9eVVr13_YUuLqFaZS5DMZSQjPQqGVp3m79mrFIOksxUaafxT6NOD7hWY1ovOOtnGqlKKmPy3vZS5LhbiBbX6XQyXexcys3dCd700wiTgDGs4KRiq5vM64_gByXbAgZ356Xg_1i8PN9yGMKSGadOq-PYlT497w8_Ab1upM7ybuluWZspaikqyZ-BtES8q1oKfjZ9BHYtV1APztnG0dp7bW-4y0QkJh46DJatsljh0w0WsaL0Os2nes04dtts1t6X_kG8wXqw' }} style={{ width: 40, height: 40, borderRadius: 20 }} resizeMode="cover" />
                <HighlightedComposerInput
                  inputRef={textInputRef}
                  value={vm.draft.text}
                  onChangeText={stableSetText}
                  placeholder="Hôm nay bạn thế nào ?"
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </View>

              <CaptionSuggestionBar
                isVisible={
                  vm.isCaptionSuggestionActive &&
                  (vm.isLoadingCaptionSuggestions || vm.captionSuggestions.length > 0)
                }
                isLoading={vm.isLoadingCaptionSuggestions}
                suggestions={vm.captionSuggestions}
                loadingLabel={copy.suggestionsLoading}
                onPick={vm.applyCaptionSuggestion}
              />
            </View>

            <View style={{ height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 }} />

            {/* Content Previews ScrollView */}
            <ScrollView
              ref={scrollViewRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 200, marginBottom: 8 }}
            >
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
                <View className="rounded-lg bg-red-50 px-3 py-2">
                  <Text style={{ color: APP_COLORS.status.error, fontSize: 13 }}>{vm.error}</Text>
                </View>
              ) : null}
            </ScrollView>

            {/* Row 2: 4 Action Buttons side-by-side */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              {/* Button 1: Image */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickPhotos}
                style={{ flex: 1, alignItems: 'center' }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: APP_COLORS.brand.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <ImageIcon size={20} color={APP_BRAND_COLOR} strokeWidth={2.5} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', textAlign: 'center' }} numberOfLines={1}>
                  {copy.photo}
                </Text>
              </TouchableOpacity>

              {/* Button 2: Video */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickVideo}
                style={{ flex: 1, alignItems: 'center' }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <VideoIcon size={20} color="#22c55e" strokeWidth={2.5} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', textAlign: 'center' }} numberOfLines={1}>
                  {copy.video}
                </Text>
              </TouchableOpacity>

              {/* Button 3: Product */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCreateProduct}
                style={{ flex: 1, alignItems: 'center' }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <ShoppingCart size={20} color="#f97316" strokeWidth={2.5} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', textAlign: 'center' }} numberOfLines={1}>
                  {copy.product}
                </Text>
              </TouchableOpacity>

              {/* Button 4: Poll */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCreatePoll}
                style={{ flex: 1, alignItems: 'center' }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0fdfa', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <BarChart3 size={20} color="#0d9488" strokeWidth={2.5} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', textAlign: 'center' }} numberOfLines={1}>
                  {copy.poll}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Row 3: Bottom action buttons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Dropdown: Công khai (or privacy selector) */}
              {canSelectPrivacy && <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setPrivacyMenuVisible(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 20,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  flexShrink: 1,
                }}
              >
                {vm.draft.privacy === 'public' ? (
                  <Globe2 size={16} color="#64748b" style={{ marginRight: 6 }} />
                ) : vm.draft.privacy === 'friends' || vm.draft.privacy === 'followers' ? (
                  <Users size={16} color="#64748b" style={{ marginRight: 6 }} />
                ) : (
                  <Lock size={16} color="#64748b" style={{ marginRight: 6 }} />
                )}

                <Text
                  style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginRight: 4, flexShrink: 1 }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {vm.draft.privacy === 'public'
                    ? copy.privacyPublic
                    : vm.draft.privacy === 'friends'
                    ? copy.privacyFriends
                    : vm.draft.privacy === 'followers'
                    ? copy.privacyFollowers
                    : copy.privacyOnlyMe}
                </Text>
                <ChevronDown size={14} color="#64748b" />
              </TouchableOpacity>}

              {/* Button: Trực tiếp */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  onClose();
                  setTimeout(() => {
                    navigation.navigate(ROUTES.GO_LIVE);
                  }, 300);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 20,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginLeft: 8,
                }}
              >
                <VideoIcon size={16} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>
                  {copy.live}
                </Text>
              </TouchableOpacity>

              {/* Button: Chia sẻ */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSubmit}
                disabled={vm.isSubmitting || isProcessingPhotos}
                style={{
                  backgroundColor: APP_BRAND_COLOR,
                  borderRadius: 20,
                  paddingVertical: 9,
                  paddingHorizontal: 20,
                  marginLeft: 'auto',
                  opacity: (vm.isSubmitting || isProcessingPhotos) ? 0.6 : 1,
                }}
              >
                {vm.isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#ffffff' }}>
                    {copy.post}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>

        {privacyMenuVisible && (
          <Modal
            transparent
            visible={privacyMenuVisible}
            animationType="fade"
            onRequestClose={() => setPrivacyMenuVisible(false)}
          >
            <Pressable
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => setPrivacyMenuVisible(false)}
            >
              <View
                style={{
                  width: 220,
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  paddingVertical: 8,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 10,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  overflow: 'hidden',
                }}
              >
                {privacyOptions.map(option => {
                  const isSelected = vm.draft.privacy === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.8}
                      onPress={() => {
                        void stableSetPrivacy(option.value);
                        setPrivacyMenuVisible(false);
                      }}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        backgroundColor: isSelected
                          ? APP_BRAND_COLOR
                          : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: isSelected ? '#ffffff' : '#334155',
                        }}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

              </View>
            </Pressable>
          </Modal>
        )}

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

        <TagPeoplePickerSheet
          visible={tagPeopleSheetVisible}
          selected={vm.draft.taggedUsers ?? []}
          onClose={() => setTagPeopleSheetVisible(false)}
          onDone={stableSetTaggedUsers}
          onSearch={stableSearchTaggableUsers}
          copy={copy}
        />

        <LocationPickerSheet
          visible={locationSheetVisible}
          current={vm.draft.location}
          onClose={() => setLocationSheetVisible(false)}
          onPick={stableSetLocation}
          onClear={stableClearLocation}
          copy={copy}
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
      </KeyboardSafeView>
    </Modal>
  );
}

function CreatePostScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const targetPage = route.params?.page;
  const targetGroupId = route.params?.groupId;
  const targetEventId = route.params?.eventId;
  const initialAction = route.params?.initialAction;
  const initialText = route.params?.initialText;

  return (
    <CreatePostModal
      visible={true}
      replaceRouteOnNavigate
      presentation="screen"
      onClose={() => navigation.goBack()}
      page={targetPage}
      groupId={targetGroupId}
      eventId={targetEventId}
      initialAction={initialAction}
      initialText={initialText}
    />
  );
}

export default CreatePostScreen;
