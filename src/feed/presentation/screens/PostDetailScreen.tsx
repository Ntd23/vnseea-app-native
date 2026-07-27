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
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Share,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  Eye,
  Heart,
  Link2,
  MessageCircle,
  Share2,
} from 'lucide-react-native';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type {
  FeedPost,
  FeedPollPost,
  FeedProductPost,
  FeedTextPost,
  FeedVideoPost,
} from '../../domain/types/feed.types';
import { isFeedPostShareable } from '../../domain/policies/feedPostPrivacy';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { usePostDetailViewModel } from '../../application/view-models/usePostDetailViewModel';
import { useFeedCommentsViewModel } from '../../application/view-models/useFeedCommentsViewModel';
import PostReactionsSheet from '../components/PostReactionsSheet';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import Reanimated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import {
  TextPostCard,
  HomeVideoPostCard,
  PostIdentityHeader,
  ReactionPickerOverlay,
  FEED_COPY,
  formatPostTime,
  renderPostTextTokens,
} from '../components/PostCards';
import {
  FEED_REACTION_IMAGES,
  FEED_REACTION_TYPES,
} from '../components/FeedReactionAssets';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import { usePostRealtimeScope } from '../../application/realtime/usePostRealtimeScope';
import { PollPostCard } from '../components/PollPostCard';
import { ProductPostCard } from '../../../product/presentation/components/ProductPostCard';
import { ReelCommentsSheet } from '../../../reels/presentation/components/ReelCommentsSheet';
import { PostMenuActionSheet } from '../../../shared-kernel/presentation/components/PostMenuActionSheet';
import {
  PhotoViewerModal,
  type PhotoViewerState,
} from '../../../shared-kernel/presentation/components/PhotoViewerModal';
import { resolveFeedChromeTopInset } from '../components/feedHeaderInsets';
import { hiddenPostsStorage } from '../../infrastructure/storage/hiddenPostsStorage';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';

type PostDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.POST_DETAIL>;
type PostDetailNav = NativeStackNavigationProp<RootStackParamList>;

const { width: POST_DETAIL_SCREEN_WIDTH } = Dimensions.get('window');
const POST_DETAIL_BACK_GESTURE_START_X = Platform.OS === 'android' ? 18 : 0;
const POST_DETAIL_BACK_GESTURE_WIDTH = Platform.OS === 'android' ? 86 : 16;
const POST_DETAIL_BACK_GESTURE_ACTIVE_OFFSET_X =
  Platform.OS === 'android' ? 8 : 14;
const POST_DETAIL_BACK_GESTURE_FAIL_OFFSET_Y =
  Platform.OS === 'android' ? 18 : 14;
const POST_DETAIL_BACK_GESTURE_DISTANCE_RATIO = 0.32;
const POST_DETAIL_BACK_GESTURE_VELOCITY = 700;
const POST_DETAIL_BACK_CLOSE_DURATION_MS = 180;
const POST_DETAIL_BACK_CANCEL_DURATION_MS = 140;

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

const REACTION_LABEL: Record<ReactionType, string> = {
  like: 'Thích',
  love: 'Yêu thích',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Buồn',
  angry: 'Phẫn nộ',
};

