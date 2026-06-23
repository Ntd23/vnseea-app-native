// PostCards.tsx â€” Shared post card components used by FeedScreen, ProfileScreen,
// ExploreScreen, PageDetailScreen, etc.
// Extracted from FeedScreen.tsx for easier maintenance.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageProps,
  type ImageStyle,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import VideoPlayer from 'react-native-video';
import {
  Gesture,
  GestureDetector,
  TouchableOpacity as GHTouchableOpacity,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import {
  Globe,
  MessageCircle,
  MoreHorizontal,
  Share2,
  ShoppingBag,
  ThumbsUp,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToReels } from '../../../navigation/reelsNavigation';
import type { RootStackParamList } from '../../../navigation/types';
import type {
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
} from '../../domain/types/feed.types';
import type { FeedSource } from '../../domain/repositories/FeedRepository';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { ALL_REACTION_TYPES } from '../../../reels/domain/types/reels.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { AudioPlayer } from '../../../shared-kernel/presentation/components/AudioPlayer';
import {
  FeedCardContent,
  FeedCardSurface,
  FeedGlassActionBar,
  FeedGlassActionButton,
  FeedMediaFrame,
  FeedReactionPickerPointer,
  FeedReactionPickerSurface,
} from './FeedCardChrome';
import { getPhotoGridItemLayout } from './photoGridLayout';

export {
  FEED_CARD_CLASS,
  FEED_CARD_PADDING_CLASS,
  FEED_MEDIA_CLASS,
} from './FeedCardChrome';

// â”€â”€ Reaction lookup tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const REACTION_EMOJI: Record<ReactionType, string> = {
  like: '\uD83D\uDC4D',
  love: '\u2764\uFE0F',
  haha: '\uD83D\uDE02',
  wow: '\uD83D\uDE2E',
  sad: '\uD83D\uDE22',
  angry: '\uD83D\uDE21',
};

const REACTION_COLOR: Record<ReactionType, string> = {
  like: '#0866ff',
  love: '#f33e58',
  haha: '#f7b125',
  wow: '#f7b125',
  sad: '#f7b125',
  angry: '#e9710f',
};

const REACTION_IMAGES: Record<ReactionType, any> = {
  like: require('../../../assets/reactions/reactions_like.png'),
  love: require('../../../assets/reactions/reactions_love.png'),
  haha: require('../../../assets/reactions/reactions_haha.png'),
  wow: require('../../../assets/reactions/reactions_wow.png'),
  sad: require('../../../assets/reactions/reactions_sad.png'),
  angry: require('../../../assets/reactions/reactions_angry.png'),
};

// â”€â”€ Picker geometry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PICKER_WIDTH = 282;
const PICKER_HEIGHT = 52;
const PICKER_GAP = 8;
export const VIDEO_BUFFER_CONFIG = {
  minBufferMs: 2500,
  maxBufferMs: 5000,
  bufferForPlaybackMs: 500,
  bufferForPlaybackAfterRebufferMs: 2000,
};
const LOAD_MORE_THROTTLE_MS = 800;
const SUPPLEMENTAL_LOAD_MORE_THROTTLE_MS = 2500;
const IMAGE_PREFETCH_LOOKAHEAD = 5;
const MAX_IMAGE_PREFETCH_URLS = 8;
const DEFAULT_PHOTO_GRID_WIDTH = Dimensions.get('window').width - 8;
const PHOTO_GRID_ITEM_PADDING = { padding: 2 };
const PHOTO_GRID_TILE_STYLE: ViewStyle = { flex: 1, overflow: 'hidden' };
const IOS_PHOTO_GRID_TILE_STYLE: ViewStyle | undefined =
  Platform.OS === 'ios' ? { borderRadius: 12 } : undefined;
const IOS_PHOTO_GRID_FRAME_STYLE: ViewStyle | undefined =
  Platform.OS === 'ios' ? { backgroundColor: 'transparent' } : undefined;

// â”€â”€ FeedCopy type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type FeedCopy = {
  filters: Array<{ source: FeedSource; label: string }>;
  reactionLabel: Record<ReactionType, string>;
  like: string;
  comment: string;
  share: string;
  viewDetails?: string;
  sharedPostLabel: (name: string) => string;
  publicLabel: string;
  userFallback: string;
  composerPlaceholder: string;
  library: string;
  tag: string;
  feeling: string;
  storiesTitle: string;
  seeAll: string;
  createStory: string;
  createStorySubtitle: string;
  greetingTitle: (name: string) => string;
  greetingBody: string;
  now: string;
  minutesAgo: (count: number) => string;
  hoursAgo: (count: number) => string;
  daysAgo: (count: number) => string;
  commentsCount: (count: number) => string;
  you: string;
  youAndOthers: (count: string) => string;
  feelingPrefix: string;
  photoCount: (count: number) => string;
  sponsored: string;
  adVideo: string;
  ad: string;
  sponsoredContent: string;
  learnMore: string;
  adLinkErrorTitle: string;
  adLinkErrorMessage: string;
  livePending: string;
  livePlaying: string;
  watchLive: string;
  liveTitle: (name: string) => string;
  sellerFallback: string;
  organizerFallback: string;
  eventFallback: string;
  employerFallback: string;
  jobFallback: string;
  salary: string;
  viewJob: string;
  negotiable: string;
  jobTypeFallback: string;
  suggestedGroupsTitle: string;
  suggestedGroupsSubtitle: string;
  groupFallback: string;
  privateLabel: string;
  viewGroup: string;
  suggestedPagesTitle: string;
  suggestedPagesSubtitle: string;
  pageFallback: string;
  viewPage: string;
  fundingTitle: string;
  fundingSubtitle: string;
  fundingFallback: string;
  fundingRaised: string;
  fundingGoal: string;
  viewFunding: string;
  productsTitle: string;
  savedTitle: string;
  savedMessage: string;
  unsavedTitle: string;
  unsavedMessage: string;
  errorTitle: string;
  saveErrorMessage: string;
  reportSentTitle: string;
  reportSentMessage: string;
  reportCancelledTitle: string;
  reportCancelledMessage: string;
  reportErrorMessage: string;
  editTitle: string;
  editEventMessage: (name: string) => string;
  commentSending: string;
  commentFailed: string;
  commentReply: string;
  commentLikesCount: (count: number) => string;
  loadingReplies: string;
  viewRepliesCount: (count: number) => string;
  commentRetry: string;
  replyingToText: (username: string) => string;
  loadingComments: string;
  noComments: string;
  beTheFirstComment: string;
  addCommentPlaceholder: string;
  writeReplyPlaceholder: string;
  closeCommentsAccessibility: string;
};

