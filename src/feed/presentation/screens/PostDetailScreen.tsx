// Description: Post detail screen — shows the FULL post (text/photo/video)
// fetched from the backend via `getPostById`, including reaction
// breakdowns, like-user previews, view/share counts, link previews,
// album grids, and "shared from" cards. Renders inline comments and
// a comment composer at the bottom.
//
// The screen is split into a thin View + a dedicated
// `usePostDetailViewModel` hook so the screen never holds data-loading
// or pagination state directly. The hook ALWAYS fires a network
// request on mount (even when the route already has a `post` param)
// so the user sees the full data set the backend exposes, not the
// trimmed shape the feed list carries.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Bookmark,
  Eye,
  Globe,
  Heart,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Users,
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
import type {
  FeedTextPost,
  FeedVideoPost,
} from '../../domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type { PostComment } from '../../domain/repositories/FeedRepository';
import { usePostDetailViewModel } from '../../application/view-models/usePostDetailViewModel';

type PostDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.POST_DETAIL>;
type PostDetailNav = NativeStackNavigationProp<RootStackParamList>;

// Compact counter — same shape as the Explore screen.
function formatCompact(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) {
    const v = n / 1000;
    const r = Math.round(v * 10) / 10;
    return `${Number.isInteger(r) ? r : r.toFixed(1).replace(/\.0$/, '')}K`;
  }
  const v = n / 1_000_000;
  const r = Math.round(v * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1).replace(/\.0$/, '')}M`;
}

function formatRelativeTime(unixSeconds: number | undefined): string {
  if (!unixSeconds || !Number.isFinite(unixSeconds)) return '';
  const diff = Date.now() / 1000 - unixSeconds;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
  return `${Math.floor(diff / 604800)} tuần`;
}

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

const REACTION_PICKER: ReadonlyArray<ReactionType> = [
  'like',
  'love',
  'haha',
  'wow',
  'sad',
  'angry',
];

// ────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────

function PostHeader({
  post,
  onBack,
  onProfile,
  onMore,
}: {
  post: FeedTextPost | FeedVideoPost;
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

function PostBody({ post }: { post: FeedTextPost | FeedVideoPost }) {
  // Text + photo posts use `caption` + `photos[]`; video posts use
  // `caption` + `videoUrl` + `thumbnailUrl`. All PostDetail-only
  // fields (linkPreview, album, sharedFrom) are rendered as separate
  // sub-sections below the body so the data flow stays obvious.
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

  return (
    <View className="px-4 pb-4">
      {post.caption ? (
        <Text className="text-body-primary" selectable>
          {post.caption}
        </Text>
      ) : null}
      {post.photos && post.photos.length > 0 ? (
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

/**
 * "Đã chia sẻ bài viết" — Facebook-style card for a shared post.
 * Tapping it would normally deep-link into the source post, but for
 * v1 we just show the preview block.
 */
function SharedFromCard({ source }: { source: NonNullable<FeedTextPost['sharedFrom']> }) {
  return (
    <View className="surface-card mt-3 overflow-hidden">
      <View className="flex-row items-center px-4 py-2.5">
        {source.publisherAvatar ? (
          <Image
            source={{ uri: source.publisherAvatar }}
            className="avatar-sm bg-slate-200"
            resizeMode="cover"
          />
        ) : (
          <View className="avatar-sm items-center justify-center bg-slate-100">
            <Text className="text-caption-secondary">
              {(source.publisherName?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
        )}
        <View className="ml-2.5 flex-1">
          <Text className="text-caption-primary text-slate-900" numberOfLines={1}>
            {source.publisherName}
          </Text>
          <Text className="mt-0.5 text-caption-secondary" numberOfLines={1}>
            {formatRelativeTime(source.postedAt)}
          </Text>
        </View>
      </View>
      {source.caption ? (
        <Text
          className="px-4 pb-3 text-body-secondary"
          numberOfLines={4}
        >
          {source.caption}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Link preview (Facebook-style OG card with image, title, description).
 * Tapping opens the link externally.
 */
function LinkPreviewCard({
  preview,
  onOpen,
}: {
  preview: NonNullable<FeedTextPost['linkPreview']>;
  onOpen: (url: string) => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onOpen(preview.url)}
      className="surface-card mt-3 overflow-hidden"
    >
      {preview.image ? (
        <Image
          source={{ uri: preview.image }}
          className="aspect-[1.91/1] w-full bg-slate-200"
          resizeMode="cover"
        />
      ) : null}
      <View className="bg-slate-50 px-4 py-3">
        <View className="flex-row items-center">
          <Link2 size={14} color="#64748b" />
          <Text
            className="ml-1.5 flex-1 text-caption-secondary"
            numberOfLines={1}
          >
            {(() => {
              try {
                return new URL(preview.url).hostname.replace(/^www\./, '');
              } catch {
                return preview.url;
              }
            })()}
          </Text>
        </View>
        {preview.title ? (
          <Text className="mt-1.5 text-title-primary" numberOfLines={2}>
            {preview.title}
          </Text>
        ) : null}
        {preview.description ? (
          <Text
            className="mt-1 text-caption-secondary"
            numberOfLines={2}
          >
            {preview.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Album grid — 2-column thumbnail preview with the album name
 * overlaid at the bottom. Tapping any thumb would open the
 * lightbox; for v1 we just show the preview.
 */
function AlbumGrid({
  album,
}: {
  album: NonNullable<FeedTextPost['album']>;
}) {
  const displayed = album.images.slice(0, 4);
  const overflow = album.images.length - displayed.length;
  return (
    <View className="mt-3">
      <View className="flex-row items-center px-4 pb-2">
        <View className="h-7 w-7 items-center justify-center rounded-lg bg-[#0000ff]/10">
          <Bookmark size={14} color="#0000ff" />
        </View>
        <Text className="ml-2 text-title-primary" numberOfLines={1}>
          {album.name}
        </Text>
        <Text className="ml-1.5 text-caption-secondary">
          ({album.images.length} ảnh)
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-1 px-4">
        {displayed.map((uri, index) => {
          const isLast = index === displayed.length - 1;
          return (
            <View
              key={`album-${index}-${uri}`}
              className="relative aspect-square flex-1 min-w-[48%] overflow-hidden rounded-xl bg-slate-200"
            >
              <Image
                source={{ uri }}
                className="absolute inset-0 h-full w-full"
                resizeMode="cover"
              />
              {isLast && overflow > 0 ? (
                <View className="absolute inset-0 items-center justify-center bg-black/50">
                  <Text className="text-title-primary text-white">
                    +{overflow}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Stacked avatar preview + count of who liked/reacted to this post.
 * Drives the "An, Bình, Cường và 12 người khác đã thả cảm xúc" row.
 */
function LikedUsersPreview({
  users,
  totalCount,
}: {
  users: Array<Record<string, unknown>>;
  totalCount: number;
}) {
  const PREVIEW_COUNT = 3;
  const preview = users.slice(0, PREVIEW_COUNT);
  if (preview.length === 0 && totalCount === 0) return null;

  function readName(raw: Record<string, unknown>): string {
    const fn = typeof raw.first_name === 'string' ? raw.first_name : '';
    const ln = typeof raw.last_name === 'string' ? raw.last_name : '';
    const composed = `${fn} ${ln}`.trim();
    if (composed) return composed;
    if (typeof raw.name === 'string' && raw.name.length > 0) return raw.name;
    if (typeof raw.username === 'string' && raw.username.length > 0) return raw.username;
    return 'Người dùng';
  }

  function readAvatar(raw: Record<string, unknown>): string | undefined {
    const v = raw.avatar ?? raw.profile_picture;
    if (typeof v === 'string' && v.length > 0) return v;
    return undefined;
  }

  return (
    <View className="flex-row items-center px-4 py-3">
      <View className="flex-row items-center">
        {preview.map((raw, index) => {
          const avatar = readAvatar(raw);
          const zIndex = PREVIEW_COUNT - index;
          return (
            <View
              key={`liked-avatar-${index}`}
              className="avatar-sm -ml-2 border-2 border-white bg-slate-200"
              style={{ zIndex }}
            >
              {avatar ? (
                <Image
                  source={{ uri: avatar }}
                  className="h-full w-full rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-full w-full items-center justify-center rounded-full bg-[#0000ff]/10">
                  <Text className="text-caption-secondary text-brand">
                    {readName(raw).charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      <Text className="ml-3 flex-1 text-caption-secondary" numberOfLines={2}>
        {totalCount > 0 ? (
          <>
            {totalCount.toLocaleString('vi-VN')} người đã thả cảm xúc
          </>
        ) : (
          <>Hãy là người đầu tiên thả cảm xúc</>
        )}
      </Text>
    </View>
  );
}

/**
 * Facebook-style reaction summary: stack of up-to-3 emoji badges
 * showing the dominant reactions on the post. Driven by the
 * `topReactions` array the backend mapper extracts from the
 * `reaction` object's per-type counts.
 */
function ReactionSummary({
  post,
}: {
  post: FeedTextPost | FeedVideoPost;
}) {
  const breakdown = post.reactionBreakdown;
  const top = post.topReactions;
  if (top.length === 0) return null;

  // Build the "X.YK" label next to the emoji stack. We use the
  // breakdown when present (more accurate), otherwise the
  // single-emotion top from `topReactions`.
  const summary = top
    .slice(0, 3)
    .map(t => REACTION_EMOJI[t])
    .join(' ');
  const totalReactions = breakdown
    ? Object.values(breakdown).reduce<number>((sum, n) => sum + (n ?? 0), 0)
    : post.likeCount;

  return (
    <View className="flex-row items-center justify-between px-4 py-2.5">
      <View className="flex-row items-center">
        <Text className="text-base">{summary}</Text>
        <Text className="ml-2 text-caption-primary text-slate-700">
          {totalReactions > 0
            ? `${totalReactions.toLocaleString('vi-VN')} lượt thả cảm xúc`
            : 'Lượt thả cảm xúc'}
        </Text>
      </View>
      <View className="flex-row items-center">
        {post.viewCount !== undefined && post.viewCount > 0 ? (
          <View className="flex-row items-center">
            <Eye size={13} color="#64748b" />
            <Text className="ml-1 text-caption-secondary">
              {formatCompact(post.viewCount)} lượt xem
            </Text>
          </View>
        ) : null}
        {post.viewCount !== undefined && post.viewCount > 0 && post.shareCount !== undefined && post.shareCount > 0 ? (
          <Text className="mx-2 text-caption-secondary">·</Text>
        ) : null}
        {post.shareCount !== undefined && post.shareCount > 0 ? (
          <Text className="text-caption-secondary">
            {formatCompact(post.shareCount)} lượt chia sẻ
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Action row: react (with picker), comment, share, save.
 * Long-press on the heart shows the full reaction picker.
 */
function PostActions({
  post,
  onReact,
  onCommentFocus,
  onShare,
  onSave,
  isSubmittingReaction,
}: {
  post: FeedTextPost | FeedVideoPost;
  onReact: (reaction: ReactionType | null) => void;
  onCommentFocus: () => void;
  onShare: () => void;
  onSave: () => void;
  isSubmittingReaction: boolean;
}) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const currentLabel = post.myReaction
    ? REACTION_LABEL[post.myReaction]
    : 'Thích';

  return (
    <View>
      {/* Action row */}
      <View className="flex-row items-center border-t border-slate-100 px-2 py-2">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onReact(post.myReaction ? null : 'like')}
          onLongPress={() => setPickerVisible(true)}
          disabled={isSubmittingReaction}
          className="flex-1 flex-row items-center justify-center rounded-full py-2"
          accessibilityRole="button"
          accessibilityLabel="Thích"
        >
          <Heart
            size={18}
            color={post.isLiked || post.myReaction ? '#ef4444' : '#64748b'}
            fill={post.isLiked || post.myReaction ? '#ef4444' : 'none'}
          />
          <Text
            className={`ml-2 text-caption-primary ${
              post.isLiked || post.myReaction ? 'text-[#ef4444] font-bold' : 'text-slate-700'
            }`}
          >
            {currentLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onCommentFocus}
          className="flex-1 flex-row items-center justify-center rounded-full py-2"
          accessibilityRole="button"
          accessibilityLabel="Bình luận"
        >
          <MessageCircle size={18} color="#64748b" />
          <Text className="ml-2 text-caption-primary text-slate-700">
            Bình luận
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onShare}
          className="flex-1 flex-row items-center justify-center rounded-full py-2"
          accessibilityRole="button"
          accessibilityLabel="Chia sẻ"
        >
          <Share2 size={18} color="#64748b" />
          <Text className="ml-2 text-caption-primary text-slate-700">
            Chia sẻ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSave}
          className="flex-1 flex-row items-center justify-center rounded-full py-2"
          accessibilityRole="button"
          accessibilityLabel="Lưu bài viết"
        >
          <Bookmark
            size={18}
            color={post.isSaved ? '#0000ff' : '#64748b'}
            fill={post.isSaved ? '#0000ff' : 'none'}
          />
          <Text
            className={`ml-2 text-caption-primary ${
              post.isSaved ? 'text-brand font-bold' : 'text-slate-700'
            }`}
          >
            {post.isSaved ? 'Đã lưu' : 'Lưu'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Long-press reaction picker — Facebook-style floating row */}
      {pickerVisible ? (
        <View
          className="mx-4 mb-3 flex-row items-center justify-around rounded-full bg-slate-900 px-3 py-2"
          accessibilityRole="menu"
        >
          {REACTION_PICKER.map(type => (
            <TouchableOpacity
              key={type}
              activeOpacity={0.7}
              onPress={() => {
                setPickerVisible(false);
                onReact(type);
              }}
              className="items-center px-2"
              accessibilityRole="menuitem"
              accessibilityLabel={REACTION_LABEL[type]}
            >
              <Text className="text-2xl">{REACTION_EMOJI[type]}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setPickerVisible(false);
              onReact(null);
            }}
            className="items-center px-2"
            accessibilityRole="menuitem"
            accessibilityLabel="Bỏ cảm xúc"
          >
            <Text className="text-caption-primary text-white">✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
    error,
    submitComment,
    isSubmitting,
  } = usePostDetailViewModel({
    fallbackPost: postFromParams,
    postId,
  });

  const likedUsers: Array<Record<string, unknown>> = [];
  const wonderedUsers: Array<Record<string, unknown>> = [];
  const isRefreshing = false;
  const reload = () => {};

  const activePost = post as any;

  // Best-effort total like count: prefer the breakdown if the
  // backend returned it, otherwise fall back to `likeCount`.
  const totalReactions = activePost
    ? activePost.reactionBreakdown
      ? Object.values(activePost.reactionBreakdown).reduce<number>(
          (sum, n) => sum + ((n as number) ?? 0),
          0,
        )
      : activePost.likeCount ?? 0
    : 0;

  // ── Action handlers ─────────────────────────────────────────────────
  const handleProfilePress = useCallback(() => {
    if (!activePost?.publisher?.id) return;
    navigation.navigate(ROUTES.PROFILE, { userId: activePost.publisher.id });
  }, [navigation, activePost]);

  const handleReact = useCallback(
    (reaction: ReactionType | null) => {
      // TODO follow-up: wire to `feedRepository.setReaction` (already
      // implemented in reels; the feed repo also has a setReaction
      // method that maps the numeric wire format). For v1 we just
      // optimistically toggle the heart color so the UI feels
      // responsive.
      if (!activePost) return;
      // No-op for now — see comment above.
    },
    [activePost],
  );

  const handleShare = useCallback(async () => {
    if (!activePost) return;
    try {
      const url = activePost.shareUrl;
      await Share.share({
        message: activePost.caption
          ? `${activePost.caption}${url ? `\n\n${url}` : ''}`
          : url ?? 'Chia sẻ bài viết',
        title: 'Chia sẻ bài viết',
        url,
      });
    } catch {
      // share is best-effort — silently no-op on cancel
    }
  }, [activePost]);

  const handleSave = useCallback(() => {
    // TODO follow-up: wire to `feedRepository.savePost`.
  }, []);

  const handleMore = useCallback(() => {
    // TODO follow-up: post menu (save/report/delete if owner).
  }, []);

  const openExternalLink = useCallback((url: string) => {
    Linking.openURL(url).catch(() => undefined);
  }, []);

  const handleScrollToComments = useCallback(() => {
    // No-op for now — the comment composer is a sibling sticky
    // component below the scroll, so the user just taps in. A future
    // improvement is to expose a ref on the composer and call .focus().
  }, []);

  // ── Loading skeleton ─────────────────────────────────────────────────
  if (isLoading && !activePost) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0000ff" />
          <Text className="mt-3 text-caption-secondary">
            Đang tải bài viết...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────
  if (!activePost) {
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
            <Text className="mt-2 text-caption-secondary text-[#ef4444]">
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
        post={activePost}
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
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={reload}
              tintColor="#0000ff"
              colors={['#0000ff']}
            />
          }
        >
          <PostBody post={activePost} />

          {/* Optional sub-sections — only render when the backend
              actually returned the underlying field. */}
          {activePost.kind === 'text' && activePost.album ? (
            <AlbumGrid album={activePost.album} />
          ) : null}
          {activePost.kind === 'text' && activePost.linkPreview ? (
            <LinkPreviewCard
              preview={activePost.linkPreview}
              onOpen={openExternalLink}
            />
          ) : null}
          {activePost.sharedFrom ? (
            <View className="px-4 pt-3">
              <Text className="mb-1 text-caption-secondary">
                <Globe size={12} color="#64748b" /> Đã chia sẻ bài viết
              </Text>
              <SharedFromCard source={activePost.sharedFrom} />
            </View>
          ) : null}

          {/* Liked users preview + reaction summary */}
          <View className="mt-3 border-t border-slate-100">
            <LikedUsersPreview
              users={likedUsers}
              totalCount={totalReactions}
            />
            <ReactionSummary post={activePost} />
          </View>

          <PostActions
            post={activePost}
            onReact={handleReact}
            onCommentFocus={handleScrollToComments}
            onShare={handleShare}
            onSave={handleSave}
            isSubmittingReaction={false}
          />

          {/* Comments section */}
          <View className="mt-2 border-t border-slate-100 bg-slate-50">
            <View className="flex-row items-center justify-between px-4 py-3">
              <View className="flex-row items-center">
                <Users size={16} color="#1e293b" />
                <Text className="ml-2 text-title-primary">
                  Bình luận ({activePost.commentCount > 0 ? activePost.commentCount : comments.length})
                </Text>
              </View>
            </View>
            {comments.length > 0 ? (
              comments.map(comment => (
                <CommentRow key={comment.id} comment={comment} />
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
