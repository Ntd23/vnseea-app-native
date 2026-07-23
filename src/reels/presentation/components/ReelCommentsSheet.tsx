// Description: Facebook-style comments bottom sheet for a single reel.
//
// Layout per comment (FB-inspired):
//
//   ┌──────────┬──────────────────────────────────┐
//   │  avatar  │  Name · 6 phút                    │
//   │          │  ┌───────────────────────┐        │
//   │          │  │ Comment text           │ ❤️ 1   │  ← reaction count overlay
//   │          │  │ [image]                │        │
//   │          │  └───────────────────────┘        │
//   │          │  👍 Thích  ·  Phản hồi  ·  6 phút  │
//   └──────────┴──────────────────────────────────┘
//                 ╰── Xem 2 phản hồi (toggle)
//                     ┌───────────┐
//                     │ Reply row │ ← indented further
//                     └───────────┘
//
// Interactions:
//   • Tap "Thích"        → add/clear 'like' reaction (FB default)
//   • Long-press "Thích" → emoji picker (6 reactions)
//   • Tap "Phản hồi"     → enter reply mode (input bar shows banner)
//   • Tap "Xem N phản hồi" → expand replies inline
//   • Long-press a row of YOUR comment → Alert with Xóa
//
// The picker is rendered through a single Modal — only one comment can
// have it open at a time. Position is measured from the pressed button so
// the pill floats just above the actual tap location.

import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Keyboard,
  type KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Flag,
  ImagePlus,
  Mic,
  Music2,
  Pencil,
  RotateCcw,
  SendHorizonal,
  Square,
  Trash2,
  X,
} from 'lucide-react-native';
import {
  launchCamera,
  launchImageLibrary,
  type MediaType,
} from 'react-native-image-picker';
import type {
  CommentAudioAttachment,
  CommentImageAttachment,
  ReactionType,
  ReelComment,
} from '../../domain/types/reels.types';
import {
  formatAudioDuration,
  pickSupportedAudioFile,
} from '../../../shared-kernel/application/utils/audioFiles';
import { useWavAudioRecorder } from '../../../shared-kernel/application/hooks/useWavAudioRecorder';
import { AudioPlayer } from '../../../shared-kernel/presentation/components/AudioPlayer';
import { AudioWaveform } from '../../../shared-kernel/presentation/components/AudioWaveform';
import { KeyboardSafeView } from '../../../shared-kernel/presentation/components/KeyboardSafeView';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import {
  CommentSheetComposerDock,
  CommentSheetComposerInputSurface,
  CommentSheetControlSurface,
  CommentSheetHeaderBadge,
  CommentSheetReactionBadgeSurface,
  CommentSheetReactionPickerSurface,
} from './CommentSheetChrome';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import {
  FEED_REACTION_COLORS as REACTION_COLOR,
  FEED_REACTION_IMAGES as REACTION_IMAGES,
  FEED_REACTION_TYPES,
} from '../../../feed/presentation/components/FeedReactionAssets';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import { ReelCommentComposerModal } from './ReelCommentComposerModal';

const AVATAR_FALLBACK = 'https://v2.vnseea.vn/upload/photos/d-avatar.jpg';
const FONT_PRIMARY = 'Inter';
const INLINE_ANDROID_KEYBOARD_ACCESSORY_CLEARANCE = 88;

const COMMENTS_COPY = {
  vi: {
    commentsLabel: 'bình luận',
    commentsTitle: 'Bình luận',
    loadingComments: 'Đang tải bình luận...',
    noCommentsTitle: 'Chưa có bình luận',
    noCommentsDesc: 'Hãy là người đầu tiên bình luận video này.',
    addCommentPlaceholder: 'Thêm bình luận...',
    replyingPlaceholder: 'Trả lời @{username}…',
    replyingBanner: 'Đang phản hồi',
    hideReplies: 'Ẩn phản hồi',
    showReplies: 'Xem {count} phản hồi',
    failedCommentTitle: 'Không gửi được bình luận',
    failedCommentMsg: 'Bạn có muốn thử lại hoặc xóa bình luận này không?',
    yourCommentTitle: 'Bình luận của bạn',
    cancel: 'Hủy',
    delete: 'Xóa',
    retry: 'Thử lại',
    errorTitle: 'Lỗi',
    errorActionMsg: 'Không thực hiện được thao tác.',
    pickPhotoTitle: 'Chọn ảnh bình luận',
    pickPhotoMsg: 'Chọn nguồn ảnh bạn muốn sử dụng',
    takePhoto: 'Chụp ảnh',
    takePhotoHint: 'Sử dụng máy ảnh để chụp ảnh mới',
    chooseFromLibrary: 'Chọn từ thư viện',
    chooseFromLibraryHint: 'Chọn ảnh có sẵn trong thư viện',
    audioPickErrorTitle: 'Không chọn được âm thanh',
    audioRecordErrorTitle: 'Không ghi âm được',
    pleaseTryAgain: 'Vui lòng thử lại.',
    recordingText: 'Đang ghi âm {duration}',
    failedSendRetry: 'Không gửi được. Nhấn để thử lại.',
    otherAction: 'Khác',
    replyAction: 'Phản hồi',
    sending: 'Đang gửi...',
    likeReaction: 'Thích',
    loveReaction: 'Yêu thích',
    hahaReaction: 'Haha',
    wowReaction: 'Wow',
    sadReaction: 'Buồn',
    angryReaction: 'Phẫn nộ',
  },
  en: {
    commentsLabel: 'comments',
    commentsTitle: 'Comments',
    loadingComments: 'Loading comments...',
    noCommentsTitle: 'No comments yet',
    noCommentsDesc: 'Be the first to comment on this video.',
    addCommentPlaceholder: 'Add a comment...',
    replyingPlaceholder: 'Reply to @{username}…',
    replyingBanner: 'Replying to',
    hideReplies: 'Hide replies',
    showReplies: 'View {count} replies',
    failedCommentTitle: 'Failed to send comment',
    failedCommentMsg: 'Do you want to retry or delete this comment?',
    yourCommentTitle: 'Your comment',
    cancel: 'Cancel',
    delete: 'Delete',
    retry: 'Retry',
    errorTitle: 'Error',
    errorActionMsg: 'Cannot perform operation.',
    pickPhotoTitle: 'Select comment photo',
    pickPhotoMsg: 'Choose the photo source you want to use',
    takePhoto: 'Take photo',
    takePhotoHint: 'Use the camera to take a new photo',
    chooseFromLibrary: 'Choose from library',
    chooseFromLibraryHint: 'Choose an existing photo from your library',
    audioPickErrorTitle: 'Cannot select audio',
    audioRecordErrorTitle: 'Cannot record audio',
    pleaseTryAgain: 'Please try again.',
    recordingText: 'Recording {duration}',
    failedSendRetry: 'Failed to send. Tap to retry.',
    otherAction: 'More',
    replyAction: 'Reply',
    sending: 'Sending...',
    likeReaction: 'Like',
    loveReaction: 'Love',
    hahaReaction: 'Haha',
    wowReaction: 'Wow',
    sadReaction: 'Sad',
    angryReaction: 'Angry',
  },
};

// ── Reaction lookup tables ───────────────────────────────────────────────
// The picker shows all 6 emojis. Each reaction also has a label (shown on
// the active state color (the label changes color to match the reaction,
// like Facebook). `null` is the no-reaction default.

function getDeleteCommentLabel(language: keyof typeof COMMENTS_COPY) {
  return language === 'en' ? 'Delete comment' : 'X\u00f3a b\u00ecnh lu\u1eadn';
}

function getDeleteCommentHint(language: keyof typeof COMMENTS_COPY) {
  return language === 'en'
    ? 'Tap to delete this comment'
    : 'Nh\u1ea5n \u0111\u1ec3 x\u00f3a b\u00ecnh lu\u1eadn n\u00e0y';
}

function getEditCommentLabel(language: keyof typeof COMMENTS_COPY) {
  return language === 'en' ? 'Edit comment' : 'S\u1eeda b\u00ecnh lu\u1eadn';
}

function getReportCommentLabel(language: keyof typeof COMMENTS_COPY) {
  return language === 'en'
    ? 'Report comment'
    : 'B\u00e1o c\u00e1o b\u00ecnh lu\u1eadn';
}

function getDeleteConfirmTitle(language: keyof typeof COMMENTS_COPY) {
  return language === 'en'
    ? 'Delete comment?'
    : 'X\u00f3a b\u00ecnh lu\u1eadn?';
}

function getDeleteConfirmMessage(language: keyof typeof COMMENTS_COPY) {
  return language === 'en'
    ? 'Do you want to delete this comment?'
    : 'B\u1ea1n c\u00f3 mu\u1ed1n x\u00f3a b\u00ecnh lu\u1eadn n\u00e0y kh\u00f4ng?';
}

function getEditingCommentLabel(language: keyof typeof COMMENTS_COPY) {
  return language === 'en'
    ? 'Editing your comment'
    : '\u0110ang s\u1eeda b\u00ecnh lu\u1eadn';
}

function getReportSentTitle(language: keyof typeof COMMENTS_COPY) {
  return language === 'en'
    ? 'Report received'
    : '\u0110\u00e3 nh\u1eadn b\u00e1o c\u00e1o';
}

function getReportSentMessage(language: keyof typeof COMMENTS_COPY) {
  return language === 'en'
    ? 'Thanks. We will review this comment.'
    : 'C\u1ea3m \u01a1n b\u1ea1n. Ch\u00fang t\u00f4i s\u1ebd xem x\u00e9t b\u00ecnh lu\u1eadn n\u00e0y.';
}

// Width of the picker pill — used to clamp its X position so it never
// runs off the screen edge when the long-press happens near the right.
const PICKER_PILL_WIDTH = 282;
const PICKER_PILL_HEIGHT = 52;
const PICKER_GAP_ABOVE_BUTTON = 8;
const COMMENT_IMAGE_MAX_WIDTH = 190;
const COMMENT_IMAGE_MAX_HEIGHT = 210;
const COMMENT_IMAGE_FALLBACK_WIDTH = 180;
const COMMENT_IMAGE_FALLBACK_HEIGHT = 140;
const COMMENT_DELETE_ANIMATION_MS = 220;
const SHEET_TRANSITION_DURATION_MS = 150;
const SHEET_TRANSITION_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const SHEET_DRAG_ACTIVATION_DISTANCE = 12;
const SHEET_DRAG_DISMISS_DISTANCE = 120;
const SHEET_DRAG_SETTLE_DURATION_MS = 120;
const COMMENT_SKELETON_ROW_COUNT = 4;

const CommentsLoadingSkeleton = memo(function CommentsLoadingSkeleton() {
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 0.92,
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.5,
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => {
      pulse.stop();
      pulseOpacity.stopAnimation();
    };
  }, [pulseOpacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.commentsSkeletonList, { opacity: pulseOpacity }]}
      accessibilityLabel="Đang tải bình luận"
    >
      {Array.from({ length: COMMENT_SKELETON_ROW_COUNT }, (_, index) => (
        <View key={`comment-skeleton-${index}`} style={styles.commentSkeletonRow}>
          <View style={styles.commentSkeletonAvatar} />
          <View style={styles.commentSkeletonBody}>
            <View
              style={[
                styles.commentSkeletonBubble,
                index % 2 === 1 ? styles.commentSkeletonBubbleShort : null,
              ]}
            >
              <View style={styles.commentSkeletonName} />
              <View style={styles.commentSkeletonTextWide} />
              <View style={styles.commentSkeletonTextShort} />
            </View>
            <View style={styles.commentSkeletonMetaRow}>
              <View style={styles.commentSkeletonMetaShort} />
              <View style={styles.commentSkeletonMetaMedium} />
              <View style={styles.commentSkeletonMetaMedium} />
            </View>
          </View>
        </View>
      ))}
    </Animated.View>
  );
});

function resolveSheetTravelDistance(
  sheetHeight: string | number,
  screenHeight: number,
) {
  const safeScreenHeight = Number.isFinite(screenHeight)
    ? Math.max(0, screenHeight)
    : 0;

  if (typeof sheetHeight === 'number') {
    return Number.isFinite(sheetHeight)
      ? Math.min(safeScreenHeight, Math.max(0, sheetHeight))
      : safeScreenHeight;
  }

  const percentageMatch = /^\s*(\d+(?:\.\d+)?)%\s*$/.exec(sheetHeight);
  if (!percentageMatch) return safeScreenHeight;

  const percentage = Math.min(100, Math.max(0, Number(percentageMatch[1])));
  return safeScreenHeight * (percentage / 100);
}

type ReplyTarget = {
  commentId: string;
  targetCommentId?: string;
  username: string;
  displayName?: string;
};

interface Props {
  visible: boolean;
  presentation?: 'sheet' | 'inline';
  listHeaderComponent?: React.ReactElement | null;
  autoFocusComposer?: boolean;
  composerFocusSignal?: number;
  comments: ReelComment[];
  commentCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Reply state
  repliesById: Record<string, ReelComment[]>;
  loadingRepliesIds: string[];
  replyingTo: ReplyTarget | null;

  // Actions
  onClose: () => void;
  onEndReached: () => void;
  onRetry: () => void;
  onSubmit: (
    text: string,
    image?: CommentImageAttachment,
    audio?: CommentAudioAttachment,
  ) => Promise<ReelComment | null>;
  onSubmitReply: (
    commentId: string,
    text: string,
    image?: CommentImageAttachment,
    replyMentionName?: string,
  ) => Promise<ReelComment | null>;
  onSetReaction: (commentId: string, reaction: ReactionType) => void;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, text: string) => void;
  onLoadReplies: (commentId: string) => void;
  onCollapseReplies: (commentId: string) => void;
  onStartReply: (
    commentId: string,
    username: string,
    displayName?: string,
    targetCommentId?: string,
  ) => void;
  onCancelReply: () => void;
  onRetryFailedComment: (comment: ReelComment) => void;
  onDeleteFailedComment: (comment: ReelComment) => void;
  onOpenStart?: () => void;
  onCloseStart?: () => void;
  sheetHeight?: string | number;
  backdropColor?: string;
  composerAvatarUrl?: string;
}

function formatCount(count: number) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function getCommentPublisherDisplayName(
  comment: ReelComment,
  language: AppLanguage,
) {
  return (
    comment.publisher.name ||
    comment.publisher.username ||
    (language === 'en' ? 'User' : 'Người dùng')
  );
}

function getReplyTargetDisplayName(
  target: ReplyTarget | null,
  language: AppLanguage,
) {
  return (
    target?.displayName?.trim() ||
    target?.username?.trim() ||
    (language === 'en' ? 'User' : 'Người dùng')
  );
}

function getReplyDraftPrefix(displayName: string) {
  const trimmed = displayName.trim();
  return trimmed ? `${trimmed} ` : '';
}

function splitLeadingReplyMention(text: string, mentionName?: string) {
  const name = mentionName?.trim();
  if (!name) return null;

  const trimmedStart = text.trimStart();
  if (!trimmedStart.startsWith(name)) return null;

  const nextChar = trimmedStart.charAt(name.length);
  if (nextChar && !/\s|[.,:;!?]/.test(nextChar)) return null;

  return {
    mention: name,
    rest: trimmedStart.slice(name.length),
  };
}

function formatRelativeTime(timestamp?: number, language: 'vi' | 'en' = 'vi') {
  if (!timestamp) return '';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);

  if (language === 'en') {
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } else {
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
    return new Date(timestamp * 1000).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}