export const FEED_COPY: Record<AppLanguage, FeedCopy> = {
  vi: {
    filters: [
      { source: 'all', label: 'Tất cả bài viết' },
      { source: 'following', label: 'Người theo dõi' },
    ],
    reactionLabel: {
      like: 'Đã thích',
      love: 'Yêu thích',
      haha: 'Haha',
      wow: 'Wow',
      sad: 'Buồn',
      angry: 'Phẫn nộ',
    },
    like: 'Thích',
    comment: 'Bình luận',
    share: 'Chia sẻ',
    viewDetails: 'Xem chi tiết',
    sharedPostLabel: name => `đã chia sẻ bài viết của ${name}`,
    publicLabel: 'Công khai',
    userFallback: 'Người dùng',
    composerPlaceholder: 'Bạn đang nghĩ gì?',
    library: 'Thư viện',
    tag: 'Gắn thẻ',
    feeling: 'Cảm xúc',
    storiesTitle: 'Tin tức mới',
    seeAll: 'Xem tất cả',
    createStory: 'Tạo tin',
    createStorySubtitle: 'Chia sẻ khoảnh khắc của bạn',
    greetingTitle: name => `Chào buổi tối, ${name}`,
    greetingBody:
      'Buổi tối là cách cuộc sống nói rằng bạn đang gần hơn với giấc mơ của mình.',
    now: 'Vừa xong',
    minutesAgo: count => `${count} phút trước`,
    hoursAgo: count => `${count} giờ trước`,
    daysAgo: count => `${count} ngày trước`,
    commentsCount: count => `${formatCount(count)} bình luận`,
    you: 'Bạn',
    youAndOthers: count => `Bạn và ${count} người khác`,
    feelingPrefix: 'đang cảm thấy',
    photoCount: count => `${count} ảnh`,
    sponsored: 'Được tài trợ',
    adVideo: 'Quảng cáo video',
    ad: 'Quảng cáo',
    sponsoredContent: 'Nội dung được tài trợ',
    learnMore: 'Tìm hiểu thêm',
    adLinkErrorTitle: 'Lỗi',
    adLinkErrorMessage: 'Không mở được liên kết quảng cáo.',
    livePending: 'Đang chờ live',
    livePlaying: 'Đang phát trực tiếp',
    watchLive: 'Xem live',
    liveTitle: name => `${name} đang phát trực tiếp`,
    sellerFallback: 'Người bán',
    organizerFallback: 'Ban tổ chức',
    eventFallback: 'Sự kiện',
    employerFallback: 'Nhà tuyển dụng',
    jobFallback: 'Tin tuyển dụng',
    salary: 'Mức lương',
    viewJob: 'Xem việc làm',
    negotiable: 'Thỏa thuận',
    jobTypeFallback: 'Việc làm',
    suggestedGroupsTitle: 'Nhóm gợi ý cho bạn',
    suggestedGroupsSubtitle: 'Khám phá cộng đồng phù hợp trên VNSEEA',
    groupFallback: 'Nhóm',
    privateLabel: 'Riêng tư',
    viewGroup: 'Xem nhóm',
    suggestedPagesTitle: 'Trang gợi ý cho bạn',
    suggestedPagesSubtitle: 'Theo dõi các trang phù hợp trên VNSEEA',
    pageFallback: 'Trang',
    viewPage: 'Xem trang',
    fundingTitle: 'Gây quỹ nổi bật',
    fundingSubtitle: 'Các chiến dịch cộng đồng đang cần được ủng hộ',
    fundingFallback: 'Chiến dịch gây quỹ',
    fundingRaised: 'Đã góp',
    fundingGoal: 'Mục tiêu',
    viewFunding: 'Ủng hộ',
    productsTitle: 'Sản phẩm',
    savedTitle: 'Đã lưu',
    savedMessage: 'Bài viết đã được lưu vào mục đã lưu.',
    unsavedTitle: 'Đã bỏ lưu',
    unsavedMessage: 'Bài viết đã được xóa khỏi mục đã lưu.',
    errorTitle: 'Lỗi',
    saveErrorMessage: 'Không thể lưu bài viết. Vui lòng thử lại.',
    reportSentTitle: 'Đã gửi báo cáo',
    reportSentMessage:
      'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét bài viết này.',
    reportCancelledTitle: 'Đã hủy báo cáo',
    reportCancelledMessage: 'Báo cáo đã được xóa.',
    reportErrorMessage: 'Không thể gửi báo cáo. Vui lòng thử lại.',
    editTitle: 'Chỉnh sửa',
    editEventMessage: name =>
      `Tính năng chỉnh sửa sự kiện "${name}" đang được phát triển.`,
    commentSending: 'Đang gửi...',
    commentFailed: 'Không gửi được',
    commentReply: 'Phản hồi',
    commentLikesCount: count => `${formatCount(count)} thích`,
    loadingReplies: 'Đang tải phản hồi...',
    viewRepliesCount: count => `Xem ${formatCount(count)} phản hồi`,
    commentRetry: 'Thử lại',
    replyingToText: username => `Đang phản hồi @${username}`,
    loadingComments: 'Đang tải bình luận...',
    noComments: 'Chưa có bình luận',
    beTheFirstComment: 'Hãy là người đầu tiên bình luận.',
    addCommentPlaceholder: 'Thêm bình luận...',
    writeReplyPlaceholder: 'Viết phản hồi...',
    closeCommentsAccessibility: 'Đóng bình luận',
  },
  en: {
    filters: [
      { source: 'all', label: 'All posts' },
      { source: 'following', label: 'Following' },
    ],
    reactionLabel: {
      like: 'Liked',
      love: 'Love',
      haha: 'Haha',
      wow: 'Wow',
      sad: 'Sad',
      angry: 'Angry',
    },
    like: 'Like',
    comment: 'Comment',
    share: 'Share',
    viewDetails: 'View details',
    sharedPostLabel: name => `shared ${name}'s post`,
    publicLabel: 'Public',
    userFallback: 'User',
    composerPlaceholder: "What's on your mind?",
    library: 'Library',
    tag: 'Tag',
    feeling: 'Feeling',
    storiesTitle: 'Latest stories',
    seeAll: 'See all',
    createStory: 'Create story',
    createStorySubtitle: 'Share your moment',
    greetingTitle: name => `Good evening, ${name}`,
    greetingBody:
      'Evening is life saying you are getting closer to your dreams.',
    now: 'Just now',
    minutesAgo: count => `${count} min ago`,
    hoursAgo: count => `${count} h ago`,
    daysAgo: count => `${count} d ago`,
    commentsCount: count => `${formatCount(count)} comments`,
    you: 'You',
    youAndOthers: count => `You and ${count} others`,
    feelingPrefix: 'is feeling',
    photoCount: count => `${count} photos`,
    sponsored: 'Sponsored',
    adVideo: 'Video ad',
    ad: 'Ad',
    sponsoredContent: 'Sponsored content',
    learnMore: 'Learn more',
    adLinkErrorTitle: 'Error',
    adLinkErrorMessage: 'Could not open ad link.',
    livePending: 'Waiting for live',
    livePlaying: 'Live now',
    watchLive: 'Watch live',
    liveTitle: name => `${name} is live`,
    sellerFallback: 'Seller',
    organizerFallback: 'Organizer',
    eventFallback: 'Event',
    employerFallback: 'Employer',
    jobFallback: 'Job post',
    salary: 'Salary',
    viewJob: 'View job',
    negotiable: 'Negotiable',
    jobTypeFallback: 'Job',
    suggestedGroupsTitle: 'Suggested groups for you',
    suggestedGroupsSubtitle: 'Discover communities that fit you on VNSEEA',
    groupFallback: 'Group',
    privateLabel: 'Private',
    viewGroup: 'View group',
    suggestedPagesTitle: 'Suggested pages for you',
    suggestedPagesSubtitle: 'Follow relevant pages on VNSEEA',
    pageFallback: 'Page',
    viewPage: 'View page',
    fundingTitle: 'Featured fundraisers',
    fundingSubtitle: 'Community campaigns that need support',
    fundingFallback: 'Fundraising campaign',
    fundingRaised: 'Raised',
    fundingGoal: 'Goal',
    viewFunding: 'Donate',
    productsTitle: 'Products',
    savedTitle: 'Saved',
    savedMessage: 'Post has been saved.',
    unsavedTitle: 'Removed',
    unsavedMessage: 'Post has been removed from saved items.',
    errorTitle: 'Error',
    saveErrorMessage: 'Could not save this post. Please try again.',
    reportSentTitle: 'Report sent',
    reportSentMessage: 'Thanks for reporting. We will review this post.',
    reportCancelledTitle: 'Report cancelled',
    reportCancelledMessage: 'The report has been removed.',
    reportErrorMessage: 'Could not send report. Please try again.',
    editTitle: 'Edit',
    editEventMessage: name => `Editing event "${name}" is under development.`,
    commentSending: 'Sending...',
    commentFailed: 'Failed to send',
    commentReply: 'Reply',
    commentLikesCount: count => `${formatCount(count)} likes`,
    loadingReplies: 'Loading replies...',
    viewRepliesCount: count => `View ${formatCount(count)} replies`,
    commentRetry: 'Retry',
    replyingToText: username => `Replying to @${username}`,
    loadingComments: 'Loading comments...',
    noComments: 'No comments yet',
    beTheFirstComment: 'Be the first to comment.',
    addCommentPlaceholder: 'Add a comment...',
    writeReplyPlaceholder: 'Write a reply...',
    closeCommentsAccessibility: 'Close comments',
  },
};
// Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function formatCount(count: number) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function formatPostTime(timestamp: number | undefined, copy: FeedCopy) {
  if (!timestamp) return copy.now;
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);
  if (diff < 60) return copy.now;
  if (diff < 3600) return copy.minutesAgo(Math.floor(diff / 60));
  if (diff < 86400) return copy.hoursAgo(Math.floor(diff / 3600));
  if (diff < 604800) return copy.daysAgo(Math.floor(diff / 86400));
  return new Date(timestamp * 1000).toLocaleDateString(
    copy === FEED_COPY.vi ? 'vi-VN' : 'en-US',
  );
}

