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
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronDown,
  ImagePlus,
  Mic,
  Music2,
  SendHorizonal,
  Square,
  ThumbsUp,
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

const AVATAR_FALLBACK = 'https://v2.vnseea.vn/upload/photos/d-avatar.jpg';

// ── Reaction lookup tables ───────────────────────────────────────────────
// The picker shows all 6 emojis. Each reaction also has a label (shown on
// the "Thích" button when active) and a color (the label changes color to
// match the reaction, like Facebook). `null` is the no-reaction default.

const REACTION_EMOJI: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};

const REACTION_LABEL: Record<ReactionType, string> = {
  like: 'Thích',
  love: 'Yêu thích',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Buồn',
  angry: 'Phẫn nộ',
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
  onLoadReplies: (commentId: string) => void;
  onCollapseReplies: (commentId: string) => void;
  onStartReply: (commentId: string, username: string) => void;
  onCancelReply: () => void;
  onRetryFailedComment: (comment: ReelComment) => void;
  onDeleteFailedComment: (comment: ReelComment) => void;
}

function formatCount(count: number) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatRelativeTime(timestamp?: number) {
  if (!timestamp) return '';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);

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
  onLoadReplies,
  onCollapseReplies,
  onStartReply,
  onCancelReply,
  onRetryFailedComment,
  onDeleteFailedComment,
}: Props) {
  const insets = useSafeAreaInsets();
  const wavRecorder = useWavAudioRecorder();
  const {
    isRecording: isWavRecording,
    durationMs: wavDurationMs,
    startRecording: startWavRecording,
    stopRecording: stopWavRecording,
    cancelRecording: cancelWavRecording,
  } = wavRecorder;
  const [draft, setDraft] = useState('');
  // Image picked by the user for the next comment / reply. Local file://
  // URI; uploaded via multipart when `onSubmit` fires. Cleared after
  // submit or by tapping the X on the preview thumbnail.
  const [pendingImage, setPendingImage] =
    useState<CommentImageAttachment | null>(null);
  const [pendingAudio, setPendingAudio] =
    useState<CommentAudioAttachment | null>(null);
  // Which comment-image URL is open in the full-screen viewer (null = closed).
  // Used both for already-uploaded `imageUrl` and pending local previews so
  // the user can tap any comment image to see it big.
  const [imageViewerUri, setImageViewerUri] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(visible);
  const openProgress = useRef(new Animated.Value(0)).current;

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
    }
  }, [cancelWavRecording, visible]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      openProgress.setValue(0);
      Animated.spring(openProgress, {
        toValue: 1,
        damping: 18,
        stiffness: 180,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(openProgress, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [openProgress, visible]);

  const backdropOpacity = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const sheetTranslateY = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [460, 0],
  });

  const sheetScale = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
  });

  const title = useMemo(() => {
    const count = Math.max(commentCount, comments.length);
    return count > 0 ? `${formatCount(count)} bình luận` : 'Bình luận';
  }, [commentCount, comments.length]);

  const handleSubmit = useCallback(() => {
    const trimmed = draft.trim();
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
    }
  }, [
    draft,
    pendingImage,
    pendingAudio,
    onSubmit,
    onSubmitReply,
    replyingTo,
    onCancelReply,
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
        'Không chọn được âm thanh',
        caught instanceof Error ? caught.message : 'Vui lòng thử lại.',
      );
    }
  }, []);

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
        'Không ghi âm được',
        caught instanceof Error ? caught.message : 'Vui lòng thử lại.',
      );
    }
  }, [isWavRecording, startWavRecording, stopWavRecording]);

  /**
   * Open the gallery picker and stash the first selected image in
   * `pendingImage`. We normalise the Asset shape into our domain
   * `CommentImageAttachment` (with sane defaults for missing `fileName`
   * / `type` — Android omits both on some devices) so the repo can pass
   * it straight to FormData.
   */
  const handleImagePickerResult = useCallback((result: any) => {
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert('Lỗi', result.errorMessage ?? 'Không thực hiện được thao tác.');
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
  }, []);

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
  const handlePickImage = useCallback(async () => {
    Alert.alert(
      'Chọn ảnh bình luận',
      'Bạn muốn chụp ảnh mới hay chọn ảnh từ thư viện?',
      [
        {
          text: 'Chụp ảnh',
          onPress: async () => {
            const result = await launchCamera({
              mediaType: 'photo' as MediaType,
              quality: 0.8,
              saveToPhotos: false,
              includeBase64: false,
            });
            handleImagePickerResult(result);
          },
        },
        {
          text: 'Chọn từ thư viện',
          onPress: async () => {
            const result = await launchImageLibrary({
              mediaType: 'photo' as MediaType,
              selectionLimit: 1,
              quality: 0.8,
              includeBase64: false,
            });
            handleImagePickerResult(result);
          },
        },
        { text: 'Hủy', style: 'cancel' },
      ],
      { cancelable: true },
    );
  }, [handleImagePickerResult]);

  const handleLongPressRow = useCallback(
    (comment: ReelComment) => {
      if (comment.isSending) return;
      if (comment.isFailed) {
        Alert.alert(
          'Không gửi được bình luận',
          'Bạn có muốn thử lại hoặc xóa bình luận này không?',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Xóa',
              style: 'destructive',
              onPress: () => onDeleteFailedComment(comment),
            },
            {
              text: 'Thử lại',
              onPress: () => onRetryFailedComment(comment),
            },
          ],
        );
        return;
      }
      if (!comment.owner) return;
      Alert.alert(
        'Bình luận của bạn',
        comment.text.length > 60
          ? comment.text.slice(0, 60) + '…'
          : comment.text,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: () => onDelete(comment.id),
          },
        ],
      );
    },
    [onDelete, onDeleteFailedComment, onRetryFailedComment],
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
          onLongPressRow={handleLongPressRow}
          onLoadReplies={onLoadReplies}
          onCollapseReplies={onCollapseReplies}
          onStartReply={onStartReply}
          onOpenImage={handleOpenImage}
        />
      );
    },
    [
      handleLongPressRow,
      handleOpenImage,
      handleOpenPicker,
      loadingRepliesIds,
      onCollapseReplies,
      onLoadReplies,
      onSetReaction,
      onStartReply,
      repliesById,
    ],
  );

  const keyExtractor = useCallback((item: ReelComment) => item.id, []);

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        <Pressable style={styles.backdropPressable} onPress={onClose}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 10),
              transform: [
                { translateY: sheetTranslateY },
                { scale: sheetScale },
              ],
            },
          ]}
        >
          <View style={styles.grabber} />

          <View style={styles.header}>
            <View style={styles.headerSide} />
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#0866ff" size="small" />
              <Text style={styles.stateText}>Đang tải bình luận...</Text>
            </View>
          ) : error && comments.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onRetry}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={keyExtractor}
              renderItem={renderThread}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.listContent,
                comments.length === 0 ? styles.emptyListContent : null,
              ]}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.6}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>Chưa có bình luận</Text>
                  <Text style={styles.emptyText}>
                    Hãy là người đầu tiên bình luận video này.
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

          {replyingTo ? (
            <View style={styles.replyBar}>
              <Text style={styles.replyBarText} numberOfLines={1}>
                Trả lời{' '}
                <Text style={styles.replyBarMention}>
                  @{replyingTo.username}
                </Text>
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onCancelReply}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Pending image preview (above the input row) ─────────────
              Rendered only while the user has an image queued. FB-style:
              a bigger preview thumbnail (88×88) with a circular X button
              to clear it. Sits in its own row so the input stays at a
              single line height. */}
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
                  Đang ghi âm {formatAudioDuration(wavDurationMs)}
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

          <View style={styles.inputBar}>
            {/* Image picker button — leftmost in the row, mirrors FB layout */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePickImage}
              style={styles.imageButton}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <ImagePlus size={22} color="#0866ff" />
            </TouchableOpacity>
            {!replyingTo ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handlePickAudio}
                  disabled={isWavRecording}
                  style={styles.imageButton}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Music2
                    size={21}
                    color={isWavRecording ? '#cbd5e1' : '#ec4899'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleToggleAudioRecording}
                  style={styles.imageButton}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  {isWavRecording ? (
                    <Square size={17} color="#dc2626" fill="#dc2626" />
                  ) : (
                    <Mic size={21} color="#dc2626" />
                  )}
                </TouchableOpacity>
              </>
            ) : null}
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={
                replyingTo
                  ? `Trả lời @${replyingTo.username}…`
                  : 'Thêm bình luận...'
              }
              placeholderTextColor="#94a3b8"
              style={styles.input}
              multiline
              maxLength={500}
              editable={!isWavRecording}
            />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmit}
              // Enable submit if EITHER text or an image is provided —
              // matches the backend's "text OR image required" rule.
              disabled={
                isWavRecording ||
                (!draft.trim() && !pendingImage && !pendingAudio)
              }
              style={[
                styles.sendButton,
                isWavRecording ||
                (!draft.trim() && !pendingImage && !pendingAudio)
                  ? styles.sendButtonDisabled
                  : null,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <SendHorizonal size={18} color="#fff" />
            </TouchableOpacity>
          </View>
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
    </Modal>
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
      <View style={[styles.pickerPill, { left, top }]}>
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
      </View>
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
}: ThreadProps) {
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
              ? 'Ẩn phản hồi'
              : `Xem ${formatCount(visibleReplyCount)} phản hồi`}
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
}

