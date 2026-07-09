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

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  type KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  ChevronDown,
  Flag,
  Heart,
  ImagePlus,
  Mic,
  Music2,
  Pencil,
  RotateCcw,
  SendHorizonal,
  Square,
  ThumbsUp,
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
import { ALL_REACTION_TYPES } from '../../domain/types/reels.types';
import {
  formatAudioDuration,
  pickSupportedAudioFile,
} from '../../../shared-kernel/application/utils/audioFiles';
import { useWavAudioRecorder } from '../../../shared-kernel/application/hooks/useWavAudioRecorder';
import { AudioPlayer } from '../../../shared-kernel/presentation/components/AudioPlayer';
import { AudioWaveform } from '../../../shared-kernel/presentation/components/AudioWaveform';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import {
  CommentSheetComposerDock,
  CommentSheetComposerInputSurface,
  CommentSheetControlSurface,
  CommentSheetHeaderBadge,
  CommentSheetReactionBadgeSurface,
  CommentSheetReactionPickerSurface,
} from './CommentSheetChrome';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';

const AVATAR_FALLBACK = 'https://v2.vnseea.vn/upload/photos/d-avatar.jpg';

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
    pickPhotoMsg: 'Bạn muốn chụp ảnh mới hay chọn ảnh từ thư viện?',
    takePhoto: 'Chụp ảnh',
    chooseFromLibrary: 'Chọn từ thư viện',
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
    pickPhotoMsg: 'Do you want to take a new photo or select from the library?',
    takePhoto: 'Take photo',
    chooseFromLibrary: 'Choose from library',
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
  return language === 'en' ? 'Report comment' : 'B\u00e1o c\u00e1o b\u00ecnh lu\u1eadn';
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

const REACTION_EMOJI: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};

const REACTION_COLOR: Record<ReactionType, string> = {
  like: '#0866ff',
  love: '#f33e58',
  haha: '#f7b125',
  wow: '#f7b125',
  sad: '#f7b125',
  angry: '#e9710f',
};

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
const SHEET_OPEN_SPRING = {
  damping: 20,
  stiffness: 210,
  mass: 0.85,
};
const SHEET_CLOSE_DURATION_MS = 170;

interface Props {
  visible: boolean;
  comments: ReelComment[];
  commentCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Reply state
  repliesById: Record<string, ReelComment[]>;
  loadingRepliesIds: string[];
  replyingTo: { commentId: string; username: string } | null;

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
  ) => Promise<ReelComment | null>;
  onSetReaction: (commentId: string, reaction: ReactionType) => void;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, text: string) => void;
  onLoadReplies: (commentId: string) => void;
  onCollapseReplies: (commentId: string) => void;
  onStartReply: (commentId: string, username: string) => void;
  onCancelReply: () => void;
  onRetryFailedComment: (comment: ReelComment) => void;
  onDeleteFailedComment: (comment: ReelComment) => void;
  sheetHeight?: string | number;
}