type FeedActiveVideoListener = (activeVideoId: string | null) => void;
type FeedScrollBusyListener = (isBusy: boolean) => void;

export let feedActiveVideoIdSnapshot: string | null = null;
const feedActiveVideoListeners = new Set<FeedActiveVideoListener>();
let feedScrollBusySnapshot = false;
const feedScrollBusyListeners = new Set<FeedScrollBusyListener>();

export function publishFeedActiveVideo(videoId: string | null) {
  if (feedActiveVideoIdSnapshot === videoId) return;
  feedActiveVideoIdSnapshot = videoId;
  feedActiveVideoListeners.forEach(listener => listener(videoId));
}

function useFeedVideoActivity(videoId: string) {
  const [isActive, setIsActive] = useState(
    () => feedActiveVideoIdSnapshot === videoId,
  );

  useEffect(() => {
    const listener: FeedActiveVideoListener = nextVideoId => {
      const nextIsActive = nextVideoId === videoId;
      setIsActive(prev => (prev === nextIsActive ? prev : nextIsActive));
    };

    feedActiveVideoListeners.add(listener);
    const nextIsActive = feedActiveVideoIdSnapshot === videoId;
    setIsActive(prev => (prev === nextIsActive ? prev : nextIsActive));

    return () => {
      feedActiveVideoListeners.delete(listener);
    };
  }, [videoId]);

  return isActive;
}

export function publishFeedScrollBusy(isBusy: boolean) {
  if (feedScrollBusySnapshot === isBusy) return;
  feedScrollBusySnapshot = isBusy;
  feedScrollBusyListeners.forEach(listener => listener(isBusy));
}

export function useFeedScrollBusy() {
  const [isBusy, setIsBusy] = useState(feedScrollBusySnapshot);

  useEffect(() => {
    const listener: FeedScrollBusyListener = nextIsBusy => {
      setIsBusy(prev => (prev === nextIsBusy ? prev : nextIsBusy));
    };

    feedScrollBusyListeners.add(listener);
    setIsBusy(prev =>
      prev === feedScrollBusySnapshot ? prev : feedScrollBusySnapshot,
    );

    return () => {
      feedScrollBusyListeners.delete(listener);
    };
  }, []);

  return isBusy;
}

const Avatar = React.memo(function Avatar({
  uri,
  size = 40,
}: {
  uri: string;
  size?: number;
}) {
  const source = useMemo(() => ({ uri }), [uri]);
  const style = useMemo(() => ({ height: size, width: size }), [size]);

  return (
    <Image
      source={source}
      style={style}
      className="rounded-full"
      resizeMode="cover"
      fadeDuration={0}
    />
  );
});

