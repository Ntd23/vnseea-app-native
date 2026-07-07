// Description: Renders the Stitch Facebook-style VNSEEA feed inside the main tab shell.
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
  type ImageProps,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  ArrowUp,
  Briefcase,
  Building2,
  Compass,
  Globe,
  Image as ImageIcon,
  Lock,
  MapPin,
  Megaphone,
  Plus,
  Radio,
  ShoppingBag,
  ThumbsUp,
  Users,
  Video,
} from 'lucide-react-native';
import { PostMenuActionSheet } from '../../../shared-kernel/presentation/components/PostMenuActionSheet';
import {
  PhotoViewerModal,
  type PhotoViewerState,
} from '../../../shared-kernel/presentation/components/PhotoViewerModal';
import { tabBarVisibility } from '../../../navigation/tabBarVisibility';
import {
  createNativeTabScrollPublisherState,
  publishNativeTabScrollBehavior,
  publishNativeTabScrollIntent,
} from '../../../navigation/nativeTabScrollPublisher';
import { useMainTabContentInsets } from '../../../navigation/useMainTabContentInsets';
import { ReelCommentsSheet } from '../../../reels/presentation/components/ReelCommentsSheet';
import { FeedShareBottomSheet } from '../components/FeedShareBottomSheet';
import PostReactionsSheet from '../components/PostReactionsSheet';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
  initialWindowMetrics,
  type Edge,
} from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useFeedViewModel } from '../../application/view-models/useFeedViewModel';
import { postCreatedEvents } from '../../application/events/postCreatedEvents';
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
import type {
  FeedSource,
  SharePostInput,
} from '../../domain/repositories/FeedRepository';
import { useFeedCommentsViewModel } from '../../application/view-models/useFeedCommentsViewModel';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { ProductPostCard } from '../../../product/presentation/components/ProductPostCard';
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
import { FeedHeader } from '../components/FeedHeader';
import { FeedHeaderCollapseFrame } from '../components/FeedHeaderCollapseFrame';
import { HomeFeedIntro } from '../components/HomeFeedIntro';
import {
  createFeedChromeCollapseState,
  getNextFeedChromeCollapseState,
  resetFeedChromeScrollIntent,
  type FeedChromeCollapseState,
} from '../components/feedChromeCollapse';
import {
  feedActiveVideoIdSnapshot,
  FEED_COPY,
  type FeedCopy,
  HomeVideoPostCard,
  publishFeedActiveVideo,
  publishFeedScrollBusy,
  ReactionPickerOverlay,
  TextPostCard,
  useFeedScrollBusy,
} from '../components/PostCards';
import { useEventsOnFeedViewModel, EventPostCard } from '../../../events';
import {
  JOB_TYPE_VIETNAMESE,
  SALARY_DATE_OPTIONS,
  type JobsItem,
  type JobType,
} from '../../../jobs/domain/types/jobs.types';
import { useJobsOnFeedViewModel } from '../../../jobs/application/view-models/useJobsOnFeedViewModel';
import type { GroupItem } from '../../../community/domain/types/community.types';
import { useSuggestedGroupsOnFeedViewModel } from '../../../community/application/view-models/useSuggestedGroupsOnFeedViewModel';
import { ToastContainer } from '../../../shared-kernel/presentation/components/ToastNotification';
import { useLiveViewModel } from '../../../live/application/view-models/useLiveViewModel';
import type { LiveStreamItem } from '../../../live/domain/types/live.types';
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
  pickFeedVideoAutoplayCandidate,
  pickFeedViewableVideoId,
} from './feedVideoAutoplay';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';