function formatCount(count: number) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
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
  comments,
  commentCount,
  isLoading,
  isLoadingMore,
  isSubmitting: _isSubmitting,
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
  sheetHeight = '72%',
}: Props) {
  const language = useAppLanguage();
  const copy = COMMENTS_COPY[language];
  const navigation = useNavigation<any>();
  const isScreenFocused = useIsFocused();
  const screenHeight = Dimensions.get('window').height;

  const handlePressProfile = useCallback((userId: string) => {
    navigateToUserProfile(navigation, userId);
  }, [navigation]);
  const insets = useSafeAreaInsets();
  const bottomSafeInset = Math.max(insets.bottom, Platform.OS === 'android' ? 18 : 10);
  const actionSheetBottomInset =
    Platform.OS === 'android'
      ? insets.bottom > 0
        ? Math.max(insets.bottom + 12, 28)
        : 14
      : Math.max(insets.bottom, 14);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isKeyboardVisible = keyboardHeight > 0;
  const sheetBottomPadding =
    Platform.OS === 'ios' || isKeyboardVisible ? 0 : bottomSafeInset;
  const composerBottomPadding = isKeyboardVisible ? 6 : bottomSafeInset;
  const wavRecorder = useWavAudioRecorder();
  const {
    isRecording: isWavRecording,
    durationMs: wavDurationMs,
    startRecording: startWavRecording,
    stopRecording: stopWavRecording,
    cancelRecording: cancelWavRecording,
  } = wavRecorder;
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);
  const commentsListRef = useRef<FlatList<ReelComment>>(null);
  const autoScrollToEndUntilRef = useRef(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleKeyboardShow = (event: KeyboardEvent) => {
      setKeyboardHeight(Math.max(0, event.endCoordinates?.height ?? 0));
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [replyingTo]);

  // Image picked by the user for the next comment / reply. Local file://
  // URI; uploaded via multipart when `onSubmit` fires. Cleared after
  // submit or by tapping the X on the preview thumbnail.
  const [pendingImage, setPendingImage] =
    useState<CommentImageAttachment | null>(null);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [actionMenuComment, setActionMenuComment] = useState<ReelComment | null>(null);
  const [inlineDeleteCommentId, setInlineDeleteCommentId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<ReelComment | null>(null);
  const [deletingCommentIds, setDeletingCommentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingAudio, setPendingAudio] =
    useState<CommentAudioAttachment | null>(null);

  useEffect(() => {
    if (!editingComment || !inputRef.current) return;
    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  }, [editingComment]);

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
      setKeyboardHeight(0);
    }
  }, [cancelWavRecording, visible]);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setIsMounted(true);
      openProgress.stopAnimation();
      panY.stopAnimation();
      openProgress.setValue(0);
      panY.setValue(0);
      Animated.spring(openProgress, {
        toValue: 1,
        ...SHEET_OPEN_SPRING,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (isClosingRef.current) {
      setIsMounted(false);
      isClosingRef.current = false;
      return;
    }

    Animated.timing(openProgress, {
      toValue: 0,
      duration: SHEET_CLOSE_DURATION_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [openProgress, panY, visible]);

  const dragBackdropOpacity = panY.interpolate({
    inputRange: [0, 120, 360],
    outputRange: [1, 0.42, 0],
    extrapolate: 'clamp',
  });

  const backdropOpacity = Animated.multiply(
    openProgress,
    dragBackdropOpacity,
  );

  const sheetTranslateY = Animated.add(
    openProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [screenHeight, 0],
    }),
    panY
  );

  const sheetScale = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
  });

  const handleRequestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(openProgress, {
        toValue: 0,
        duration: SHEET_CLOSE_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(panY, {
        toValue: 0,
        duration: SHEET_CLOSE_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setScrollEnabled(true);
      onClose();
    });
  }, [onClose, openProgress, panY]);

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
    (commentId: string, username: string) => {
      handleCancelEdit();
      onStartReply(commentId, username);
    },
    [handleCancelEdit, onStartReply],
  );

  const handleSubmit = useCallback(() => {
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

    if (replyingTo) {
      onSubmitReply(replyingTo.commentId, trimmed, image);
      onCancelReply();
    } else {
      onSubmit(trimmed, image, audio);
      scheduleCommentsAutoScrollToEnd();
    }
  }, [
    draft,
    editingComment,
    onEdit,
    pendingImage,
    pendingAudio,
    onSubmit,
    onSubmitReply,
    replyingTo,
    onCancelReply,
    scheduleCommentsAutoScrollToEnd,
  ]);

  const handlePickAudio = useCallback(async () => {
    try {
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
      if (isWavRecording) {
        const audio = await stopWavRecording();
        if (audio) {
          setPendingImage(null);
          setPendingAudio(audio);
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
  }, [isWavRecording, startWavRecording, stopWavRecording, copy]);

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
        Alert.alert(copy.errorTitle, result.errorMessage ?? copy.errorActionMsg);
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
    setPhotoPickerVisible(true);
  }, []);

  const handleLongPressRow = useCallback(
    (comment: ReelComment) => {
      if (comment.isSending) return;
      if (comment.isFailed) {
        setActionMenuComment(comment);
        return;
      }
      if (comment.owner) {
        setActionMenuComment(null);
        setInlineDeleteCommentId(current =>
          current === comment.id ? null : comment.id,
        );
        return;
      }
      if (!comment.owner) return;
      Alert.alert(
        copy.yourCommentTitle,
        comment.text.length > 60
          ? comment.text.slice(0, 60) + '…'
          : comment.text,
        [
          { text: copy.cancel, style: 'cancel' },
          {
            text: getDeleteCommentLabel(language),
            style: 'destructive',
            onPress: () => onDelete(comment.id),
          },
        ],
      );
    },
    [onDelete, onDeleteFailedComment, onRetryFailedComment, copy, language],
  );

  const handleInlineDeleteComment = useCallback((commentId: string) => {
    setInlineDeleteCommentId(current => (current === commentId ? null : current));
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
  }, [onDelete]);

  const handleCommentLongPress = useCallback((comment: ReelComment) => {
    if (comment.isSending) return;
    Keyboard.dismiss();
    setInlineDeleteCommentId(null);
    setActionMenuComment(comment);
  }, []);

  const handleCloseActionMenu = useCallback(() => {
    setActionMenuComment(null);
  }, []);

  const handleConfirmDeleteComment = useCallback((comment: ReelComment) => {
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
  }, [copy.cancel, handleInlineDeleteComment, language]);

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
    Alert.alert(
      getReportSentTitle(language),
      getReportSentMessage(language),
    );
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

  const actionMenuFootnote = actionMenuIsFailed
    ? actionMenuPreview
    : '';
  const deleteCommentLabel = language === 'en' ? 'Delete' : 'X\u00f3a';
  const editCommentLabel = language === 'en' ? 'Edit' : 'Ch\u1ec9nh s\u1eeda';
  const reportCommentLabel = language === 'en' ? 'Report' : 'B\u00e1o c\u00e1o';

  const actionMenuCopy = useMemo(
    () => ({
      cancel: copy.cancel,
      delete: deleteCommentLabel,
      edit: editCommentLabel,
      footnote: actionMenuFootnote,
      message: actionMenuMessage,
      report: reportCommentLabel,
      retry: copy.retry,
      title: actionMenuTitle,
    }),
    [
      actionMenuFootnote,
      actionMenuMessage,
      actionMenuTitle,
      copy.cancel,
      copy.retry,
      deleteCommentLabel,
      editCommentLabel,
      reportCommentLabel,
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
          replyingToCommentId={replyingTo?.commentId}
          onPressProfile={handlePressProfile}
          inlineDeleteCommentId={null}
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
    let found = comments.find(c => c.id === replyingTo.commentId);
    if (!found) {
      for (const key in repliesById) {
        const match = repliesById[key]?.find(c => c.id === replyingTo.commentId);
        if (match) {
          found = match;
          break;
        }
      }
    }
    return found?.text || '';
  }, [replyingTo, comments, repliesById]);

  return (
    <Modal
      visible={isMounted && isScreenFocused}
      transparent
      animationType="none"
      statusBarTranslucent
      hardwareAccelerated
      presentationStyle="overFullScreen"
      onRequestClose={handleRequestClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        <Pressable style={styles.backdropPressable} onPress={handleRequestClose}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight as ViewStyle['height'],
              paddingBottom: sheetBottomPadding,
              transform: [
                { translateY: sheetTranslateY },
                { scale: sheetScale },
              ],
            },
          ]}
          onTouchStart={(e) => {
            touchStartY.current = e.nativeEvent.pageY;
            isDraggingSheet.current = false;
          }}
          onTouchMove={(e) => {
            const currentY = e.nativeEvent.pageY;
            const dy = currentY - touchStartY.current;

            if (dy > 5 && listScrollOffset.current <= 0) {
              if (!isDraggingSheet.current) {
                isDraggingSheet.current = true;
                setScrollEnabled(false);
              }
              panY.setValue(dy);
            }
          }}
          onTouchEnd={(e) => {
            if (isDraggingSheet.current) {
              const currentY = e.nativeEvent.pageY;
              const dy = currentY - touchStartY.current;

              if (dy > 120) {
                isClosingRef.current = true;
                Animated.timing(panY, {
                  toValue: screenHeight,
                  duration: SHEET_CLOSE_DURATION_MS,
                  useNativeDriver: true,
                }).start(() => {
                  setScrollEnabled(true);
                  onClose();
                });
              } else {
                Animated.spring(panY, {
                  toValue: 0,
                  useNativeDriver: true,
                }).start(() => {
                  setScrollEnabled(true);
                });
              }
              isDraggingSheet.current = false;
            }
          }}
          onTouchCancel={() => {
            if (isDraggingSheet.current) {
              Animated.spring(panY, {
                toValue: 0,
                useNativeDriver: true,
              }).start(() => {
                setScrollEnabled(true);
              });
              isDraggingSheet.current = false;
            }
          }}
        >
          <View>
            <View style={styles.grabber} />

            <View style={styles.header}>
              <View style={styles.headerSide}>
                {headerCountLabel ? (
                  <CommentSheetHeaderBadge style={styles.headerCountBadge}>
                    <Text style={styles.headerCountText}>{headerCountLabel}</Text>
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
                  <CommentSheetControlSurface style={styles.closeButtonSurface}>
                    <X size={20} color="#111827" />
                  </CommentSheetControlSurface>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#0866ff" size="small" />
              <Text style={styles.stateText}>{copy.loadingComments}</Text>
            </View>
          ) : error && comments.length === 0 ? (
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
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              scrollEnabled={scrollEnabled}
              initialNumToRender={10}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={40}
              windowSize={7}
              removeClippedSubviews={false}
              onContentSizeChange={handleCommentsContentSizeChange}
              contentContainerStyle={[
                styles.listContent,
                comments.length === 0 ? styles.emptyListContent : null,
              ]}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.6}
              onScroll={handleListScroll}
              scrollEventThrottle={16}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>{copy.noCommentsTitle}</Text>
                  <Text style={styles.emptyText}>
                    {copy.noCommentsDesc}
                  </Text>
                </View>
              }
              ListFooterComponent={
                isLoadingMore ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator color="#0866ff" size="small" />
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
                  {copy.recordingText.replace('{duration}', formatAudioDuration(wavDurationMs))}
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

          <CommentSheetComposerDock style={[styles.inputBar, { paddingBottom: composerBottomPadding }]}>
            {/* Image picker button — leftmost in the row, mirrors FB layout */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePickImage}
              disabled={Boolean(editingComment)}
              style={styles.imageButton}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <ImagePlus size={22} color={editingComment ? '#cbd5e1' : '#1877f2'} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePickAudio}
              disabled={Boolean(editingComment || replyingTo || isWavRecording)}
              style={styles.imageButton}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Music2
                size={21}
                color={editingComment || replyingTo || isWavRecording ? '#cbd5e1' : '#ec4899'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleToggleAudioRecording}
              disabled={Boolean(editingComment || replyingTo || isWavRecording)}
              style={styles.imageButton}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              {isWavRecording ? (
                <Square size={17} color="#dc2626" fill="#dc2626" />
              ) : (
                <Mic size={21} color={editingComment || replyingTo || isWavRecording ? '#cbd5e1' : '#dc2626'} />
              )}
            </TouchableOpacity>

            <CommentSheetComposerInputSurface style={styles.inputSurface}>
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                placeholder={
                  editingComment
                    ? getEditCommentLabel(language)
                    : replyingTo
                    ? copy.replyingPlaceholder.replace('{username}', replyingTo.username)
                    : copy.addCommentPlaceholder
                }
                placeholderTextColor="#94a3b8"
                style={styles.input}
                multiline
                maxLength={500}
                editable={!isWavRecording}
              />
            </CommentSheetComposerInputSurface>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmit}
              // Enable submit if EITHER text or an image is provided —
              // matches the backend's "text OR image required" rule.
              disabled={
                isWavRecording ||
                (editingComment
                  ? !draft.trim()
                  : !draft.trim() && !pendingImage && !pendingAudio)
              }
              style={[
                styles.sendButton,
                isWavRecording ||
                (editingComment
                  ? !draft.trim()
                  : !draft.trim() && !pendingImage && !pendingAudio)
                  ? styles.sendButtonDisabled
                  : null,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <SendHorizonal size={18} color="#fff" />
            </TouchableOpacity>
          </CommentSheetComposerDock>
        </Animated.View>
      </KeyboardAvoidingView>

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
        takePhotoLabel={copy.takePhoto}
        chooseFromLibraryLabel={copy.chooseFromLibrary}
        cancelLabel={copy.cancel}
        onClose={() => setPhotoPickerVisible(false)}
        onTakePhoto={async () => {
          setPhotoPickerVisible(false);
          const result = await launchCamera({
            mediaType: 'photo' as MediaType,
            quality: 0.8,
            saveToPhotos: false,
            includeBase64: false,
          });
          handleImagePickerResult(result);
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
        }}
      />
    </Modal>
  );
}