type FeedMediaImageProps = {
  uri: string;
  className?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageProps['resizeMode'];
  deferWhileScrolling?: boolean;
};

const FEED_MEDIA_PLACEHOLDER_STYLE = { backgroundColor: '#E5E7EB' };

const FeedMediaImage = React.memo(function FeedMediaImage({
  uri,
  className,
  style,
  resizeMode = 'cover',
  deferWhileScrolling = true,
}: FeedMediaImageProps) {
  const isScrollBusy = useFeedScrollBusy();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setHasLoaded(false);
  }, [uri]);

  if (deferWhileScrolling && isScrollBusy && !hasLoaded) {
    return (
      <View
        className={className}
        style={[style, FEED_MEDIA_PLACEHOLDER_STYLE]}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      className={className}
      style={style}
      resizeMode={resizeMode}
      fadeDuration={0}
      resizeMethod="resize"
      progressiveRenderingEnabled
      onLoad={() => setHasLoaded(true)}
    />
  );
});

// Background colors for each reaction type's circular badge (FB-style)
const REACTION_BADGE_BG: Record<ReactionType, string> = {
  like: '#0866FF',
  love: '#F33E58',
  haha: '#F7B125',
  wow: '#F7B125',
  sad: '#F7B125',
  angry: '#E9710F',
};

// â”€â”€ PhotoViewerModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€ Post sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VideoReactionSummary = React.memo(function VideoReactionSummary({
  postId,
  likeCount,
  commentCount,
  myReaction,
  topReactions,
  copy,
  post,
  onOpenReactions,
}: {
  postId: string;
  likeCount: number;
  commentCount: number;
  myReaction: ReactionType | null;
  topReactions: ReactionType[];
  copy: FeedCopy;
  post?: FeedPost;
  /**
   * Opens the "who reacted" bottom sheet at the parent screen level.
   * Passed down from the owning screen (FeedScreen, ProfileScreen, etc.)
   * so the sheet can be hosted centrally instead of each card owning its
   * own modal — same pattern used by `ReelCommentsSheet` host screens.
   */
  onOpenReactions?: (postId: string, post: FeedPost) => void;
}) {
  // The sheet is hosted by the parent screen — we no longer navigate.

  // Don't render the row at all if nobody has reacted AND there are no
  // comments â€” keeps simple posts visually quiet, FB-style.
  if (likeCount <= 0 && commentCount <= 0) return null;

  const othersCount = myReaction ? Math.max(0, likeCount - 1) : likeCount;
  const summaryLeft = (() => {
    if (myReaction && othersCount > 0) {
      return copy.youAndOthers(formatCount(othersCount));
    }
    if (myReaction) {
      return copy.you;
    }
    if (likeCount > 0) {
      return formatCount(likeCount);
    }
    return '';
  })();

  const handleOpenReactions = useCallback(() => {
    if (!postId) return;
    // Defer to the parent — it owns the bottom-sheet modal so a single
    // sheet instance is shared across the visible post list. Falls back
    // to no-op if a caller forgets to wire the prop.
    if (onOpenReactions && post) {
      onOpenReactions(postId, post);
    }
  }, [onOpenReactions, postId, post]);

  return (
    <View className="mb-4 flex-row items-center justify-between">
      {/* Left: stacked reaction badges + label (Tappable to open reactions list) */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleOpenReactions}
        disabled={likeCount <= 0}
        className="mr-2 flex-1 flex-row items-center"
      >
        {likeCount > 0 ? (
          <>
            {/* Facebook-style stacked emoji badges â€” each badge overlaps
                the previous one by ~6px, with z-index decreasing so the
                first (most popular) reaction sits on top. */}
            <View style={{ flexDirection: 'row' }}>
              {topReactions.map((type, index) => (
                <View
                  key={type}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: '#FFFFFF',
                    marginLeft: index > 0 ? -6 : 0,
                    zIndex: topReactions.length - index,
                  }}
                >
                  <Image
                    source={REACTION_IMAGES[type]}
                    style={{ width: 18, height: 18 }}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </View>
            <Text
              className="ml-2 text-caption-secondary"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {summaryLeft}
            </Text>
          </>
        ) : null}
      </TouchableOpacity>
      {/* Right: comment count */}
      {commentCount > 0 ? (
        <Text className="text-caption-secondary" numberOfLines={1}>
          {copy.commentsCount(commentCount)}
        </Text>
      ) : null}
    </View>
  );
});

const VideoPostActions = React.memo(function VideoPostActions({
  myReaction,
  copy,
  likeButtonRef,
  onLikeTap,
  onLikeLongPress,
  onCommentTap,
  onShare,
  post,
  gestureX,
  gestureY,
  gestureActive,
  gestureStartX,
  gestureStartY,
  hasDragged,
}: {
  myReaction: ReactionType | null;
  copy: FeedCopy;
  likeButtonRef: React.RefObject<View | null>;
  onLikeTap: () => void;
  onLikeLongPress: () => void;
  onCommentTap: () => void;
  onShare?: (post: FeedPost) => void;
  post: FeedPost;
  gestureX: any;
  gestureY: any;
  gestureActive: any;
  gestureStartX: any;
  gestureStartY: any;
  hasDragged: any;
}) {
  const label = myReaction ? copy.reactionLabel[myReaction] : copy.like;
  const color = myReaction ? REACTION_COLOR[myReaction] : '#64748B';

  // Like button: a plain TouchableOpacity with native `onPress` (fast tap
  // â†’ like) and `onLongPress` (â‰¥400ms â†’ opens the floating reaction
  // picker). This is the SAME pattern Reels and Stories use (see
  // `ReelItem.RailButton`) â€” it works because React Native's pressable
  // system handles tap and long-press natively without the race
  // conditions that plagued our earlier `GestureDetector` wraps.
  //
  // v4 history (do not revert): we previously tried
  //   - Gesture.Exclusive(pan, tap)            â€” long-press won fast taps
  //   - transparent overlay with pointerEvents â€” overlay swallowed taps
  //   - GestureDetector wrap + delayPressIn    â€” Pan lost race with TO
  //   - Gesture.LongPress wrap                 â€” still no claim win
  // Native TouchableOpacity.onLongPress is the only reliable answer.
  //
  // We also call `setIsLikeLongPressing` so the parent can move the
  // picker (FB-style drag-to-pick) while the finger is held. For
  // the v4 minimal fix we just open the picker; the parent already
  // drives the drag highlight via the same `onLikeLongPress` prop.
  return (
    <FeedGlassActionBar>
      <FeedGlassActionButton
        ref={likeButtonRef as any}
        accessibilityRole="button"
        accessibilityLabel="like"
        activeOpacity={0.6}
        onPress={onLikeTap}
        onLongPress={onLikeLongPress}
        delayLongPress={400}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {myReaction ? (
          <Image
            source={REACTION_IMAGES[myReaction]}
            style={{ width: 20, height: 20 }}
            resizeMode="contain"
          />
        ) : (
          <ThumbsUp size={19} color={color} />
        )}
        <Text
          style={{
            marginLeft: 6,
            color,
            fontWeight: myReaction ? '700' : '600',
            fontSize: 14,
          }}
        >
          {label}
        </Text>
      </FeedGlassActionButton>

      <FeedGlassActionButton
        activeOpacity={0.75}
        onPress={onCommentTap}
      >
        <MessageCircle size={19} color="#64748B" />
        <Text style={{ marginLeft: 6, color: '#64748B', fontSize: 14 }}>
          {copy.comment}
        </Text>
      </FeedGlassActionButton>

      <FeedGlassActionButton
        activeOpacity={0.75}
        onPress={() => onShare?.(post)}
      >
        <Share2 size={19} color="#64748B" />
        <Text style={{ marginLeft: 6, color: '#64748B', fontSize: 14 }}>
          {copy.share}
        </Text>
      </FeedGlassActionButton>
    </FeedGlassActionBar>
  );
});

