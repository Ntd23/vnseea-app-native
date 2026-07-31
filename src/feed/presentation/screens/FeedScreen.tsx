// Description: Renders the Stitch Facebook-style VNSEEA feed inside the main tab shell.
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
  AppState,
  DeviceEventEmitter,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Platform,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Alert,
  InteractionManager,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  ArrowUp,
  Bell,
  Building2,
  Globe,
  Heart,
  Lock,
  Megaphone,
  Plus,
  Radio,
  ThumbsUp,
  Users,
} from 'lucide-react-native';
import { PostMenuActionSheet } from '../../../shared-kernel/presentation/components/PostMenuActionSheet';
import {
  PhotoViewerModal,
  type PhotoViewerState,
} from '../../../shared-kernel/presentation/components/PhotoViewerModal';
import { tabBarVisibility } from '../../../navigation/tabBarVisibility';
import { getTabReselectAction } from '../../../navigation/tabReselectAction';
import {
  createNativeTabScrollPublisherState,
  publishNativeTabScrollBehavior,
  publishNativeTabScrollIntent,
} from '../../../navigation/nativeTabScrollPublisher';
import { useMainTabContentInsets } from '../../../navigation/useMainTabContentInsets';
import { ReelCommentsSheet } from '../../../reels/presentation/components/ReelCommentsSheet';
import { preloadReelsStartupPage } from '../../../reels/application/services/reelsStartupFeed';
import { FeedShareBottomSheet } from '../components/FeedShareBottomSheet';
import PostReactionsSheet from '../components/PostReactionsSheet';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
  initialWindowMetrics,
  type Edge,
} from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToPostComments } from '../../../navigation/postNavigation';
import type {
  MainTabParamList,
  RootStackParamList,
} from '../../../navigation/types';
import { useFeedViewModel } from '../../application/view-models/useFeedViewModel';
import { postCreatedEvents } from '../../application/events/postCreatedEvents';
import {
  hiddenPostsStorage,
  LOCAL_POST_HIDDEN_EVENT,
} from '../../infrastructure/storage/hiddenPostsStorage';
import { usePostRealtimeScope } from '../../application/realtime/usePostRealtimeScope';
import { useDeferredVisiblePostIds } from '../../application/realtime/useDeferredVisiblePostIds';
import { feedLogoEvents } from '../../application/events/feedLogoEvents';
import type {
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
  FeedProductPost,
  FeedEventPost,
  FeedJobPost,
  FeedPollPost,
  FeedAdPost,
} from '../../domain/types/feed.types';
import { isFeedPostShareable } from '../../domain/policies/feedPostPrivacy';
import type {
  FeedSource,
  ReportPostInput,
  SharePostInput,
} from '../../domain/repositories/FeedRepository';
import { useFeedCommentsViewModel } from '../../application/view-models/useFeedCommentsViewModel';
import { prefetchFeedComments } from '../../application/feedCommentsCache';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { canAdAppearInHomeFeed } from '../../../advertising/application/services/adPlacement';
import { useProductsOnFeedViewModel } from '../../../product/application/view-models/useProductsOnFeedViewModel';
import type { ProductItem } from '../../../product/domain/types/product.types';
import {
  FeedCardContent,
  FeedCardSurface,
  FeedGlassActionBar,
  FeedGlassActionButton,
  FeedMediaFrame,
  FeedTouchableCardSurface,
} from '../components/FeedCardChrome';
import { PollPostCard } from '../components/PollPostCard';
import {
  FeedJobPostCard,
  FeedProductPostCard,
} from '../components/FeedCommercePostCards';
import { FeedHeader } from '../components/FeedHeader';
import { FeedHeaderCollapseFrame } from '../components/FeedHeaderCollapseFrame';
import { resolveFeedChromeTopInset } from '../components/feedHeaderInsets';
import { HomeFeedIntro } from '../components/HomeFeedIntro';
import { navigateToOwnProfile } from '../../../navigation/profileNavigation';
import { FeedFilterTabs } from '../components/FeedFilterTabs';
import {
  createFeedChromeCollapseState,
  createFeedChromeCollapseStateAtScrollY,
  getNextFeedChromeCollapseState,
  resetFeedChromeScrollIntent,
  type FeedChromeCollapseState,
} from '../components/feedChromeCollapse';
import {
  feedActiveVideoIdSnapshot,
  FEED_COPY,
  type FeedCopy,
  getFeedVideoPosterCacheKeyForPost,
  HomeVideoPostCard,
  publishFeedActiveVideo,
  publishFeedScrollBusy,
  publishFeedVisibleMediaPostIds,
  publishFeedWarmVideoIds,
  ReactionPickerOverlay,
  TextPostCard,
  useFeedPostMediaVisible,
} from '../components/PostCards';
import { markFeedMediaLoaded } from '../../application/state/feedMediaLoadState';
import { FeedMediaImage } from '../components/FeedMediaImage';
import { useEventsOnFeedViewModel, EventPostCard } from '../../../events';
import {
  type JobsItem,
} from '../../../jobs/domain/types/jobs.types';
import { useJobsOnFeedViewModel } from '../../../jobs/application/view-models/useJobsOnFeedViewModel';
import type { GroupItem } from '../../../community/domain/types/community.types';
import { useSuggestedGroupsOnFeedViewModel } from '../../../community/application/view-models/useSuggestedGroupsOnFeedViewModel';
import { useLiveViewModel } from '../../../live/application/view-models/useLiveViewModel';
import {
  isInlineLivePostIdViewable,
  pickInlineLivePostId,
} from '../../../live/application/inlineLiveAutoplay';
import type { LiveStreamItem } from '../../../live/domain/types/live.types';
import { InlineLiveStreamPlayer } from '../../../live/presentation/components/InlineLiveStreamPlayer';
import { useInlineLiveAspectRatio } from '../../../live/presentation/components/inlineLiveAspect';
import { usePagesOnFeedViewModel } from '../../../pages';
import type { PagesItem } from '../../../pages/domain/types/pages.types';
import {
  useFundingOnFeedViewModel,
  FeedFundingCarousel,
} from '../../../funding';
import type { FundingItem } from '../../../funding/domain/types/funding.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  getFeedVideoActiveUpdate,
  isFeedVideoIdViewable,
  pickFeedVideoAutoplayCandidate,
  pickFeedViewableVideoId,
} from './feedVideoAutoplay';
import { reuseStableItemsById } from './feedListItemStability';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import {
  createCachedVideoPosterThumbnail,
  getCachedVideoPosterThumbnail,
} from '../../../shared-kernel/application/utils/videoThumbnails';

const FEED_IS_ANDROID = Platform.OS === 'android';
const LOAD_MORE_THROTTLE_MS = FEED_IS_ANDROID ? 420 : 520;
const SUPPLEMENTAL_LOAD_MORE_THROTTLE_MS = 2500;
const FEED_NEW_POST_PROBE_INTERVAL_MS = 30000;
const FEED_NEW_POST_PROBE_LIMIT = 8;
const FEED_EARLY_LOAD_DISTANCE_MULTIPLIER = FEED_IS_ANDROID ? 5.2 : 4.2;
const FEED_EARLY_LOAD_MIN_DISTANCE = FEED_IS_ANDROID ? 4200 : 3600;
const FEED_CAROUSEL_IMAGE_PREFETCH_ITEMS = 4;
const FEED_IMAGE_PREFETCH_BEHIND_ITEMS = 1;
const FEED_IMAGE_PREFETCH_AHEAD_ITEMS = FEED_IS_ANDROID ? 3 : 8;
const FEED_SCROLLING_IMAGE_PREFETCH_AHEAD_ITEMS = FEED_IS_ANDROID ? 2 : 6;
const MAX_IMAGE_PREFETCH_URLS = FEED_IS_ANDROID ? 8 : 14;
const MAX_PENDING_IMAGE_PREFETCH_URLS = FEED_IS_ANDROID ? 16 : 36;
const MAX_REMEMBERED_IMAGE_PREFETCH_URLS = FEED_IS_ANDROID ? 128 : 220;
const IMAGE_PREFETCH_BATCH_SIZE = FEED_IS_ANDROID ? 1 : 3;
const IMAGE_PREFETCH_MAX_CONCURRENCY = FEED_IS_ANDROID ? 1 : 3;
const IMAGE_PREFETCH_BATCH_DELAY_MS = FEED_IS_ANDROID ? 100 : 60;
const FEED_LOAD_MORE_LOOKAHEAD_ITEMS = FEED_IS_ANDROID ? 18 : 14;
const FEED_VIDEO_WARM_BEHIND_ITEMS = 0;
const FEED_VIDEO_WARM_AHEAD_ITEMS = FEED_IS_ANDROID ? 0 : 1;
const FEED_VIDEO_WARM_MAX_COUNT = 1;
const FEED_SCROLLING_VIDEO_WARM_MAX_COUNT = 0;
const FEED_VIDEO_POSTER_PREFETCH_BEHIND_ITEMS = 1;
const FEED_VIDEO_POSTER_PREFETCH_AHEAD_ITEMS = FEED_IS_ANDROID ? 2 : 4;
const FEED_VIDEO_POSTER_PREFETCH_LIMIT = FEED_IS_ANDROID ? 1 : 2;
const FEED_VIDEO_POSTER_PREFETCH_BATCH_DELAY_MS = FEED_IS_ANDROID ? 220 : 160;
const MAX_REMEMBERED_VIDEO_POSTER_KEYS = FEED_IS_ANDROID ? 64 : 120;
const FEED_VIDEO_VISIBLE_PERCENT = 1;
const FEED_VIDEO_VIEWABLE_PERCENT = 55;
const FEED_VIDEO_ACTIVE_DWELL_MS = 120;
const FEED_INLINE_LIVE_ACTIVE_DWELL_MS = 140;
const FEED_MEDIA_MOUNT_BEHIND_ITEMS = 1;
// Image.prefetch already warms a larger runway. Native-mounting three photo
// cards ahead on Android caused their decode/aspect-ratio work to arrive as a
// visible three-card hitch, so keep only the nearest card mounted ahead.
const FEED_MEDIA_MOUNT_AHEAD_ITEMS = FEED_IS_ANDROID ? 1 : 3;
const FEED_SCROLL_DIRECTION_THRESHOLD = 6;
const FEED_SCREEN_HEIGHT = Dimensions.get('window').height;
// A lower numeric rate sheds fling momentum sooner than React Native's
// default while preserving direct finger tracking and pull-to-refresh.
const FEED_SCROLL_DECELERATION_RATE = FEED_IS_ANDROID ? 0.94 : 0.992;
const FEED_LIST_DRAW_DISTANCE = FEED_IS_ANDROID
  ? Math.max(2400, Math.round(FEED_SCREEN_HEIGHT * 2.8))
  : Math.max(3000, Math.round(FEED_SCREEN_HEIGHT * 3.8));
const FEED_LIST_RECYCLE_POOL_SIZE = FEED_IS_ANDROID ? 18 : 32;
const FEED_LIST_MAINTAIN_VISIBLE_CONTENT_POSITION = {
  disabled: false,
  // Preserve the item currently under the user's finger when delayed live,
  // page, group, or funding rows are inserted above the viewport.
  autoscrollToTopThreshold: 96,
};
const FEED_LIST_CONTENT_STYLE = {
  paddingBottom: 24,
};
const FEED_LOAD_MORE_FOOTER_STYLE = {
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  minHeight: 96,
  paddingHorizontal: 24,
};
const FEED_HEADER_BAR_HEIGHT = 68;
const FEED_FILTER_BAR_HEIGHT = 66;
const FEED_IOS_HEADER_OVERLAY_HEIGHT = FEED_HEADER_BAR_HEIGHT;
const FEED_HEADER_CONTENT_HEIGHT =
  FEED_HEADER_BAR_HEIGHT + FEED_FILTER_BAR_HEIGHT;
const FEED_SAFE_AREA_CLASS_NAME =
  Platform.OS === 'ios' ? 'flex-1' : 'flex-1 bg-white';
const FEED_SAFE_AREA_STYLE =
  Platform.OS === 'ios' ? { backgroundColor: 'transparent' } : undefined;
const FEED_ROOT_SAFE_AREA_EDGES: Edge[] =
  Platform.OS === 'ios' ? ['left', 'right'] : ['left', 'right', 'bottom'];
const FEED_LIVE_DEBUG_PREFIX = '[VNSEEA_CALL_DEBUG]';
type FeedScrollDirection = 'up' | 'down' | 'none';

function rememberBoundedFeedCacheKey(
  keys: Set<string>,
  key: string,
  limit: number,
) {
  keys.delete(key);
  keys.add(key);

  while (keys.size > limit) {
    const oldestKey = keys.values().next().value as string | undefined;
    if (!oldestKey) break;
    keys.delete(oldestKey);
  }
}

function logFeedLiveDebug(event: string, data: Record<string, unknown> = {}) {
  const payload = {
    event,
    at: new Date().toISOString(),
    ...data,
  };

  try {
    console.log(FEED_LIVE_DEBUG_PREFIX, JSON.stringify(payload));
  } catch {
    console.log(FEED_LIVE_DEBUG_PREFIX, event, data);
  }
}

type FeedNav = NativeStackNavigationProp<RootStackParamList>;

function canPostAppearOnHomeFeed(post: FeedPost) {
  return post.kind !== 'ad' || canAdAppearInHomeFeed(post.appears);
}

function canPostAppearInFeedSource(
  post: FeedPost,
  source: FeedSource | 'photos',
): boolean {
  if (source === 'photos') {
    return (
      post.kind === 'text' &&
      Array.isArray(post.photos) &&
      post.photos.length > 0
    );
  }

  if (source === 'following') {
    return Boolean(post.publisher?.isFollowing);
  }

  return true;
}

function getFeedPostTimestamp(post?: FeedPost | null) {
  const value = Number(post?.postedAt);
  return Number.isFinite(value) ? value : 0;
}

function getFeedPostNumericId(post?: FeedPost | null) {
  const value = Number(post?.id);
  return Number.isFinite(value) ? value : 0;
}

function isPostNewerThanFeedTop(
  post: FeedPost,
  currentPosts: FeedPost[],
): boolean {
  const topPost = currentPosts[0];
  if (!topPost) return false;

  const postTime = getFeedPostTimestamp(post);
  const topTime = getFeedPostTimestamp(topPost);

  if (postTime > 0 && topTime > 0 && postTime !== topTime) {
    return postTime > topTime;
  }

  const postId = getFeedPostNumericId(post);
  const topId = getFeedPostNumericId(topPost);
  if (postId > 0 && topId > 0 && postId !== topId) {
    return postId > topId;
  }

  return postTime > topTime;
}

const images = {
  me: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzOiwu9eVVr13_YUuLqFaZS5DMZSQjPQqGVp3m79mrFIOksxUaafxT6NOD7hWY1ovOOtnGqlKKmPy3vZS5LhbiBbX6XQyXexcys3dCd700wiTgDGs4KRiq5vM64_gByXbAgZ356Xg_1i8PN9yGMKSGadOq-PYlT497w8_Ab1upM7ybuluWZspaikqyZ-BtES8q1oKfjZ9BHYtV1APztnG0dp7bW-4y0QkJh46DJatsljh0w0WsaL0Os2nes04dtts1t6X_kG8wXqw',
  thao: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVjT2j3-JWVTKbI9Szqgq45cHChxxv3Ti1Eq_fcnSCFqKQMU6i0MB2ZiF4ZQZxXpPKN56QvCsXYQLmwOLBwurBMEEug9Gqu5YCyj33_RibQH5jVVKXqwApduV9h-Jcgyze8qOaBc0z5l-IqPUj5RJA2U0HNfn2S7Pk9DTtRsNM1KXRNGXdTgJDuEDY2tVnTEFjvksSHOUPV3Mo__d0yEsEbhPGGMGTrqli4Vn1D6fAdsrbw2VKZObiOKRw2UGau-Lq0fFb2RqdgHA',
  minh: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdfITHvQjrR8L1_2sOLHIyey49H2Emaaqjat63iank6DIpDpcuNWXZG3VolK_uQg7B4_O9tHNvRbnghZ-w-jsbH6wGnCp44b_M0hl4bD94H0H4RlmtbEb1VaUG5ErpUbhhh3yOhrtln4kAzX6M8x5f0J78QITGv6UcXFqv2JWMK-AjccElyllcECcIqhV-vZMRy92dx7-bL3Eh9skc6DwjFCcYHGtxdxVyy0xduMmUzC_9HPKN5--f0mnYKNCoWS8NzhmK9y2ZYhc',
  linh: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwDnldb1oeJtQc5Ty502_VoV-RGFH2GnRP5swMZTqgDBPlAiACC4p9OPJoM73IH3Xizl2Npy6FSl3hGqCDxxSh0rnXYsIObvcET0hTEGV2ShtwgUMGOLfPi21i-UDy3gtzkN2-DCUwbXTV7yNimbjJ6lxcaOBcIij9Ss1Ohscnc4N7FHd_s6VxQwBMN8yYLVNGW0lasCy80nX4ghwNxggXCisqCgEgAt0J4adXJxFM472_FNhdfaQ0zZZ6UDGXhcQWP3R_d9lrUvs',
  thanhAvatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCAi1HrpI_JeiBSBNZgzEjac4CDZufeONeHZFaeQsPWPupV_LZFU7BsPKiSSUaVQE4Qxv4H7F0CDVCR8LBEwgwxXBGB2-4xfpVZy_QHh6LJZEEfltVlAKw_gmO5nzxFr4iS8wswp0s7xQkukbRZ7tMqVth8ExvGeFR4PeENK7xYOVSUCXa76YosWtKjxSMafzJVwRIqQPfps6KkYDk3drQP9y9BoCvUHX80omFueDhTP6a5um8cQM9d1D3inWLOuNFbwrI8tx_qoSI',
  scenic:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAowyP14vMWb2lmxJ3IviTjBnvm7fYAYbcMD4rDqmPNrlSAU9vJqF5uU92MSxvTUHADVPoQoqdATPchdY19bt09zvrNEG7YFxz5jfTSO4AFtQQHd_s7dLY1ADdrHKwErHhPL1lRrB7v-FWrxBrxQvDvg39mTJGkyrCnwZmPkBRJpy9P4FVyAmup7jC0Wdsk5FzGy8YG1wpW9POpoQjC-Chlnwr1ClKAgx1SDwMSECuZ9s118CleNcRUq4NCkLbsbsYzVullqdTidhs',
  longAvatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD1WMz8a0A0LOOR4XQmtgcx8NK5XVWk6fFVbsoaFj_hHQYmSGcX-hhys95HYg758SaumnM4pCGChaFl7SYR_5jQlHiiLvVMWI1LKGjbu4mgXTiTjMVRMKSFcbsSwGe2vpc0X2TEwBLaFYqCfJI-IOk03xODemSJlDSm1GNKEf2pKHtn0-xb9_sCH61WhE0TraQYxFO0wUb7pIQXlilbmTzpM1X4ejSNP6CCHJVXGAAwW0Of1RFi2NVFHhwIxBJFgu8oGRgLlzz8Ykg',
  galleryOne:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDdFRXJWZNZM_1MT0ZlnLfsnMoHjpzSc68XAB3euQa75mardov7I40wMT_7osCSBbFH15ZJWSl_kZor-OdyT5Kgupj1yIqQ8R3KAyKBg02ewt5B-taq75pstRGscuEPABajN7FjEK_7CBNQU0KeX2X-iHzn9YBBM8FVmXiZN0Th49InVT7FIH9BEZ1X_7spmzic7QN2A45sPSwLVhvPCX-jXmgukW6qUTWDs26kVpGNk-tPCbpLTP2toQjnSmYdFaIFQa_wpnPVDzA',
  galleryTwo:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDoM0j0eB99BtjoLe53u9ZsuzdkvOwJ9mMSSUSFkKzXBkqGBYsPNu4VPv3pzG299vMHqCD0jNQPyVZCmqBWkgouRL9mC64GBQQ_sggMH0Dujv8WTYh208k6ARCSwozWheUICf5QLhgdnWAaghX-E0C5McV_bt4TqDy6rvYdH_bAv85m82CWKTT5Rg9TScoac9viO5aUHQHCkSR-fr25_FJyLCue0cRMHlsUkkiO79Q7Z48ZjgnSmDY329BGJMkthyZ_bl2B9498rcE',
  galleryThree:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDH-V8R7QLEDhYsZV3ofxqoU-i0vwiS-tdcmlL1NQgIP2uN6s4pzZGRRQ9nq5_iI8sEYf4q3fIwIIJRwPHm0GeO8V1T-t8jS523mr3fHMYKFUrUdo8W83lJ7kmKl2pIeuNAY2CNLH-9T7DZeuaIwQKz_aO10Ebgr4lpFIx3b5JJm4aV0-uZ_eSZBcC60g01Joq3AgUnhNKyzJ22npyaeviY1bwRzrCgUeXoj6bwTrkXwg-OjABPgnwfxdFOBQg9KOTlEef0BJWSjCg',
};

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

