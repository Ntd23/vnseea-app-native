// Description: Renders reusable feed post cards with media, reactions, and privacy metadata.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Dimensions,
  Image,
  InteractionManager,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import VideoPlayer from 'react-native-video';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import {
  Globe,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Share2,
  ShoppingBag,
  ThumbsUp,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToPostComments } from '../../../navigation/postNavigation';
import { navigateToReels } from '../../../navigation/reelsNavigation';
import {
  getVideoPlaybackTime,
  setVideoPlaybackTime,
} from '../../../reels/presentation/screens/reelsPlayback';
import { useLiveMediaActive } from '../../../shared-kernel/application/state/liveMediaPlaybackIsolation';
import type {
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
  PostPrivacy,
} from '../../domain/types/feed.types';
import { isFeedPostShareable } from '../../domain/policies/feedPostPrivacy';
import type { FeedSource } from '../../domain/repositories/FeedRepository';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { AudioPlayer } from '../../../shared-kernel/presentation/components/AudioPlayer';
import {
  createCachedVideoPosterThumbnail,
  getCachedVideoPosterThumbnail,
} from '../../../shared-kernel/application/utils/videoThumbnails';
import { parseMapShareUrl } from '../../../user/application/utils/mapShare';
import {
  FeedCardContent,
  FeedCardSurface,
  FeedGlassActionBar,
  FeedGlassActionButton,
  FeedMediaFrame,
  FeedReactionPickerPointer,
  FeedReactionPickerSurface,
} from './FeedCardChrome';
import {
  getPhotoGridItemGutterStyle,
  getPhotoGridItemLayout,
} from './photoGridLayout';
import {
  FEED_REACTION_COLORS as REACTION_COLOR,
  FEED_REACTION_IMAGES as REACTION_IMAGES,
  FEED_REACTION_TYPES,
} from './FeedReactionAssets';
import { SharedPostPreviewCard } from './SharedPostPreviewCard';
import { getProfileMediaActivityLabel } from '../../application/mappers/profileMediaActivity';
import { buildPostActivityContext } from '../../application/composer/postActivityContext';
import {
  cleanVnseeaPageShareCaption,
  isVnseeaPageLink,
  VnseeaPageLinkPreviewCard,
} from './VnseeaPageLinkPreviewCard';
import {
  FEED_VIDEO_SURFACE_MAX_RECOVERY_ATTEMPTS,
  shouldRecoverFeedVideoSurface,
} from './feedVideoSurfaceRecovery';
import { markFeedMediaLoaded } from '../../application/state/feedMediaLoadState';
import { FeedMediaImage } from './FeedMediaImage';
import { StaggeredFeedMediaImage } from './StaggeredFeedMediaImage';
import { feedVisibleMediaStore } from './feedVisibleMediaStore';
import {
  canApplyFeedPlaybackMutation,
  type FeedPlaybackSurface,
} from './feedVideoPlaybackOwnership';
import { feedMediaGeometryStorage } from '../../infrastructure/storage/feedMediaGeometryStorage';
import { navigateToFeedPublisherPage } from '../navigation/feedPublisherNavigation';
import { GroupPostIdentityHeader } from './GroupPostIdentityHeader';
import { PostTaggedUsersSheet } from './PostTaggedUsersSheet';
import { parseSharedPageMessage } from '../../../messages/application/shared-pages/sharedPageMessage';
import { createPagesRepository } from '../../../pages/infrastructure/repositories/ApiPagesRepository';
import {
  shouldMountWarmFeedVideo,
  shouldMeasureFeedVideoPosterAspectRatio,
  shouldPlayFeedVideo,
} from '../screens/feedVideoAutoplay';
import {
  isVideoPlaybackMetricsEnabled,
  recordVideoBufferState,
  recordVideoError,
  recordVideoFirstFrame,
  recordVideoLoadStart,
  recordVideoPlayerMounted,
  recordVideoPlayerUnmounted,
  updateVideoPlayerRole,
} from '../../../shared/performance/videoPlaybackMetrics';
import {
  isClientUiOptimizationEnabled,
  recordClientMediaLoad,
  type ClientUiPerformanceSurface,
} from '../../../shared/performance/clientUiPerformanceMetrics';

export {
  FEED_CARD_CLASS,
  FEED_CARD_PADDING_CLASS,
  FEED_MEDIA_CLASS,
} from './FeedCardChrome';

const feedPageLinkRepository = createPagesRepository();

// â”€â”€ Reaction lookup tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€ Picker geometry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PICKER_WIDTH = 282;
const PICKER_HEIGHT = 52;
const PICKER_GAP = 8;
const ANDROID_PICKER_HORIZONTAL_MARGIN = 10;
const ANDROID_PICKER_HEIGHT = 60;
const ANDROID_PICKER_ICON_ROW_HEIGHT = ANDROID_PICKER_HEIGHT;
const ANDROID_PICKER_HORIZONTAL_PADDING = 8;
const ANDROID_PICKER_ICON_BOX = 48;
const ANDROID_PICKER_ICON_SIZE = 46;
const ANDROID_PICKER_ICON_CENTER_Y = ANDROID_PICKER_HEIGHT / 2;
const ANDROID_PICKER_SUMMARY_ROW_ANCHOR_OFFSET = 8;
const IOS_PICKER_ICON_SLOT = 44;
const IOS_PICKER_ICON_BOX = 40;
const IOS_PICKER_ICON_SIZE = 36;
let activeReactionPickerPostIdSnapshot: string | null = null;
type ReactionPickerActiveListener = () => void;
const reactionPickerActiveListeners = new Set<ReactionPickerActiveListener>();

export function getFeedReactionPickerAnchorY(
  buttonTop: number,
  likeCount: number,
  commentCount = 0,
) {
  if (Platform.OS !== 'android') {
    return buttonTop;
  }

  const hasSummaryRow = likeCount > 0 || commentCount > 0;
  return (
    buttonTop +
    (hasSummaryRow
      ? ANDROID_PICKER_SUMMARY_ROW_ANCHOR_OFFSET
      : ANDROID_PICKER_ICON_ROW_HEIGHT)
  );
}

export const VIDEO_BUFFER_CONFIG = {
  minBufferMs: Platform.OS === 'android' ? 1200 : 2500,
  maxBufferMs: Platform.OS === 'android' ? 3000 : 5000,
  bufferForPlaybackMs: Platform.OS === 'android' ? 250 : 500,
  bufferForPlaybackAfterRebufferMs: Platform.OS === 'android' ? 1000 : 2000,
  backBufferDurationMs: Platform.OS === 'android' ? 2000 : 8000,
  initialBitrate: Platform.OS === 'android' ? 550_000 : 850_000,
};
const VIDEO_STARTUP_MAX_BITRATE = Platform.OS === 'android' ? 550_000 : 850_000;
const VIDEO_SETTLED_MAX_BITRATE = 0;
const VIDEO_QUALITY_RAMP_DELAY_MS = 1200;
const VIDEO_POSTER_REVEAL_HOLD_MS = 90;
const VIDEO_POSTER_FADE_MS = 160;
const VIDEO_WARM_PREVIEW_SECONDS = Platform.OS === 'android' ? 0.35 : 0.6;
const FEED_VIDEO_BLUR_SURFACE_GRACE_MS = 240;
const FEED_VIDEO_BACKDROP_BLUR_RADIUS = Platform.OS === 'android' ? 18 : 28;
const FEED_VIDEO_MEDIA_SURFACE_STYLE = { width: '100%' as const };
const FEED_VIDEO_MIN_ASPECT_RATIO = 9 / 16;
const PREPARED_VIDEO_KEEP_ALIVE_LIMIT = Platform.OS === 'android' ? 0 : 1;
const DEFAULT_PHOTO_GRID_WIDTH =
  Platform.OS === 'ios'
    ? Dimensions.get('window').width
    : Dimensions.get('window').width - 8;
const PHOTO_GRID_GUTTER_SIZE = 2;
const ANDROID_PHOTO_GRID_ITEM_STYLE = { padding: 2 };
const PHOTO_GRID_TILE_STYLE: ViewStyle = { flex: 1, overflow: 'hidden' };
const IOS_PHOTO_GRID_FRAME_STYLE: ViewStyle | undefined =
  Platform.OS === 'ios' ? { backgroundColor: 'transparent' } : undefined;
const MEDIA_ASPECT_RATIO_CACHE_LIMIT = 350;
const MEDIA_ASPECT_RATIO_CACHE = new Map<string, number>();
const POST_TOKEN_BLUE = APP_BRAND_COLOR;
const POST_TOKEN_FALLBACK = String.raw`[@#][^\s@#.,!?;:()[\]{}"']+`;

export function getFeedVideoPosterCacheKeyForPost(
  postId: string,
  videoUrl?: string,
) {
  return `${postId}:${videoUrl || 'video'}`;
}