function fitCommentImageSize(width?: number, height?: number) {
  if (!width || !height || width <= 0 || height <= 0) {
    return {
      width: COMMENT_IMAGE_FALLBACK_WIDTH,
      height: COMMENT_IMAGE_FALLBACK_HEIGHT,
    };
  }

  const scale = Math.min(
    COMMENT_IMAGE_MAX_WIDTH / width,
    COMMENT_IMAGE_MAX_HEIGHT / height,
  );

  return {
    width: Math.max(96, Math.round(width * scale)),
    height: Math.max(96, Math.round(height * scale)),
  };
}

function ReelCommentsSheetBase({
  visible,
  presentation = 'sheet',
  listHeaderComponent = null,
  autoFocusComposer = false,
  composerFocusSignal = 0,
  comments,
  commentCount,
  isLoading,
  isLoadingMore,
  isSubmitting,
  error,
  repliesById,
  loadingRepliesIds,
  replyingTo,
  onClose,
  onEndReached,
  onRetry,
  onSubmit,
  onSubmitReply,
  onSetReaction,
  onDelete,
  onEdit,
  onLoadReplies,
  onCollapseReplies,
  onStartReply,
  onCancelReply,
  onRetryFailedComment,
  onDeleteFailedComment,
  onOpenStart,
  onCloseStart,
  sheetHeight = '72%',
  backdropColor = 'rgba(0,0,0,0.36)',
  composerAvatarUrl,
}: Props) {
  const isInline = presentation === 'inline';
  const shouldOwnKeyboardAvoidance = isInline && Platform.OS === 'android';
  const language = useAppLanguage();
  const copy = COMMENTS_COPY[language];
  const navigation = useNavigation<any>();
  const isScreenFocused = useIsFocused();
  const initialViewportRef = useRef(Dimensions.get('window'));
  const stableSheetViewportHeightRef = useRef(
    initialViewportRef.current.height,
  );
  const stableSheetViewportWidthRef = useRef(initialViewportRef.current.width);
  const latestSheetViewportHeightRef = useRef(
    initialViewportRef.current.height,
  );
  const freezeSheetViewportRef = useRef(false);
  const composerModalVisibleRef = useRef(false);
  const sheetViewportReleaseTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [stableSheetViewportHeight, setStableSheetViewportHeight] = useState(
    initialViewportRef.current.height,
  );
  const sheetTravelDistance = useMemo(
    () => resolveSheetTravelDistance(sheetHeight, stableSheetViewportHeight),
    [sheetHeight, stableSheetViewportHeight],
  );

  const handlePressProfile = useCallback(
    (userId: string) => {
      navigateToUserProfile(navigation, userId);
    },
    [navigation],
  );
  const insets = useSafeAreaInsets();
  const bottomSafeInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 18 : 10,
  );
  const actionSheetBottomInset =
    Platform.OS === 'android'
      ? insets.bottom > 0
        ? Math.max(insets.bottom + 12, 28)
        : 14
      : Math.max(insets.bottom, 14);
  const [isComposerModalVisible, setIsComposerModalVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isKeyboardVisible = keyboardHeight > 0;
  const activeSheetHeight = sheetTravelDistance;
  const activeSheetTop = Math.max(
    0,
    stableSheetViewportHeight - activeSheetHeight,
  );
  const isInlineKeyboardVisible = isInline && isKeyboardVisible;
  const sheetBottomPadding =
    Platform.OS === 'ios' || isInlineKeyboardVisible ? 0 : bottomSafeInset;
  const composerBottomPadding = isInlineKeyboardVisible ? 6 : bottomSafeInset;
  const wavRecorder = useWavAudioRecorder();
  const {
    isRecording: isWavRecording,
    durationMs: wavDurationMs,
    startRecording: startWavRecording,
    stopRecording: stopWavRecording,
    cancelRecording: cancelWavRecording,
  } = wavRecorder;
  const [draft, setDraft] = useState('');
  const [composerModalFocusSignal, setComposerModalFocusSignal] = useState(0);
  const submitInFlightRef = useRef(false);
  const reopenComposerAfterPhotoPickerRef = useRef(false);
  const [keyboardLift, setKeyboardLift] = useState(0);
  const appliedKeyboardLift = keyboardLift;
  const inputRef = useRef<TextInput>(null);
  const composerMeasureRef = useRef<View>(null);
  const commentsListRef = useRef<FlatList<ReelComment>>(null);
  const autoScrollToEndUntilRef = useRef(0);
  const keyboardLiftRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const keyboardTopRef = useRef<number | null>(null);
  const keyboardMeasureTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>(
    [],
  );
  const replyRevealTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const commitKeyboardLift = useCallback((nextLift: number) => {
    const normalized = Math.max(0, Math.round(nextLift));
    keyboardLiftRef.current = normalized;
    setKeyboardLift(current => (current === normalized ? current : normalized));
  }, []);

  const clearKeyboardMeasureTimers = useCallback(() => {
    keyboardMeasureTimeoutsRef.current.forEach(clearTimeout);
    keyboardMeasureTimeoutsRef.current = [];
  }, []);

  const clearReplyRevealTimers = useCallback(() => {
    replyRevealTimeoutsRef.current.forEach(clearTimeout);
    replyRevealTimeoutsRef.current = [];
  }, []);

  const revealReplyTarget = useCallback(
    (target: ReplyTarget | null, animated = true) => {
      if (!target) return;
      const parentIndex = comments.findIndex(
        comment => comment.id === target.commentId,
      );
      if (parentIndex < 0) return;

      commentsListRef.current?.scrollToIndex({
        index: parentIndex,
        animated,
        viewPosition: isInline ? 0.76 : 0.58,
      });
    },
    [comments, isInline],
  );

  const scheduleReplyTargetReveal = useCallback(
    (target: ReplyTarget | null) => {
      if (!target) return;
      clearReplyRevealTimers();
      replyRevealTimeoutsRef.current = [0, 90, 240, 420].map(delay =>
        setTimeout(() => revealReplyTarget(target, delay !== 0), delay),
      );
    },
    [clearReplyRevealTimers, revealReplyTarget],
  );

  const measureComposerAgainstKeyboard = useCallback(() => {
    if (!shouldOwnKeyboardAvoidance) return;
    const keyboardTop = keyboardTopRef.current;
    const composer = composerMeasureRef.current;
    if (keyboardTop === null || !composer) return;

    composer.measureInWindow((_x, y, _width, height) => {
      const keyboardAccessoryClearance =
        isInline && Platform.OS === 'android'
          ? INLINE_ANDROID_KEYBOARD_ACCESSORY_CLEARANCE
          : 2;
      const effectiveKeyboardTop = keyboardTop - keyboardAccessoryClearance;
      const unshiftedBottom = y + height + keyboardLiftRef.current;
      const overlap = Math.max(
        0,
        Math.ceil(unshiftedBottom - effectiveKeyboardTop),
      );
      const maxLift = keyboardHeightRef.current
        ? keyboardHeightRef.current + keyboardAccessoryClearance
        : overlap;
      commitKeyboardLift(Math.min(overlap, maxLift));
    });
  }, [commitKeyboardLift, isInline, shouldOwnKeyboardAvoidance]);

  const scheduleKeyboardMeasurements = useCallback(() => {
    if (!shouldOwnKeyboardAvoidance) return;
    clearKeyboardMeasureTimers();
    keyboardMeasureTimeoutsRef.current = [0, 80, 220].map(delay =>
      setTimeout(measureComposerAgainstKeyboard, delay),
    );
  }, [
    clearKeyboardMeasureTimers,
    measureComposerAgainstKeyboard,
    shouldOwnKeyboardAvoidance,
  ]);

  const handleComposerLayout = useCallback(() => {
    if (keyboardTopRef.current === null) return;
    requestAnimationFrame(measureComposerAgainstKeyboard);
  }, [measureComposerAgainstKeyboard]);

  const composerLiftStyle = useMemo(
    () =>
      shouldOwnKeyboardAvoidance && appliedKeyboardLift > 0
        ? { marginBottom: appliedKeyboardLift }
        : undefined,
    [appliedKeyboardLift, shouldOwnKeyboardAvoidance],
  );

  const handleDismissKeyboardFromContent = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const clearSheetViewportReleaseTimer = useCallback(() => {
    if (sheetViewportReleaseTimerRef.current === null) return;
    clearTimeout(sheetViewportReleaseTimerRef.current);
    sheetViewportReleaseTimerRef.current = null;
  }, []);

  const showComposerModal = useCallback(() => {
    clearSheetViewportReleaseTimer();
    composerModalVisibleRef.current = true;
    freezeSheetViewportRef.current = true;
    setIsComposerModalVisible(true);
  }, [clearSheetViewportReleaseTimer]);

  const hideComposerModal = useCallback(() => {
    composerModalVisibleRef.current = false;
    clearSheetViewportReleaseTimer();
    sheetViewportReleaseTimerRef.current = setTimeout(() => {
      sheetViewportReleaseTimerRef.current = null;
      if (composerModalVisibleRef.current) return;

      const currentViewportHeight = Math.max(
        latestSheetViewportHeightRef.current,
        Dimensions.get('window').height,
      );
      if (currentViewportHeight >= stableSheetViewportHeightRef.current - 1) {
        freezeSheetViewportRef.current = false;
      }
    }, 360);
    setIsComposerModalVisible(false);
  }, [clearSheetViewportReleaseTimer]);

  const handleOpenComposer = useCallback(() => {
    if (isInline) {
      inputRef.current?.focus();
      return;
    }
    showComposerModal();
    setComposerModalFocusSignal(current => current + 1);
  }, [isInline, showComposerModal]);

  const handleCloseComposer = useCallback(() => {
    Keyboard.dismiss();
    keyboardHeightRef.current = 0;
    keyboardTopRef.current = null;
    setKeyboardHeight(0);
    hideComposerModal();
  }, [hideComposerModal]);

  const handleInsertMention = useCallback(() => {
    setDraft(current => `${current}@`);
  }, []);

  useEffect(() => {
    if (!visible || (!autoFocusComposer && composerFocusSignal <= 0)) return;
    if (!isInline) {
      showComposerModal();
      setComposerModalFocusSignal(current => current + 1);
      return;
    }

    const timer = setTimeout(() => inputRef.current?.focus(), 220);
    return () => clearTimeout(timer);
  }, [
    autoFocusComposer,
    composerFocusSignal,
    isInline,
    showComposerModal,
    visible,
  ]);

  useEffect(() => {
    if (!isInline) return;
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleKeyboardShow = (event: KeyboardEvent) => {
      const keyboardMetrics = Keyboard.metrics?.();
      const nextHeight = Math.max(
        0,
        event.endCoordinates?.height ?? 0,
        keyboardMetrics?.height ?? 0,
      );
      const reportedScreenY =
        typeof keyboardMetrics?.screenY === 'number'
          ? keyboardMetrics.screenY
          : event.endCoordinates?.screenY;
      const fallbackKeyboardTop = Dimensions.get('screen').height - nextHeight;
      keyboardHeightRef.current = nextHeight;
      keyboardTopRef.current =
        typeof reportedScreenY === 'number' &&
        Number.isFinite(reportedScreenY) &&
        reportedScreenY > 0
          ? reportedScreenY
          : fallbackKeyboardTop;
      setKeyboardHeight(nextHeight);
      scheduleKeyboardMeasurements();
      if (replyingTo) {
        scheduleReplyTargetReveal(replyingTo);
      }
    };

    const handleKeyboardHide = () => {
      clearKeyboardMeasureTimers();
      keyboardHeightRef.current = 0;
      keyboardTopRef.current = null;
      commitKeyboardLift(0);
      setKeyboardHeight(0);
    };

    const showSubscription = Keyboard.addListener(
      showEvent,
      handleKeyboardShow,
    );
    const hideSubscription = Keyboard.addListener(
      hideEvent,
      handleKeyboardHide,
    );

    return () => {
      clearKeyboardMeasureTimers();
      clearReplyRevealTimers();
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [
    clearKeyboardMeasureTimers,
    clearReplyRevealTimers,
    commitKeyboardLift,
    isInline,
    replyingTo,
    scheduleReplyTargetReveal,
    scheduleKeyboardMeasurements,
  ]);

  useEffect(() => {
    if (!replyingTo) return;
    scheduleReplyTargetReveal(replyingTo);
    if (!isInline) {
      showComposerModal();
      setComposerModalFocusSignal(current => current + 1);
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [isInline, replyingTo, scheduleReplyTargetReveal, showComposerModal]);

  // Image picked by the user for the next comment / reply. Local file://
  // URI; uploaded via multipart when `onSubmit` fires. Cleared after
  // submit or by tapping the X on the preview thumbnail.
  const [pendingImage, setPendingImage] =
    useState<CommentImageAttachment | null>(null);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [actionMenuComment, setActionMenuComment] =
    useState<ReelComment | null>(null);
  const [inlineDeleteCommentId, setInlineDeleteCommentId] = useState<
    string | null
  >(null);
  const [editingComment, setEditingComment] = useState<ReelComment | null>(
    null,
  );
  const [deletingCommentIds, setDeletingCommentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingAudio, setPendingAudio] =
    useState<CommentAudioAttachment | null>(null);

  useEffect(() => {
    if (!editingComment) return;
    if (!isInline) {
      showComposerModal();
      setComposerModalFocusSignal(current => current + 1);
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, [editingComment, isInline, showComposerModal]);

  // Which comment-image URL is open in the full-screen viewer (null = closed).
  // Used both for already-uploaded `imageUrl` and pending local previews so
  // the user can tap any comment image to see it big.
  const [imageViewerUri, setImageViewerUri] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(visible);
  const openProgress = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const listScrollOffset = useRef(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const touchStartY = useRef(0);
  const isDraggingSheet = useRef(false);
  const isClosingRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const isSheetGestureEnabledRef = useRef(false);
  const isTouchSessionEligibleRef = useRef(false);
  const hasStartedOpenRef = useRef(false);
  const openAnimationFrameRef = useRef<number | null>(null);
  const panFrameRef = useRef<number | null>(null);
  const pendingPanYRef = useRef(0);

  const cancelScheduledOpenAnimation = useCallback(() => {
    if (openAnimationFrameRef.current === null) return;
    cancelAnimationFrame(openAnimationFrameRef.current);
    openAnimationFrameRef.current = null;
  }, []);

  const cancelScheduledPanUpdate = useCallback(() => {
    if (panFrameRef.current === null) return;
    cancelAnimationFrame(panFrameRef.current);
    panFrameRef.current = null;
  }, []);

  const schedulePanUpdate = useCallback(
    (nextPanY: number) => {
      pendingPanYRef.current = nextPanY;
      if (panFrameRef.current !== null) return;
      panFrameRef.current = requestAnimationFrame(() => {
        panFrameRef.current = null;
        panY.setValue(pendingPanYRef.current);
      });
    },
    [panY],
  );

  const flushPanUpdate = useCallback(
    (nextPanY: number) => {
      cancelScheduledPanUpdate();
      pendingPanYRef.current = nextPanY;
      panY.setValue(nextPanY);
    },
    [cancelScheduledPanUpdate, panY],
  );

  useEffect(
    () => () => {
      cancelScheduledOpenAnimation();
      cancelScheduledPanUpdate();
    },
    [cancelScheduledOpenAnimation, cancelScheduledPanUpdate],
  );

  // Picker state — which comment's "Thích" was long-pressed, plus the
  // anchor coordinates so the pill floats just above the actual button.
  const [pickerAnchor, setPickerAnchor] = useState<{
    commentId: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!visible) {
      cancelWavRecording().catch(() => undefined);
      clearSheetViewportReleaseTimer();
      composerModalVisibleRef.current = false;
      freezeSheetViewportRef.current = false;
      setIsComposerModalVisible(false);
      reopenComposerAfterPhotoPickerRef.current = false;
      setDraft('');
      setPickerAnchor(null);
      setPendingImage(null);
      setPendingAudio(null);
      setImageViewerUri(null);
      setPhotoPickerVisible(false);
      setActionMenuComment(null);
      setEditingComment(null);
      autoScrollToEndUntilRef.current = 0;
      setInlineDeleteCommentId(null);
      setDeletingCommentIds(new Set());
      clearKeyboardMeasureTimers();
      clearReplyRevealTimers();
      keyboardHeightRef.current = 0;
      keyboardTopRef.current = null;
      commitKeyboardLift(0);
      setKeyboardHeight(0);
    }
  }, [
    cancelWavRecording,
    clearSheetViewportReleaseTimer,
    clearKeyboardMeasureTimers,
    clearReplyRevealTimers,
    commitKeyboardLift,
    visible,
  ]);

  const handlePresentationShow = useCallback(() => {
    if (
      isInline ||
      !visible ||
      isClosingRef.current ||
      hasStartedOpenRef.current
    ) {
      return;
    }

    hasStartedOpenRef.current = true;
    isTransitioningRef.current = true;
    isSheetGestureEnabledRef.current = false;
    onOpenStart?.();
    cancelScheduledOpenAnimation();
    openAnimationFrameRef.current = requestAnimationFrame(() => {
      openAnimationFrameRef.current = null;
      if (isClosingRef.current) return;

      Animated.timing(openProgress, {
        toValue: 1,
        duration: SHEET_TRANSITION_DURATION_MS,
        easing: SHEET_TRANSITION_EASING,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || isClosingRef.current) return;
        isTransitioningRef.current = false;
        isSheetGestureEnabledRef.current = true;
      });
    });
  }, [
    cancelScheduledOpenAnimation,
    isInline,
    onOpenStart,
    openProgress,
    visible,
  ]);

  const handleSheetViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = Math.max(0, event.nativeEvent.layout.width);
      const nextHeight = Math.max(0, event.nativeEvent.layout.height);
      latestSheetViewportHeightRef.current = nextHeight;

      if (nextWidth > 0 && nextHeight > 0) {
        const widthChanged =
          Math.abs(stableSheetViewportWidthRef.current - nextWidth) >= 1;
        const viewportRecovered =
          nextHeight >= stableSheetViewportHeightRef.current - 1;
        const canRefreshStableViewport =
          widthChanged ||
          !freezeSheetViewportRef.current ||
          (!composerModalVisibleRef.current && viewportRecovered);

        if (canRefreshStableViewport) {
          freezeSheetViewportRef.current = composerModalVisibleRef.current;
          stableSheetViewportWidthRef.current = nextWidth;
          stableSheetViewportHeightRef.current = nextHeight;
          setStableSheetViewportHeight(current =>
            Math.abs(current - nextHeight) < 1 ? current : nextHeight,
          );
          if (!composerModalVisibleRef.current) {
            clearSheetViewportReleaseTimer();
          }
        }
      }

      handlePresentationShow();
    },
    [clearSheetViewportReleaseTimer, handlePresentationShow],
  );

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      isTransitioningRef.current = true;
      isSheetGestureEnabledRef.current = false;
      isTouchSessionEligibleRef.current = false;
      hasStartedOpenRef.current = false;
      setIsMounted(true);
      cancelScheduledOpenAnimation();
      openProgress.stopAnimation();
      panY.stopAnimation();
      cancelScheduledPanUpdate();
      openProgress.setValue(0);
      panY.setValue(0);
      setScrollEnabled(true);

      if (isInline) {
        hasStartedOpenRef.current = true;
        isTransitioningRef.current = false;
        isSheetGestureEnabledRef.current = true;
        openProgress.setValue(1);
      }
      return;
    }

    cancelScheduledOpenAnimation();
    cancelScheduledPanUpdate();
    isSheetGestureEnabledRef.current = false;
    isTouchSessionEligibleRef.current = false;
    hasStartedOpenRef.current = false;

    if (isClosingRef.current) {
      setIsMounted(false);
      isClosingRef.current = false;
      isTransitioningRef.current = false;
      return;
    }

    isTransitioningRef.current = true;
    openProgress.stopAnimation();
    panY.stopAnimation();
    Animated.parallel([
      Animated.timing(openProgress, {
        toValue: 0,
        duration: SHEET_TRANSITION_DURATION_MS,
        easing: SHEET_TRANSITION_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(panY, {
        toValue: 0,
        duration: SHEET_TRANSITION_DURATION_MS,
        easing: SHEET_TRANSITION_EASING,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        isTransitioningRef.current = false;
        setIsMounted(false);
      }
    });
  }, [
    cancelScheduledOpenAnimation,
    cancelScheduledPanUpdate,
    isInline,
    openProgress,
    panY,
    visible,
  ]);

  const dragBackdropOpacity = panY.interpolate({
    inputRange: [0, 120, 360],
    outputRange: [1, 0.42, 0],
    extrapolate: 'clamp',
  });

  const backdropOpacity = Animated.multiply(openProgress, dragBackdropOpacity);

  const sheetTranslateY = Animated.add(
    openProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [sheetTravelDistance, 0],
    }),
    panY,
  );

  const handleRequestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    isTransitioningRef.current = true;
    isSheetGestureEnabledRef.current = false;
    isTouchSessionEligibleRef.current = false;
    cancelScheduledOpenAnimation();
    cancelScheduledPanUpdate();
    openProgress.stopAnimation();
    panY.stopAnimation();
    onCloseStart?.();
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(openProgress, {
        toValue: 0,
        duration: SHEET_TRANSITION_DURATION_MS,
        easing: SHEET_TRANSITION_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(panY, {
        toValue: 0,
        duration: SHEET_TRANSITION_DURATION_MS,
        easing: SHEET_TRANSITION_EASING,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished || !isClosingRef.current) return;
      isTransitioningRef.current = false;
      setScrollEnabled(true);
      onClose();
    });
  }, [
    cancelScheduledOpenAnimation,
    cancelScheduledPanUpdate,
    onClose,
    onCloseStart,
    openProgress,
    panY,
  ]);

  const settleSheetPan = useCallback(() => {
    cancelScheduledPanUpdate();
    isTransitioningRef.current = true;
    isSheetGestureEnabledRef.current = false;
    Animated.timing(panY, {
      toValue: 0,
      duration: SHEET_DRAG_SETTLE_DURATION_MS,
      easing: SHEET_TRANSITION_EASING,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || isClosingRef.current) return;
      isTransitioningRef.current = false;
      isSheetGestureEnabledRef.current = true;
      setScrollEnabled(true);
    });
  }, [cancelScheduledPanUpdate, panY]);

  const title = useMemo(() => {
    return copy.commentsTitle;
  }, [copy.commentsTitle]);

  const headerCountLabel = useMemo(() => {
    const count = Math.max(commentCount, comments.length);
    return count > 0 ? formatCount(count) : null;
  }, [commentCount, comments.length]);

  const scrollCommentsToEnd = useCallback((animated = true) => {
    commentsListRef.current?.scrollToEnd({ animated });
  }, []);

  const scheduleCommentsAutoScrollToEnd = useCallback(() => {
    autoScrollToEndUntilRef.current = Date.now() + 900;
    requestAnimationFrame(() => scrollCommentsToEnd(true));
    setTimeout(() => scrollCommentsToEnd(false), 80);
    setTimeout(() => scrollCommentsToEnd(false), 260);
  }, [scrollCommentsToEnd]);

  const handleCommentsContentSizeChange = useCallback(() => {
    if (Date.now() > autoScrollToEndUntilRef.current) return;
    requestAnimationFrame(() => scrollCommentsToEnd(false));
  }, [scrollCommentsToEnd]);

  const handleCancelEdit = useCallback(() => {
    setEditingComment(null);
    setDraft('');
    setPendingImage(null);
    setPendingAudio(null);
  }, []);

  const handleStartReplyFromRow = useCallback(
    (
      commentId: string,
      username: string,
      displayName?: string,
      targetCommentId?: string,
    ) => {
      handleCancelEdit();
      const replyDisplayName =
        (displayName || username || '').trim() ||
        (language === 'en' ? 'User' : 'Người dùng');
      const replyTarget: ReplyTarget = {
        commentId,
        targetCommentId: targetCommentId || commentId,
        username,
        displayName: replyDisplayName,
      };
      setPendingImage(null);
      setPendingAudio(null);
      setDraft(getReplyDraftPrefix(replyDisplayName));
      onStartReply(
        commentId,
        username,
        replyDisplayName,
        targetCommentId || commentId,
      );
      scheduleReplyTargetReveal(replyTarget);
      if (isInline) {
        requestAnimationFrame(() => inputRef.current?.focus());
      } else {
        showComposerModal();
        setComposerModalFocusSignal(current => current + 1);
      }
    },
    [
      handleCancelEdit,
      isInline,
      language,
      onStartReply,
      scheduleReplyTargetReveal,
      showComposerModal,
    ],
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || submitInFlightRef.current) return;
    const trimmed = draft.trim();
    if (editingComment) {
      if (!trimmed) return;

      const previousText = editingComment.text.trim();
      setEditingComment(null);
      setDraft('');
      setPendingImage(null);
      setPendingAudio(null);

      if (trimmed !== previousText) {
        onEdit(editingComment.id, trimmed);
      }
      handleCloseComposer();
      return;
    }

    // Accept comment if it has text OR an image (matches backend
    // validation — image-only comments are valid).
    if (!trimmed && !pendingImage && !pendingAudio) return;
    if (replyingTo && !trimmed && !pendingImage) return;

    // Snapshot the image then clear local state immediately so the
    // composer feels responsive even while the multipart upload is in
    // flight. The view-model already shows the optimistic bubble.
    const image = pendingImage ?? undefined;
    const audio = pendingAudio ?? undefined;
    setDraft('');
    setPendingImage(null);
    setPendingAudio(null);
    submitInFlightRef.current = true;
    handleCloseComposer();

    try {
      if (replyingTo) {
        const replyMentionName = splitLeadingReplyMention(
          trimmed,
          getReplyTargetDisplayName(replyingTo, language),
        )?.mention;
        onCancelReply();
        const replySubmission = onSubmitReply(
          replyingTo.commentId,
          trimmed,
          image,
          replyMentionName,
        );
        scheduleReplyTargetReveal(replyingTo);
        await replySubmission;
        scheduleReplyTargetReveal(replyingTo);
      } else {
        const commentSubmission = onSubmit(trimmed, image, audio);
        // The view-model inserts an optimistic comment synchronously before
        // awaiting the network. Scroll immediately, then repeat after the
        // server response so the user's own comment stays visible even when
        // the thread is long or the row height changes after upload.
        scheduleCommentsAutoScrollToEnd();
        await commentSubmission;
        scheduleCommentsAutoScrollToEnd();
      }
    } finally {
      submitInFlightRef.current = false;
    }
  }, [
    draft,
    editingComment,
    handleCloseComposer,
    isSubmitting,
    onEdit,
    pendingImage,
    pendingAudio,
    onSubmit,
    onSubmitReply,
    replyingTo,
    onCancelReply,
    scheduleReplyTargetReveal,
    scheduleCommentsAutoScrollToEnd,
    language,
  ]);

  const handleInsertQuickEmoji = useCallback((emoji: string) => {
    setDraft(current => `${current}${emoji}`);
  }, []);

  const handlePickAudio = useCallback(async () => {
    try {
      Keyboard.dismiss();
      const audio = await pickSupportedAudioFile();
      if (audio) {
        setPendingImage(null);
        setPendingAudio(audio);
      }
    } catch (caught) {
      Alert.alert(
        copy.audioPickErrorTitle,
        caught instanceof Error ? caught.message : copy.pleaseTryAgain,
      );
    }
  }, [copy]);

  const handleToggleAudioRecording = useCallback(async () => {
    try {
      Keyboard.dismiss();
      if (isWavRecording) {
        const audio = await stopWavRecording();
        if (audio) {
          setPendingImage(null);
          setPendingAudio(audio);
        }
        if (!isInline && isComposerModalVisible) {
          setComposerModalFocusSignal(current => current + 1);
        }
        return;
      }

      setPendingImage(null);
      setPendingAudio(null);
      await startWavRecording();
    } catch (caught) {
      Alert.alert(
        copy.audioRecordErrorTitle,
        caught instanceof Error ? caught.message : copy.pleaseTryAgain,
      );
    }
  }, [
    copy,
    isComposerModalVisible,
    isInline,
    isWavRecording,
    startWavRecording,
    stopWavRecording,
  ]);

  /**
   * Open the gallery picker and stash the first selected image in
   * `pendingImage`. We normalise the Asset shape into our domain
   * `CommentImageAttachment` (with sane defaults for missing `fileName`
   * / `type` — Android omits both on some devices) so the repo can pass
   * it straight to FormData.
   */
  const handleImagePickerResult = useCallback(
    (result: any) => {
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert(
          copy.errorTitle,
          result.errorMessage ?? copy.errorActionMsg,
        );
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const uri =
        Platform.OS === 'android' && !asset.uri.startsWith('file://')
          ? `file://${asset.uri}`
          : asset.uri;

      setPendingImage({
        uri,
        name: asset.fileName ?? `comment-${Date.now()}.jpg`,
        type: asset.type ?? 'image/jpeg',
        width: asset.width,
        height: asset.height,
      });
      setPendingAudio(null);
    },
    [copy.errorActionMsg, copy.errorTitle],
  );

  useEffect(() => {
    if (replyingTo) {
      cancelWavRecording().catch(() => undefined);
      setPendingAudio(null);
    }
  }, [cancelWavRecording, replyingTo]);

  /**
   * Open the gallery picker or camera and stash the selected image in
   * `pendingImage`.
   */
  const handlePickImage = useCallback(() => {
    const shouldReopenComposer = !isInline && isComposerModalVisible;
    reopenComposerAfterPhotoPickerRef.current = shouldReopenComposer;
    if (shouldReopenComposer) {
      hideComposerModal();
    }
    Keyboard.dismiss();
    setPhotoPickerVisible(true);
  }, [hideComposerModal, isComposerModalVisible, isInline]);

  const restoreComposerAfterPhotoPicker = useCallback(() => {
    if (!reopenComposerAfterPhotoPickerRef.current) return;
    reopenComposerAfterPhotoPickerRef.current = false;
    showComposerModal();
    setComposerModalFocusSignal(current => current + 1);
  }, [showComposerModal]);

  const handleInlineDeleteComment = useCallback(
    (commentId: string) => {
      setInlineDeleteCommentId(current =>
        current === commentId ? null : current,
      );
      setDeletingCommentIds(current => {
        const next = new Set(current);
        next.add(commentId);
        return next;
      });
      setTimeout(() => {
        onDelete(commentId);
        setDeletingCommentIds(current => {
          const next = new Set(current);
          next.delete(commentId);
          return next;
        });
      }, COMMENT_DELETE_ANIMATION_MS);
    },
    [onDelete],
  );

  const handleCommentLongPress = useCallback((comment: ReelComment) => {
    if (comment.isSending) return;
    Keyboard.dismiss();
    setInlineDeleteCommentId(null);
    setActionMenuComment(comment);
  }, []);

  const handleCloseActionMenu = useCallback(() => {
    setActionMenuComment(null);
  }, []);

  const handleConfirmDeleteComment = useCallback(
    (comment: ReelComment) => {
      Alert.alert(
        getDeleteConfirmTitle(language),
        getDeleteConfirmMessage(language),
        [
          { text: copy.cancel, style: 'cancel' },
          {
            text: getDeleteCommentLabel(language),
            style: 'destructive',
            onPress: () => handleInlineDeleteComment(comment.id),
          },
        ],
      );
    },
    [copy.cancel, handleInlineDeleteComment, language],
  );

  const handleDeleteActionMenuComment = useCallback(() => {
    const comment = actionMenuComment;
    if (!comment) return;
    setActionMenuComment(null);
    if (comment.isFailed) {
      onDeleteFailedComment(comment);
      return;
    }
    handleConfirmDeleteComment(comment);
  }, [actionMenuComment, handleConfirmDeleteComment, onDeleteFailedComment]);

  const handleEditActionMenuComment = useCallback(() => {
    const comment = actionMenuComment;
    if (!comment || comment.isFailed || !comment.owner) return;
    setActionMenuComment(null);
    onCancelReply();
    cancelWavRecording().catch(() => undefined);
    setPendingImage(null);
    setPendingAudio(null);
    setInlineDeleteCommentId(null);
    setEditingComment(comment);
    setDraft(comment.text);
  }, [actionMenuComment, cancelWavRecording, onCancelReply]);

  const handleReportActionMenuComment = useCallback(() => {
    if (!actionMenuComment) return;
    setActionMenuComment(null);
    Alert.alert(getReportSentTitle(language), getReportSentMessage(language));
  }, [actionMenuComment, language]);

  const handleRetryActionMenuComment = useCallback(() => {
    const comment = actionMenuComment;
    if (!comment) return;
    setActionMenuComment(null);
    onRetryFailedComment(comment);
  }, [actionMenuComment, onRetryFailedComment]);

  const actionMenuPreview = useMemo(() => {
    if (!actionMenuComment) return '';
    const text = actionMenuComment.text.trim();
    if (text.length > 80) return `${text.slice(0, 80)}...`;
    if (text.length > 0) return text;
    if (actionMenuComment.imageUrl || actionMenuComment.pendingImageUri) {
      return language === 'en' ? 'Photo comment' : 'Bình luận ảnh';
    }
    if (actionMenuComment.audioUrl || actionMenuComment.pendingAudioUri) {
      return language === 'en' ? 'Voice comment' : 'Bình luận giọng nói';
    }
    return '';
  }, [actionMenuComment, language]);

  const actionMenuIsFailed = Boolean(actionMenuComment?.isFailed);
  const actionMenuIsOwner = Boolean(actionMenuComment?.owner);
  const actionMenuCanEdit = actionMenuIsOwner && !actionMenuIsFailed;
  const actionMenuCanDelete = actionMenuIsOwner || actionMenuIsFailed;
  const actionMenuCanReport =
    Boolean(actionMenuComment) && !actionMenuIsOwner && !actionMenuIsFailed;

  const actionMenuTitle = actionMenuIsFailed
    ? copy.failedCommentTitle
    : actionMenuIsOwner
    ? copy.yourCommentTitle
    : getReportCommentLabel(language);

  const actionMenuMessage = actionMenuIsFailed
    ? copy.failedCommentMsg
    : actionMenuPreview;

  const actionMenuFootnote = actionMenuIsFailed ? actionMenuPreview : '';
  const deleteCommentLabel = language === 'en' ? 'Delete' : 'X\u00f3a';
  const editCommentLabel = language === 'en' ? 'Edit' : 'Ch\u1ec9nh s\u1eeda';
  const reportCommentLabel = language === 'en' ? 'Report' : 'B\u00e1o c\u00e1o';
  const deleteCommentHint =
    language === 'en'
      ? 'Remove this comment'
      : 'X\u00f3a b\u00ecnh lu\u1eadn n\u00e0y';
  const editCommentHint =
    language === 'en'
      ? 'Update your comment'
      : 'Ch\u1ec9nh s\u1eeda n\u1ed9i dung b\u00ecnh lu\u1eadn';
  const reportCommentHint =
    language === 'en'
      ? 'Send this comment to review'
      : 'G\u1eedi b\u00e1o c\u00e1o \u0111\u1ec3 ch\u00fang t\u00f4i xem x\u00e9t';
  const retryCommentHint =
    language === 'en'
      ? 'Try sending this comment again'
      : 'Th\u1eed g\u1eedi l\u1ea1i b\u00ecnh lu\u1eadn n\u00e0y';

  const actionMenuCopy = useMemo(
    () => ({
      cancel: copy.cancel,
      delete: deleteCommentLabel,
      deleteHint: deleteCommentHint,
      edit: editCommentLabel,
      editHint: editCommentHint,
      footnote: actionMenuFootnote,
      message: actionMenuMessage,
      report: reportCommentLabel,
      reportHint: reportCommentHint,
      retry: copy.retry,
      retryHint: retryCommentHint,
      title: actionMenuTitle,
    }),
    [
      actionMenuFootnote,
      actionMenuMessage,
      actionMenuTitle,
      copy.cancel,
      copy.retry,
      deleteCommentHint,
      deleteCommentLabel,
      editCommentHint,
      editCommentLabel,
      reportCommentHint,
      reportCommentLabel,
      retryCommentHint,
    ],
  );

  // Called from the "Thích" button on every comment row when long-pressed.
  // The button measures its own position before invoking this so we can
  // anchor the picker pill correctly.
  const handleOpenPicker = useCallback(
    (commentId: string, anchorX: number, anchorY: number) => {
      setPickerAnchor({ commentId, x: anchorX, y: anchorY });
    },
    [],
  );

  const handlePickReaction = useCallback(
    (reaction: ReactionType) => {
      if (!pickerAnchor) return;
      onSetReaction(pickerAnchor.commentId, reaction);
      setPickerAnchor(null);
    },
    [onSetReaction, pickerAnchor],
  );

  const handleClosePicker = useCallback(() => {
    setPickerAnchor(null);
  }, []);

  // Stable handler so memoised rows don't re-render on every parent
  // update — `setImageViewerUri` is referentially stable, but we wrap it
  // to keep the prop name consistent with the rest of the row callbacks.
  const handleOpenImage = useCallback((uri: string) => {
    setImageViewerUri(uri);
  }, []);

  const renderThread = useCallback(
    ({ item }: { item: ReelComment }) => {
      const replies = repliesById[item.id];
      const isExpanded = replies !== undefined;
      const isLoadingReplies = loadingRepliesIds.includes(item.id);

      return (
        <CommentThread
          comment={item}
          replies={replies}
          isExpanded={isExpanded}
          isLoadingReplies={isLoadingReplies}
          onSetReaction={onSetReaction}
          onOpenPicker={handleOpenPicker}
          onLongPressRow={handleCommentLongPress}
          onLoadReplies={onLoadReplies}
          onCollapseReplies={onCollapseReplies}
          onStartReply={handleStartReplyFromRow}
          onOpenImage={handleOpenImage}
          replyingToCommentId={
            replyingTo?.targetCommentId ?? replyingTo?.commentId
          }
          onPressProfile={handlePressProfile}
          inlineDeleteCommentId={inlineDeleteCommentId}
          deletingCommentIds={deletingCommentIds}
          onInlineDelete={handleInlineDeleteComment}
        />
      );
    },
    [
      handleCommentLongPress,
      handleOpenImage,
      handleOpenPicker,
      handleInlineDeleteComment,
      inlineDeleteCommentId,
      deletingCommentIds,
      loadingRepliesIds,
      onCollapseReplies,
      onLoadReplies,
      onSetReaction,
      handleStartReplyFromRow,
      repliesById,
      replyingTo,
      handlePressProfile,
    ],
  );

  const keyExtractor = useCallback((item: ReelComment) => item.id, []);

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      listScrollOffset.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const replyingSnippet = useMemo(() => {
    if (!replyingTo) return '';
    const targetCommentId = replyingTo.targetCommentId ?? replyingTo.commentId;
    let found = comments.find(c => c.id === targetCommentId);
    if (!found) {
      for (const key in repliesById) {
        const match = repliesById[key]?.find(c => c.id === targetCommentId);
        if (match) {
          found = match;
          break;
        }
      }
    }
    return found?.text || '';
  }, [replyingTo, comments, repliesById]);
  const isInitialLoading = isLoading && comments.length === 0;
  const isRefreshingComments = isLoading && comments.length > 0;
  const isSubmitDisabled =
    isWavRecording ||
    (editingComment
      ? !draft.trim()
      : !draft.trim() && !pendingImage && !pendingAudio);
  const composerPlaceholder = editingComment
    ? getEditCommentLabel(language)
    : replyingTo
    ? getReplyTargetDisplayName(replyingTo, language)
    : copy.addCommentPlaceholder;
  const PresentationRoot = (
    isInline ? View : Modal
  ) as React.ComponentType<any>;
  const SheetSurface = (
    isInline ? View : Animated.View
  ) as React.ComponentType<any>;

  return (
    <>
      <PresentationRoot
        {...(isInline
          ? { style: styles.inlineRoot }
          : {
              visible: isMounted && isScreenFocused,
              transparent: true,
              animationType: 'none',
              statusBarTranslucent: true,
              hardwareAccelerated: true,
              presentationStyle: 'overFullScreen',
              onShow: handlePresentationShow,
              onRequestClose: handleRequestClose,
            })}
      >
        <KeyboardSafeView
          style={isInline ? styles.inlineRoot : styles.modalRoot}
          enabled={
            visible && isScreenFocused && isInline && shouldOwnKeyboardAvoidance
          }
          keyboardVerticalOffset={0}
          onLayout={isInline ? undefined : handleSheetViewportLayout}
        >
          {!isInline ? (
            <Pressable
              style={styles.backdropPressable}
              onPress={handleRequestClose}
            >
              <Animated.View
                style={[
                  styles.backdrop,
                  { backgroundColor: backdropColor, opacity: backdropOpacity },
                ]}
              />
            </Pressable>
          ) : null}
          <SheetSurface
            style={
              isInline
                ? styles.inlineSheet
                : [
                    styles.sheet,
                    {
                      position: 'absolute',
                      top: activeSheetTop,
                      right: 0,
                      left: 0,
                      height: activeSheetHeight as ViewStyle['height'],
                      paddingBottom: sheetBottomPadding,
                      transform: [{ translateY: sheetTranslateY }],
                    },
                  ]
            }
            onTouchStart={(e: GestureResponderEvent) => {
              const canStartSheetGesture =
                !isInline &&
                isSheetGestureEnabledRef.current &&
                !isTransitioningRef.current &&
                !isClosingRef.current;
              isTouchSessionEligibleRef.current = canStartSheetGesture;
              isDraggingSheet.current = false;
              if (!canStartSheetGesture) return;
              cancelScheduledPanUpdate();
              touchStartY.current = e.nativeEvent.pageY;
            }}
            onTouchMove={(e: GestureResponderEvent) => {
              if (!isTouchSessionEligibleRef.current) return;
              const currentY = e.nativeEvent.pageY;
              const dy = currentY - touchStartY.current;

              if (
                dy > SHEET_DRAG_ACTIVATION_DISTANCE &&
                listScrollOffset.current <= 0
              ) {
                if (!isDraggingSheet.current) {
                  isDraggingSheet.current = true;
                  setScrollEnabled(false);
                }
                schedulePanUpdate(dy - SHEET_DRAG_ACTIVATION_DISTANCE);
              }
            }}
            onTouchEnd={(e: GestureResponderEvent) => {
              if (!isTouchSessionEligibleRef.current) return;
              isTouchSessionEligibleRef.current = false;
              if (isDraggingSheet.current) {
                const currentY = e.nativeEvent.pageY;
                const dragDistance = Math.max(
                  0,
                  currentY -
                    touchStartY.current -
                    SHEET_DRAG_ACTIVATION_DISTANCE,
                );
                flushPanUpdate(dragDistance);

                if (dragDistance > SHEET_DRAG_DISMISS_DISTANCE) {
                  isClosingRef.current = true;
                  isTransitioningRef.current = true;
                  isSheetGestureEnabledRef.current = false;
                  cancelScheduledOpenAnimation();
                  cancelScheduledPanUpdate();
                  onCloseStart?.();
                  Animated.timing(panY, {
                    toValue: sheetTravelDistance,
                    duration: SHEET_TRANSITION_DURATION_MS,
                    easing: SHEET_TRANSITION_EASING,
                    useNativeDriver: true,
                  }).start(({ finished }) => {
                    if (!finished || !isClosingRef.current) return;
                    isTransitioningRef.current = false;
                    setScrollEnabled(true);
                    onClose();
                  });
                } else {
                  settleSheetPan();
                }
                isDraggingSheet.current = false;
              }
            }}
            onTouchCancel={() => {
              if (!isTouchSessionEligibleRef.current) return;
              isTouchSessionEligibleRef.current = false;
              if (isDraggingSheet.current) {
                settleSheetPan();
                isDraggingSheet.current = false;
              }
            }}
          >
            {!isInline ? (
              <View>
                <View style={styles.grabber} />

                <View style={styles.header}>
                  <View style={styles.headerSide}>
                    {headerCountLabel ? (
                      <CommentSheetHeaderBadge style={styles.headerCountBadge}>
                        <Text style={styles.headerCountText}>
                          {headerCountLabel}
                        </Text>
                      </CommentSheetHeaderBadge>
                    ) : null}
                  </View>
                  <Text style={styles.title}>{title}</Text>
                  <View style={[styles.headerSide, styles.headerCloseSide]}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleRequestClose}
                      style={styles.closeButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <CommentSheetControlSurface
                        style={styles.closeButtonSurface}
                      >
                        <X size={20} color="#111827" />
                      </CommentSheetControlSurface>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null}

            {isInitialLoading && !isInline ? (
              <CommentsLoadingSkeleton />
            ) : error && comments.length === 0 && !isInline ? (
              <View style={styles.stateBox}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onRetry}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>{copy.retry}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                ref={commentsListRef}
                data={comments}
                keyExtractor={keyExtractor}
                renderItem={renderThread}
                style={styles.commentsList}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode={
                  Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                }
                onTouchStart={handleDismissKeyboardFromContent}
                showsVerticalScrollIndicator={false}
                scrollEnabled={scrollEnabled}
                initialNumToRender={10}
                maxToRenderPerBatch={8}
                updateCellsBatchingPeriod={40}
                windowSize={7}
                removeClippedSubviews={false}
                onContentSizeChange={handleCommentsContentSizeChange}
                contentContainerStyle={[
                  isInline ? styles.inlineListContent : styles.listContent,
                  comments.length === 0
                    ? isInline
                      ? styles.inlineEmptyListContent
                      : styles.emptyListContent
                    : null,
                ]}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.6}
                onScrollToIndexFailed={info => {
                  const estimatedOffset = Math.max(
                    0,
                    info.averageItemLength * info.index,
                  );
                  setTimeout(() => {
                    commentsListRef.current?.scrollToOffset({
                      offset: estimatedOffset,
                      animated: true,
                    });
                  }, 80);
                }}
                onScroll={handleListScroll}
                scrollEventThrottle={16}
                ListHeaderComponent={
                  listHeaderComponent ||
                  isInitialLoading ||
                  isRefreshingComments ||
                  error ? (
                    <>
                      {listHeaderComponent}
                      {isInitialLoading || isRefreshingComments ? (
                        <View style={styles.refreshingHeader}>
                          <ActivityIndicator
                            color={APP_BRAND_COLOR}
                            size="small"
                          />
                          <Text style={styles.refreshingHeaderText}>
                            {copy.loadingComments}
                          </Text>
                        </View>
                      ) : null}
                      {isInline && error && comments.length === 0 ? (
                        <View style={styles.stateBoxInline}>
                          <Text style={styles.errorText}>{error}</Text>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={onRetry}
                            style={styles.retryButton}
                          >
                            <Text style={styles.retryText}>{copy.retry}</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </>
                  ) : null
                }
                ListEmptyComponent={
                  !isInitialLoading && !(error && comments.length === 0) ? (
                    <View
                      style={[
                        styles.emptyBox,
                        isInline ? styles.inlineEmptyBox : null,
                      ]}
                    >
                      <Text style={styles.emptyTitle}>
                        {copy.noCommentsTitle}
                      </Text>
                      <Text style={styles.emptyText}>
                        {isInline
                          ? language === 'en'
                            ? 'Be the first to comment on this post.'
                            : 'Hãy là người đầu tiên bình luận bài viết này.'
                          : copy.noCommentsDesc}
                      </Text>
                    </View>
                  ) : null
                }
                ListFooterComponent={
                  isLoadingMore ? (
                    <View style={styles.footerLoader}>
                      <ActivityIndicator color={APP_BRAND_COLOR} size="small" />
                    </View>
                  ) : error ? (
                    <Text style={styles.inlineError}>{error}</Text>
                  ) : null
                }
              />
            )}

            <ReplyBanner
              replyingTo={replyingTo}
              snippet={replyingSnippet}
              onCancelReply={onCancelReply}
            />

            {/* ── Pending image preview (above the input row) ─────────────
              Rendered only while the user has an image queued. FB-style:
              a bigger preview thumbnail (88×88) with a circular X button
              to clear it. Sits in its own row so the input stays at a
              single line height. */}
            {editingComment ? (
              <View style={styles.replyBar}>
                <View style={styles.replyBarContent}>
                  <View style={styles.replyBarIndicator} />
                  <View style={styles.replyBarTextWrap}>
                    <Text style={styles.replyBarText}>
                      {getEditingCommentLabel(language)}
                    </Text>
                    <Text style={styles.replyBarSnippet} numberOfLines={1}>
                      {editingComment.text}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleCancelEdit}
                  style={styles.replyBarClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
            ) : null}

            {pendingImage ? (
              <View style={styles.pendingImageRow}>
                <View style={styles.pendingImageWrap}>
                  <Image
                    source={{ uri: pendingImage.uri }}
                    style={styles.pendingImageThumb}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setPendingImage(null)}
                    style={styles.pendingImageRemove}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {pendingAudio ? (
              <View style={styles.pendingAudioRow}>
                <View style={styles.pendingAudioBody}>
                  <Text style={styles.pendingAudioName} numberOfLines={1}>
                    {pendingAudio.name}
                  </Text>
                  <AudioPlayer uri={pendingAudio.uri} compact />
                </View>
                <TouchableOpacity
                  onPress={() => setPendingAudio(null)}
                  style={styles.pendingAudioRemove}
                >
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
            ) : null}

            {isWavRecording ? (
              <View style={styles.recordingRow}>
                <View style={styles.recordingDot} />
                <View style={styles.recordingBody}>
                  <Text style={styles.recordingText}>
                    {copy.recordingText.replace(
                      '{duration}',
                      formatAudioDuration(wavDurationMs),
                    )}
                  </Text>
                  <AudioWaveform
                    animated
                    color="#dc2626"
                    inactiveColor="#fecaca"
                    height={18}
                    barCount={30}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => cancelWavRecording()}
                  style={styles.recordingCancel}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <X size={16} color="#dc2626" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleToggleAudioRecording}
                  style={styles.recordingStop}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Square size={13} color="#fff" fill="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={composerLiftStyle}>
              <View
                ref={composerMeasureRef}
                collapsable={false}
                onLayout={handleComposerLayout}
              >
                <CommentSheetComposerDock
                  style={[
                    styles.inputBar,
                    { paddingBottom: composerBottomPadding },
                  ]}
                >
                  {/* Image picker button — leftmost in the row, mirrors FB layout */}
                  <View style={styles.composerPrimaryRow}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handlePickImage}
                      disabled={Boolean(editingComment)}
                      style={styles.imageButton}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      <ImagePlus
                        size={22}
                        color={editingComment ? '#cbd5e1' : APP_BRAND_COLOR}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handlePickAudio}
                      disabled={Boolean(
                        editingComment || replyingTo || isWavRecording,
                      )}
                      style={styles.imageButton}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      <Music2
                        size={21}
                        color={
                          editingComment || replyingTo || isWavRecording
                            ? '#cbd5e1'
                            : '#ec4899'
                        }
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleToggleAudioRecording}
                      disabled={Boolean(
                        editingComment || replyingTo || isWavRecording,
                      )}
                      style={styles.imageButton}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      {isWavRecording ? (
                        <Square size={17} color="#dc2626" fill="#dc2626" />
                      ) : (
                        <Mic
                          size={21}
                          color={
                            editingComment || replyingTo || isWavRecording
                              ? '#cbd5e1'
                              : '#dc2626'
                          }
                        />
                      )}
                    </TouchableOpacity>

                    <CommentSheetComposerInputSurface
                      style={styles.inputSurface}
                    >
                      {isInline ? (
                        <TextInput
                          ref={inputRef}
                          value={draft}
                          onChangeText={setDraft}
                          placeholder={composerPlaceholder}
                          placeholderTextColor="#94a3b8"
                          style={styles.input}
                          multiline
                          maxLength={500}
                          editable={!isWavRecording}
                        />
                      ) : (
                        <Pressable
                          style={styles.inputLauncher}
                          onPress={handleOpenComposer}
                          accessibilityRole="button"
                          accessibilityLabel={composerPlaceholder}
                        >
                          <Text
                            style={
                              draft
                                ? styles.inputLauncherText
                                : styles.inputLauncherPlaceholder
                            }
                            numberOfLines={2}
                          >
                            {draft || composerPlaceholder}
                          </Text>
                        </Pressable>
                      )}
                    </CommentSheetComposerInputSurface>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleSubmit}
                      // Enable submit if EITHER text or an image is provided —
                      // matches the backend's "text OR image required" rule.
                      disabled={isSubmitDisabled}
                      style={[
                        styles.sendButton,
                        isSubmitDisabled ? styles.sendButtonDisabled : null,
                      ]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <SendHorizonal size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </CommentSheetComposerDock>
              </View>
            </View>
          </SheetSurface>
        </KeyboardSafeView>

        {/* ── Reaction picker overlay ──────────────────────────────────────
          Rendered as a sibling so it can float above the sheet without
          being clipped by the sheet's `overflow: hidden`. */}
        <ReactionPicker
          anchor={pickerAnchor}
          onPick={handlePickReaction}
          onDismiss={handleClosePicker}
        />

        {/* ── Full-screen image viewer ─────────────────────────────────────
          Opens when the user taps any comment-bubble image (uploaded or
          pending). Single-image, single-page — no swipe between siblings
          because each comment carries at most one image. */}
        <CommentImageViewer
          uri={imageViewerUri}
          onClose={() => setImageViewerUri(null)}
        />

        <CommentActionSheet
          visible={Boolean(actionMenuComment)}
          copy={actionMenuCopy}
          bottomInset={actionSheetBottomInset}
          showRetry={Boolean(actionMenuComment?.isFailed)}
          showEdit={actionMenuCanEdit}
          showDelete={actionMenuCanDelete}
          showReport={actionMenuCanReport}
          onClose={handleCloseActionMenu}
          onDelete={handleDeleteActionMenuComment}
          onEdit={handleEditActionMenuComment}
          onReport={handleReportActionMenuComment}
          onRetry={handleRetryActionMenuComment}
        />

        <CommentPhotoPickerSheet
          visible={photoPickerVisible}
          bottomInset={actionSheetBottomInset}
          title={copy.pickPhotoTitle}
          message={copy.pickPhotoMsg}
          takePhotoLabel={copy.takePhoto}
          takePhotoHint={copy.takePhotoHint}
          chooseFromLibraryLabel={copy.chooseFromLibrary}
          chooseFromLibraryHint={copy.chooseFromLibraryHint}
          cancelLabel={copy.cancel}
          onClose={() => {
            setPhotoPickerVisible(false);
            restoreComposerAfterPhotoPicker();
          }}
          onTakePhoto={async () => {
            setPhotoPickerVisible(false);
            const result = await launchCamera({
              mediaType: 'photo' as MediaType,
              quality: 0.8,
              saveToPhotos: false,
              includeBase64: false,
            });
            handleImagePickerResult(result);
            restoreComposerAfterPhotoPicker();
          }}
          onChooseFromLibrary={async () => {
            setPhotoPickerVisible(false);
            const result = await launchImageLibrary({
              mediaType: 'photo' as MediaType,
              selectionLimit: 1,
              quality: 0.8,
              includeBase64: false,
            });
            handleImagePickerResult(result);
            restoreComposerAfterPhotoPicker();
          }}
        />
      </PresentationRoot>
      {!isInline ? (
        <ReelCommentComposerModal
          visible={isComposerModalVisible && visible && isScreenFocused}
          avatarUrl={composerAvatarUrl || AVATAR_FALLBACK}
          value={draft}
          placeholder={composerPlaceholder}
          editable={!isWavRecording}
          submitDisabled={isSubmitDisabled}
          imageDisabled={Boolean(editingComment)}
          recordingDisabled={Boolean(editingComment || replyingTo)}
          pendingImage={pendingImage}
          pendingAudio={pendingAudio}
          isRecording={isWavRecording}
          recordingLabel={copy.recordingText.replace(
            '{duration}',
            formatAudioDuration(wavDurationMs),
          )}
          contextLabel={
            editingComment
              ? getEditingCommentLabel(language)
              : replyingTo
              ? `${copy.replyingBanner} ${getReplyTargetDisplayName(
                  replyingTo,
                  language,
                )}`
              : undefined
          }
          contextSnippet={editingComment?.text || replyingSnippet}
          focusSignal={composerModalFocusSignal}
          onChangeText={setDraft}
          onClose={handleCloseComposer}
          onSubmit={handleSubmit}
          onInsertEmoji={handleInsertQuickEmoji}
          onInsertMention={handleInsertMention}
          onPickImage={handlePickImage}
          onToggleRecording={handleToggleAudioRecording}
          onRemoveImage={() => setPendingImage(null)}
          onRemoveAudio={() => setPendingAudio(null)}
          onCancelRecording={() => {
            cancelWavRecording().catch(() => undefined);
            setComposerModalFocusSignal(current => current + 1);
          }}
          onCancelContext={
            editingComment
              ? handleCancelEdit
              : replyingTo
              ? onCancelReply
              : undefined
          }
        />
      ) : null}
    </>
  );
}