function formatCount(count: number) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatPostTime(timestamp: number | undefined, copy: FeedCopy) {
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

// â”€â”€ Facebook-style summary row above the action buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Shows stacked reaction badges followed by either the viewer's
// own reaction label ("Bạn và 14 người khác") OR a generic count when the
// viewer hasn't reacted.

const FeedAdPostCard = React.memo(function FeedAdPostCard({
  post,
  copy,
}: {
  post: FeedAdPost;
  copy: FeedCopy;
}) {
  const mediaVisible = useFeedPostMediaVisible(post.id);
  const handlePress = useCallback(() => {
    if (!post.targetUrl) return;
    Linking.openURL(post.targetUrl).catch(() => {
      Alert.alert(copy.adLinkErrorTitle, copy.adLinkErrorMessage);
    });
  }, [copy.adLinkErrorMessage, copy.adLinkErrorTitle, post.targetUrl]);

  return (
    <FeedCardSurface>
      <FeedCardContent>
        <View className="flex-row items-center">
          <Avatar uri={post.publisher.avatarUrl ?? images.me} size={42} />
          <View className="ml-3 flex-1">
            <Text
              className="text-title-primary text-[#111827]"
              numberOfLines={1}
            >
              {post.publisher.name}
            </Text>
            <View className="mt-0.5 flex-row items-center">
              <Text className="text-xs font-semibold text-[#64748b]">
                {copy.sponsored}
              </Text>
              <Text className="mx-1 text-xs text-[#94a3b8]">{'\u2022'}</Text>
              <Globe size={12} color="#94a3b8" />
            </View>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-soft">
            <Megaphone size={18} color={APP_BRAND_COLOR} />
          </View>
        </View>

        <Text
          className="mt-4 text-[15px] font-bold text-[#111827]"
          numberOfLines={2}
        >
          {post.title}
        </Text>
        {!!post.description && (
          <Text className="mt-1 text-sm text-[#475569]" numberOfLines={3}>
            {post.description}
          </Text>
        )}
      </FeedCardContent>

      {!!post.mediaUrl && (
        <FeedMediaFrame className="h-56 bg-slate-100">
          <TouchableOpacity
            activeOpacity={post.targetUrl ? 0.88 : 1}
            onPress={handlePress}
            className="h-full w-full"
          >
            {post.isVideo ? (
              <View className="h-full w-full items-center justify-center bg-slate-900">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-white/15">
                  <Text className="ml-1 text-3xl text-white">{'\u25B6'}</Text>
                </View>
                <Text className="mt-3 text-sm font-semibold text-white">
                  {copy.adVideo}
                </Text>
              </View>
            ) : (
              <FeedMediaImage
                uri={post.mediaUrl}
                className="h-full w-full"
                resizeMode="cover"
                enabled={mediaVisible}
              />
            )}
          </TouchableOpacity>
        </FeedMediaFrame>
      )}

      <FeedGlassActionBar className="border-t border-[#dddfe2] px-3 py-3 pt-3">
        <View className="mr-4 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-[0.4px] text-[#64748b]">
            {copy.ad}
          </Text>
          <Text className="mt-0.5 text-sm text-[#64748b]" numberOfLines={1}>
            {post.targetUrl || copy.sponsoredContent}
          </Text>
        </View>

        <FeedGlassActionButton
          activeOpacity={0.86}
          disabled={!post.targetUrl}
          onPress={handlePress}
          className="rounded-lg bg-[#e7f0ff] px-4 py-2"
        >
          <Text className="text-sm font-bold text-brand">{copy.learnMore}</Text>
        </FeedGlassActionButton>
      </FeedGlassActionBar>
    </FeedCardSurface>
  );
});

const FeedLivePostCard = React.memo(
  function FeedLivePostCard({
    item,
    copy,
    isActive,
    onPress,
  }: {
    item: LiveStreamItem;
    copy: FeedCopy;
    isActive: boolean;
    onPress: (item: LiveStreamItem) => void;
  }) {
    const handlePress = useCallback(() => {
      onPress(item);
    }, [item, onPress]);

    const startedAtSeconds = Math.floor(
      new Date(item.startedAt).getTime() / 1000,
    );
    const timeText = Number.isFinite(startedAtSeconds)
      ? formatPostTime(startedAtSeconds, copy)
      : copy.now;
    const isStale = item.state === 'stale';
    const { aspectRatio, handleVideoDimensionsChange } =
      useInlineLiveAspectRatio(`${item.postId}:${item.streamName}`);

    return (
      <FeedTouchableCardSurface activeOpacity={0.88} onPress={handlePress}>
        <FeedCardContent>
          <View className="flex-row items-center">
            <Avatar uri={item.publisher.avatarUrl || images.me} size={42} />
            <View className="ml-3 flex-1">
              <Text
                className="text-title-primary text-[#111827]"
                numberOfLines={1}
              >
                {item.publisher.name}
              </Text>
              <View className="mt-0.5 flex-row items-center">
                <View
                  className={`h-2 w-2 rounded-full ${
                    isStale ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                />
                <Text className="ml-1 text-xs font-bold text-[#64748b]">
                  {isStale ? copy.livePending : copy.livePlaying}
                </Text>
                <Text className="mx-1 text-xs text-[#94a3b8]">{'\u2022'}</Text>
                <Text className="text-xs font-semibold text-[#64748b]">
                  {timeText}
                </Text>
              </View>
            </View>
            <View className="h-9 w-9 items-center justify-center rounded-full bg-red-50">
              <Radio size={18} color="#ef4444" />
            </View>
          </View>
        </FeedCardContent>

        <FeedMediaFrame
          className="relative bg-[#0f172a]"
          style={{ aspectRatio }}
        >
          <InlineLiveStreamPlayer
            active={isActive}
            item={item}
            onVideoDimensionsChange={handleVideoDimensionsChange}
          />
          <View className="absolute right-3 top-3 flex-row items-center rounded-full bg-red-500 px-3 py-1">
            <View className="h-2 w-2 rounded-full bg-white" />
            <Text className="ml-1 text-xs font-extrabold text-white">LIVE</Text>
          </View>
          <View className="absolute bottom-3 left-3 flex-row items-center rounded-full bg-black/65 px-3 py-1.5">
            <Users size={14} color="#ffffff" />
            <Text className="ml-1 text-xs font-bold text-white">
              {item.viewerCount}
            </Text>
          </View>
        </FeedMediaFrame>

        <FeedCardContent>
          <Text
            className="text-[15px] font-extrabold text-[#111827]"
            numberOfLines={2}
          >
            {item.title || copy.liveTitle(item.publisher.name)}
          </Text>
          {!!item.description && (
            <Text className="mt-1 text-sm text-[#475569]" numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </FeedCardContent>
      </FeedTouchableCardSurface>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.viewerCount === next.item.viewerCount &&
    prev.item.state === next.item.state &&
    prev.item.thumbnailUrl === next.item.thumbnailUrl &&
    prev.item.title === next.item.title &&
    prev.item.description === next.item.description &&
    prev.isActive === next.isActive &&
    prev.copy === next.copy,
);

const FeedEventPostCard = React.memo(
  function FeedEventPostCard({
    post,
    copy,
    onPress,
    onProfilePress,
    onSharePost,
    onToggleInterested,
    onToggleGoing,
  }: {
    post: FeedEventPost;
    copy: FeedCopy;
    onPress: (event: FeedEventPost['event']) => void;
    onProfilePress: (userId: string) => void;
    onSharePost: (post: FeedPost) => void;
    onToggleInterested: (eventId: string | number) => void;
    onToggleGoing: (eventId: string | number) => void;
    onEditPress?: (event: FeedEventPost['event']) => void;
  }) {
    const mediaVisible = useFeedPostMediaVisible(post.id);
    const handleShare = useCallback(() => {
      onSharePost(post);
    }, [onSharePost, post]);

    const handleInterested = useCallback(() => {
      onToggleInterested(post.event.id);
    }, [onToggleInterested, post.event.id]);

    const handleGoing = useCallback(() => {
      onToggleGoing(post.event.id);
    }, [onToggleGoing, post.event.id]);

    const handleEdit = useCallback(
      (eventItem: FeedEventPost['event']) => {
        Alert.alert(
          copy.editTitle,
          copy.editEventMessage(
            eventItem.event_name || eventItem.name || copy.eventFallback,
          ),
        );
      },
      [copy],
    );

    return (
      <EventPostCard
        event={post.event}
        onPress={onPress}
        onProfilePress={onProfilePress}
        onShare={handleShare}
        onInterestedPress={handleInterested}
        onGoingPress={handleGoing}
        onEditPress={handleEdit}
        loadMedia={mediaVisible}
      />
    );
  },
  (prev, next) =>
    prev.post === next.post &&
    prev.onPress === next.onPress &&
    prev.onProfilePress === next.onProfilePress &&
    prev.onSharePost === next.onSharePost &&
    prev.onToggleInterested === next.onToggleInterested &&
    prev.onToggleGoing === next.onToggleGoing &&
    prev.copy === next.copy,
);

const GROUP_SKELETONS = [
  'group-skeleton-1',
  'group-skeleton-2',
  'group-skeleton-3',
];
const GROUP_CAROUSEL_SEPARATOR_STYLE = { width: 12 };

function GroupCarouselSeparator() {
  return <View style={GROUP_CAROUSEL_SEPARATOR_STYLE} />;
}

const SuggestedGroupsCarousel = React.memo(function SuggestedGroupsCarousel({
  groups,
  isLoading,
  copy,
  onOpenGroups,
  onOpenGroup,
}: {
  groups: GroupItem[];
  isLoading: boolean;
  copy: FeedCopy;
  onOpenGroups: () => void;
  onOpenGroup: (group: GroupItem) => void;
}) {
  if (!isLoading && groups.length === 0) return null;

  const data: Array<GroupItem | string> =
    groups.length > 0 ? groups : GROUP_SKELETONS;

  return (
    <View className="border-y border-[#e5e7eb] bg-white py-4">
      <View className="mb-3 flex-row items-center justify-between px-4">
        <View>
          <Text className="text-[17px] font-extrabold text-[#111827]">
            {copy.suggestedGroupsTitle}
          </Text>
          <Text className="mt-0.5 text-xs font-semibold text-[#64748b]">
            {copy.suggestedGroupsSubtitle}
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.75} onPress={onOpenGroups}>
          <Text className="text-sm font-bold text-brand">{copy.seeAll}</Text>
        </TouchableOpacity>
      </View>

      <FlatList<GroupItem | string>
        horizontal
        data={data}
        keyExtractor={item => (typeof item === 'string' ? item : item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ItemSeparatorComponent={GroupCarouselSeparator}
        nestedScrollEnabled
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item }) => {
          if (typeof item === 'string') {
            return (
              <View className="w-[220px] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
                <View className="h-24 bg-[#eef2f7]" />
                <View className="p-3">
                  <View className="h-5 w-36 rounded-full bg-[#eef2f7]" />
                  <View className="mt-2 h-4 w-24 rounded-full bg-[#eef2f7]" />
                  <View className="mt-4 h-9 rounded-xl bg-[#eef2f7]" />
                </View>
              </View>
            );
          }

          const cover = item.cover || item.avatar || images.scenic;
          const avatar = item.avatar || cover;

          return (
            <TouchableOpacity
              className="w-[220px] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white"
              activeOpacity={0.88}
              onPress={() => onOpenGroup(item)}
            >
              <View className="h-24 bg-[#111827]">
                <FeedMediaImage
                  uri={cover}
                  className="h-full w-full opacity-90"
                  resizeMode="cover"
                />
                <View className="absolute bottom-[-22px] left-3 h-14 w-14 rounded-full border-4 border-white bg-white">
                  <Image
                    source={{ uri: avatar }}
                    className="h-full w-full rounded-full"
                    resizeMode="cover"
                    fadeDuration={0}
                  />
                </View>
              </View>
              <View className="px-3 pb-3 pt-8">
                <Text
                  className="text-[15px] font-extrabold text-[#111827]"
                  numberOfLines={2}
                >
                  {item.groupTitle || item.groupName || copy.groupFallback}
                </Text>
                <View className="mt-2 flex-row items-center">
                  {item.privacy === 'private' ? (
                    <Lock size={13} color="#64748b" />
                  ) : (
                    <Globe size={13} color="#64748b" />
                  )}
                  <Text className="ml-1 text-xs font-semibold text-[#64748b]">
                    {item.privacy === 'private'
                      ? copy.privateLabel
                      : copy.publicLabel}
                  </Text>
                  <Text className="mx-1 text-xs text-[#94a3b8]">
                    {'\u2022'}
                  </Text>
                  <Users size={13} color="#64748b" />
                  <Text className="ml-1 text-xs font-semibold text-[#64748b]">
                    {formatCount(Number(item.members) || 0)}
                  </Text>
                </View>
                <View className="mt-4 flex-row items-center justify-center rounded-xl bg-[#e7f0ff] py-2.5">
                  <Plus size={16} color={APP_BRAND_COLOR} />
                  <Text className="ml-1 text-sm font-extrabold text-brand">
                    {copy.viewGroup}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
});

const PAGE_SKELETONS = [
  'page-skeleton-1',
  'page-skeleton-2',
  'page-skeleton-3',
];

const SuggestedPagesCarousel = React.memo(
  function SuggestedPagesCarousel({
    pages,
    isLoading,
    copy,
    onOpenPages,
    onOpenPage,
    onLikePage,
    onFollowPage,
  }: {
    pages: PagesItem[];
    isLoading: boolean;
    copy: FeedCopy;
    onOpenPages: () => void;
    onOpenPage: (page: PagesItem) => void;
    onLikePage: (pageId: string | number) => void;
    onFollowPage: (pageId: string | number) => void;
  }) {
    if (!isLoading && pages.length === 0) return null;

    const data: Array<PagesItem | string> =
      pages.length > 0 ? pages : PAGE_SKELETONS;

    return (
      <View className="border-y border-[#e5e7eb] bg-white py-4">
        <View className="mb-3 flex-row items-center justify-between px-4">
          <View>
            <Text className="text-[17px] font-extrabold text-[#111827]">
              {copy.suggestedPagesTitle}
            </Text>
            <Text className="mt-0.5 text-xs font-semibold text-[#64748b]">
              {copy.suggestedPagesSubtitle}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.75} onPress={onOpenPages}>
            <Text className="text-sm font-bold text-brand">{copy.seeAll}</Text>
          </TouchableOpacity>
        </View>

        <FlatList<PagesItem | string>
          horizontal
          data={data}
          keyExtractor={item =>
            typeof item === 'string' ? item : String(item.id)
          }
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ItemSeparatorComponent={GroupCarouselSeparator}
          nestedScrollEnabled
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={({ item }) => {
            if (typeof item === 'string') {
              return (
                <View className="w-[220px] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
                  <View className="h-24 bg-[#eef2f7]" />
                  <View className="p-3">
                    <View className="h-5 w-36 rounded-full bg-[#eef2f7]" />
                    <View className="mt-2 h-4 w-28 rounded-full bg-[#eef2f7]" />
                    <View className="mt-4 h-9 rounded-xl bg-[#eef2f7]" />
                  </View>
                </View>
              );
            }

            const cover = item.cover || item.avatar || images.scenic;
            const avatar = item.avatar || cover;
            const title = item.pageTitle || item.pageName || copy.pageFallback;
            const subtitle =
              item.pageCategory || item.pageDescription || copy.publicLabel;

            return (
              <TouchableOpacity
                className="w-[220px] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white"
                activeOpacity={0.88}
                onPress={() => onOpenPage(item)}
              >
                <View className="h-24 bg-[#111827]">
                  <FeedMediaImage
                    uri={cover}
                    className="h-full w-full opacity-90"
                    resizeMode="cover"
                  />
                  <View className="absolute bottom-[-22px] left-3 h-14 w-14 rounded-full border-4 border-white bg-white">
                    <Image
                      source={{ uri: avatar }}
                      className="h-full w-full rounded-full"
                      resizeMode="cover"
                      fadeDuration={0}
                    />
                  </View>
                </View>
                <View className="px-3 pb-3 pt-8">
                  <Text
                    className="text-[15px] font-extrabold text-[#111827]"
                    numberOfLines={2}
                  >
                    {title}
                  </Text>
                  <View className="mt-2 flex-row items-center">
                    <Building2 size={13} color="#64748b" />
                    <Text
                      className="ml-1 flex-1 text-xs font-semibold text-[#64748b]"
                      numberOfLines={1}
                    >
                      {subtitle}
                    </Text>
                  </View>
                  <View className="mt-1 flex-row items-center">
                    <ThumbsUp size={13} color="#64748b" />
                    <Text className="ml-1 text-xs font-semibold text-[#64748b]">
                      {formatCount(Number(item.likes) || 0)}
                    </Text>
                  </View>
                  <View className="mt-4 flex-row gap-2">
                    <TouchableOpacity
                      className={`flex-1 flex-row items-center justify-center rounded-xl py-2.5 ${
                        item.isLiked ? 'bg-[#e7f0ff]' : 'bg-[#f1f5f9]'
                      }`}
                      activeOpacity={0.8}
                      onPress={() => onLikePage(item.pageId || item.id)}
                    >
                      <Heart
                        size={15}
                        color={item.isLiked ? APP_BRAND_COLOR : '#64748b'}
                        fill={item.isLiked ? APP_BRAND_COLOR : 'transparent'}
                      />
                      <Text
                        className={`ml-1 text-xs font-extrabold ${
                          item.isLiked ? 'text-brand' : 'text-[#64748b]'
                        }`}
                      >
                        {item.isLiked ? copy.pageLiked : copy.pageLike}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`flex-1 flex-row items-center justify-center rounded-xl py-2.5 ${
                        item.isFollowing ? 'bg-[#e7f0ff]' : 'bg-[#f1f5f9]'
                      }`}
                      activeOpacity={0.8}
                      onPress={() => onFollowPage(item.pageId || item.id)}
                    >
                      <Bell
                        size={15}
                        color={item.isFollowing ? APP_BRAND_COLOR : '#64748b'}
                        fill={
                          item.isFollowing ? APP_BRAND_COLOR : 'transparent'
                        }
                      />
                      <Text
                        className={`ml-1 text-xs font-extrabold ${
                          item.isFollowing ? 'text-brand' : 'text-[#64748b]'
                        }`}
                      >
                        {item.isFollowing
                          ? copy.pageFollowing
                          : copy.pageFollow}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    className="mt-2 flex-row items-center justify-center rounded-xl bg-[#e7f0ff] py-2.5"
                    activeOpacity={0.8}
                    onPress={() => onOpenPage(item)}
                  >
                    <Plus size={16} color={APP_BRAND_COLOR} />
                    <Text className="ml-1 text-sm font-extrabold text-brand">
                      {copy.viewPage}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  },
  (prev, next) =>
    prev.pages === next.pages &&
    prev.isLoading === next.isLoading &&
    prev.copy === next.copy &&
    prev.onOpenPages === next.onOpenPages &&
    prev.onOpenPage === next.onOpenPage &&
    prev.onLikePage === next.onLikePage &&
    prev.onFollowPage === next.onFollowPage,
);

function PostSkeleton({ animated = true }: { animated?: boolean }) {
  // Pulse animation: opacity oscillates every 1.5s.
  const opacity = useSharedValue(animated ? 0.4 : 0.58);
  useEffect(() => {
    if (!animated) {
      opacity.value = 0.58;
      return;
    }
    opacity.value = withRepeat(withTiming(0.8, { duration: 750 }), -1, true);
  }, [animated, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <FeedCardSurface>
        <FeedCardContent>
          {/* Header: avatar + name + time */}
          <View className="mb-4 flex-row items-center">
            <View className="h-10 w-10 rounded-full bg-slate-200" />
            <View className="ml-3 flex-1">
              <View className="h-3 w-32 rounded bg-slate-200" />
              <View className="mt-2 h-2 w-20 rounded bg-slate-200" />
            </View>
          </View>
          {/* Caption */}
          <View className="h-3 w-full rounded bg-slate-200" />
          <View className="mt-2 h-3 w-3/4 rounded bg-slate-200" />
        </FeedCardContent>
        {/* Media placeholder for photo / video skeletons. */}
        <FeedMediaFrame className="h-56 bg-slate-200" />
        {/* Action row */}
        <FeedGlassActionBar className="border-t border-[#dddfe2] px-3 py-3 pt-3">
          <View className="h-6 w-16 rounded bg-slate-200" />
          <View className="h-6 w-20 rounded bg-slate-200" />
          <View className="h-6 w-16 rounded bg-slate-200" />
        </FeedGlassActionBar>
      </FeedCardSurface>
    </Animated.View>
  );
}

type FeedListItem =
  | { type: 'intro'; id: 'feed-intro' }
  | { type: 'post'; id: string; post: FeedPost }
  | { type: 'live'; id: string; item: LiveStreamItem }
  | {
      type: 'groups-carousel';
      id: string;
      groups: GroupItem[];
      isLoading: boolean;
    }
  | {
      type: 'pages-carousel';
      id: string;
      pages: PagesItem[];
      isLoading: boolean;
    }
  | {
      type: 'funding-carousel';
      id: string;
      campaigns: FundingItem[];
      isLoading: boolean;
      currencySymbol: string;
    };

function areFeedListItemsRenderEquivalent(
  previous: FeedListItem,
  next: FeedListItem,
): boolean {
  if (previous.type !== next.type) return false;

  switch (previous.type) {
    case 'intro':
      return true;
    case 'post':
      return next.type === 'post' && previous.post === next.post;
    case 'live':
      return next.type === 'live' && previous.item === next.item;
    case 'groups-carousel':
      return (
        next.type === 'groups-carousel' &&
        previous.groups === next.groups &&
        previous.isLoading === next.isLoading
      );
    case 'pages-carousel':
      return (
        next.type === 'pages-carousel' &&
        previous.pages === next.pages &&
        previous.isLoading === next.isLoading
      );
    case 'funding-carousel':
      return (
        next.type === 'funding-carousel' &&
        previous.campaigns === next.campaigns &&
        previous.isLoading === next.isLoading &&
        previous.currencySymbol === next.currencySymbol
      );
  }

  return false;
}

function isRemoteFeedImageUrl(url?: string): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function collectFeedPostImageUrls(post: FeedPost): string[] {
  const urls: string[] = [];

  if (isRemoteFeedImageUrl(post.publisher?.avatarUrl)) {
    urls.push(post.publisher.avatarUrl);
  }

  if (post.kind === 'text') {
    post.photos?.slice(0, 4).forEach(photo => {
      if (isRemoteFeedImageUrl(photo)) urls.push(photo);
    });

    if (isRemoteFeedImageUrl(post.linkPreview?.image)) {
      urls.push(post.linkPreview.image);
    }
    return urls;
  }

  if (post.kind === 'video') {
    if (isRemoteFeedImageUrl(post.thumbnailUrl)) {
      urls.push(post.thumbnailUrl);
    }
    return urls;
  }

  if (post.kind === 'product') {
    post.product?.images?.slice(0, 3).forEach((image: any) => {
      if (isRemoteFeedImageUrl(image?.image)) urls.push(image.image);
    });
    return urls;
  }

  if (post.kind === 'event') {
    const cover = post.event.event_cover || post.event.cover;
    if (isRemoteFeedImageUrl(cover)) urls.push(cover);
    return urls;
  }

  if (post.kind === 'job') {
    if (isRemoteFeedImageUrl(post.job.image)) urls.push(post.job.image);
    if (isRemoteFeedImageUrl(post.job.page?.avatar)) {
      urls.push(post.job.page.avatar);
    }
    if (isRemoteFeedImageUrl(post.job.page?.cover)) {
      urls.push(post.job.page.cover);
    }
    return urls;
  }

  if (post.kind === 'ad' && isRemoteFeedImageUrl(post.mediaUrl)) {
    urls.push(post.mediaUrl);
  }

  return urls;
}

function pushRemoteFeedImageUrl(urls: string[], url?: string | null) {
  const normalizedUrl = url ?? undefined;
  if (isRemoteFeedImageUrl(normalizedUrl)) {
    urls.push(normalizedUrl);
  }
}

function collectFeedListItemImageUrls(item: FeedListItem): string[] {
  if (item.type === 'post') {
    return collectFeedPostImageUrls(item.post);
  }

  const urls: string[] = [];

  if (item.type === 'live') {
    pushRemoteFeedImageUrl(urls, item.item.publisher.avatarUrl);
    pushRemoteFeedImageUrl(urls, item.item.thumbnailUrl);
    return urls;
  }

  if (item.type === 'groups-carousel') {
    item.groups.slice(0, FEED_CAROUSEL_IMAGE_PREFETCH_ITEMS).forEach(group => {
      pushRemoteFeedImageUrl(urls, group.cover);
      pushRemoteFeedImageUrl(urls, group.avatar);
    });
    return urls;
  }

  if (item.type === 'pages-carousel') {
    item.pages.slice(0, FEED_CAROUSEL_IMAGE_PREFETCH_ITEMS).forEach(page => {
      pushRemoteFeedImageUrl(urls, page.cover);
      pushRemoteFeedImageUrl(urls, page.avatar);
    });
    return urls;
  }

  if (item.type === 'funding-carousel') {
    item.campaigns
      .slice(0, FEED_CAROUSEL_IMAGE_PREFETCH_ITEMS)
      .forEach(campaign => {
        pushRemoteFeedImageUrl(urls, campaign.image);
      });
  }

  return urls;
}

// Section wrapper â€” header + empty/loading/error states + list of cards.

function interleaveSupplementalPosts(
  basePosts: FeedPost[],
  productPosts: FeedProductPost[],
  eventPosts: FeedEventPost[],
  jobPosts: FeedJobPost[],
): FeedPost[] {
  const result: FeedPost[] = [];
  let productIndex = 0;
  let eventIndex = 0;
  let jobIndex = 0;

  basePosts.forEach((post, index) => {
    result.push(post);
    const slot = index + 1;

    if (slot % 7 === 0 && productIndex < productPosts.length) {
      result.push(productPosts[productIndex]);
      productIndex += 1;
    }

    if (slot % 11 === 0 && eventIndex < eventPosts.length) {
      result.push(eventPosts[eventIndex]);
      eventIndex += 1;
    }

    if (slot % 13 === 0 && jobIndex < jobPosts.length) {
      result.push(jobPosts[jobIndex]);
      jobIndex += 1;
    }
  });

  return result;
}

function FeedScreen() {
  const navigation = useNavigation<FeedNav>();
  const route = useRoute<RouteProp<MainTabParamList, typeof ROUTES.FEED>>();
  const language = useAppLanguage();
  const copy = FEED_COPY[language];
  const feedLoadErrorMessage =
    language === 'vi'
      ? 'Không tải được bảng tin. Vui lòng kiểm tra kết nối và thử lại.'
      : 'Could not load the feed. Check your connection and try again.';
  const feedLoadMoreMessage =
    language === 'vi'
      ? 'Đang tải thêm bài viết…'
      : 'Loading more posts…';
  const vm = useFeedViewModel();
  const feedSafeAreaInsets = useSafeAreaInsets();
  const { bottomContentPadding, scrollIndicatorBottomInset } =
    useMainTabContentInsets();
  // Top-bar logo: FeedScreen only acts on the scroll-to-top event when it
  // is the currently focused tab. Declared up here so the hook order
  // matches the rest of FeedScreen (no conditional hooks below).
  const isFeedTabFocused = useIsFocused();
  const userVm = useCurrentUserViewModel();
  const currentUserId = userVm.user?.userId;
  const feedPosts = useMemo(
    () => vm.posts.filter(canPostAppearOnHomeFeed),
    [vm.posts],
  );
  const hasFeedContent = feedPosts.length > 0;
  const prependFeedPost = vm.prependPost;
  const toggleFeedReaction = vm.toggleReaction;
  const voteFeedPoll = vm.votePoll;
  const saveFeedPost = vm.savePost;
  const reportFeedPost = vm.reportPost;
  const deleteFeedPost = vm.deletePost;
  const hideFeedPost = vm.hidePost;
  const shareFeedPost = vm.sharePost;
  const reloadFeedPosts = vm.reloadPosts;
  const peekLatestFeedPosts = vm.peekLatestPosts;
  const updateFeedPublisherFollowState = vm.updatePublisherFollowState;
  const mainFeedListRef = useRef<FlashListRef<FeedListItem>>(null);
  const feedTabRefreshInFlightRef = useRef(false);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const pendingNewPostsRef = useRef<FeedPost[]>([]);
  const feedPostsRef = useRef<FeedPost[]>(feedPosts);
  const activeFeedSource = vm.feedSource;
  const activeFeedSourceRef = useRef<FeedSource | 'photos'>(activeFeedSource);
  const isFeedTabFocusedRef = useRef(isFeedTabFocused);

  useEffect(() => {
    if (!isFeedTabFocused || !hasFeedContent) return;

    let cancelled = false;
    let started = false;
    const startReelsPreload = () => {
      if (cancelled || started) return;
      started = true;
      // Warm only the Reel data. Poster prefetching competes with the first
      // video request and is unnecessary now that Reels opens straight onto
      // the player without a one-second thumbnail cover.
      preloadReelsStartupPage().catch(() => undefined);
    };
    const preloadTask =
      InteractionManager.runAfterInteractions(startReelsPreload);
    const preloadFallbackTimer = setTimeout(startReelsPreload, 800);

    return () => {
      cancelled = true;
      clearTimeout(preloadFallbackTimer);
      preloadTask.cancel();
    };
  }, [hasFeedContent, isFeedTabFocused]);
  const isFeedLoadingRef = useRef(vm.isLoading);
  const hasFeedLoadedOnceRef = useRef(vm.hasLoadedOnce);
  const isCheckingLatestPostsRef = useRef(false);

  useEffect(() => {
    isFeedTabFocusedRef.current = isFeedTabFocused;
    isFeedLoadingRef.current = vm.isLoading;
    hasFeedLoadedOnceRef.current = vm.hasLoadedOnce;
  }, [isFeedTabFocused, vm.hasLoadedOnce, vm.isLoading]);

  const enqueueNewPostCandidates = useCallback(
    (
      posts: FeedPost[],
      options: { requireNewerThanFeedTop?: boolean } = {},
    ) => {
      if (posts.length === 0) return;

      const currentPosts = feedPostsRef.current;
      const visibleIds = new Set(feedPostsRef.current.map(item => item.id));
      const pendingIds = new Set(
        pendingNewPostsRef.current.map(item => item.id),
      );
      const nextPosts = posts
        .filter(post => {
          if (!post?.id) return false;
          if (!canPostAppearOnHomeFeed(post)) return false;
          if (hiddenPostsStorage.isHidden(String(post.id), currentUserId)) {
            return false;
          }
          if (!canPostAppearInFeedSource(post, activeFeedSourceRef.current)) {
            return false;
          }
          if (visibleIds.has(post.id) || pendingIds.has(post.id)) return false;
          if (
            options.requireNewerThanFeedTop &&
            !isPostNewerThanFeedTop(post, currentPosts)
          ) {
            return false;
          }

          pendingIds.add(post.id);
          return true;
        })
        .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));

      if (nextPosts.length === 0) return;

      pendingNewPostsRef.current.push(...nextPosts);
      setHasNewPosts(true);
    },
    [currentUserId],
  );

  useEffect(() => {
    feedPostsRef.current = feedPosts;

    if (!hasNewPosts || pendingNewPostsRef.current.length === 0) return;

    const visibleIds = new Set(feedPosts.map(post => post.id));
    pendingNewPostsRef.current = pendingNewPostsRef.current.filter(
      post =>
        post?.id &&
        canPostAppearOnHomeFeed(post) &&
        !visibleIds.has(post.id) &&
        !hiddenPostsStorage.isHidden(String(post.id), currentUserId) &&
        isPostNewerThanFeedTop(post, feedPosts),
    );

    if (pendingNewPostsRef.current.length === 0) {
      setHasNewPosts(false);
    }
  }, [currentUserId, feedPosts, hasNewPosts]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      LOCAL_POST_HIDDEN_EVENT,
      (event: { postId?: string; userId?: string }) => {
        const postId = String(event?.postId ?? '').trim();
        if (!postId) return;
        const currentOwnerKey = currentUserId || 'guest';
        if (event?.userId && event.userId !== currentOwnerKey) return;

        pendingNewPostsRef.current = pendingNewPostsRef.current.filter(
          post => String(post.id) !== postId,
        );
        if (pendingNewPostsRef.current.length === 0) {
          setHasNewPosts(false);
        }
      },
    );
    return () => subscription.remove();
  }, [currentUserId]);

  const handleLoadNewPosts = useCallback(() => {
    mainFeedListRef.current?.scrollToOffset({ offset: 0, animated: true });
    const visibleIds = new Set(feedPostsRef.current.map(post => post.id));
    const pendingPosts = pendingNewPostsRef.current.filter(
      post =>
        post?.id &&
        canPostAppearOnHomeFeed(post) &&
        !visibleIds.has(post.id) &&
        !hiddenPostsStorage.isHidden(String(post.id), currentUserId),
    );

    pendingPosts
      .slice()
      .reverse()
      .forEach(post => {
        prependFeedPost(post);
      });
    pendingNewPostsRef.current = [];
    setHasNewPosts(false);
  }, [currentUserId, prependFeedPost]);

  // Top-bar logo button: when tapped while already on the Feed tab,
  // scroll the feed back to the top and trigger a fresh reload — same
  // behaviour as Facebook/TikTok. We check `useIsFocused` so this only
  // runs when the Feed tab is the active tab, not when the user tapped
  // the logo from another tab to switch back to Feed.
  useEffect(() => {
    return feedLogoEvents.subscribe(() => {
      if (!isFeedTabFocused) return;
      mainFeedListRef.current?.scrollToOffset({ offset: 0, animated: true });
      reloadFeedPosts();
    });
  }, [isFeedTabFocused, reloadFeedPosts]);
  const setFeedScrollBusy = vm.setScrollBusy;
  const setActiveFeedSource = vm.setFeedSource;
  useEffect(() => {
    if (route.params?.filter !== 'photos') return;
    setActiveFeedSource('photos');
    mainFeedListRef.current?.scrollToOffset({ offset: 0, animated: false });
    (navigation as any).setParams?.({ filter: undefined });
  }, [navigation, route.params?.filter, setActiveFeedSource]);

  useEffect(() => {
    activeFeedSourceRef.current = activeFeedSource;
    pendingNewPostsRef.current = [];
    setHasNewPosts(false);
  }, [activeFeedSource]);

  const checkForRemoteNewPosts = useCallback(async () => {
    if (!isFeedTabFocusedRef.current) return;
    if (!hasFeedLoadedOnceRef.current || isFeedLoadingRef.current) return;
    if (AppState.currentState !== 'active') return;
    if (isCheckingLatestPostsRef.current) return;

    isCheckingLatestPostsRef.current = true;
    try {
      const latestPosts = await peekLatestFeedPosts(FEED_NEW_POST_PROBE_LIMIT);
      enqueueNewPostCandidates(latestPosts, {
        requireNewerThanFeedTop: true,
      });
    } catch (caught) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[FeedScreen] latest post probe failed', caught);
      }
    } finally {
      isCheckingLatestPostsRef.current = false;
    }
  }, [enqueueNewPostCandidates, peekLatestFeedPosts]);

  useEffect(() => {
    if (!isFeedTabFocused) return undefined;

    const firstProbe = setTimeout(() => {
      void checkForRemoteNewPosts();
    }, 1200);
    const interval = setInterval(() => {
      void checkForRemoteNewPosts();
    }, FEED_NEW_POST_PROBE_INTERVAL_MS);

    return () => {
      clearTimeout(firstProbe);
      clearInterval(interval);
    };
  }, [checkForRemoteNewPosts, isFeedTabFocused]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        void checkForRemoteNewPosts();
      }
    });

    return () => subscription.remove();
  }, [checkForRemoteNewPosts]);
  const rawTopInset = resolveFeedChromeTopInset(
    feedSafeAreaInsets.top,
    initialWindowMetrics?.insets?.top,
  );
  const topInset = rawTopInset;
  const androidStatusBarBackgroundStyle = useMemo(
    () => ({
      backgroundColor: APP_BRAND_COLOR,
      height: topInset,
      left: 0,
      position: 'absolute' as const,
      right: 0,
      top: 0,
      zIndex: 20,
    }),
    [topInset],
  );
  const feedRefreshProgressViewOffset =
    Platform.OS === 'ios'
      ? topInset + FEED_IOS_HEADER_OVERLAY_HEIGHT
      : topInset + FEED_HEADER_CONTENT_HEIGHT;
  const feedHeaderOverlayHeight = feedRefreshProgressViewOffset;
  const newPostsButtonTop = feedHeaderOverlayHeight + 12;
  const feedListContentStyle = useMemo(
    () => [
      FEED_LIST_CONTENT_STYLE,
      {
        paddingTop: feedHeaderOverlayHeight,
        ...(Platform.OS === 'ios'
          ? { paddingBottom: bottomContentPadding }
          : null),
      },
    ],
    [bottomContentPadding, feedHeaderOverlayHeight],
  );
  const feedScrollIndicatorInsets = useMemo(
    () =>
      Platform.OS === 'ios'
        ? { bottom: scrollIndicatorBottomInset }
        : undefined,
    [scrollIndicatorBottomInset],
  );

  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const hasDragged = useSharedValue(false);

  // Viewport tracking & Autoplay logic for video cards.
  const [activeInlineLivePostId, setActiveInlineLivePostIdState] = useState<
    number | null
  >(null);
  const activeInlineLivePostIdRef = useRef<number | null>(null);
  const pendingActiveInlineLivePostIdRef = useRef<number | null>(null);
  const pendingDwellInlineLivePostIdRef = useRef<number | null>(null);
  const inlineLiveDwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const activeVideoIdRef = useRef<string | null>(feedActiveVideoIdSnapshot);
  const pendingActiveVideoIdRef = useRef<string | null>(null);
  const pendingDwellVideoIdRef = useRef<string | null>(null);
  const activeVideoDwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const latestVisibleFeedItemsRef = useRef<any[]>([]);
  const latestViewableFeedItemsRef = useRef<any[]>([]);
  const feedListItemsRef = useRef<FeedListItem[]>([]);
  const stableFeedListItemsRef = useRef<FeedListItem[]>([]);
  const feedListItemIndexByIdRef = useRef<Map<string, number>>(new Map());
  const prefetchedImageUrlsRef = useRef<Set<string>>(new Set());
  const queuedImagePrefetchUrlsRef = useRef<Set<string>>(new Set());
  const pendingImagePrefetchUrlsRef = useRef<string[]>([]);
  const imagePrefetchInFlightCountRef = useRef(0);
  const imagePrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const prefetchedVideoPosterKeysRef = useRef<Set<string>>(new Set());
  const queuedVideoPosterKeysRef = useRef<Set<string>>(new Set());
  const pendingVideoPosterPostsRef = useRef<FeedVideoPost[]>([]);
  const videoPosterPrefetchTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const videoPosterPrefetchTaskRef = useRef<ReturnType<
    typeof InteractionManager.runAfterInteractions
  > | null>(null);
  const feedVideoRefsRef = useRef(
    new Map<string, React.ElementRef<typeof View>>(),
  );
  const feedMeasureRequestRef = useRef(0);
  const feedScrollYRef = useRef(0);
  const feedScrollDirectionRef = useRef<FeedScrollDirection>('none');
  const feedViewportHeightRef = useRef(0);
  const isScrollingRef = useRef(false);
  const lastLoadMoreRequestAtRef = useRef(0);
  const lastSupplementalLoadMoreRequestAtRef = useRef(0);
  const triggerLoadMoreRef = useRef<() => void>(() => {});
  const supplementalLoadStartedRef = useRef(false);
  const supplementalInteractionRef = useRef<ReturnType<
    typeof InteractionManager.runAfterInteractions
  > | null>(null);
  const supplementalLoadTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // â”€â”€ Scroll tracking for pausing videos while scrolling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isMomentumScrollingRef = useRef(false);
  const scrollEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const feedChromeCollapseStateRef = useRef<FeedChromeCollapseState>(
    createFeedChromeCollapseState(),
  );
  const nativeTabScrollPublisherStateRef = useRef(
    createNativeTabScrollPublisherState(),
  );
  const [isFeedChromeHidden, setIsFeedChromeHidden] = useState(false);

  const setActiveFeedVideo = useCallback((videoId: string | null) => {
    if (videoId !== null) {
      if (inlineLiveDwellTimerRef.current) {
        clearTimeout(inlineLiveDwellTimerRef.current);
        inlineLiveDwellTimerRef.current = null;
      }
      pendingDwellInlineLivePostIdRef.current = null;
      pendingActiveInlineLivePostIdRef.current = null;
      if (activeInlineLivePostIdRef.current !== null) {
        activeInlineLivePostIdRef.current = null;
        setActiveInlineLivePostIdState(null);
      }
    }
    activeVideoIdRef.current = videoId;
    publishFeedActiveVideo(videoId);
  }, []);

  const clearActiveVideoDwellTimer = useCallback(() => {
    if (!activeVideoDwellTimerRef.current) return;
    clearTimeout(activeVideoDwellTimerRef.current);
    activeVideoDwellTimerRef.current = null;
    pendingDwellVideoIdRef.current = null;
  }, []);

  const scheduleActiveFeedVideo = useCallback(
    (videoId: string | null, commitImmediately = false) => {
      if (videoId === activeVideoIdRef.current) {
        clearActiveVideoDwellTimer();
        return;
      }

      if (commitImmediately || videoId === null) {
        clearActiveVideoDwellTimer();
        setActiveFeedVideo(videoId);
        return;
      }

      if (
        pendingDwellVideoIdRef.current === videoId &&
        activeVideoDwellTimerRef.current
      ) {
        return;
      }

      clearActiveVideoDwellTimer();
      pendingDwellVideoIdRef.current = videoId;
      activeVideoDwellTimerRef.current = setTimeout(() => {
        activeVideoDwellTimerRef.current = null;
        if (pendingDwellVideoIdRef.current !== videoId) return;
        pendingDwellVideoIdRef.current = null;
        setActiveFeedVideo(videoId);
      }, FEED_VIDEO_ACTIVE_DWELL_MS);
    },
    [clearActiveVideoDwellTimer, setActiveFeedVideo],
  );

  const clearInlineLiveDwellTimer = useCallback(() => {
    if (!inlineLiveDwellTimerRef.current) return;
    clearTimeout(inlineLiveDwellTimerRef.current);
    inlineLiveDwellTimerRef.current = null;
    pendingDwellInlineLivePostIdRef.current = null;
  }, []);

  const setActiveFeedInlineLivePostId = useCallback(
    (postId: number | null) => {
      if (postId !== null) {
        setActiveFeedVideo(null);
      }
      if (activeInlineLivePostIdRef.current === postId) return;
      activeInlineLivePostIdRef.current = postId;
      setActiveInlineLivePostIdState(postId);
    },
    [setActiveFeedVideo],
  );

  const scheduleActiveFeedInlineLivePostId = useCallback(
    (postId: number | null, commitImmediately = false) => {
      if (postId === activeInlineLivePostIdRef.current) {
        clearInlineLiveDwellTimer();
        return;
      }

      if (commitImmediately || postId === null) {
        clearInlineLiveDwellTimer();
        setActiveFeedInlineLivePostId(postId);
        return;
      }

      if (
        pendingDwellInlineLivePostIdRef.current === postId &&
        inlineLiveDwellTimerRef.current
      ) {
        return;
      }

      clearInlineLiveDwellTimer();
      pendingDwellInlineLivePostIdRef.current = postId;
      inlineLiveDwellTimerRef.current = setTimeout(() => {
        inlineLiveDwellTimerRef.current = null;
        if (pendingDwellInlineLivePostIdRef.current !== postId) return;
        pendingDwellInlineLivePostIdRef.current = null;
        setActiveFeedInlineLivePostId(postId);
      }, FEED_INLINE_LIVE_ACTIVE_DWELL_MS);
    },
    [clearInlineLiveDwellTimer, setActiveFeedInlineLivePostId],
  );

  const pickViewableFeedVideoId = useCallback(
    () => pickFeedViewableVideoId(latestViewableFeedItemsRef.current),
    [],
  );

  const setFeedVideoRef = useCallback(
    (postId: string, node: React.ElementRef<typeof View> | null) => {
      if (node) {
        feedVideoRefsRef.current.set(postId, node);
      } else {
        feedVideoRefsRef.current.delete(postId);
      }
    },
    [],
  );

  const measureActiveFeedVideoOnScreen = useCallback(
    (commitImmediately = false) => {
      const viewableLivePostId = pickInlineLivePostId(
        latestViewableFeedItemsRef.current,
      );
      if (viewableLivePostId !== null) {
        pendingActiveVideoIdRef.current = null;
        if (commitImmediately || !isScrollingRef.current) {
          scheduleActiveFeedVideo(null, true);
          scheduleActiveFeedInlineLivePostId(
            viewableLivePostId,
            commitImmediately,
          );
          pendingActiveInlineLivePostIdRef.current = null;
        } else {
          pendingActiveInlineLivePostIdRef.current = viewableLivePostId;
        }
        return;
      }

      if (commitImmediately || !isScrollingRef.current) {
        scheduleActiveFeedInlineLivePostId(null, true);
      }

      const entries = Array.from(feedVideoRefsRef.current.entries());
      if (entries.length === 0) return;

      const requestId = feedMeasureRequestRef.current + 1;
      feedMeasureRequestRef.current = requestId;
      const viewportHeight =
        feedViewportHeightRef.current || Dimensions.get('window').height;
      let remaining = entries.length;
      const candidates: Array<{ id: string; y: number; height: number }> = [];

      entries.forEach(([videoId, node]) => {
        node.measureInWindow((_x, y, _width, height) => {
          if (feedMeasureRequestRef.current !== requestId) return;
          candidates.push({ id: videoId, y, height });

          remaining -= 1;
          if (remaining === 0) {
            const measuredVideoId = pickFeedVideoAutoplayCandidate({
              candidates,
              viewportHeight,
            });
            const viewableVideoId = pickViewableFeedVideoId();
            const activeVideoStillVisible = isFeedVideoIdViewable(
              latestVisibleFeedItemsRef.current,
              activeVideoIdRef.current,
            );
            const fallbackVideoId =
              measuredVideoId ??
              viewableVideoId ??
              (activeVideoStillVisible ? activeVideoIdRef.current : null);

            if (commitImmediately || !isScrollingRef.current) {
              if (fallbackVideoId !== activeVideoIdRef.current) {
                scheduleActiveFeedVideo(fallbackVideoId, commitImmediately);
              }
              pendingActiveVideoIdRef.current = null;
              return;
            }

            pendingActiveVideoIdRef.current = fallbackVideoId;
          }
        });
      });
    },
    [
      pickViewableFeedVideoId,
      scheduleActiveFeedInlineLivePostId,
      scheduleActiveFeedVideo,
    ],
  );

  const handleFeedViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      feedViewportHeightRef.current = event.nativeEvent.layout.height;
      measureActiveFeedVideoOnScreen(!isScrollingRef.current);
    },
    [measureActiveFeedVideoOnScreen],
  );

  // Keep the active player alive during a drag. Scroll-busy still suspends
  // warm decoders and expensive feed commits, but it no longer pauses the
  // video that the user is currently watching.
  const beginScrollPause = useCallback(() => {
    isScrollingRef.current = true;
    setFeedScrollBusy(true);
    publishFeedScrollBusy(true);
    // Keep the bounded media queue alive during a fling. Visible cards and
    // the nearest lookahead items stay prioritized, while generated video
    // posters still wait behind InteractionManager before doing CPU work.
    clearInlineLiveDwellTimer();
    // Store the current video so onViewableItemsChanged can update
    // pendingActiveVideoIdRef while we scroll.
    pendingActiveVideoIdRef.current = activeVideoIdRef.current;
    pendingActiveInlineLivePostIdRef.current =
      activeInlineLivePostIdRef.current;
  }, [clearInlineLiveDwellTimer, setFeedScrollBusy]);

  const endScrollPause = useCallback(() => {
    isScrollingRef.current = false;
    setFeedScrollBusy(false);
    publishFeedScrollBusy(false);
    const viewableLivePostId = pickInlineLivePostId(
      latestViewableFeedItemsRef.current,
    );
    const pendingLivePostId = pendingActiveInlineLivePostIdRef.current;
    const pendingLiveStillViewable = isInlineLivePostIdViewable(
      latestViewableFeedItemsRef.current,
      pendingLivePostId,
    );
    const nextLivePostId =
      viewableLivePostId ??
      (pendingLiveStillViewable ? pendingLivePostId : null);
    pendingActiveInlineLivePostIdRef.current = null;
    if (nextLivePostId !== null) {
      pendingActiveVideoIdRef.current = null;
      scheduleActiveFeedVideo(null, true);
      scheduleActiveFeedInlineLivePostId(nextLivePostId, true);
      return;
    }
    scheduleActiveFeedInlineLivePostId(null, true);
    // Prefer a newly eligible card. If none crossed the autoplay threshold,
    // retain the current video while even a small part remains on-screen.
    const viewableVideoId = pickViewableFeedVideoId();
    const activeVideoStillVisible = isFeedVideoIdViewable(
      latestVisibleFeedItemsRef.current,
      activeVideoIdRef.current,
    );
    const pendingVideoId =
      viewableVideoId ??
      pendingActiveVideoIdRef.current ??
      (activeVideoStillVisible ? activeVideoIdRef.current : null);
    pendingActiveVideoIdRef.current = null;
    if (pendingVideoId !== activeVideoIdRef.current) {
      scheduleActiveFeedVideo(pendingVideoId, true);
    }
    measureActiveFeedVideoOnScreen(false);
  }, [
    measureActiveFeedVideoOnScreen,
    pickViewableFeedVideoId,
    scheduleActiveFeedInlineLivePostId,
    scheduleActiveFeedVideo,
    setFeedScrollBusy,
  ]);

  const handleScrollBeginDrag = useCallback(() => {
    feedChromeCollapseStateRef.current = resetFeedChromeScrollIntent(
      feedChromeCollapseStateRef.current,
    );
    beginScrollPause();
  }, [beginScrollPause]);

  const handleMomentumScrollBegin = useCallback(() => {
    if (scrollEndTimeoutRef.current) {
      clearTimeout(scrollEndTimeoutRef.current);
      scrollEndTimeoutRef.current = null;
    }
    isMomentumScrollingRef.current = true;
    beginScrollPause();
  }, [beginScrollPause]);

  const handleFeedScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // FlashList can emit a layout/restoration scroll event while this tab
      // is covered by another screen. Those stale offsets must not reopen or
      // collapse Home chrome during the navigation transition.
      if (!isFeedTabFocusedRef.current) return;

      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const previousY = feedScrollYRef.current;
      const deltaY = contentOffset.y - previousY;
      if (Math.abs(deltaY) > FEED_SCROLL_DIRECTION_THRESHOLD) {
        feedScrollDirectionRef.current = deltaY > 0 ? 'down' : 'up';
      }
      feedScrollYRef.current = contentOffset.y;
      feedViewportHeightRef.current = layoutMeasurement.height;

      if (contentOffset.y < 0) {
        feedChromeCollapseStateRef.current = createFeedChromeCollapseState();
        nativeTabScrollPublisherStateRef.current =
          createNativeTabScrollPublisherState(0, 'none');
        publishNativeTabScrollBehavior('none');
        setIsFeedChromeHidden(false);
        return;
      }

      const currentY = Math.max(0, contentOffset.y);
      publishNativeTabScrollIntent(nativeTabScrollPublisherStateRef, currentY);

      const nextState = getNextFeedChromeCollapseState(
        feedChromeCollapseStateRef.current,
        currentY,
      );

      feedChromeCollapseStateRef.current = nextState;
      setIsFeedChromeHidden(current =>
        current === nextState.hidden ? current : nextState.hidden,
      );

      const earlyLoadDistance = Math.max(
        layoutMeasurement.height * FEED_EARLY_LOAD_DISTANCE_MULTIPLIER,
        FEED_EARLY_LOAD_MIN_DISTANCE,
      );
      const distanceFromEnd =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);

      if (distanceFromEnd <= earlyLoadDistance) {
        triggerLoadMoreRef.current();
      }
    },
    [],
  );

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const velocityY = Math.abs(event.nativeEvent.velocity?.y ?? 0);
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      feedScrollYRef.current = contentOffset.y;
      feedViewportHeightRef.current = layoutMeasurement.height;
      if (velocityY < 0.05 && !isMomentumScrollingRef.current) {
        measureActiveFeedVideoOnScreen(false);
      }
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      scrollEndTimeoutRef.current = setTimeout(() => {
        scrollEndTimeoutRef.current = null;
        if (velocityY < 0.05 && !isMomentumScrollingRef.current) {
          endScrollPause();
        }
      }, 80);
    },
    [endScrollPause, measureActiveFeedVideoOnScreen],
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      feedScrollYRef.current = contentOffset.y;
      feedViewportHeightRef.current = layoutMeasurement.height;
      measureActiveFeedVideoOnScreen(false);
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
        scrollEndTimeoutRef.current = null;
      }
      isMomentumScrollingRef.current = false;
      endScrollPause();
    },
    [endScrollPause, measureActiveFeedVideoOnScreen],
  );

  useEffect(() => {
    const queuedImagePrefetchUrls = queuedImagePrefetchUrlsRef.current;
    const queuedVideoPosterKeys = queuedVideoPosterKeysRef.current;

    return () => {
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      clearActiveVideoDwellTimer();
      clearInlineLiveDwellTimer();
      supplementalInteractionRef.current?.cancel();
      supplementalLoadTimersRef.current.forEach(timer => clearTimeout(timer));
      supplementalLoadTimersRef.current = [];
      if (imagePrefetchTimerRef.current) {
        clearTimeout(imagePrefetchTimerRef.current);
        imagePrefetchTimerRef.current = null;
      }
      if (videoPosterPrefetchTimerRef.current) {
        clearTimeout(videoPosterPrefetchTimerRef.current);
        videoPosterPrefetchTimerRef.current = null;
      }
      videoPosterPrefetchTaskRef.current?.cancel?.();
      videoPosterPrefetchTaskRef.current = null;
      pendingImagePrefetchUrlsRef.current = [];
      queuedImagePrefetchUrls.clear();
      pendingVideoPosterPostsRef.current = [];
      queuedVideoPosterKeys.clear();
      activeInlineLivePostIdRef.current = null;
      pendingActiveInlineLivePostIdRef.current = null;
      activeVideoIdRef.current = null;
      publishFeedActiveVideo(null);
      publishFeedWarmVideoIds([]);
      publishFeedScrollBusy(false);
      publishFeedVisibleMediaPostIds([]);
      publishNativeTabScrollBehavior('onScrollDown');
    };
  }, [clearActiveVideoDwellTimer, clearInlineLiveDwellTimer]);

  useFocusEffect(
    useCallback(() => {
      isFeedTabFocusedRef.current = true;

      const restoredScrollY = Math.max(0, feedScrollYRef.current);
      const restoredChromeState =
        createFeedChromeCollapseStateAtScrollY(restoredScrollY);
      feedChromeCollapseStateRef.current = restoredChromeState;
      setIsFeedChromeHidden(restoredChromeState.hidden);

      if (FEED_IS_ANDROID) {
        // Restore Home chrome immediately on focus instead of waiting for the
        // declarative StatusBar commit from the next render frame.
        StatusBar.setBarStyle('light-content', false);
        StatusBar.setBackgroundColor(APP_BRAND_COLOR, false);
        StatusBar.setTranslucent(false);
      }

      return () => {
        isFeedTabFocusedRef.current = false;
        publishNativeTabScrollBehavior('onScrollDown');
      };
    }, []),
  );

  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused) {
      clearActiveVideoDwellTimer();
      clearInlineLiveDwellTimer();
      scheduleActiveFeedInlineLivePostId(null, true);
      setActiveFeedVideo(null);
      publishFeedWarmVideoIds([]);
      publishFeedVisibleMediaPostIds([]);
    } else {
      measureActiveFeedVideoOnScreen(true);
    }
  }, [
    isFocused,
    clearActiveVideoDwellTimer,
    clearInlineLiveDwellTimer,
    scheduleActiveFeedInlineLivePostId,
    setActiveFeedVideo,
    measureActiveFeedVideoOnScreen,
  ]);

  // Subscribe to posts created by the current user and show them instantly.
  // Remote new posts still use the floating "new posts" button, but a post
  // the user just submitted should land in the feed immediately.
  useEffect(() => {
    const unsubscribe = postCreatedEvents.subscribe(post => {
      if (!post?.id) return;
      pendingNewPostsRef.current = pendingNewPostsRef.current.filter(
        pendingPost => pendingPost.id !== post.id,
      );
      if (pendingNewPostsRef.current.length === 0) {
        setHasNewPosts(false);
      }
      prependFeedPost(post);
      requestAnimationFrame(() => {
        mainFeedListRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    });
    return unsubscribe;
  }, [prependFeedPost]);

  const goToCreatePost = useCallback(
    (action?: unknown) => {
      if (action === 'product') {
        (navigation as any).navigate(ROUTES.CREATE_PRODUCT);
        return;
      }
      if (action === 'job') {
        (navigation as any).navigate(ROUTES.CREATE_JOB);
        return;
      }

      const initialAction =
        typeof action === 'string' &&
        (action === 'photo' || action === 'video' || action === 'poll')
          ? action
          : undefined;
      (navigation as any).navigate(
        ROUTES.CREATE_POST,
        initialAction ? { initialAction } : undefined,
      );
    },
    [navigation],
  );
  const openCreatePost = useCallback(() => {
    goToCreatePost();
  }, [goToCreatePost]);

  // Navigate to user profile
  const navigateToProfile = useCallback(
    (userId: string) => {
      navigateToUserProfile(navigation, userId);
    },
    [navigation],
  );

  const commentVm = useFeedCommentsViewModel({
    onCommentCountChange: vm.updateCommentCount,
  });
  const {
    postIds: realtimeVisiblePostIds,
    schedulePostIds: scheduleRealtimeVisiblePostIds,
  } = useDeferredVisiblePostIds();
  usePostRealtimeScope({
    postIds: realtimeVisiblePostIds,
    posts: feedPosts,
    enabled: isFeedTabFocused,
    onSnapshot: vm.applyRealtimePost,
    onDeleted: vm.removeRealtimePost,
    onCommentMutation: change => {
      if (String(commentVm.selectedCommentPostId) === change.postId) {
        void commentVm.refreshComments();
      }
    },
  });

  // Stable ref-backed wrappers to prevent flatlist items re-rendering on feed action changes
  const openCommentsRef = useRef(commentVm.openComments);
  openCommentsRef.current = commentVm.openComments;
  const handleCommentTapStable = useCallback((postId: string) => {
    openCommentsRef.current(postId);
  }, []);
  const handlePhotoViewerCommentTap = useCallback(
    (postId: string) => {
      const post = feedPostsRef.current.find(item => item.id === postId);
      navigateToPostComments(navigation, postId, post);
    },
    [navigation],
  );

  const toggleReactionRef = useRef(vm.toggleReaction);
  toggleReactionRef.current = vm.toggleReaction;
  const handleToggleReactionStable = useCallback(
    (postId: string, reaction: ReactionType) => {
      toggleReactionRef.current(postId, reaction);
    },
    [],
  );

  // Products for feed (Facebook Marketplace style)
  const productsVm = useProductsOnFeedViewModel({ autoLoad: false });

  // Convert products to FeedProductPost format
  const feedProductPosts = useMemo<FeedProductPost[]>(() => {
    return (productsVm.products || [])
      .filter(product => product && product.id)
      .map((product, index) => ({
        kind: 'product' as const,
        id:
          Number(product.post_id) > 0
            ? String(product.post_id)
            : `product-${product.id || index}`,
        product,
        postedAt: product.time ? parseInt(String(product.time), 10) : undefined,
        publisher: {
          id: String(product.seller ? product.seller.user_id || '' : ''),
          name: (product.seller && product.seller.name) || copy.sellerFallback,
          username: '',
          avatarUrl: product.seller ? product.seller.avatar : undefined,
        },
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
        myReaction: null,
        topReactions: [],
        permissions: {
          canDelete: Boolean(Number(product.post_id) > 0 && product.is_owner),
          canShare: Number(product.post_id) > 0,
        },
      }));
  }, [copy.sellerFallback, productsVm.products]);

  const handleProductPress = useCallback(
    (product: ProductItem) => {
      // Push the dedicated product detail screen. We pass the full
      // object so the detail screen renders instantly with no extra
      // fetch; `productId` is also passed as the route's canonical key.
      navigation.navigate(ROUTES.PRODUCT_DETAIL, {
        productId: product.id,
        product,
      });
    },
    [navigation],
  );

  // Tap the "Xem chi tiết" affordance below a post header to open the
  // dedicated PostDetail screen. The post object is passed so the
  // detail screen renders instantly; if it's missing (deep-link), the
  // detail screen's ViewModel falls back to `getPostById`.
  const handlePostPress = useCallback(
    (post: FeedPost) => {
      prefetchFeedComments(post.id).catch(() => undefined);
      navigation.navigate(ROUTES.POST_DETAIL, {
        postId: post.id,
        post,
      });
    },
    [navigation],
  );

  // Events for feed
  const eventsVm = useEventsOnFeedViewModel({ autoLoad: false });
  const { toggleInterested, toggleGoing } = eventsVm;
  const jobsVm = useJobsOnFeedViewModel({ autoLoad: false });
  const groupsVm = useSuggestedGroupsOnFeedViewModel({ autoLoad: false });
  const pagesVm = usePagesOnFeedViewModel({ autoLoad: false });
  const liveVm = useLiveViewModel({
    autoLoad: true,
    enabled: isFeedTabFocused,
    refreshIntervalMs: 10_000,
  });
  const fundingVm = useFundingOnFeedViewModel({ autoLoad: false });
  const reloadProducts = productsVm.reloadProducts;
  const reloadEvents = eventsVm.reloadEvents;
  const reloadJobs = jobsVm.reloadJobs;
  const reloadGroups = groupsVm.reloadGroups;
  const reloadPages = pagesVm.reloadPages;
  const reloadLive = liveVm.refresh;
  const reloadFunding = fundingVm.reloadFunding;

  useEffect(() => {
    if (
      supplementalLoadStartedRef.current ||
      !vm.hasLoadedOnce ||
      feedPosts.length === 0
    ) {
      return;
    }

    supplementalLoadStartedRef.current = true;
    const runWhenScrollIdle = (task: () => void) => {
      if (isScrollingRef.current || isMomentumScrollingRef.current) {
        const retry = setTimeout(() => runWhenScrollIdle(task), 500);
        supplementalLoadTimersRef.current.push(retry);
        return;
      }
      task();
    };

    // Delay supplemental loading to avoid blocking the main feed render
    const productsTimer = setTimeout(() => {
      runWhenScrollIdle(reloadProducts);
    }, 1200);
    const groupsTimer = setTimeout(() => {
      runWhenScrollIdle(reloadGroups);
    }, 2200);
    const pagesTimer = setTimeout(() => {
      runWhenScrollIdle(reloadPages);
    }, 2600);
    const eventsTimer = setTimeout(() => {
      runWhenScrollIdle(reloadEvents);
    }, 3000);
    const jobsTimer = setTimeout(() => {
      runWhenScrollIdle(reloadJobs);
    }, 3400);
    const fundingTimer = setTimeout(() => {
      runWhenScrollIdle(reloadFunding);
    }, 3800);
    supplementalLoadTimersRef.current.push(
      productsTimer,
      groupsTimer,
      pagesTimer,
      eventsTimer,
      jobsTimer,
      fundingTimer,
    );
  }, [
    feedPosts.length,
    vm.hasLoadedOnce,
    reloadEvents,
    reloadGroups,
    reloadJobs,
    reloadPages,
    reloadProducts,
    reloadFunding,
  ]);

  // Convert events to FeedEventPost format
  const feedEventPosts = useMemo<FeedEventPost[]>(() => {
    return eventsVm.events.map((event, index) => {
      let postTimestamp = Math.floor(Date.now() / 1000); // Default to current time so it doesn't get pushed to bottom

      const timeVal = event.time;
      if (timeVal) {
        const parsed = parseInt(String(timeVal), 10);
        if (!isNaN(parsed) && parsed > 0) {
          postTimestamp = parsed;
        }
      } else {
        // Fallback to start_date if time is not available
        const dateStr = event.event_start_date || event.start_date;
        if (dateStr) {
          try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              const year = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const day = parseInt(parts[2], 10);
              const timeStr =
                event.event_start_time || event.start_time || '00:00:00';
              const timeParts = timeStr.split(':');
              let hour = 0,
                min = 0,
                sec = 0;
              if (timeParts.length >= 2) {
                hour = parseInt(timeParts[0], 10);
                min = parseInt(timeParts[1], 10);
                if (timeParts.length >= 3) sec = parseInt(timeParts[2], 10);
              }
              const dateObj = new Date(year, month, day, hour, min, sec);
              if (!isNaN(dateObj.getTime())) {
                postTimestamp = Math.floor(dateObj.getTime() / 1000);
              }
            }
          } catch {
            // ignore
          }
        }
      }

      return {
        kind: 'event' as const,
        id: `event-${event.id || index}`,
        event,
        postedAt: postTimestamp,
        publisher: {
          id: String(event.user_data?.user_id || ''),
          name:
            event.user_data?.full_name ||
            event.user_data?.name ||
            copy.organizerFallback,
          username: event.user_data?.username || '',
          avatarUrl: event.user_data?.avatar,
        },
      };
    });
  }, [copy.organizerFallback, eventsVm.events]);

  const feedJobPosts = useMemo<FeedJobPost[]>(() => {
    const now = Math.floor(Date.now() / 1000);

    return jobsVm.jobs.map((job, index) => {
      const timestamp = Number(job.time) > 0 ? Number(job.time) : now - index;
      const pageName = job.page?.page_title || copy.employerFallback;
      const pageId =
        Number(job.page?.page_id) > 0 ? String(job.page?.page_id) : undefined;
      const sharePostId = String(job.post_id || '').trim();
      const canShare = Number(sharePostId) > 0;

      return {
        kind: 'job' as const,
        id: canShare ? sharePostId : `job-${job.id || index}`,
        job,
        postedAt: timestamp,
        publisher: {
          id: pageId || String(job.user_id || ''),
          name: pageName,
          username: job.page?.page_name || '',
          avatarUrl: job.page?.avatar || job.image,
          entityType: pageId ? ('page' as const) : ('user' as const),
          pageId,
          ownerId: job.page?.user_id
            ? String(job.page.user_id)
            : undefined,
        },
        permissions: {
          canDelete: false,
          canShare,
        },
      };
    });
  }, [copy.employerFallback, jobsVm.jobs]);

  const handleEventPress = useCallback((_event: any) => {
    // Navigate to event details
  }, []);

  const handleJobPress = useCallback(
    (job: JobsItem) => {
      navigation.navigate(ROUTES.JOB_DETAIL, {
        jobId: String(job.id),
        job,
      });
    },
    [navigation],
  );

  const handleOpenGroups = useCallback(() => {
    navigation.navigate(ROUTES.EXPLORE_GROUPS);
  }, [navigation]);

  const handleOpenPages = useCallback(() => {
    navigation.navigate(ROUTES.PAGES);
  }, [navigation]);

  const handleOpenPage = useCallback(
    (page: PagesItem) => {
      navigation.navigate(ROUTES.PAGE_DETAIL, { page });
    },
    [navigation],
  );

  const handleOpenFundingList = useCallback(() => {
    navigation.navigate(ROUTES.FUNDING);
  }, [navigation]);

  const handleOpenFundingCampaign = useCallback(
    (campaign: FundingItem) => {
      navigation.navigate(ROUTES.FUNDING_DETAIL, {
        fundId: campaign.hashed_id,
      });
    },
    [navigation],
  );

  const handleOpenGroup = useCallback(
    (group: GroupItem) => {
      if (group.url) {
        Linking.openURL(group.url).catch(() => {
          navigation.navigate(ROUTES.EXPLORE_GROUPS);
        });
        return;
      }

      navigation.navigate(ROUTES.EXPLORE_GROUPS);
    },
    [navigation],
  );

  const handleOpenLive = useCallback(
    (item: LiveStreamItem) => {
      setActiveFeedVideo(null);
      logFeedLiveDebug('feed_live_navigation_media_pause', {
        postId: item.postId,
        streamName: item.streamName,
      });
      navigation.navigate(ROUTES.LIVE_ROOM, { postId: item.postId });
    },
    [navigation, setActiveFeedVideo],
  );

  // ── Reactions sheet state ─────────────────────────────────────────────
  // Single bottom-sheet instance shared by all post cards in the feed.
  // We keep `selectedReactionsPostId` as plain state instead of routing
  // it through navigation so the sheet feels instant (no screen push)
  // and the underlying post list is preserved behind the backdrop.
  const [reactionsSheetVisible, setReactionsSheetVisible] = useState(false);
  const [reactionsSheetPostId, setReactionsSheetPostId] = useState<
    string | null
  >(null);

  const openReactionsSheet = useCallback((postId: string, _post: FeedPost) => {
    // `_post` is reserved for future use (e.g. header context above the
    // tab strip). The sheet's VM only needs the id for fetching.
    setReactionsSheetPostId(postId);
    setReactionsSheetVisible(true);
  }, []);

  const closeReactionsSheet = useCallback(() => {
    setReactionsSheetVisible(false);
  }, []);

  // The comment sheet is shared by both video and text posts â€” look up
  // the active post in both lists so the comment count badge stays
  // accurate regardless of which type triggered it. Filter out product posts.
  const selectedCommentPost = useMemo(
    () =>
      feedPosts.find(
        post =>
          (post.kind === 'text' ||
            post.kind === 'video' ||
            post.kind === 'poll') &&
          post.id === commentVm.selectedCommentPostId,
      ) as (FeedTextPost | FeedVideoPost | FeedPollPost) | null,
    [feedPosts, commentVm.selectedCommentPostId],
  );

  const handleRetryComments = useCallback(() => {
    if (commentVm.selectedCommentPostId) {
      commentVm.openComments(commentVm.selectedCommentPostId);
    }
  }, [commentVm]);

  const scheduleVideoPosterPrefetchFlush = useCallback(() => {
    if (
      videoPosterPrefetchTimerRef.current ||
      videoPosterPrefetchTaskRef.current
    ) {
      return;
    }

    videoPosterPrefetchTimerRef.current = setTimeout(() => {
      videoPosterPrefetchTimerRef.current = null;
      const nextPosts = pendingVideoPosterPostsRef.current.splice(
        0,
        FEED_VIDEO_POSTER_PREFETCH_LIMIT,
      );
      if (nextPosts.length === 0) return;

      videoPosterPrefetchTaskRef.current =
        InteractionManager.runAfterInteractions(() => {
          videoPosterPrefetchTaskRef.current = null;

          nextPosts.forEach(post => {
            const videoUrl = post.videoUrl?.trim();
            if (!videoUrl || post.thumbnailUrl?.trim()) return;

            const cacheKey = getFeedVideoPosterCacheKeyForPost(
              post.id,
              videoUrl,
            );
            queuedVideoPosterKeysRef.current.delete(cacheKey);
            const cachedPoster = getCachedVideoPosterThumbnail(
              videoUrl,
              cacheKey,
            );
            if (cachedPoster?.uri) {
              markFeedMediaLoaded(cachedPoster.uri);
              return;
            }

            createCachedVideoPosterThumbnail(videoUrl, cacheKey)
              .then(thumbnail => markFeedMediaLoaded(thumbnail?.uri))
              .catch(() => undefined);
          });

          if (pendingVideoPosterPostsRef.current.length > 0) {
            scheduleVideoPosterPrefetchFlush();
          }
        });
    }, FEED_VIDEO_POSTER_PREFETCH_BATCH_DELAY_MS);
  }, []);

  const queueFeedVideoPosterPrefetch = useCallback(
    (posts: FeedVideoPost[]) => {
      if (posts.length === 0) return;

      let queuedAny = false;
      for (const post of posts) {
        const videoUrl = post.videoUrl?.trim();
        if (!videoUrl || post.thumbnailUrl?.trim()) continue;

        const cacheKey = getFeedVideoPosterCacheKeyForPost(post.id, videoUrl);
        if (prefetchedVideoPosterKeysRef.current.has(cacheKey)) continue;
        if (queuedVideoPosterKeysRef.current.has(cacheKey)) continue;

        const cachedPoster = getCachedVideoPosterThumbnail(videoUrl, cacheKey);
        if (cachedPoster?.uri) {
          markFeedMediaLoaded(cachedPoster.uri);
          rememberBoundedFeedCacheKey(
            prefetchedVideoPosterKeysRef.current,
            cacheKey,
            MAX_REMEMBERED_VIDEO_POSTER_KEYS,
          );
          continue;
        }

        rememberBoundedFeedCacheKey(
          prefetchedVideoPosterKeysRef.current,
          cacheKey,
          MAX_REMEMBERED_VIDEO_POSTER_KEYS,
        );
        queuedVideoPosterKeysRef.current.add(cacheKey);
        pendingVideoPosterPostsRef.current.push(post);
        queuedAny = true;
      }

      if (queuedAny) {
        scheduleVideoPosterPrefetchFlush();
      }
    },
    [scheduleVideoPosterPrefetchFlush],
  );

  const prefetchFeedVideoPostersInRange = useCallback(
    (startIndex: number, endIndex: number) => {
      const items = feedListItemsRef.current;
      if (items.length === 0) return;

      const start = Math.max(0, startIndex);
      const end = Math.min(items.length, Math.max(start, endIndex));
      if (start >= end) return;

      const postsToPrefetch: FeedVideoPost[] = [];
      for (let index = start; index < end; index += 1) {
        const item = items[index];
        if (item?.type !== 'post' || item.post.kind !== 'video') continue;

        postsToPrefetch.push(item.post);
        if (postsToPrefetch.length >= FEED_VIDEO_POSTER_PREFETCH_LIMIT) break;
      }

      queueFeedVideoPosterPrefetch(postsToPrefetch);
    },
    [queueFeedVideoPosterPrefetch],
  );

  const scheduleImagePrefetchFlush = useCallback(() => {
    if (
      imagePrefetchTimerRef.current ||
      pendingImagePrefetchUrlsRef.current.length === 0 ||
      imagePrefetchInFlightCountRef.current >=
        IMAGE_PREFETCH_MAX_CONCURRENCY
    ) {
      return;
    }

    imagePrefetchTimerRef.current = setTimeout(() => {
      imagePrefetchTimerRef.current = null;
      const availableSlots = Math.max(
        0,
        IMAGE_PREFETCH_MAX_CONCURRENCY -
          imagePrefetchInFlightCountRef.current,
      );
      const nextUrls = pendingImagePrefetchUrlsRef.current.splice(
        0,
        Math.min(IMAGE_PREFETCH_BATCH_SIZE, availableSlots),
      );

      nextUrls.forEach(url => {
        queuedImagePrefetchUrlsRef.current.delete(url);
        imagePrefetchInFlightCountRef.current += 1;
        Image.prefetch(url)
          .then(prefetched => {
            if (prefetched) {
              markFeedMediaLoaded(url);
            } else {
              prefetchedImageUrlsRef.current.delete(url);
            }
          })
          .catch(() => {
            prefetchedImageUrlsRef.current.delete(url);
          })
          .finally(() => {
            imagePrefetchInFlightCountRef.current = Math.max(
              0,
              imagePrefetchInFlightCountRef.current - 1,
            );
            scheduleImagePrefetchFlush();
          });
      });

      if (
        pendingImagePrefetchUrlsRef.current.length > 0 &&
        imagePrefetchInFlightCountRef.current <
          IMAGE_PREFETCH_MAX_CONCURRENCY
      ) {
        scheduleImagePrefetchFlush();
      }
    }, IMAGE_PREFETCH_BATCH_DELAY_MS);
  }, []);

  const prefetchFeedImagesInRange = useCallback(
    (startIndex: number, endIndex: number) => {
      const items = feedListItemsRef.current;
      if (items.length === 0) return;

      const start = Math.max(0, startIndex);
      const end = Math.min(items.length, Math.max(start, endIndex));
      if (start >= end) return;

      const urlsToPrefetch: string[] = [];
      for (let index = start; index < end; index += 1) {
        const item = items[index];

        if (!item) continue;

        for (const url of collectFeedListItemImageUrls(item)) {
          if (prefetchedImageUrlsRef.current.has(url)) continue;
          if (queuedImagePrefetchUrlsRef.current.has(url)) continue;

          rememberBoundedFeedCacheKey(
            prefetchedImageUrlsRef.current,
            url,
            MAX_REMEMBERED_IMAGE_PREFETCH_URLS,
          );
          queuedImagePrefetchUrlsRef.current.add(url);
          urlsToPrefetch.push(url);
          if (urlsToPrefetch.length >= MAX_IMAGE_PREFETCH_URLS) break;
        }

        if (urlsToPrefetch.length >= MAX_IMAGE_PREFETCH_URLS) break;
      }

      if (urlsToPrefetch.length > 0) {
        const prioritizedUrls = new Set(urlsToPrefetch);
        const previousPending = pendingImagePrefetchUrlsRef.current.filter(
          url => !prioritizedUrls.has(url),
        );
        const nextPending = [...urlsToPrefetch, ...previousPending];
        const retainedPending = nextPending.slice(
          0,
          MAX_PENDING_IMAGE_PREFETCH_URLS,
        );
        const retainedUrls = new Set(retainedPending);

        nextPending.forEach(url => {
          if (retainedUrls.has(url)) return;
          queuedImagePrefetchUrlsRef.current.delete(url);
          prefetchedImageUrlsRef.current.delete(url);
        });

        pendingImagePrefetchUrlsRef.current = retainedPending;
        scheduleImagePrefetchFlush();
      }
    },
    [scheduleImagePrefetchFlush],
  );

  const prefetchFeedImagesAroundVisibleItems = useCallback(
    (viewableItems: any[]) => {
      const items = feedListItemsRef.current;
      if (items.length === 0 || viewableItems.length === 0) return;

      let firstVisibleIndex = Number.POSITIVE_INFINITY;
      let furthestVisibleIndex = -1;
      viewableItems.forEach(viewable => {
        if (!viewable?.isViewable) return;

        const itemId = viewable.item?.id;
        const index =
          typeof viewable.index === 'number'
            ? viewable.index
            : typeof itemId === 'string'
            ? feedListItemIndexByIdRef.current.get(itemId) ?? -1
            : -1;

        if (index < 0) return;
        if (index < firstVisibleIndex) firstVisibleIndex = index;
        if (index > furthestVisibleIndex) furthestVisibleIndex = index;
      });

      if (furthestVisibleIndex < 0) return;

      const aheadItems = isScrollingRef.current
        ? FEED_SCROLLING_IMAGE_PREFETCH_AHEAD_ITEMS
        : FEED_IMAGE_PREFETCH_AHEAD_ITEMS;
      const direction = feedScrollDirectionRef.current;
      const startIndex =
        direction === 'up'
          ? firstVisibleIndex - aheadItems
          : firstVisibleIndex - FEED_IMAGE_PREFETCH_BEHIND_ITEMS;
      const endIndex =
        direction === 'up'
          ? furthestVisibleIndex + FEED_IMAGE_PREFETCH_BEHIND_ITEMS + 1
          : furthestVisibleIndex + aheadItems + 1;

      prefetchFeedImagesInRange(startIndex, endIndex);
    },
    [prefetchFeedImagesInRange],
  );

  const prefetchFeedVideoPostersAroundVisibleItems = useCallback(
    (viewableItems: any[]) => {
      const items = feedListItemsRef.current;
      if (items.length === 0 || viewableItems.length === 0) return;

      let firstVisibleIndex = Number.POSITIVE_INFINITY;
      let furthestVisibleIndex = -1;
      viewableItems.forEach(viewable => {
        if (!viewable?.isViewable) return;

        const itemId = viewable.item?.id;
        const index =
          typeof viewable.index === 'number'
            ? viewable.index
            : typeof itemId === 'string'
            ? feedListItemIndexByIdRef.current.get(itemId) ?? -1
            : -1;

        if (index < 0) return;
        if (index < firstVisibleIndex) firstVisibleIndex = index;
        if (index > furthestVisibleIndex) furthestVisibleIndex = index;
      });

      if (furthestVisibleIndex < 0) return;

      const direction = feedScrollDirectionRef.current;
      const startIndex =
        direction === 'up'
          ? firstVisibleIndex - FEED_VIDEO_POSTER_PREFETCH_AHEAD_ITEMS
          : firstVisibleIndex - FEED_VIDEO_POSTER_PREFETCH_BEHIND_ITEMS;
      const endIndex =
        direction === 'up'
          ? furthestVisibleIndex +
            FEED_VIDEO_POSTER_PREFETCH_BEHIND_ITEMS +
            1
          : furthestVisibleIndex + FEED_VIDEO_POSTER_PREFETCH_AHEAD_ITEMS + 1;

      prefetchFeedVideoPostersInRange(startIndex, endIndex);
    },
    [prefetchFeedVideoPostersInRange],
  );

  const maybeLoadMoreFeedAroundVisibleItems = useCallback(
    (viewableItems: any[]) => {
      const items = feedListItemsRef.current;
      if (items.length === 0 || viewableItems.length === 0) return;

      let furthestVisibleIndex = -1;
      viewableItems.forEach(viewable => {
        if (!viewable?.isViewable) return;

        const itemId = viewable.item?.id;
        const index =
          typeof viewable.index === 'number'
            ? viewable.index
            : typeof itemId === 'string'
            ? feedListItemIndexByIdRef.current.get(itemId) ?? -1
            : -1;

        if (index > furthestVisibleIndex) {
          furthestVisibleIndex = index;
        }
      });

      if (furthestVisibleIndex < 0) return;

      const remainingItems = items.length - furthestVisibleIndex - 1;
      if (remainingItems <= FEED_LOAD_MORE_LOOKAHEAD_ITEMS) {
        triggerLoadMoreRef.current();
      }
    },
    [],
  );

  const publishWarmFeedVideosAroundVisibleItems = useCallback(
    (viewableItems: any[]) => {
      const items = feedListItemsRef.current;
      if (items.length === 0) {
        publishFeedWarmVideoIds([]);
        return;
      }

      let firstVisibleIndex = Number.POSITIVE_INFINITY;
      let furthestVisibleIndex = -1;
      viewableItems.forEach(viewable => {
        if (!viewable?.isViewable) return;

        const itemId = viewable.item?.id;
        const index =
          typeof viewable.index === 'number'
            ? viewable.index
            : typeof itemId === 'string'
            ? feedListItemIndexByIdRef.current.get(itemId) ?? -1
            : -1;

        if (index < 0) return;
        if (index < firstVisibleIndex) firstVisibleIndex = index;
        if (index > furthestVisibleIndex) furthestVisibleIndex = index;
      });

      if (furthestVisibleIndex < 0) {
        publishFeedWarmVideoIds([]);
        return;
      }

      const nextActiveVideoId = viewableItems.find(
        viewable =>
          viewable?.isViewable &&
          viewable.item?.type === 'post' &&
          viewable.item.post.kind === 'video',
      )?.item?.post?.id;
      const activeVideoId =
        !isScrollingRef.current && typeof nextActiveVideoId === 'string'
          ? nextActiveVideoId
          : activeVideoIdRef.current;
      const warmVideoIds: string[] = [];
      const candidateIndices: number[] = [];
      const pushCandidateIndex = (index: number) => {
        if (
          index < 0 ||
          index >= items.length ||
          candidateIndices.includes(index)
        ) {
          return;
        }

        candidateIndices.push(index);
      };

      for (
        let index = firstVisibleIndex;
        index <= furthestVisibleIndex;
        index += 1
      ) {
        pushCandidateIndex(index);
      }

      const direction = feedScrollDirectionRef.current;
      const maxWarmOffset = Math.max(
        FEED_VIDEO_WARM_AHEAD_ITEMS,
        FEED_VIDEO_WARM_BEHIND_ITEMS,
      );
      for (let offset = 1; offset <= maxWarmOffset; offset += 1) {
        if (direction === 'up') {
          if (offset <= FEED_VIDEO_WARM_BEHIND_ITEMS) {
            pushCandidateIndex(firstVisibleIndex - offset);
          }
          if (offset <= FEED_VIDEO_WARM_AHEAD_ITEMS) {
            pushCandidateIndex(furthestVisibleIndex + offset);
          }
        } else {
          if (offset <= FEED_VIDEO_WARM_AHEAD_ITEMS) {
            pushCandidateIndex(furthestVisibleIndex + offset);
          }
          if (offset <= FEED_VIDEO_WARM_BEHIND_ITEMS) {
            pushCandidateIndex(firstVisibleIndex - offset);
          }
        }
      }

      const warmVideoLimit = isScrollingRef.current
        ? FEED_SCROLLING_VIDEO_WARM_MAX_COUNT
        : FEED_VIDEO_WARM_MAX_COUNT;
      if (warmVideoLimit <= 0) {
        publishFeedWarmVideoIds([]);
        return;
      }

      for (const index of candidateIndices) {
        const item = items[index];
        if (item?.type !== 'post' || item.post.kind !== 'video') continue;
        if (item.post.id === activeVideoId) continue;

        warmVideoIds.push(item.post.id);
        if (warmVideoIds.length >= warmVideoLimit) break;
      }

      publishFeedWarmVideoIds(warmVideoIds);
    },
    [],
  );

  const onVisibleFeedItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      latestVisibleFeedItemsRef.current = viewableItems;
      const mediaEligiblePostIds = new Set<string>();
      let firstVisibleIndex = Number.POSITIVE_INFINITY;
      let furthestVisibleIndex = -1;
      viewableItems.forEach(viewable => {
        if (!viewable?.isViewable) return;
        const itemId = viewable.item?.id;
        const index =
          typeof viewable.index === 'number'
            ? viewable.index
            : typeof itemId === 'string'
            ? feedListItemIndexByIdRef.current.get(itemId) ?? -1
            : -1;
        if (index >= 0) {
          firstVisibleIndex = Math.min(firstVisibleIndex, index);
          furthestVisibleIndex = Math.max(furthestVisibleIndex, index);
        }
        if (viewable.item?.type === 'post') {
          mediaEligiblePostIds.add(String(viewable.item.post.id));
        }
      });

      if (furthestVisibleIndex >= 0) {
        const items = feedListItemsRef.current;
        const startIndex = Math.max(
          0,
          firstVisibleIndex - FEED_MEDIA_MOUNT_BEHIND_ITEMS,
        );
        const endIndex = Math.min(
          items.length,
          furthestVisibleIndex + FEED_MEDIA_MOUNT_AHEAD_ITEMS + 1,
        );
        for (let index = startIndex; index < endIndex; index += 1) {
          const item = items[index];
          // Start photo albums shortly before they enter the viewport. Videos
          // remain strictly viewable-gated so a fling cannot warm several
          // native players at once.
          if (item?.type === 'post' && item.post.kind === 'text') {
            mediaEligiblePostIds.add(String(item.post.id));
          }
        }
      }

      publishFeedVisibleMediaPostIds(mediaEligiblePostIds);
      const activeLivePostId = activeInlineLivePostIdRef.current;
      if (
        activeLivePostId !== null &&
        !isInlineLivePostIdViewable(viewableItems, activeLivePostId)
      ) {
        if (pendingActiveInlineLivePostIdRef.current === activeLivePostId) {
          pendingActiveInlineLivePostIdRef.current = null;
        }
        scheduleActiveFeedInlineLivePostId(null, true);
      }
      const activeVideoId = activeVideoIdRef.current;
      if (
        activeVideoId &&
        !isFeedVideoIdViewable(viewableItems, activeVideoId)
      ) {
        scheduleActiveFeedVideo(null, true);
      }
    },
    [scheduleActiveFeedInlineLivePostId, scheduleActiveFeedVideo],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      latestViewableFeedItemsRef.current = viewableItems;
      const visiblePostIds = viewableItems
        .filter(item => item?.isViewable && item?.item?.type === 'post')
        .map(item => String(item.item.post?.id ?? ''))
        .filter(postId => /^[1-9][0-9]*$/.test(postId));
      scheduleRealtimeVisiblePostIds(visiblePostIds);
      prefetchFeedImagesAroundVisibleItems(viewableItems);
      prefetchFeedVideoPostersAroundVisibleItems(viewableItems);
      maybeLoadMoreFeedAroundVisibleItems(viewableItems);
      publishWarmFeedVideosAroundVisibleItems(viewableItems);
      const nextLivePostId = pickInlineLivePostId(viewableItems);
      if (nextLivePostId !== null) {
        pendingActiveVideoIdRef.current = null;
        if (isScrollingRef.current) {
          pendingActiveInlineLivePostIdRef.current = nextLivePostId;
        } else {
          scheduleActiveFeedVideo(null, true);
          scheduleActiveFeedInlineLivePostId(nextLivePostId);
          pendingActiveInlineLivePostIdRef.current = null;
        }
        return;
      }

      pendingActiveInlineLivePostIdRef.current = null;
      if (!isScrollingRef.current) {
        scheduleActiveFeedInlineLivePostId(null, true);
      }
      const update = getFeedVideoActiveUpdate({
        activeVideoId: activeVideoIdRef.current,
        isScrolling: isScrollingRef.current,
        viewableItems,
        visibleItems: latestVisibleFeedItemsRef.current,
      });

      if (isScrollingRef.current) {
        pendingActiveVideoIdRef.current = update.pendingActiveVideoId;
        if (
          update.nextActiveVideoId !== undefined &&
          update.nextActiveVideoId !== activeVideoIdRef.current
        ) {
          scheduleActiveFeedVideo(update.nextActiveVideoId);
        }
        return;
      }

      if (
        update.nextActiveVideoId !== undefined &&
        update.nextActiveVideoId !== activeVideoIdRef.current
      ) {
        scheduleActiveFeedVideo(update.nextActiveVideoId);
      }
    },
    [
      maybeLoadMoreFeedAroundVisibleItems,
      prefetchFeedImagesAroundVisibleItems,
      prefetchFeedVideoPostersAroundVisibleItems,
      publishWarmFeedVideosAroundVisibleItems,
      scheduleRealtimeVisiblePostIds,
      scheduleActiveFeedInlineLivePostId,
      scheduleActiveFeedVideo,
    ],
  );

  // â”€â”€ Post menu state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // The low threshold only answers "is the current card still on-screen?".
  // The high threshold remains responsible for selecting a new autoplay card.
  const viewabilityConfigCallbackPairsRef = useRef([
    {
      viewabilityConfig: {
        itemVisiblePercentThreshold: FEED_VIDEO_VISIBLE_PERCENT,
        minimumViewTime: 0,
      },
      onViewableItemsChanged: onVisibleFeedItemsChanged,
    },
    {
      viewabilityConfig: {
        itemVisiblePercentThreshold: FEED_VIDEO_VIEWABLE_PERCENT,
        minimumViewTime: 0,
      },
      onViewableItemsChanged,
    },
  ]);
  viewabilityConfigCallbackPairsRef.current[0].onViewableItemsChanged =
    onVisibleFeedItemsChanged;
  viewabilityConfigCallbackPairsRef.current[1].onViewableItemsChanged =
    onViewableItemsChanged;

  const [postMenuVisible, setPostMenuVisible] = useState(false);
  const [selectedPostForMenu, setSelectedPostForMenu] =
    useState<FeedPost | null>(null);
  const canDeleteSelectedPost =
    selectedPostForMenu?.permissions?.canDelete === true;

  const handleOpenPostMenu = useCallback((post: FeedPost) => {
    setSelectedPostForMenu(post);
    setPostMenuVisible(true);
  }, []);

  const handleClosePostMenu = useCallback(() => {
    setPostMenuVisible(false);
    setSelectedPostForMenu(null);
  }, []);

  const handleSavePost = useCallback(
    async (postId: string) => {
      try {
        const result = await saveFeedPost?.(postId);
        if (result?.saved) {
          Alert.alert(copy.savedTitle, copy.savedMessage);
        } else {
          Alert.alert(copy.unsavedTitle, copy.unsavedMessage);
        }
      } catch {
        Alert.alert(copy.errorTitle, copy.saveErrorMessage);
      }
    },
    [copy, saveFeedPost],
  );

  const handleReportPost = useCallback(
    async (postId: string, input: ReportPostInput) => {
      try {
        const result = await reportFeedPost?.(postId, input);
        if (!result?.reported) {
          throw new Error(copy.reportErrorMessage);
        }
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error(copy.reportErrorMessage);
      }
    },
    [copy, reportFeedPost],
  );

  const handleHidePost = useCallback(
    async (postId: string) => {
      await hideFeedPost?.(postId);
    },
    [hideFeedPost],
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      if (!canDeleteSelectedPost || selectedPostForMenu?.id !== postId) {
        throw new Error('Bạn không có quyền xóa bài viết này.');
      }

      try {
        const result = await deleteFeedPost?.(postId);
        if (result?.deleted) {
          Alert.alert('Thông báo', 'Đã xóa bài viết thành công.');
        } else {
          Alert.alert('Thông báo', 'Không thể xóa bài viết này.');
        }
      } catch {
        Alert.alert('Lỗi', 'Có lỗi xảy ra khi xóa bài viết.');
      }
    },
    [canDeleteSelectedPost, deleteFeedPost, selectedPostForMenu?.id],
  );

  // Infinite scroll pagination â€” calls loadMore directly.
  // Previous version wrapped in InteractionManager which caused stale
  // closure issues (the guard flags were captured at callback creation
  // time, not when the InteractionManager callback actually ran).
  const {
    isLoading: isFeedLoading,
    isLoadingMore: isFeedLoadingMore,
    isAllLoaded: isFeedAllLoaded,
    loadMorePosts,
  } = vm;
  const {
    isLoading: isProductsLoading,
    isLoadingMore: isProductsLoadingMore,
    isAllLoaded: isProductsAllLoaded,
    loadMoreProducts,
  } = productsVm;

  // Load-more is now allowed even during scroll â€” only throttled by
  // LOAD_MORE_THROTTLE_MS to avoid request spam. This removes the
  // previous isScrollingRef guard that caused the feed to stop loading.
  const handleLoadMore = useCallback(() => {
    const now = Date.now();
    const canRequestFeed =
      !isFeedLoading &&
      !isFeedLoadingMore &&
      !isFeedAllLoaded &&
      now - lastLoadMoreRequestAtRef.current > LOAD_MORE_THROTTLE_MS;

    if (canRequestFeed) {
      lastLoadMoreRequestAtRef.current = now;
      loadMorePosts();
    }

    const canRequestSupplemental =
      now - lastSupplementalLoadMoreRequestAtRef.current >
      SUPPLEMENTAL_LOAD_MORE_THROTTLE_MS;

    if (
      canRequestSupplemental &&
      !isProductsLoading &&
      !isProductsLoadingMore &&
      !isProductsAllLoaded
    ) {
      lastSupplementalLoadMoreRequestAtRef.current = now;
      loadMoreProducts();
    }
  }, [
    isFeedLoading,
    isFeedLoadingMore,
    isFeedAllLoaded,
    loadMorePosts,
    isProductsLoading,
    isProductsLoadingMore,
    isProductsAllLoaded,
    loadMoreProducts,
  ]);

  triggerLoadMoreRef.current = handleLoadMore;

  const handleRefresh = useCallback(() => {
    reloadFeedPosts(true);

    supplementalInteractionRef.current?.cancel();
    supplementalLoadTimersRef.current.forEach(timer => clearTimeout(timer));
    supplementalLoadTimersRef.current = [];

    supplementalInteractionRef.current =
      InteractionManager.runAfterInteractions(() => {
        const timers = [
          setTimeout(() => {
            reloadLive();
          }, 100),
          setTimeout(() => {
            reloadProducts(true);
          }, 250),
          setTimeout(() => {
            reloadGroups(true);
          }, 450),
          setTimeout(() => {
            reloadPages(true);
          }, 650),
          setTimeout(() => {
            reloadEvents(true);
          }, 850),
          setTimeout(() => {
            reloadJobs(true);
          }, 1050),
        ];
        supplementalLoadTimersRef.current = timers;
      });
  }, [
    reloadEvents,
    reloadFeedPosts,
    reloadGroups,
    reloadJobs,
    reloadLive,
    reloadPages,
    reloadProducts,
  ]);

  const handleFeedTabReselect = useCallback(() => {
    if (getTabReselectAction(feedScrollYRef.current) === 'scroll-to-top') {
      feedChromeCollapseStateRef.current = createFeedChromeCollapseState();
      nativeTabScrollPublisherStateRef.current =
        createNativeTabScrollPublisherState(0, 'none');
      publishNativeTabScrollBehavior('none');
      setIsFeedChromeHidden(false);
      mainFeedListRef.current?.scrollToOffset({
        offset: 0,
        animated: true,
      });
      return;
    }

    if (vm.isRefreshing || feedTabRefreshInFlightRef.current) return;
    feedTabRefreshInFlightRef.current = true;
    handleRefresh();
  }, [handleRefresh, vm.isRefreshing]);

  useEffect(() => {
    if (!vm.isRefreshing) {
      feedTabRefreshInFlightRef.current = false;
    }
  }, [vm.isRefreshing]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;

    return navigation.addListener('tabPress' as never, () => {
      if (!isFeedTabFocusedRef.current) return;
      handleFeedTabReselect();
    });
  }, [handleFeedTabReselect, navigation]);

  const ListFooterComponent = useMemo(() => {
    if (vm.error && hasFeedContent) {
      return (
        <View className="items-center px-6 py-8">
          <Text className="text-center text-sm font-semibold text-[#64748b]">
            {feedLoadErrorMessage}
          </Text>
          <TouchableOpacity
            className="mt-3 rounded-full bg-red-50 px-5 py-2.5"
            activeOpacity={0.8}
            onPress={loadMorePosts}
          >
            <Text className="font-bold text-brand">{copy.commentRetry}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isFeedAllLoaded || !hasFeedContent) return null;

    // Keep a small constant-height tail so momentum geometry does not jump,
    // but never expose several fake full-size posts. The old four-card footer
    // let users scroll deep into skeletons while one slow page was pending.
    return (
      <View pointerEvents="none" style={FEED_LOAD_MORE_FOOTER_STYLE}>
        {isFeedLoadingMore ? (
          <>
            <ActivityIndicator color={APP_BRAND_COLOR} size="small" />
            <Text className="mt-2 text-center text-sm font-semibold text-[#64748b]">
              {feedLoadMoreMessage}
            </Text>
          </>
        ) : null}
      </View>
    );
  }, [
    copy.commentRetry,
    feedLoadErrorMessage,
    feedLoadMoreMessage,
    hasFeedContent,
    isFeedAllLoaded,
    isFeedLoadingMore,
    loadMorePosts,
    vm.error,
  ]);

  // â”€â”€ Photo viewer state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Set when the user taps a photo in a text post. Cleared by the modal's
  // close button or Android back press.
  //
  // v2: now we ALSO mirror the value into a ref so the handler can
  // update the visible modal on the very next frame (no React render
  // delay between tap and Modal mount). The React state still drives
  // the Modal's `visible` prop and child re-renders, but the photo
  // URI + index are read from the ref synchronously inside the modal
  // so the user sees the photo the moment the modal appears.
  const [photoViewer, setPhotoViewer] = useState<PhotoViewerState>(null);
  const photoViewerRef = useRef<PhotoViewerState | null>(null);
  const openingPhotoViewerRef = useRef(false);
  const photoPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handlePhotoPress = useCallback(
    (post: FeedTextPost, photoIndex: number) => {
      if (openingPhotoViewerRef.current) {
        return;
      }

      const total = post.photos.length;
      if (total === 0) {
        return;
      }

      // Clear any pending timeout
      if (photoPressTimeoutRef.current) {
        clearTimeout(photoPressTimeoutRef.current);
      }

      const safeIndex = Math.min(Math.max(photoIndex, 0), total - 1);
      const next: PhotoViewerState = { post, initialIndex: safeIndex };
      // 1) Write to ref FIRST so the modal (if already mounted) sees
      //    the new photo on its next render cycle without waiting for
      //    React to commit a state update.
      photoViewerRef.current = next;
      // 2) Trigger Modal mount via React state.
      openingPhotoViewerRef.current = true;
      setPhotoViewer(next);

      // Reset safety flag after 400ms so it never gets stuck
      photoPressTimeoutRef.current = setTimeout(() => {
        openingPhotoViewerRef.current = false;
        photoPressTimeoutRef.current = null;
      }, 400);
    },
    [],
  );

  const handleClosePhotoViewer = useCallback(() => {
    setPhotoViewer(null);
    photoViewerRef.current = null;
    openingPhotoViewerRef.current = false;
    if (photoPressTimeoutRef.current) {
      clearTimeout(photoPressTimeoutRef.current);
      photoPressTimeoutRef.current = null;
    }
  }, []);

  // Reaction picker state â€” anchored to whichever "ThĂ­ch" button was
  // long-pressed. Stored at this level (not inside each card) so only one
  // picker can ever be open at a time AND the picker can float above
  // every card without being clipped by the parent ScrollView.
  const [pickerAnchor, setPickerAnchor] = useState<{
    postId: string;
    x: number;
    y: number;
  } | null>(null);

  // Share action sheet state
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharingPost, setSharingPost] = useState<FeedPost | undefined>(
    undefined,
  );
  const [, setSharingStory] = useState<any | undefined>(undefined);

  const handleOpenPicker = useCallback(
    (postId: string, x: number, y: number) => {
      setPickerAnchor({ postId, x, y });
    },
    [],
  );

  const handlePickReaction = useCallback(
    (reaction: ReactionType) => {
      if (!pickerAnchor) return;
      handleToggleReactionStable(pickerAnchor.postId, reaction);
      setPickerAnchor(null);
    },
    [pickerAnchor, handleToggleReactionStable],
  );

  // Share handlers
  const handleOpenSharePost = useCallback((post: FeedPost) => {
    if (!isFeedPostShareable(post)) return;
    setSharingPost(post);
    setShareModalVisible(true);
    tabBarVisibility.setVisible(false);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShareModalVisible(false);
    tabBarVisibility.setVisible(true);
    setTimeout(() => {
      setSharingPost(undefined);
      setSharingStory(undefined);
    }, 300); // Wait for animation
  }, []);

  const handleInternalSharePost = useCallback(
    async (input: SharePostInput) => {
      return shareFeedPost(input);
    },
    [shareFeedPost],
  );

  // â”€â”€ FlatList: Virtualized feed with interleaved products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Memoize merged posts to prevent unnecessary recalculations
  const mergedPosts = useMemo<FeedPost[]>(() => {
    const posts = feedPosts.filter(
      p => p.kind !== 'product' && p.kind !== 'event' && p.kind !== 'job',
    );
    return interleaveSupplementalPosts(
      posts,
      feedProductPosts,
      feedEventPosts,
      feedJobPosts,
    );
  }, [feedPosts, feedProductPosts, feedEventPosts, feedJobPosts]);

  const feedLiveItems = useMemo<LiveStreamItem[]>(() => {
    const byPostId = new Map<number, LiveStreamItem>();
    [...liveVm.friendsLive, ...liveVm.liveStreams].forEach(item => {
      if (item.state === 'offline') return;
      if (!byPostId.has(item.postId)) {
        byPostId.set(item.postId, item);
      }
    });
    return Array.from(byPostId.values()).sort((a, b) => {
      const aTime = new Date(a.startedAt).getTime();
      const bTime = new Date(b.startedAt).getTime();
      return bTime - aTime;
    });
  }, [liveVm.friendsLive, liveVm.liveStreams]);

  const feedListItems = useMemo<FeedListItem[]>(() => {
    const livePostIds = new Set(feedLiveItems.map(item => String(item.postId)));
    const items: FeedListItem[] = mergedPosts
      .filter(post => !livePostIds.has(String(post.id)))
      .map(post => ({
        type: 'post',
        id: `post-${post.id}`,
        post,
      }));

    feedLiveItems.slice(0, 2).forEach((item, index) => {
      const insertIndex = Math.min(index === 0 ? 2 : 8, items.length);
      items.splice(insertIndex, 0, {
        type: 'live',
        id: `live-${item.postId}`,
        item,
      });
    });

    if (
      (groupsVm.groups.length > 0 || groupsVm.isLoading) &&
      items.length > 0
    ) {
      const insertIndex = Math.min(10, items.length);
      items.splice(insertIndex, 0, {
        type: 'groups-carousel',
        id: 'groups-carousel-main',
        groups: groupsVm.groups,
        isLoading: groupsVm.isLoading,
      });
    }

    if ((pagesVm.pages.length > 0 || pagesVm.isLoading) && items.length > 0) {
      const insertIndex = Math.min(5, items.length);
      items.splice(insertIndex, 0, {
        type: 'pages-carousel',
        id: 'pages-carousel-main',
        pages: pagesVm.pages,
        isLoading: pagesVm.isLoading,
      });
    }

    // Funding carousel sits BELOW the groups/pages rails so the user
    // sees the discovery-first content first, then community
    // actions (donate / join / follow). Slot it at index ~14 so it
    // appears just after the user has scrolled past a handful of
    // organic posts.
    if (
      (fundingVm.campaigns.length > 0 || fundingVm.isLoading) &&
      items.length > 0
    ) {
      const insertIndex = Math.min(14, items.length);
      items.splice(insertIndex, 0, {
        type: 'funding-carousel',
        id: 'funding-carousel-main',
        campaigns: fundingVm.campaigns,
        isLoading: fundingVm.isLoading,
        currencySymbol: fundingVm.currencySymbol,
      });
    }

    const stableItems = reuseStableItemsById(
      stableFeedListItemsRef.current,
      items,
      areFeedListItemsRenderEquivalent,
    );
    stableFeedListItemsRef.current = stableItems;
    return stableItems;
  }, [
    feedLiveItems,
    mergedPosts,
    groupsVm.groups,
    groupsVm.isLoading,
    pagesVm.pages,
    pagesVm.isLoading,
    fundingVm.campaigns,
    fundingVm.isLoading,
    fundingVm.currencySymbol,
  ]);

  useEffect(() => {
    const renderedItems =
      Platform.OS === 'ios'
        ? ([
            { type: 'intro', id: 'feed-intro' },
            ...feedListItems,
          ] as FeedListItem[])
        : feedListItems;

    feedListItemsRef.current = renderedItems;
    feedListItemIndexByIdRef.current = new Map(
      renderedItems.map((item, index) => [item.id, index]),
    );
    prefetchFeedImagesAroundVisibleItems(latestViewableFeedItemsRef.current);
    prefetchFeedVideoPostersAroundVisibleItems(
      latestViewableFeedItemsRef.current,
    );
    if (latestViewableFeedItemsRef.current.length > 0) {
      publishWarmFeedVideosAroundVisibleItems(
        latestViewableFeedItemsRef.current,
      );
    } else {
      publishFeedWarmVideoIds([]);
    }
  }, [
    feedListItems,
    prefetchFeedImagesAroundVisibleItems,
    prefetchFeedVideoPostersAroundVisibleItems,
    publishWarmFeedVideosAroundVisibleItems,
  ]);

  useEffect(() => {
    const videoIds = new Set(
      feedListItems
        .filter(
          (item): item is Extract<FeedListItem, { type: 'post' }> =>
            item.type === 'post' && item.post.kind === 'video',
        )
        .map(item => item.post.id),
    );

    Array.from(feedVideoRefsRef.current.keys()).forEach(videoId => {
      if (!videoIds.has(videoId)) {
        feedVideoRefsRef.current.delete(videoId);
      }
    });

    if (activeVideoIdRef.current && !videoIds.has(activeVideoIdRef.current)) {
      setActiveFeedVideo(null);
    }

    const livePostIds = new Set(
      feedListItems
        .filter(
          (item): item is Extract<FeedListItem, { type: 'live' }> =>
            item.type === 'live' && item.item.state === 'live',
        )
        .map(item => item.item.postId),
    );
    if (
      activeInlineLivePostIdRef.current !== null &&
      !livePostIds.has(activeInlineLivePostIdRef.current)
    ) {
      scheduleActiveFeedInlineLivePostId(null, true);
    }
  }, [feedListItems, scheduleActiveFeedInlineLivePostId, setActiveFeedVideo]);

  // â”€â”€ Smart image prefetch â€” only the next ~10 upcoming items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Image prefetching is driven by FlashList viewability above so upcoming
  // media enters cache before scroll.
  // Separate memoized render functions for each type - prevents full re-render
  const renderVideoPost = useCallback(
    ({ item }: { item: FeedVideoPost }) => (
      <View ref={node => setFeedVideoRef(item.id, node)}>
        <HomeVideoPostCard
          post={item}
          copy={copy}
          onReact={handleToggleReactionStable}
          onOpenPicker={handleOpenPicker}
          onCommentTap={handleCommentTapStable}
          onShare={handleOpenSharePost}
          onOpenReactions={openReactionsSheet}
          navigateToProfile={navigateToProfile}
          onOpenPostMenu={handleOpenPostMenu}
          showGroupContext
          isScreenFocused={isFeedTabFocused}
          keepPreparedVideoMounted={!FEED_IS_ANDROID}
          deferMediaUntilVisible
        />
      </View>
    ),
    [
      handleCommentTapStable,
      copy,
      handleOpenPicker,
      handleOpenSharePost,
      navigateToProfile,
      handleOpenPostMenu,
      setFeedVideoRef,
      handleToggleReactionStable,
      openReactionsSheet,
      isFeedTabFocused,
    ],
  );

  const renderTextPost = useCallback(
    ({ item }: { item: FeedTextPost }) => (
      <TextPostCard
        post={item}
        copy={copy}
        onReact={handleToggleReactionStable}
        onOpenPicker={handleOpenPicker}
        onCommentTap={handleCommentTapStable}
        onPhotoPress={handlePhotoPress}
        onShare={handleOpenSharePost}
        onOpenReactions={openReactionsSheet}
        navigateToProfile={navigateToProfile}
        onOpenPostMenu={handleOpenPostMenu}
        onPostPress={handlePostPress}
        showGroupContext
        deferMediaUntilVisible
      />
    ),
    [
      handleCommentTapStable,
      copy,
      handleOpenPicker,
      handleOpenSharePost,
      handlePhotoPress,
      navigateToProfile,
      handleOpenPostMenu,
      handlePostPress,
      handleToggleReactionStable,
      openReactionsSheet,
    ],
  );

  const renderProductPost = useCallback(
    ({ item }: { item: FeedProductPost }) => (
      <FeedProductPostCard
        post={item}
        onPress={handleProductPress}
        onProfilePress={navigateToProfile}
        onSharePost={handleOpenSharePost}
      />
    ),
    [handleProductPress, navigateToProfile, handleOpenSharePost],
  );

  const renderEventPost = useCallback(
    ({ item }: { item: FeedEventPost }) => (
      <FeedEventPostCard
        post={item}
        copy={copy}
        onPress={handleEventPress}
        onProfilePress={navigateToProfile}
        onSharePost={handleOpenSharePost}
        onToggleInterested={toggleInterested}
        onToggleGoing={toggleGoing}
        onEditPress={eventItem => {
          Alert.alert(
            copy.editTitle,
            copy.editEventMessage(
              eventItem.event_name || eventItem.name || copy.eventFallback,
            ),
          );
        }}
      />
    ),
    [
      handleEventPress,
      copy,
      navigateToProfile,
      handleOpenSharePost,
      toggleInterested,
      toggleGoing,
    ],
  );

  const renderPollPost = useCallback(
    ({ item }: { item: FeedPollPost }) => (
      <PollPostCard
        post={item}
        language={language}
        onVote={voteFeedPoll}
        onReact={toggleFeedReaction}
        onOpenPicker={handleOpenPicker}
        onCommentTap={commentVm.openComments}
        onShare={handleOpenSharePost}
        onProfilePress={navigateToProfile}
        onMorePress={handleOpenPostMenu}
        showGroupContext
        currentUserAvatar={userVm.user?.avatar}
        gestureX={gestureX}
        gestureY={gestureY}
        gestureActive={gestureActive}
        gestureStartX={gestureStartX}
        gestureStartY={gestureStartY}
        hasDragged={hasDragged}
      />
    ),
    [
      voteFeedPoll,
      language,
      toggleFeedReaction,
      handleOpenPicker,
      commentVm.openComments,
      handleOpenSharePost,
      navigateToProfile,
      handleOpenPostMenu,
      userVm.user?.avatar,
      gestureActive,
      gestureX,
      gestureY,
      gestureStartX,
      gestureStartY,
      hasDragged,
    ],
  );

  const renderAdPost = useCallback(
    ({ item }: { item: FeedAdPost }) => (
      <FeedAdPostCard post={item} copy={copy} />
    ),
    [copy],
  );

  const renderJobPost = useCallback(
    ({ item }: { item: FeedJobPost }) => (
      <FeedJobPostCard
        post={item}
        copy={copy}
        onPress={handleJobPress}
        onSharePost={handleOpenSharePost}
      />
    ),
    [copy, handleJobPress, handleOpenSharePost],
  );

  const renderGroupsCarousel = useCallback(
    ({
      item,
    }: {
      item: Extract<FeedListItem, { type: 'groups-carousel' }>;
    }) => (
      <SuggestedGroupsCarousel
        groups={item.groups}
        isLoading={item.isLoading}
        copy={copy}
        onOpenGroups={handleOpenGroups}
        onOpenGroup={handleOpenGroup}
      />
    ),
    [copy, handleOpenGroup, handleOpenGroups],
  );

  const renderPagesCarousel = useCallback(
    ({ item }: { item: Extract<FeedListItem, { type: 'pages-carousel' }> }) => (
      <SuggestedPagesCarousel
        pages={item.pages}
        isLoading={item.isLoading}
        copy={copy}
        onOpenPages={handleOpenPages}
        onOpenPage={handleOpenPage}
        onLikePage={pagesVm.toggleLikePage}
        onFollowPage={pagesVm.toggleFollowPage}
      />
    ),
    [
      copy,
      handleOpenPage,
      handleOpenPages,
      pagesVm.toggleFollowPage,
      pagesVm.toggleLikePage,
    ],
  );

  const renderFundingCarousel = useCallback(
    ({
      item,
    }: {
      item: Extract<FeedListItem, { type: 'funding-carousel' }>;
    }) => (
      <FeedFundingCarousel
        campaigns={item.campaigns}
        isLoading={item.isLoading}
        copy={copy}
        currencySymbol={item.currencySymbol}
        onOpenFundingList={handleOpenFundingList}
        onOpenCampaign={handleOpenFundingCampaign}
      />
    ),
    [copy, handleOpenFundingCampaign, handleOpenFundingList],
  );

  const renderLivePost = useCallback(
    ({ item }: { item: Extract<FeedListItem, { type: 'live' }> }) => (
      <FeedLivePostCard
        item={item.item}
        copy={copy}
        isActive={
          isFeedTabFocused && activeInlineLivePostId === item.item.postId
        }
        onPress={handleOpenLive}
      />
    ),
    [activeInlineLivePostId, copy, handleOpenLive, isFeedTabFocused],
  );

  const renderFeedIntro = useCallback(
    () => (
      <View>
        <HomeFeedIntro
          onCreatePostPress={openCreatePost}
          onCreatePostPressAction={goToCreatePost}
          onPressAvatar={() => navigateToOwnProfile(navigation)}
          avatarUrl={userVm.user?.avatar}
          userName={userVm.user?.name}
          liveStreams={feedLiveItems}
          onLivePress={handleOpenLive}
          copy={copy}
        />
      </View>
    ),
    [
      copy,
      feedLiveItems,
      goToCreatePost,
      handleOpenLive,
      navigation,
      openCreatePost,
      userVm.user?.avatar,
      userVm.user?.name,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedListItem }) => {
      if (item.type === 'intro') {
        return renderFeedIntro();
      }

      if (item.type === 'groups-carousel') {
        return renderGroupsCarousel({ item });
      }

      if (item.type === 'pages-carousel') {
        return renderPagesCarousel({ item });
      }

      if (item.type === 'funding-carousel') {
        return renderFundingCarousel({ item });
      }

      if (item.type === 'live') {
        return renderLivePost({ item });
      }

      switch (item.post.kind) {
        case 'video':
          return renderVideoPost({ item: item.post as FeedVideoPost });
        case 'text':
          return renderTextPost({ item: item.post as FeedTextPost });
        case 'product':
          return renderProductPost({ item: item.post as FeedProductPost });
        case 'event':
          return renderEventPost({ item: item.post as FeedEventPost });
        case 'job':
          return renderJobPost({ item: item.post as FeedJobPost });
        case 'poll':
          return renderPollPost({ item: item.post as FeedPollPost });
        case 'ad':
          return renderAdPost({ item: item.post as FeedAdPost });
        default:
          return null;
      }
    },
    [
      renderAdPost,
      renderEventPost,
      renderGroupsCarousel,
      renderJobPost,
      renderLivePost,
      renderPagesCarousel,
      renderFeedIntro,
      renderFundingCarousel,
      renderPollPost,
      renderProductPost,
      renderTextPost,
      renderVideoPost,
    ],
  );

  const keyExtractor = useCallback((item: FeedListItem) => item.id, []);

  const feedListItemType = useCallback((item: FeedListItem) => {
    if (item.type !== 'post') return item.type;
    return `post-${item.post.kind}`;
  }, []);

  const feedListExtraData = useMemo(
    () => ({
      activeInlineLivePostId,
      isFeedTabFocused,
      language,
      userAvatar: userVm.user?.avatar,
      userId: userVm.user?.userId,
      userName: userVm.user?.name,
    }),
    [
      activeInlineLivePostId,
      isFeedTabFocused,
      language,
      userVm.user?.avatar,
      userVm.user?.userId,
      userVm.user?.name,
    ],
  );

  const androidListHeaderComponent = useMemo(
    () => renderFeedIntro(),
    [renderFeedIntro],
  );

  const iosFeedListItems = useMemo<FeedListItem[]>(
    () => [{ type: 'intro', id: 'feed-intro' }, ...feedListItems],
    [feedListItems],
  );

  const feedRefreshControl = useMemo(
    () => (
      <RefreshControl
        // Pull-to-refresh represents the Home timeline only. Discovery
        // modules continue refreshing in the background and must not keep
        // the native spinner open after the newest posts are already ready.
        refreshing={vm.isRefreshing}
        onRefresh={handleRefresh}
        tintColor={APP_BRAND_COLOR}
        progressViewOffset={feedRefreshProgressViewOffset}
      />
    ),
    [feedRefreshProgressViewOffset, handleRefresh, vm.isRefreshing],
  );

  const feedListEmptyComponent = useMemo(
    () => {
      if (vm.isLoading) {
        return (
          <View>
            {[1, 2, 3].map(i => (
              <PostSkeleton key={i} />
            ))}
          </View>
        );
      }

      if (!vm.error) return null;

      return (
        <View className="items-center px-8 py-16">
          <Text className="text-center text-base font-semibold text-[#475569]">
            {feedLoadErrorMessage}
          </Text>
          <TouchableOpacity
            className="mt-4 rounded-full bg-red-50 px-6 py-3"
            activeOpacity={0.8}
            onPress={handleRefresh}
          >
            <Text className="font-bold text-brand">{copy.commentRetry}</Text>
          </TouchableOpacity>
        </View>
      );
    },
    [
      copy.commentRetry,
      feedLoadErrorMessage,
      handleRefresh,
      vm.error,
      vm.isLoading,
    ],
  );

  const feedListElement = (
    <FlashList
      ref={mainFeedListRef}
      data={Platform.OS === 'ios' ? iosFeedListItems : feedListItems}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={feedListItemType}
      extraData={feedListExtraData}
      ListHeaderComponent={
        Platform.OS === 'ios' ? undefined : androidListHeaderComponent
      }
      drawDistance={FEED_LIST_DRAW_DISTANCE}
      maxItemsInRecyclePool={FEED_LIST_RECYCLE_POOL_SIZE}
      maintainVisibleContentPosition={
        FEED_LIST_MAINTAIN_VISIBLE_CONTENT_POSITION
      }
      removeClippedSubviews={false}
      decelerationRate={FEED_SCROLL_DECELERATION_RATE}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      onLayout={handleFeedViewportLayout}
      scrollEventThrottle={16}
      onScroll={handleFeedScroll}
      viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairsRef.current}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      onMomentumScrollBegin={handleMomentumScrollBegin}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={1.4}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={feedListContentStyle}
      scrollIndicatorInsets={feedScrollIndicatorInsets}
      refreshControl={feedRefreshControl}
      ListEmptyComponent={feedListEmptyComponent}
    />
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        className={FEED_SAFE_AREA_CLASS_NAME}
        style={FEED_SAFE_AREA_STYLE}
        edges={FEED_ROOT_SAFE_AREA_EDGES}
      >
        <FocusAwareStatusBar
          barStyle={
            Platform.OS === 'android' ? 'light-content' : 'dark-content'
          }
          backgroundColor={
            Platform.OS === 'android' ? APP_BRAND_COLOR : '#FFFFFF'
          }
          translucent={false}
        />
        {Platform.OS === 'android' ? (
          <View
            testID="android-feed-status-bar-background"
            pointerEvents="none"
            style={androidStatusBarBackgroundStyle}
          />
        ) : null}
        {Platform.OS === 'ios' ? (
          <>
            {hasNewPosts && (
              <TouchableOpacity
                onPress={handleLoadNewPosts}
                activeOpacity={0.9}
                style={{ top: newPostsButtonTop }}
                className="absolute self-center z-[999] flex-row items-center bg-brand px-4 py-2.5 rounded-full shadow-lg border border-brand"
              >
                <ArrowUp size={14} color="#ffffff" className="mr-1.5" />
                <Text className="text-white text-xs font-bold">
                  Có bài đăng mới
                </Text>
              </TouchableOpacity>
            )}
            {feedListElement}
            <FeedHeaderCollapseFrame hidden={isFeedChromeHidden}>
              <FeedHeader />
            </FeedHeaderCollapseFrame>
          </>
        ) : (
          <>
            <FeedHeaderCollapseFrame
              hidden={isFeedChromeHidden}
              height={FEED_HEADER_CONTENT_HEIGHT}
              top={topInset}
              translateDistance={FEED_HEADER_CONTENT_HEIGHT}
            >
              <View style={{ height: FEED_HEADER_CONTENT_HEIGHT }}>
                <FeedHeader />
                <FeedFilterTabs
                  variant="header"
                  activeSource={activeFeedSource}
                  onChangeSource={setActiveFeedSource}
                  onActiveSourcePress={handleFeedTabReselect}
                />
              </View>
            </FeedHeaderCollapseFrame>
            {hasNewPosts && (
              <TouchableOpacity
                onPress={handleLoadNewPosts}
                activeOpacity={0.9}
                style={{ top: newPostsButtonTop }}
                className="absolute self-center z-[999] flex-row items-center bg-brand px-4 py-2.5 rounded-full shadow-lg border border-brand"
              >
                <ArrowUp size={14} color="#ffffff" className="mr-1.5" />
                <Text className="text-white text-xs font-bold">
                  Có bài đăng mới
                </Text>
              </TouchableOpacity>
            )}
            {feedListElement}
          </>
        )}
        <ReactionPickerOverlay
          anchor={pickerAnchor}
          onPick={handlePickReaction}
          onDismiss={() => setPickerAnchor(null)}
          gestureX={gestureX}
          gestureY={gestureY}
          gestureActive={gestureActive}
          hasDragged={hasDragged}
        />
        {/* â”€â”€ Photo Viewer â”€â”€ */}
        <PhotoViewerModal
          state={photoViewer}
          copy={copy}
          onClose={handleClosePhotoViewer}
          onReact={handleToggleReactionStable}
          onCommentTap={handlePhotoViewerCommentTap}
          onProfilePress={navigateToProfile}
          onOpenShare={handleOpenSharePost}
          onInternalShare={handleInternalSharePost}
          onShared={prependFeedPost}
          onFollowChange={updateFeedPublisherFollowState}
          posts={feedPosts}
        />
        <ReelCommentsSheet
          visible={commentVm.isCommentsOpen}
          comments={commentVm.comments}
          commentCount={
            selectedCommentPost?.commentCount ?? commentVm.comments.length
          }
          isLoading={commentVm.isCommentsLoading}
          isLoadingMore={commentVm.isCommentsLoadingMore}
          isSubmitting={commentVm.isSubmittingComment}
          error={commentVm.commentError}
          repliesById={commentVm.repliesById}
          loadingRepliesIds={commentVm.loadingRepliesIds}
          replyingTo={commentVm.replyingTo}
          onClose={commentVm.closeComments}
          onEndReached={commentVm.loadMoreComments}
          onRetry={handleRetryComments}
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
          sheetHeight="90%"
        />
        <PostReactionsSheet
          visible={reactionsSheetVisible}
          postId={reactionsSheetPostId}
          onClose={closeReactionsSheet}
        />
        {/* â”€â”€ Share Action Sheet â”€â”€ */}
        <FeedShareBottomSheet
          visible={shareModalVisible}
          onClose={handleCloseShareModal}
          post={sharingPost}
          onInternalShare={handleInternalSharePost}
          onShared={prependFeedPost}
        />
        {/* â”€â”€ Post Menu Action Sheet â”€â”€ */}
        <PostMenuActionSheet
          visible={postMenuVisible}
          onClose={handleClosePostMenu}
          post={selectedPostForMenu}
          canDelete={canDeleteSelectedPost}
          onSave={handleSavePost}
          onHide={handleHidePost}
          onDelete={handleDeletePost}
          onReport={handleReportPost}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

export default FeedScreen;