interface ReplyBannerProps {
  replyingTo: { commentId: string; username: string } | null;
  snippet: string;
  onCancelReply: () => void;
}

interface CommentActionSheetProps {
  visible: boolean;
  bottomInset: number;
  copy: {
    cancel: string;
    delete: string;
    edit: string;
    footnote: string;
    message: string;
    report: string;
    retry: string;
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
  takePhotoLabel: string;
  chooseFromLibraryLabel: string;
  cancelLabel: string;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
}

function CommentPhotoPickerSheet({
  visible,
  bottomInset,
  title,
  takePhotoLabel,
  chooseFromLibraryLabel,
  cancelLabel,
  onClose,
  onTakePhoto,
  onChooseFromLibrary,
}: CommentPhotoPickerSheetProps) {
  if (!visible) return null;

  return (
    <View style={styles.actionSheetLayer} pointerEvents="box-none">
      <Pressable style={styles.actionSheetBackdrop} onPress={onClose} />
      <View style={[styles.actionSheetCard, { marginBottom: bottomInset }]}>
        <View style={styles.actionSheetGrabber} />
        <View style={styles.actionSheetHeader}>
          <Text style={styles.actionSheetTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <Pressable
          onPress={onTakePhoto}
          style={({ pressed }) => [
            styles.actionSheetOption,
            styles.actionSheetNeutralOption,
            pressed && styles.actionSheetOptionPressed,
          ]}
        >
          <View style={[styles.actionSheetIcon, styles.actionSheetPhotoIcon]}>
            <Camera size={18} color="#2563eb" />
          </View>
          <Text style={styles.actionSheetOptionText} numberOfLines={1}>
            {takePhotoLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={onChooseFromLibrary}
          style={({ pressed }) => [
            styles.actionSheetOption,
            styles.actionSheetNeutralOption,
            pressed && styles.actionSheetOptionPressed,
          ]}
        >
          <View style={[styles.actionSheetIcon, styles.actionSheetLibraryIcon]}>
            <ImagePlus size={18} color="#4f46e5" />
          </View>
          <Text style={styles.actionSheetOptionText} numberOfLines={1}>
            {chooseFromLibraryLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.actionSheetCancel,
            pressed && styles.actionSheetOptionPressed,
          ]}
        >
          <Text style={styles.actionSheetCancelText}>{cancelLabel}</Text>
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

  return (
    <View style={styles.actionSheetLayer} pointerEvents="box-none">
      <Pressable style={styles.actionSheetBackdrop} onPress={onClose} />
      <View style={[styles.actionSheetCard, { marginBottom: bottomInset }]}>
        <View style={styles.actionSheetGrabber} />
        <View style={styles.actionSheetHeader}>
          <Text style={styles.actionSheetTitle} numberOfLines={1}>
            {copy.title}
          </Text>
          {copy.message ? (
            <Text style={styles.actionSheetMessage} numberOfLines={2}>
              {copy.message}
            </Text>
          ) : null}
          {copy.footnote ? (
            <Text style={styles.actionSheetFootnote} numberOfLines={1}>
              {copy.footnote}
            </Text>
          ) : null}
        </View>

        <View style={styles.commentActionGrid}>
          {showRetry ? (
            <Pressable
              onPress={onRetry}
              style={({ pressed }) => [
                styles.commentActionTile,
                styles.commentActionPrimaryTile,
                pressed && styles.actionSheetOptionPressed,
              ]}
            >
              <View style={[styles.commentActionIcon, styles.commentActionPrimaryIcon]}>
                <RotateCcw size={24} color="#0866ff" />
              </View>
              <Text style={styles.commentActionPrimaryText} numberOfLines={1}>
                {copy.retry}
              </Text>
            </Pressable>
          ) : null}

          {showEdit ? (
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [
                styles.commentActionTile,
                styles.commentActionNeutralTile,
                pressed && styles.actionSheetOptionPressed,
              ]}
            >
              <View style={[styles.commentActionIcon, styles.commentActionNeutralIcon]}>
                <Pencil size={24} color="#4f5f82" />
              </View>
              <Text style={styles.commentActionText} numberOfLines={1}>
                {copy.edit}
              </Text>
            </Pressable>
          ) : null}

          {showReport ? (
            <Pressable
              onPress={onReport}
              style={({ pressed }) => [
                styles.commentActionTile,
                styles.commentActionDangerTile,
                pressed && styles.actionSheetOptionPressed,
              ]}
            >
              <View style={[styles.commentActionIcon, styles.commentActionDangerIcon]}>
                <Flag size={24} color="#ef4444" />
              </View>
              <Text style={styles.commentActionDangerText} numberOfLines={1}>
                {copy.report}
              </Text>
            </Pressable>
          ) : null}

          {showDelete ? (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [
                styles.commentActionTile,
                styles.commentActionDangerTile,
                pressed && styles.actionSheetOptionPressed,
              ]}
            >
              <View style={[styles.commentActionIcon, styles.commentActionDangerIcon]}>
                <Trash2 size={24} color="#ef4444" />
              </View>
              <Text style={styles.commentActionDangerText} numberOfLines={1}>
                {copy.delete}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.actionSheetCancel,
            pressed && styles.actionSheetOptionPressed,
          ]}
        >
          <Text style={styles.actionSheetCancelText}>{copy.cancel}</Text>
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
            {copy.replyingBanner} <Text style={styles.replyBarMention}>@{replyingTo.username}</Text>
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
  let bgColor = '#0866ff';
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
      {reaction === 'like' ? (
        <ThumbsUp size={8} color="#fff" fill="#fff" />
      ) : reaction === 'love' ? (
        <Heart size={8} color="#fff" fill="#fff" />
      ) : (
        <Text style={styles.reactionEmojiText}>{REACTION_EMOJI[reaction]}</Text>
      )}
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
  const top = Math.max(40, anchor.y - PICKER_PILL_HEIGHT - PICKER_GAP_ABOVE_BUTTON);

  return (
    <View style={styles.pickerLayer} pointerEvents="box-none">
      {/* Invisible full-screen backdrop swallows the next tap to dismiss. */}
      <Pressable style={styles.pickerBackdrop} onPress={onDismiss} />
      <CommentSheetReactionPickerSurface style={[styles.pickerPill, { left, top }]}>
        {ALL_REACTION_TYPES.map(type => (
          <TouchableOpacity
            key={type}
            activeOpacity={0.7}
            onPress={() => onPick(type)}
            style={styles.pickerItem}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Text style={styles.pickerEmoji}>{REACTION_EMOJI[type]}</Text>
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
  onStartReply: (commentId: string, username: string) => void;
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

  const handleReply = useCallback(() => {
    onStartReply(comment.id, username);
  }, [comment.id, onStartReply, username]);

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
              : copy.showReplies.replace('{count}', formatCount(visibleReplyCount))}
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
  const displayName =
    comment.publisher.name || comment.publisher.username || (language === 'en' ? 'User' : 'Người dùng');
  const deleteCommentLabel = getDeleteCommentLabel(language);
  const deleteCommentHint = getDeleteCommentHint(language);
  const timeText = formatRelativeTime(comment.postedAt, language);
  const isReply = depth === 'reply';
  const isSending = comment.isSending;
  const isFailed = comment.isFailed;
  const commentImageUri = comment.pendingImageUri ?? comment.imageUrl ?? null;
  const commentImageKnownSize = useMemo(
    () => fitCommentImageSize(comment.imageWidth, comment.imageHeight),
    [comment.imageHeight, comment.imageWidth],
  );
  const [commentImageSize, setCommentImageSize] = useState(() =>
    commentImageKnownSize,
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
  const likeLabel = myReaction ? copy[`${myReaction}Reaction` as keyof typeof copy] : copy.likeReaction;
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
        ])
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
        ? ['#ffffff', '#eff6ff']
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
      style={[styles.commentRow, isReply && styles.commentRowReply, deleteRowStyle]}
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
            pressed && comment.owner && !isSending && !isFailed ? styles.bubbleWrapPressed : null,
            (isSending || isFailed) && { opacity: 0.6 },
          ]}
        >
          <Animated.View style={[styles.bubble, { backgroundColor: bubbleBg }]}>
            <View style={styles.nameRow}>
              <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.85}>
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
              <Text style={styles.commentText}>{comment.text}</Text>
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
                <Text style={styles.inlineDeleteHint}>
                  {deleteCommentHint}
                </Text>
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
    backgroundColor: 'rgba(0,0,0,0.36)',
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
    backgroundColor:
      Platform.OS === 'ios' ? 'transparent' : '#eef4ff',
  },
  headerCountText: {
    color: '#0872ff',
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
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
    backgroundColor:
      Platform.OS === 'ios' ? 'transparent' : '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 13,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },
  retryButton: {
    borderRadius: 999,
    backgroundColor: '#0866ff',
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  commentsList: {
    flex: 1,
    flexShrink: 1,
  },
  listContent: {
    paddingHorizontal: Platform.OS === 'ios' ? 13 : 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLoader: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  inlineError: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
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
    color: '#1877f2',
    fontSize: 10,
    fontWeight: '700',
  },
  commentText: {
    color: '#050505',
    fontSize: 14,
    lineHeight: 19,
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
    borderColor:
      Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.8)' : '#e5e7eb',
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
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  reactionEmojiText: {
    fontSize: 9,
    lineHeight: 11,
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

  repliesList: {
  },

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
    backgroundColor: '#0866ff',
    borderRadius: 1.5,
    marginRight: 10,
  },
  replyBarTextWrap: {
    flex: 1,
  },
  replyBarText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
  },
  replyBarMention: {
    color: '#0866ff',
    fontWeight: '700',
  },
  replyBarSnippet: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
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
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    color: '#111827',
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 8,
    backgroundColor: '#0866ff',
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
    fontSize: 12,
    fontWeight: '700',
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
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
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
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionSheetMessage: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  actionSheetFootnote: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
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
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
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
    backgroundColor: '#eef2ff',
  },
  commentActionPrimaryIcon: {
    backgroundColor: '#dbeafe',
  },
  commentActionDangerIcon: {
    backgroundColor: '#ffe4e6',
  },
  commentActionPrimaryText: {
    color: '#0866ff',
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
    backgroundColor: '#eff6ff',
  },
  actionSheetLibraryIcon: {
    backgroundColor: '#eef2ff',
  },
  actionSheetPrimaryIcon: {
    backgroundColor: '#dbeafe',
  },
  actionSheetDangerIcon: {
    backgroundColor: '#ffe4e6',
  },
  actionSheetPrimaryText: {
    flex: 1,
    color: '#0866ff',
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
    width: PICKER_PILL_WIDTH,
    height: PICKER_PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmoji: {
    fontSize: 28,
    lineHeight: 32,
  },
});
