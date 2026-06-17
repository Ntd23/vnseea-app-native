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
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  KeyboardAvoidingView,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  InteractionManager,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ImageProps,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import VideoPlayer from 'react-native-video';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
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
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  Briefcase,
  Building2,
  ChevronRight,
  Globe,
  HeartHandshake,
  Lock,
  MapPin,
  MessageCircle,
  Megaphone,
  MoreHorizontal,
  Plus,
  Radio,
  Search,
  Send,
  Share2,
  ShoppingBag,
  ThumbsUp,
  Users,
  X,
} from 'lucide-react-native';
import { PostMenuActionSheet } from '../../../shared-kernel/presentation/components/PostMenuActionSheet';
import { tabBarVisibility } from '../../../navigation/tabBarVisibility';
import { ReelCommentsSheet } from '../../../reels/presentation/components/ReelCommentsSheet';
import { FeedShareBottomSheet } from '../components/FeedShareBottomSheet';
import { createProfileRepository } from '../../../profile/infrastructure/repositories/ApiProfileRepository';
import type {
  ReactionType,
  ReelComment,
} from '../../../reels/domain/types/reels.types';
import { ALL_REACTION_TYPES } from '../../../reels/domain/types/reels.types';

// â”€â”€ Facebook-style reaction lookup tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Same shape we use in the comments sheet, kept local here so the feed
// module stays self-contained (no shared "design tokens" file yet).

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