interface ReplyBannerProps {
  replyingTo: ReplyTarget | null;
  snippet: string;
  onCancelReply: () => void;
}

interface CommentActionSheetProps {
  visible: boolean;
  bottomInset: number;
  copy: {
    cancel: string;
    delete: string;
    deleteHint: string;
    edit: string;
    editHint: string;
    footnote: string;
    message: string;
    report: string;
    reportHint: string;
    retry: string;
    retryHint: string;
    title: string;
  };
  showRetry: boolean;
  showEdit: boolean;
  showDelete: boolean;
  showReport: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onReport: () => void;
  onRetry: () => void;
}

interface CommentPhotoPickerSheetProps {
  visible: boolean;
  bottomInset: number;
  title: string;
  message: string;
  takePhotoLabel: string;
  takePhotoHint: string;
  chooseFromLibraryLabel: string;
  chooseFromLibraryHint: string;
  cancelLabel: string;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
}

function CommentPhotoPickerSheet({
  visible,
  bottomInset,
  title,
  message,
  takePhotoLabel,
  takePhotoHint,
  chooseFromLibraryLabel,
  chooseFromLibraryHint,
  cancelLabel,
  onClose,
  onTakePhoto,
  onChooseFromLibrary,
}: CommentPhotoPickerSheetProps) {
  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();
    }
  }, [visible]);

  if (!visible) return null;

  const photoPickerSheetWidth = Math.min(
    Math.max(Dimensions.get('window').width - 48, 300),
    430,
  );
  const photoPickerOptionCopyWidth = Math.max(photoPickerSheetWidth - 188, 116);

  return (
    <View style={styles.actionSheetLayer} pointerEvents="box-none">
      <Pressable style={styles.actionSheetBackdrop} onPress={onClose} />
      <View
        style={[
          styles.photoPickerCard,
          { marginBottom: bottomInset, width: photoPickerSheetWidth },
        ]}
      >
        <View style={styles.actionSheetGrabber} />

        <View style={styles.photoPickerHero}>
          <View style={styles.photoPickerHeroIcon}>
            <ImagePlus size={32} color="#4f46e5" />
          </View>
          <View style={styles.photoPickerHeroCopy}>
            <Text
              allowFontScaling={false}
              style={styles.photoPickerTitle}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              allowFontScaling={false}
              style={styles.photoPickerSubtitle}
              numberOfLines={2}
            >
              {message}
            </Text>
          </View>
        </View>

        <View style={styles.photoPickerOptionRow}>
          <Pressable
            onPress={onTakePhoto}
            style={({ pressed }) => [
              styles.photoPickerOptionCard,
              pressed && styles.actionSheetOptionPressed,
            ]}
          >
            <View style={styles.photoPickerOptionMainRow}>
              <View
                style={[
                  styles.photoPickerOptionIcon,
                  styles.actionSheetPhotoIcon,
                ]}
              >
                <Camera size={26} color={APP_BRAND_COLOR} />
              </View>
              <Text
                allowFontScaling={false}
                style={[
                  styles.photoPickerOptionText,
                  { width: photoPickerOptionCopyWidth },
                ]}
                numberOfLines={1}
              >
                {takePhotoLabel}
              </Text>
            </View>
            <Text
              allowFontScaling={false}
              style={[
                styles.photoPickerOptionHint,
                { width: photoPickerOptionCopyWidth },
              ]}
              numberOfLines={1}
            >
              {takePhotoHint}
            </Text>
            <View pointerEvents="none" style={styles.photoPickerChevronBox}>
              <ChevronRight size={25} color={APP_BRAND_COLOR} strokeWidth={3} />
            </View>
          </Pressable>

          <Pressable
            onPress={onChooseFromLibrary}
            style={({ pressed }) => [
              styles.photoPickerOptionCard,
              pressed && styles.actionSheetOptionPressed,
            ]}
          >
            <View style={styles.photoPickerOptionMainRow}>
              <View
                style={[
                  styles.photoPickerOptionIcon,
                  styles.actionSheetLibraryIcon,
                ]}
              >
                <ImagePlus size={26} color="#4f46e5" />
              </View>
              <Text
                allowFontScaling={false}
                style={[
                  styles.photoPickerOptionText,
                  { width: photoPickerOptionCopyWidth },
                ]}
                numberOfLines={1}
              >
                {chooseFromLibraryLabel}
              </Text>
            </View>
            <Text
              allowFontScaling={false}
              style={[
                styles.photoPickerOptionHint,
                { width: photoPickerOptionCopyWidth },
              ]}
              numberOfLines={1}
            >
              {chooseFromLibraryHint}
            </Text>
            <View pointerEvents="none" style={styles.photoPickerChevronBox}>
              <ChevronRight size={25} color={APP_BRAND_COLOR} strokeWidth={3} />
            </View>
          </Pressable>
        </View>

        <View style={styles.photoPickerFooterDivider} />

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.photoPickerCancel,
            pressed && styles.actionSheetOptionPressed,
          ]}
        >
          <Text allowFontScaling={false} style={styles.photoPickerCancelText}>
            {cancelLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function CommentActionSheet({
  visible,
  bottomInset,
  copy,
  showRetry,
  showEdit,
  showDelete,
  showReport,
  onClose,
  onDelete,
  onEdit,
  onReport,
  onRetry,
}: CommentActionSheetProps) {
  if (!visible) return null;

  const actionSheetWidth = Math.min(
    Math.max(Dimensions.get('window').width - 48, 300),
    430,
  );
  const actionCopyWidth = Math.max(actionSheetWidth - 188, 116);
  const isReportOnly = showReport && !showRetry && !showEdit && !showDelete;
  const isRetryMenu = showRetry;
  const heroIcon = isRetryMenu ? (
    <RotateCcw size={32} color={APP_BRAND_COLOR} />
  ) : isReportOnly ? (
    <Flag size={32} color="#ef4444" />
  ) : (
    <Pencil size={32} color="#4f5f82" />
  );
  const heroIconStyle = isRetryMenu
    ? styles.commentActionHeroPrimaryIcon
    : isReportOnly
    ? styles.commentActionHeroDangerIcon
    : styles.commentActionHeroNeutralIcon;

  return (
    <View style={styles.actionSheetLayer} pointerEvents="box-none">
      <Pressable style={styles.actionSheetBackdrop} onPress={onClose} />
      <View
        style={[
          styles.commentActionSheetCard,
          { marginBottom: bottomInset, width: actionSheetWidth },
        ]}
      >
        <View style={styles.actionSheetGrabber} />

        <View style={styles.commentActionHero}>
          <View style={[styles.commentActionHeroIcon, heroIconStyle]}>
            {heroIcon}
          </View>
          <View style={styles.commentActionHeroCopy}>
            <Text
              allowFontScaling={false}
              style={styles.commentActionHeroTitle}
              numberOfLines={1}
            >
              {copy.title}
            </Text>
            {copy.message ? (
              <Text
                allowFontScaling={false}
                style={styles.commentActionHeroSubtitle}
                numberOfLines={2}
              >
                {copy.message}
              </Text>
            ) : null}
            {copy.footnote ? (
              <Text
                allowFontScaling={false}
                style={styles.commentActionHeroFootnote}
                numberOfLines={1}
              >
                {copy.footnote}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.commentActionOptionList}>
          {showRetry ? (
            <Pressable
              onPress={onRetry}
              style={({ pressed }) => [
                styles.commentActionOptionCard,
                styles.commentActionPrimaryOptionCard,
                pressed && styles.actionSheetOptionPressed,
              ]}
            >
              <View style={styles.commentActionOptionMainRow}>
                <View
                  style={[
                    styles.commentActionOptionIcon,
                    styles.commentActionPrimaryIcon,
                  ]}
                >
                  <RotateCcw size={26} color={APP_BRAND_COLOR} />
                </View>
                <Text
                  allowFontScaling={false}
                  style={[
                    styles.commentActionPrimaryOptionText,
                    { width: actionCopyWidth },
                  ]}
                  numberOfLines={1}
                >
                  {copy.retry}
                </Text>
              </View>
              <Text
                allowFontScaling={false}
                style={[
                  styles.commentActionOptionHint,
                  { width: actionCopyWidth },
                ]}
                numberOfLines={1}
              >
                {copy.retryHint}
              </Text>
              <View pointerEvents="none" style={styles.commentActionChevronBox}>
                <ChevronRight
                  size={25}
                  color={APP_BRAND_COLOR}
                  strokeWidth={3}
                />
              </View>
            </Pressable>
          ) : null}

          {showEdit ? (
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [
                styles.commentActionOptionCard,
                styles.commentActionNeutralOptionCard,
                pressed && styles.actionSheetOptionPressed,
              ]}
            >
              <View style={styles.commentActionOptionMainRow}>
                <View
                  style={[
                    styles.commentActionOptionIcon,
                    styles.commentActionNeutralIcon,
                  ]}
                >
                  <Pencil size={26} color="#4f5f82" />
                </View>
                <Text
                  allowFontScaling={false}
                  style={[
                    styles.commentActionOptionText,
                    { width: actionCopyWidth },
                  ]}
                  numberOfLines={1}
                >
                  {copy.edit}
                </Text>
              </View>
              <Text
                allowFontScaling={false}
                style={[
                  styles.commentActionOptionHint,
                  { width: actionCopyWidth },
                ]}
                numberOfLines={1}
              >
                {copy.editHint}
              </Text>
              <View pointerEvents="none" style={styles.commentActionChevronBox}>
                <ChevronRight
                  size={25}
                  color={APP_BRAND_COLOR}
                  strokeWidth={3}
                />
              </View>
            </Pressable>
          ) : null}

          {showReport ? (
            <Pressable
              onPress={onReport}
              style={({ pressed }) => [
                styles.commentActionOptionCard,
                styles.commentActionDangerOptionCard,
                pressed && styles.actionSheetOptionPressed,
              ]}
            >
              <View style={styles.commentActionOptionMainRow}>
                <View
                  style={[
                    styles.commentActionOptionIcon,
                    styles.commentActionDangerIcon,
                  ]}
                >
                  <Flag size={26} color="#ef4444" />
                </View>
                <Text
                  allowFontScaling={false}
                  style={[
                    styles.commentActionDangerOptionText,
                    { width: actionCopyWidth },
                  ]}
                  numberOfLines={1}
                >
                  {copy.report}
                </Text>
              </View>
              <Text
                allowFontScaling={false}
                style={[
                  styles.commentActionOptionHint,
                  { width: actionCopyWidth },
                ]}
                numberOfLines={1}
              >
                {copy.reportHint}
              </Text>
              <View pointerEvents="none" style={styles.commentActionChevronBox}>
                <ChevronRight size={25} color="#ef4444" strokeWidth={3} />
              </View>
            </Pressable>
          ) : null}

          {showDelete ? (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [
                styles.commentActionOptionCard,
                styles.commentActionDangerOptionCard,
                pressed && styles.actionSheetOptionPressed,
              ]}
            >
              <View style={styles.commentActionOptionMainRow}>
                <View
                  style={[
                    styles.commentActionOptionIcon,
                    styles.commentActionDangerIcon,
                  ]}
                >
                  <Trash2 size={26} color="#ef4444" />
                </View>
                <Text
                  allowFontScaling={false}
                  style={[
                    styles.commentActionDangerOptionText,
                    { width: actionCopyWidth },
                  ]}
                  numberOfLines={1}
                >
                  {copy.delete}
                </Text>
              </View>
              <Text
                allowFontScaling={false}
                style={[
                  styles.commentActionOptionHint,
                  { width: actionCopyWidth },
                ]}
                numberOfLines={1}
              >
                {copy.deleteHint}
              </Text>
              <View pointerEvents="none" style={styles.commentActionChevronBox}>
                <ChevronRight size={25} color="#ef4444" strokeWidth={3} />
              </View>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.photoPickerFooterDivider} />

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.photoPickerCancel,
            pressed && styles.actionSheetOptionPressed,
          ]}
        >
          <Text allowFontScaling={false} style={styles.photoPickerCancelText}>
            {copy.cancel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ReplyBanner({ replyingTo, snippet, onCancelReply }: ReplyBannerProps) {
  const language = useAppLanguage();
  const copy = COMMENTS_COPY[language];
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (replyingTo) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [replyingTo, slideAnim]);

  if (!replyingTo) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.replyBar,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.replyBarContent}>
        <View style={styles.replyBarIndicator} />
        <View style={styles.replyBarTextWrap}>
          <Text style={styles.replyBarText}>
            {copy.replyingBanner}{' '}
            <Text style={styles.replyBarMention}>
              {getReplyTargetDisplayName(replyingTo, language)}
            </Text>
          </Text>
          {snippet ? (
            <Text style={styles.replyBarSnippet} numberOfLines={1}>
              {snippet}
            </Text>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onCancelReply}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.replyBarClose}
      >
        <X size={16} color="#64748b" />
      </TouchableOpacity>
    </Animated.View>
  );
}

