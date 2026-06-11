// Description: Post detail screen — shows the full post (text/photo/video),
// inline comments, and a comment composer.
//
// The screen is intentionally split into a thin View + a dedicated
// `usePostDetailViewModel` hook so the screen never holds data-loading
// or pagination state directly. The hook owns:
//   • the post itself (initial `post` param → optional `getPostById` fetch)
//   • the comments list (loaded from `getPostById` initially, then
//     append-only via the comments API)
//   • submitting a new comment
//
// Why not reuse the existing `useFeedCommentsViewModel`?
//   That VM is a global "open a comments sheet for any post" helper
//   tied to the feed list. PostDetail wants a dedicated view of
//   comments for ONE post with the post header always visible. Building
//   it standalone keeps the data flow obvious.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
} from 'lucide-react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { FeedPost } from '../../domain/types/feed.types';
import type { PostComment } from '../../domain/repositories/FeedRepository';
import { usePostDetailViewModel } from '../../application/view-models/usePostDetailViewModel';

type PostDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.POST_DETAIL>;
type PostDetailNav = NativeStackNavigationProp<RootStackParamList>;

// ────────────────────────────────────────────────────────────────────────
// Sub-components — kept inline because they're not reused yet.
// ────────────────────────────────────────────────────────────────────────

function formatRelativeTime(unixSeconds: number | undefined): string {
  if (!unixSeconds || !Number.isFinite(unixSeconds)) return '';
  const diff = Date.now() / 1000 - unixSeconds;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
  return `${Math.floor(diff / 604800)} tuần`;
}