function CommentRow({
  comment,
  depth,
  onSetReaction,
  onOpenPicker,
  onLongPressRow,
  onReply,
  onOpenImage,
}: RowProps) {
  const displayName =
    comment.publisher.name || comment.publisher.username || 'Người dùng';
  const timeText = formatRelativeTime(comment.postedAt);
  const isReply = depth === 'reply';
  const isSending = comment.isSending;
  const isFailed = comment.isFailed;

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

  // Pick the label / colour for the "Thích" button based on the viewer's
  // current reaction. Defaults to gray "Thích" with a thumbs-up icon.
  const myReaction = comment.myReaction;
  const likeLabel = myReaction ? REACTION_LABEL[myReaction] : 'Thích';
  const likeColor = myReaction ? REACTION_COLOR[myReaction] : '#64748b';

  return (
    <View style={[styles.commentRow, isReply && styles.commentRowReply]}>
      <Image
        source={{ uri: comment.publisher.avatarUrl || AVATAR_FALLBACK }}
        style={isReply ? styles.commentAvatarSmall : styles.commentAvatar}
      />
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
          <View style={styles.bubble}>
            <Text style={styles.commentName} numberOfLines={1}>
              {displayName}
            </Text>
            {comment.text ? (
              <Text style={styles.commentText}>{comment.text}</Text>
            ) : null}

            {/* Comment image — prefer the local pending URI while the
                upload is in flight so the bubble shows the picked file
                INSTANTLY, then falls back to the CDN URL the server
                returns. Tap to open in full-screen viewer. */}
            {comment.pendingImageUri || comment.imageUrl ? (
              <Pressable
                onPress={() => {
                  const uri = comment.pendingImageUri ?? comment.imageUrl;
                  if (uri) onOpenImage(uri);
                }}
                style={styles.commentImageWrap}
              >
                <Image
                  source={{
                    uri: comment.pendingImageUri ?? comment.imageUrl,
                  }}
                  style={styles.commentImage}
                  resizeMode="cover"
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
          </View>

          {/* Reaction count overlay — sits half-outside the bottom-right
              of the bubble, FB-style. Only renders when there's at least
              one reaction. */}
          {comment.likeCount > 0 ? (
            <View style={styles.reactionBadge}>
              <Text style={styles.reactionBadgeEmoji}>
                {myReaction
                  ? REACTION_EMOJI[myReaction]
                  : REACTION_EMOJI.like}
              </Text>
              <Text style={styles.reactionBadgeCount}>
                {formatCount(comment.likeCount)}
              </Text>
            </View>
          ) : null}
        </Pressable>

        {/* Action row under the bubble: 👍 Thích · Phản hồi · 6 phút */}
        {isSending ? (
          <View style={styles.actionRow}>
            <Text style={styles.sendingText}>Đang gửi...</Text>
          </View>
        ) : isFailed ? (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleRowLongPress} activeOpacity={0.7}>
              <Text style={styles.failedText}>Không gửi được. Nhấn để thử lại.</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Pressable
              ref={likeButtonRef}
              onPress={handleLikeTap}
              onLongPress={handleLikeLongPress}
              delayLongPress={280}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={styles.actionButton}
            >
              {myReaction ? (
                <Text style={styles.actionEmoji}>{REACTION_EMOJI[myReaction]}</Text>
              ) : (
                <ThumbsUp size={14} color={likeColor} />
              )}
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
              <Text style={styles.actionText}>Phản hồi</Text>
            </Pressable>

            {timeText ? (
              <>
                <Text style={styles.actionDot}>·</Text>
                <Text style={styles.actionTime}>{timeText}</Text>
              </>
            ) : null}
          </View>
        )}
      </View>
    </View>
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
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    marginTop: 8,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  headerSide: {
    width: 36,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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

  // ── Bubble ──────────────────────────────────────────────────────────
  // The grey rounded rectangle the comment text lives in. Has positioned
  // bottom-right children (the reaction count badge).
  bubbleWrap: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  bubbleWrapPressed: {
    opacity: 0.7,
  },
  bubble: {
    backgroundColor: '#f0f2f5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 10, // a touch more space so the reaction badge doesn't crowd
  },
  commentName: {
    color: '#050505',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  commentText: {
    color: '#050505',
    fontSize: 14,
    lineHeight: 19,
  },
  // Wrapper for tappable comment image — opens full-screen viewer.
  // We split the wrap/image so the Pressable can hold the overlay and
  // the inner Image renders crisply at cover-mode.
  commentImageWrap: {
    marginTop: 6,
    width: 220,
    height: 165,
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

  // Reaction count badge — anchored to the bottom-right of the bubble
  reactionBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    // soft drop shadow so it lifts off the bubble
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionBadgeEmoji: {
    fontSize: 11,
    marginRight: 2,
  },
  reactionBadgeCount: {
    color: '#65676b',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Action row ──────────────────────────────────────────────────────
  // The "👍 Thích · Phản hồi · 6 phút" row underneath the bubble
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
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
    color: '#65676b',
    marginHorizontal: 6,
    fontSize: 12,
  },
  actionTime: {
    color: '#65676b',
    fontSize: 12,
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
    // empty — each reply row handles its own indentation via
    // `commentRowReply`
  },

  // ── Reply mode banner ───────────────────────────────────────────────
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  replyBarText: {
    flex: 1,
    color: '#64748b',
    fontSize: 12,
  },
  replyBarMention: {
    color: '#0866ff',
    fontWeight: '700',
  },

  // ── Input bar ───────────────────────────────────────────────────────
  inputBar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    maxHeight: 90,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#f1f5f9',
  },

  // ── Image viewer modal ──────────────────────────────────────────────
  recordingRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fef2f2',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
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