// Floating picker pill geometry â€” used to clamp X within the viewport.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { RootStackParamList } from '../../../navigation/types';
import type { RootStackRouteName } from '../../../navigation/types';
import CreateActionSheet from '../../../shared-kernel/presentation/components/CreateActionSheet';
import { useAuthBranding } from '../../../auth/application/view-models/useAuthBranding';
import { useFeedViewModel } from '../../application/view-models/useFeedViewModel';
import { postCreatedEvents } from '../../application/events/postCreatedEvents';
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
  FeedShareDestination,
  FeedSource,
  SharePostInput,
} from '../../domain/repositories/FeedRepository';
import { useFeedCommentsViewModel } from '../../application/view-models/useFeedCommentsViewModel';
import {
  storyCreatedEvents,
  storyDeletedEvents,
  useStoriesViewModel,
} from '../../../stories';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import { useUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { ProductPostCard } from '../../../product/presentation/components/ProductPostCard';
import { useProductsOnFeedViewModel } from '../../../product/application/view-models/useProductsOnFeedViewModel';
import type { ProductItem } from '../../../product/domain/types/product.types';
import { PollPostCard } from '../components/PollPostCard';
import { ComposerCard } from '../components/ComposerCard';
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
import { useMyGroupsViewModel } from '../../../community';
import { useSuggestedGroupsOnFeedViewModel } from '../../../community/application/view-models/useSuggestedGroupsOnFeedViewModel';
import { ToastContainer } from '../../../shared-kernel/presentation/components/ToastNotification';
import { AudioPlayer } from '../../../shared-kernel/presentation/components/AudioPlayer';
import { useLiveViewModel } from '../../../live/application/view-models/useLiveViewModel';
import type { LiveStreamItem } from '../../../live/domain/types/live.types';
import { useMyPagesViewModel, usePagesOnFeedViewModel } from '../../../pages';
import type { PagesItem } from '../../../pages/domain/types/pages.types';
import {
  useFundingOnFeedViewModel,
  FeedFundingCarousel,
} from '../../../funding';
import type { FundingItem } from '../../../funding/domain/types/funding.types';
import { ROOT_SAFE_AREA_EDGES } from '../../../shared-kernel/presentation/utils/safeAreaEdges';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

const PICKER_WIDTH = 282;
const PICKER_HEIGHT = 52;
const PICKER_GAP = 8;
const VIDEO_BUFFER_CONFIG = {
  minBufferMs: 2500,
  maxBufferMs: 5000,
  bufferForPlaybackMs: 500,
  bufferForPlaybackAfterRebufferMs: 2000,
};
const LOAD_MORE_THROTTLE_MS = 800;
const SUPPLEMENTAL_LOAD_MORE_THROTTLE_MS = 2500;
const IMAGE_PREFETCH_LOOKAHEAD = 5;
const MAX_IMAGE_PREFETCH_URLS = 8;
const FEED_SCREEN_WIDTH = Dimensions.get('window').width;
const FEED_CARD_WIDTH = FEED_SCREEN_WIDTH;
const FEED_PHOTO_GRID_WIDTH = FEED_CARD_WIDTH - 8;
const FEED_CARD_CLASS = 'mb-2 border-y border-[#dddfe2] bg-white';
const FEED_CARD_PADDING_CLASS = 'px-3 py-3';
const FEED_MEDIA_CLASS = 'w-full bg-black';
const FEED_LIST_CONTENT_STYLE = {
  paddingBottom: Platform.OS === 'ios' ? 24 : 96,
};

// â”€â”€ Pre-computed photo grid layouts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Static layout objects for the Facebook-style photo grid. Computed once at
// module level so TextPostCard never allocates new style objects per-render.
const PHOTO_GRID_LAYOUTS = {
  single: { width: FEED_PHOTO_GRID_WIDTH, height: FEED_PHOTO_GRID_WIDTH / 1.4 },
  duoItem: {
    width: FEED_PHOTO_GRID_WIDTH / 2,
    height: FEED_PHOTO_GRID_WIDTH / 2,
  },
  triHero: {
    width: FEED_PHOTO_GRID_WIDTH,
    height: FEED_PHOTO_GRID_WIDTH / 1.6,
  },
  triItem: {
    width: FEED_PHOTO_GRID_WIDTH / 2,
    height: FEED_PHOTO_GRID_WIDTH / 2,
  },
  quadItem: {
    width: FEED_PHOTO_GRID_WIDTH / 2,
    height: FEED_PHOTO_GRID_WIDTH / 2,
  },
};
const PHOTO_GRID_ITEM_PADDING = { padding: 2 };

function getPhotoLayout(index: number, total: number) {
  if (total === 1) return PHOTO_GRID_LAYOUTS.single;
  if (total === 2) return PHOTO_GRID_LAYOUTS.duoItem;
  if (total === 3)
    return index === 0
      ? PHOTO_GRID_LAYOUTS.triHero
      : PHOTO_GRID_LAYOUTS.triItem;
  return PHOTO_GRID_LAYOUTS.quadItem;
}

type FeedNav = NativeStackNavigationProp<RootStackParamList>;

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

function FeedHeader() {
  const navigation = useNavigation<FeedNav>();
  const { messageCount } = useUnreadBadgeCounts();
  const { logoUrl, imageErrorCount, notifyImageError } = useAuthBranding();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [buttonRotation, setButtonRotation] = useState('0deg');

  const handleOpenSheet = useCallback(() => {
    setSheetVisible(true);
    setButtonRotation('45deg');
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false);
    setButtonRotation('0deg');
  }, []);

  const handleCreateNavigate = useCallback(
    (route: RootStackRouteName) => {
      if (route === ROUTES.CREATE_EVENT) navigation.navigate(ROUTES.CREATE_EVENT);
      if (route === ROUTES.CREATE_PRODUCT) navigation.navigate(ROUTES.CREATE_PRODUCT);
      if (route === ROUTES.CREATE_PAGE) navigation.navigate(ROUTES.CREATE_PAGE);
      if (route === ROUTES.CREATE_GROUP) navigation.navigate(ROUTES.CREATE_GROUP);
      if (route === ROUTES.CREATE_REEL) navigation.navigate(ROUTES.CREATE_REEL);
      if (route === ROUTES.CREATE_POST) navigation.navigate(ROUTES.CREATE_POST);
      if (route === ROUTES.CREATE_STORY) navigation.navigate(ROUTES.CREATE_STORY);
      if (route === ROUTES.CREATE_POLL) navigation.navigate(ROUTES.CREATE_POLL);
      if (route === ROUTES.CREATE_ALBUM) navigation.navigate(ROUTES.CREATE_ALBUM);
      if (route === ROUTES.CREATE_AD) navigation.navigate(ROUTES.CREATE_AD);
    },
    [navigation],
  );

  return (
    <>
      <View
        className="surface-topbar flex-row items-center justify-between px-4"
        style={{
          height: 64,
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
          backgroundColor: '#ffffff',
        }}
      >
        <View className="flex-row items-center">
          {logoUrl && imageErrorCount === 0 ? (
            <View
              style={{
                backgroundColor: '#002fff',
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 5,
                height: 36,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Image
                source={{ uri: logoUrl }}
                style={{ width: 105, height: '100%' }}
                resizeMode="contain"
                onError={notifyImageError}
              />
            </View>
          ) : (
            <Text
              style={{
                fontSize: 26,
                fontWeight: '900',
                color: '#002fff',
                letterSpacing: 0.5,
              }}
            >
              VNSEEA
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate(ROUTES.SEARCH)}
            style={feedHeaderIconStyle}
          >
            <Search size={20} color="#002fff" strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleOpenSheet}
            style={[feedHeaderIconStyle, { transform: [{ rotate: buttonRotation }] }]}
          >
            <Plus size={22} color="#002fff" strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate(ROUTES.MESSAGES)}
            style={[feedHeaderIconStyle, { position: 'relative' }]}
          >
            <MessageCircle size={20} color="#002fff" strokeWidth={2.5} />
            {messageCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: '#002fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>
                  {messageCount > 99 ? '99+' : messageCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
      <CreateActionSheet
        visible={sheetVisible}
        onClose={handleCloseSheet}
        onNavigate={handleCreateNavigate}
      />
    </>
  );
}

const feedHeaderIconStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#ffffff',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 2,
};

function FilterTabs({
  copy,
  activeSource,
  onChangeSource,
}: {
  copy: FeedCopy;
  activeSource: FeedSource;
  onChangeSource: (source: FeedSource) => void;
}) {
  return (
    <View className="border-b border-[#dddfe2] bg-white px-4 pt-2.5">
      <View className="flex-row items-end justify-between">
        {copy.filters.map(filter => {
          const active = filter.source === activeSource;
          return (
            <TouchableOpacity
              key={filter.source}
              className="min-h-[38px] flex-1 items-center justify-center"
              activeOpacity={0.8}
              onPress={() => onChangeSource(filter.source)}
            >
              <Text
                className={`text-[15px] font-extrabold ${
                  active ? 'text-[#0000ff]' : 'text-title-secondary'
                }`}
              >
                {filter.label}
              </Text>
              <View
                className={`mt-2.5 h-[3px] w-16 rounded-full ${
                  active ? 'bg-[#0000ff]' : 'bg-transparent'
                }`}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function StoriesRow({ avatarUrl, copy }: { avatarUrl?: string; copy: FeedCopy }) {
  const navigation = useNavigation<FeedNav>();
  const vm = useStoriesViewModel();
  const prependStory = vm.prependStory;
  const removeStoryLocal = vm.removeStoryLocal;

  useEffect(() => {
    const unsubCreated = storyCreatedEvents.subscribe(story => {
      prependStory(story);
    });
    const unsubDeleted = storyDeletedEvents.subscribe(storyId => {
      removeStoryLocal(storyId);
    });
    return () => {
      unsubCreated();
      unsubDeleted();
    };
  }, [prependStory, removeStoryLocal]);

  const goToCreateStory = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_STORY);
  }, [navigation]);

  const goToViewerForGroup = useCallback(
    (index: number) => {
      navigation.navigate(ROUTES.STORY_VIEWER, {
        stories: vm.stories,
        initialUserIndex: index,
      });
    },
    [navigation, vm.stories],
  );

  return (
    <View className="mb-4 bg-white pb-1.5 pt-0.5">
      <View className="mb-2.5 flex-row items-center justify-between px-4">
        <Text className="text-[18px] font-extrabold text-[#050505]">
          {copy.storiesTitle}
        </Text>
        <TouchableOpacity activeOpacity={0.8}>
          <View className="flex-row items-center">
            <Text className="text-[14px] font-extrabold text-[#0866ff]">
              {copy.seeAll}
            </Text>
            <ChevronRight size={18} color="#0866ff" />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 px-4"
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={goToCreateStory}
          className="h-44 w-28 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white"
        >
          <Image
            source={{ uri: avatarUrl ?? images.me }}
            className="h-24 w-full"
            resizeMode="cover"
            fadeDuration={0}
          />
          <View className="flex-1 items-center justify-center bg-white px-2 pb-1.5">
            <View className="absolute -top-[18px] h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#0866ff]">
              <Plus size={20} color="#FFFFFF" />
            </View>
            <Text className="mt-4 text-center text-[13px] font-extrabold text-[#050505]">
              {copy.createStory}
            </Text>
            <Text
              className="mt-0.5 text-center text-[10px] font-semibold leading-4 text-[#667085]"
              numberOfLines={1}
            >
              {copy.createStorySubtitle}
            </Text>
          </View>
        </TouchableOpacity>

        {vm.stories.map((story, index) => {
          const hasUnseen = story.hasUnseen && !story.isViewed;

          return (
            <TouchableOpacity
              key={story.publisher.userId}
              activeOpacity={0.85}
              onPress={() => goToViewerForGroup(index)}
              className={`h-44 w-28 overflow-hidden rounded-2xl ${
                hasUnseen ? '' : 'opacity-80'
              }`}
            >
              <Image
                source={{ uri: story.thumbnailUrl ?? story.publisher.avatarUrl }}
                className="h-full w-full"
                resizeMode="cover"
                fadeDuration={0}
              />
              <View className="absolute inset-0 bg-black/25" />
              <View className="absolute bottom-0 left-0 right-0 h-24 bg-black/35" />
              <View
                className={`absolute left-2 top-2 h-8 w-8 overflow-hidden rounded-full border-2 ${
                  hasUnseen ? 'border-white' : 'border-slate-200'
                } bg-white p-0.5`}
              >
                <Image
                  source={{ uri: story.publisher.avatarUrl }}
                  className="h-full w-full rounded-full"
                  resizeMode="cover"
                  fadeDuration={0}
                />
                {story.media.length > 1 ? (
                  <View className="absolute -bottom-2 -right-2 flex h-4 items-center justify-center rounded-full bg-blue-600 px-1">
                    <Text className="text-[9px] font-bold text-white">
                      {story.media.length}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                className="absolute bottom-3 left-2 right-2 text-[12px] font-extrabold text-white"
                numberOfLines={1}
              >
                {story.publisher.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function GreetingCard({
  userName,
  copy,
}: {
  userName?: string;
  copy: FeedCopy;
}) {
  const displayName = userName || copy.userFallback;
  const isVi = copy.publicLabel === 'Công khai';

  const hour = new Date().getHours();
  let title = '';
  let body = '';
  let emoji = '\uD83C\uDF05';

  if (hour >= 5 && hour < 12) {
    title = isVi
      ? `Chào buổi sáng, ${displayName}`
      : `Good morning, ${displayName}`;
    body = isVi
      ? 'Chào ngày mới! Chúc bạn có một ngày tràn đầy năng lượng và làm việc hiệu quả.'
      : 'Good morning! Wishing you a day full of energy and great productivity.';
    emoji = '\u2600\uFE0F';
  } else if (hour >= 12 && hour < 18) {
    title = isVi
      ? `Chào buổi chiều, ${displayName}`
      : `Good afternoon, ${displayName}`;
    body = isVi
      ? 'Chúc bạn có một buổi chiều suôn sẻ, tràn ngập niềm vui và năng lượng.'
      : 'Hope your afternoon is going productive, smooth, and full of joy!';
    emoji = '\uD83C\uDF24\uFE0F';
  } else {
    title = isVi
      ? `Chào buổi tối, ${displayName}`
      : `Good evening, ${displayName}`;
    body = isVi
      ? 'Buổi tối ấm áp! Hãy thư giãn và tận hưởng những phút giây bình yên của ngày.'
      : 'Evening is life saying you are getting closer to your dreams.';
    emoji = '\uD83C\uDF07';
  }

  return (
    <View className="mx-4 mb-4 flex-row items-center justify-between overflow-hidden rounded-2xl border border-[#dfe7ff] bg-[#eef4ff] px-4 py-3.5">
      <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white">
        <Text className="text-2xl">{'\uD83D\uDC4B'}</Text>
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-[17px] font-extrabold text-[#050505]">
          {title}
        </Text>
        <Text className="mt-1.5 text-[13px] font-semibold leading-5 text-[#667085]">
          {body}
        </Text>
      </View>
      <Text className="text-3xl">{emoji}</Text>
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

type FeedShareTarget = FeedShareDestination | 'message';

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
    <View className={FEED_CARD_CLASS}>
      <View className={FEED_CARD_PADDING_CLASS}>
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
      </View>

      {!!post.mediaUrl && (
        <TouchableOpacity
          activeOpacity={post.targetUrl ? 0.88 : 1}
          onPress={handlePress}
          className="h-56 w-full bg-slate-100"
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
      )}

      <View className="flex-row items-center justify-between border-t border-[#dddfe2] px-3 py-3">
        <View className="mr-4 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-[0.4px] text-[#64748b]">
            {copy.ad}
          </Text>
          <Text className="mt-0.5 text-sm text-[#64748b]" numberOfLines={1}>
            {post.targetUrl || copy.sponsoredContent}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={!post.targetUrl}
          onPress={handlePress}
          className="rounded-lg bg-[#e7f0ff] px-4 py-2"
        >
          <Text className="text-sm font-bold text-[#0866ff]">
            {copy.learnMore}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handlePress}
        className={FEED_CARD_CLASS}
      >
        <View className={FEED_CARD_PADDING_CLASS}>
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
        </View>

        <View className="relative h-52 bg-[#0f172a]">
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
        </View>

        <View className={FEED_CARD_PADDING_CLASS}>
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
        </View>
      </TouchableOpacity>
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
    <TouchableOpacity
      className={FEED_CARD_CLASS}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      <View className={FEED_CARD_PADDING_CLASS}>
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
      </View>

      {!!cover && (
        <FeedMediaImage
          uri={cover}
          className="h-44 w-full bg-slate-100"
          resizeMode="cover"
        />
      )}

      <View className="flex-row items-center justify-between border-t border-[#dddfe2] px-3 py-3">
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
      </View>
    </TouchableOpacity>
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

// Background colors for each reaction type's circular badge (FB-style)
const REACTION_BADGE_BG: Record<ReactionType, string> = {
  like: '#0866FF',
  love: '#F33E58',
  haha: '#F7B125',
  wow: '#F7B125',
  sad: '#F7B125',
  angry: '#E9710F',
};

// â”€â”€ Photo Viewer Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Full-screen Facebook-style photo viewer: black bg, swipe left/right,
// page counter, caption overlay, publisher info + reaction counts at bottom.

export type PhotoViewerState = {
  post: FeedTextPost;
  initialIndex: number;
} | null;

const PHOTO_VIEWER_IMAGE_HEIGHT_RATIO = 0.62;
const PHOTO_VIEWER_COMMENT_OPEN_DELAY_MS = 180;

const PhotoViewerImage = React.memo(function PhotoViewerImage({
  url,
  width,
  height,
}: {
  url: string;
  width: number;
  height: number;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setShowSpinner(false);

    // Only show spinner if the image takes longer than 150ms to load
    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [url]);

  return (
    <View
      style={{
        width,
        height,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {!isLoaded && !hasError && showSpinner ? (
        <ActivityIndicator
          color="#FFFFFF"
          size="small"
          style={{ position: 'absolute' }}
        />
      ) : null}
      {hasError ? (
        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
          Không tải được ảnh
        </Text>
      ) : (
        <Image
          source={{ uri: url }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
          fadeDuration={0}
          resizeMethod="resize"
          progressiveRenderingEnabled
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
        />
      )}
    </View>
  );
});

export function PhotoViewerModal({
  state,
  copy = FEED_COPY.vi,
  onClose,
  onReact,
  onCommentTap,
  posts,
}: {
  state: PhotoViewerState;
  copy?: FeedCopy;
  onClose: () => void;
  onReact: (postId: string, reaction: ReactionType) => void;
  onCommentTap: (postId: string) => void;
  posts: FeedPost[];
}) {
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const [pickerAnchor, setPickerAnchor] = useState<{
    postId: string;
    x: number;
    y: number;
  } | null>(null);
  const [isFollowedLocally, setIsFollowedLocally] = useState<
    boolean | undefined
  >(undefined);

  const localGestureX = useSharedValue(0);
  const localGestureY = useSharedValue(0);
  const localGestureActive = useSharedValue(false);
  const localHasDragged = useSharedValue(false);

  const translateY = useSharedValue(0);

  // Sync page on mount. Previously we also ran a 200ms fade-in + scale-up
  // via `openProgress` Reanimated value â€” that delayed the FIRST FRAME
  // the user saw the photo. v3: open instantly (opacity 1, scale 1) and
  // only animate when the user actively drags the modal down to dismiss.
  useEffect(() => {
    if (state) {
      setCurrentIndex(state.initialIndex);
      translateY.value = 0;
    }
  }, [state, translateY]);

  const livePost = useMemo(() => {
    if (!state) return null;
    const { post } = state;
    return (posts.find(p => p.id === post.id) as FeedTextPost) || post;
  }, [state, posts]);

  // Sync follow state locally
  useEffect(() => {
    if (livePost) {
      setIsFollowedLocally(livePost.publisher.isFollowing);
    }
  }, [livePost?.publisher.isFollowing, livePost?.id]);

  const handleLocalPickReaction = useCallback(
    (reaction: ReactionType) => {
      if (!livePost) return;
      onReact(livePost.id, reaction);
      setPickerAnchor(null);
    },
    [livePost, onReact],
  );

  const handleLikeLongPress = useCallback(
    (isQuickLike: boolean) => {
      if (!livePost) return;
      const x = isQuickLike ? SCREEN_W - 40 : 60;
      const y = SCREEN_H - 110;
      setPickerAnchor({ postId: livePost.id, x, y });
    },
    [livePost, SCREEN_W, SCREEN_H],
  );

  const handleFollowPress = useCallback(async () => {
    if (!livePost || isFollowedLocally) return;
    setIsFollowedLocally(true);
    try {
      const profileRepo = createProfileRepository();
      await profileRepo.toggleFollow(livePost.publisher.id);
    } catch {
      setIsFollowedLocally(false);
    }
  }, [livePost, isFollowedLocally]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleCommentPress = useCallback(() => {
    if (!livePost) return;
    const postId = livePost.id;
    setPickerAnchor(null);
    onClose();
    setTimeout(() => {
      onCommentTap(postId);
    }, PHOTO_VIEWER_COMMENT_OPEN_DELAY_MS);
  }, [livePost, onClose, onCommentTap]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-10, 10])
    .onUpdate(event => {
      'worklet';
      translateY.value = event.translationY;
    })
    .onEnd(event => {
      'worklet';
      if (event.translationY > 100 || event.velocityY > 500) {
        // Slide off screen downwards
        translateY.value = withTiming(SCREEN_H, { duration: 180 }, () => {
          runOnJS(onClose)();
        });
      } else {
        // Snap back to center
        translateY.value = withSpring(0, { damping: 15 });
      }
    });

  const containerStyle = useAnimatedStyle(() => {
    const dragProgress = interpolate(
      Math.abs(translateY.value),
      [0, SCREEN_H * 0.5],
      [1, 0],
      Extrapolation.CLAMP,
    );
    // Clamp to prevent floating-point underflow producing invalid rgba values
    const finalOpacity = Math.max(0, Math.min(1, dragProgress));
    return {
      flex: 1,
      backgroundColor: `rgba(0, 0, 0, ${finalOpacity})`,
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    const dragScale = interpolate(
      Math.abs(translateY.value),
      [0, SCREEN_H * 0.5],
      [1, 0.8],
      Extrapolation.CLAMP,
    );
    return {
      flex: 1,
      transform: [{ translateY: translateY.value }, { scale: dragScale }],
      opacity: 1,
    };
  });

  if (!state || !livePost) return null;
  const { post } = state;
  const total = post.photos.length;

  return (
    <Modal
      visible
      transparent
      animationType="none" // Use custom JS animated transitions instead of raw fade
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <FocusAwareStatusBar barStyle="light-content" backgroundColor="#000" translucent />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={containerStyle}>
            <Animated.View style={[contentStyle, { flex: 1 }]}>
              {/* â”€â”€ Top bar: page counter (left) + close button (right) â”€â”€ */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 30,
                  paddingTop: Math.max(insets.top, 16) + 6,
                  paddingHorizontal: 16,
                }}
              >
                {/* 1. Progress line at top */}
                {total > 1 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      marginBottom: 16,
                    }}
                  >
                    {Array.from({ length: total }).map((_, i) => (
                      <View
                        key={`progress-segment-${i}`}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2.5,
                          backgroundColor:
                            i === currentIndex
                              ? '#ffffff'
                              : 'rgba(255, 255, 255, 0.25)',
                          marginHorizontal: 2,
                        }}
                      />
                    ))}
                  </View>
                )}

                {/* 2. Counter & Close button row */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      color: '#ffffff',
                      fontSize: 16,
                      fontWeight: '700',
                    }}
                  >
                    {total > 1 ? `${currentIndex + 1} / ${total}` : '1 / 1'}
                  </Text>

                  {/* Plain RN-core Pressable so the surrounding Pan gesture
                      can never swallow the tap. */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="close"
                    onPress={handleClose}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: 'rgba(0, 0, 0, 0.45)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={20} color="#ffffff" />
                  </Pressable>
                </View>
              </View>

              {/* â”€â”€ Horizontally paginated photo list â”€â”€ */}
              <FlatList
                ref={flatListRef}
                data={post.photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={state.initialIndex}
                getItemLayout={(_, index) => ({
                  length: SCREEN_W,
                  offset: SCREEN_W * index,
                  index,
                })}
                windowSize={3}
                initialNumToRender={1}
                maxToRenderPerBatch={1}
                removeClippedSubviews={Platform.OS === 'android'}
                onScrollToIndexFailed={info => {
                  setTimeout(() => {
                    flatListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: false,
                    });
                  }, 100);
                }}
                onMomentumScrollEnd={e => {
                  const idx = Math.round(
                    e.nativeEvent.contentOffset.x / SCREEN_W,
                  );
                  setCurrentIndex(idx);
                }}
                keyExtractor={(url, i) => `viewer-${i}-${url}`}
                renderItem={({ item: url }) => (
                  <PhotoViewerImage
                    url={url}
                    width={SCREEN_W}
                    height={SCREEN_H}
                  />
                )}
              />

              {/* â”€â”€ Bottom overlay: publisher + reaction counts â”€â”€ */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: '#1E1B1B',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingHorizontal: 16,
                  paddingTop: 10,
                  paddingBottom: Math.max(insets.bottom, 16) + 12,
                }}
              >
                {/* Grab handle */}
                <View
                  style={{
                    width: 44,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    alignSelf: 'center',
                    marginBottom: 16,
                  }}
                />

                {/* Caption text */}
                {livePost.caption ? (
                  <Text
                    style={{
                      color: '#ffffff',
                      fontSize: 15,
                      lineHeight: 22,
                      marginBottom: 16,
                    }}
                    numberOfLines={4}
                  >
                    {livePost.caption}
                  </Text>
                ) : null}

                {/* Publisher row */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flex: 1,
                    }}
                  >
                    {livePost.publisher.avatarUrl ? (
                      <Image
                        source={{ uri: livePost.publisher.avatarUrl }}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          marginRight: 10,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: '#555',
                          marginRight: 10,
                        }}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: 15,
                        }}
                        numberOfLines={1}
                      >
                        {livePost.publisher.name}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: 2,
                        }}
                      >
                        <Text
                          style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          {formatPostTime(
                            livePost.postedAt,
                            copy,
                          ).toUpperCase()}
                        </Text>
                        <Text
                          style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: 12,
                            marginHorizontal: 4,
                          }}
                        >
                          {'\u2022'}
                        </Text>
                        <Globe size={11} color="rgba(255, 255, 255, 0.5)" />
                      </View>
                    </View>
                  </View>

                  {/* Follow button only shown when not own post and not followed yet */}
                  {(() => {
                    const currentUserId = sessionStorage.getSession()?.userId;
                    const showFollowButton =
                      livePost.publisher.id !== currentUserId &&
                      !isFollowedLocally;
                    if (!showFollowButton) return null;
                    return (
                      <GHTouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleFollowPress}
                        style={{
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                          borderRadius: 20,
                          paddingHorizontal: 16,
                          paddingVertical: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: '#ffffff',
                            fontSize: 13,
                            fontWeight: '600',
                          }}
                        >
                          {language === 'vi' ? 'Theo dĂµi' : 'Follow'}
                        </Text>
                      </GHTouchableOpacity>
                    );
                  })()}
                </View>

                {/* Actions row */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Left: Like, Comment, Share capsules */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {/* Like Capsule */}
                    <GHTouchableOpacity
                      onPress={() => onReact(livePost.id, 'like')}
                      onLongPress={() => handleLikeLongPress(false)}
                      delayLongPress={400}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                      }}
                    >
                      {livePost.myReaction ? (
                        <Image
                          source={REACTION_IMAGES[livePost.myReaction]}
                          style={{ width: 18, height: 18 }}
                          resizeMode="contain"
                        />
                      ) : (
                        <ThumbsUp size={18} color="#ffffff" />
                      )}
                      <Text
                        style={{
                          color: '#ffffff',
                          marginLeft: 6,
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        {livePost.likeCount}
                      </Text>
                    </GHTouchableOpacity>

                    {/* Comment Capsule */}
                    <GHTouchableOpacity
                      onPress={handleCommentPress}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                      }}
                    >
                      <MessageCircle size={18} color="#ffffff" />
                      <Text
                        style={{
                          color: '#ffffff',
                          marginLeft: 6,
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        {livePost.commentCount}
                      </Text>
                    </GHTouchableOpacity>

                    {/* Share Capsule */}
                    <GHTouchableOpacity
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                      }}
                    >
                      <Share2 size={18} color="#ffffff" />
                      <Text
                        style={{
                          color: '#ffffff',
                          marginLeft: 6,
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        {language === 'vi' ? 'Chia sẻ' : 'Share'}
                      </Text>
                    </GHTouchableOpacity>
                  </View>

                  {/* Right: Quick React/Like blue circle button */}
                  <GHTouchableOpacity
                    onPress={() => onReact(livePost.id, 'like')}
                    onLongPress={() => handleLikeLongPress(true)}
                    delayLongPress={400}
                    activeOpacity={0.75}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: livePost.myReaction
                        ? 'rgba(255, 255, 255, 0.12)'
                        : '#0866FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {livePost.myReaction ? (
                      <Image
                        source={REACTION_IMAGES[livePost.myReaction]}
                        style={{ width: 24, height: 24 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <ThumbsUp size={18} color="#ffffff" fill="#ffffff" />
                    )}
                  </GHTouchableOpacity>
                </View>
              </View>

              {/* Reaction Picker Overlay inside Modal */}
              <ReactionPickerOverlay
                anchor={pickerAnchor}
                onPick={handleLocalPickReaction}
                onDismiss={() => setPickerAnchor(null)}
                gestureX={localGestureX}
                gestureY={localGestureY}
                gestureActive={localGestureActive}
                hasDragged={localHasDragged}
              />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

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
    <Animated.View style={animatedStyle} className={FEED_CARD_CLASS}>
      <View className={FEED_CARD_PADDING_CLASS}>
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
      </View>
      {/* Media placeholder for photo / video skeletons. */}
      <View className="h-56 w-full bg-slate-200" />
      {/* Action row */}
      <View className="flex-row justify-between border-t border-[#dddfe2] px-3 py-3">
        <View className="h-6 w-16 rounded bg-slate-200" />
        <View className="h-6 w-20 rounded bg-slate-200" />
        <View className="h-6 w-16 rounded bg-slate-200" />
      </View>
    </Animated.View>
  );
}

type FeedListItem =
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
  const userVm = useCurrentUserViewModel();
  const feedPosts = vm.posts;
  const prependFeedPost = vm.prependPost;
  const toggleFeedReaction = vm.toggleReaction;
  const voteFeedPoll = vm.votePoll;
  const saveFeedPost = vm.savePost;
  const reportFeedPost = vm.reportPost;
  const shareFeedPost = vm.sharePost;
  const reloadFeedPosts = vm.reloadPosts;
  const setFeedScrollBusy = vm.setScrollBusy;
  const activeFeedSource = vm.feedSource;
  const setActiveFeedSource = vm.setFeedSource;

  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const hasDragged = useSharedValue(false);

  // Viewport tracking & Autoplay logic for video cards.
  const activeVideoIdRef = useRef<string | null>(feedActiveVideoIdSnapshot);
  const pendingActiveVideoIdRef = useRef<string | null>(null);
  const isScrollingRef = useRef(false);
  const lastLoadMoreRequestAtRef = useRef(0);
  const lastSupplementalLoadMoreRequestAtRef = useRef(0);
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

  const setActiveFeedVideo = useCallback((videoId: string | null) => {
    activeVideoIdRef.current = videoId;
    publishFeedActiveVideo(videoId);
  }, []);

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
    const pendingVideoId = pendingActiveVideoIdRef.current;
    pendingActiveVideoIdRef.current = null;
    if (pendingVideoId !== activeVideoIdRef.current) {
      setActiveFeedVideo(pendingVideoId);
    }
  }, [setActiveFeedVideo, setFeedScrollBusy]);

  const handleScrollBeginDrag = useCallback(() => {
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

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const velocityY = Math.abs(event.nativeEvent.velocity?.y ?? 0);
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
    [endScrollPause],
  );

  const handleMomentumScrollEnd = useCallback(() => {
    if (scrollEndTimeoutRef.current) {
      clearTimeout(scrollEndTimeoutRef.current);
      scrollEndTimeoutRef.current = null;
    }
    isMomentumScrollingRef.current = false;
    endScrollPause();
  }, [endScrollPause]);

  useEffect(() => {
    return () => {
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      supplementalInteractionRef.current?.cancel();
      supplementalLoadTimersRef.current.forEach(timer => clearTimeout(timer));
      supplementalLoadTimersRef.current = [];
      activeVideoIdRef.current = null;
      publishFeedActiveVideo(null);
      publishFeedScrollBusy(false);
    };
  }, []);

  // Subscribe to the global "post created" event so the home feed gets
  // an instant prepend the moment CreatePostScreen finishes. We mount
  // ONCE per FeedScreen instance and unsubscribe on unmount so dropped
  // events never leak into stale listeners.
  useEffect(() => {
    const unsubscribe = postCreatedEvents.subscribe(post => {
      prependFeedPost(post);
    });
    return unsubscribe;
  }, [prependFeedPost]);

  const goToCreatePost = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_POST);
  }, [navigation]);

  // Navigate to user profile
  const navigateToProfile = useCallback(
    (userId: string) => {
      navigation.navigate(ROUTES.PROFILE, { userId });
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
    return productsVm.products.map((product, index) => ({
      kind: 'product' as const,
      id: `product-${product.id || index}`,
      product,
      postedAt: product.time ? parseInt(String(product.time), 10) : undefined,
      publisher: {
        id: String(product.seller?.user_id || ''),
        name: product.seller?.name || copy.sellerFallback,
        username: '',
        avatarUrl: product.seller?.avatar,
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
      navigation.navigate(ROUTES.LIVE_ROOM, { postId: item.postId });
    },
    [navigation],
  );

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

  // Viewability config for FlatList autoplay
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 50, // 50% of the item must be visible
    minimumViewTime: 150, // Must remain visible for 150ms before triggering to prevent spam during scroll
  });

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      const viewableVideo = viewableItems.find(
        item =>
          item.isViewable &&
          item.item?.type === 'post' &&
          item.item.post?.kind === 'video',
      );

      const nextVideoId = viewableVideo
        ? String(viewableVideo.item.post.id)
        : null;

      if (isScrollingRef.current) {
        pendingActiveVideoIdRef.current = nextVideoId;
        return;
      }

      setActiveFeedVideo(nextVideoId);
    },
    [setActiveFeedVideo],
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

  // Autoplay the first video on mount / load
  useEffect(() => {
    const firstVideo = feedPosts.find(p => p.kind === 'video');
    if (firstVideo && !activeVideoIdRef.current && !isScrollingRef.current) {
      setActiveFeedVideo(firstVideo.id);
    }
  }, [feedPosts, setActiveFeedVideo]);

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

  // â”€â”€ Smart image prefetch â€” only the next ~10 upcoming items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Instead of prefetching ALL images (which wastes bandwidth and CPU on
  // content the user may never scroll to), we track a "high-water mark"
  // and only prefetch images for the items just beyond what's been seen.
  const prefetchedCountRef = useRef(0);
  const feedTopPostId = mergedPosts[0]?.id;

  useEffect(() => {
    prefetchedCountRef.current = 0;
  }, [feedTopPostId]);

  useEffect(() => {
    if (mergedPosts.length === 0) return;

    const start = prefetchedCountRef.current;
    const end = Math.min(mergedPosts.length, start + IMAGE_PREFETCH_LOOKAHEAD);
    if (start >= end) return; // Nothing new to prefetch

    const urlsToPrefetch: string[] = [];
    for (let i = start; i < end; i++) {
      const post = mergedPosts[i];
      if (!post) continue;

      // Avatar
      if (post.publisher?.avatarUrl?.startsWith('http')) {
        urlsToPrefetch.push(post.publisher.avatarUrl);
      }
      // Photos (text posts)
      if (post.kind === 'text') {
        post.photos?.slice(0, 4).forEach(photo => {
          if (photo?.startsWith('http')) urlsToPrefetch.push(photo);
        });
      }
      // Product images
      if (post.kind === 'product') {
        const prod = post.product;
        if (prod?.images) {
          prod.images.slice(0, 2).forEach((imgObj: any) => {
            if (imgObj?.image?.startsWith?.('http'))
              urlsToPrefetch.push(imgObj.image);
          });
        }
      }
      // Video thumbnails
      if (post.kind === 'video' && post.thumbnailUrl?.startsWith('http')) {
        urlsToPrefetch.push(post.thumbnailUrl);
      }
      // Event cover images
      if (post.kind === 'event') {
        const cover = post.event.event_cover || post.event.cover;
        if (cover?.startsWith('http')) urlsToPrefetch.push(cover);
      }
      if (post.kind === 'job') {
        if (post.job.image?.startsWith('http'))
          urlsToPrefetch.push(post.job.image);
        if (post.job.page?.avatar?.startsWith('http'))
          urlsToPrefetch.push(post.job.page.avatar);
        if (post.job.page?.cover?.startsWith('http'))
          urlsToPrefetch.push(post.job.page.cover);
      }
      if (post.kind === 'ad') {
        if (post.mediaUrl?.startsWith('http'))
          urlsToPrefetch.push(post.mediaUrl);
        if (post.publisher.avatarUrl?.startsWith('http'))
          urlsToPrefetch.push(post.publisher.avatarUrl);
      }
    }

    prefetchedCountRef.current = end;

    // Deduplicate and prefetch in idle time - limit to avoid network/CPU spikes
    const unique = Array.from(new Set(urlsToPrefetch)).slice(
      0,
      MAX_IMAGE_PREFETCH_URLS,
    );
    // Prefetch fewer at a time to avoid overwhelming the device
    unique.slice(0, 4).forEach(url => {
      Image.prefetch(url).catch(() => {});
    });
  }, [mergedPosts]);

  // Separate memoized render functions for each type - prevents full re-render
  const renderVideoPost = useCallback(
    ({ item }: { item: FeedVideoPost }) => (
      <HomeVideoPostCard
        key={item.id}
        post={item}
        copy={copy}
        onReact={handleToggleReactionStable}
        onOpenPicker={handleOpenPicker}
        onCommentTap={handleCommentTapStable}
        onShare={handleOpenSharePost}
        navigateToProfile={navigateToProfile}
        onOpenPostMenu={handleOpenPostMenu}
      />
    ),
    [
      handleCommentTapStable,
      copy,
      handleOpenPicker,
      handleOpenSharePost,
      navigateToProfile,
      handleOpenPostMenu,
      handleToggleReactionStable,
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

  const renderItem = useCallback(
    ({ item }: { item: FeedListItem }) => {
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
      renderPollPost,
      renderProductPost,
      renderTextPost,
      renderVideoPost,
    ],
  );

  const keyExtractor = useCallback((item: FeedListItem) => item.id, []);

  const ListHeaderComponent = useMemo(
    () => (
      <View>
        <FilterTabs
          copy={copy}
          activeSource={activeFeedSource}
          onChangeSource={setActiveFeedSource}
        />
        <ComposerCard
          onPress={goToCreatePost}
          avatarUrl={userVm.user?.avatar}
          copy={copy}
        />
        <StoriesRow avatarUrl={userVm.user?.avatar} copy={copy} />
        <GreetingCard userName={userVm.user?.name} copy={copy} />
      </View>
    ),
    [
      activeFeedSource,
      copy,
      goToCreatePost,
      setActiveFeedSource,
      userVm.user?.avatar,
      userVm.user?.name,
    ],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 surface-base" edges={ROOT_SAFE_AREA_EDGES}>
        <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <FeedHeader />
        <View className="flex-1">
          <FlatList
            data={feedListItems}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            extraData={language}
            ListHeaderComponent={ListHeaderComponent}
            decelerationRate="normal"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            scrollEventThrottle={64}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfigRef.current}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            onMomentumScrollBegin={handleMomentumScrollBegin}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.75}
            ListFooterComponent={ListFooterComponent}
            contentContainerStyle={FEED_LIST_CONTENT_STYLE}
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
        </View>
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
          onReport={handleReportPost}
        />
        {/* â”€â”€ Toast Notification â”€â”€ */}
        <ToastContainer />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

export default FeedScreen;