// â”€â”€ ReactionPickerOverlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function ReactionPickerOverlay({
  anchor,
  onPick,
  onDismiss,
  gestureX,
  gestureY,
  gestureActive,
  hasDragged,
}: {
  anchor: { postId: string; x: number; y: number } | null;
  onPick: (reaction: ReactionType) => void;
  onDismiss: () => void;
  gestureX: any;
  gestureY: any;
  gestureActive: any;
  hasDragged?: any;
}) {
  const localDragged = useSharedValue(false);
  const gDragged = hasDragged ?? localDragged;

  if (!anchor) return null;

  const screenWidth = Dimensions.get('window').width;
  const left = Math.max(
    10,
    Math.min(anchor.x - PICKER_WIDTH / 2, screenWidth - PICKER_WIDTH - 10),
  );
  const top = Math.max(40, anchor.y - PICKER_HEIGHT - PICKER_GAP);

  // Clamp the arrow pointer's horizontal position so it stays within the rounded rectangle boundaries
  const arrowLeft = Math.max(
    left + 20,
    Math.min(anchor.x - 8, left + PICKER_WIDTH - 20 - 16),
  );

  return (
    <>
      <Pressable
        onPress={onDismiss}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99,
          backgroundColor: 'transparent',
        }}
      />
      <FeedReactionPickerPointer
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: arrowLeft,
          top: top + PICKER_HEIGHT - 8,
          width: 16,
          height: 16,
          transform: [{ rotate: '45deg' }],
          elevation: 12,
          zIndex: 99,
        }}
      />
      <FeedReactionPickerSurface
        style={{
          position: 'absolute',
          left,
          top,
          width: PICKER_WIDTH,
          height: PICKER_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 8,
          elevation: 12,
          zIndex: 100,
        }}
        pointerEvents="box-none"
      >
        {ALL_REACTION_TYPES.map((type, index) => (
          <ReactionIcon
            key={type}
            type={type}
            index={index}
            pickerLeft={left}
            pickerTop={top}
            gestureX={gestureX}
            gestureY={gestureY}
            gestureActive={gestureActive}
            hasDragged={gDragged}
            onPick={onPick}
            onDismiss={onDismiss}
          />
        ))}
      </FeedReactionPickerSurface>
    </>
  );
}