function PostHeader({
  post,
  onBack,
  onProfile,
  onMore,
}: {
  post: FeedPost;
  onBack: () => void;
  onProfile: () => void;
  onMore: () => void;
}) {
  return (
    <View className="flex-row items-center px-4 py-3">
      <TouchableOpacity
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={onBack}
        className="h-10 w-10 items-center justify-center rounded-full"
        accessibilityLabel="Quay lại"
      >
        <ArrowLeft size={22} color="#1E293B" />
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onProfile}
        className="ml-1 flex-1 flex-row items-center"
      >
        {post.publisher?.avatarUrl ? (
          <Image
            source={{ uri: post.publisher.avatarUrl }}
            className="avatar-md bg-slate-200"
            resizeMode="cover"
          />
        ) : (
          <View className="avatar-md items-center justify-center bg-[#0000ff]/10">
            <Text className="text-caption-primary text-brand">
              {(post.publisher?.name?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
        )}
        <View className="ml-3 flex-1">
          <Text className="text-title-primary" numberOfLines={1}>
            {post.publisher?.name ?? 'Người dùng'}
          </Text>
          <Text className="mt-0.5 text-caption-secondary" numberOfLines={1}>
            @{post.publisher?.username ?? 'unknown'} ·{' '}
            {formatRelativeTime(post.postedAt)}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={onMore}
        className="h-10 w-10 items-center justify-center rounded-full"
        accessibilityLabel="Thêm"
      >
        <MoreHorizontal size={20} color="#1E293B" />
      </TouchableOpacity>
    </View>
  );
}

function PostBody({ post }: { post: FeedPost }) {
  // Text + photo posts use `caption` + `photos[]`; video posts use
  // `caption` + `videoUrl` + `thumbnailUrl`. We branch on `kind` so the
  // detail screen stays a thin renderer — all the mapping lives in
  // the repository.
  if (post.kind === 'video') {
    return (
      <View className="px-4 pb-4">
        {post.caption ? (
          <Text className="text-body-primary" selectable>
            {post.caption}
          </Text>
        ) : null}
        {post.thumbnailUrl || post.videoUrl ? (
          <View className="mt-3 overflow-hidden rounded-2xl bg-slate-200">
            {post.thumbnailUrl ? (
              <Image
                source={{ uri: post.thumbnailUrl }}
                className="aspect-video w-full"
                resizeMode="cover"
                accessibilityLabel="Ảnh bìa video"
              />
            ) : null}
            <View className="flex-row items-center justify-between bg-black/85 px-3 py-2.5">
              <Text className="flex-1 text-caption-primary text-white" numberOfLines={1}>
                ▶ {post.videoUrl ?? 'Video'}
              </Text>
              <Text className="text-caption-secondary text-white/70">
                {formatRelativeTime(post.postedAt)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  // text / photo / unknown kind → fall back to caption + photos
  return (
    <View className="px-4 pb-4">
      {post.caption ? (
        <Text className="text-body-primary" selectable>
          {post.caption}
        </Text>
      ) : null}
      {post.kind === 'text' && post.photos && post.photos.length > 0 ? (
        <View className="mt-3 gap-2">
          {post.photos.map((uri, index) => (
            <Image
              key={`photo-${index}-${uri}`}
              source={{ uri }}
              className="aspect-square w-full overflow-hidden rounded-2xl bg-slate-200"
              resizeMode="cover"
              accessibilityLabel={`Ảnh ${index + 1}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PostActions({
  post,
  onReact,
  onCommentFocus,
  onShare,
}: {
  post: FeedPost;
  onReact: () => void;
  onCommentFocus: () => void;
  onShare: () => void;
}) {
  // The full feed card has reaction summary rows + reaction picker; on
  // the detail screen the post header already shows the timestamp, so
  // we just expose the three primary actions here. Reaction picker is
  // a follow-up — the simple ❤️ tap is enough for v1.
  return (
    <View className="flex-row items-center justify-between border-t border-slate-100 px-4 py-3">
      <View className="flex-row items-center gap-2">
        <Heart
          size={18}
          color={post.isLiked || post.myReaction ? '#ef4444' : '#64748b'}
          fill={post.isLiked || post.myReaction ? '#ef4444' : 'none'}
        />
        <Text className="text-caption-primary text-slate-700">
          {post.likeCount > 0 ? post.likeCount.toLocaleString('vi-VN') : 'Thích'}
        </Text>
      </View>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onCommentFocus}
        className="flex-row items-center gap-2"
        accessibilityRole="button"
        accessibilityLabel="Bình luận"
      >
        <MessageCircle size={18} color="#64748b" />
        <Text className="text-caption-primary text-slate-700">
          {post.commentCount > 0
            ? post.commentCount.toLocaleString('vi-VN')
            : 'Bình luận'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onShare}
        className="flex-row items-center gap-2"
        accessibilityRole="button"
        accessibilityLabel="Chia sẻ"
      >
        <Share2 size={18} color="#64748b" />
        <Text className="text-caption-primary text-slate-700">Chia sẻ</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onReact}
        accessibilityRole="button"
        accessibilityLabel="Yêu thích bài viết"
      >
        <Heart size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
}

function CommentRow({ comment }: { comment: PostComment }) {
  return (
    <View className="flex-row px-4 py-3">
      {comment.publisher?.avatarUrl ? (
        <Image
          source={{ uri: comment.publisher.avatarUrl }}
          className="avatar-sm bg-slate-200"
          resizeMode="cover"
        />
      ) : (
        <View className="avatar-sm items-center justify-center bg-[#0000ff]/10">
          <Text className="text-caption-primary text-brand">
            {(comment.publisher?.name?.[0] ?? '?').toUpperCase()}
          </Text>
        </View>
      )}
      <View className="ml-3 flex-1">
        <View className="rounded-2xl bg-slate-100 px-3 py-2.5">
          <Text className="text-caption-primary text-slate-900" numberOfLines={1}>
            {comment.publisher?.name ?? 'Người dùng'}{' '}
            {comment.publisher?.username ? (
              <Text className="text-caption-secondary">
                @{comment.publisher.username}
              </Text>
            ) : null}
          </Text>
          <Text className="mt-1 text-body-secondary" selectable>
            {comment.text}
          </Text>
        </View>
        <View className="mt-1.5 flex-row items-center gap-3 pl-2">
          <Text className="text-caption-secondary">
            {formatRelativeTime(comment.postedAt)}
          </Text>
          {comment.likeCount > 0 ? (
            <Text className="text-caption-secondary">
              {comment.likeCount} lượt thích
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function CommentComposer({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (text: string) => void | Promise<void>;
  isSubmitting: boolean;
}) {
  const [text, setText] = useState('');

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;
    await onSubmit(trimmed);
    setText('');
  }, [isSubmitting, onSubmit, text]);

  return (
    <View className="flex-row items-center border-t border-slate-200 bg-white px-4 py-3">
      <TextInput
        className="input-shell min-h-[44px] flex-1 px-4"
        placeholder="Viết bình luận..."
        placeholderTextColor="#94a3b8"
        value={text}
        onChangeText={setText}
        editable={!isSubmitting}
        multiline
        returnKeyType="send"
        onSubmitEditing={handleSend}
        accessibilityLabel="Nhập bình luận"
      />
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleSend}
        disabled={!text.trim() || isSubmitting}
        className="ml-2 h-11 w-11 items-center justify-center rounded-full bg-[#0000ff]"
        accessibilityLabel="Gửi bình luận"
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Send size={18} color="#ffffff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Main screen
// ────────────────────────────────────────────────────────────────────────

function PostDetailScreen() {
  const navigation = useNavigation<PostDetailNav>();
  const route = useRoute<PostDetailRoute>();
  const { postId, post: postFromParams } = route.params;

  const {
    post,
    comments,
    isLoading,
    isLoadingComments,
    error,
    submitComment,
    isSubmitting,
  } = usePostDetailViewModel({
    fallbackPost: postFromParams,
    postId,
  });

  // Auto-focus the composer when the user taps the comment count.
  // We don't manage focus directly here — the composer is a sibling
  // component, so we just flash a hint that it's available. A future
  // improvement is to expose a ref on the composer and call .focus().
  const [, setCommentHint] = useState(0);
  const handleCommentFocus = useCallback(() => {
    setCommentHint(prev => prev + 1);
  }, []);

  const handleProfilePress = useCallback(() => {
    if (!post?.publisher?.id) return;
    navigation.navigate(ROUTES.PROFILE, {
      userId: post.publisher.id,
    });
  }, [navigation, post]);

  const handleShare = useCallback(() => {
    // Native share sheet would go here. Out of scope for this iteration.
  }, []);

  const handleMore = useCallback(() => {
    // Post menu (save/report/delete if owner) — out of scope for v1.
  }, []);

  const handleReact = useCallback(() => {
    // Reaction picker + persistence — out of scope for v1.
  }, []);

  // ── Loading skeleton ─────────────────────────────────────────────────
  if (isLoading && !post) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0000ff" />
          <Text className="mt-3 text-caption-secondary">Đang tải bài viết...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────
  if (!post) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View className="surface-topbar flex-row items-center px-4 py-3">
          <TouchableOpacity
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => navigation.goBack()}
            className="h-10 w-10 items-center justify-center rounded-full"
            accessibilityLabel="Quay lại"
          >
            <ArrowLeft size={22} color="#1E293B" />
          </TouchableOpacity>
          <Text className="ml-2 flex-1 text-heading">Bài viết</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-title-primary">
            Không tìm thấy bài viết
          </Text>
          <Text className="mt-2 text-center text-body-secondary">
            Bài viết này đã bị gỡ hoặc bạn không có quyền truy cập.
          </Text>
          <Text className="mt-3 text-caption-secondary">ID: {postId}</Text>
          {error ? (
            <Text className="mt-2 text-caption-secondary text-red-500">
              {error}
            </Text>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.goBack()}
            className="btn-primary mt-6 min-h-[44px] px-6"
          >
            <Text className="text-caption-primary text-inverse">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <PostHeader
        post={post}
        onBack={() => navigation.goBack()}
        onProfile={handleProfilePress}
        onMore={handleMore}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <PostBody post={post} />
          <PostActions
            post={post}
            onReact={handleReact}
            onCommentFocus={handleCommentFocus}
            onShare={handleShare}
          />

          {/* Comments section */}
          <View className="mt-2 border-t border-slate-100 bg-slate-50">
            <View className="flex-row items-center justify-between px-4 py-3">
              <Text className="text-title-primary">
                Bình luận ({post.commentCount > 0 ? post.commentCount : comments.length})
              </Text>
              {isLoadingComments ? (
                <ActivityIndicator size="small" color="#0000ff" />
              ) : null}
            </View>
            {comments.length > 0 ? (
              comments.map(comment => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                />
              ))
            ) : (
              <View className="px-4 pb-4">
                <Text className="text-center text-caption-secondary">
                  Chưa có bình luận nào. Hãy là người đầu tiên!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <CommentComposer
          onSubmit={submitComment}
          isSubmitting={isSubmitting}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default PostDetailScreen;