const styles = StyleSheet.create({
  reactionSummaryRow: {
    minHeight: 20,
  },
  reactionPickerSurface: {},
  iosReactionPickerSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  iosReactionPickerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  androidReactionPickerSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    borderRadius: ANDROID_PICKER_HEIGHT / 2,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  androidReactionPickerRow: {
    width: '100%',
    height: ANDROID_PICKER_ICON_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ANDROID_PICKER_HORIZONTAL_PADDING,
  },
  androidInlineReactionPickerSurface: {
    width: '100%',
    height: ANDROID_PICKER_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#d7dce5',
  },
  androidInlineReactionButton: {
    flex: 1,
    height: ANDROID_PICKER_ICON_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedVideoBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  feedVideoBlurredBackdropImage: {
    opacity: 0.72,
    transform: [{ scale: 1.08 }],
  },
  feedVideoBlurredBackdropScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  videoPosterSkeleton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  videoPosterSkeletonPulse: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
});

function escapeTokenPattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function publishReactionPickerActivePostId(nextPostId: string | null) {
  if (activeReactionPickerPostIdSnapshot === nextPostId) return;
  activeReactionPickerPostIdSnapshot = nextPostId;
  reactionPickerActiveListeners.forEach(listener => listener());
}

export function useFeedReactionPickerActivePostId() {
  const [activePostId, setActivePostId] = useState(
    activeReactionPickerPostIdSnapshot,
  );

  useEffect(() => {
    const listener = () => {
      setActivePostId(activeReactionPickerPostIdSnapshot);
    };
    reactionPickerActiveListeners.add(listener);
    listener();
    return () => {
      reactionPickerActiveListeners.delete(listener);
    };
  }, []);

  return activePostId;
}

export function FeedInlineReactionPickerBar({
  onPick,
}: {
  onPick: (reaction: ReactionType) => void;
}) {
  const language = useAppLanguage();
  const reactionLabels = FEED_COPY[language].reactionLabel;
  const handlePick = useCallback(
    (reaction: ReactionType) => {
      onPick(reaction);
      publishReactionPickerActivePostId(null);
    },
    [onPick],
  );

  return (
    <View
      style={[
        styles.androidReactionPickerSurface,
        styles.androidInlineReactionPickerSurface,
      ]}
    >
      <View style={styles.androidReactionPickerRow}>
        {FEED_REACTION_TYPES.map(type => (
          <TouchableOpacity
            key={type}
            activeOpacity={0.75}
            onPress={() => handlePick(type)}
            accessibilityRole="button"
            accessibilityLabel={reactionLabels[type]}
            style={styles.androidInlineReactionButton}
          >
            <Image
              source={REACTION_IMAGES[type]}
              style={{
                width: ANDROID_PICKER_ICON_SIZE,
                height: ANDROID_PICKER_ICON_SIZE,
              }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function normalizePostUrlToken(token: string) {
  return /^https?:\/\//i.test(token) ? token : `https://${token}`;
}

export function renderPostTextTokens(
  text: string,
  mentionNames: string[] = [],
  onUrlPress?: (url: string) => void,
) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const urlPattern =
    '(?:https?:\\/\\/|www\\.)[^\\s<>()]+|(?:[a-z0-9-]+\\.)+[a-z]{2,}(?:\\/[^\\s<>()]*)?';
  const knownMentions = mentionNames
    .map(name => name.trim().replace(/^@/, ''))
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
    .map(name => `@${escapeTokenPattern(name)}(?=$|\\s|[.,!?;:()[\\]{}"'#@])`);
  const tokenPattern = new RegExp(
    `(${[urlPattern, ...knownMentions, POST_TOKEN_FALLBACK].join('|')})`,
    'g',
  );

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const rawToken = match[0];
    const trailingMatch = rawToken.match(/[.,!?;:\])]+$/);
    const trailingText = trailingMatch?.[0] ?? '';
    const token = trailingText
      ? rawToken.slice(0, -trailingText.length)
      : rawToken;
    const isUrl =
      /^https?:\/\//i.test(token) ||
      /^www\./i.test(token) ||
      /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/|$)/i.test(token);
    const url = isUrl ? normalizePostUrlToken(token) : undefined;

    nodes.push(
      <Text
        key={`${rawToken}-${match.index}`}
        style={{ color: POST_TOKEN_BLUE }}
        onPress={url && onUrlPress ? () => onUrlPress(url) : undefined}
      >
        {token}
      </Text>,
    );
    if (trailingText) {
      nodes.push(trailingText);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : text;
}

function clampAspectRatio(
  ratio: number,
  minRatio: number,
  maxRatio: number,
  fallback: number,
) {
  if (!Number.isFinite(ratio) || ratio <= 0) return fallback;
  return Math.max(minRatio, Math.min(maxRatio, ratio));
}

function getCachedMediaAspectRatio(
  uri: string | undefined,
  minRatio: number,
  maxRatio: number,
  fallback: number,
  canonicalRatio?: number,
) {
  return clampAspectRatio(
    canonicalRatio ??
      feedMediaGeometryStorage.getAspectRatio(uri) ??
      (uri ? MEDIA_ASPECT_RATIO_CACHE.get(uri) : undefined) ??
      fallback,
    minRatio,
    maxRatio,
    fallback,
  );
}

function cacheMediaAspectRatio(uri: string, width: number, height: number) {
  if (width <= 0 || height <= 0) return;
  feedMediaGeometryStorage.remember(uri, width, height);
  if (
    !MEDIA_ASPECT_RATIO_CACHE.has(uri) &&
    MEDIA_ASPECT_RATIO_CACHE.size >= MEDIA_ASPECT_RATIO_CACHE_LIMIT
  ) {
    const oldestUri = MEDIA_ASPECT_RATIO_CACHE.keys().next().value;
    if (oldestUri) {
      MEDIA_ASPECT_RATIO_CACHE.delete(oldestUri);
    }
  }
  MEDIA_ASPECT_RATIO_CACHE.set(uri, width / height);
}

// â”€â”€ FeedCopy type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type FeedCopy = {
  language: AppLanguage;
  filters: Array<{ source: FeedSource; label: string }>;
  reactionLabel: Record<ReactionType, string>;
  like: string;
  comment: string;
  share: string;
  viewDetails?: string;
  sharedPostLabel: (name: string) => string;
  updatedProfilePicture: string;
  updatedCoverPhoto: string;
  publicLabel: string;
  friendsPrivacyLabel: string;
  followersPrivacyLabel: string;
  onlyMePrivacyLabel: string;
  anonymousPrivacyLabel: string;
  userFallback: string;
  composerPlaceholder: string;
  library: string;
  tag: string;
  feeling: string;
  photo?: string;
  video?: string;
  product?: string;
  job?: string;
  storiesTitle: string;
  seeAll: string;
  createStory: string;
  createStorySubtitle: string;
  now: string;
  minutesAgo: (count: number) => string;
  hoursAgo: (count: number) => string;
  daysAgo: (count: number) => string;
  commentsCount: (count: number) => string;
  you: string;
  youAndOthers: (count: string) => string;
  feelingPrefix: string;
  photoCount: (count: number) => string;
  captionShowMore?: string;
  captionShowLess?: string;
  sponsored: string;
  adVideo: string;
  videoUnavailable: string;
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
  pageLike: string;
  pageLiked: string;
  pageFollow: string;
  pageFollowing: string;
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
    language: 'vi',
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
    updatedProfilePicture: 'đã cập nhật ảnh đại diện',
    updatedCoverPhoto: 'đã cập nhật ảnh bìa',
    publicLabel: 'Công khai',
    friendsPrivacyLabel: 'Bạn bè',
    followersPrivacyLabel: 'M\u1ecdi ng\u01b0\u1eddi theo d\u00f5i t\u00f4i',
    onlyMePrivacyLabel: 'Ch\u1ec9 m\u00ecnh t\u00f4i',
    anonymousPrivacyLabel: '\u1ea8n danh',
    userFallback: 'Người dùng',
    composerPlaceholder: 'Bạn đang nghĩ gì?',
    library: 'Ảnh/video',
    tag: 'Gắn thẻ',
    feeling: 'Cảm xúc',
    photo: 'Hình ảnh',
    video: 'Video',
    product: 'Sản phẩm',
    job: 'Việc làm',
    storiesTitle: 'Tin tức mới',
    seeAll: 'Xem tất cả',
    createStory: 'Tạo tin',
    createStorySubtitle: 'Chia sẻ khoảnh khắc của bạn',
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
    videoUnavailable: 'Kh\u00f4ng ph\u00e1t \u0111\u01b0\u1ee3c video',
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
    pageLike: 'Thích',
    pageLiked: 'Đã thích',
    pageFollow: 'Theo dõi',
    pageFollowing: 'Đang theo dõi',
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
    language: 'en',
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
    updatedProfilePicture: 'updated their profile picture',
    updatedCoverPhoto: 'updated their cover photo',
    publicLabel: 'Public',
    friendsPrivacyLabel: 'Friends',
    followersPrivacyLabel: 'People following me',
    onlyMePrivacyLabel: 'Only me',
    anonymousPrivacyLabel: 'Anonymous',
    userFallback: 'User',
    composerPlaceholder: "What's on your mind?",
    library: 'Photo/video',
    tag: 'Tag',
    feeling: 'Feeling',
    photo: 'Photos',
    video: 'Videos',
    product: 'Product',
    job: 'Job',
    storiesTitle: 'Latest stories',
    seeAll: 'See all',
    createStory: 'Create story',
    createStorySubtitle: 'Share your moment',
    now: 'Just now',
    minutesAgo: count => `${count} min ago`,
    hoursAgo: count => `${count} h ago`,
    daysAgo: count => `${count} d ago`,
    commentsCount: count => `${formatCount(count)} comments`,
    you: 'You',
    youAndOthers: count => `You and ${count} others`,
    feelingPrefix: 'is feeling',
    photoCount: count => `${count} photos`,
    captionShowMore: 'See more',
    captionShowLess: 'Show less',
    sponsored: 'Sponsored',
    adVideo: 'Video ad',
    videoUnavailable: 'Video unavailable',
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
    pageLike: 'Like',
    pageLiked: 'Liked',
    pageFollow: 'Follow',
    pageFollowing: 'Following',
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

function getFeedPostPrivacy(post?: FeedPost): PostPrivacy | undefined {
  return post && 'privacy' in post ? post.privacy : undefined;
}

function getPostPrivacyMeta(privacy: PostPrivacy | undefined, copy: FeedCopy) {
  switch (privacy) {
    case 'friends':
      return { label: copy.friendsPrivacyLabel, Icon: Users };
    case 'followers':
      return { label: copy.followersPrivacyLabel, Icon: Users };
    case 'only_me':
      return { label: copy.onlyMePrivacyLabel, Icon: Lock };
    case 'public':
    default:
      return { label: copy.publicLabel, Icon: Globe };
  }
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

type FeedActiveVideoListener = (
  activeVideoId: string | null,
  surface: FeedPlaybackSurface | null,
) => void;
type FeedWarmVideoListener = (
  warmVideoIds: ReadonlySet<string>,
  surface: FeedPlaybackSurface | null,
) => void;
type FeedPreparedVideoListener = (
  preparedVideoIds: ReadonlySet<string>,
) => void;
type FeedScrollBusyListener = (
  isBusy: boolean,
  surface: FeedPlaybackSurface | null,
) => void;
type FeedVideoMutedListener = (isMuted: boolean) => void;
type FeedScreenFocusedListener = (isFocused: boolean) => void;

export let feedActiveVideoIdSnapshot: string | null = null;
export let feedActiveVideoSurfaceSnapshot: FeedPlaybackSurface | null = null;
const feedActiveVideoListeners = new Set<FeedActiveVideoListener>();
export let feedWarmVideoIdsSnapshot = new Set<string>();
let feedWarmVideoSurfaceSnapshot: FeedPlaybackSurface | null = null;
const feedWarmVideoListeners = new Set<FeedWarmVideoListener>();
export let feedPreparedVideoIdsSnapshot = new Set<string>();
const feedPreparedVideoListeners = new Set<FeedPreparedVideoListener>();
const preparedVideoLru: string[] = [];
let feedScrollBusySnapshot = false;
let feedScrollBusySurfaceSnapshot: FeedPlaybackSurface | null = null;
const feedScrollBusyListeners = new Set<FeedScrollBusyListener>();
export let feedVideoMutedSnapshot = false;
const feedVideoMutedListeners = new Set<FeedVideoMutedListener>();
let feedScreenFocusedSnapshot = false;
const feedScreenFocusedListeners = new Set<FeedScreenFocusedListener>();

export function publishFeedScreenFocused(isFocused: boolean) {
  if (feedScreenFocusedSnapshot === isFocused) return;
  feedScreenFocusedSnapshot = isFocused;
  feedScreenFocusedListeners.forEach(listener => listener(isFocused));
}

function useFeedScreenFocused(enabled: boolean) {
  const [isFocused, setIsFocused] = useState(() =>
    enabled ? feedScreenFocusedSnapshot : true,
  );

  useEffect(() => {
    if (!enabled) {
      setIsFocused(previous => (previous ? previous : true));
      return undefined;
    }

    const listener: FeedScreenFocusedListener = nextIsFocused => {
      setIsFocused(previous =>
        previous === nextIsFocused ? previous : nextIsFocused,
      );
    };

    feedScreenFocusedListeners.add(listener);
    setIsFocused(previous =>
      previous === feedScreenFocusedSnapshot
        ? previous
        : feedScreenFocusedSnapshot,
    );

    return () => {
      feedScreenFocusedListeners.delete(listener);
    };
  }, [enabled]);

  return isFocused;
}

export function publishFeedActiveVideo(
  videoId: string | null,
  surface: FeedPlaybackSurface = 'feed',
) {
  const isClearing = videoId === null;
  if (
    !canApplyFeedPlaybackMutation({
      currentOwner: feedActiveVideoSurfaceSnapshot,
      requestOwner: surface,
      isClearing,
    })
  ) {
    return;
  }
  const nextSurface = isClearing ? null : surface;
  if (
    feedActiveVideoIdSnapshot === videoId &&
    feedActiveVideoSurfaceSnapshot === nextSurface
  ) {
    return;
  }
  feedActiveVideoIdSnapshot = videoId;
  feedActiveVideoSurfaceSnapshot = nextSurface;
  feedActiveVideoListeners.forEach(listener => listener(videoId, nextSurface));
}

function useFeedVideoActivity(videoId: string, surface: FeedPlaybackSurface) {
  const [isActive, setIsActive] = useState(
    () =>
      feedActiveVideoSurfaceSnapshot === surface &&
      feedActiveVideoIdSnapshot === videoId,
  );

  useEffect(() => {
    const listener: FeedActiveVideoListener = (nextVideoId, nextSurface) => {
      const nextIsActive = nextSurface === surface && nextVideoId === videoId;
      setIsActive(prev => (prev === nextIsActive ? prev : nextIsActive));
    };

    feedActiveVideoListeners.add(listener);
    const nextIsActive =
      feedActiveVideoSurfaceSnapshot === surface &&
      feedActiveVideoIdSnapshot === videoId;
    setIsActive(prev => (prev === nextIsActive ? prev : nextIsActive));

    return () => {
      feedActiveVideoListeners.delete(listener);
    };
  }, [surface, videoId]);

  return isActive;
}

function areWarmVideoIdsEqual(
  nextIds: Set<string>,
  surface: FeedPlaybackSurface | null,
) {
  if (feedWarmVideoSurfaceSnapshot !== surface) return false;
  if (feedWarmVideoIdsSnapshot.size !== nextIds.size) return false;

  for (const videoId of nextIds) {
    if (!feedWarmVideoIdsSnapshot.has(videoId)) return false;
  }

  return true;
}

export function publishFeedWarmVideoIds(
  videoIds: Iterable<string>,
  surface: FeedPlaybackSurface = 'feed',
) {
  const nextIds = new Set(videoIds);
  const isClearing = nextIds.size === 0;
  if (
    !canApplyFeedPlaybackMutation({
      currentOwner: feedWarmVideoSurfaceSnapshot,
      requestOwner: surface,
      isClearing,
    })
  ) {
    return;
  }
  const nextSurface = isClearing ? null : surface;
  if (areWarmVideoIdsEqual(nextIds, nextSurface)) return;

  feedWarmVideoIdsSnapshot = nextIds;
  feedWarmVideoSurfaceSnapshot = nextSurface;
  feedWarmVideoListeners.forEach(listener =>
    listener(feedWarmVideoIdsSnapshot, nextSurface),
  );
}

function publishPreparedVideoIds() {
  feedPreparedVideoIdsSnapshot = new Set(preparedVideoLru);
  feedPreparedVideoListeners.forEach(listener =>
    listener(feedPreparedVideoIdsSnapshot),
  );
}

function markFeedPreparedVideo(videoId: string) {
  const existingIndex = preparedVideoLru.indexOf(videoId);
  if (existingIndex >= 0) {
    preparedVideoLru.splice(existingIndex, 1);
  }

  preparedVideoLru.push(videoId);

  while (preparedVideoLru.length > PREPARED_VIDEO_KEEP_ALIVE_LIMIT) {
    preparedVideoLru.shift();
  }

  publishPreparedVideoIds();
}

function useFeedVideoWarm(videoId: string, surface: FeedPlaybackSurface) {
  const [isWarm, setIsWarm] = useState(
    () =>
      feedWarmVideoSurfaceSnapshot === surface &&
      feedWarmVideoIdsSnapshot.has(videoId),
  );

  useEffect(() => {
    const listener: FeedWarmVideoListener = (nextWarmVideoIds, nextSurface) => {
      const nextIsWarm =
        nextSurface === surface && nextWarmVideoIds.has(videoId);
      setIsWarm(prev => (prev === nextIsWarm ? prev : nextIsWarm));
    };

    feedWarmVideoListeners.add(listener);
    const nextIsWarm =
      feedWarmVideoSurfaceSnapshot === surface &&
      feedWarmVideoIdsSnapshot.has(videoId);
    setIsWarm(prev => (prev === nextIsWarm ? prev : nextIsWarm));

    return () => {
      feedWarmVideoListeners.delete(listener);
    };
  }, [surface, videoId]);

  return isWarm;
}

function useFeedPreparedVideoKeepAlive(videoId: string) {
  const [isPrepared, setIsPrepared] = useState(() =>
    feedPreparedVideoIdsSnapshot.has(videoId),
  );

  useEffect(() => {
    const listener: FeedPreparedVideoListener = nextPreparedVideoIds => {
      const nextIsPrepared = nextPreparedVideoIds.has(videoId);
      setIsPrepared(prev => (prev === nextIsPrepared ? prev : nextIsPrepared));
    };

    feedPreparedVideoListeners.add(listener);
    const nextIsPrepared = feedPreparedVideoIdsSnapshot.has(videoId);
    setIsPrepared(prev => (prev === nextIsPrepared ? prev : nextIsPrepared));

    return () => {
      feedPreparedVideoListeners.delete(listener);
    };
  }, [videoId]);

  return isPrepared;
}

export function publishFeedScrollBusy(
  isBusy: boolean,
  surface: FeedPlaybackSurface = 'feed',
) {
  if (
    !canApplyFeedPlaybackMutation({
      currentOwner: feedScrollBusySurfaceSnapshot,
      requestOwner: surface,
      isClearing: !isBusy,
    })
  ) {
    return;
  }
  const nextSurface = isBusy ? surface : null;
  if (
    feedScrollBusySnapshot === isBusy &&
    feedScrollBusySurfaceSnapshot === nextSurface
  ) {
    return;
  }
  feedScrollBusySnapshot = isBusy;
  feedScrollBusySurfaceSnapshot = nextSurface;
  feedScrollBusyListeners.forEach(listener => listener(isBusy, nextSurface));
}

export function publishFeedVisibleMediaPostIds(postIds: Iterable<string>) {
  feedVisibleMediaStore.publish(postIds);
}

export function publishFeedVideoMuted(isMuted: boolean) {
  if (feedVideoMutedSnapshot === isMuted) return;
  feedVideoMutedSnapshot = isMuted;
  feedVideoMutedListeners.forEach(listener => listener(isMuted));
}

export function useFeedScrollBusy(surface: FeedPlaybackSurface = 'feed') {
  const [isBusy, setIsBusy] = useState(
    () => feedScrollBusySurfaceSnapshot === surface && feedScrollBusySnapshot,
  );

  useEffect(() => {
    const listener: FeedScrollBusyListener = (nextIsBusy, nextSurface) => {
      const nextSurfaceIsBusy = nextSurface === surface && nextIsBusy;
      setIsBusy(prev =>
        prev === nextSurfaceIsBusy ? prev : nextSurfaceIsBusy,
      );
    };

    feedScrollBusyListeners.add(listener);
    const nextIsBusy =
      feedScrollBusySurfaceSnapshot === surface && feedScrollBusySnapshot;
    setIsBusy(prev => (prev === nextIsBusy ? prev : nextIsBusy));

    return () => {
      feedScrollBusyListeners.delete(listener);
    };
  }, [surface]);

  return isBusy;
}

export function useFeedPostMediaVisible(postId: string) {
  const [isVisible, setIsVisible] = useState(() =>
    feedVisibleMediaStore.isVisible(postId),
  );

  useEffect(() => {
    const unsubscribe = feedVisibleMediaStore.subscribe(
      postId,
      nextIsVisible => {
        setIsVisible(previous =>
          previous === nextIsVisible ? previous : nextIsVisible,
        );
      },
    );

    const nextIsVisible = feedVisibleMediaStore.isVisible(postId);
    setIsVisible(previous =>
      previous === nextIsVisible ? previous : nextIsVisible,
    );

    return unsubscribe;
  }, [postId]);

  return isVisible;
}

function useFeedVideoMuted() {
  const [isMuted, setIsMuted] = useState(feedVideoMutedSnapshot);

  useEffect(() => {
    const listener: FeedVideoMutedListener = nextMuted => {
      setIsMuted(previousMuted =>
        previousMuted === nextMuted ? previousMuted : nextMuted,
      );
    };

    feedVideoMutedListeners.add(listener);
    setIsMuted(previousMuted =>
      previousMuted === feedVideoMutedSnapshot
        ? previousMuted
        : feedVideoMutedSnapshot,
    );

    return () => {
      feedVideoMutedListeners.delete(listener);
    };
  }, []);

  return isMuted;
}

const Avatar = React.memo(function Avatar({
  uri,
  size = 40,
}: {
  uri: string;
  size?: number;
}) {
  const style = useMemo(() => ({ height: size, width: size }), [size]);

  return (
    <FeedMediaImage
      uri={uri}
      style={style}
      className="rounded-full"
      resizeMode="cover"
    />
  );
});

const FeedVideoBackdrop = React.memo(function FeedVideoBackdrop({
  uri,
  enabled,
  blurred = false,
}: {
  uri: string;
  enabled: boolean;
  blurred?: boolean;
}) {
  return (
    <View pointerEvents="none" style={styles.feedVideoBackdrop}>
      <FeedMediaImage
        uri={uri}
        style={[
          StyleSheet.absoluteFill,
          blurred ? styles.feedVideoBlurredBackdropImage : null,
        ]}
        resizeMode="cover"
        blurRadius={blurred ? FEED_VIDEO_BACKDROP_BLUR_RADIUS : undefined}
        enabled={enabled}
      />
      {blurred ? <View style={styles.feedVideoBlurredBackdropScrim} /> : null}
    </View>
  );
});

const VideoFallbackPoster = React.memo(function VideoFallbackPoster({
  label,
}: {
  label: string;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          overflow: 'hidden',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          backgroundColor: '#EEF4FF',
          padding: 14,
        },
      ]}
    >
      <View
        style={{
          position: 'absolute',
          top: -44,
          right: -34,
          width: 138,
          height: 138,
          borderRadius: 69,
          backgroundColor: 'rgba(8,102,255,0.10)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -58,
          left: -42,
          width: 170,
          height: 170,
          borderRadius: 85,
          backgroundColor: 'rgba(14,165,233,0.12)',
        }}
      />
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.78)',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(8,102,255,0.18)',
        }}
      >
        <Text
          style={{
            color: '#0F172A',
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
});

const VideoPosterSkeleton = React.memo(function VideoPosterSkeleton() {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.videoPosterSkeleton]}
    >
      <View style={styles.videoPosterSkeletonPulse} />
    </View>
  );
});