const LOAD_MORE_THROTTLE_MS = 800;
const SUPPLEMENTAL_LOAD_MORE_THROTTLE_MS = 2500;
const FEED_EARLY_LOAD_DISTANCE_MULTIPLIER = 2.25;
const FEED_EARLY_LOAD_MIN_DISTANCE = 1600;
const FEED_NEW_POST_PROBE_INTERVAL_MS = 30000;
const FEED_NEW_POST_PROBE_LIMIT = 8;
const INITIAL_IMAGE_PREFETCH_ITEMS = 8;
const IMAGE_PREFETCH_LOOKAHEAD = 14;
const IMAGE_PREFETCH_BEHIND = 2;
const MAX_IMAGE_PREFETCH_URLS = 20;
const IMAGE_PREFETCH_BATCH_SIZE = 4;
const IMAGE_PREFETCH_BATCH_DELAY_MS = 90;
const FEED_LOAD_MORE_LOOKAHEAD_ITEMS = 8;
const FEED_LIST_INITIAL_RENDER_COUNT = 6;
const FEED_LIST_RENDER_BATCH_SIZE = 6;
const FEED_LIST_WINDOW_SIZE = 9;
const FEED_LIST_BATCHING_PERIOD_MS = 40;
const FEED_LIST_CONTENT_STYLE = {
  paddingBottom: 24,
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

function getFeedChromeTopInset(rawTopInset: number) {
  if (Platform.OS === 'android') return 0;
  return rawTopInset;
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

function FilterTabs({
  copy: _copy,
  activeSource,
  onChangeSource,
}: {
  copy: FeedCopy;
  activeSource: FeedSource | 'photos';
  onChangeSource: (source: FeedSource | 'photos') => void;
}) {
  const navigation = useNavigation<any>();

  return (
    <View className="bg-white px-4 pb-2 pt-2">
      <View className="min-h-[50px] flex-row items-center justify-around rounded-[16px] border border-[#e3e8f2] bg-white px-4 shadow-sm">
        {/* Tất cả */}
        <TouchableOpacity
          className="h-10 flex-1 items-center justify-center"
          activeOpacity={0.75}
          onPress={() => onChangeSource('all')}
        >
          <Compass
            size={24}
            color={activeSource === 'all' ? '#0758ff' : '#9ca3af'}
            strokeWidth={activeSource === 'all' ? 2.5 : 2.0}
          />
        </TouchableOpacity>

        <View className="h-7 w-px bg-[#dfe4ef]" />

        {/* Bản đồ địa chỉ */}
        <TouchableOpacity
          className="h-10 flex-1 items-center justify-center"
          activeOpacity={0.75}
          onPress={() => navigation.navigate(ROUTES.NEARBY_USERS)}
        >
          <MapPin
            size={24}
            color="#9ca3af"
            strokeWidth={2.0}
          />
        </TouchableOpacity>

        <View className="h-7 w-px bg-[#dfe4ef]" />

        {/* Ảnh */}
        <TouchableOpacity
          className="h-10 flex-1 items-center justify-center"
          activeOpacity={0.75}
          onPress={() => onChangeSource('photos')}
        >
          <ImageIcon
            size={24}
            color={activeSource === 'photos' ? '#0758ff' : '#9ca3af'}
            strokeWidth={activeSource === 'photos' ? 2.5 : 2.0}
          />
        </TouchableOpacity>

        <View className="h-7 w-px bg-[#dfe4ef]" />

        {/* Video */}
        <TouchableOpacity
          className="h-10 flex-1 items-center justify-center"
          activeOpacity={0.75}
          onPress={() => navigation.navigate(ROUTES.REELS)}
        >
          <Video
            size={24}
            color="#9ca3af"
            strokeWidth={2.0}
          />
        </TouchableOpacity>

        <View className="h-7 w-px bg-[#dfe4ef]" />

        {/* Thị trường */}
        <TouchableOpacity
          className="h-10 flex-1 items-center justify-center"
          activeOpacity={0.75}
          onPress={() => navigation.navigate(ROUTES.MARKETPLACE)}
        >
          <ShoppingBag
            size={24}
            color="#9ca3af"
            strokeWidth={2.0}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

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

type FeedMediaImageProps = {
  uri: string;
  className?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageProps['resizeMode'];
  deferWhileScrolling?: boolean;
};

const FEED_MEDIA_PLACEHOLDER_STYLE = { backgroundColor: '#E5E7EB' };

const FeedMediaImageBase = React.memo(function FeedMediaImageBase({
  uri,
  className,
  style,
  resizeMode = 'cover',
}: Omit<FeedMediaImageProps, 'deferWhileScrolling'>) {
  return (
    <Image
      source={{ uri }}
      className={className}
      style={style}
      resizeMode={resizeMode}
      fadeDuration={0}
      resizeMethod="resize"
      progressiveRenderingEnabled
    />
  );
});

const DeferredFeedMediaImage = React.memo(function DeferredFeedMediaImage({
  uri,
  className,
  style,
  resizeMode = 'cover',
}: Omit<FeedMediaImageProps, 'deferWhileScrolling'>) {
  const isScrollBusy = useFeedScrollBusy();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setHasLoaded(false);
  }, [uri]);

  if (isScrollBusy && !hasLoaded) {
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

const FeedMediaImage = React.memo(function FeedMediaImage({
  uri,
  className,
  style,
  resizeMode = 'cover',
  deferWhileScrolling = false,
}: FeedMediaImageProps) {
  if (deferWhileScrolling) {
    return (
      <DeferredFeedMediaImage
        uri={uri}
        className={className}
        style={style}
        resizeMode={resizeMode}
      />
    );
  }

  return (
    <FeedMediaImageBase
      uri={uri}
      className={className}
      style={style}
      resizeMode={resizeMode}
    />
  );
});

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
          <View className="h-9 w-9 items-center justify-center rounded-full bg-[#eef2ff]">
            <Megaphone size={18} color="#0000ff" />
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
          <Text className="text-sm font-bold text-[#0866ff]">
            {copy.learnMore}
          </Text>
        </FeedGlassActionButton>
      </FeedGlassActionBar>
    </FeedCardSurface>
  );
});

const FeedLivePostCard = React.memo(
  function FeedLivePostCard({
    item,
    copy,
    onPress,
  }: {
    item: LiveStreamItem;
    copy: FeedCopy;
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

        <FeedMediaFrame className="relative h-52 bg-[#0f172a]">
          {item.thumbnailUrl ? (
            <FeedMediaImage
              uri={item.thumbnailUrl}
              className="h-full w-full opacity-90"
              resizeMode="cover"
            />
          ) : (
            <View className="absolute inset-0 items-center justify-center">
              <Radio size={44} color="#ffffff" />
              <Text className="mt-2 text-sm font-bold text-white/80">
                {copy.livePlaying}
              </Text>
            </View>
          )}
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
          <View className="mt-4 rounded-xl bg-[#eef2ff] px-4 py-3">
            <Text className="text-center text-sm font-extrabold text-[#0000ff]">
              {copy.watchLive}
            </Text>
          </View>
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
    prev.copy === next.copy,
);

const FeedProductPostCard = React.memo(function FeedProductPostCard({
  post,
  onPress,
  onProfilePress,
  onSharePost,
}: {
  post: FeedProductPost;
  onPress: (product: FeedProductPost['product']) => void;
  onProfilePress: (userId: string) => void;
  onSharePost: (post: FeedPost) => void;
}) {
  const handleShare = useCallback(() => {
    onSharePost(post);
  }, [onSharePost, post]);

  return (
    <ProductPostCard
      product={post.product}
      onPress={onPress}
      onProfilePress={onProfilePress}
      onShare={handleShare}
    />
  );
});

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

function formatSalary(job: JobsItem, copy: FeedCopy) {
  const minimum = Number(job.minimum) || 0;
  const maximum = Number(job.maximum) || 0;
  const currency = job.currency || '';
  const salaryDate = job.salary_date
    ? SALARY_DATE_OPTIONS[job.salary_date] || job.salary_date
    : '';

  if (!minimum && !maximum) return copy.negotiable;

  const formatNumber = (value: number) => value.toLocaleString('vi-VN');
  const range =
    minimum && maximum
      ? `${formatNumber(minimum)} - ${formatNumber(maximum)}`
      : formatNumber(minimum || maximum);

  return `${range}${currency ? ` ${currency}` : ''}${
    salaryDate ? ` / ${salaryDate}` : ''
  }`;
}

function getJobTypeLabel(jobType: string, copy: FeedCopy) {
  return (
    JOB_TYPE_VIETNAMESE[jobType as JobType] || jobType || copy.jobTypeFallback
  );
}

const FeedJobPostCard = React.memo(function FeedJobPostCard({
  post,
  copy,
  onPress,
}: {
  post: FeedJobPost;
  copy: FeedCopy;
  onPress: (job: JobsItem) => void;
}) {
  const job = post.job;
  const avatar = job.page?.avatar || post.publisher.avatarUrl || images.me;
  const cover = job.image || job.page?.cover;
  const pageName =
    job.page?.page_title || post.publisher.name || copy.employerFallback;

  const handlePress = useCallback(() => {
    onPress(job);
  }, [job, onPress]);

  return (
    <FeedTouchableCardSurface activeOpacity={0.9} onPress={handlePress}>
      <FeedCardContent>
        <View className="flex-row items-center">
          <Avatar uri={avatar} size={42} />
          <View className="ml-3 flex-1">
            <Text
              className="text-title-primary text-[#111827]"
              numberOfLines={1}
            >
              {pageName}
            </Text>
            <View className="mt-0.5 flex-row items-center">
              <Text className="text-xs font-semibold text-[#64748b]">
                {formatPostTime(post.postedAt, copy)}
              </Text>
              <Text className="mx-1 text-xs text-[#94a3b8]">{'\u2022'}</Text>
              <Globe size={12} color="#94a3b8" />
            </View>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-[#eef2ff]">
            <Briefcase size={18} color="#0000ff" />
          </View>
        </View>

        <Text
          className="mt-4 text-[17px] font-extrabold text-[#111827]"
          numberOfLines={2}
        >
          {job.title || copy.jobFallback}
        </Text>
        {!!job.description && (
          <Text
            className="mt-2 text-sm leading-5 text-[#475569]"
            numberOfLines={3}
          >
            {job.description}
          </Text>
        )}

        <View className="mt-4 flex-row flex-wrap gap-2">
          {!!job.location && (
            <View className="flex-row items-center rounded-full bg-[#f1f5f9] px-3 py-2">
              <MapPin size={14} color="#64748b" />
              <Text
                className="ml-1 max-w-[210px] text-xs font-bold text-[#475569]"
                numberOfLines={1}
              >
                {job.location}
              </Text>
            </View>
          )}
          <View className="flex-row items-center rounded-full bg-[#eff6ff] px-3 py-2">
            <Briefcase size={14} color="#0866ff" />
            <Text className="ml-1 text-xs font-bold text-[#0866ff]">
              {getJobTypeLabel(job.job_type, copy)}
            </Text>
          </View>
        </View>
      </FeedCardContent>

      {!!cover && (
        <FeedMediaFrame className="h-44 bg-slate-100">
          <FeedMediaImage
            uri={cover}
            className="h-full w-full"
            resizeMode="cover"
          />
        </FeedMediaFrame>
      )}

      <FeedGlassActionBar className="border-t border-[#dddfe2] px-3 py-3 pt-3">
        <View className="mr-4 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-[0.4px] text-[#64748b]">
            {copy.salary}
          </Text>
          <Text
            className="mt-0.5 text-sm font-bold text-[#111827]"
            numberOfLines={1}
          >
            {formatSalary(job, copy)}
          </Text>
        </View>

        <View className="rounded-lg bg-[#e7f0ff] px-4 py-2">
          <Text className="text-sm font-bold text-[#0866ff]">
            {copy.viewJob}
          </Text>
        </View>
      </FeedGlassActionBar>
    </FeedTouchableCardSurface>
  );
});

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
    <View className="mb-6 border-y border-[#e5e7eb] bg-white py-4">
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
          <Text className="text-sm font-bold text-[#0866ff]">
            {copy.seeAll}
          </Text>
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
                  <Text className="mx-1 text-xs text-[#94a3b8]">{'\u2022'}</Text>
                  <Users size={13} color="#64748b" />
                  <Text className="ml-1 text-xs font-semibold text-[#64748b]">
                    {formatCount(Number(item.members) || 0)}
                  </Text>
                </View>
                <View className="mt-4 flex-row items-center justify-center rounded-xl bg-[#e7f0ff] py-2.5">
                  <Plus size={16} color="#0866ff" />
                  <Text className="ml-1 text-sm font-extrabold text-[#0866ff]">
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
  }: {
    pages: PagesItem[];
    isLoading: boolean;
    copy: FeedCopy;
    onOpenPages: () => void;
    onOpenPage: (page: PagesItem) => void;
  }) {
    if (!isLoading && pages.length === 0) return null;

    const data: Array<PagesItem | string> =
      pages.length > 0 ? pages : PAGE_SKELETONS;

    return (
      <View className="mb-2 border-y border-[#e5e7eb] bg-white py-4">
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
            <Text className="text-sm font-bold text-[#0866ff]">
              {copy.seeAll}
            </Text>
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
                  <View className="mt-4 flex-row items-center justify-center rounded-xl bg-[#e7f0ff] py-2.5">
                    <Plus size={16} color="#0866ff" />
                    <Text className="ml-1 text-sm font-extrabold text-[#0866ff]">
                      {copy.viewPage}
                    </Text>
                  </View>
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
    prev.onOpenPage === next.onOpenPage,
);

function PostSkeleton() {
  // Pulse animation: opacity oscillates every 1.5s.
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.8, { duration: 750 }), -1, true);
  }, [opacity]);

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
  const language = useAppLanguage();
  const copy = FEED_COPY[language];
  const vm = useFeedViewModel();
  const feedSafeAreaInsets = useSafeAreaInsets();
  const {
    bottomContentPadding,
    scrollIndicatorBottomInset,
  } = useMainTabContentInsets();
  // Top-bar logo: FeedScreen only acts on the scroll-to-top event when it
  // is the currently focused tab. Declared up here so the hook order
  // matches the rest of FeedScreen (no conditional hooks below).
  const isFeedTabFocused = useIsFocused();
  const userVm = useCurrentUserViewModel();
  const feedPosts = vm.posts;
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
  const mainFeedListRef = useRef<FlatList>(null);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const pendingNewPostsRef = useRef<FeedPost[]>([]);
  const feedPostsRef = useRef<FeedPost[]>(feedPosts);
  const activeFeedSource = vm.feedSource;
  const activeFeedSourceRef = useRef<FeedSource | 'photos'>(activeFeedSource);
  const isFeedTabFocusedRef = useRef(isFeedTabFocused);
  const isFeedLoadingRef = useRef(vm.isLoading);
  const hasFeedLoadedOnceRef = useRef(vm.hasLoadedOnce);
  const isCheckingLatestPostsRef = useRef(false);

  useEffect(() => {
    isFeedTabFocusedRef.current = isFeedTabFocused;
    isFeedLoadingRef.current = vm.isLoading;
    hasFeedLoadedOnceRef.current = vm.hasLoadedOnce;
  }, [isFeedTabFocused, vm.hasLoadedOnce, vm.isLoading]);

  const enqueueNewPostCandidates = useCallback((
    posts: FeedPost[],
    options: { requireNewerThanFeedTop?: boolean } = {},
  ) => {
    if (posts.length === 0) return;

    const currentPosts = feedPostsRef.current;
    const visibleIds = new Set(feedPostsRef.current.map(item => item.id));
    const pendingIds = new Set(pendingNewPostsRef.current.map(item => item.id));
    const nextPosts = posts
      .filter(post => {
        if (!post?.id) return false;
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
  }, []);

  useEffect(() => {
    feedPostsRef.current = feedPosts;

    if (!hasNewPosts || pendingNewPostsRef.current.length === 0) return;

    const visibleIds = new Set(feedPosts.map(post => post.id));
    pendingNewPostsRef.current = pendingNewPostsRef.current.filter(
      post =>
        post?.id &&
        !visibleIds.has(post.id) &&
        isPostNewerThanFeedTop(post, feedPosts),
    );

    if (pendingNewPostsRef.current.length === 0) {
      setHasNewPosts(false);
    }
  }, [feedPosts, hasNewPosts]);

  const handleLoadNewPosts = useCallback(() => {
    mainFeedListRef.current?.scrollToOffset({ offset: 0, animated: true });
    const visibleIds = new Set(feedPostsRef.current.map(post => post.id));
    const pendingPosts = pendingNewPostsRef.current.filter(
      post => post?.id && !visibleIds.has(post.id),
    );

    pendingPosts.slice().reverse().forEach(post => {
      prependFeedPost(post);
    });
    pendingNewPostsRef.current = [];
    setHasNewPosts(false);
  }, [prependFeedPost]);

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
  const rawTopInset = feedSafeAreaInsets.top > 0
    ? feedSafeAreaInsets.top
    : (initialWindowMetrics?.insets?.top || (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 47));
  const topInset = getFeedChromeTopInset(rawTopInset);
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

  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const hasDragged = useSharedValue(false);

  // Viewport tracking & Autoplay logic for video cards.
  const activeVideoIdRef = useRef<string | null>(feedActiveVideoIdSnapshot);
  const pendingActiveVideoIdRef = useRef<string | null>(null);
  const latestViewableFeedItemsRef = useRef<any[]>([]);
  const feedListItemsRef = useRef<FeedListItem[]>([]);
  const feedListItemIndexByIdRef = useRef<Map<string, number>>(new Map());
  const prefetchedImageUrlsRef = useRef<Set<string>>(new Set());
  const queuedImagePrefetchUrlsRef = useRef<Set<string>>(new Set());
  const pendingImagePrefetchUrlsRef = useRef<string[]>([]);
  const imagePrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const feedVideoRefsRef = useRef(
    new Map<string, React.ElementRef<typeof View>>(),
  );
  const feedMeasureRequestRef = useRef(0);
  const feedScrollYRef = useRef(0);
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
    activeVideoIdRef.current = videoId;
    publishFeedActiveVideo(videoId);
  }, []);

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
            const fallbackVideoId =
              pickFeedVideoAutoplayCandidate({
                candidates,
                viewportHeight,
              }) ?? pickViewableFeedVideoId();

            if (commitImmediately || !isScrollingRef.current) {
              if (fallbackVideoId !== activeVideoIdRef.current) {
                setActiveFeedVideo(fallbackVideoId);
              }
              pendingActiveVideoIdRef.current = null;
              return;
            }

            pendingActiveVideoIdRef.current = fallbackVideoId;
          }
        });
      });
    },
    [pickViewableFeedVideoId, setActiveFeedVideo],
  );

  const handleFeedViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      feedViewportHeightRef.current = event.nativeEvent.layout.height;
      measureActiveFeedVideoOnScreen(!isScrollingRef.current);
    },
    [measureActiveFeedVideoOnScreen],
  );

  // Lightweight scroll pause: only track scrolling state for video
  // autoplay, do NOT null out activeVideoId (that causes expensive
  // unmount/remount of the video player â†’ jank).
  const beginScrollPause = useCallback(() => {
    isScrollingRef.current = true;
    setFeedScrollBusy(true);
    publishFeedScrollBusy(true);
    // Store the current video so onViewableItemsChanged can update
    // pendingActiveVideoIdRef while we scroll.
    pendingActiveVideoIdRef.current = activeVideoIdRef.current;
  }, [setFeedScrollBusy]);

  const endScrollPause = useCallback(() => {
    isScrollingRef.current = false;
    setFeedScrollBusy(false);
    publishFeedScrollBusy(false);
    // Commit whichever video became visible during the scroll.
    const pendingVideoId =
      pickViewableFeedVideoId() ?? pendingActiveVideoIdRef.current;
    pendingActiveVideoIdRef.current = null;
    if (pendingVideoId !== activeVideoIdRef.current) {
      setActiveFeedVideo(pendingVideoId);
    }
    measureActiveFeedVideoOnScreen(true);
  }, [
    measureActiveFeedVideoOnScreen,
    pickViewableFeedVideoId,
    setActiveFeedVideo,
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
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
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
      publishNativeTabScrollIntent(
        nativeTabScrollPublisherStateRef,
        currentY,
      );

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
        measureActiveFeedVideoOnScreen(true);
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
      measureActiveFeedVideoOnScreen(true);
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
    return () => {
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      supplementalInteractionRef.current?.cancel();
      supplementalLoadTimersRef.current.forEach(timer => clearTimeout(timer));
      supplementalLoadTimersRef.current = [];
      if (imagePrefetchTimerRef.current) {
        clearTimeout(imagePrefetchTimerRef.current);
        imagePrefetchTimerRef.current = null;
      }
      pendingImagePrefetchUrlsRef.current = [];
      queuedImagePrefetchUrlsRef.current.clear();
      activeVideoIdRef.current = null;
      publishFeedActiveVideo(null);
      publishFeedScrollBusy(false);
      publishNativeTabScrollBehavior('onScrollDown');
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        publishNativeTabScrollBehavior('onScrollDown');
      };
    }, []),
  );

  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused) {
      setActiveFeedVideo(null);
    } else {
      measureActiveFeedVideoOnScreen(true);
    }
  }, [isFocused, setActiveFeedVideo, measureActiveFeedVideoOnScreen]);

  // Subscribe to local post-created events and place them in the same
  // pending queue used by the remote latest-post probe.
  useEffect(() => {
    const unsubscribe = postCreatedEvents.subscribe(post => {
      enqueueNewPostCandidates([post]);
    });
    return unsubscribe;
  }, [enqueueNewPostCandidates]);

  const goToCreatePost = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_POST);
  }, [navigation]);

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

  // Stable ref-backed wrappers to prevent flatlist items re-rendering on feed action changes
  const openCommentsRef = useRef(commentVm.openComments);
  openCommentsRef.current = commentVm.openComments;
  const handleCommentTapStable = useCallback((postId: string) => {
    openCommentsRef.current(postId);
  }, []);

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
        id: `product-${product.id || index}`,
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
  const liveVm = useLiveViewModel({ autoLoad: false });
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
    const liveTimer = setTimeout(() => {
      runWhenScrollIdle(reloadLive);
    }, 1800);
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
      liveTimer,
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
    reloadLive,
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

      return {
        kind: 'job' as const,
        id: `job-${job.id || job.post_id || index}`,
        job,
        postedAt: timestamp,
        publisher: {
          id: String(job.page?.user_id || job.user_id || ''),
          name: pageName,
          username: job.page?.page_name || '',
          avatarUrl: job.page?.avatar || job.image,
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
  const [reactionsSheetPostId, setReactionsSheetPostId] = useState<string | null>(
    null,
  );

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

  const scheduleImagePrefetchFlush = useCallback(() => {
    if (imagePrefetchTimerRef.current) return;

    imagePrefetchTimerRef.current = setTimeout(() => {
      imagePrefetchTimerRef.current = null;
      const nextUrls = pendingImagePrefetchUrlsRef.current.splice(
        0,
        IMAGE_PREFETCH_BATCH_SIZE,
      );

      nextUrls.forEach(url => {
        queuedImagePrefetchUrlsRef.current.delete(url);
        Image.prefetch(url).catch(() => {
          prefetchedImageUrlsRef.current.delete(url);
        });
      });

      if (pendingImagePrefetchUrlsRef.current.length > 0) {
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
        if (item?.type !== 'post') continue;

        for (const url of collectFeedPostImageUrls(item.post)) {
          if (prefetchedImageUrlsRef.current.has(url)) continue;
          if (queuedImagePrefetchUrlsRef.current.has(url)) continue;

          prefetchedImageUrlsRef.current.add(url);
          queuedImagePrefetchUrlsRef.current.add(url);
          urlsToPrefetch.push(url);
          if (urlsToPrefetch.length >= MAX_IMAGE_PREFETCH_URLS) break;
        }

        if (urlsToPrefetch.length >= MAX_IMAGE_PREFETCH_URLS) break;
      }

      pendingImagePrefetchUrlsRef.current.push(...urlsToPrefetch);
      scheduleImagePrefetchFlush();
    },
    [scheduleImagePrefetchFlush],
  );

  const prefetchFeedImagesAroundVisibleItems = useCallback(
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

      prefetchFeedImagesInRange(
        furthestVisibleIndex - IMAGE_PREFETCH_BEHIND,
        furthestVisibleIndex + IMAGE_PREFETCH_LOOKAHEAD + 1,
      );
    },
    [prefetchFeedImagesInRange],
  );

  const maybeLoadMoreFeedAroundVisibleItems = useCallback((viewableItems: any[]) => {
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
  }, []);

  // Viewability config for FlatList autoplay
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 80,
  });

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      latestViewableFeedItemsRef.current = viewableItems;
      prefetchFeedImagesAroundVisibleItems(viewableItems);
      maybeLoadMoreFeedAroundVisibleItems(viewableItems);
      const update = getFeedVideoActiveUpdate({
        activeVideoId: activeVideoIdRef.current,
        isScrolling: isScrollingRef.current,
        viewableItems,
      });

      if (isScrollingRef.current) {
        pendingActiveVideoIdRef.current = update.pendingActiveVideoId;
        if (
          update.nextActiveVideoId !== undefined &&
          update.nextActiveVideoId !== activeVideoIdRef.current
        ) {
          setActiveFeedVideo(update.nextActiveVideoId);
        }
        return;
      }

      if (
        update.nextActiveVideoId !== undefined &&
        update.nextActiveVideoId !== activeVideoIdRef.current
      ) {
        setActiveFeedVideo(update.nextActiveVideoId);
      }
    },
    [
      maybeLoadMoreFeedAroundVisibleItems,
      prefetchFeedImagesAroundVisibleItems,
      setActiveFeedVideo,
    ],
  );

  // â”€â”€ Post menu state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [postMenuVisible, setPostMenuVisible] = useState(false);
  const [selectedPostForMenu, setSelectedPostForMenu] =
    useState<FeedPost | null>(null);

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
    async (postId: string) => {
      try {
        const result = await reportFeedPost?.(postId);
        if (result?.reported) {
          Alert.alert(copy.reportSentTitle, copy.reportSentMessage);
        } else {
          Alert.alert(copy.reportCancelledTitle, copy.reportCancelledMessage);
        }
      } catch {
        Alert.alert(copy.errorTitle, copy.reportErrorMessage);
      }
    },
    [copy, reportFeedPost],
  );

  const handleHidePost = useCallback(
    async (postId: string) => {
      try {
        await hideFeedPost?.(postId);
        Alert.alert('Thông báo', 'Đã ẩn bài viết thành công.');
      } catch {
        Alert.alert('Lỗi', 'Không thể ẩn bài viết lúc này.');
      }
    },
    [hideFeedPost],
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
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
    [deleteFeedPost],
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

  const ListFooterComponent = useMemo(() => {
    if (isFeedLoadingMore) {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#0866FF" />
        </View>
      );
    }
    return null;
  }, [isFeedLoadingMore]);

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
    const items: FeedListItem[] = mergedPosts.map(post => ({
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

    return items;
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
        ? ([{ type: 'intro', id: 'feed-intro' }, ...feedListItems] as FeedListItem[])
        : feedListItems;

    feedListItemsRef.current = renderedItems;
    feedListItemIndexByIdRef.current = new Map(
      renderedItems.map((item, index) => [item.id, index]),
    );
    prefetchFeedImagesInRange(0, INITIAL_IMAGE_PREFETCH_ITEMS);
    prefetchFeedImagesAroundVisibleItems(latestViewableFeedItemsRef.current);
  }, [
    feedListItems,
    prefetchFeedImagesAroundVisibleItems,
    prefetchFeedImagesInRange,
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
  }, [feedListItems, setActiveFeedVideo]);

  // â”€â”€ Smart image prefetch â€” only the next ~10 upcoming items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Image prefetching is driven by FlatList viewability above so upcoming
  // media enters cache before scroll.
  // Separate memoized render functions for each type - prevents full re-render
  const renderVideoPost = useCallback(
    ({ item }: { item: FeedVideoPost }) => (
      <View ref={node => setFeedVideoRef(item.id, node)}>
        <HomeVideoPostCard
          key={item.id}
          post={item}
          copy={copy}
          onReact={handleToggleReactionStable}
          onOpenPicker={handleOpenPicker}
          onCommentTap={handleCommentTapStable}
          onShare={handleOpenSharePost}
          onOpenReactions={openReactionsSheet}
          navigateToProfile={navigateToProfile}
          onOpenPostMenu={handleOpenPostMenu}
          isScreenFocused={isFeedTabFocused}
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
        key={item.id}
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
        key={item.id}
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
        key={item.id}
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
        key={item.id}
        post={item}
        language={language}
        onVote={voteFeedPoll}
        onReact={toggleFeedReaction}
        onOpenPicker={handleOpenPicker}
        onCommentTap={commentVm.openComments}
        onShare={handleOpenSharePost}
        onProfilePress={navigateToProfile}
        onMorePress={handleOpenPostMenu}
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
      <FeedAdPostCard key={item.id} post={item} copy={copy} />
    ),
    [copy],
  );

  const renderJobPost = useCallback(
    ({ item }: { item: FeedJobPost }) => (
      <FeedJobPostCard
        key={item.id}
        post={item}
        copy={copy}
        onPress={handleJobPress}
      />
    ),
    [copy, handleJobPress],
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
      />
    ),
    [copy, handleOpenPage, handleOpenPages],
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
      <FeedLivePostCard item={item.item} copy={copy} onPress={handleOpenLive} />
    ),
    [copy, handleOpenLive],
  );

  const renderFeedIntro = useCallback(
    () => (
      <View>
        <HomeFeedIntro
          onCreatePostPress={goToCreatePost}
          userId={userVm.user?.userId}
          avatarUrl={userVm.user?.avatar}
          userName={userVm.user?.name}
          copy={copy}
        />
      </View>
    ),
    [
      copy,
      goToCreatePost,
      userVm.user?.userId,
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

  const androidListHeaderComponent = useMemo(
    () => renderFeedIntro(),
    [renderFeedIntro],
  );

  const iosFeedListItems = useMemo<FeedListItem[]>(
    () => [{ type: 'intro', id: 'feed-intro' }, ...feedListItems],
    [feedListItems],
  );

  const feedListElement = (
    <FlatList
      ref={mainFeedListRef}
      data={Platform.OS === 'ios' ? iosFeedListItems : feedListItems}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      extraData={language}
      initialNumToRender={FEED_LIST_INITIAL_RENDER_COUNT}
      maxToRenderPerBatch={FEED_LIST_RENDER_BATCH_SIZE}
      updateCellsBatchingPeriod={FEED_LIST_BATCHING_PERIOD_MS}
      windowSize={FEED_LIST_WINDOW_SIZE}
      removeClippedSubviews={Platform.OS === 'android'}
      ListHeaderComponent={
        Platform.OS === 'ios' ? undefined : androidListHeaderComponent
      }
      decelerationRate="normal"
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      onLayout={handleFeedViewportLayout}
      scrollEventThrottle={16}
      onScroll={handleFeedScroll}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfigRef.current}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      onMomentumScrollBegin={handleMomentumScrollBegin}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.75}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={feedListContentStyle}
      scrollIndicatorInsets={
        Platform.OS === 'ios'
          ? { bottom: scrollIndicatorBottomInset }
          : undefined
      }
      refreshControl={
        <RefreshControl
          refreshing={
            vm.isRefreshing ||
            productsVm.isRefreshing ||
            eventsVm.isRefreshing ||
            jobsVm.isRefreshing ||
            groupsVm.isRefreshing ||
            pagesVm.isRefreshing ||
            liveVm.isRefreshing
          }
          onRefresh={handleRefresh}
          tintColor="#0866FF"
          progressViewOffset={feedRefreshProgressViewOffset}
        />
      }
      ListEmptyComponent={
        vm.isLoading ? (
          <View>
            {[1, 2, 3].map(i => (
              <PostSkeleton key={i} />
            ))}
          </View>
        ) : null
      }
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
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={false}
        />
        {Platform.OS === 'ios' ? (
          <>
            {hasNewPosts && (
              <TouchableOpacity
                onPress={handleLoadNewPosts}
                activeOpacity={0.9}
                style={{ top: newPostsButtonTop }}
                className="absolute self-center z-[999] flex-row items-center bg-blue-600 px-4 py-2.5 rounded-full shadow-lg border border-blue-500"
              >
                <ArrowUp size={14} color="#ffffff" className="mr-1.5" />
                <Text className="text-white text-xs font-bold">Có bài đăng mới</Text>
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
              <FeedHeader />
              <FilterTabs
                copy={copy}
                activeSource={activeFeedSource}
                onChangeSource={setActiveFeedSource}
              />
            </FeedHeaderCollapseFrame>
            {hasNewPosts && (
              <TouchableOpacity
                onPress={handleLoadNewPosts}
                activeOpacity={0.9}
                style={{ top: newPostsButtonTop }}
                className="absolute self-center z-[999] flex-row items-center bg-blue-600 px-4 py-2.5 rounded-full shadow-lg border border-blue-500"
              >
                <ArrowUp size={14} color="#ffffff" className="mr-1.5" />
                <Text className="text-white text-xs font-bold">Có bài đăng mới</Text>
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
          onCommentTap={handleCommentTapStable}
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
          onSetReaction={commentVm.setCommentReaction}
          onDelete={commentVm.deleteComment}
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
          onSave={handleSavePost}
          onHide={handleHidePost}
          onDelete={handleDeletePost}
          onReport={handleReportPost}
        />
        {/* â”€â”€ Toast Notification â”€â”€ */}
        <ToastContainer />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

export default FeedScreen;
