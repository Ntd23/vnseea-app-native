// Description: Renders the Stitch Facebook-style VNSEEA feed inside the main tab shell.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import VideoPlayer from 'react-native-video';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
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
  Edit3,
  Globe,
  ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  ShoppingBag,
  Smile,
  Tag,
  ThumbsUp,
  X,
} from 'lucide-react-native';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { ALL_REACTION_TYPES } from '../../../reels/domain/types/reels.types';

// ── Facebook-style reaction lookup tables ─────────────────────────────────
// Same shape we use in the comments sheet, kept local here so the feed
// module stays self-contained (no shared "design tokens" file yet).

const REACTION_EMOJI: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};

const REACTION_LABEL: Record<ReactionType, string> = {
  like: 'Đã thích',
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

// Floating picker pill geometry — used to clamp X within the viewport.
const PICKER_WIDTH = 282;
const PICKER_HEIGHT = 52;
const PICKER_GAP = 8;
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { RootStackRouteName } from '../../../navigation/types';
import CreateActionSheet from '../../../shared-kernel/presentation/components/CreateActionSheet';
import { useFeedViewModel } from '../../application/view-models/useFeedViewModel';
import { postCreatedEvents } from '../../application/events/postCreatedEvents';
import type {
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
} from '../../domain/types/feed.types';
import { ReelCommentsSheet } from '../../../reels/presentation/components/ReelCommentsSheet';
import { useFeedCommentsViewModel } from '../../application/view-models/useFeedCommentsViewModel';
import {
  storyCreatedEvents,
  storyDeletedEvents,
  useStoriesViewModel,
} from '../../../stories';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import { ShareActionSheet } from '../../../shared-kernel/presentation/components/ShareActionSheet';

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

const filters = ['Mới nhất', 'Phổ biến', 'Yêu thích nhất'];
const stories = [
  { name: 'Thảo Vy', image: images.thao, active: true },
  { name: 'Minh Quân', image: images.minh, active: true },
  { name: 'Linh Chi', image: images.linh, active: false },
];

function IconButton({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="h-10 w-10 items-center justify-center rounded-full"
      activeOpacity={0.75}
      onPress={onPress}
    >
      {children}
    </TouchableOpacity>
  );
}

function Avatar({ uri, size = 40 }: { uri: string; size?: number }) {
  return (
    <Image
      source={{ uri }}
      style={{ height: size, width: size }}
      className="rounded-full"
      resizeMode="cover"
    />
  );
}



function FeedHeader() {
  const navigation = useNavigation<FeedNav>();
  const [sheetVisible, setSheetVisible] = useState(false);
  const handleCreateNavigate = useCallback(
    (route: RootStackRouteName) => {
      if (route === ROUTES.CREATE_EVENT) {
        navigation.navigate(ROUTES.CREATE_EVENT);
      }

      if (route === ROUTES.CREATE_PRODUCT) {
        navigation.navigate(ROUTES.CREATE_PRODUCT);
      }

      if (route === ROUTES.CREATE_PAGE) {
        navigation.navigate(ROUTES.CREATE_PAGE);
      }

      if (route === ROUTES.CREATE_GROUP) {
        navigation.navigate(ROUTES.CREATE_GROUP);
      }

      if (route === ROUTES.CREATE_REEL) {
        navigation.navigate(ROUTES.CREATE_REEL);
      }

      if (route === ROUTES.CREATE_POST) {
        navigation.navigate(ROUTES.CREATE_POST);
      }
    },
    [navigation],
  );

  return (
    <>
      <View className="surface-topbar h-20 flex-row items-center justify-between px-4">
        <View className="flex-row items-center">
          <Text className="ml-1 text-display text-brand">VNSEEA</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.75}
            onPress={() => navigation.navigate(ROUTES.SEARCH)}
          >
            <Search size={22} color="#0000FF" />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.75}
            onPress={() => setSheetVisible(true)}
          >
            <Plus size={24} color="#0000FF" />
          </TouchableOpacity>
          <IconButton onPress={() => navigation.navigate(ROUTES.MESSAGES)}>
            <MessageCircle size={22} color="#0000FF" />
          </IconButton>
        </View>
      </View>
      <CreateActionSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onNavigate={handleCreateNavigate}
      />
    </>
  );
}