function useGeneratedVideoPoster({
  videoUrl,
  postId,
  serverThumbnailUrl,
  enabled,
  isScrollBusy,
}: {
  videoUrl: string;
  postId: string;
  serverThumbnailUrl?: string;
  enabled: boolean;
  isScrollBusy: boolean;
}) {
  const cacheKey = getFeedVideoPosterCacheKeyForPost(postId, videoUrl);
  const [generatedPosterUrl, setGeneratedPosterUrl] = useState(() => {
    if (serverThumbnailUrl || !videoUrl) return undefined;
    return getCachedVideoPosterThumbnail(videoUrl, cacheKey)?.uri;
  });

  useEffect(() => {
    if (serverThumbnailUrl || !videoUrl) {
      setGeneratedPosterUrl(undefined);
      return;
    }
    setGeneratedPosterUrl(
      getCachedVideoPosterThumbnail(videoUrl, cacheKey)?.uri,
    );
  }, [cacheKey, serverThumbnailUrl, videoUrl]);

  useEffect(() => {
    markFeedMediaLoaded(generatedPosterUrl);
  }, [generatedPosterUrl]);

  useEffect(() => {
    if (
      serverThumbnailUrl ||
      !videoUrl ||
      generatedPosterUrl ||
      !enabled ||
      isScrollBusy
    ) {
      return;
    }

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      createCachedVideoPosterThumbnail(videoUrl, cacheKey).then(thumbnail => {
        if (cancelled || !thumbnail?.uri) return;
        markFeedMediaLoaded(thumbnail.uri);
        setGeneratedPosterUrl(thumbnail.uri);
      });
    });

    return () => {
      cancelled = true;
      task.cancel?.();
    };
  }, [
    cacheKey,
    enabled,
    generatedPosterUrl,
    isScrollBusy,
    serverThumbnailUrl,
    videoUrl,
  ]);

  return serverThumbnailUrl || generatedPosterUrl;
}

// Background colors for each reaction type's circular badge (FB-style)
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
  onCommentTap,
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
  onCommentTap: () => void;
}) {
  // The sheet is hosted by the parent screen — we no longer navigate.

  // Don't render the row at all if nobody has reacted AND there are no
  // comments â€” keeps simple posts visually quiet, FB-style.
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
    <View
      className="mb-4 flex-row items-center justify-between"
      style={styles.reactionSummaryRow}
    >
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
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onCommentTap}
          accessibilityRole="button"
          accessibilityLabel={copy.commentsCount(commentCount)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text className="text-caption-secondary" numberOfLines={1}>
            {copy.commentsCount(commentCount)}
          </Text>
        </TouchableOpacity>
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
}: {
  myReaction: ReactionType | null;
  copy: FeedCopy;
  likeButtonRef: React.RefObject<View | null>;
  onLikeTap: () => void;
  onLikeLongPress: () => void;
  onCommentTap: () => void;
  onShare?: (post: FeedPost) => void;
  post: FeedPost;
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

      <FeedGlassActionButton activeOpacity={0.75} onPress={onCommentTap}>
        <MessageCircle size={19} color="#64748B" />
        <Text style={{ marginLeft: 6, color: '#64748B', fontSize: 14 }}>
          {copy.comment}
        </Text>
      </FeedGlassActionButton>

      {isFeedPostShareable(post) ? (
        <FeedGlassActionButton
          activeOpacity={0.75}
          onPress={() => onShare?.(post)}
        >
          <Share2 size={19} color="#64748B" />
          <Text style={{ marginLeft: 6, color: '#64748B', fontSize: 14 }}>
            {copy.share}
          </Text>
        </FeedGlassActionButton>
      ) : null}
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
  const language = useAppLanguage();
  const reactionLabels = FEED_COPY[language].reactionLabel;

  useEffect(() => {
    publishReactionPickerActivePostId(anchor?.postId ?? null);
    return () => {
      publishReactionPickerActivePostId(null);
    };
  }, [anchor]);

  if (!anchor) return null;

  const isAndroidPicker = Platform.OS === 'android';
  const screenWidth = Dimensions.get('window').width;
  const pickerWidth = isAndroidPicker
    ? screenWidth - ANDROID_PICKER_HORIZONTAL_MARGIN * 2
    : PICKER_WIDTH;
  const pickerHeight = isAndroidPicker ? ANDROID_PICKER_HEIGHT : PICKER_HEIGHT;
  const iconSlot = isAndroidPicker
    ? (pickerWidth - ANDROID_PICKER_HORIZONTAL_PADDING * 2) /
      FEED_REACTION_TYPES.length
    : IOS_PICKER_ICON_SLOT;
  const iconBoxSize = isAndroidPicker
    ? ANDROID_PICKER_ICON_BOX
    : IOS_PICKER_ICON_BOX;
  const iconImageSize = isAndroidPicker
    ? ANDROID_PICKER_ICON_SIZE
    : IOS_PICKER_ICON_SIZE;
  const iconStartX = isAndroidPicker ? ANDROID_PICKER_HORIZONTAL_PADDING : 8;
  const iconCenterOffsetY = isAndroidPicker
    ? ANDROID_PICKER_ICON_CENTER_Y
    : PICKER_HEIGHT / 2;
  const left = isAndroidPicker
    ? ANDROID_PICKER_HORIZONTAL_MARGIN
    : Math.max(
        10,
        Math.min(anchor.x - pickerWidth / 2, screenWidth - pickerWidth - 10),
      );
  const top = Math.max(40, anchor.y - pickerHeight - PICKER_GAP);

  // Clamp the arrow pointer's horizontal position so it stays within the rounded rectangle boundaries
  const arrowLeft = Math.max(
    left + 20,
    Math.min(anchor.x - 8, left + pickerWidth - 20 - 16),
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
          top: top + pickerHeight - 8,
          width: 16,
          height: 16,
          transform: [{ rotate: '45deg' }],
          elevation: 12,
          zIndex: 99,
        }}
      />
      <FeedReactionPickerSurface
        style={[
          styles.reactionPickerSurface,
          isAndroidPicker
            ? styles.androidReactionPickerSurface
            : styles.iosReactionPickerSurface,
          {
            position: 'absolute',
            left,
            top,
            width: pickerWidth,
            height: pickerHeight,
            elevation: 12,
            zIndex: 100,
          },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={
            isAndroidPicker
              ? styles.androidReactionPickerRow
              : styles.iosReactionPickerRow
          }
        >
          {FEED_REACTION_TYPES.map((type, index) => (
            <ReactionIcon
              key={type}
              type={type}
              label={reactionLabels[type]}
              index={index}
              pickerLeft={left}
              pickerTop={top}
              iconStartX={iconStartX}
              iconSlot={iconSlot}
              iconBoxSize={iconBoxSize}
              iconImageSize={iconImageSize}
              iconCenterOffsetY={iconCenterOffsetY}
              gestureX={gestureX}
              gestureY={gestureY}
              gestureActive={gestureActive}
              hasDragged={gDragged}
              onPick={onPick}
              onDismiss={onDismiss}
            />
          ))}
        </View>
      </FeedReactionPickerSurface>
    </>
  );
}

