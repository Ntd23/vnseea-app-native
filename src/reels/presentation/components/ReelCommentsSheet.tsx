// Description: TikTok-style comments bottom sheet for a single reel.
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { Heart, SendHorizonal, X } from 'lucide-react-native';
import type { ReelComment } from '../../domain/types/reels.types';

const AVATAR_FALLBACK = 'https://v2.vnseea.vn/upload/photos/d-avatar.jpg';

interface Props {
  visible: boolean;
  comments: ReelComment[];
  commentCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onEndReached: () => void;
  onRetry: () => void;
  onSubmit: (text: string) => Promise<ReelComment | null>;
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
  isSubmitting,
  error,
  onClose,
  onEndReached,
  onRetry,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [isMounted, setIsMounted] = useState(visible);
  const openProgress = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setDraft('');
    }
  }, [visible]);

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

  const handleSubmit = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSubmitting) return;

    const createdComment = await onSubmit(trimmed);
    if (createdComment) {
      setDraft('');
    }
  }, [draft, isSubmitting, onSubmit]);

  const renderComment = useCallback(
    ({ item }: { item: ReelComment }) => <CommentRow comment={item} />,
    [],
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
              <ActivityIndicator color="#0700ff" size="small" />
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
              renderItem={renderComment}
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
                    <ActivityIndicator color="#0700ff" size="small" />
                  </View>
                ) : error ? (
                  <Text style={styles.inlineError}>{error}</Text>
                ) : null
              }
            />
          )}

          <View style={styles.inputBar}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Thêm bình luận..."
              placeholderTextColor="#94a3b8"
              style={styles.input}
              multiline
              maxLength={500}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={!draft.trim() || isSubmitting}
              style={[
                styles.sendButton,
                !draft.trim() || isSubmitting ? styles.sendButtonDisabled : null,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <SendHorizonal size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CommentRow({ comment }: { comment: ReelComment }) {
  const displayName =
    comment.publisher.name || comment.publisher.username || 'Người dùng';
  const username = comment.publisher.username
    ? `@${comment.publisher.username}`
    : '';
  const timeText = formatRelativeTime(comment.postedAt);

  return (
    <View style={styles.commentRow}>
      <Image
        source={{ uri: comment.publisher.avatarUrl || AVATAR_FALLBACK }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text style={styles.commentName} numberOfLines={1}>
            {displayName}
          </Text>
          {timeText ? <Text style={styles.commentTime}>{timeText}</Text> : null}
        </View>
        {username ? (
          <Text style={styles.commentUsername} numberOfLines={1}>
            {username}
          </Text>
        ) : null}
        <Text style={styles.commentText}>{comment.text}</Text>
        {comment.replyCount > 0 ? (
          <Text style={styles.replyCount}>
            Xem {formatCount(comment.replyCount)} phản hồi
          </Text>
        ) : null}
      </View>
      <View style={styles.commentAction}>
        <Heart
          size={18}
          color={comment.isLiked ? '#fe2c55' : '#94a3b8'}
          fill={comment.isLiked ? '#fe2c55' : 'transparent'}
        />
        {comment.likeCount > 0 ? (
          <Text style={styles.commentLikeCount}>{formatCount(comment.likeCount)}</Text>
        ) : null}
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
    backgroundColor: '#0700ff',
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e5e7eb',
  },
  commentBody: {
    flex: 1,
    marginLeft: 10,
    paddingRight: 8,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentName: {
    maxWidth: '72%',
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  commentTime: {
    marginLeft: 8,
    color: '#94a3b8',
    fontSize: 11,
  },
  commentUsername: {
    marginTop: 1,
    color: '#94a3b8',
    fontSize: 12,
  },
  commentText: {
    marginTop: 4,
    color: '#111827',
    fontSize: 14,
    lineHeight: 19,
  },
  replyCount: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  commentAction: {
    width: 38,
    alignItems: 'center',
    paddingTop: 4,
  },
  commentLikeCount: {
    marginTop: 3,
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
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
    backgroundColor: '#0700ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.42,
  },
});