function FilterTabs() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 py-4"
    >
      {filters.map((filter, index) => (
        <TouchableOpacity
          key={filter}
          className={`rounded-full px-6 py-2 ${
            index === 0 ? 'surface-brand' : 'surface-muted'
          }`}
          activeOpacity={0.8}
        >
          <Text
            className={
              index === 0
                ? 'text-title-primary text-inverse'
                : 'text-title-secondary'
            }
          >
            {filter}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function ComposerCard({ onPress, avatarUrl }: { onPress: () => void; avatarUrl?: string }) {
  // The whole card is a single nav entry-point to CreatePostScreen.
  // We expose `onPress` separately on the text bubble AND on each
  // action button so the user can tap anywhere natural — Facebook lets
  // you tap "Photo" / "Feeling" to land directly inside the composer.
  return (
    <View className="surface-card mx-4 mb-6 p-4">
      <View className="mb-3 flex-row items-center border-b border-slate-200 pb-3">
        <Avatar uri={avatarUrl ?? images.me} />
        <TouchableOpacity
          className="surface-muted ml-3 min-h-[42px] flex-1 justify-center rounded-full px-4"
          activeOpacity={0.8}
          onPress={onPress}
        >
          <Text className="text-body-secondary">Bạn đang nghĩ gì?</Text>
        </TouchableOpacity>
      </View>
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          className="flex-row items-center"
          activeOpacity={0.75}
          onPress={onPress}
        >
          <ImageIcon size={20} color="#45BD62" />
          <Text className="ml-2 text-title-secondary">Thư viện</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center"
          activeOpacity={0.75}
          onPress={onPress}
        >
          <Tag size={20} color="#0000FF" />
          <Text className="ml-2 text-title-secondary">Gắn thẻ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center"
          activeOpacity={0.75}
          onPress={onPress}
        >
          <Smile size={20} color="#F59E0B" />
          <Text className="ml-2 text-title-secondary">Cảm xúc</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Open the full-screen viewer at a specific user index. We pass the
// full stories array plus the index, so the viewer knows where to start.
function StoriesRow({ avatarUrl }: { avatarUrl?: string }) {
  const navigation = useNavigation<FeedNav>();
  const vm = useStoriesViewModel();

  // Subscribe to the cross-screen pub/sub so the rail stays in sync
  // with composer creates AND viewer deletes — without forcing either
  // screen to know about FeedScreen directly. Mounted ONCE per row, so
  // the cleanup runs reliably even if FeedScreen re-renders.
  useEffect(() => {
    const unsubCreated = storyCreatedEvents.subscribe(story => {
      vm.prependStory(story);
    });
    const unsubDeleted = storyDeletedEvents.subscribe(storyId => {
      vm.removeStoryLocal(storyId);
    });
    return () => {
      unsubCreated();
      unsubDeleted();
    };
  }, [vm]);

  const goToCreateStory = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_STORY);
  }, [navigation]);

  const goToViewerForGroup = useCallback(
    (index: number) => {
      console.log('[FeedScreen] goToViewerForGroup user index:', index, 'total stories:', vm.stories.length);
      navigation.navigate(ROUTES.STORY_VIEWER, {
        stories: vm.stories,
        initialUserIndex: index,
      });
    },
    [navigation, vm.stories],
  );

  return (
    <View className="mb-6">
      <View className="mb-3 flex-row items-center justify-between px-4">
        <Text className="text-heading">Tin tức mới</Text>
        <TouchableOpacity activeOpacity={0.8}>
          <Text className="text-title-primary text-brand">Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 px-4"
      >
        {/* "Tạo tin" card — always first, leading entry point. */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={goToCreateStory}
          className="surface-card h-48 w-28 overflow-hidden"
        >
          <Image
            source={{ uri: avatarUrl ?? images.me }}
            className="h-32 w-full"
            resizeMode="cover"
          />
          <View className="h-14 items-center justify-center bg-white">
            <View className="absolute -top-4 h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-blue-600">
              <Plus size={17} color="#FFFFFF" />
            </View>
            <Text className="mt-3 text-caption-primary">Tạo tin</Text>
          </View>
        </TouchableOpacity>

        {/* Grouped story bubbles (Facebook-style):
            Multiple stories from same user → one avatar + count badge */}
        {vm.stories.map((story, index) => {
          const hasUnseen = story.hasUnseen && !story.isViewed;

          return (
            <TouchableOpacity
              key={story.publisher.userId}
              activeOpacity={0.85}
              onPress={() => goToViewerForGroup(index)}
              className={`h-48 w-28 overflow-hidden rounded-2xl ${
                hasUnseen ? '' : 'opacity-80'
              }`}
            >
              {/* Cover image — thumbnail when available, falls back to
                  the publisher's avatar. */}
              <Image
                source={{
                  uri: story.thumbnailUrl ?? story.publisher.avatarUrl,
                }}
                className="h-full w-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/20" />

              {/* Avatar bubble overlay (top-left), ring colored by
                  unseen-state — blue when unseen, grey once viewed. */}
              <View
                className={`absolute left-2 top-2 h-10 w-10 overflow-hidden rounded-full border-2 ${
                  hasUnseen ? 'border-blue-600' : 'border-slate-300'
                } bg-white p-0.5`}
              >
                <Image
                  source={{ uri: story.publisher.avatarUrl }}
                  className="h-full w-full rounded-full"
                  resizeMode="cover"
                />

                {/* Count badge (only show when > 1 story) */}
                {story.media.length > 1 && (
                  <View className="absolute -bottom-2 -right-2 flex h-5 items-center justify-center rounded-full bg-blue-600 px-1">
                    <Text className="text-[10px] font-bold text-white">
                      {story.media.length}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                className="absolute bottom-2 left-2 right-2 text-caption-primary text-white"
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


function GreetingCard({ userName }: { userName?: string }) {
  const displayName = userName || 'Nguyễn Dũng';

  return (
    <View className="preview-panel mx-4 mb-6 flex-row items-center justify-between p-4">
      <View className="flex-1 pr-3">
        <Text className="text-heading">Chào buổi tối, {displayName}</Text>
        <Text className="mt-1 text-body-secondary">
          Buổi tối là cách cuộc sống nói rằng bạn đang gần hơn với giấc mơ của
          mình.
        </Text>
      </View>
      <Text className="text-4xl">🌅</Text>
    </View>
  );
}

function formatCount(count: number) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatPostTime(timestamp?: number) {
  if (!timestamp) return 'Vừa xong';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(timestamp * 1000).toLocaleDateString('vi-VN');
}

const HomeVideoPostCard = React.memo(function HomeVideoPostCard({
  post,
  onReact,
  onOpenPicker,
  onCommentTap,
  onShare,
  isActive,
  onReportLayout,
  gestureX,
  gestureY,
  gestureActive,
  navigateToProfile,
}: {
  post: FeedVideoPost;
  onReact: (postId: string, reaction: ReactionType) => void;
  onOpenPicker: (postId: string, x: number, y: number) => void;
  onCommentTap: (postId: string) => void;
  onShare?: (post: FeedPost) => void;
  isActive: boolean;
  onReportLayout: (id: string, y: number, height: number) => void;
  gestureX: any;
  gestureY: any;
  gestureActive: any;
  navigateToProfile: (userId: string) => void;
}) {
  const navigation = useNavigation<any>();
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [muted, setMuted] = useState(true);

  // Profile tap handler
  const handleProfilePress = useCallback(() => {
    if (post.publisher.id) {
      navigateToProfile(post.publisher.id);
    }
  }, [navigateToProfile, post.publisher.id]);

  const handleVideoPress = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('[HomeVideoPostCard] Video pressed! Navigating to Reels with ID:', post.id);
    navigation.navigate(ROUTES.REELS, {
      initialVideoId: post.id,
      post: post,
    });
  }, [navigation, post]);

  // ── Mount strategy — keep player alive, just pause ───────────────
  //
  // Previously we mount/unmount the entire <VideoPlayer> based on
  // `isActive`. That caused massive FPS drops during scroll because
  // ExoPlayer init (decoder creation, buffer allocation) is very
  // expensive on Android.
  //
  // New strategy: we mount the player ONCE when it first becomes
  // active, and after that we KEEP it mounted — just toggle `paused`.
  // This avoids repeated ExoPlayer init/destroy cycles during scroll.
  //
  // `hasBeenActive` is a one-way latch: once true, stays true.
  const [hasBeenActive, setHasBeenActive] = useState(false);
  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  useEffect(() => {
    if (!isActive) {
      setManuallyPaused(false);
    }
  }, [isActive]);

  const playing = isActive && !manuallyPaused;

  // Need an on-screen position for the "Thích" button so the picker
  // anchors above it (matches the Facebook web/mobile pattern).
  const likeButtonRef = useRef<View>(null);

  const handleLikeTap = useCallback(() => {
    // Default reaction is 'like' — same as Facebook. Tapping again clears
    // it (the view-model handles the toggle-off).
    onReact(post.id, 'like');
  }, [onReact, post.id]);

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
    <View
      onLayout={(e) => {
        const { y, height } = e.nativeEvent.layout;
        onReportLayout(post.id, y, height);
      }}
      className="surface-card mx-4 mb-6 overflow-hidden"
    >
      <View className="p-5">
        <PostHeader
          avatar={post.publisher.avatarUrl}
          name={post.publisher.name}
          time={formatPostTime(post.postedAt)}
          onPress={post.publisher.id ? handleProfilePress : undefined}
        />
        {post.caption ? (
          <Text className="text-body-primary">{post.caption}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleVideoPress}
        className="h-56 w-full bg-black"
      >
        {/* react-native-video v6 — keep mounted, toggle `paused` */}
        {hasBeenActive ? (
          <View pointerEvents="none" style={{ width: '100%', height: '100%' }}>
            <VideoPlayer
              source={{ uri: post.videoUrl }}
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
            poster={post.thumbnailUrl}
            posterResizeMode="cover"
            bufferConfig={{
              minBufferMs: 2000,
              maxBufferMs: 5000,
              bufferForPlaybackMs: 1000,
              bufferForPlaybackAfterRebufferMs: 2000,
            }}
            onError={(error) => {
              // eslint-disable-next-line no-console
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
          <Image
            source={{ uri: post.thumbnailUrl }}
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
                ▶
              </Text>
            </View>
          </View>
        ) : null}
        {/* Mute toggle — top-right when playing */}
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
              {muted ? '🔇' : '🔊'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
      <View className="p-5">
        <VideoReactionSummary
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          myReaction={post.myReaction}
          topReactions={post.topReactions}
        />
        <VideoPostActions
          myReaction={post.myReaction}
          likeButtonRef={likeButtonRef}
          onLikeTap={handleLikeTap}
          onLikeLongPress={handleLikeLongPress}
          onCommentTap={() => onCommentTap(post.id)}
          onShare={onShare}
          post={post}
          gestureX={gestureX}
          gestureY={gestureY}
          gestureActive={gestureActive}
        />
      </View>
    </View>
  );
});

// ── Facebook-style summary row above the action buttons ──────────────────
// Shows stacked emoji badges ("👍❤️😂") followed by either the viewer's
// own reaction label ("Bạn và 14 người khác") OR a generic count when the
// viewer hasn't reacted.

// Background colors for each reaction type's circular badge (FB-style)
const REACTION_BADGE_BG: Record<ReactionType, string> = {
  like: '#0866FF',
  love: '#F33E58',
  haha: '#F7B125',
  wow: '#F7B125',
  sad: '#F7B125',
  angry: '#E9710F',
};

// ── Photo Viewer Modal ────────────────────────────────────────────────────
// Full-screen Facebook-style photo viewer: black bg, swipe left/right,
// page counter, caption overlay, publisher info + reaction counts at bottom.

type PhotoViewerState = {
  post: FeedTextPost;
  initialIndex: number;
} | null;

function PhotoViewerModal({
  state,
  onClose,
  onReact,
  onCommentTap,
  posts,
}: {
  state: PhotoViewerState;
  onClose: () => void;
  onReact: (postId: string, reaction: ReactionType) => void;
  onCommentTap: (postId: string) => void;
  posts: FeedPost[];
}) {
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
  const [currentIndex, setCurrentIndex] = useState(0);

  const translateY = useSharedValue(0);
  const openProgress = useSharedValue(0);

  // Sync page and trigger fade-in and scale-up transition on mount / state change
  useEffect(() => {
    if (state) {
      setCurrentIndex(state.initialIndex);
      translateY.value = 0;
      openProgress.value = 0;
      openProgress.value = withTiming(1, { duration: 200 });
    }
  }, [state, translateY, openProgress]);

  const handleClose = useCallback(() => {
    openProgress.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }, [onClose, openProgress]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-10, 10])
    .onUpdate((event) => {
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        // Slide off screen downwards
        translateY.value = withTiming(SCREEN_H, { duration: 180 }, (finished) => {
          if (finished) {
            runOnJS(onClose)();
          }
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
      Extrapolation.CLAMP
    );
    const finalOpacity = dragProgress * openProgress.value;
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
      Extrapolation.CLAMP
    );
    const openScale = interpolate(
      openProgress.value,
      [0, 1],
      [0.85, 1],
      Extrapolation.CLAMP
    );
    return {
      flex: 1,
      transform: [
        { translateY: translateY.value },
        { scale: dragScale * openScale }
      ],
      opacity: openProgress.value,
    };
  });

  if (!state) return null;
  const { post } = state;
  const total = post.photos.length;

  // Resolve the live version of this post so reactions/counts update in real time.
  const livePost = (posts.find(p => p.id === post.id) as FeedTextPost) || post;

  return (
    <Modal
      visible
      transparent
      animationType="none" // Use custom JS animated transitions instead of raw fade
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={containerStyle}>
            <Animated.View style={[contentStyle, { flex: 1 }]}>

              {/* ── Top bar: page counter (left) + close button (right) ── */}
              <View
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
                  paddingTop: 48, paddingHorizontal: 16,
                  flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {total > 1 ? (
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                    {currentIndex + 1} / {total}
                  </Text>
                ) : (
                  <View />
                )}
                <TouchableOpacity
                  onPress={handleClose}
                  style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* ── Horizontally paginated photo list ── */}
              <FlatList
                data={livePost.photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={state.initialIndex}
                getItemLayout={(_, index) => ({
                  length: SCREEN_W, offset: SCREEN_W * index, index,
                })}
                onMomentumScrollEnd={e => {
                  const idx = Math.round(
                    e.nativeEvent.contentOffset.x / SCREEN_W,
                  );
                  setCurrentIndex(idx);
                }}
                keyExtractor={(url, i) => `viewer-${i}-${url}`}
                renderItem={({ item: url }) => (
                  <View
                    style={{
                      width: SCREEN_W, height: SCREEN_H,
                      justifyContent: 'center', alignItems: 'center',
                    }}
                  >
                    <Image
                      source={{ uri: url }}
                      style={{ width: SCREEN_W, height: SCREEN_H * 0.62 }}
                      resizeMode="contain"
                    />
                  </View>
                )}
              />

              {/* ── Bottom overlay: publisher + reaction counts ── */}
              <View
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40,
                }}
              >
                {/* Caption text */}
                {livePost.caption ? (
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 15,
                      lineHeight: 20,
                      marginBottom: 12,
                      textShadowColor: 'rgba(0,0,0,0.8)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 3,
                    }}
                    numberOfLines={4}
                  >
                    {livePost.caption}
                  </Text>
                ) : null}

                {/* Publisher row */}
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
                >
                  {livePost.publisher.avatarUrl ? (
                    <Image
                      source={{ uri: livePost.publisher.avatarUrl }}
                      style={{
                        width: 40, height: 40, borderRadius: 20,
                        marginRight: 10,
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: '#555', marginRight: 10,
                      }}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                      {livePost.publisher.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' }}>
                        {formatPostTime(livePost.postedAt).toUpperCase()}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginHorizontal: 4 }}>•</Text>
                      <Globe size={11} color="rgba(255,255,255,0.6)" />
                    </View>
                  </View>
                </View>

                {/* Actions and reactions row */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Left: Like, Comment, Share buttons */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                    {/* Like action button */}
                    <TouchableOpacity
                      onPress={() => onReact(livePost.id, 'like')}
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                      activeOpacity={0.75}
                    >
                      {livePost.myReaction ? (
                        <Text style={{ fontSize: 18 }}>{REACTION_EMOJI[livePost.myReaction]}</Text>
                      ) : (
                        <ThumbsUp size={20} color="#fff" />
                      )}
                      <Text style={{ color: '#fff', marginLeft: 8, fontSize: 14, fontWeight: '600' }}>
                        {livePost.likeCount}
                      </Text>
                    </TouchableOpacity>

                    {/* Comment action button */}
                    <TouchableOpacity
                      onPress={() => onCommentTap(livePost.id)}
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                      activeOpacity={0.75}
                    >
                      <MessageCircle size={20} color="#fff" />
                      <Text style={{ color: '#fff', marginLeft: 8, fontSize: 14, fontWeight: '600' }}>
                        {livePost.commentCount}
                      </Text>
                    </TouchableOpacity>

                    {/* Share action button */}
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                      activeOpacity={0.75}
                    >
                      <Share2 size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Right: Stacked reactions badges */}
                  {livePost.topReactions && livePost.topReactions.length > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {livePost.topReactions.map((type, i) => (
                        <View
                          key={type}
                          style={{
                            width: 22, height: 22, borderRadius: 11,
                            backgroundColor: REACTION_BADGE_BG[type],
                            alignItems: 'center', justifyContent: 'center',
                            marginLeft: i > 0 ? -6 : 0,
                            zIndex: livePost.topReactions.length - i,
                            borderWidth: 1.5, borderColor: '#000',
                          }}
                        >
                          {type === 'like'
                            ? <ThumbsUp size={11} color="#fff" />
                            : <Text style={{ fontSize: 11 }}>{REACTION_EMOJI[type]}</Text>}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>

          </Animated.View>
        </Animated.View>
      </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

function VideoReactionSummary({
  likeCount,
  commentCount,
  myReaction,
  topReactions,
}: {
  likeCount: number;
  commentCount: number;
  myReaction: ReactionType | null;
  topReactions: ReactionType[];
}) {
  // Don't render the row at all if nobody has reacted AND there are no
  // comments — keeps simple posts visually quiet, FB-style.
  if (likeCount <= 0 && commentCount <= 0) return null;

  const othersCount = myReaction ? Math.max(0, likeCount - 1) : likeCount;
  const summaryLeft = (() => {
    if (myReaction && othersCount > 0) {
      return `Bạn và ${formatCount(othersCount)} người khác`;
    }
    if (myReaction) {
      return 'Bạn';
    }
    if (likeCount > 0) {
      return formatCount(likeCount);
    }
    return '';
  })();

  return (
    <View className="mb-4 flex-row items-center justify-between">
      {/* Left: stacked reaction badges + label */}
      <View className="mr-2 flex-1 flex-row items-center">
        {likeCount > 0 ? (
          <>
            {/* Facebook-style stacked emoji badges — each badge overlaps
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
                    backgroundColor: type === 'like' ? REACTION_BADGE_BG.like : REACTION_BADGE_BG[type],
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: '#FFFFFF',
                    marginLeft: index > 0 ? -6 : 0,
                    zIndex: topReactions.length - index,
                  }}
                >
                  {type === 'like' ? (
                    <ThumbsUp size={10} color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 10, lineHeight: 13 }}>
                      {REACTION_EMOJI[type]}
                    </Text>
                  )}
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
      </View>
      {/* Right: comment count */}
      {commentCount > 0 ? (
        <Text className="text-caption-secondary" numberOfLines={1}>
          {formatCount(commentCount)} bình luận
        </Text>
      ) : null}
    </View>
  );
}

// ── Action row — Thích / Bình luận / Chia sẻ ─────────────────────────────
// The "Thích" button is the interesting one:
//   • Label + color change to mirror the current reaction (Đã thích = blue,
//     Yêu thích = red, Haha/Wow/Sad = yellow, Phẫn nộ = orange)
//   • Long-press opens the picker pill (handled by the parent screen via
//     `onLikeLongPress` which measures this button's on-screen position)
function VideoPostActions({
  myReaction,
  likeButtonRef,
  onLikeTap,
  onLikeLongPress,
  onCommentTap,
  onShare,
  post,
  gestureX,
  gestureY,
  gestureActive,
}: {
  myReaction: ReactionType | null;
  likeButtonRef: React.RefObject<View | null>;
  onLikeTap: () => void;
  onLikeLongPress: () => void;
  onCommentTap: () => void;
  onShare?: (post: FeedPost) => void;
  post: FeedPost;
  gestureX: any;
  gestureY: any;
  gestureActive: any;
}) {
  const label = myReaction ? REACTION_LABEL[myReaction] : 'Thích';
  const color = myReaction ? REACTION_COLOR[myReaction] : '#64748B';

  const pan = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart((e) => {
      gestureActive.value = true;
      gestureX.value = e.absoluteX;
      gestureY.value = e.absoluteY;
      runOnJS(onLikeLongPress)();
    })
    .onUpdate((e) => {
      gestureX.value = e.absoluteX;
      gestureY.value = e.absoluteY;
    })
    .onEnd(() => {
      gestureActive.value = false;
    });

  const tap = Gesture.Tap().maxDuration(250).onEnd(() => {
    runOnJS(onLikeTap)();
  });

  const composedGesture = Gesture.Exclusive(pan, tap);

  return (
    <View className="flex-row items-center justify-between border-t border-slate-200 pt-4">
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          ref={likeButtonRef as any}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          className="flex-row items-center"
        >
          {myReaction ? (
            <Text style={{ fontSize: 18 }}>{REACTION_EMOJI[myReaction]}</Text>
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
        </Animated.View>
      </GestureDetector>

      <TouchableOpacity
        className="flex-row items-center"
        activeOpacity={0.75}
        onPress={onCommentTap}
      >
        <MessageCircle size={19} color="#64748B" />
        <Text style={{ marginLeft: 6, color: '#64748B', fontSize: 14 }}>
          Bình luận
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="flex-row items-center"
        activeOpacity={0.75}
        onPress={() => onShare?.(post)}
      >
        <Share2 size={19} color="#64748B" />
        <Text style={{ marginLeft: 6, color: '#64748B', fontSize: 14 }}>
          Chia sẻ
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Floating reaction picker (Facebook-style 6-emoji pill) ────────────────
// Renders in a transparent full-screen Modal so it always floats above
// every other content (cards, sticky header, etc.). Position is clamped
// inside the viewport so a long-press near the right edge still shows the
// full pill.
function ReactionPickerOverlay({
  anchor,
  onPick,
  onDismiss,
  gestureX,
  gestureY,
  gestureActive,
}: {
  anchor: { postId: string; x: number; y: number } | null;
  onPick: (reaction: ReactionType) => void;
  onDismiss: () => void;
  gestureX: any;
  gestureY: any;
  gestureActive: any;
}) {
  if (!anchor) return null;

  const screenWidth = Dimensions.get('window').width;
  const left = Math.max(
    10,
    Math.min(anchor.x - PICKER_WIDTH / 2, screenWidth - PICKER_WIDTH - 10),
  );
  const top = Math.max(40, anchor.y - PICKER_HEIGHT - PICKER_GAP);

  return (
    <>
      <Pressable
        onPress={onDismiss}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 99, backgroundColor: 'transparent' }}
      />
      <View
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
          backgroundColor: '#fff',
          borderRadius: 26,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 10,
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
            onPick={onPick}
            onDismiss={onDismiss}
          />
        ))}
      </View>
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
  onPick: (reaction: ReactionType) => void;
  onDismiss: () => void;
}) {
  // Approximate center of this icon in absolute screen coordinates
  const iconCenterX = pickerLeft + 8 + index * 44 + 20;
  const iconCenterY = pickerTop + PICKER_HEIGHT / 2;

  useAnimatedReaction(
    () => gestureActive.value,
    (isActive, previous) => {
      // Calculate which icon is hovered on release
      if (previous && !isActive) {
        const dx = gestureX.value - iconCenterX;
        const dy = gestureY.value - iconCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
          runOnJS(onPick)(type);
        } else if (index === 0) { // Only dismiss once to avoid multiple dismiss calls
          // If gesture was released outside any icon, dismiss (or we could just leave picker open if dist > some big number)
          runOnJS(onDismiss)();
        }
      }
    }
  );

  const style = useAnimatedStyle(() => {
    if (!gestureActive.value) return { transform: [{ scale: 1 }, { translateY: 0 }] };
    
    const dx = gestureX.value - iconCenterX;
    const dy = gestureY.value - iconCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const scale = interpolate(dist, [0, 40, 60], [1.5, 1.1, 1], Extrapolation.CLAMP);
    const translateY = interpolate(dist, [0, 40, 60], [-15, -5, 0], Extrapolation.CLAMP);
    
    return {
      transform: [
        { scale: withSpring(scale, { damping: 15 }) },
        { translateY: withSpring(translateY, { damping: 15 }) }
      ]
    };
  });

  return (
    <Animated.View style={[{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, style]}>
      <TouchableOpacity onPress={() => onPick(type)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
        <Text style={{ fontSize: 28, lineHeight: 32 }}>{REACTION_EMOJI[type]}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}


function PostSkeleton() {
  // Pulse animation: opacity oscillate 0.4 → 0.8 → 0.4 mỗi 1.5s
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 750 }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className="surface-card mx-4 mb-6 overflow-hidden"
    >
      <View className="p-5">
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
      {/* Media placeholder — random height giả lập photo / video */}
      <View className="h-56 w-full bg-slate-200" />
      {/* Action row */}
      <View className="flex-row justify-between border-t border-slate-200 p-5">
        <View className="h-6 w-16 rounded bg-slate-200" />
        <View className="h-6 w-20 rounded bg-slate-200" />
        <View className="h-6 w-16 rounded bg-slate-200" />
      </View>
    </Animated.View>
  );
}

function MergedFeed({
  posts,
  isLoading,
  error,
  onReact,
  onOpenPicker,
  onCommentTap,
  onShare,
  onPhotoPress,
  activeVideoId,
  onReportLayout,
  onReportSectionY,
  gestureX,
  gestureY,
  gestureActive,
  navigateToProfile,
}: {
  posts: FeedPost[];
  isLoading: boolean;
  error: string | null;
  onReact: (postId: string, reaction: ReactionType) => void;
  onOpenPicker: (postId: string, x: number, y: number) => void;
  onCommentTap: (postId: string) => void;
  onShare?: (post: FeedPost) => void;
  onPhotoPress: (post: FeedTextPost, photoIndex: number) => void;
  activeVideoId: string | null;
  onReportLayout: (id: string, y: number, height: number) => void;
  onReportSectionY: (y: number) => void;
  gestureX: any;
  gestureY: any;
  gestureActive: any;
  navigateToProfile: (userId: string) => void;
}) {
  // ── Skeleton loading state ──
  if (isLoading && posts.length === 0) {
    return (
      <View>
        {[1, 2, 3].map(i => (
          <PostSkeleton key={i} />
        ))}
      </View>
    );
  }

  // ── Empty state ──
  if (posts.length === 0) {
    return null; // hoặc empty message
  }

  // ── Time-sorted render ──
  return (
    <View onLayout={(e) => onReportSectionY(e.nativeEvent.layout.y)}>
      {posts.map(post => {
        if (post.kind === 'video') {
          return (
            <HomeVideoPostCard
              key={post.id}
              post={post}
              onReact={onReact}
              onOpenPicker={onOpenPicker}
              onCommentTap={onCommentTap}
              onShare={onShare}
              isActive={activeVideoId === post.id}
              onReportLayout={onReportLayout}
              gestureX={gestureX}
              gestureY={gestureY}
              gestureActive={gestureActive}
              navigateToProfile={navigateToProfile}
            />
          );
        }
        if (post.kind === 'text') {
          return (
            <TextPostCard
              key={post.id}
              post={post}
              onReact={onReact}
              onOpenPicker={onOpenPicker}
              onCommentTap={onCommentTap}
              onPhotoPress={onPhotoPress}
              onShare={onShare}
              gestureX={gestureX}
              gestureY={gestureY}
              gestureActive={gestureActive}
              navigateToProfile={navigateToProfile}
            />
          );
        }
        return null;
      })}
      {error ? (
        <View className="mx-4 mb-4 rounded-lg bg-red-50 px-3 py-2">
          <Text style={{ color: '#B91C1C', fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PostHeader({
  avatar,
  name,
  time,
  badge,
  onPress,
}: {
  avatar?: string;
  name: string;
  time: string;
  badge?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="mb-4 flex-row items-center justify-between"
      activeOpacity={0.8}
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="flex-row items-center">
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
          <Text className="text-caption-secondary">{time} • Công khai</Text>
        </View>
      </View>
      <MoreHorizontal size={22} color="#94A3B8" />
    </TouchableOpacity>
  );
}

// ── Text / photo post card ────────────────────────────────────────────
// Renders a non-video post from `vm.textPosts`. Same FB-style chrome as
// the mock posts (header → caption → photos → reaction summary → action
// row) but data-driven instead of hardcoded.
const TextPostCard = React.memo(function TextPostCard({
  post,
  onReact,
  onOpenPicker,
  onCommentTap,
  onPhotoPress,
  onShare,
  gestureX,
  gestureY,
  gestureActive,
  navigateToProfile,
}: {
  post: FeedTextPost;
  onReact: (postId: string, reaction: ReactionType) => void;
  onOpenPicker: (postId: string, x: number, y: number) => void;
  onCommentTap: (postId: string) => void;
  onPhotoPress: (post: FeedTextPost, photoIndex: number) => void;
  onShare?: (post: FeedPost) => void;
  // Reanimated shared values for the FB-style drag-to-pick reaction
  // picker. Threaded through `VideoPostActions` so the long-press +
  // pan gesture can update them and `ReactionIcon` can react to the
  // movement. `any` typing matches Antigravity's existing convention.
  gestureX: any;
  gestureY: any;
  gestureActive: any;
  navigateToProfile: (userId: string) => void;
}) {
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
  const handleLikeLongPress = useCallback(() => {
    if (!likeButtonRef.current) {
      onOpenPicker(post.id, 100, 200);
      return;
    }
    likeButtonRef.current.measureInWindow((x, y, width) => {
      onOpenPicker(post.id, x + width / 2, y);
    });
  }, [onOpenPicker, post.id]);

  // Photo grid: 1 photo → big, 2+ → 2-column. Same shape as the composer
  // grid for visual consistency.
  const single = post.photos.length === 1;

  return (
    <View className="surface-card mx-4 mb-6 overflow-hidden">
      <View className="p-5">
        <PostHeader
          avatar={post.publisher.avatarUrl}
          name={post.publisher.name}
          time={formatPostTime(post.postedAt)}
          onPress={post.publisher.id ? handleProfilePress : undefined}
        />
        {post.caption ? (
          <Text className="text-body-primary">{post.caption}</Text>
        ) : null}
        {post.feeling ? (
          <Text className="mt-1 text-caption-secondary">
            đang cảm thấy {post.feeling.label ?? post.feeling.value}{' '}
            {post.feeling.emoji ?? ''}
          </Text>
        ) : null}
      </View>
      {post.photos.length > 0 ? (
        <View className="flex-row flex-wrap px-1">
          {post.photos.map((url, index) => (
            <TouchableOpacity
              key={url}
              onPress={() => onPhotoPress(post, index)}
              activeOpacity={0.95}
              style={{
                width: single ? '100%' : '50%',
                aspectRatio: single ? 1.4 : 1,
                padding: 2,
              }}
            >
              <Image
                source={{ uri: url }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 8,
                  backgroundColor: '#F1F5F9',
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <View className="p-5">
        <VideoReactionSummary
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          myReaction={post.myReaction}
          topReactions={post.topReactions}
        />
        <VideoPostActions
          myReaction={post.myReaction}
          likeButtonRef={likeButtonRef}
          onLikeTap={handleLikeTap}
          onLikeLongPress={handleLikeLongPress}
          onCommentTap={() => onCommentTap(post.id)}
          onShare={onShare}
          post={post}
          gestureX={gestureX}
          gestureY={gestureY}
          gestureActive={gestureActive}
        />
      </View>
    </View>
  );
});

// Section wrapper — header + empty/loading/error states + list of cards.


function FeedScreen() {
  const navigation = useNavigation<FeedNav>();
  const vm = useFeedViewModel();
  const userVm = useCurrentUserViewModel();

  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);

  // Subscribe to the global "post created" event so the home feed gets
  // an instant prepend the moment CreatePostScreen finishes. We mount
  // ONCE per FeedScreen instance and unsubscribe on unmount so dropped
  // events never leak into stale listeners.
  useEffect(() => {
    const unsubscribe = postCreatedEvents.subscribe(post => {
      vm.prependPost(post);
    });
    return unsubscribe;
  }, [vm]);

  const goToCreatePost = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_POST);
  }, [navigation]);

  // Navigate to user profile
  const navigateToProfile = useCallback((userId: string) => {
    navigation.navigate(ROUTES.PROFILE, { userId });
  }, [navigation]);

  const commentVm = useFeedCommentsViewModel({
    onCommentCountChange: vm.updateCommentCount,
  });

  // The comment sheet is shared by both video and text posts — look up
  // the active post in both lists so the comment count badge stays
  // accurate regardless of which type triggered it.
  const selectedCommentPost = useMemo(
     () => vm.posts.find(post => post.id === commentVm.selectedCommentPostId) ?? null,
     [vm.posts, commentVm.selectedCommentPostId],
  );

  const handleRetryComments = useCallback(() => {
    if (commentVm.selectedCommentPostId) {
      commentVm.openComments(commentVm.selectedCommentPostId);
    }
  }, [commentVm]);

  // Viewport tracking & Autoplay logic for ScrollView video cards
  const [videoSectionY, setVideoSectionY] = useState(0);
  const cardLayouts = useRef<Record<string, { y: number; height: number }>>({});
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const handleReportSectionY = useCallback((y: number) => {
    setVideoSectionY(y);
  }, []);

  const handleReportLayout = useCallback((id: string, y: number, height: number) => {
    cardLayouts.current[id] = { y, height };
  }, []);

  // ── Debounced scroll → activeVideoId ─────────────────────────────
  // Previously this ran `setActiveVideoId` on EVERY scroll event
  // (60×/sec), causing the entire feed to re-render continuously
  // while the user was scrolling and making ExoPlayer mount/unmount.
  //
  // Now we debounce: the calculation runs 150ms AFTER the last scroll
  // event, so activeVideoId only changes when the user pauses or
  // stops scrolling. During the scroll itself, zero re-renders.
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = useCallback((event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;

    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }

    scrollTimerRef.current = setTimeout(() => {
      const viewportHeight = Dimensions.get('window').height;
      const viewportCenter = scrollY + viewportHeight / 2;

      let closestId: string | null = null;
      let minDistance = Infinity;

      for (const [id, layout] of Object.entries(cardLayouts.current)) {
        const cardAbsoluteY = videoSectionY + layout.y;
        const cardCenter = cardAbsoluteY + layout.height / 2;
        const distance = Math.abs(viewportCenter - cardCenter);

        const isVisible =
          cardAbsoluteY + layout.height > scrollY &&
          cardAbsoluteY < scrollY + viewportHeight;

        if (isVisible && distance < minDistance) {
          minDistance = distance;
          closestId = id;
        }
      }

      setActiveVideoId(closestId);
    }, 150);
  }, [videoSectionY]);

  // Autoplay the first video on mount / load
  useEffect(() => {
    const firstVideo = vm.posts.find(p => p.kind === 'video');
    if (firstVideo && !activeVideoId) {
      setActiveVideoId(firstVideo.id);
    }
  }, [vm.posts, activeVideoId]);

  // ── Photo viewer state ───────────────────────────────────────────────
  // Set when the user taps a photo in a text post. Cleared by the modal's
  // close button or Android back press.
  const [photoViewer, setPhotoViewer] = useState<PhotoViewerState>(null);

  const handlePhotoPress = useCallback(
    (post: FeedTextPost, photoIndex: number) => {
      setPhotoViewer({ post, initialIndex: photoIndex });
    },
    [],
  );

  // Reaction picker state — anchored to whichever "Thích" button was
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
  const [sharingPost, setSharingPost] = useState<FeedPost | undefined>(undefined);
  const [sharingStory, setSharingStory] = useState<any | undefined>(undefined);

  const handleOpenPicker = useCallback(
    (postId: string, x: number, y: number) => {
      setPickerAnchor({ postId, x, y });
    },
    [],
  );

  const handlePickReaction = useCallback(
    (reaction: ReactionType) => {
      if (!pickerAnchor) return;
      vm.toggleReaction(pickerAnchor.postId, reaction);
      setPickerAnchor(null);
    },
    [pickerAnchor, vm],
  );

  // Share handlers
  const handleOpenSharePost = useCallback((post: FeedPost) => {
    setSharingPost(post);
    setShareModalVisible(true);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShareModalVisible(false);
    setTimeout(() => {
      setSharingPost(undefined);
      setSharingStory(undefined);
    }, 300); // Wait for animation
  }, []);

  const handleShareCopied = useCallback(() => {
    // Show toast or feedback when link is copied
    console.log('[Feed] Link copied to clipboard');
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <FeedHeader />
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-24"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          refreshControl={
            <RefreshControl
              refreshing={vm.isLoading && vm.posts.length > 0}
              onRefresh={vm.reloadPosts}
              tintColor="#0866FF"
            />
          }
        >
          <FilterTabs />
          <ComposerCard onPress={goToCreatePost} avatarUrl={userVm.user?.avatar} />
          <StoriesRow avatarUrl={userVm.user?.avatar} />
          <GreetingCard userName={userVm.user?.name} />
          <MergedFeed
            posts={vm.posts}
            isLoading={vm.isLoading}
            error={vm.error}
            onReact={vm.toggleReaction}
            onOpenPicker={handleOpenPicker}
            onCommentTap={commentVm.openComments}
            onShare={handleOpenSharePost}
            onPhotoPress={handlePhotoPress}
            activeVideoId={activeVideoId}
            onReportLayout={handleReportLayout}
            onReportSectionY={handleReportSectionY}
            gestureX={gestureX}
            gestureY={gestureY}
            gestureActive={gestureActive}
            navigateToProfile={navigateToProfile}
          />
        </ScrollView>
        <TouchableOpacity
          className="surface-brand absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full"
          activeOpacity={0.9}
        >
          <Edit3 size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <ReactionPickerOverlay
        anchor={pickerAnchor}
        onPick={handlePickReaction}
        onDismiss={() => setPickerAnchor(null)}
        gestureX={gestureX}
        gestureY={gestureY}
        gestureActive={gestureActive}
      />
      {/* ── Photo Viewer ── */}
      <PhotoViewerModal
        state={photoViewer}
        onClose={() => setPhotoViewer(null)}
        onReact={vm.toggleReaction}
        onCommentTap={commentVm.openComments}
        posts={vm.posts}
      />
      <ReelCommentsSheet
        visible={commentVm.isCommentsOpen}
        comments={commentVm.comments}
        commentCount={selectedCommentPost?.commentCount ?? commentVm.comments.length}
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
      />
      {/* ── Share Action Sheet ── */}
      <ShareActionSheet
        visible={shareModalVisible}
        onClose={handleCloseShareModal}
        post={sharingPost}
        onCopied={handleShareCopied}
      />
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

export default FeedScreen;