function ReactionIcon({
  type,
  label,
  index,
  pickerLeft,
  pickerTop,
  iconStartX,
  iconSlot,
  iconBoxSize,
  iconImageSize,
  iconCenterOffsetY,
  gestureX,
  gestureY,
  gestureActive,
  hasDragged,
  onPick,
  onDismiss,
}: {
  type: ReactionType;
  label: string;
  index: number;
  pickerLeft: number;
  pickerTop: number;
  iconStartX: number;
  iconSlot: number;
  iconBoxSize: number;
  iconImageSize: number;
  iconCenterOffsetY: number;
  gestureX: any;
  gestureY: any;
  gestureActive: any;
  hasDragged: any;
  onPick: (reaction: ReactionType) => void;
  onDismiss: () => void;
}) {
  // Approximate center of this icon in absolute screen coordinates
  const iconCenterX = pickerLeft + iconStartX + index * iconSlot + iconSlot / 2;
  const iconCenterY = pickerTop + iconCenterOffsetY;

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
          width: iconSlot,
          height: iconBoxSize,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={() => onPick(type)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      >
        <Image
          source={REACTION_IMAGES[type]}
          style={{ width: iconImageSize, height: iconImageSize }}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── HomeVideoPostCard ─────────────────────────────────────────────────────────────
export const HomeVideoPostCard = React.memo(function HomeVideoPostCard({
  post,
  copy: providedCopy,
  onReact,
  onOpenPicker,
  onCommentTap,
  onShare,
  onOpenReactions,
  isActive: controlledIsActive,
  isScreenFocused,
  navigateToProfile,
  onOpenPostMenu,
  showIdentityHeader = true,
  showGroupContext = false,
  keepPreparedVideoMounted = false,
  commentNavigationMode = 'detail',
  deferMediaUntilVisible = false,
  mediaSurfaceRef,
  performanceSurface,
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
  isScreenFocused?: boolean;
  gestureX?: any;
  gestureY?: any;
  gestureActive?: any;
  gestureStartX?: any;
  gestureStartY?: any;
  hasDragged?: any;
  navigateToProfile: (userId: string) => void;
  onOpenPostMenu?: (post: FeedPost) => void;
  showIdentityHeader?: boolean;
  showGroupContext?: boolean;
  keepPreparedVideoMounted?: boolean;
  commentNavigationMode?: 'detail' | 'callback';
  deferMediaUntilVisible?: boolean;
  mediaSurfaceRef?: (
    postId: string,
    node: React.ElementRef<typeof View> | null,
  ) => void;
  performanceSurface?: ClientUiPerformanceSurface;
}) {
  const language = useAppLanguage();
  const copy = providedCopy ?? FEED_COPY[language];
  const trackedMediaVisible = useFeedPostMediaVisible(post.id);
  const mediaVisible = !deferMediaUntilVisible || trackedMediaVisible;
  const videoClientLoadMeasurementRef = useRef({
    surface: performanceSurface,
    isInViewport: mediaVisible,
  });
  const videoMetricsSurface = performanceSurface ?? 'feed';
  const shouldRecordFeedVideoPlaybackMetrics =
    performanceSurface !== undefined && isVideoPlaybackMetricsEnabled();

  const navigation = useNavigation<any>();
  const trackedIsActive = useFeedVideoActivity(post.id, videoMetricsSurface);
  const trackedIsWarm = useFeedVideoWarm(post.id, videoMetricsSurface);
  const isPreparedKeptAlive = useFeedPreparedVideoKeepAlive(post.id);
  const feedSurfaceFocused = useFeedScreenFocused(
    performanceSurface === 'feed',
  );
  const isPlaybackSurfaceFocused =
    isScreenFocused ??
    (performanceSurface === 'feed' ? feedSurfaceFocused : false);
  const liveMediaActive = useLiveMediaActive();
  const isActive =
    isPlaybackSurfaceFocused &&
    (controlledIsActive !== undefined ? controlledIsActive : trackedIsActive);
  const isWarm = isPlaybackSurfaceFocused && trackedIsWarm;
  const [keepPlayerSurfaceMounted, setKeepPlayerSurfaceMounted] =
    useState(false);
  const wasPlayerSurfaceMountedRef = useRef(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [isOpeningReels, setIsOpeningReels] = useState(false);
  const openingReelsFrameRef = useRef<number | null>(null);
  const blurredWhileOpeningReelsRef = useRef(false);
  const muted = useFeedVideoMuted();
  const isScrollBusy = useFeedScrollBusy(videoMetricsSurface);
  const mediaLoadEnabled = !deferMediaUntilVisible || mediaVisible;
  const handleMediaSurfaceRef = useCallback(
    (node: React.ElementRef<typeof View> | null) => {
      mediaSurfaceRef?.(post.id, node);
    },
    [mediaSurfaceRef, post.id],
  );
  const videoUrl = post.videoUrl.trim();
  const mediaIdentity = `${post.id}:${videoUrl}`;
  const videoPreviewCacheKey = post.thumbnailUrl || videoUrl || post.id;
  const geometryIdentity = `${mediaIdentity}:${videoPreviewCacheKey}`;
  const reservedAspectRatioRef = useRef({
    identity: geometryIdentity,
    value: getCachedMediaAspectRatio(
      videoPreviewCacheKey,
      FEED_VIDEO_MIN_ASPECT_RATIO,
      16 / 9,
      16 / 9,
      post.mediaGeometry?.aspectRatio,
    ),
  });
  if (reservedAspectRatioRef.current.identity !== geometryIdentity) {
    reservedAspectRatioRef.current = {
      identity: geometryIdentity,
      value: getCachedMediaAspectRatio(
        videoPreviewCacheKey,
        FEED_VIDEO_MIN_ASPECT_RATIO,
        16 / 9,
        16 / 9,
        post.mediaGeometry?.aspectRatio,
      ),
    };
  }
  const aspectRatio = reservedAspectRatioRef.current.value;
  const currentTimeRef = useRef<number>(getVideoPlaybackTime(post.id, 0));
  const videoRef = useRef<React.ElementRef<typeof VideoPlayer>>(null);
  const mediaIdentityRef = useRef(mediaIdentity);
  mediaIdentityRef.current = mediaIdentity;
  const hasRenderedFrameRef = useRef(false);
  const firstFrameProgressStartRef = useRef<number | null>(null);
  const videoSurfaceRecoveryCountRef = useRef(0);
  const videoSurfaceRecoveryInFlightRef = useRef(false);
  const frameCoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const qualityRampTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false);
  const [warmPreviewReady, setWarmPreviewReady] = useState(false);
  const [isFrameCoverVisible, setFrameCoverVisible] = useState(true);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [videoPlayerGeneration, setVideoPlayerGeneration] = useState(0);
  const videoPlayerGenerationRef = useRef(videoPlayerGeneration);
  videoPlayerGenerationRef.current = videoPlayerGeneration;
  const videoMetricsPlayerId = useMemo(
    () => `${videoMetricsSurface}:${post.id}:${videoPlayerGeneration}`,
    [post.id, videoMetricsSurface, videoPlayerGeneration],
  );
  const [maxVideoBitRate, setMaxVideoBitRate] = useState(
    VIDEO_STARTUP_MAX_BITRATE,
  );
  const hasVideoUrl = videoUrl.length > 0;
  const canAttemptVideo = hasVideoUrl && !hasVideoError;
  const resolvedThumbnailUrl = useGeneratedVideoPoster({
    videoUrl,
    postId: post.id,
    serverThumbnailUrl: post.thumbnailUrl,
    enabled:
      isPlaybackSurfaceFocused &&
      mediaLoadEnabled &&
      hasVideoUrl &&
      !hasVideoError &&
      (isActive || isWarm || isPreparedKeptAlive),
    isScrollBusy,
  });
  const hasUserWatchedRef = useRef(getVideoPlaybackTime(post.id, 0) > 0.05);
  const warmPreviewTimeRef = useRef(0);
  const frameCoverOpacity = useSharedValue(1);
  const frameCoverAnimatedStyle = useAnimatedStyle(() => ({
    opacity: frameCoverOpacity.value,
  }));

  const hideFrameCoverForMedia = useCallback((identity: string) => {
    if (identity !== mediaIdentityRef.current) return;
    setFrameCoverVisible(false);
  }, []);

  const clearVideoQualityRamp = useCallback(() => {
    if (!qualityRampTimeoutRef.current) return;
    clearTimeout(qualityRampTimeoutRef.current);
    qualityRampTimeoutRef.current = null;
  }, []);

  const scheduleVideoQualityRamp = useCallback(() => {
    clearVideoQualityRamp();
    qualityRampTimeoutRef.current = setTimeout(() => {
      qualityRampTimeoutRef.current = null;
      setMaxVideoBitRate(VIDEO_SETTLED_MAX_BITRATE);
    }, VIDEO_QUALITY_RAMP_DELAY_MS);
  }, [clearVideoQualityRamp]);

  useEffect(() => {
    mediaIdentityRef.current = mediaIdentity;
    const savedTime = getVideoPlaybackTime(post.id, 0);
    if (frameCoverTimeoutRef.current) {
      clearTimeout(frameCoverTimeoutRef.current);
      frameCoverTimeoutRef.current = null;
    }
    clearVideoQualityRamp();
    frameCoverOpacity.value = 1;
    currentTimeRef.current = savedTime;
    hasUserWatchedRef.current = savedTime > 0.05;
    warmPreviewTimeRef.current = 0;
    hasRenderedFrameRef.current = false;
    firstFrameProgressStartRef.current = null;
    videoSurfaceRecoveryCountRef.current = 0;
    videoSurfaceRecoveryInFlightRef.current = false;
    setSeekTime(savedTime > 0.05 ? savedTime : undefined);
    setManuallyPaused(false);
    setIsReady(false);
    setHasRenderedFrame(false);
    setWarmPreviewReady(false);
    setFrameCoverVisible(true);
    setHasVideoError(false);
    setVideoPlayerGeneration(0);
    setMaxVideoBitRate(VIDEO_STARTUP_MAX_BITRATE);
  }, [clearVideoQualityRamp, frameCoverOpacity, mediaIdentity, post.id]);

  useEffect(() => {
    return () => {
      if (openingReelsFrameRef.current !== null) {
        cancelAnimationFrame(openingReelsFrameRef.current);
        openingReelsFrameRef.current = null;
      }
      if (frameCoverTimeoutRef.current) {
        clearTimeout(frameCoverTimeoutRef.current);
        frameCoverTimeoutRef.current = null;
      }
      clearVideoQualityRamp();
      if (hasUserWatchedRef.current) {
        setVideoPlaybackTime(post.id, currentTimeRef.current);
      }
    };
  }, [clearVideoQualityRamp, post.id]);

  useEffect(() => {
    if (!isOpeningReels) {
      blurredWhileOpeningReelsRef.current = false;
      return;
    }

    if (!isPlaybackSurfaceFocused) {
      blurredWhileOpeningReelsRef.current = true;
      return;
    }

    if (blurredWhileOpeningReelsRef.current) {
      blurredWhileOpeningReelsRef.current = false;
      setIsOpeningReels(false);
    }
  }, [isOpeningReels, isPlaybackSurfaceFocused]);

  // Learn geometry for legacy posts, but keep this mounted row stable. The
  // persisted value is applied the next time the media card is mounted.
  useEffect(() => {
    const thumbnailUrl = resolvedThumbnailUrl;
    if (!thumbnailUrl || !mediaLoadEnabled) return undefined;
    if (!shouldMeasureFeedVideoPosterAspectRatio(Platform.OS)) {
      return undefined;
    }

    if (
      post.mediaGeometry?.aspectRatio ||
      feedMediaGeometryStorage.getAspectRatio(thumbnailUrl)
    ) {
      return undefined;
    }

    let cancelled = false;
    Image.getSize(
      thumbnailUrl,
      (width, height) => {
        if (!cancelled && width > 0 && height > 0) {
          cacheMediaAspectRatio(thumbnailUrl, width, height);
          if (thumbnailUrl !== videoPreviewCacheKey) {
            cacheMediaAspectRatio(videoPreviewCacheKey, width, height);
          }
        }
      },
      err => {
        if (!cancelled) {
          console.warn(
            '[HomeVideoPostCard] getSize failed for thumbnail:',
            err,
          );
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [mediaLoadEnabled, post.mediaGeometry?.aspectRatio, resolvedThumbnailUrl, videoPreviewCacheKey]);

  // Persist the canonical video size for legacy responses without resizing
  // the row currently under the user's finger.
  const handleVideoLoad = useCallback(
    (callbackGeneration: number, data: any) => {
      if (callbackGeneration !== videoPlayerGenerationRef.current) return;
      if (mediaIdentity !== mediaIdentityRef.current) return;
      const clientMeasurement = videoClientLoadMeasurementRef.current;
      if (clientMeasurement.surface) {
        recordClientMediaLoad(
          clientMeasurement.surface,
          'video',
          clientMeasurement.isInViewport,
        );
      }
      if (frameCoverTimeoutRef.current) {
        clearTimeout(frameCoverTimeoutRef.current);
        frameCoverTimeoutRef.current = null;
      }
      setHasVideoError(false);
      setIsReady(true);
      firstFrameProgressStartRef.current = null;
      videoSurfaceRecoveryInFlightRef.current = false;
      const size = data?.naturalSize ?? data;
      if (size) {
        const { width, height } = size;
        if (width > 0 && height > 0) {
          cacheMediaAspectRatio(videoPreviewCacheKey, width, height);
          if (videoUrl && videoUrl !== videoPreviewCacheKey) {
            cacheMediaAspectRatio(videoUrl, width, height);
          }
        }
      }
    },
    [mediaIdentity, videoPreviewCacheKey, videoUrl],
  );

  const revealVideoFrame = useCallback(
    (callbackGeneration: number) => {
      if (callbackGeneration !== videoPlayerGenerationRef.current) return;
      if (mediaIdentity !== mediaIdentityRef.current) return;
      hasRenderedFrameRef.current = true;
      firstFrameProgressStartRef.current = null;
      videoSurfaceRecoveryInFlightRef.current = false;
      setIsReady(true);
      setHasRenderedFrame(true);
      if (keepPreparedVideoMounted) {
        markFeedPreparedVideo(post.id);
      }
      if (isActive) {
        scheduleVideoQualityRamp();
      }

      if (frameCoverTimeoutRef.current) {
        clearTimeout(frameCoverTimeoutRef.current);
      }
      frameCoverTimeoutRef.current = setTimeout(
        () => {
          frameCoverTimeoutRef.current = null;
          if (callbackGeneration !== videoPlayerGenerationRef.current) return;
          if (mediaIdentity !== mediaIdentityRef.current) return;
          frameCoverOpacity.value = withTiming(
            0,
            { duration: VIDEO_POSTER_FADE_MS },
            finished => {
              if (finished) {
                runOnJS(hideFrameCoverForMedia)(mediaIdentity);
              }
            },
          );
        },
        resolvedThumbnailUrl ? VIDEO_POSTER_REVEAL_HOLD_MS : 0,
      );
    },
    [
      frameCoverOpacity,
      hideFrameCoverForMedia,
      isActive,
      keepPreparedVideoMounted,
      mediaIdentity,
      post.id,
      resolvedThumbnailUrl,
      scheduleVideoQualityRamp,
    ],
  );

  const recoverAndroidVideoSurface = useCallback(
    (resumeTime: number) => {
      if (
        Platform.OS !== 'android' ||
        videoSurfaceRecoveryInFlightRef.current ||
        videoSurfaceRecoveryCountRef.current >=
          FEED_VIDEO_SURFACE_MAX_RECOVERY_ATTEMPTS
      ) {
        return;
      }

      videoSurfaceRecoveryCountRef.current += 1;
      videoSurfaceRecoveryInFlightRef.current = true;
      firstFrameProgressStartRef.current = null;
      hasRenderedFrameRef.current = false;
      currentTimeRef.current = resumeTime;
      setSeekTime(resumeTime > 0.05 ? resumeTime : undefined);
      setIsReady(false);
      setHasRenderedFrame(false);
      setWarmPreviewReady(false);
      setFrameCoverVisible(true);
      frameCoverOpacity.value = 1;
      clearVideoQualityRamp();
      setMaxVideoBitRate(VIDEO_STARTUP_MAX_BITRATE);
      setVideoPlayerGeneration(generation => generation + 1);
    },
    [clearVideoQualityRamp, frameCoverOpacity],
  );

  // Profile tap handler
  const handleProfilePress = useCallback(() => {
    if (!post.isAnonymous && post.publisher.id) {
      if (!navigateToFeedPublisherPage(navigation, post.publisher)) {
        navigateToProfile(post.publisher.id);
      }
    }
  }, [navigateToProfile, navigation, post.isAnonymous, post.publisher]);

  const handleVideoPress = useCallback(() => {
    if (openingReelsFrameRef.current !== null) return;

    const resumeFallback = hasUserWatchedRef.current
      ? currentTimeRef.current
      : 0;
    const resumeTime = getVideoPlaybackTime(post.id, resumeFallback);
    currentTimeRef.current = resumeTime;
    setVideoPlaybackTime(post.id, resumeTime);

    // Immediately pause the video on home feed before navigating.
    setManuallyPaused(true);
    setIsOpeningReels(true);

    // `source: 'home'` preserves the selected feed video context when
    // the Reels tab opens from a post card.
    const sourcePostId = post.sharedPostId || post.id;
    openingReelsFrameRef.current = requestAnimationFrame(() => {
      openingReelsFrameRef.current = null;
      navigateToReels(navigation, {
        initialVideoId: sourcePostId,
        ...(post.sharedPostId ? {} : { post }),
        source: 'home',
        seekTime: resumeTime,
      });
    });
  }, [navigation, post]);

  // ── Mount strategy ──
  // Mount active videos and a small warm-ahead set. Warm players stay paused;
  // mounting them only prepares the native surface without advancing playback.
  const shouldKeepPreparedVideoMounted =
    keepPreparedVideoMounted && isPreparedKeptAlive && hasRenderedFrame;
  const canMountWarmVideo = shouldMountWarmFeedVideo({
    platform: Platform.OS,
    optimizationEnabled: isClientUiOptimizationEnabled(),
    isWarm,
    isScrollBusy,
    shouldKeepPreparedVideoMounted,
    wasPlayerSurfaceMounted: wasPlayerSurfaceMountedRef.current,
  });
  const shouldMountFocusedVideo =
    !isOpeningReels &&
    isPlaybackSurfaceFocused &&
    mediaVisible &&
    canAttemptVideo &&
    (isActive ||
      (canMountWarmVideo && isWarm) ||
      shouldKeepPreparedVideoMounted);
  const isTransitionSurfaceGraceActive =
    !isOpeningReels &&
    (keepPlayerSurfaceMounted ||
      (!isPlaybackSurfaceFocused && wasPlayerSurfaceMountedRef.current));
  const shouldMountVideo =
    shouldMountFocusedVideo ||
    (canAttemptVideo && isTransitionSurfaceGraceActive);
  const videoMetricsRole = isActive ? 'current' : isWarm ? 'warm' : 'prepared';
  const videoMetricsRoleRef = useRef(videoMetricsRole);
  videoMetricsRoleRef.current = videoMetricsRole;
  const shouldBlurVideoBackdrop =
    Boolean(resolvedThumbnailUrl) &&
    isActive &&
    isPlaybackSurfaceFocused &&
    !isScrollBusy &&
    (Platform.OS !== 'android' || performanceSurface === 'profile');
  const shouldRenderVideoFrameCover =
    Boolean(resolvedThumbnailUrl) && isFrameCoverVisible;

  useEffect(() => {
    if (!shouldMountVideo || !shouldRecordFeedVideoPlaybackMetrics) {
      return undefined;
    }

    recordVideoPlayerMounted({
      playerId: videoMetricsPlayerId,
      surface: videoMetricsSurface,
      role: videoMetricsRoleRef.current,
    });

    return () => recordVideoPlayerUnmounted(videoMetricsPlayerId);
  }, [shouldMountVideo, shouldRecordFeedVideoPlaybackMetrics, videoMetricsPlayerId, videoMetricsSurface]);

  useEffect(() => {
    if (!shouldMountVideo || !shouldRecordFeedVideoPlaybackMetrics) return;
    updateVideoPlayerRole(
      videoMetricsPlayerId,
      videoMetricsRole,
      videoMetricsSurface,
    );
  }, [shouldMountVideo, shouldRecordFeedVideoPlaybackMetrics, videoMetricsPlayerId, videoMetricsRole, videoMetricsSurface]);

  useEffect(() => {
    if (isPlaybackSurfaceFocused) return undefined;

    const shouldKeepSurface = wasPlayerSurfaceMountedRef.current;
    wasPlayerSurfaceMountedRef.current = false;
    if (!shouldKeepSurface) return undefined;

    setKeepPlayerSurfaceMounted(true);
    const timer = setTimeout(() => {
      setKeepPlayerSurfaceMounted(false);
    }, FEED_VIDEO_BLUR_SURFACE_GRACE_MS);

    return () => clearTimeout(timer);
  }, [isPlaybackSurfaceFocused]);

  useEffect(() => {
    if (!isPlaybackSurfaceFocused || !keepPlayerSurfaceMounted) {
      return undefined;
    }

    if (shouldMountFocusedVideo) {
      setKeepPlayerSurfaceMounted(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setKeepPlayerSurfaceMounted(false);
    }, FEED_VIDEO_BLUR_SURFACE_GRACE_MS);

    return () => clearTimeout(timer);
  }, [
    isPlaybackSurfaceFocused,
    keepPlayerSurfaceMounted,
    shouldMountFocusedVideo,
  ]);

  useEffect(() => {
    if (isPlaybackSurfaceFocused) {
      wasPlayerSurfaceMountedRef.current = shouldMountVideo;
    }
  }, [isPlaybackSurfaceFocused, shouldMountVideo]);

  useEffect(() => {
    if (shouldMountVideo) return;

    setIsReady(false);
    hasRenderedFrameRef.current = false;
    firstFrameProgressStartRef.current = null;
    videoSurfaceRecoveryCountRef.current = 0;
    videoSurfaceRecoveryInFlightRef.current = false;
    setHasRenderedFrame(false);
    setWarmPreviewReady(false);
    setFrameCoverVisible(true);
    frameCoverOpacity.value = 1;
    clearVideoQualityRamp();
    setMaxVideoBitRate(VIDEO_STARTUP_MAX_BITRATE);
  }, [clearVideoQualityRamp, frameCoverOpacity, shouldMountVideo]);

  useEffect(() => {
    if (!isActive || isScrollBusy || hasRenderedFrame) {
      firstFrameProgressStartRef.current = null;
    }
    if (!isActive) {
      videoSurfaceRecoveryCountRef.current = 0;
      videoSurfaceRecoveryInFlightRef.current = false;
    }
  }, [hasRenderedFrame, isActive, isScrollBusy]);

  useEffect(() => {
    if (isActive) {
      const savedTime = getVideoPlaybackTime(post.id, currentTimeRef.current);
      currentTimeRef.current = savedTime;
      hasUserWatchedRef.current = true;
      setManuallyPaused(false);
      if (savedTime > 0.05) {
        if (isReady && videoRef.current) {
          videoRef.current.seek(savedTime);
        } else {
          setSeekTime(savedTime);
        }
      } else if (
        isReady &&
        videoRef.current &&
        (warmPreviewReady || warmPreviewTimeRef.current > 0.05)
      ) {
        videoRef.current.seek(0);
      }
    }
  }, [isActive, isReady, post.id, warmPreviewReady]);

  useEffect(() => {
    if (!isActive) {
      clearVideoQualityRamp();
      setMaxVideoBitRate(VIDEO_STARTUP_MAX_BITRATE);
      return;
    }

    if (hasRenderedFrame) {
      scheduleVideoQualityRamp();
    }

    return clearVideoQualityRamp;
  }, [clearVideoQualityRamp, hasRenderedFrame, isActive, scheduleVideoQualityRamp]);

  useEffect(() => {
    if (isActive && isReady && seekTime !== undefined && videoRef.current) {
      currentTimeRef.current = seekTime;
      videoRef.current.seek(seekTime);
      setSeekTime(undefined);
    }
  }, [isActive, isReady, seekTime]);

  const playing = shouldPlayFeedVideo({
    shouldMountVideo,
    isActive,
    isWarm,
    manuallyPaused,
  });
  const showPlayOverlay = canAttemptVideo && !playing;
  const videoSource = useMemo(() => ({ uri: videoUrl }), [videoUrl]);
  const handleVideoLoadStart = useCallback(
    (callbackGeneration: number) => {
      if (callbackGeneration !== videoPlayerGenerationRef.current) return;
      videoClientLoadMeasurementRef.current = {
        surface: performanceSurface,
        isInViewport: mediaVisible,
      };
      if (shouldRecordFeedVideoPlaybackMetrics) {
        recordVideoLoadStart(videoMetricsPlayerId);
      }
    },
    [
      mediaVisible,
      performanceSurface,
      shouldRecordFeedVideoPlaybackMetrics,
      videoMetricsPlayerId,
    ],
  );
  const handleVideoReadyForDisplay = useCallback(
    (callbackGeneration: number) => {
      if (callbackGeneration !== videoPlayerGenerationRef.current) return;
      if (shouldRecordFeedVideoPlaybackMetrics) {
        recordVideoFirstFrame(videoMetricsPlayerId);
      }
      revealVideoFrame(callbackGeneration);
    },
    [
      revealVideoFrame,
      shouldRecordFeedVideoPlaybackMetrics,
      videoMetricsPlayerId,
    ],
  );
  const handleVideoBuffer = useCallback(
    (callbackGeneration: number, { isBuffering }: { isBuffering: boolean }) => {
      if (callbackGeneration !== videoPlayerGenerationRef.current) return;
      if (shouldRecordFeedVideoPlaybackMetrics) {
        recordVideoBufferState(videoMetricsPlayerId, isBuffering);
      }
    },
    [shouldRecordFeedVideoPlaybackMetrics, videoMetricsPlayerId],
  );

  const handleVideoProgress = useCallback(
    (callbackGeneration: number, data: any) => {
      if (callbackGeneration !== videoPlayerGenerationRef.current) return;
      if (mediaIdentity !== mediaIdentityRef.current) return;
      const nextTime = data?.currentTime;
      if (typeof nextTime !== 'number' || !Number.isFinite(nextTime)) return;

      if (isActive) {
        hasUserWatchedRef.current = true;
        currentTimeRef.current = nextTime;
        setVideoPlaybackTime(post.id, nextTime);
      } else {
        warmPreviewTimeRef.current = nextTime;
        if (
          keepPreparedVideoMounted &&
          nextTime >= VIDEO_WARM_PREVIEW_SECONDS
        ) {
          setWarmPreviewReady(true);
        }
      }

      if (
        Platform.OS === 'android' &&
        isActive &&
        playing &&
        !isScrollBusy &&
        !hasRenderedFrameRef.current
      ) {
        const playbackWindowStart = firstFrameProgressStartRef.current;
        if (playbackWindowStart === null || nextTime < playbackWindowStart) {
          firstFrameProgressStartRef.current = nextTime;
        } else if (
          shouldRecoverFeedVideoSurface({
            isAndroid: true,
            isActive,
            isPlaying: playing,
            isScrollBusy,
            hasRenderedFrame: hasRenderedFrameRef.current,
            recoveryInFlight: videoSurfaceRecoveryInFlightRef.current,
            recoveryAttempt: videoSurfaceRecoveryCountRef.current,
            playbackWindowStart,
            currentTime: nextTime,
          })
        ) {
          recoverAndroidVideoSurface(nextTime);
        }
      } else if (
        Platform.OS !== 'android' &&
        !hasRenderedFrameRef.current &&
        nextTime > 0.05
      ) {
        revealVideoFrame(callbackGeneration);
      }
    },
    [
      isActive,
      isScrollBusy,
      keepPreparedVideoMounted,
      mediaIdentity,
      playing,
      post.id,
      recoverAndroidVideoSurface,
      revealVideoFrame,
    ],
  );

  const handleVideoError = useCallback(
    (callbackGeneration: number, error: any) => {
      if (callbackGeneration !== videoPlayerGenerationRef.current) return;
      if (mediaIdentity !== mediaIdentityRef.current) return;
      if (shouldRecordFeedVideoPlaybackMetrics) {
        recordVideoError(videoMetricsPlayerId);
      }
      hasRenderedFrameRef.current = false;
      firstFrameProgressStartRef.current = null;
      videoSurfaceRecoveryInFlightRef.current = false;
      setHasVideoError(true);
      setIsReady(false);
      setHasRenderedFrame(false);
      setWarmPreviewReady(false);
      frameCoverOpacity.value = 1;
      setFrameCoverVisible(true);
      console.warn(
        '[HomeVideoPostCard] video error',
        post.id,
        post.videoUrl,
        error,
      );
    },
    [
      frameCoverOpacity,
      mediaIdentity,
      post.id,
      post.videoUrl,
      shouldRecordFeedVideoPlaybackMetrics,
      videoMetricsPlayerId,
    ],
  );

  // Reaction counters and picker state may re-render the card chrome. Keep the
  // native video surface stable so UI-only updates cannot detach SurfaceView.
  const stableVideoSurface = useMemo(() => {
    if (!shouldMountVideo) {
      if (resolvedThumbnailUrl) return null;
      return hasVideoUrl && !hasVideoError ? null : (
        <VideoFallbackPoster label={copy.videoUnavailable} />
      );
    }

    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <VideoPlayer
          key={`${mediaIdentity}:${videoPlayerGeneration}`}
          ref={videoRef}
          source={videoSource}
          style={[
            StyleSheet.absoluteFill,
            !hasRenderedFrame ? { opacity: 0 } : null,
          ]}
          resizeMode="contain"
          paused={!playing}
          controls={false}
          muted={muted || !isActive || !hasRenderedFrame}
          repeat
          ignoreSilentSwitch="ignore"
          disableAudioSessionManagement={
            Platform.OS === 'ios' && liveMediaActive
          }
          playInBackground={false}
          playWhenInactive={false}
          shutterColor="transparent"
          useTextureView={false}
          bufferConfig={VIDEO_BUFFER_CONFIG}
          maxBitRate={maxVideoBitRate}
          progressUpdateInterval={250}
          onLoadStart={() => handleVideoLoadStart(videoPlayerGeneration)}
          onReadyForDisplay={() =>
            handleVideoReadyForDisplay(videoPlayerGeneration)
          }
          onLoad={data => handleVideoLoad(videoPlayerGeneration, data)}
          onBuffer={
            shouldRecordFeedVideoPlaybackMetrics
              ? data => handleVideoBuffer(videoPlayerGeneration, data)
              : undefined
          }
          onProgress={data => handleVideoProgress(videoPlayerGeneration, data)}
          onError={error => handleVideoError(videoPlayerGeneration, error)}
        />
        {shouldRenderVideoFrameCover && resolvedThumbnailUrl ? (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, frameCoverAnimatedStyle]}
          >
            <FeedVideoBackdrop
              uri={resolvedThumbnailUrl}
              enabled={mediaLoadEnabled}
              blurred={shouldBlurVideoBackdrop}
            />
          </Animated.View>
        ) : !resolvedThumbnailUrl && isFrameCoverVisible ? (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, frameCoverAnimatedStyle]}
          >
            <VideoPosterSkeleton />
          </Animated.View>
        ) : null}
      </View>
    );
  }, [
    copy.videoUnavailable,
    frameCoverAnimatedStyle,
    handleVideoError,
    handleVideoBuffer,
    handleVideoLoad,
    handleVideoLoadStart,
    handleVideoProgress,
    handleVideoReadyForDisplay,
    hasRenderedFrame,
    hasVideoError,
    hasVideoUrl,
    isActive,
    isFrameCoverVisible,
    liveMediaActive,
    maxVideoBitRate,
    mediaIdentity,
    mediaLoadEnabled,
    muted,
    playing,
    resolvedThumbnailUrl,
    shouldRecordFeedVideoPlaybackMetrics,
    shouldBlurVideoBackdrop,
    shouldRenderVideoFrameCover,
    shouldMountVideo,
    videoPlayerGeneration,
    videoSource,
  ]);

  // Need an on-screen position for the "ThĂ­ch" button so the picker
  // anchors above it (matches the Facebook web/mobile pattern).
  const likeButtonRef = useRef<View>(null);

  const handleLikeTap = useCallback(() => {
    // Default reaction is 'like' â€” same as Facebook. Tapping again clears
    // it (the view-model handles the toggle-off).
    onReact(post.id, 'like');
  }, [onReact, post.id]);

  const handleCommentTap = useCallback(() => {
    if (commentNavigationMode === 'callback') {
      onCommentTap(post.id);
      return;
    }
    navigateToPostComments(navigation, post.id, post);
  }, [commentNavigationMode, navigation, onCommentTap, post]);

  const handleLikeLongPress = useCallback(() => {
    if (!likeButtonRef.current) {
      onOpenPicker(
        post.id,
        100,
        getFeedReactionPickerAnchorY(200, post.likeCount, post.commentCount),
      );
      return;
    }
    likeButtonRef.current.measureInWindow((x, y, width) => {
      onOpenPicker(
        post.id,
        x + width / 2,
        getFeedReactionPickerAnchorY(y, post.likeCount, post.commentCount),
      );
    });
  }, [onOpenPicker, post.id, post.likeCount, post.commentCount]);

  return (
    <FeedCardSurface>
      <FeedCardContent>
        {showIdentityHeader ? (
          <PostIdentityHeader
            avatar={post.publisher.avatarUrl}
            name={
              post.isAnonymous
                ? copy.anonymousPrivacyLabel
                : post.publisher.name
            }
            time={formatPostTime(post.postedAt, copy)}
            copy={copy}
            onPress={
              !post.isAnonymous && post.publisher.id
                ? handleProfilePress
                : undefined
            }
            onMorePress={onOpenPostMenu}
            post={post}
            showGroupContext={showGroupContext}
          />
        ) : null}
        {post.sharedFrom && !post.sharedPost ? (
          <Text
            className={`${
              showIdentityHeader ? '-mt-3 ' : ''
            }mb-3 text-caption-secondary`}
          >
            {copy.sharedPostLabel(
              post.sharedFrom.isAnonymous
                ? copy.anonymousPrivacyLabel
                : post.sharedFrom.publisherName,
            )}
          </Text>
        ) : null}
        {post.caption ? (
          <ExpandablePostCaption
            text={post.caption}
            mentionNames={post.mentionNames}
            copy={copy}
            collapsible={Boolean(resolvedThumbnailUrl || post.videoUrl)}
          />
        ) : null}
      </FeedCardContent>
      {(() => {
        const videoMedia = (
          <View
            ref={handleMediaSurfaceRef}
            collapsable={false}
            style={FEED_VIDEO_MEDIA_SURFACE_STYLE}
          >
            <FeedMediaFrame style={{ aspectRatio }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleVideoPress}
                style={{ width: '100%', height: '100%' }}
              >
                <VideoPosterSkeleton />
                {/* react-native-video v6 â€” unmount when inactive to release native decoders */}
                {resolvedThumbnailUrl ? (
                  <FeedVideoBackdrop
                    uri={resolvedThumbnailUrl}
                    enabled={mediaLoadEnabled}
                    blurred={shouldBlurVideoBackdrop && !isFrameCoverVisible}
                  />
                ) : null}
                {stableVideoSurface}
                {/* Big play button overlay while paused */}
                {showPlayOverlay ? (
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
                      <Text
                        style={{ color: '#fff', fontSize: 26, marginLeft: 4 }}
                      >
                        {'\u25B6'}
                      </Text>
                    </View>
                  </View>
                ) : null}
                {/* Mute toggle â€” top-right when playing */}
                {playing && hasRenderedFrame ? (
                  <TouchableOpacity
                    onPress={() => publishFeedVideoMuted(!muted)}
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
          </View>
        );
        return post.sharedPost ? (
          <FeedCardContent>
            <SharedPostPreviewCard
              model={post.sharedPost}
              mediaSlot={videoMedia}
              mediaEnabled={mediaLoadEnabled}
              onOpenPost={sourcePostId =>
                navigation.navigate(ROUTES.POST_DETAIL, {
                  postId: sourcePostId,
                })
              }
            />
          </FeedCardContent>
        ) : (
          videoMedia
        );
      })()}
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
          onCommentTap={handleCommentTap}
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
        />
      </FeedCardContent>
    </FeedCardSurface>
  );
}, areHomeVideoPostCardPropsEqual);

// â”€â”€ PostHeader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const PostIdentityHeader = React.memo(function PostIdentityHeader({
  avatar,
  name,
  time,
  copy,
  badge,
  onPress,
  onMorePress,
  onDetailPress,
  post,
  containerClassName = 'mb-4 flex-row items-center justify-between',
  showGroupContext = false,
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
  containerClassName?: string;
  showGroupContext?: boolean;
}) {
  const [taggedUsersVisible, setTaggedUsersVisible] = useState(false);
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

  const privacyMeta = getPostPrivacyMeta(getFeedPostPrivacy(post), copy);
  const PrivacyIcon = privacyMeta.Icon;
  const activityLabel = getProfileMediaActivityLabel(post?.activity, copy);
  const postActivity = buildPostActivityContext({
    language: copy.language,
    feeling: post?.feeling,
    taggedUsers: post?.taggedUsers,
    location: post?.location,
  });
  const hasActivity = Boolean(activityLabel || postActivity.fullText);
  const showTaggedUsers = useCallback(() => {
    if (!post?.taggedUsers?.length) return;
    setTaggedUsersVisible(true);
  }, [post?.taggedUsers]);

  if (showGroupContext && post?.groupContext) {
    return (
      <GroupPostIdentityHeader
        group={post.groupContext}
        publisher={post.publisher}
        publisherName={name}
        time={time}
        privacyLabel={privacyMeta.label}
        PrivacyIcon={PrivacyIcon}
        onPublisherPress={onPress}
        onMorePress={onMorePress ? handleMorePress : undefined}
        containerClassName={containerClassName}
      />
    );
  }

  return (
    <>
      <View className={containerClassName}>
        <TouchableOpacity
          className="min-w-0 flex-1 flex-row items-center"
          activeOpacity={0.8}
          onPress={onPress}
          disabled={!onPress}
        >
          {avatar ? (
            <Avatar uri={avatar} />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-full bg-brand">
              <ShoppingBag size={20} color="#FFFFFF" />
            </View>
          )}
          <View className="ml-3 min-w-0 flex-1">
            <View className="flex-row items-start">
              <Text
                className="min-w-0 flex-shrink text-title-primary"
                numberOfLines={hasActivity ? 2 : 1}
              >
                <Text className="font-bold">{name}</Text>
                {activityLabel ? (
                  <Text className="font-normal"> {activityLabel}</Text>
                ) : postActivity.fullText ? (
                  <>
                    {' '}
                    {postActivity.segments.map((segment, index) => {
                      if (segment.kind === 'tagged_users') {
                        return (
                          <Text
                            key={`${segment.kind}:${index}`}
                            className="font-semibold text-brand"
                            onPress={showTaggedUsers}
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
                          className={
                            isEmphasized
                              ? 'font-semibold text-slate-900'
                              : 'font-normal text-slate-500'
                          }
                        >
                          {segment.text}
                        </Text>
                      );
                    })}
                  </>
                ) : null}
              </Text>
              {badge ? (
                <Text className="surface-muted ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                  {badge}
                </Text>
              ) : null}
            </View>
            <View className="mt-0.5 flex-row items-center">
              <Text className="text-caption-secondary">
                {time} {'\u2022'}{' '}
              </Text>
              <PrivacyIcon size={11} color="#94A3B8" />
              <Text className="ml-1 text-caption-secondary">
                {privacyMeta.label}
              </Text>
            </View>
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
      <PostTaggedUsersSheet
        visible={taggedUsersVisible}
        users={post?.taggedUsers ?? []}
        onClose={() => setTaggedUsersVisible(false)}
      />
    </>
  );
});

const COLLAPSED_CAPTION_LINES = 3;
const COLLAPSED_CAPTION_CHAR_LIMIT = 170;

const ExpandablePostCaption = React.memo(function ExpandablePostCaption({
  text,
  mentionNames,
  copy,
  collapsible,
}: {
  text: string;
  mentionNames?: string[];
  copy: FeedCopy;
  collapsible: boolean;
}) {
  const navigation = useNavigation<any>();
  const normalizedText = useMemo(() => text.trim(), [text]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [layoutCanCollapse, setLayoutCanCollapse] = useState(false);
  const textSuggestsOverflow =
    normalizedText.length > COLLAPSED_CAPTION_CHAR_LIMIT ||
    normalizedText.split(/\r\n|\r|\n/).length > COLLAPSED_CAPTION_LINES;
  const canCollapse =
    collapsible && (textSuggestsOverflow || layoutCanCollapse);

  useEffect(() => {
    setIsExpanded(false);
    setLayoutCanCollapse(false);
  }, [normalizedText, collapsible]);

  const handleTextLayout = useCallback(
    (event: any) => {
      if (!collapsible || isExpanded) return;
      if (
        Array.isArray(event?.nativeEvent?.lines) &&
        event.nativeEvent.lines.length > COLLAPSED_CAPTION_LINES
      ) {
        setLayoutCanCollapse(true);
      }
    },
    [collapsible, isExpanded],
  );

  const handleUrlPress = useCallback(
    (url: string) => {
      const mapLocation = parseMapShareUrl(url);
      if (mapLocation) {
        navigation.navigate(ROUTES.NEARBY_USERS, {
          initialLocation: mapLocation,
        });
        return;
      }

      Linking.openURL(url).catch(() => undefined);
    },
    [navigation],
  );

  if (!normalizedText) return null;

  return (
    <View>
      <Text
        className="text-body-primary"
        numberOfLines={
          canCollapse && !isExpanded ? COLLAPSED_CAPTION_LINES : undefined
        }
        onTextLayout={handleTextLayout}
      >
        {renderPostTextTokens(normalizedText, mentionNames, handleUrlPress)}
      </Text>
      {canCollapse ? (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setIsExpanded(current => !current)}
          className="mt-1 self-start"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text className="text-sm font-bold text-brand">
            {isExpanded
              ? copy.captionShowLess ?? '\u1ea8n b\u1edbt'
              : copy.captionShowMore ?? 'Xem th\u00eam'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const FeedLinkPreviewCard = React.memo(function FeedLinkPreviewCard({
  preview,
  publisher,
  caption,
  mediaEnabled = true,
}: {
  preview: NonNullable<FeedTextPost['linkPreview']>;
  publisher: FeedTextPost['publisher'];
  caption?: string;
  mediaEnabled?: boolean;
}) {
  const navigation = useNavigation<any>();
  const pageLink = useMemo(
    () => parseSharedPageMessage(preview.url),
    [preview.url],
  );
  const isPagePreview = isVnseeaPageLink(preview.url);
  const hostLabel = useMemo(() => {
    try {
      return new URL(preview.url).hostname.replace(/^www\./, '');
    } catch {
      return preview.url;
    }
  }, [preview.url]);

  const handlePress = useCallback(async () => {
    const mapLocation = parseMapShareUrl(preview.url);
    if (mapLocation) {
      navigation.navigate(ROUTES.NEARBY_USERS, {
        initialLocation: {
          ...mapLocation,
          title: preview.title || mapLocation.title,
          subtitle: mapLocation.subtitle || preview.description,
          imageUrl: preview.image || mapLocation.imageUrl,
        },
      });
      return;
    }

    if (pageLink) {
      const fallbackPage = {
        id: pageLink.pageName,
        pageId: '',
        pageName: pageLink.pageName,
        pageTitle: preview.title || pageLink.pageTitle || pageLink.pageName,
        pageDescription: preview.description,
        avatar: preview.image,
        url: pageLink.publicUrl,
      };

      if (pageLink.explicit) {
        navigation.navigate(ROUTES.PAGE_DETAIL, { page: fallbackPage });
        return;
      }

      try {
        const page = await feedPageLinkRepository.getPageDetail({
          pageName: pageLink.pageName,
        });
        navigation.navigate(ROUTES.PAGE_DETAIL, { page });
        return;
      } catch {
        Linking.openURL(pageLink.publicUrl).catch(() => undefined);
        return;
      }
    }

    Linking.openURL(preview.url).catch(() => undefined);
  }, [navigation, pageLink, preview]);

  if (isPagePreview) {
    return (
      <VnseeaPageLinkPreviewCard
        preview={preview}
        publisher={publisher}
        caption={caption}
        onPress={handlePress}
        mediaEnabled={mediaEnabled}
      />
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      {preview.image ? (
        <FeedMediaImage
          uri={preview.image}
          style={{
            width: '100%',
            aspectRatio: 1.91,
            backgroundColor: '#E2E8F0',
          }}
          resizeMode="cover"
          enabled={mediaEnabled}
        />
      ) : (
        <View className="h-28 items-center justify-center bg-info-soft">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
            <MapPin size={28} color="#2563EB" />
          </View>
        </View>
      )}
      <View className="bg-slate-50 px-4 py-3">
        <View className="flex-row items-center">
          <MapPin size={14} color="#2563EB" />
          <Text
            className="ml-1.5 flex-1 text-caption-secondary"
            numberOfLines={1}
          >
            {hostLabel}
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
});

const SinglePostImage = React.memo(function SinglePostImage({
  uri,
  onPress,
  enabled = true,
}: {
  uri: string;
  onPress: () => void;
  enabled?: boolean;
}) {
  const reservedAspectRatioRef = useRef({
    identity: uri,
    value: getCachedMediaAspectRatio(uri, 0.75, 1.91, 4 / 3),
  });
  if (reservedAspectRatioRef.current.identity !== uri) {
    reservedAspectRatioRef.current = {
      identity: uri,
      value: getCachedMediaAspectRatio(uri, 0.75, 1.91, 4 / 3),
    };
  }
  const aspectRatio = reservedAspectRatioRef.current.value;

  useEffect(() => {
    if (!uri || !enabled) return undefined;
    if (Platform.OS === 'android') return undefined;
    if (
      feedMediaGeometryStorage.getAspectRatio(uri) ||
      MEDIA_ASPECT_RATIO_CACHE.has(uri)
    ) {
      return undefined;
    }

    let cancelled = false;
    // Resolve geometry as soon as media loading is enabled. Deferring this
    // until interactions finish makes the row resize after a fling settles.
    Image.getSize(
      uri,
      (width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        // Learn geometry for the next mount without resizing the row that is
        // already participating in FlashList layout.
        cacheMediaAspectRatio(uri, width, height);
      },
      err => {
        if (!cancelled) {
          console.warn('[SinglePostImage] getSize failed', err);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [enabled, uri]);

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
        enabled={enabled}
      />
    </TouchableOpacity>
  );
});

// ── TextPostCard ──────────────────────────────────────────────────────
function areScalarArraysEqual<T>(previous?: readonly T[], next?: readonly T[]) {
  if (previous === next) return true;
  if (!previous || !next) return !previous && !next;
  if (previous.length !== next.length) return false;

  for (let index = 0; index < previous.length; index += 1) {
    if (previous[index] !== next[index]) return false;
  }

  return true;
}

function arePublishersEqual(
  previous?: FeedPost['publisher'],
  next?: FeedPost['publisher'],
) {
  if (previous === next) return true;
  if (!previous || !next) return !previous && !next;

  return (
    previous.id === next.id &&
    previous.name === next.name &&
    previous.username === next.username &&
    previous.avatarUrl === next.avatarUrl &&
    previous.isFollowing === next.isFollowing &&
    previous.entityType === next.entityType &&
    previous.pageId === next.pageId &&
    previous.ownerId === next.ownerId
  );
}

function areFeelingsEqual(
  previous?: FeedTextPost['feeling'],
  next?: FeedTextPost['feeling'],
) {
  if (previous === next) return true;
  if (!previous || !next) return !previous && !next;

  return (
    previous.type === next.type &&
    previous.value === next.value &&
    previous.emoji === next.emoji &&
    previous.label === next.label
  );
}

function areTaggedUsersEqual(
  previous?: FeedPost['taggedUsers'],
  next?: FeedPost['taggedUsers'],
) {
  if (previous === next) return true;
  if (!previous || !next) return !previous && !next;
  if (previous.length !== next.length) return false;

  return previous.every((user, index) => {
    const nextUser = next[index];
    return (
      user.id === nextUser.id &&
      user.name === nextUser.name &&
      user.username === nextUser.username &&
      user.avatarUrl === nextUser.avatarUrl
    );
  });
}

function arePostLocationsEqual(
  previous?: FeedPost['location'],
  next?: FeedPost['location'],
) {
  if (previous === next) return true;
  if (!previous || !next) return !previous && !next;
  return previous.label === next.label;
}

function areGroupContextsEqual(
  previous?: FeedPost['groupContext'],
  next?: FeedPost['groupContext'],
) {
  if (previous === next) return true;
  if (!previous || !next) return !previous && !next;

  return (
    previous.id === next.id &&
    previous.title === next.title &&
    previous.username === next.username &&
    previous.avatarUrl === next.avatarUrl &&
    previous.coverUrl === next.coverUrl &&
    previous.url === next.url &&
    previous.privacy === next.privacy
  );
}

function areSharedPostsEqual(
  previous?: FeedTextPost['sharedFrom'] | FeedVideoPost['sharedFrom'],
  next?: FeedTextPost['sharedFrom'] | FeedVideoPost['sharedFrom'],
) {
  if (previous === next) return true;
  if (!previous || !next) return !previous && !next;

  return (
    previous.id === next.id &&
    previous.caption === next.caption &&
    previous.publisherName === next.publisherName &&
    previous.publisherAvatar === next.publisherAvatar &&
    previous.postedAt === next.postedAt &&
    areScalarArraysEqual(previous.mentionNames, next.mentionNames) &&
    areScalarArraysEqual(previous.photos, next.photos)
  );
}

function areLinkPreviewsEqual(
  previous?: FeedTextPost['linkPreview'] | FeedVideoPost['linkPreview'],
  next?: FeedTextPost['linkPreview'] | FeedVideoPost['linkPreview'],
) {
  if (previous === next) return true;
  if (!previous || !next) return !previous && !next;

  return (
    previous.url === next.url &&
    previous.title === next.title &&
    previous.description === next.description &&
    previous.image === next.image
  );
}

function areFeedPostBaseRenderFieldsEqual(
  previous: FeedTextPost | FeedVideoPost,
  next: FeedTextPost | FeedVideoPost,
) {
  return (
    previous.kind === next.kind &&
    previous.id === next.id &&
    previous.activity === next.activity &&
    previous.caption === next.caption &&
    previous.postedAt === next.postedAt &&
    previous.likeCount === next.likeCount &&
    previous.commentCount === next.commentCount &&
    previous.isLiked === next.isLiked &&
    previous.myReaction === next.myReaction &&
    previous.privacy === next.privacy &&
    previous.shareCount === next.shareCount &&
    previous.viewCount === next.viewCount &&
    previous.shareUrl === next.shareUrl &&
    previous.isSaved === next.isSaved &&
    previous.sharedPostId === next.sharedPostId &&
    previous.sharedPost === next.sharedPost &&
    areFeelingsEqual(previous.feeling, next.feeling) &&
    areTaggedUsersEqual(previous.taggedUsers, next.taggedUsers) &&
    arePostLocationsEqual(previous.location, next.location) &&
    areGroupContextsEqual(previous.groupContext, next.groupContext) &&
    arePublishersEqual(previous.publisher, next.publisher) &&
    areScalarArraysEqual(previous.mentionNames, next.mentionNames) &&
    areScalarArraysEqual(previous.topReactions, next.topReactions) &&
    areSharedPostsEqual(previous.sharedFrom, next.sharedFrom) &&
    areLinkPreviewsEqual(previous.linkPreview, next.linkPreview)
  );
}

function areCommonCardPropsEqual(previous: any, next: any) {
  return (
    previous.copy === next.copy &&
    previous.onReact === next.onReact &&
    previous.onOpenPicker === next.onOpenPicker &&
    previous.onCommentTap === next.onCommentTap &&
    previous.onShare === next.onShare &&
    previous.onOpenReactions === next.onOpenReactions &&
    previous.gestureX === next.gestureX &&
    previous.gestureY === next.gestureY &&
    previous.gestureActive === next.gestureActive &&
    previous.gestureStartX === next.gestureStartX &&
    previous.gestureStartY === next.gestureStartY &&
    previous.hasDragged === next.hasDragged &&
    previous.navigateToProfile === next.navigateToProfile &&
    previous.onOpenPostMenu === next.onOpenPostMenu &&
    previous.showIdentityHeader === next.showIdentityHeader &&
    previous.showGroupContext === next.showGroupContext &&
    previous.performanceSurface === next.performanceSurface &&
    previous.commentNavigationMode === next.commentNavigationMode
  );
}

function areHomeVideoPostCardPropsEqual(previous: any, next: any) {
  const previousPost = previous.post as FeedVideoPost;
  const nextPost = next.post as FeedVideoPost;

  return (
    areCommonCardPropsEqual(previous, next) &&
    previous.isActive === next.isActive &&
    previous.isScreenFocused === next.isScreenFocused &&
    previous.keepPreparedVideoMounted === next.keepPreparedVideoMounted &&
    previous.deferMediaUntilVisible === next.deferMediaUntilVisible &&
    areFeedPostBaseRenderFieldsEqual(previousPost, nextPost) &&
    previousPost.videoUrl === nextPost.videoUrl &&
    previousPost.thumbnailUrl === nextPost.thumbnailUrl
  );
}

function areTextPostCardPropsEqual(previous: any, next: any) {
  const previousPost = previous.post as FeedTextPost;
  const nextPost = next.post as FeedTextPost;

  return (
    areCommonCardPropsEqual(previous, next) &&
    previous.onPhotoPress === next.onPhotoPress &&
    previous.onPostPress === next.onPostPress &&
    previous.deferMediaUntilVisible === next.deferMediaUntilVisible &&
    areFeedPostBaseRenderFieldsEqual(previousPost, nextPost) &&
    previousPost.audioUrl === nextPost.audioUrl &&
    areScalarArraysEqual(previousPost.photos, nextPost.photos)
  );
}

export const TextPostCard = React.memo(function TextPostCard({
  post,
  copy: providedCopy,
  onReact,
  onOpenPicker,
  onCommentTap,
  onPhotoPress,
  onShare,
  onOpenReactions,
  navigateToProfile,
  onOpenPostMenu,
  onPostPress,
  showIdentityHeader = true,
  showGroupContext = false,
  commentNavigationMode = 'detail',
  deferMediaUntilVisible = false,
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
  // Kept in the public card props for existing screen call sites. The
  // screen-level ReactionPickerOverlay owns these shared values so opening a
  // picker never changes the card layout or native media subtree.
  gestureX?: any;
  gestureY?: any;
  gestureActive?: any;
  gestureStartX?: any;
  gestureStartY?: any;
  hasDragged?: any;
  navigateToProfile: (userId: string) => void;
  onOpenPostMenu?: (post: FeedPost) => void;
  showIdentityHeader?: boolean;
  showGroupContext?: boolean;
  /**
   * Tapping the post header / body opens the dedicated PostDetail
   * screen. We intentionally keep this separate from `onCommentTap`
   * (which only opens the comments sheet) so users can still peek
   * at comments inline without leaving the feed.
   */
  onPostPress?: (post: FeedPost) => void;
  commentNavigationMode?: 'detail' | 'callback';
  deferMediaUntilVisible?: boolean;
}) {
  const language = useAppLanguage();
  const copy = providedCopy ?? FEED_COPY[language];
  const trackedMediaVisible = useFeedPostMediaVisible(post.id);
  const mediaEnabled = !deferMediaUntilVisible || trackedMediaVisible;
  const navigation = useNavigation<any>();
  const likeButtonRef = useRef<View>(null);

  // Profile tap handler
  const handleProfilePress = useCallback(() => {
    if (!post.isAnonymous && post.publisher.id) {
      if (!navigateToFeedPublisherPage(navigation, post.publisher)) {
        navigateToProfile(post.publisher.id);
      }
    }
  }, [navigateToProfile, navigation, post.isAnonymous, post.publisher]);

  const handleLikeTap = useCallback(
    () => onReact(post.id, 'like'),
    [onReact, post.id],
  );
  const handleCommentTap = useCallback(() => {
    if (commentNavigationMode === 'callback') {
      onCommentTap(post.id);
      return;
    }
    navigateToPostComments(navigation, post.id, post);
  }, [commentNavigationMode, navigation, onCommentTap, post]);

  const handleLikeLongPress = useCallback(() => {
    if (!likeButtonRef.current) {
      onOpenPicker(
        post.id,
        100,
        getFeedReactionPickerAnchorY(200, post.likeCount, post.commentCount),
      );
      return;
    }
    likeButtonRef.current.measureInWindow((x, y, width) => {
      onOpenPicker(
        post.id,
        x + width / 2,
        getFeedReactionPickerAnchorY(y, post.likeCount, post.commentCount),
      );
    });
  }, [onOpenPicker, post.id, post.likeCount, post.commentCount]);

  const handleOpenSharedPost = useCallback(
    (sourcePostId: string) => {
      const sharedPost = post.sharedPost;
      if (
        sharedPost?.postId === sourcePostId &&
        sharedPost.content.kind === 'live'
      ) {
        if (sharedPost.content.state === 'offline') {
          Alert.alert(
            language === 'vi' ? 'Phiên live đã kết thúc' : 'Live has ended',
            language === 'vi'
              ? 'Bạn không thể tham gia phiên live này nữa.'
              : 'You can no longer join this live session.',
          );
          return;
        }
        const livePostId = Number(sourcePostId);
        if (Number.isFinite(livePostId) && livePostId > 0) {
          navigation.navigate(ROUTES.LIVE_ROOM, { postId: livePostId });
          return;
        }
      }
      navigation.navigate(ROUTES.POST_DETAIL, { postId: sourcePostId });
    },
    [language, navigation, post.sharedPost],
  );

  const handleOpenSharedPhoto = useCallback(
    (photoIndex: number) => {
      const sharedPost = post.sharedPost;
      if (!sharedPost || sharedPost.content.kind !== 'text') return;
      const sourcePost: FeedTextPost = {
        ...post,
        id: sharedPost.postId,
        caption: sharedPost.caption,
        mentionNames: sharedPost.mentionNames,
        photos: sharedPost.content.photos,
        audioUrl: sharedPost.content.audioUrl,
        linkPreview: sharedPost.content.linkPreview,
        postedAt: sharedPost.postedAt,
        privacy: sharedPost.privacy,
        publisher: sharedPost.publisher,
        sharedFrom: undefined,
        sharedPostId: undefined,
        sharedPost: undefined,
      };
      onPhotoPress(sourcePost, photoIndex);
    },
    [onPhotoPress, post],
  );

  // Photo grid: Facebook-style 2x2 grid, shows 4 photos max
  // When total > 4, the 4th photo shows "+N" overlay
  const totalPhotos = post.photos.length;
  const visibleCaption = post.linkPreview
    ? cleanVnseeaPageShareCaption(post.caption, post.linkPreview.url)
    : post.caption;
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
        {showIdentityHeader ? (
          <PostIdentityHeader
            avatar={post.publisher.avatarUrl}
            name={
              post.isAnonymous
                ? copy.anonymousPrivacyLabel
                : post.publisher.name
            }
            time={
              post.sharedPost
                ? formatPostTime(post.postedAt, copy)
                : `${formatPostTime(post.postedAt, copy)} (${copy.photoCount(
                    totalPhotos,
                  )})`
            }
            copy={copy}
            onPress={
              !post.isAnonymous && post.publisher.id
                ? handleProfilePress
                : undefined
            }
            onMorePress={onOpenPostMenu}
            onDetailPress={onPostPress}
            post={post}
            showGroupContext={showGroupContext}
          />
        ) : null}
        {post.sharedFrom && !post.sharedPost ? (
          <Text
            className={`${
              showIdentityHeader ? '-mt-3 ' : ''
            }mb-3 text-caption-secondary`}
          >
            {copy.sharedPostLabel(
              post.sharedFrom.isAnonymous
                ? copy.anonymousPrivacyLabel
                : post.sharedFrom.publisherName,
            )}
          </Text>
        ) : null}
        {visibleCaption ? (
          <ExpandablePostCaption
            text={visibleCaption}
            mentionNames={post.mentionNames}
            copy={copy}
            collapsible={totalPhotos > 0}
          />
        ) : null}
        {post.linkPreview ? (
          <FeedLinkPreviewCard
            preview={post.linkPreview}
            publisher={post.publisher}
            caption={post.caption}
            mediaEnabled={mediaEnabled}
          />
        ) : null}
      </FeedCardContent>
      {post.sharedPost ? (
        <FeedCardContent>
          <SharedPostPreviewCard
            model={post.sharedPost}
            onOpenPost={handleOpenSharedPost}
            onOpenPhoto={handleOpenSharedPhoto}
            mediaEnabled={mediaEnabled}
          />
        </FeedCardContent>
      ) : totalPhotos === 1 ? (
        <FeedMediaFrame className="bg-transparent">
          <SinglePostImage
            uri={post.photos[0]}
            onPress={() => onPhotoPress(post, 0)}
            enabled={mediaEnabled}
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
            const photoGutterStyle =
              Platform.OS === 'ios'
                ? getPhotoGridItemGutterStyle(
                    index,
                    totalPhotos,
                    PHOTO_GRID_GUTTER_SIZE,
                  )
                : ANDROID_PHOTO_GRID_ITEM_STYLE;

            return (
              <TouchableOpacity
                key={`${post.id}-photo-${index}-${url}`}
                onPress={() => onPhotoPress(post, index)}
                activeOpacity={0.95}
                delayPressIn={0}
                style={[photoLayout, photoGutterStyle]}
              >
                <View style={PHOTO_GRID_TILE_STYLE}>
                  <StaggeredFeedMediaImage
                    uri={url}
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#F1F5F9',
                    }}
                    resizeMode="cover"
                    enabled={mediaEnabled}
                    mountOrder={index}
                    staggerEnabled={
                      deferMediaUntilVisible && Platform.OS === 'android'
                    }
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
      {!post.sharedPost && post.audioUrl && mediaEnabled ? (
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
          onCommentTap={handleCommentTap}
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
        />
      </FeedCardContent>
    </FeedCardSurface>
  );
}, areTextPostCardPropsEqual);