// ────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────

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
            {renderPostTextTokens(post.caption, post.mentionNames)}
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
              <Text
                className="flex-1 text-caption-primary text-white"
                numberOfLines={1}
              >
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
          {renderPostTextTokens(post.caption, post.mentionNames)}
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
function SharedFromCard({
  source,
}: {
  source: NonNullable<FeedTextPost['sharedFrom']>;
}) {
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
          <Text
            className="text-caption-primary text-slate-900"
            numberOfLines={1}
          >
            {source.publisherName}
          </Text>
          <Text className="mt-0.5 text-caption-secondary" numberOfLines={1}>
            {formatRelativeTime(source.postedAt)}
          </Text>
        </View>
      </View>
      {source.caption ? (
        <Text className="px-4 pb-3 text-body-secondary" numberOfLines={4}>
          {renderPostTextTokens(source.caption, source.mentionNames)}
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
          <Text className="mt-1 text-caption-secondary" numberOfLines={2}>
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
function AlbumGrid({ album }: { album: NonNullable<FeedTextPost['album']> }) {
  const displayed = album.images.slice(0, 4);
  const overflow = album.images.length - displayed.length;
  return (
    <View className="mt-3">
      <View className="flex-row items-center px-4 pb-2">
        <View className="h-7 w-7 items-center justify-center rounded-lg bg-brand/10">
          <Bookmark size={14} color={APP_BRAND_COLOR} />
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
 *
 * Tapping the row opens `PostReactionsSheet` (Modal bottom sheet hosted
 * at the bottom of this screen) so the user can see the full list
 * grouped by reaction type (Tất cả / Thích / Yêu thích / ...).
 * When `totalCount === 0` the row renders as static text — there's
 * nothing to drill into yet.
 */
function LikedUsersPreview({
  users,
  totalCount,
  onPress,
}: {
  users: Array<Record<string, unknown>>;
  totalCount: number;
  onPress: () => void;
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
    if (typeof raw.username === 'string' && raw.username.length > 0)
      return raw.username;
    return 'Người dùng';
  }

  function readAvatar(raw: Record<string, unknown>): string | undefined {
    const v = raw.avatar ?? raw.profile_picture;
    if (typeof v === 'string' && v.length > 0) return v;
    return undefined;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={totalCount === 0}
      className="flex-row items-center px-4 py-3"
      accessibilityRole="button"
      accessibilityLabel="Xem danh sách cảm xúc"
    >
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
                <View className="h-full w-full items-center justify-center rounded-full bg-brand/10">
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
          <>{totalCount.toLocaleString('vi-VN')} người đã thả cảm xúc</>
        ) : (
          <>Hãy là người đầu tiên thả cảm xúc</>
        )}
      </Text>
    </TouchableOpacity>
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
  onPress,
}: {
  post: FeedTextPost | FeedVideoPost;
  onPress?: () => void;
}) {
  const breakdown = post.reactionBreakdown;
  const top = post.topReactions;
  if (top.length === 0) return null;

  // Build the "X.YK" label next to the emoji stack. We use the
  // breakdown when present (more accurate), otherwise the
  // single-emotion top from `topReactions`.
  const summary = top.slice(0, 3);
  const totalReactions = breakdown
    ? Object.values(breakdown).reduce<number>((sum, n) => sum + (n ?? 0), 0)
    : post.likeCount;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center justify-between px-4 py-2.5"
    >
      <View className="flex-row items-center">
        <View className="flex-row items-center">
          {summary.map((type, index) => (
            <View
              key={type}
              className="h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white"
              style={{ marginLeft: index === 0 ? 0 : -5 }}
            >
              <Image
                source={FEED_REACTION_IMAGES[type]}
                style={{ width: 20, height: 20 }}
                resizeMode="contain"
              />
            </View>
          ))}
        </View>
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
        {post.viewCount !== undefined &&
        post.viewCount > 0 &&
        post.shareCount !== undefined &&
        post.shareCount > 0 ? (
          <Text className="mx-2 text-caption-secondary">·</Text>
        ) : null}
        {post.shareCount !== undefined && post.shareCount > 0 ? (
          <Text className="text-caption-secondary">
            {formatCompact(post.shareCount)} lượt chia sẻ
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
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
          {post.myReaction ? (
            <Image
              source={FEED_REACTION_IMAGES[post.myReaction]}
              style={{ width: 20, height: 20 }}
              resizeMode="contain"
            />
          ) : (
            <Heart
              size={18}
              color={post.isLiked ? '#ef4444' : '#64748b'}
              fill={post.isLiked ? '#ef4444' : 'none'}
            />
          )}
          <Text
            className={`ml-2 text-caption-primary ${
              post.isLiked || post.myReaction
                ? 'text-[#ef4444] font-bold'
                : 'text-slate-700'
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

        {isFeedPostShareable(post) ? (
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
        ) : null}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSave}
          className="flex-1 flex-row items-center justify-center rounded-full py-2"
          accessibilityRole="button"
          accessibilityLabel="Lưu bài viết"
        >
          <Bookmark
            size={18}
            color={post.isSaved ? APP_BRAND_COLOR : '#64748b'}
            fill={post.isSaved ? APP_BRAND_COLOR : 'none'}
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
          {FEED_REACTION_TYPES.map(type => (
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
              <Image
                source={FEED_REACTION_IMAGES[type]}
                style={{ width: 30, height: 30 }}
                resizeMode="contain"
              />
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

// ────────────────────────────────────────────────────────────────────────
// Main screen
// ────────────────────────────────────────────────────────────────────────

function PostDetailScreen() {
  const navigation = useNavigation<PostDetailNav>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const resolvedPostDetailTopInset = resolveFeedChromeTopInset(
    insets.top,
    initialWindowMetrics?.insets?.top,
  );
  // Android is configured non-edge-to-edge, so the Activity content window
  // already begins below the status bar. Subtract that stable window origin
  // from the runtime inset so a transient/stale Modal inset cannot be applied
  // a second time. On a true edge-to-edge window frame.y is 0, preserving the
  // real safe-area inset.
  const androidContentWindowOffsetY =
    Platform.OS === 'android'
      ? Math.max(
          0,
          initialWindowMetrics?.frame.y ?? StatusBar.currentHeight ?? 0,
        )
      : 0;
  const postDetailTopInset =
    Platform.OS === 'android'
      ? Math.max(0, resolvedPostDetailTopInset - androidContentWindowOffsetY)
      : resolvedPostDetailTopInset;
  const postDetailRootStyle = useMemo(
    () => [postDetailStyles.safeArea, { paddingTop: postDetailTopInset }],
    [postDetailTopInset],
  );
  const route = useRoute<PostDetailRoute>();
  const { postId, post: postFromParams, focusComments = false } = route.params;
  const [commentFocusSignal, setCommentFocusSignal] = useState(0);

  const {
    post,
    isLoading,
    error,
    toggleReaction,
    applyRealtimePost,
    markRealtimeDeleted,
    adjustCommentCount,
    savePost,
    reportPost,
    deletePost,
  } = usePostDetailViewModel({
    fallbackPost: postFromParams,
    postId,
  });

  const handleCommentCountChange = useCallback(
    (_changedPostId: string, delta: number) => adjustCommentCount(delta),
    [adjustCommentCount],
  );
  const commentVm = useFeedCommentsViewModel({
    onCommentCountChange: handleCommentCountChange,
  });
  const openCommentsRef = useRef(commentVm.openComments);
  const closeCommentsRef = useRef(commentVm.closeComments);
  openCommentsRef.current = commentVm.openComments;
  closeCommentsRef.current = commentVm.closeComments;

  useEffect(() => {
    openCommentsRef.current(postId).catch(() => undefined);
    return () => closeCommentsRef.current();
  }, [postId]);

  usePostRealtimeScope({
    postIds: [postId],
    posts: post ? [post] : [],
    enabled: isFocused,
    onSnapshot: applyRealtimePost,
    onDeleted: markRealtimeDeleted,
    onCommentMutation: () => {
      commentVm.refreshComments().catch(() => undefined);
    },
  });

  const language = useAppLanguage();
  const copy = FEED_COPY[language];

  // Reaction picker states
  const [pickerAnchor, setPickerAnchor] = useState<{
    postId: string;
    x: number;
    y: number;
  } | null>(null);
  const [postMenuVisible, setPostMenuVisible] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<PhotoViewerState>(null);
  const photoViewerRef = useRef<PhotoViewerState>(null);

  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const hasDragged = useSharedValue(false);
  const postDetailBackTranslateX = useSharedValue(0);
  const postDetailBackClosing = useSharedValue(false);

  useEffect(() => {
    if (!isFocused) return;
    postDetailBackTranslateX.value = 0;
    postDetailBackClosing.value = false;
  }, [isFocused, postDetailBackClosing, postDetailBackTranslateX]);

  const handleOpenPicker = useCallback(
    (postId: string, x: number, y: number) => {
      setPickerAnchor({ postId, x, y });
    },
    [],
  );

  const handlePickReaction = useCallback(
    (reaction: ReactionType) => {
      if (!pickerAnchor) return;
      toggleReaction(reaction);
      setPickerAnchor(null);
    },
    [pickerAnchor, toggleReaction],
  );

  const activePost = post as any;

  // ── Action handlers ─────────────────────────────────────────────────
  const navigateToProfile = useCallback(
    (userId: string) => {
      if (!userId) return;
      navigateToUserProfile(navigation, userId);
    },
    [navigation],
  );

  const handleProfilePress = useCallback(() => {
    navigateToProfile(activePost?.publisher?.id ?? '');
  }, [navigateToProfile, activePost]);

  const handlePhotoPress = useCallback(
    (photoPost: FeedTextPost, photoIndex: number) => {
      const totalPhotos = photoPost.photos?.length ?? 0;
      if (totalPhotos === 0) return;

      const safeIndex = Math.min(Math.max(photoIndex, 0), totalPhotos - 1);
      const nextState: PhotoViewerState = {
        post: photoPost,
        initialIndex: safeIndex,
      };
      photoViewerRef.current = nextState;
      setPhotoViewer(nextState);
    },
    [],
  );

  const handleClosePhotoViewer = useCallback(() => {
    photoViewerRef.current = null;
    setPhotoViewer(null);
  }, []);

  const handleShare = useCallback(async () => {
    if (!isFeedPostShareable(activePost)) return;
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

  const handleOpenPostMenu = useCallback(
    (selectedPost: FeedPost) => {
      if (selectedPost.id !== activePost?.id) return;
      setPostMenuVisible(true);
    },
    [activePost?.id],
  );

  const handleClosePostMenu = useCallback(() => {
    setPostMenuVisible(false);
  }, []);

  const handleSavePost = useCallback(
    async (targetPostId: string) => {
      const result = await savePost(targetPostId);
      Alert.alert(
        result.saved ? copy.savedTitle : copy.unsavedTitle,
        result.saved ? copy.savedMessage : copy.unsavedMessage,
      );
    },
    [copy, savePost],
  );

  const handleReportPost = useCallback(
    async (targetPostId: string) => {
      const result = await reportPost(targetPostId);
      Alert.alert(
        result.reported ? copy.reportSentTitle : copy.reportCancelledTitle,
        result.reported ? copy.reportSentMessage : copy.reportCancelledMessage,
      );
    },
    [copy, reportPost],
  );

  const handleHidePost = useCallback(
    async (targetPostId: string) => {
      hiddenPostsStorage.hidePost(
        targetPostId,
        sessionStorage.getSession()?.userId,
      );
      setPostMenuVisible(false);
      navigation.goBack();
    },
    [navigation],
  );

  const handleDeletePost = useCallback(
    async (targetPostId: string) => {
      if (
        activePost?.id !== targetPostId ||
        activePost.permissions?.canDelete !== true
      ) {
        throw new Error('Bạn không có quyền xóa bài viết này.');
      }

      const result = await deletePost(targetPostId);
      if (!result.deleted) {
        throw new Error('Không thể xóa bài viết này.');
      }
      setPostMenuVisible(false);
      navigation.goBack();
    },
    [activePost, deletePost, navigation],
  );

  // Open the "who reacted" bottom sheet. The sheet is mounted at the
  // bottom of this screen — it owns its own VM + tab state, so we just
  // flip a local visibility flag here instead of pushing a screen.
  const [reactionsSheetVisible, setReactionsSheetVisible] = useState(false);

  const handleOpenReactions = useCallback(() => {
    if (!postId) return;
    setReactionsSheetVisible(true);
  }, [postId]);

  const openExternalLink = useCallback((url: string) => {
    Linking.openURL(url).catch(() => undefined);
  }, []);

  const handleScrollToComments = useCallback(() => {
    setCommentFocusSignal(current => current + 1);
  }, []);

  const handlePhotoViewerCommentTap = useCallback(
    (_targetPostId: string) => {
      handleScrollToComments();
    },
    [handleScrollToComments],
  );

  const handleDismissKeyboardFromContent = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handlePostDetailBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const canSwipeBackToPreviousPostScreen = navigation.canGoBack();
  const isPostDetailSwipeBackBlocked =
    reactionsSheetVisible ||
    postMenuVisible ||
    pickerAnchor !== null ||
    photoViewer !== null;

  const postDetailSwipeBackGesture = useMemo(
    () =>
      Gesture.Pan()
        .hitSlop({
          left: POST_DETAIL_BACK_GESTURE_START_X,
          width: POST_DETAIL_BACK_GESTURE_WIDTH,
        })
        .activeOffsetX([POST_DETAIL_BACK_GESTURE_ACTIVE_OFFSET_X, 999])
        .failOffsetY([
          -POST_DETAIL_BACK_GESTURE_FAIL_OFFSET_Y,
          POST_DETAIL_BACK_GESTURE_FAIL_OFFSET_Y,
        ])
        .enabled(
          canSwipeBackToPreviousPostScreen && !isPostDetailSwipeBackBlocked,
        )
        .onBegin(() => {
          'worklet';
          if (postDetailBackClosing.value) return;
          cancelAnimation(postDetailBackTranslateX);
        })
        .onUpdate(event => {
          'worklet';
          if (postDetailBackClosing.value) return;
          postDetailBackTranslateX.value = Math.min(
            POST_DETAIL_SCREEN_WIDTH,
            Math.max(0, event.translationX),
          );
        })
        .onEnd(event => {
          'worklet';
          if (postDetailBackClosing.value) return;

          const shouldClose =
            event.translationX >
              POST_DETAIL_SCREEN_WIDTH *
                POST_DETAIL_BACK_GESTURE_DISTANCE_RATIO ||
            event.velocityX > POST_DETAIL_BACK_GESTURE_VELOCITY;

          if (shouldClose) {
            postDetailBackClosing.value = true;
            postDetailBackTranslateX.value = withTiming(
              POST_DETAIL_SCREEN_WIDTH,
              {
                duration: POST_DETAIL_BACK_CLOSE_DURATION_MS,
                easing: Easing.out(Easing.cubic),
              },
              finished => {
                if (finished) {
                  runOnJS(handlePostDetailBack)();
                }
              },
            );
            return;
          }

          postDetailBackTranslateX.value = withTiming(0, {
            duration: POST_DETAIL_BACK_CANCEL_DURATION_MS,
            easing: Easing.out(Easing.cubic),
          });
        }),
    [
      canSwipeBackToPreviousPostScreen,
      handlePostDetailBack,
      isPostDetailSwipeBackBlocked,
      postDetailBackClosing,
      postDetailBackTranslateX,
    ],
  );

  const postDetailSwipeBackScreenStyle = useAnimatedStyle(() => {
    const progress = Math.min(
      1,
      postDetailBackTranslateX.value / POST_DETAIL_SCREEN_WIDTH,
    );

    return {
      borderTopLeftRadius: interpolate(progress, [0, 1], [0, 18], 'clamp'),
      borderBottomLeftRadius: interpolate(progress, [0, 1], [0, 18], 'clamp'),
      opacity: interpolate(progress, [0, 1], [1, 0.92], 'clamp'),
      transform: [
        { translateX: postDetailBackTranslateX.value },
        { scale: interpolate(progress, [0, 1], [1, 0.97], 'clamp') },
      ],
    };
  });

  const postDetailSwipeBackDimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      postDetailBackTranslateX.value,
      [
        0,
        POST_DETAIL_SCREEN_WIDTH * POST_DETAIL_BACK_GESTURE_DISTANCE_RATIO,
        POST_DETAIL_SCREEN_WIDTH,
      ],
      [0.1, 0.06, 0],
      'clamp',
    ),
  }));

  const postDetailSwipeBackCueStyle = useAnimatedStyle(() => {
    const threshold =
      POST_DETAIL_SCREEN_WIDTH * POST_DETAIL_BACK_GESTURE_DISTANCE_RATIO;
    const isReady = postDetailBackTranslateX.value >= threshold;

    return {
      opacity: interpolate(
        postDetailBackTranslateX.value,
        [0, 40, threshold],
        [0, 0.85, 1],
        'clamp',
      ),
      transform: [
        {
          translateX: interpolate(
            postDetailBackTranslateX.value,
            [0, threshold],
            [-60, 20],
            'clamp',
          ),
        },
        {
          scale: interpolate(
            postDetailBackTranslateX.value,
            [0, threshold],
            [0.6, 1.2],
            'clamp',
          ),
        },
      ],
      backgroundColor: isReady
        ? 'rgba(8, 102, 255, 0.85)'
        : 'rgba(0, 0, 0, 0.65)',
    };
  });

  const renderPostDetailSwipeBackFrame = useCallback(
    (children: React.ReactNode) => (
      <GestureHandlerRootView style={postDetailStyles.gestureRoot}>
        <Reanimated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            postDetailStyles.swipeBackDim,
            postDetailSwipeBackDimStyle,
          ]}
        />
        <Reanimated.View
          pointerEvents="none"
          style={[postDetailStyles.swipeBackCue, postDetailSwipeBackCueStyle]}
        >
          {/* Reel-style cue: the bubble follows the drag instead of showing a label. */}
          <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.6} />
        </Reanimated.View>
        <GestureDetector gesture={postDetailSwipeBackGesture}>
          <Reanimated.View
            style={[postDetailStyles.screen, postDetailSwipeBackScreenStyle]}
          >
            {children}
          </Reanimated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    ),
    [
      postDetailSwipeBackCueStyle,
      postDetailSwipeBackDimStyle,
      postDetailSwipeBackGesture,
      postDetailSwipeBackScreenStyle,
    ],
  );

  // ── Loading skeleton ─────────────────────────────────────────────────
  if (isLoading && !activePost) {
    return renderPostDetailSwipeBackFrame(
      <View style={postDetailRootStyle}>
        <FocusAwareStatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={false}
        />
        <View style={postDetailStyles.loadingIdentityHeader}>
          <View style={postDetailStyles.loadingAvatar} />
          <View style={postDetailStyles.loadingIdentityText}>
            <View style={postDetailStyles.loadingName} />
            <View style={postDetailStyles.loadingMeta} />
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={APP_BRAND_COLOR} />
          <Text className="mt-3 text-caption-secondary">
            Đang tải bài viết...
          </Text>
        </View>
      </View>,
    );
  }

  // ── Not found ───────────────────────────────────────────────────────
  if (!activePost) {
    return renderPostDetailSwipeBackFrame(
      <View style={postDetailRootStyle}>
        <FocusAwareStatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={false}
        />
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
      </View>,
    );
  }

  const postListHeader = (
    <View style={{ marginHorizontal: -12 }}>
      {activePost.kind === 'video' ? (
        <HomeVideoPostCard
          post={activePost}
          copy={copy}
          onReact={(_id, rx) => toggleReaction(rx)}
          onOpenPicker={handleOpenPicker}
          onCommentTap={handleScrollToComments}
          commentNavigationMode="callback"
          onShare={handleShare}
          onOpenReactions={handleOpenReactions}
          navigateToProfile={navigateToProfile}
          showIdentityHeader={false}
          isScreenFocused={true}
          isActive={true}
          gestureX={gestureX}
          gestureY={gestureY}
          gestureActive={gestureActive}
          hasDragged={hasDragged}
        />
      ) : activePost.kind === 'poll' ? (
        <PollPostCard
          post={activePost as FeedPollPost}
          onReact={(_id, rx) => toggleReaction(rx)}
          onOpenPicker={handleOpenPicker}
          onCommentTap={handleScrollToComments}
          commentNavigationMode="callback"
          onShare={handleShare}
          onProfilePress={navigateToProfile}
          showIdentityHeader={false}
          language={language}
          gestureX={gestureX}
          gestureY={gestureY}
          gestureActive={gestureActive}
          hasDragged={hasDragged}
        />
      ) : activePost.kind === 'product' ? (
        <ProductPostCard
          product={(activePost as FeedProductPost).product}
          postId={activePost.id}
          post={activePost}
          likeCount={activePost.likeCount}
          commentCount={activePost.commentCount}
          myReaction={activePost.myReaction}
          onReact={(_id, rx) => toggleReaction(rx)}
          onCommentTap={handleScrollToComments}
          commentNavigationMode="callback"
          onOpenReactions={handleOpenReactions}
          onShare={() => handleShare()}
          onProfilePress={navigateToProfile}
          showIdentityHeader={false}
        />
      ) : (
        <TextPostCard
          post={activePost}
          copy={copy}
          onReact={(_id, rx) => toggleReaction(rx)}
          onOpenPicker={handleOpenPicker}
          onCommentTap={handleScrollToComments}
          commentNavigationMode="callback"
          onPhotoPress={handlePhotoPress}
          onShare={handleShare}
          onOpenReactions={handleOpenReactions}
          navigateToProfile={navigateToProfile}
          showIdentityHeader={false}
          gestureX={gestureX}
          gestureY={gestureY}
          gestureActive={gestureActive}
          hasDragged={hasDragged}
        />
      )}
    </View>
  );

  return renderPostDetailSwipeBackFrame(
    <View style={postDetailRootStyle}>
      <FocusAwareStatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />

      <KeyboardAvoidingView
        style={postDetailStyles.keyboardBoundary}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        keyboardVerticalOffset={0}
      >
        <View
          style={postDetailStyles.stickyIdentityHeader}
          onTouchStart={handleDismissKeyboardFromContent}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={handlePostDetailBack}
            style={postDetailStyles.stickyBackButton}
            accessibilityRole="button"
            accessibilityLabel={language === 'vi' ? 'Quay lại' : 'Go back'}
          >
            <ArrowLeft size={22} color="#1E293B" />
          </TouchableOpacity>
          <View style={postDetailStyles.stickyIdentityContent}>
            <PostIdentityHeader
              avatar={activePost.publisher?.avatarUrl}
              name={
                activePost.isAnonymous
                  ? copy.anonymousPrivacyLabel
                  : activePost.publisher?.name || copy.userFallback
              }
              time={formatPostTime(activePost.postedAt, copy)}
              copy={copy}
              onPress={
                !activePost.isAnonymous && activePost.publisher?.id
                  ? handleProfilePress
                  : undefined
              }
              onMorePress={handleOpenPostMenu}
              post={activePost}
              containerClassName="flex-row items-center justify-between"
            />
          </View>
        </View>

        <ReelCommentsSheet
          visible
          presentation="inline"
          listHeaderComponent={postListHeader}
          autoFocusComposer={focusComments}
          composerFocusSignal={commentFocusSignal}
          comments={commentVm.comments}
          commentCount={activePost.commentCount}
          isLoading={commentVm.isCommentsLoading}
          isLoadingMore={commentVm.isCommentsLoadingMore}
          isSubmitting={commentVm.isSubmittingComment}
          error={commentVm.commentError}
          repliesById={commentVm.repliesById}
          loadingRepliesIds={commentVm.loadingRepliesIds}
          replyingTo={commentVm.replyingTo}
          onClose={() => undefined}
          onEndReached={commentVm.loadMoreComments}
          onRetry={() => {
            commentVm.openComments(postId).catch(() => undefined);
          }}
          onSubmit={commentVm.submitComment}
          onSubmitReply={commentVm.submitReply}
          onSearchMentions={commentVm.searchCommentMentions}
          onSetReaction={commentVm.setCommentReaction}
          onDelete={commentVm.deleteComment}
          onEdit={commentVm.editComment}
          onLoadReplies={commentVm.loadReplies}
          onCollapseReplies={commentVm.collapseReplies}
          onStartReply={commentVm.startReplyTo}
          onCancelReply={commentVm.cancelReply}
          onRetryFailedComment={commentVm.retryFailedComment}
          onDeleteFailedComment={commentVm.deleteFailedComment}
        />
      </KeyboardAvoidingView>

      <PhotoViewerModal
        state={photoViewer}
        copy={copy}
        onClose={handleClosePhotoViewer}
        onReact={(_targetPostId, reaction) => {
          toggleReaction(reaction).catch(() => undefined);
        }}
        onCommentTap={handlePhotoViewerCommentTap}
        onProfilePress={navigateToProfile}
        posts={activePost ? [activePost as FeedPost] : []}
      />

      <PostReactionsSheet
        visible={reactionsSheetVisible}
        postId={postId ?? null}
        onClose={() => setReactionsSheetVisible(false)}
      />

      <ReactionPickerOverlay
        anchor={pickerAnchor}
        onPick={handlePickReaction}
        onDismiss={() => setPickerAnchor(null)}
        gestureX={gestureX}
        gestureY={gestureY}
        gestureActive={gestureActive}
        hasDragged={hasDragged}
      />

      <PostMenuActionSheet
        visible={postMenuVisible}
        onClose={handleClosePostMenu}
        post={activePost}
        canDelete={activePost.permissions?.canDelete === true}
        onSave={handleSavePost}
        onHide={handleHidePost}
        onDelete={handleDeletePost}
        onReport={handleReportPost}
      />
    </View>,
  );
}

const postDetailStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardBoundary: {
    flex: 1,
  },
  stickyIdentityHeader: {
    zIndex: 20,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  stickyBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  stickyIdentityContent: {
    flex: 1,
    minWidth: 0,
  },
  loadingIdentityHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  loadingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  loadingIdentityText: {
    flex: 1,
    marginLeft: 12,
  },
  loadingName: {
    width: 132,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E2E8F0',
  },
  loadingMeta: {
    width: 96,
    height: 10,
    marginTop: 8,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
  },
  gestureRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  swipeBackDim: {
    backgroundColor: '#000000',
  },
  swipeBackCue: {
    position: 'absolute',
    left: 0,
    width: 50,
    height: 50,
    top: '50%',
    marginTop: -25,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
  },
});

export default PostDetailScreen;