function ReactionIcon({
  type,
  index,
  pickerLeft,
  pickerTop,
  gestureX,
  gestureY,
  gestureActive,
  hasDragged,
  onPick,
  onDismiss,
}: {
  type: ReactionType;
  index: number;
  pickerLeft: number;
  pickerTop: number;
  gestureX: any;
  gestureY: any;
  gestureActive: any;
  hasDragged: any;
  onPick: (reaction: ReactionType) => void;
  onDismiss: () => void;
}) {
  // Approximate center of this icon in absolute screen coordinates
  const iconCenterX = pickerLeft + 8 + index * 44 + 20;
  const iconCenterY = pickerTop + PICKER_HEIGHT / 2;

  useAnimatedReaction(
    () => [gestureActive.value, hasDragged.value] as const,
    (next, previous) => {
      const [isActive, dragged] = next;
      const prevActive = previous ? previous[0] : false;
      // Calculate which icon is hovered on release
      if (prevActive && !isActive) {
        const dx = gestureX.value - iconCenterX;
        const dy = gestureY.value - iconCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
          runOnJS(onPick)(type);
        } else if (dragged && index === 0) {
          // Only dismiss if they dragged and released outside
          runOnJS(onDismiss)();
        }
      }
    },
  );

  const style = useAnimatedStyle(() => {
    if (!gestureActive.value)
      return { transform: [{ scale: 1 }, { translateY: 0 }] };

    const dx = gestureX.value - iconCenterX;
    const dy = gestureY.value - iconCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const scale = interpolate(
      dist,
      [0, 40, 60],
      [1.5, 1.1, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      dist,
      [0, 40, 60],
      [-15, -5, 0],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { scale: withSpring(scale, { damping: 15 }) },
        { translateY: withSpring(translateY, { damping: 15 }) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={() => onPick(type)}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      >
        <Image
          source={REACTION_IMAGES[type]}
          style={{ width: 36, height: 36 }}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// â”€â”€ HomeVideoPostCard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const HomeVideoPostCard = React.memo(function HomeVideoPostCard({
  post,
  copy: providedCopy,
  onReact,
  onOpenPicker,
  onCommentTap,
  onShare,
  onOpenReactions,
  isActive: controlledIsActive,
  gestureX,
  gestureY,
  gestureActive,
  gestureStartX,
  gestureStartY,
  hasDragged,
  navigateToProfile,
  onOpenPostMenu,
}: {
  post: FeedVideoPost;
  copy?: FeedCopy;
  onReact: (postId: string, reaction: ReactionType) => void;
  onOpenPicker: (postId: string, x: number, y: number) => void;
  onCommentTap: (postId: string) => void;
  onShare?: (post: FeedPost) => void;
  /**
   * Tapping the reaction-summary row opens the "who reacted" bottom
   * sheet hosted by the parent screen. We forward it down to
   * `VideoReactionSummary` so the card doesn't need to navigate on
   * its own (avoids stacking a Modal inside a Modal).
   */
  onOpenReactions?: (postId: string, post: FeedPost) => void;
  isActive?: boolean;
  gestureX?: any;
  gestureY?: any;
  gestureActive?: any;
  gestureStartX?: any;
  gestureStartY?: any;
  hasDragged?: any;
  navigateToProfile: (userId: string) => void;
  onOpenPostMenu?: (post: FeedPost) => void;
}) {
  const language = useAppLanguage();
  const copy = providedCopy ?? FEED_COPY[language];
  const localX = useSharedValue(0);
  const localY = useSharedValue(0);
  const localActive = useSharedValue(false);
  const localStartX = useSharedValue(0);
  const localStartY = useSharedValue(0);
  const localDragged = useSharedValue(false);

  const gX = gestureX ?? localX;
  const gY = gestureY ?? localY;
  const gActive = gestureActive ?? localActive;
  const gStartX = gestureStartX ?? localStartX;
  const gStartY = gestureStartY ?? localStartY;
  const gDragged = hasDragged ?? localDragged;

  const navigation = useNavigation<any>();
  const trackedIsActive = useFeedVideoActivity(post.id);
  const isActive = controlledIsActive ?? trackedIsActive;
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(16 / 9); // Default landscape
  const currentTimeRef = useRef<number>(0);

  // Measure thumbnail size on mount to avoid layout jumps
  useEffect(() => {
    if (post.thumbnailUrl) {
      console.log(`[HomeVideoPostCard] Fetching size for thumbnail: ${post.thumbnailUrl}`);
      Image.getSize(
        post.thumbnailUrl,
        (width, height) => {
          if (width > 0 && height > 0) {
            const ratio = width / height;
            // Clamp aspect ratio: portrait 3:4 (0.75) → landscape 16:9 (1.78)
            const clampedRatio = Math.max(0.75, Math.min(16 / 9, ratio));
            console.log(`[HomeVideoPostCard] Thumbnail loaded: ${width}x${height}, ratio: ${ratio}, clamped: ${clampedRatio}`);
            setAspectRatio(clampedRatio);
          }
        },
        (err) => {
          console.warn('[HomeVideoPostCard] getSize failed for thumbnail:', err);
        }
      );
    }
  }, [post.thumbnailUrl]);

  // Refine aspect ratio when actual video loads
  const handleVideoLoad = useCallback((data: any) => {
    console.log('[HomeVideoPostCard] Video onLoad triggered, data:', data);
    const size = data?.naturalSize ?? data;
    if (size) {
      const { width, height } = size;
      if (width > 0 && height > 0) {
        const ratio = width / height;
        const clampedRatio = Math.max(0.75, Math.min(16 / 9, ratio));
        console.log(`[HomeVideoPostCard] Video size loaded: ${width}x${height}, ratio: ${ratio}, clamped: ${clampedRatio}`);
        setAspectRatio(clampedRatio);
      }
    }
  }, []);

  // Profile tap handler
  const handleProfilePress = useCallback(() => {
    if (post.publisher.id) {
      navigateToProfile(post.publisher.id);
    }
  }, [navigateToProfile, post.publisher.id]);

  const handleVideoPress = useCallback(() => {
    // Immediately mute/pause the video on home feed before navigating
    setMuted(true);
    setManuallyPaused(true);

    // `source: 'home'` tells ReelsScreen where the user came from so
    // the back button can return to this exact list (instead of
    // jumping to the Feed tab). HomeVideoPostCard is also reused
    // inside PageDetailScreen, but the back FAB on Reels already
    // does a `goBack()` first which pops the actual stack — so
    // 'home' is a safe default even when the card is rendered inside
    // a different surface.
    navigateToReels(navigation, {
      initialVideoId: post.id,
      post,
      source: 'home',
      seekTime: currentTimeRef.current,
    });
  }, [navigation, post]);

  // â”€â”€ Mount strategy â€” keep player alive, just pause â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //
  // Keep VideoPlayer mounted while active (even when paused) â€” avoids the
  // expensive ExoPlayer init/teardown cycle that causes frame drops on scroll.
  const shouldMountVideo = isActive;
  // Home feed video is muted by default. Users can opt into sound with the
  // volume button, and we reset to muted once the card scrolls away.
  useEffect(() => {
    if (!isActive) {
      setManuallyPaused(false);
      setMuted(false);
    }
  }, [isActive]);

  const playing = isActive && !manuallyPaused;
  const videoSource = useMemo(() => ({ uri: post.videoUrl }), [post.videoUrl]);

  // Need an on-screen position for the "ThĂ­ch" button so the picker
  // anchors above it (matches the Facebook web/mobile pattern).
  const likeButtonRef = useRef<View>(null);

  const handleLikeTap = useCallback(() => {
    // Default reaction is 'like' â€” same as Facebook. Tapping again clears
    // it (the view-model handles the toggle-off).
    onReact(post.id, 'like');
  }, [onReact, post.id]);

  const handleCommentTap = useCallback(() => {
    onCommentTap(post.id);
  }, [onCommentTap, post.id]);

  const handleLikeLongPress = useCallback(() => {
    if (!likeButtonRef.current) {
      onOpenPicker(post.id, 100, 200);
      return;
    }
    likeButtonRef.current.measureInWindow((x, y, width) => {
      onOpenPicker(post.id, x + width / 2, y);
    });
  }, [onOpenPicker, post.id]);

  return (
    <FeedCardSurface>
      <FeedCardContent>
        <PostHeader
          avatar={post.publisher.avatarUrl}
          name={post.publisher.name}
          time={formatPostTime(post.postedAt, copy)}
          copy={copy}
          onPress={post.publisher.id ? handleProfilePress : undefined}
          onMorePress={onOpenPostMenu}
          post={post}
        />
        {post.sharedFrom ? (
          <Text className="-mt-3 mb-3 text-caption-secondary">
            {copy.sharedPostLabel(post.sharedFrom.publisherName)}
          </Text>
        ) : null}
        {post.caption ? (
          <Text className="text-body-primary">{post.caption}</Text>
        ) : null}
      </FeedCardContent>
      <FeedMediaFrame style={{ aspectRatio }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleVideoPress}
          style={{ width: '100%', height: '100%' }}
        >
          {/* react-native-video v6 â€” unmount when inactive to release native decoders */}
          {shouldMountVideo ? (
            <View pointerEvents="none" style={{ width: '100%', height: '100%' }}>
              <VideoPlayer
                source={videoSource}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                paused={!playing}
                controls={false}
                muted={muted}
                repeat
                ignoreSilentSwitch="ignore"
                playInBackground={false}
                playWhenInactive={false}
                useTextureView={false}
                bufferConfig={VIDEO_BUFFER_CONFIG}
                onLoad={handleVideoLoad}
                onProgress={data => {
                  currentTimeRef.current = data.currentTime;
                }}
                onError={error => {
                  console.warn(
                    '[HomeVideoPostCard] video error',
                    post.id,
                    post.videoUrl,
                    error,
                  );
                }}
              />
            </View>
          ) : post.thumbnailUrl ? (
            <FeedMediaImage
              uri={post.thumbnailUrl}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : null}
          {/* Big play button overlay while paused */}
          {!playing ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 26, marginLeft: 4 }}>
                  {'\u25B6'}
                </Text>
              </View>
            </View>
          ) : null}
          {/* Mute toggle â€” top-right when playing */}
          {playing ? (
            <TouchableOpacity
              onPress={() => setMuted(m => !m)}
              activeOpacity={0.85}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.45)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16 }}>
                {muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      </FeedMediaFrame>
      <FeedCardContent>
        <VideoReactionSummary
          postId={post.id}
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          myReaction={post.myReaction}
          topReactions={post.topReactions}
          copy={copy}
          post={post}
          onOpenReactions={onOpenReactions}
        />
        <VideoPostActions
          myReaction={post.myReaction}
          copy={copy}
          likeButtonRef={likeButtonRef}
          onLikeTap={handleLikeTap}
          onLikeLongPress={handleLikeLongPress}
          onCommentTap={handleCommentTap}
          onShare={onShare}
          post={post}
          gestureX={gX}
          gestureY={gY}
          gestureActive={gActive}
          gestureStartX={gStartX}
          gestureStartY={gStartY}
          hasDragged={gDragged}
        />
      </FeedCardContent>
    </FeedCardSurface>
  );
});

