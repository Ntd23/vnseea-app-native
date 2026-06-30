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
  ImagePlus,
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
} from '../../domain/types/feed.types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type CreatePostRoute = RouteProp<RootStackParamList, typeof ROUTES.CREATE_POST>;

// ── Translation copy dictionary ───────────────────────────────────────
const CREATE_POST_COPY = {
  vi: {
    headerTitle: 'Tạo bài viết',
    post: 'Đăng',
    privacyTitle: 'Đối tượng',
    placeholder: 'Bạn đang nghĩ gì?',
    addPhoto: 'Thêm ảnh',
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
  },
  en: {
    headerTitle: 'Create Post',
    post: 'Post',
    privacyTitle: 'Audience',
    placeholder: 'What is on your mind?',
    addPhoto: 'Add photo',
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
  return { uri, name, type };
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

  const suggestionBarBottom = Platform.OS === 'ios' ? keyboardHeight : 0;
  const isSuggestionBarVisible = isTextFocused && keyboardHeight > 0;

  const insertCaptionChar = useCallback(
    (char: '#' | '@') => {
      const current = vm.draft.text;
      const needsSpace = current.length > 0 && !/\s$/.test(current);
      vm.setText(`${current}${needsSpace ? ' ' : ''}${char}`);
      textInputRef.current?.focus();
    },
    [vm],
  );

  const handlePickPhotos = useCallback(async () => {
    const remaining = vm.maxPhotos - vm.draft.photos.length;
    if (remaining <= 0) {
      Alert.alert(copy.limitTitle, copy.limitMsg.replace('{max}', String(vm.maxPhotos)));
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
        vm.addPhotos(attachments);
      }
    } finally {
      setIsProcessingPhotos(false);
    }
  }, [vm, copy, language]);

  const handlePickAudio = useCallback(async () => {
    try {
      const audio = await pickSupportedAudioFile();
      if (audio) vm.setAudio(audio);
    } catch (caught) {
      Alert.alert(
        copy.audioError,
        caught instanceof Error ? caught.message : copy.audioErrorTip,
      );
    }
  }, [vm, copy]);

  /**
   * Open the gallery in video mode. The view-model clears any
   * previously selected photos / audio so the resulting draft is
   * guaranteed to be a single-media post (WoWonder's `new_post`
   * accepts only one media type per submission).
   */
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
        vm.setVideo(attachment);
      }
    } finally {
      setIsProcessingPhotos(false);
    }
  }, [vm, copy]);

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
        copy.audioError,
        caught instanceof Error ? caught.message : copy.audioErrorTip,
      );
    }
  }, [vm, wavRecorder, copy]);

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
    const result = await vm.submit();
    if (result) {
      navigation.goBack();
    }
  }, [navigation, vm]);

  // Navigate from the "More" sheet. We close the sheet first, then
  // push the chosen creation route on top of the current stack so the
  // user can always back-button out and land here. The `as never`
  // mirrors the pattern used in `handleDismiss` of StoryViewer — the
  // route name is already typed by `RootStackRouteName`, we just
  // need to satisfy the generic overload.
  const handleMoreNavigate = useCallback(
    (route: RootStackRouteName) => {
      setMoreSheetVisible(false);
      navigation.navigate(route as never);
    },
    [navigation],
  );

  const handleDiscard = useCallback(() => {
    const hasContent =
      vm.draft.text.trim().length > 0 ||
      vm.draft.photos.length > 0 ||
      Boolean(vm.draft.audio) ||
      Boolean(vm.draft.video);
    if (!hasContent) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      copy.discardTitle,
      copy.discardMessage,
      [
        { text: copy.discardCancel, style: 'cancel' },
        {
          text: copy.discardConfirm,
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

  const renderBottomActions = (isFloating: boolean) => {
    // ── Compact layout ─────────────────────────────────────────────
    // 4 inline shortcuts unique to the post flow (`feeling` lives here
    // because it tags the post itself, not a standalone creation).
    // The fifth slot opens the global "More" sheet.
    const compactButtons: Array<{
      key: string;
      label: string;
      onPress: () => void;
      Icon: React.ComponentType<{ size: number; color: string; fill?: string }>;
      iconBg: string;
      iconColor: string;
      altIcon?: React.ReactNode;
    }> = [
      {
        key: 'photo',
        label: copy.photo,
        onPress: handlePickPhotos,
        Icon: ImageIcon,
        iconBg: '#f0fdf4',
        iconColor: '#22c55e',
      },
      {
        key: 'feeling',
        label: copy.feeling,
        onPress: () => setFeelingSheetVisible(true),
        Icon: Smile,
        iconBg: '#fef9c3',
        iconColor: '#eab308',
      },
      {
        key: 'audio',
        label: copy.audio,
        onPress: handleAudioAction,
        Icon: Music2,
        iconBg: '#fdf2f8',
        iconColor: '#ec4899',
        altIcon: <Square size={14} color="#ec4899" fill="#ec4899" />,
      },
      {
        key: 'video',
        label: copy.video,
        onPress: handlePickVideo,
        Icon: VideoIcon,
        iconBg: '#eff6ff',
        iconColor: '#3b82f6',
      },
    ];

    // ── Expanded layout ─────────────────────────────────────────────
    // When the keyboard is NOT open we render a 2-row × 4-col grid:
    //
    //   Row 1 (post-flow):  Photo · Feeling · Audio · Video
    //   Row 2 (create):    Ad · Product · Event · Page
    //
    // Anything else (Story / Album / Poll / Group / Blog) lives behind
    // the "Thêm" link in the card header, which opens the global
    // CreateActionSheet.
    //
    // Row 1 buttons keep their existing per-route accent colour (the
    // icon backgrounds stay saturated). Row 2 buttons reuse the icon
    // + colour from CREATE_ACTIONS so they match the global sheet.
    const expandedRow1: Array<{
      key: string;
      label: string;
      onPress: () => void;
      Icon: React.ComponentType<{ size: number; color: string; fill?: string }>;
      iconBg: string;
      iconColor: string;
      altIcon?: React.ReactNode;
    }> = [
      {
        key: 'photo',
        label: copy.photo,
        onPress: handlePickPhotos,
        Icon: ImageIcon,
        iconBg: '#f0fdf4',
        iconColor: '#22c55e',
      },
      {
        key: 'feeling',
        label: copy.feeling,
        onPress: () => setFeelingSheetVisible(true),
        Icon: Smile,
        iconBg: '#fef9c3',
        iconColor: '#eab308',
      },
      {
        key: 'audio',
        label: copy.audio,
        onPress: handleAudioAction,
        Icon: Music2,
        iconBg: '#fdf2f8',
        iconColor: '#ec4899',
        altIcon: <Square size={14} color="#ec4899" fill="#ec4899" />,
      },
      {
        key: 'video',
        label: copy.video,
        onPress: handlePickVideo,
        Icon: VideoIcon,
        iconBg: '#eff6ff',
        iconColor: '#3b82f6',
      },
    ];

    const expandedRow2: Array<{
      actionKey: 'poll' | 'product' | 'live' | 'page';
      label: string;
      onPress: () => void;
    }> = [
      {
        actionKey: 'poll',
        label: language === 'vi' ? 'Cuộc thăm dò' : 'Poll',
        onPress: () => navigation.navigate(ROUTES.CREATE_POLL as never),
      },
      {
        actionKey: 'product',
        label: language === 'vi' ? 'Sản phẩm' : 'Product',
        onPress: () => navigation.navigate(ROUTES.CREATE_PRODUCT as never),
      },
      {
        actionKey: 'live',
        label: language === 'vi' ? 'Live' : 'Live',
        onPress: () => navigation.navigate(ROUTES.GO_LIVE as never),
      },
      {
        actionKey: 'page',
        label: language === 'vi' ? 'Trang' : 'Page',
        onPress: () => navigation.navigate(ROUTES.CREATE_PAGE as never),
      },
    ];

    // Slightly darker muted text colour so the secondary routes don't
    // compete with the four "primary" shortcuts (which keep the
    // existing per-route accent colour).
    const SECONDARY_LABEL_COLOR = '#475569';

    const renderShortcutButton = (
      button: typeof compactButtons[number],
      size: 44 | 48,
    ) => {
      const Icon = button.Icon;
      const showAlt = button.altIcon && button.key === 'audio' && wavRecorder.isRecording;
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

    // Single dashed "More" cell shared by both layouts.
    const renderMoreButton = () => (
      <TouchableOpacity
        key="more"
        onPress={() => setMoreSheetVisible(true)}
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

    // Look up the CREATE_ACTIONS entry for a Row-2 shortcut so we can
    // reuse its icon / colour. This keeps the inline tray in sync
    // with the global "More" sheet — adding a new action in one place
    // surfaces everywhere.
    const renderRow2Shortcut = (
      entry: typeof expandedRow2[number],
    ) => {
      const action = CREATE_ACTIONS.find(a => a.key === entry.actionKey);
      if (!action) return null;
      const Icon = action.Icon;
      return (
        <TouchableOpacity
          key={entry.actionKey}
          onPress={entry.onPress}
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
          marginBottom: Math.max(insets.bottom, 16),
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
            onPress={() => setMoreSheetVisible(true)}
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
          {expandedRow1.map(b => renderShortcutButton(b, 48))}
        </View>

        {/* Row 2 — quick creation routes (Ad / Product / Event / Page). */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          {expandedRow2.map(renderRow2Shortcut)}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ backgroundColor: '#f4f7fa' }} className="flex-1" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#f4f7fa" />

      {/* ── Header ────────────────────────────────────────────────── */}
      <View className="h-16 flex-row items-center justify-between px-4 bg-transparent">
        <TouchableOpacity
          onPress={handleDiscard}
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
          onPress={handleSubmit}
          disabled={!vm.canSubmit || isProcessingPhotos}
          activeOpacity={0.7}
          className={
            vm.canSubmit && !isProcessingPhotos
              ? 'rounded-full bg-[#0000ff] px-6 py-2.5'
              : 'rounded-full bg-slate-200 px-6 py-2.5'
          }
        >
          {vm.isSubmitting ? (
            <ActivityIndicator color={vm.canSubmit && !isProcessingPhotos ? '#FFFFFF' : '#94A3B8'} size="small" />
          ) : (
            <Text
              style={{
                color: vm.canSubmit && !isProcessingPhotos ? '#FFFFFF' : '#94A3B8',
                fontWeight: '700',
                fontSize: 15,
              }}
            >
              {copy.post}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Viewer + privacy chip card ──────────────────────────── */}
        <View
          style={{
            shadowColor: '#94a3b8',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
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
          <View className="ml-4 flex-1">
            <View className="flex-row items-center flex-wrap">
              <Text className="text-[16px] font-bold text-slate-800" numberOfLines={1}>
                {displayName}
              </Text>
              {vm.draft.feeling ? (
                <Text
                  className="ml-1.5 text-[14px] text-slate-500 font-medium"
                  numberOfLines={1}
                >
                  {copy.feelingLabel} {vm.draft.feeling.emoji}{' '}
                  {currentFeelingLabel}
                </Text>
              ) : null}
            </View>
            {targetPage ? (
              <Text className="mt-1 text-[12px] font-semibold text-[#0000ff]">
                Đăng với tư cách Trang
              </Text>
            ) : null}
            <TouchableOpacity
              onPress={() => setPrivacySheetVisible(true)}
              activeOpacity={0.7}
              className="mt-1.5 self-start flex-row items-center rounded-full bg-slate-100 px-3 py-1"
            >
              <currentPrivacy.Icon size={12} color="#475569" />
              <Text className="mx-1.5 text-[12px] font-semibold text-slate-600">
                {currentPrivacy.label}
              </Text>
              <ChevronDown size={12} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Text input card ─────────────────────────────────────── */}
        <View
          style={{
            shadowColor: '#94a3b8',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
          }}
          className="mx-4 mt-4 bg-white rounded-[20px] border border-slate-100 p-4 min-h-[220px] justify-between"
        >
          <TextInput
            ref={textInputRef}
            value={vm.draft.text}
            onChangeText={vm.setText}
            onFocus={() => setIsTextFocused(true)}
            onBlur={() => setIsTextFocused(false)}
            placeholder={copy.placeholder}
            placeholderTextColor="#94A3B8"
            multiline
            autoFocus
            textAlignVertical="top"
            style={{
              fontSize: 18,
              lineHeight: 26,
              color: '#1e293b',
              padding: 0,
              minHeight: 120,
            }}
          />

          {/* Word counts & inline shortcuts */}
          <View className="flex-row items-center justify-end mt-4 gap-3">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => insertCaptionChar('#')}
              className="h-10 w-10 rounded-xl border border-slate-200 items-center justify-center bg-white"
            >
              <Hash size={18} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => insertCaptionChar('@')}
              className="h-10 w-10 rounded-xl border border-slate-200 items-center justify-center bg-white"
            >
              <AtSign size={18} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setFeelingSheetVisible(true)}
              className="h-10 w-10 rounded-xl border border-slate-200 items-center justify-center bg-white"
            >
              <Smile size={18} color="#64748b" />
            </TouchableOpacity>

            <Text className="ml-2 text-[13px] text-slate-400 font-medium">
              {vm.draft.text.length}/5000
            </Text>
          </View>
        </View>

        {/* ── Photo grid picker row ───────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          className="mt-4"
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePickPhotos}
            style={{
              width: 100,
              height: 100,
              borderRadius: 16,
              borderStyle: 'dashed',
              borderWidth: 1.5,
              borderColor: '#cbd5e1',
              backgroundColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24, color: '#64748b', fontWeight: '300' }}>+</Text>
            <Text style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '600' }}>{copy.addPhoto}</Text>
          </TouchableOpacity>

          {isProcessingPhotos && (
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 16,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator color="#0000ff" size="small" />
              <Text style={{ fontSize: 9, color: '#64748b', marginTop: 6, fontWeight: '600', textAlign: 'center' }}>
                {language === 'vi' ? 'Đang xử lý...' : 'Processing...'}
              </Text>
            </View>
          )}

          {vm.draft.photos.map(photo => (
            <View key={photo.uri} style={{ width: 100, height: 100, position: 'relative' }}>
              <Image
                source={{ uri: photo.uri }}
                style={{ width: '100%', height: '100%', borderRadius: 16 }}
                resizeMode="cover"
                resizeMethod="resize" // Scale down in-memory representation for instant render & scroll performance
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => vm.removePhoto(photo.uri)}
                className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-white/90 items-center justify-center"
              >
                <X size={12} color="#000000" />
              </TouchableOpacity>
            </View>
          ))}

          {vm.draft.photos.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePickPhotos}
              style={{
                width: 100,
                height: 100,
                borderRadius: 16,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#94a3b8',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 1,
              }}
            >
              <Text style={{ fontSize: 20, color: '#64748b', fontWeight: 'bold' }}>...</Text>
              <Text style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '600' }}>{copy.viewMore}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {wavRecorder.isRecording ? (
          <View className="mx-4 mt-4 flex-row items-center rounded-[20px] border border-red-100 bg-red-50 p-4">
            <View className="mr-3 h-3 w-3 rounded-full bg-red-500" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-red-700">
                {copy.recording} {formatAudioDuration(wavRecorder.durationMs)}
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
          <View className="mx-4 mt-4 flex-row items-center rounded-[20px] border border-blue-100 bg-blue-50 p-4">
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

        {/* ── Video preview card (uses local file uri) ─────────────── */}
        {vm.draft.video ? (
          <View className="mx-4 mt-4 overflow-hidden rounded-[20px] border border-blue-100 bg-blue-50">
            <View className="flex-row items-center px-4 pt-3">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <VideoIcon size={16} color="#3b82f6" />
              </View>
              <Text
                className="ml-2 flex-1 text-sm font-semibold text-slate-700"
                numberOfLines={1}
              >
                {vm.draft.video.name}
              </Text>
              <TouchableOpacity
                onPress={() => vm.setVideo(undefined)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="h-8 w-8 items-center justify-center rounded-full bg-white"
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text
              className="mt-2 px-4 text-[11px] font-medium uppercase tracking-wider text-blue-700"
            >
              {copy.addVideo}
            </Text>
            <View
              style={{
                margin: 12,
                height: 220,
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: '#0F172A',
              }}
            >
              <VideoPlayer
                source={{ uri: vm.draft.video.uri }}
                style={{ width: '100%', height: '100%' }}
                controls
                paused
                resizeMode="cover"
              />
            </View>
          </View>
        ) : null}

        {/* ── Error banner ───────────────────────────────────────── */}
        {vm.error ? (
          <View className="mx-4 mt-4 rounded-lg bg-red-50 px-3 py-2">
            <Text style={{ color: '#B91C1C', fontSize: 13 }}>{vm.error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Bottom action card ───────────────────────────────────── */}
      {!isSuggestionBarVisible && renderBottomActions(false)}

      <PrivacyPickerSheet
        visible={privacySheetVisible}
        current={vm.draft.privacy}
        onClose={() => setPrivacySheetVisible(false)}
        onPick={vm.setPrivacy}
        options={privacyOptions}
        title={copy.privacyTitle}
      />
      <FeelingPickerSheet
        visible={feelingSheetVisible}
        current={vm.draft.feeling}
        onClose={() => setFeelingSheetVisible(false)}
        onPick={vm.setFeeling}
        onClear={() => vm.setFeeling(undefined)}
        options={translatedFeelings}
        title={copy.feelingsTitle}
        clearLabel={copy.feelingsClear}
      />

      {/* Shared "More" sheet — surfaces every creation route the app
          supports (story / album / event / poll / product / page /
          group / reel / blog) sourced from CREATE_ACTIONS so this
          screen and the Home `+` button can never drift apart. */}
      <CreateActionSheet
        visible={moreSheetVisible}
        onClose={() => setMoreSheetVisible(false)}
        onNavigate={handleMoreNavigate}
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
          {renderBottomActions(true)}
          
          {/* Row 1: Suggestion chips */}
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
        </View>
      )}
    </SafeAreaView>
  );
}

export default CreatePostScreen;