function renderReactionIcon(reaction: ReactionType) {
  let bgColor: string = REACTION_COLOR.like;
  if (reaction === 'love') {
    bgColor = '#f33e58';
  } else if (reaction === 'haha') {
    bgColor = '#f7b125';
  } else if (reaction === 'wow') {
    bgColor = '#f7b125';
  } else if (reaction === 'sad') {
    bgColor = '#f7b125';
  } else if (reaction === 'angry') {
    bgColor = '#e9710f';
  }

  return (
    <View style={[styles.reactionCircle, { backgroundColor: bgColor }]}>
      <Image
        source={REACTION_IMAGES[reaction]}
        style={styles.reactionBadgeImage}
        resizeMode="contain"
      />
    </View>
  );
}

// ── CommentImageViewer ────────────────────────────────────────────────────
//
// A black, full-screen modal that displays a single comment image. Reuses
// the same UX language as `PhotoViewerModal` (close X in the corner, image
// centered on a black bg) but without the multi-image swipe + caption
// overlay, since a comment carries exactly one image at most.

function CommentImageViewer({
  uri,
  onClose,
}: {
  uri: string | null;
  onClose: () => void;
}) {
  if (!uri) return null;
  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.viewerBackdrop} onPress={onClose}>
        <Image
          source={{ uri }}
          style={styles.viewerImage}
          resizeMode="contain"
        />
      </Pressable>
      <TouchableOpacity onPress={onClose} style={styles.viewerClose}>
        <X size={20} color="#fff" />
      </TouchableOpacity>
    </Modal>
  );
}