// â”€â”€ PostHeader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PostHeader = React.memo(function PostHeader({
  avatar,
  name,
  time,
  copy,
  badge,
  onPress,
  onMorePress,
  onDetailPress,
  post,
}: {
  avatar?: string;
  name: string;
  time: string;
  copy: FeedCopy;
  badge?: string;
  onPress?: () => void;
  onMorePress?: (post: FeedPost) => void;
  onDetailPress?: (post: FeedPost) => void;
  post?: FeedPost;
}) {
  const handleMorePress = useCallback(() => {
    if (post) {
      onMorePress?.(post);
    }
  }, [onMorePress, post]);

  const handleDetailPress = useCallback(() => {
    if (post) {
      onDetailPress?.(post);
    }
  }, [onDetailPress, post]);

  return (
    <View className="mb-4 flex-row items-center justify-between">
      <TouchableOpacity
        className="flex-row items-center"
        activeOpacity={0.8}
        onPress={onPress}
        disabled={!onPress}
      >
        {avatar ? (
          <Avatar uri={avatar} />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-600">
            <ShoppingBag size={20} color="#FFFFFF" />
          </View>
        )}
        <View className="ml-3">
          <View className="flex-row items-center">
            <Text className="text-title-primary">{name}</Text>
            {badge ? (
              <Text className="surface-muted ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                {badge}
              </Text>
            ) : null}
          </View>
          <Text className="text-caption-secondary">
            {time} {'\u2022'} {copy.publicLabel}
          </Text>
          {onDetailPress && post ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDetailPress}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              className="mt-1 self-start"
            >
              <Text className="text-caption-primary text-brand">
                {copy.viewDetails ?? 'Xem chi tiết'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
      {onMorePress && post && (
        <TouchableOpacity
          onPress={handleMorePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MoreHorizontal size={22} color="#94A3B8" />
        </TouchableOpacity>
      )}
    </View>
  );
});

const SinglePostImage = React.memo(function SinglePostImage({
  uri,
  onPress,
}: {
  uri: string;
  onPress: () => void;
}) {
  const [aspectRatio, setAspectRatio] = useState(4 / 3);

  useEffect(() => {
    if (!uri) return;
    Image.getSize(
      uri,
      (width, height) => {
        if (width > 0 && height > 0) {
          const ratio = width / height;
          // Clamp aspect ratio to resemble Facebook:
          // Facebook caps portrait to 4:5 (0.8) and landscape to 1.91:1
          const clampedRatio = Math.max(0.75, Math.min(1.91, ratio));
          setAspectRatio(clampedRatio);
        }
      },
      (err) => {
        console.warn('[SinglePostImage] getSize failed', err);
      },
    );
  }, [uri]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.95} delayPressIn={0}>
      <FeedMediaImage
        uri={uri}
        style={{
          width: '100%',
          aspectRatio,
          backgroundColor: '#F1F5F9',
        }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
});

// ── TextPostCard ──────────────────────────────────────────────────────
export const TextPostCard = React.memo(function TextPostCard({
  post,
  copy: providedCopy,
  onReact,
  onOpenPicker,
  onCommentTap,
  onPhotoPress,
  onShare,
  onOpenReactions,
  gestureX,
  gestureY,
  gestureActive,
  gestureStartX,
  gestureStartY,
  hasDragged,
  navigateToProfile,
  onOpenPostMenu,
  onPostPress,
}: {
  post: FeedTextPost;
  copy?: FeedCopy;
  onReact: (postId: string, reaction: ReactionType) => void;
  onOpenPicker: (postId: string, x: number, y: number) => void;
  onCommentTap: (postId: string) => void;
  onPhotoPress: (post: FeedTextPost, photoIndex: number) => void;
  onShare?: (post: FeedPost) => void;
  /**
   * Tapping the reaction-summary row opens the "who reacted" bottom
   * sheet hosted by the parent screen. Forwarded down to
   * `VideoReactionSummary` so the card itself stays navigation-free.
   */
  onOpenReactions?: (postId: string, post: FeedPost) => void;
  // Reanimated shared values for the FB-style drag-to-pick reaction
  // picker. Threaded through `VideoPostActions` so the long-press +
  // pan gesture can update them and `ReactionIcon` can react to the
  // movement. `any` typing matches Antigravity's existing convention.
  gestureX?: any;
  gestureY?: any;
  gestureActive?: any;
  gestureStartX?: any;
  gestureStartY?: any;
  hasDragged?: any;
  navigateToProfile: (userId: string) => void;
  onOpenPostMenu?: (post: FeedPost) => void;
  /**
   * Tapping the post header / body opens the dedicated PostDetail
   * screen. We intentionally keep this separate from `onCommentTap`
   * (which only opens the comments sheet) so users can still peek
   * at comments inline without leaving the feed.
   */
  onPostPress?: (post: FeedPost) => void;
}) {
  const language = useAppLanguage();
  const copy = providedCopy ?? FEED_COPY[language];
  const localX = useSharedValue(0);
  const localY = useSharedValue(0);
  const localActive = useSharedValue(false);
  const localStartX = useSharedValue(0);
  const localStartY = useSharedValue(0);
  const localDragged = useSharedValue(false);

  const gX = gestureX ?? localX;
  const gY = gestureY ?? localY;
  const gActive = gestureActive ?? localActive;
  const gStartX = gestureStartX ?? localStartX;
  const gStartY = gestureStartY ?? localStartY;
  const gDragged = hasDragged ?? localDragged;
  const likeButtonRef = useRef<View>(null);

  // Profile tap handler
  const handleProfilePress = useCallback(() => {
    if (post.publisher.id) {
      navigateToProfile(post.publisher.id);
    }
  }, [navigateToProfile, post.publisher.id]);

  const handleLikeTap = useCallback(
    () => onReact(post.id, 'like'),
    [onReact, post.id],
  );
  const handleCommentTap = useCallback(() => {
    onCommentTap(post.id);
  }, [onCommentTap, post.id]);

  const handleLikeLongPress = useCallback(() => {
    if (!likeButtonRef.current) {
      onOpenPicker(post.id, 100, 200);
      return;
    }
    likeButtonRef.current.measureInWindow((x, y, width) => {
      onOpenPicker(post.id, x + width / 2, y);
    });
  }, [onOpenPicker, post.id]);

  // Photo grid: Facebook-style 2x2 grid, shows 4 photos max
  // When total > 4, the 4th photo shows "+N" overlay
  const totalPhotos = post.photos.length;
  const displayedPhotos = post.photos.slice(0, 4);
  const hasMorePhotos = totalPhotos > 4;
  const [photoGridWidth, setPhotoGridWidth] = useState(
    DEFAULT_PHOTO_GRID_WIDTH,
  );
  const handlePhotoGridLayout = useCallback((event: LayoutChangeEvent) => {
    if (Platform.OS !== 'ios') return;

    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth <= 0) return;

    setPhotoGridWidth(previousWidth =>
      Math.abs(previousWidth - nextWidth) < 0.5 ? previousWidth : nextWidth,
    );
  }, []);

  return (
    <FeedCardSurface>
      <FeedCardContent>
        <PostHeader
          avatar={post.publisher.avatarUrl}
          name={post.publisher.name}
          time={`${formatPostTime(post.postedAt, copy)} (${copy.photoCount(
            totalPhotos,
          )})`}
          copy={copy}
          onPress={post.publisher.id ? handleProfilePress : undefined}
          onMorePress={onOpenPostMenu}
          onDetailPress={onPostPress}
          post={post}
        />
        {post.sharedFrom ? (
          <Text className="-mt-3 mb-3 text-caption-secondary">
            {copy.sharedPostLabel(post.sharedFrom.publisherName)}
          </Text>
        ) : null}
        {post.caption ? (
          <Text className="text-body-primary">{post.caption}</Text>
        ) : null}
        {post.feeling ? (
          <Text className="mt-1 text-caption-secondary">
            {copy.feelingPrefix} {post.feeling.label ?? post.feeling.value}{' '}
            {post.feeling.emoji ?? ''}
          </Text>
        ) : null}
      </FeedCardContent>
      {totalPhotos === 1 ? (
        <FeedMediaFrame className="bg-transparent">
          <SinglePostImage
            uri={post.photos[0]}
            onPress={() => onPhotoPress(post, 0)}
          />
        </FeedMediaFrame>
      ) : totalPhotos > 1 ? (
        <FeedMediaFrame
          className="flex-row flex-wrap bg-transparent"
          onLayout={handlePhotoGridLayout}
          style={IOS_PHOTO_GRID_FRAME_STYLE}
        >
          {displayedPhotos.map((url, index) => {
            // Show "+N" overlay on the 4th photo when there are more photos
            const isFourthPhotoWithMore = index === 3 && hasMorePhotos;
            const photoLayout = getPhotoGridItemLayout(
              index,
              totalPhotos,
              photoGridWidth,
            );

            return (
              <TouchableOpacity
                key={url}
                onPress={() => onPhotoPress(post, index)}
                activeOpacity={0.95}
                delayPressIn={0}
                style={[photoLayout, PHOTO_GRID_ITEM_PADDING]}
              >
                <View
                  style={[PHOTO_GRID_TILE_STYLE, IOS_PHOTO_GRID_TILE_STYLE]}
                >
                  <FeedMediaImage
                    uri={url}
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#F1F5F9',
                    }}
                    resizeMode="cover"
                  />
                  {/* "+N" overlay on 4th photo when there are more photos */}
                  {isFourthPhotoWithMore && (
                    <View
                      style={{
                        ...StyleSheet.absoluteFill,
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 10,
                        elevation: 5,
                      }}
                    >
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontSize: 22,
                          fontWeight: 'bold',
                        }}
                      >
                        +{totalPhotos - 4}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </FeedMediaFrame>
      ) : null}
      {post.audioUrl ? (
        <View className="px-3 pb-1">
          <AudioPlayer uri={post.audioUrl} />
        </View>
      ) : null}
      <FeedCardContent>
        <VideoReactionSummary
          postId={post.id}
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          myReaction={post.myReaction}
          topReactions={post.topReactions}
          copy={copy}
          post={post}
          onOpenReactions={onOpenReactions}
        />
        <VideoPostActions
          myReaction={post.myReaction}
          copy={copy}
          likeButtonRef={likeButtonRef}
          onLikeTap={handleLikeTap}
          onLikeLongPress={handleLikeLongPress}
          onCommentTap={handleCommentTap}
          onShare={onShare}
          post={post}
          gestureX={gX}
          gestureY={gY}
          gestureActive={gActive}
          gestureStartX={gStartX}
          gestureStartY={gStartY}
          hasDragged={gDragged}
        />
      </FeedCardContent>
    </FeedCardSurface>
  );
});