// ── ReactionPicker ────────────────────────────────────────────────────────
//
// A floating pill of 6 emoji buttons positioned just above the long-pressed
// "Thích" button. Uses an overlay layer with a tap-outside-to-close
// backdrop. The pill is clamped to the screen edges so it never runs off
// the right side near the screen edge.

interface PickerProps {
  anchor: { commentId: string; x: number; y: number } | null;
  onPick: (reaction: ReactionType) => void;
  onDismiss: () => void;
}

function ReactionPicker({ anchor, onPick, onDismiss }: PickerProps) {
  if (!anchor) return null;

  // Clamp X so the pill stays on screen (10 px padding from each edge).
  // Reels is portrait-locked so we can read this once per render safely.
  const screenWidth = Dimensions.get('window').width;
  const minX = 10;
  const maxX = screenWidth - PICKER_PILL_WIDTH - 10;
  const left = Math.max(minX, Math.min(anchor.x - PICKER_PILL_WIDTH / 2, maxX));
  const top = Math.max(
    40,
    anchor.y - PICKER_PILL_HEIGHT - PICKER_GAP_ABOVE_BUTTON,
  );

  return (
    <View style={styles.pickerLayer} pointerEvents="box-none">
      {/* Invisible full-screen backdrop swallows the next tap to dismiss. */}
      <Pressable style={styles.pickerBackdrop} onPress={onDismiss} />
      <CommentSheetReactionPickerSurface
        style={[styles.pickerPill, { left, top }]}
      >
        {FEED_REACTION_TYPES.map(type => (
          <TouchableOpacity
            key={type}
            activeOpacity={0.7}
            onPress={() => onPick(type)}
            style={styles.pickerItem}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Image
              source={REACTION_IMAGES[type]}
              style={styles.pickerReactionImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ))}
      </CommentSheetReactionPickerSurface>
    </View>
  );
}

// ── CommentThread ─────────────────────────────────────────────────────────
//
// Renders a parent comment + its replies (when expanded). Memoized so
// updating one comment's like state doesn't re-render every other thread.

interface ThreadProps {
  comment: ReelComment;
  replies: ReelComment[] | undefined;
  isExpanded: boolean;
  isLoadingReplies: boolean;
  onSetReaction: (commentId: string, reaction: ReactionType) => void;
  onOpenPicker: (commentId: string, anchorX: number, anchorY: number) => void;
  onLongPressRow: (comment: ReelComment) => void;
  onLoadReplies: (commentId: string) => void;
  onCollapseReplies: (commentId: string) => void;
  onStartReply: (
    commentId: string,
    username: string,
    displayName?: string,
    targetCommentId?: string,
  ) => void;
  /** Threaded through to each row so taps on comment images open the viewer. */
  onOpenImage: (uri: string) => void;
  replyingToCommentId?: string | null;
  onPressProfile: (userId: string) => void;
  inlineDeleteCommentId: string | null;
  deletingCommentIds: Set<string>;
  onInlineDelete: (commentId: string) => void;
}

function CommentThreadBase({
  comment,
  replies,
  isExpanded,
  isLoadingReplies,
  onSetReaction,
  onOpenPicker,
  onLongPressRow,
  onLoadReplies,
  onCollapseReplies,
  onStartReply,
  onOpenImage,
  replyingToCommentId,
  onPressProfile,
  inlineDeleteCommentId,
  deletingCommentIds,
  onInlineDelete,
}: ThreadProps) {
  const language = useAppLanguage();
  const copy = COMMENTS_COPY[language];
  const username =
    comment.publisher.username || comment.publisher.name || 'unknown';
  const displayName = getCommentPublisherDisplayName(comment, language);

  const handleReply = useCallback(() => {
    onStartReply(comment.id, username, displayName, comment.id);
  }, [comment.id, displayName, onStartReply, username]);

  const handleToggleReplies = useCallback(() => {
    if (isExpanded) {
      onCollapseReplies(comment.id);
    } else {
      onLoadReplies(comment.id);
    }
  }, [comment.id, isExpanded, onCollapseReplies, onLoadReplies]);

  const visibleReplyCount = replies?.length ?? comment.replyCount;

  return (
    <View style={styles.thread}>
      <CommentRow
        comment={comment}
        depth="parent"
        onSetReaction={onSetReaction}
        onOpenPicker={onOpenPicker}
        onLongPressRow={onLongPressRow}
        onReply={handleReply}
        onOpenImage={onOpenImage}
        isReplyingToThis={replyingToCommentId === comment.id}
        onPressProfile={onPressProfile}
        showInlineDelete={inlineDeleteCommentId === comment.id}
        isDeleting={deletingCommentIds.has(comment.id)}
        onInlineDelete={onInlineDelete}
      />

      {comment.replyCount > 0 || isExpanded ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleToggleReplies}
          style={styles.repliesToggle}
        >
          <View style={styles.repliesToggleLine} />
          <Text style={styles.repliesToggleText}>
            {isExpanded
              ? copy.hideReplies
              : copy.showReplies.replace(
                  '{count}',
                  formatCount(visibleReplyCount),
                )}
          </Text>
          {isLoadingReplies ? (
            <ActivityIndicator
              color="#94a3b8"
              size="small"
              style={styles.repliesToggleSpinner}
            />
          ) : isExpanded ? (
            <ChevronDown size={14} color="#64748b" />
          ) : null}
        </TouchableOpacity>
      ) : null}

      {isExpanded && replies && replies.length > 0 ? (
        <View style={styles.repliesList}>
          {replies.map(reply => (
            <CommentRow
              key={reply.id}
              comment={reply}
              depth="reply"
              onSetReaction={onSetReaction}
              onOpenPicker={onOpenPicker}
              onLongPressRow={onLongPressRow}
              onReply={() =>
                onStartReply(
                  comment.id,
                  reply.publisher.username || reply.publisher.name || 'unknown',
                  getCommentPublisherDisplayName(reply, language),
                  reply.id,
                )
              }
              onOpenImage={onOpenImage}
              isReplyingToThis={replyingToCommentId === reply.id}
              onPressProfile={onPressProfile}
              showInlineDelete={inlineDeleteCommentId === reply.id}
              isDeleting={deletingCommentIds.has(reply.id)}
              onInlineDelete={onInlineDelete}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const CommentThread = memo(CommentThreadBase);

// ── CommentRow ────────────────────────────────────────────────────────────
//
// Facebook-style row: avatar on the left, vertical content on the right.
// Content stack:
//   1. Name + timestamp (above bubble)
//   2. Bubble with text (+ image attachment) (+ reaction count overlay)
//   3. Action row: 👍/[emoji] Thích · Phản hồi
//
// `depth='reply'` shifts the whole row right and shrinks the avatar.

interface RowProps {
  comment: ReelComment;
  depth: 'parent' | 'reply';
  onSetReaction: (commentId: string, reaction: ReactionType) => void;
  onOpenPicker: (commentId: string, anchorX: number, anchorY: number) => void;
  onLongPressRow: (comment: ReelComment) => void;
  onReply: () => void;
  /** Called when the user taps the comment's image — opens the viewer. */
  onOpenImage: (uri: string) => void;
  isReplyingToThis?: boolean;
  onPressProfile: (userId: string) => void;
  showInlineDelete: boolean;
  isDeleting: boolean;
  onInlineDelete: (commentId: string) => void;
}

function CommentRow({
  comment,
  depth,
  onSetReaction,
  onOpenPicker,
  onLongPressRow,
  onReply,
  onOpenImage,
  isReplyingToThis,
  onPressProfile,
  showInlineDelete,
  isDeleting,
  onInlineDelete,
}: RowProps) {
  const language = useAppLanguage();
  const copy = COMMENTS_COPY[language];
  const displayName = getCommentPublisherDisplayName(comment, language);
  const deleteCommentLabel = getDeleteCommentLabel(language);
  const deleteCommentHint = getDeleteCommentHint(language);
  const timeText = formatRelativeTime(comment.postedAt, language);
  const isReply = depth === 'reply';
  const isSending = comment.isSending;
  const isFailed = comment.isFailed;
  const commentImageUri = comment.pendingImageUri ?? comment.imageUrl ?? null;
  const replyMentionParts = useMemo(
    () => splitLeadingReplyMention(comment.text, comment.replyMentionName),
    [comment.replyMentionName, comment.text],
  );
  const commentImageKnownSize = useMemo(
    () => fitCommentImageSize(comment.imageWidth, comment.imageHeight),
    [comment.imageHeight, comment.imageWidth],
  );
  const [commentImageSize, setCommentImageSize] = useState(
    () => commentImageKnownSize,
  );

  useEffect(() => {
    setCommentImageSize(commentImageKnownSize);
  }, [commentImageKnownSize]);

  useEffect(() => {
    if (!commentImageUri || (comment.imageWidth && comment.imageHeight)) return;

    let cancelled = false;
    Image.getSize(
      commentImageUri,
      (width, height) => {
        if (!cancelled) {
          setCommentImageSize(fitCommentImageSize(width, height));
        }
      },
      () => undefined,
    );

    return () => {
      cancelled = true;
    };
  }, [comment.imageHeight, comment.imageWidth, commentImageUri]);

  // Ref + position handler for the "Thích" button — we need its on-screen
  // coords to anchor the picker pill correctly.
  const likeButtonRef = useRef<View>(null);

  const handleLikeTap = useCallback(() => {
    if (isSending || isFailed) return;
    // Default tap = 'like' reaction. The view-model handles the
    // toggle-off logic (re-tapping 'like' clears it).
    onSetReaction(comment.id, 'like');
  }, [comment.id, onSetReaction, isSending, isFailed]);

  const handleLikeLongPress = useCallback(() => {
    if (isSending || isFailed) return;
    // Measure the button's on-screen position so the picker floats above it.
    if (!likeButtonRef.current) {
      // Fallback: open with arbitrary coords (shouldn't happen in practice).
      onOpenPicker(comment.id, 100, 200);
      return;
    }
    likeButtonRef.current.measureInWindow((x, y, width) => {
      // anchor at horizontal centre of the button, vertically at its top
      onOpenPicker(comment.id, x + width / 2, y);
    });
  }, [comment.id, onOpenPicker, isSending, isFailed]);

  const handleRowLongPress = useCallback(() => {
    if (isSending) return;
    onLongPressRow(comment);
  }, [comment, onLongPressRow, isSending]);

  const handleInlineDeletePress = useCallback(() => {
    if (isDeleting) return;
    onInlineDelete(comment.id);
  }, [comment.id, isDeleting, onInlineDelete]);

  // Pick the label / colour for the "Thích" button based on the viewer's
  // current reaction. Defaults to gray "Thích" with a thumbs-up icon.
  const myReaction = comment.myReaction;
  const likeLabel = myReaction
    ? copy[`${myReaction}Reaction` as keyof typeof copy]
    : copy.likeReaction;
  const likeColor = myReaction ? REACTION_COLOR[myReaction] : '#64748b';

  const handleProfilePress = useCallback(() => {
    if (comment.publisher.userId) {
      onPressProfile(comment.publisher.userId);
    }
  }, [comment.publisher.userId, onPressProfile]);

  // Pulse highlight animation when this comment is being replied to
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const deleteAnim = useRef(new Animated.Value(isDeleting ? 1 : 0)).current;
  const inlineDeleteAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isReplyingToThis) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(highlightAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(highlightAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: false,
          }),
        ]),
      ).start();
    } else {
      highlightAnim.setValue(0);
    }
  }, [isReplyingToThis, highlightAnim]);

  useEffect(() => {
    Animated.timing(deleteAnim, {
      toValue: isDeleting ? 1 : 0,
      duration: COMMENT_DELETE_ANIMATION_MS,
      useNativeDriver: true,
    }).start();
  }, [deleteAnim, isDeleting]);

  useEffect(() => {
    if (!showInlineDelete) return;
    inlineDeleteAnim.setValue(0);
    Animated.spring(inlineDeleteAnim, {
      toValue: 1,
      damping: 14,
      stiffness: 220,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [inlineDeleteAnim, showInlineDelete]);

  const bubbleBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange:
      Platform.OS === 'ios'
        ? ['#ffffff', APP_COLORS.brand.soft]
        : ['#f0f2f5', '#e0f2fe'],
  });

  const deleteRowStyle = {
    opacity: deleteAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
    transform: [
      {
        translateX: deleteAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -28],
        }),
      },
      {
        scale: deleteAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.96],
        }),
      },
    ],
  };

  const inlineDeleteStyle = {
    opacity: inlineDeleteAnim,
    transform: [
      {
        translateY: inlineDeleteAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-4, 0],
        }),
      },
      {
        scale: inlineDeleteAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  };

  return (
    <Animated.View
      style={[
        styles.commentRow,
        isReply && styles.commentRowReply,
        deleteRowStyle,
      ]}
      pointerEvents={isDeleting ? 'none' : 'auto'}
    >
      {isReply ? <View style={styles.branchLine} pointerEvents="none" /> : null}
      <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.85}>
        <Image
          source={{ uri: comment.publisher.avatarUrl || AVATAR_FALLBACK }}
          style={isReply ? styles.commentAvatarSmall : styles.commentAvatar}
        />
      </TouchableOpacity>
      <View style={styles.commentBody}>
        {/* Name (long-press here also opens the delete menu when owner) */}
        <Pressable
          onLongPress={handleRowLongPress}
          delayLongPress={350}
          style={({ pressed }) => [
            styles.bubbleWrap,
            pressed && comment.owner && !isSending && !isFailed
              ? styles.bubbleWrapPressed
              : null,
            (isSending || isFailed) && { opacity: 0.6 },
          ]}
        >
          <Animated.View style={[styles.bubble, { backgroundColor: bubbleBg }]}>
            <View style={styles.nameRow}>
              <TouchableOpacity
                onPress={handleProfilePress}
                activeOpacity={0.85}
              >
                <Text style={styles.commentName} numberOfLines={1}>
                  {displayName}
                </Text>
              </TouchableOpacity>
              {comment.publisher.isAdmin ? (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              ) : null}
            </View>
            {comment.text ? (
              <Text style={styles.commentText}>
                {replyMentionParts ? (
                  <>
                    <Text style={styles.commentMentionText}>
                      {replyMentionParts.mention}
                    </Text>
                    {replyMentionParts.rest}
                  </>
                ) : (
                  comment.text
                )}
              </Text>
            ) : null}

            {/* Comment image — prefer the local pending URI while the
                upload is in flight so the bubble shows the picked file
                INSTANTLY, then falls back to the CDN URL the server
                returns. Tap to open in full-screen viewer. */}
            {commentImageUri ? (
              <Pressable
                onPress={() => {
                  onOpenImage(commentImageUri);
                }}
                style={[styles.commentImageWrap, commentImageSize]}
              >
                <Image
                  source={{ uri: commentImageUri }}
                  style={styles.commentImage}
                  resizeMode="contain"
                  onLoad={event => {
                    const { width, height } = event.nativeEvent.source;
                    setCommentImageSize(fitCommentImageSize(width, height));
                  }}
                />
                {/* Subtle loading indicator overlay while uploading */}
                {isSending && comment.pendingImageUri ? (
                  <View style={styles.commentImageOverlay}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                ) : null}
              </Pressable>
            ) : null}
            {comment.pendingAudioUri || comment.audioUrl ? (
              <View style={styles.commentAudioWrap}>
                <AudioPlayer
                  uri={comment.pendingAudioUri ?? comment.audioUrl!}
                  pending={Boolean(isSending && comment.pendingAudioUri)}
                  compact
                />
              </View>
            ) : null}
          </Animated.View>
        </Pressable>

        {/* Action row under the bubble: 1 ngày · Thích · Phản hồi · Khác */}
        {isSending ? (
          <View style={styles.actionRow}>
            <Text style={styles.sendingText}>{copy.sending}</Text>
          </View>
        ) : isFailed ? (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleRowLongPress} activeOpacity={0.7}>
              <Text style={styles.failedText}>{copy.failedSendRetry}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <View style={styles.actionLeft}>
              {timeText ? (
                <>
                  <Text style={styles.actionTime}>{timeText}</Text>
                  <Text style={styles.actionDot}>·</Text>
                </>
              ) : null}

              <Pressable
                ref={likeButtonRef}
                onPress={handleLikeTap}
                onLongPress={handleLikeLongPress}
                delayLongPress={280}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={styles.actionButton}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: likeColor },
                    myReaction ? styles.actionTextActive : null,
                  ]}
                >
                  {likeLabel}
                </Text>
              </Pressable>

              <Text style={styles.actionDot}>·</Text>

              <Pressable
                onPress={onReply}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={styles.actionButton}
              >
                <Text style={styles.actionText}>{copy.replyAction}</Text>
              </Pressable>

              <Text style={styles.actionDot}>·</Text>

              <Pressable
                onPress={handleRowLongPress}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={styles.hiddenActionButton}
              >
                <Text style={styles.hiddenActionText}>{copy.otherAction}</Text>
              </Pressable>
            </View>

            {/* Reaction count overlay aligned on the far right end of the action row */}
            {comment.likeCount > 0 ? (
              <CommentSheetReactionBadgeSurface style={styles.reactionBadge}>
                <Text style={styles.reactionBadgeCount}>
                  {formatCount(comment.likeCount)}
                </Text>
                {renderReactionIcon(comment.myReaction || 'like')}
              </CommentSheetReactionBadgeSurface>
            ) : null}
          </View>
        )}
        {showInlineDelete && comment.owner && !isSending && !isFailed ? (
          <Animated.View style={[styles.inlineDeleteRow, inlineDeleteStyle]}>
            <Pressable
              onPress={handleInlineDeletePress}
              disabled={isDeleting}
              style={({ pressed }) => [
                styles.inlineDeleteButton,
                pressed && styles.inlineDeleteButtonPressed,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.inlineDeleteIcon}>
                <Trash2 size={15} color="#ef4444" />
              </View>
              <View style={styles.inlineDeleteCopy}>
                <Text style={styles.inlineDeleteText}>
                  {deleteCommentLabel}
                </Text>
                <Text style={styles.inlineDeleteHint}>{deleteCommentHint}</Text>
              </View>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
}

export const ReelCommentsSheet = memo(ReelCommentsSheetBase);

const styles = StyleSheet.create({
  inlineRoot: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inlineSheet: {
    flex: 1,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    height: '72%',
    borderTopLeftRadius: Platform.OS === 'ios' ? 30 : 18,
    borderTopRightRadius: Platform.OS === 'ios' ? 30 : 18,
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(248, 250, 252, 0.94)' : '#fff',
    overflow: 'hidden',
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 0,
    borderColor: 'rgba(255, 255, 255, 0.74)',
    shadowColor: '#1f2a44',
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: Platform.OS === 'ios' ? 0.18 : 0,
    shadowRadius: Platform.OS === 'ios' ? 34 : 0,
  },
  grabber: {
    alignSelf: 'center',
    width: Platform.OS === 'ios' ? 40 : 36,
    height: Platform.OS === 'ios' ? 5 : 4,
    borderRadius: 999,
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(15, 23, 42, 0.18)' : '#d1d5db',
    marginTop: Platform.OS === 'ios' ? 10 : 8,
  },
  header: {
    height: Platform.OS === 'ios' ? 56 : 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor:
      Platform.OS === 'ios' ? 'rgba(15, 23, 42, 0.08)' : '#f1f5f9',
    paddingHorizontal: 16,
  },
  headerSide: {
    width: Platform.OS === 'ios' ? 74 : 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCloseSide: {
    alignItems: 'flex-end',
  },
  headerCountBadge: {
    minWidth: 34,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#eef4ff',
  },
  headerCountText: {
    color: '#0872ff',
    fontFamily: FONT_PRIMARY,
    fontSize: 12,
    fontWeight: '800',
    includeFontPadding: false,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#111827',
    fontFamily: FONT_PRIMARY,
    fontSize: 17,
    fontWeight: '700',
    includeFontPadding: false,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  closeButtonSurface: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateBoxInline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  commentsSkeletonList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  commentSkeletonRow: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  commentSkeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    backgroundColor: '#e2e8f0',
  },
  commentSkeletonBody: {
    flex: 1,
    alignItems: 'flex-start',
  },
  commentSkeletonBubble: {
    width: '92%',
    minHeight: 76,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#eef1f5',
  },
  commentSkeletonBubbleShort: {
    width: '78%',
  },
  commentSkeletonName: {
    width: 86,
    height: 11,
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: '#d8dee7',
  },
  commentSkeletonTextWide: {
    width: '88%',
    height: 10,
    borderRadius: 5,
    marginBottom: 8,
    backgroundColor: '#d8dee7',
  },
  commentSkeletonTextShort: {
    width: '58%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d8dee7',
  },
  commentSkeletonMetaRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingTop: 9,
  },
  commentSkeletonMetaShort: {
    width: 38,
    height: 8,
    borderRadius: 4,
    marginRight: 16,
    backgroundColor: '#e2e8f0',
  },
  commentSkeletonMetaMedium: {
    width: 54,
    height: 8,
    borderRadius: 4,
    marginRight: 16,
    backgroundColor: '#e2e8f0',
  },
  stateText: {
    marginTop: 10,
    color: '#64748b',
    fontFamily: FONT_PRIMARY,
    fontSize: 13,
    includeFontPadding: false,
  },
  errorText: {
    color: '#ef4444',
    fontFamily: FONT_PRIMARY,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
    includeFontPadding: false,
  },
  retryButton: {
    borderRadius: 999,
    backgroundColor: APP_BRAND_COLOR,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  retryText: {
    color: '#fff',
    fontFamily: FONT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
    includeFontPadding: false,
  },
  commentsList: {
    flex: 1,
    flexShrink: 1,
  },
  listContent: {
    paddingHorizontal: Platform.OS === 'ios' ? 13 : 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  inlineListContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
  },
  refreshingHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  refreshingHeaderText: {
    marginLeft: 8,
    color: '#64748b',
    fontFamily: FONT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 20,
    paddingBottom: 12,
  },
  inlineEmptyListContent: {
    flexGrow: 1,
  },
  emptyBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  inlineEmptyBox: {
    flexGrow: 1,
    minHeight: 240,
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 48,
  },
  emptyTitle: {
    color: '#111827',
    fontFamily: FONT_PRIMARY,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    marginBottom: 6,
    includeFontPadding: false,
  },
  emptyText: {
    color: '#64748b',
    fontFamily: FONT_PRIMARY,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    includeFontPadding: false,
  },
  footerLoader: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  inlineError: {
    color: '#ef4444',
    fontFamily: FONT_PRIMARY,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
    includeFontPadding: false,
  },

  // Thread wrapper
  thread: {
    marginBottom: 6,
  },

  // ── Comment row ─────────────────────────────────────────────────────
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    position: 'relative',
  },
  // Replies indent right + use a smaller avatar
  commentRowReply: {
    paddingLeft: 44,
    paddingVertical: 4,
  },

  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
  },
  commentAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
  },

  commentBody: {
    flex: 1,
    marginLeft: 8,
  },

  // Curved reply branch line
  branchLine: {
    position: 'absolute',
    left: -22,
    top: -16,
    bottom: '50%',
    width: 18,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderBottomLeftRadius: 10,
    borderColor:
      Platform.OS === 'ios' ? 'rgba(100, 116, 139, 0.28)' : '#cbd5e1',
  },

  // ── Bubble ──────────────────────────────────────────────────────────
  bubbleWrap: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  bubbleWrapPressed: {
    opacity: 0.7,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 0,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#1f2a44',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: Platform.OS === 'ios' ? 0.055 : 0,
    shadowRadius: Platform.OS === 'ios' ? 14 : 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentName: {
    color: '#050505',
    fontSize: 13,
    fontWeight: '700',
  },
  adminBadge: {
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    marginLeft: 6,
    alignSelf: 'center',
  },
  adminBadgeText: {
    color: APP_BRAND_COLOR,
    fontSize: 10,
    fontWeight: '700',
  },
  commentText: {
    color: '#050505',
    fontSize: 14,
    lineHeight: 19,
  },
  commentMentionText: {
    color: APP_BRAND_COLOR,
    fontWeight: '700',
  },
  commentImageWrap: {
    marginTop: 6,
    width: COMMENT_IMAGE_FALLBACK_WIDTH,
    height: COMMENT_IMAGE_FALLBACK_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  commentImage: {
    width: '100%',
    height: '100%',
  },
  commentImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAudioWrap: {
    marginTop: 6,
    minWidth: 210,
  },

  // Reaction count badge - positioned in action row
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#fff',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.8)' : '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.08,
    shadowRadius: Platform.OS === 'ios' ? 8 : 2,
    elevation: 2,
  },
  reactionBadgeCount: {
    color: '#65676b',
    fontSize: 11,
    fontWeight: '700',
  },
  reactionCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    overflow: 'hidden',
  },
  reactionBadgeImage: {
    width: 16,
    height: 16,
  },

  // ── Action row ──────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingLeft: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  hiddenActionButton: {
    display: 'none',
  },
  hiddenActionText: {
    display: 'none',
  },
  actionEmoji: {
    fontSize: 14,
    marginRight: 3,
  },
  actionText: {
    color: '#65676b',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  actionTextActive: {
    fontWeight: '800',
  },
  actionDot: {
    display: 'none',
    color: '#65676b',
    marginHorizontal: 6,
    fontSize: 12,
  },
  actionTime: {
    color: '#65676b',
    fontSize: 12,
  },
  inlineDeleteRow: {
    alignSelf: 'flex-start',
    marginLeft: 10,
    marginTop: 8,
    maxWidth: 250,
  },
  inlineDeleteButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#fff7f7',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#fecdd3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  inlineDeleteButtonPressed: {
    opacity: 0.72,
  },
  inlineDeleteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffe4e6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  inlineDeleteCopy: {
    flex: 1,
    minWidth: 0,
  },
  inlineDeleteText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
  },
  inlineDeleteHint: {
    color: '#9f1239',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  sendingText: {
    color: '#65676b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  failedText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Replies toggle ──────────────────────────────────────────────────
  repliesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 56,
    marginTop: 2,
    marginBottom: 4,
  },
  repliesToggleLine: {
    width: 18,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: '#d1d5db',
    marginRight: 8,
  },
  repliesToggleText: {
    color: '#65676b',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  repliesToggleSpinner: {
    marginLeft: 2,
  },

  repliesList: {},

  // ── Reply mode banner ───────────────────────────────────────────────
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(248, 250, 252, 0.92)' : '#f8fafc',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  replyBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBarIndicator: {
    width: 3,
    height: 24,
    backgroundColor: APP_BRAND_COLOR,
    borderRadius: 1.5,
    marginRight: 10,
  },
  replyBarTextWrap: {
    flex: 1,
  },
  replyBarText: {
    color: '#475569',
    fontFamily: FONT_PRIMARY,
    fontSize: 12,
    fontWeight: '500',
    includeFontPadding: false,
  },
  replyBarMention: {
    color: APP_BRAND_COLOR,
    fontWeight: '700',
  },
  replyBarSnippet: {
    color: '#94a3b8',
    fontFamily: FONT_PRIMARY,
    fontSize: 11,
    marginTop: 2,
    includeFontPadding: false,
  },
  replyBarClose: {
    padding: 4,
    borderRadius: 12,
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.72)' : '#f1f5f9',
    marginLeft: 8,
  },

  // ── Input bar ───────────────────────────────────────────────────────
  inputBar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor:
      Platform.OS === 'ios' ? 'rgba(15, 23, 42, 0.08)' : '#e5e7eb',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#fff',
    overflow: 'hidden',
  },
  composerPrimaryRow: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputSurface: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    maxHeight: 90,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#f1f5f9',
    fontFamily: FONT_PRIMARY,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    color: '#111827',
    fontSize: 14,
    includeFontPadding: false,
  },
  inputLauncher: {
    minHeight: 40,
    flex: 1,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inputLauncherText: {
    color: '#111827',
    fontFamily: FONT_PRIMARY,
    fontSize: 14,
    includeFontPadding: false,
  },
  inputLauncherPlaceholder: {
    color: '#94a3b8',
    fontFamily: FONT_PRIMARY,
    fontSize: 14,
    includeFontPadding: false,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 8,
    backgroundColor: APP_BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.42,
  },

  // ── Image picker button + preview ───────────────────────────────────
  imageButton: {
    width: 38,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  pendingImageRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(248, 250, 252, 0.86)' : '#fff',
  },
  pendingImageWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    position: 'relative',
  },
  pendingImageThumb: {
    width: '100%',
    height: '100%',
  },
  pendingImageRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingAudioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(248, 250, 252, 0.86)' : '#fff',
  },
  pendingAudioBody: {
    flex: 1,
  },
  pendingAudioName: {
    marginBottom: 5,
    color: '#475569',
    fontFamily: FONT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
  },
  pendingAudioRemove: {
    width: 30,
    height: 30,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.72)' : '#f1f5f9',
  },

  // ── Image viewer modal ──────────────────────────────────────────────
  recordingRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(254, 242, 242, 0.9)' : '#fef2f2',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#fecaca',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    backgroundColor: '#ef4444',
  },
  recordingText: {
    color: APP_COLORS.status.destructive,
    fontFamily: FONT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
    includeFontPadding: false,
  },
  recordingBody: {
    flex: 1,
    height: 39,
  },
  recordingCancel: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.76)' : '#fff',
  },
  recordingStop: {
    width: 32,
    height: 32,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#dc2626',
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '80%',
  },
  viewerClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Comment action popup
  actionSheetLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    zIndex: 10000,
  },
  actionSheetBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },
  actionSheetCard: {
    marginHorizontal: 18,
    marginBottom: Platform.OS === 'ios' ? 14 : 56,
    alignSelf: 'stretch',
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 18,
  },
  actionSheetGrabber: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    marginBottom: 12,
  },
  actionSheetHeader: {
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  actionSheetTitle: {
    color: '#0f172a',
    fontFamily: FONT_PRIMARY,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  actionSheetMessage: {
    color: '#334155',
    fontFamily: FONT_PRIMARY,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
    includeFontPadding: false,
  },
  actionSheetFootnote: {
    color: '#94a3b8',
    fontFamily: FONT_PRIMARY,
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
    includeFontPadding: false,
  },
  actionSheetOption: {
    minHeight: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 14,
    marginTop: 8,
  },
  actionSheetNeutralOption: {
    backgroundColor: '#f8fafc',
  },
  actionSheetPrimaryOption: {
    backgroundColor: '#eef6ff',
  },
  actionSheetDangerOption: {
    backgroundColor: '#fff1f2',
  },
  actionSheetOptionPressed: {
    opacity: 0.72,
  },
  photoPickerCard: {
    alignSelf: 'center',
    borderRadius: 30,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.2,
    shadowRadius: 34,
    elevation: 22,
  },
  photoPickerHero: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingTop: 18,
    paddingBottom: 22,
  },
  photoPickerHeroIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.brand.soft,
    marginRight: 14,
    flexShrink: 0,
  },
  photoPickerHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  photoPickerTitle: {
    color: '#0f172a',
    fontFamily: FONT_PRIMARY,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    includeFontPadding: false,
  },
  photoPickerSubtitle: {
    color: '#6b7280',
    fontFamily: FONT_PRIMARY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 2,
    includeFontPadding: false,
  },
  photoPickerOptionRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 22,
  },
  photoPickerOptionCard: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: '#e1e7f0',
    backgroundColor: '#ffffff',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingRight: 50,
    paddingVertical: 14,
    marginTop: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPickerOptionMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  photoPickerOptionIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  photoPickerOptionText: {
    color: '#0f172a',
    fontFamily: FONT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'left',
    includeFontPadding: false,
  },
  photoPickerOptionHint: {
    color: '#6b7280',
    fontFamily: FONT_PRIMARY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 68,
    includeFontPadding: false,
  },
  photoPickerChevronBox: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerFooterDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#dbe2ec',
    marginBottom: 16,
  },
  photoPickerCancel: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#eef3fb',
    borderRadius: 999,
    backgroundColor: '#f6f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  photoPickerCancelText: {
    color: APP_BRAND_COLOR,
    fontFamily: FONT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  commentActionSheetCard: {
    alignSelf: 'center',
    borderRadius: 30,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.2,
    shadowRadius: 34,
    elevation: 22,
  },
  commentActionHero: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingTop: 18,
    paddingBottom: 22,
  },
  commentActionHeroIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  commentActionHeroPrimaryIcon: {
    backgroundColor: APP_COLORS.brand.soft,
  },
  commentActionHeroNeutralIcon: {
    backgroundColor: APP_COLORS.brand.soft,
  },
  commentActionHeroDangerIcon: {
    backgroundColor: '#fff1f2',
  },
  commentActionHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  commentActionHeroTitle: {
    color: '#0f172a',
    fontFamily: FONT_PRIMARY,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    includeFontPadding: false,
  },
  commentActionHeroSubtitle: {
    color: '#6b7280',
    fontFamily: FONT_PRIMARY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 2,
    includeFontPadding: false,
  },
  commentActionHeroFootnote: {
    color: '#94a3b8',
    fontFamily: FONT_PRIMARY,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 4,
    includeFontPadding: false,
  },
  commentActionOptionList: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 22,
  },
  commentActionOptionCard: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1.2,
    backgroundColor: '#ffffff',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingRight: 50,
    paddingVertical: 14,
    marginTop: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  commentActionPrimaryOptionCard: {
    borderColor: APP_COLORS.brand.border,
  },
  commentActionNeutralOptionCard: {
    borderColor: '#e1e7f0',
  },
  commentActionDangerOptionCard: {
    borderColor: '#fecdd3',
  },
  commentActionOptionMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  commentActionOptionIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  commentActionOptionText: {
    color: '#0f172a',
    fontFamily: FONT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'left',
    includeFontPadding: false,
  },
  commentActionPrimaryOptionText: {
    color: APP_BRAND_COLOR,
    fontFamily: FONT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'left',
    includeFontPadding: false,
  },
  commentActionDangerOptionText: {
    color: '#dc2626',
    fontFamily: FONT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'left',
    includeFontPadding: false,
  },
  commentActionOptionHint: {
    color: '#6b7280',
    fontFamily: FONT_PRIMARY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 68,
    includeFontPadding: false,
  },
  commentActionChevronBox: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentActionGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  commentActionTile: {
    minWidth: 92,
    minHeight: 78,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  commentActionNeutralTile: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  commentActionPrimaryTile: {
    backgroundColor: APP_COLORS.brand.soft,
    borderColor: APP_COLORS.brand.border,
  },
  commentActionDangerTile: {
    backgroundColor: '#fff7f8',
    borderColor: '#fecdd3',
  },
  commentActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  commentActionNeutralIcon: {
    backgroundColor: APP_COLORS.brand.soft,
  },
  commentActionPrimaryIcon: {
    backgroundColor: APP_COLORS.brand.softPressed,
  },
  commentActionDangerIcon: {
    backgroundColor: '#ffe4e6',
  },
  commentActionPrimaryText: {
    color: APP_BRAND_COLOR,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  commentActionText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  commentActionDangerText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionSheetIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  actionSheetPhotoIcon: {
    backgroundColor: APP_COLORS.brand.soft,
  },
  actionSheetLibraryIcon: {
    backgroundColor: APP_COLORS.brand.soft,
  },
  actionSheetPrimaryIcon: {
    backgroundColor: APP_COLORS.brand.softPressed,
  },
  actionSheetDangerIcon: {
    backgroundColor: '#ffe4e6',
  },
  actionSheetPrimaryText: {
    flex: 1,
    color: APP_BRAND_COLOR,
    fontSize: 15,
    fontWeight: '800',
  },
  actionSheetDangerText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '800',
  },
  actionSheetOptionText: {
    flex: 1,
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '800',
  },
  actionSheetCancel: {
    minHeight: 46,
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    backgroundColor: '#f1f5f9',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  actionSheetCancelText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  // ── Reaction picker ─────────────────────────────────────────────────
  pickerLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  pickerBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'transparent',
  },
  pickerPill: {
    position: 'absolute',
    width: Platform.OS === 'android' ? 300 : PICKER_PILL_WIDTH,
    height: Platform.OS === 'android' ? 48 : PICKER_PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#fff',
    borderRadius: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === 'ios' ? 0.2 : 0.18,
    shadowRadius: Platform.OS === 'ios' ? 16 : 10,
    elevation: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor:
      Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.82)' : '#e5e7eb',
  },
  pickerItem: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerReactionImage: {
    width: 32,
    height: 32,
  },
});
