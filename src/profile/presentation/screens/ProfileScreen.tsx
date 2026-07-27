// Description: Renders the Facebook-style profile screen with user-backed API data.
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  DeviceEventEmitter,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  BackHandler,
  InteractionManager,
  StatusBar,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Clock,
  Eye,
  FileText,
  Globe2,
  Heart,
  Link2,
  Mail,
  MapPin,
  MoreHorizontal,
  PlusCircle,
  Repeat2,
  Search,
  User,
  UserPlus,
  Users,
  UserCheck,
  Sparkles,
  UserRoundX,
  Verified,
  MessageCircle,
  ShoppingBag,
  ShoppingCart,
  Phone,
  UserMinus,
  X,
  Edit,
  SlidersHorizontal as Sliders,
} from 'lucide-react-native';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Reanimated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  FlashList,
  type ListRenderItemInfo as FlashListRenderItemInfo,
  type ViewToken as FlashListViewToken,
} from '@shopify/flash-list';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { launchImageLibrary } from 'react-native-image-picker';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { navigateToPostComments } from '../../../navigation/postNavigation';
import { navigateBackOrFeed } from '../../../navigation/profileBackNavigation';
import { usePostRealtimeScope } from '../../../feed/application/realtime/usePostRealtimeScope';
import { useDeferredVisiblePostIds } from '../../../feed/application/realtime/useDeferredVisiblePostIds';
import { useMainTabContentInsets } from '../../../navigation/useMainTabContentInsets';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { useProfileViewModel } from '../../application/view-models/useProfileViewModel';
import { setProfileConnectionsSnapshot } from '../../application/cache/profileConnectionsSnapshot';
import { resolveProfileOwnership } from '../../application/utils/profileOwnership';
import {
  mergeStoriesForProfile,
  resolveProfileAvatarViewDestination,
  shouldShowProfileStorySection,
} from '../../application/utils/profileStoryAvatarBehavior';
import { postCreatedEvents } from '../../../feed/application/events/postCreatedEvents';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import { useFeedCommentsViewModel } from '../../../feed/application/view-models/useFeedCommentsViewModel';
import {
  PhotoViewerModal,
  type PhotoViewerState,
} from '../../../shared-kernel/presentation/components/PhotoViewerModal';
import {
  FEED_COPY as POST_CARD_COPY,
  HomeVideoPostCard,
  formatCount,
  formatPostTime,
  getFeedVideoPosterCacheKeyForPost,
  publishFeedActiveVideo,
  publishFeedScrollBusy,
  publishFeedWarmVideoIds,
  ReactionPickerOverlay,
  TextPostCard,
} from '../../../feed/presentation/components/PostCards';
import PostReactionsSheet from '../../../feed/presentation/components/PostReactionsSheet';
import { ComposerCard } from '../../../feed/presentation/components/ComposerCard';
import { PollPostCard } from '../../../feed/presentation/components/PollPostCard';
import { LiveStreamPostCard } from '../../../feed/presentation/components/LiveStreamPostCard';
import { createPollRepository } from '../../../poll/infrastructure/repositories/ApiPollRepository';
import { useLiveViewModel } from '../../../live/application/view-models/useLiveViewModel';
import type { LiveStreamItem } from '../../../live/domain/types/live.types';
import { createStoriesRepository } from '../../../stories/infrastructure/repositories/ApiStoriesRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import {
  hiddenPostsStorage,
  LOCAL_POST_HIDDEN_EVENT,
} from '../../../feed/infrastructure/storage/hiddenPostsStorage';
import { ShareActionSheet } from '../../../shared-kernel/presentation/components/ShareActionSheet';
import { PostMenuActionSheet } from '../../../shared-kernel/presentation/components/PostMenuActionSheet';
import { showSnackbar as showToast } from '../../../shared-kernel/presentation/components/Snackbar';
import { EditProfileActionSheet } from '../../../shared-kernel/presentation/components/EditProfileActionSheet';
import { StoryOptionsSheet } from '../../../shared-kernel/presentation/components/StoryOptionsSheet';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { getPokeCopy } from '../../../poke/application/i18n/pokeCopy';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { COUNTRY_OPTIONS } from '../../../settings/domain/constants/countries';
import { ReelCommentsSheet } from '../../../reels/presentation/components/ReelCommentsSheet';
import { tabBarVisibility } from '../../../navigation/tabBarVisibility';
import {
  createNativeTabScrollPublisherState,
  publishNativeTabScrollBehavior,
  publishNativeTabScrollIntent,
} from '../../../navigation/nativeTabScrollPublisher';
import type {
  FeedPollPost,
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
} from '../../../feed/domain/types/feed.types';
import { isFeedPostShareable } from '../../../feed/domain/policies/feedPostPrivacy';
import type { SharePostInput } from '../../../feed/domain/repositories/FeedRepository';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type { StoryItem } from '../../../stories/domain/types/stories.types';
import { useStoryCoverImageUri } from '../../../stories/presentation/hooks/useStoryCoverImageUri';
import type { ChatItem } from '../../../messages/domain/types/messages.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  ImageCropperModal,
  type CropSourceImage,
  type CroppedImageAsset,
  type ImageCropTarget,
} from '../../../shared-kernel/presentation/components/ImageCropperModal';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import {
  createCachedVideoPosterThumbnail,
  getCachedVideoPosterThumbnail,
} from '../../../shared-kernel/application/utils/videoThumbnails';
import { PROFILE_COVER_ASPECT_RATIO } from '../../../shared-kernel/application/constants/profileImageGeometry';

type ProfileNav = NativeStackNavigationProp<RootStackParamList>;
type ProfileFeedPost = FeedTextPost | FeedVideoPost | FeedPollPost;
type ProfileListItem =
  | { type: 'state' }
  | { type: 'live'; item: LiveStreamItem }
  | { type: 'post'; post: ProfileFeedPost };
type ProfileRoute = RouteProp<
  RootStackParamList,
  typeof ROUTES.PROFILE | typeof ROUTES.USER_PROFILE
>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PROFILE_BACK_GESTURE_START_X = Platform.OS === 'android' ? 18 : 0;
const PROFILE_BACK_GESTURE_WIDTH = Platform.OS === 'android' ? 86 : 16;
const PROFILE_BACK_GESTURE_ACTIVE_OFFSET_X = Platform.OS === 'android' ? 8 : 14;
const PROFILE_BACK_GESTURE_FAIL_OFFSET_Y = Platform.OS === 'android' ? 18 : 14;
const PROFILE_BACK_GESTURE_DISTANCE_RATIO = 0.32;
const PROFILE_BACK_GESTURE_VELOCITY = 700;
const PROFILE_BACK_CLOSE_DURATION_MS = 180;
const PROFILE_BACK_CANCEL_DURATION_MS = 140;
const PROFILE_HEADER_BUTTON_HIT_SLOP = {
  top: 10,
  right: 10,
  bottom: 10,
  left: 10,
} as const;
const PROFILE_COVER_HEIGHT = SCREEN_WIDTH / PROFILE_COVER_ASPECT_RATIO;
const PROFILE_POST_MEDIA_HEIGHT = Math.min(
  320,
  Math.round(SCREEN_WIDTH * 0.62),
);
const PROFILE_POST_PAGE_SIZE = 20;
const PROFILE_IS_ANDROID = Platform.OS === 'android';
const PROFILE_POST_DRAW_DISTANCE = PROFILE_IS_ANDROID
  ? Math.max(1400, Math.round(SCREEN_HEIGHT * 1.8))
  : Math.max(2200, Math.round(SCREEN_HEIGHT * 2.6));
const PROFILE_POST_RECYCLE_POOL_SIZE = PROFILE_IS_ANDROID ? 8 : 14;
const PROFILE_POST_MAINTAIN_VISIBLE_CONTENT_POSITION = { disabled: true };
const PROFILE_POST_MEDIA_PREFETCH_BEHIND = 2;
const PROFILE_POST_MEDIA_PREFETCH_LOOKAHEAD = PROFILE_IS_ANDROID ? 8 : 12;
const PROFILE_POST_MEDIA_PREFETCH_LIMIT = PROFILE_IS_ANDROID ? 10 : 16;
const PROFILE_POST_VIDEO_WARM_BEHIND_ITEMS = PROFILE_IS_ANDROID ? 1 : 3;
const PROFILE_POST_VIDEO_WARM_AHEAD_ITEMS = PROFILE_IS_ANDROID ? 3 : 6;
const PROFILE_POST_VIDEO_WARM_MAX_COUNT = PROFILE_IS_ANDROID ? 1 : 2;
const PROFILE_POST_VIDEO_POSTER_PREFETCH_BEHIND_ITEMS = PROFILE_IS_ANDROID
  ? 1
  : 2;
const PROFILE_POST_VIDEO_POSTER_PREFETCH_AHEAD_ITEMS = PROFILE_IS_ANDROID
  ? 5
  : 8;
const PROFILE_POST_VIDEO_POSTER_PREFETCH_LIMIT = PROFILE_IS_ANDROID ? 2 : 3;
const PROFILE_POST_VIDEO_POSTER_PREFETCH_BATCH_DELAY_MS = PROFILE_IS_ANDROID
  ? 240
  : 180;
const PROFILE_POST_VIEWABLE_PERCENT = 55;
const PROFILE_POST_ACTIVE_DWELL_MS = 160;
const PROFILE_POST_MEDIA_PREFETCH_BATCH_SIZE = PROFILE_IS_ANDROID ? 2 : 3;
const PROFILE_POST_MEDIA_PREFETCH_BATCH_DELAY_MS = PROFILE_IS_ANDROID
  ? 140
  : 110;
const PROFILE_SCROLL_DIRECTION_THRESHOLD = 6;
const PROFILE_HEADER_HEIGHT = 48;
const PROFILE_SHEET_OPEN_DURATION_MS = 120;
const PROFILE_SHEET_CLOSE_DURATION_MS = 90;
const COUNTRY_NAME_BY_ID = new Map(
  COUNTRY_OPTIONS.map(country => [country.id, country.name]),
);

type ProfileScrollDirection = 'up' | 'down' | 'none';
type ProfileMediaSheetState = 'avatar' | 'cover' | null;
type ProfileMediaSheetTarget = NonNullable<ProfileMediaSheetState>;
type ProfileActivityItem = {
  id: string;
  Icon: typeof Clock;
  title: string;
  subtitle: string;
  color: string;
  backgroundColor: string;
};

function cleanProfileValue(value: unknown) {
  if (value === undefined || value === null) return '';
  const text = String(value).trim();
  if (
    !text ||
    text === '0' ||
    text === '0000-00-00' ||
    text.toLowerCase() === 'null'
  ) {
    return '';
  }
  return text;
}

function getCountryDisplayName(countryId: unknown) {
  const id = cleanProfileValue(countryId);
  if (!id) return '';
  return COUNTRY_NAME_BY_ID.get(id) ?? id;
}

function getGenderDisplayText(
  genderText: unknown,
  gender: unknown,
  language: AppLanguage,
) {
  const explicitText = cleanProfileValue(genderText);
  if (explicitText) return explicitText;

  const value = cleanProfileValue(gender).toLowerCase();
  if (!value) return '';
  if (value === 'male') return language === 'vi' ? 'Nam' : 'Male';
  if (value === 'female') return language === 'vi' ? 'Nữ' : 'Female';
  return cleanProfileValue(gender);
}

function formatBirthdayText(value: unknown, language: AppLanguage) {
  const text = cleanProfileValue(value);
  if (!text) return '';

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (!isoMatch) return text;

  const [, year, month, day] = isoMatch;
  return language === 'vi'
    ? `${Number(day)} tháng ${Number(month)}, ${year}`
    : `${Number(month)}/${Number(day)}/${year}`;
}

function getActivityDisplayText(
  lastSeenText: unknown,
  language: AppLanguage,
  activeNow: string,
) {
  const text = cleanProfileValue(lastSeenText);
  if (!text) return activeNow;

  const normalized = text.toLowerCase();
  if (
    normalized === 'now' ||
    normalized === 'bây giờ' ||
    normalized.includes('active now') ||
    normalized.includes('vừa xong')
  ) {
    return activeNow;
  }

  return language === 'vi' ? `Hoạt động ${text}` : `Active ${text}`;
}

function getProfilePostKindLabel(post: ProfileFeedPost, language: AppLanguage) {
  if (post.kind === 'video') return language === 'vi' ? 'video' : 'video';
  if (post.kind === 'poll') return language === 'vi' ? 'bình chọn' : 'poll';
  if (post.photos.length > 0) return language === 'vi' ? 'ảnh' : 'photo post';
  return language === 'vi' ? 'bài viết' : 'post';
}

function getProfilePostPreviewText(
  post: ProfileFeedPost,
  language: AppLanguage,
) {
  const caption =
    post.kind === 'poll' ? post.pollQuestion : cleanProfileValue(post.caption);

  if (caption) return caption;
  if (post.kind === 'video')
    return language === 'vi' ? 'Video đã đăng' : 'Posted video';
  if (post.kind === 'poll')
    return language === 'vi' ? 'Bình chọn đã đăng' : 'Posted poll';
  if (post.photos.length > 0) {
    return language === 'vi'
      ? `${post.photos.length} ảnh đã đăng`
      : `${post.photos.length} posted photos`;
  }

  return language === 'vi' ? 'Bài viết mới' : 'New post';
}

function isProfileFeedPost(post: FeedPost): post is ProfileFeedPost {
  return post.kind === 'text' || post.kind === 'video' || post.kind === 'poll';
}

function getProfileListItemPost(
  item?: ProfileListItem,
): ProfileFeedPost | null {
  return item?.type === 'post' ? item.post : null;
}

function isRemoteProfileMediaUrl(url?: string): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function collectProfilePostMediaUrls(post: ProfileFeedPost) {
  const urls: string[] = [];

  if (isRemoteProfileMediaUrl(post.publisher.avatarUrl)) {
    urls.push(post.publisher.avatarUrl);
  }

  if (post.kind === 'text') {
    post.photos.slice(0, 4).forEach(photo => {
      if (isRemoteProfileMediaUrl(photo)) urls.push(photo);
    });

    if (isRemoteProfileMediaUrl(post.linkPreview?.image)) {
      urls.push(post.linkPreview.image);
    }

    if (isRemoteProfileMediaUrl(post.sharedFrom?.publisherAvatar)) {
      urls.push(post.sharedFrom.publisherAvatar);
    }

    post.sharedFrom?.photos?.slice(0, 2).forEach(photo => {
      if (isRemoteProfileMediaUrl(photo)) urls.push(photo);
    });
  }

  if (post.kind === 'video') {
    if (isRemoteProfileMediaUrl(post.thumbnailUrl)) {
      urls.push(post.thumbnailUrl);
    }

    if (isRemoteProfileMediaUrl(post.linkPreview?.image)) {
      urls.push(post.linkPreview.image);
    }
  }

  return urls;
}

function getStoryTimeText(
  story: StoryItem | null | undefined,
  lang: AppLanguage,
): string {
  const rawStory = story as any;
  const rawTime = Number(
    rawStory?.time ??
      rawStory?.createdAt ??
      rawStory?.created_at ??
      rawStory?.postedAt ??
      rawStory?.posted_at ??
      0,
  );
  if (!Number.isFinite(rawTime) || rawTime <= 0) {
    return lang === 'vi' ? 'Vừa xong' : 'Just now';
  }

  const timestamp = rawTime > 1_000_000_000_000 ? rawTime / 1000 : rawTime;
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (diff < 60) return lang === 'vi' ? 'Vừa xong' : 'Just now';
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return lang === 'vi' ? `${minutes} phút trước` : `${minutes}m ago`;
  }
  const hours = Math.floor(diff / 3600);
  return lang === 'vi' ? `${hours} giờ trước` : `${hours}h ago`;
}
const PROFILE_COPY: Record<
  AppLanguage,
  {
    userFallback: string;
    dashboard: string;
    addToStory: string;
    cartLabel: string;
    followed: string;
    followActionsTitle: string;
    followActionsSubtitle: string;
    unfollow: string;
    blockUser: string;
    unfollowHint: string;
    blockHint: string;
    blockTitle: string;
    blockConfirm: (name: string) => string;
    blockSuccess: string;
    unfollowSuccess: string;
    unfollowError: string;
    blockError: string;
    message: string;
    poke: string;
    requestSent: string;
    sending: string;
    follow: string;
    stories: string;
    storySegments: (count: number) => string;
    viewStory: string;
    createStory: string;
    details: string;
    member: string;
    vipMember: string;
    worksAt: (value: string) => string;
    livesAt: (value: string) => string;
    activeNow: string;
    followersText: (count: number) => string;
    followingText: (count: number) => string;
    pointsText: (count: number) => string;
    editPublicDetails: string;
    editProfileSheetTitle: string;
    editProfileSheetSubtitle: string;
    changeCoverLabel: string;
    changeCoverHint: string;
    editDetailsLabel: string;
    editDetailsHint: string;
    sheetCancel: string;
    viewStoryAction: string;
    viewStoryHint: string;
    viewProfileAction: string;
    viewProfileHint: string;
    storySheetTitle: (name: string) => string;
    storySheetSubtitle: string;
    friends: string;
    findFriends: string;
    friendFallback: string;
    seeAll: string;
    composerPlaceholder: string;
    goLive: string;
    photoVideo: string;
    lifeEvent: string;
    posts: string;
    manage: string;
    loadPostsError: string;
    noPosts: string;
    edit: string;
    avatarOptionsTitle: string;
    avatarSheetTitle: string;
    avatarSheetSubtitle: string;
    viewAvatarLabel: string;
    viewAvatarHint: string;
    cancel: string;
    errorTitle: string;
    reactionError: string;
    voteError: string;
    connectError: string;
    pokeSuccessTitle: string;
    pokeSuccessMessage: (name: string) => string;
    pokeError: string;
  }
> = {
  vi: {
    userFallback: 'Người dùng',
    dashboard: 'Chỉnh sửa',
    addToStory: 'Các hoạt động',
    cartLabel: 'Giỏ hàng',
    followed: 'Đã theo dõi',
    followActionsTitle: 'Đã theo dõi',
    followActionsSubtitle: 'Bạn muốn làm gì với người dùng này?',
    unfollow: 'Hủy theo dõi',
    blockUser: 'Chặn người dùng',
    unfollowHint: 'Ngừng theo dõi tài khoản này',
    blockHint: 'Ngăn người này xem hoặc nhắn tin cho bạn',
    blockTitle: 'Chặn người dùng',
    blockConfirm: name => `Bạn có chắc muốn chặn ${name}?`,
    blockSuccess: 'Đã chặn người dùng.',
    unfollowSuccess: 'Đã hủy theo dõi.',
    unfollowError: 'Không thể hủy theo dõi. Vui lòng thử lại.',
    blockError: 'Không thể chặn người dùng. Vui lòng thử lại.',
    message: 'Nhắn tin',
    poke: 'Chọc',
    requestSent: 'Đã gửi yêu cầu',
    sending: 'Đang gửi...',
    follow: 'Theo dõi',
    stories: 'Tin',
    storySegments: count => `${count} đoạn tin`,
    viewStory: 'Xem tin',
    createStory: 'Tạo tin',
    details: 'Thông tin cá nhân',
    member: 'Thành viên',
    vipMember: 'Thành viên VIP Member',
    worksAt: value => `Làm việc tại ${value}`,
    livesAt: value => `Sống tại ${value}`,
    activeNow: 'Đang hoạt động',
    followersText: count => `Có ${count} người theo dõi`,
    followingText: count => `Đang theo dõi ${count} người`,
    pointsText: count => `Tích lũy ${count} điểm`,
    editPublicDetails: 'Chỉnh sửa chi tiết công khai',
    editProfileSheetTitle: 'Chỉnh sửa hồ sơ',
    editProfileSheetSubtitle: 'Bạn muốn thay đổi điều gì?',
    changeCoverLabel: 'Thay đổi ảnh bìa',
    changeCoverHint: 'Cập nhật ảnh nền của bạn',
    editDetailsLabel: 'Chỉnh sửa thông tin',
    editDetailsHint: 'Tên, tiểu sử, công việc...',
    sheetCancel: 'Hủy',
    viewStoryAction: 'Xem tin',
    viewStoryHint: 'Xem tin của họ',
    viewProfileAction: 'Xem trang cá nhân',
    viewProfileHint: 'Mở hồ sơ của họ',
    storySheetTitle: name => `Tin của ${name}`,
    storySheetSubtitle: 'Bạn muốn làm gì?',
    friends: 'Bạn bè',
    findFriends: 'Tìm bạn bè',
    friendFallback: 'Bạn bè',
    seeAll: 'Xem tất cả',
    composerPlaceholder: 'Bạn đang nghĩ gì?',
    goLive: 'Phát trực tiếp',
    photoVideo: 'ảnh/video',
    lifeEvent: 'Sự kiện trong đời',
    posts: 'Bài viết',
    manage: 'Quản lý',
    loadPostsError: 'Lỗi tải bài viết',
    noPosts: 'Chưa có bài viết nào',
    edit: 'Chỉnh sửa',
    avatarOptionsTitle: 'Tùy chọn ảnh đại diện',
    avatarSheetTitle: 'Tùy chọn',
    avatarSheetSubtitle: 'Bạn muốn làm gì?',
    viewAvatarLabel: 'Xem ảnh đại diện',
    viewAvatarHint: 'Mở ảnh đại diện',
    cancel: 'Hủy',
    errorTitle: 'Lỗi',
    reactionError: 'Không thể cập nhật cảm xúc. Vui lòng thử lại.',
    voteError: 'Không thể gửi phiếu bầu. Vui lòng thử lại.',
    connectError: 'Không thể gửi lời mời kết bạn. Vui lòng thử lại.',
    pokeSuccessTitle: 'Đã chọc',
    pokeSuccessMessage: name => `Bạn đã chọc ${name}.`,
    pokeError: 'Không thể chọc người dùng này lúc này.',
  },
  en: {
    userFallback: 'User',
    dashboard: 'Edit',
    addToStory: 'Activities',
    cartLabel: 'Cart',
    followed: 'Following',
    followActionsTitle: 'Following',
    followActionsSubtitle: 'What would you like to do with this user?',
    unfollow: 'Unfollow',
    blockUser: 'Block user',
    unfollowHint: 'Stop following this account',
    blockHint: 'Prevent this person from viewing or messaging you',
    blockTitle: 'Block user',
    blockConfirm: name => `Are you sure you want to block ${name}?`,
    blockSuccess: 'User blocked.',
    unfollowSuccess: 'Unfollowed successfully.',
    unfollowError: 'Could not unfollow. Please try again.',
    blockError: 'Could not block this user. Please try again.',
    message: 'Message',
    poke: 'Poke',
    requestSent: 'Request sent',
    sending: 'Sending...',
    follow: 'Follow',
    stories: 'Stories',
    storySegments: count => `${count} stories`,
    viewStory: 'View story',
    createStory: 'Create story',
    details: 'Personal information',
    member: 'Member',
    vipMember: 'VIP Member',
    worksAt: value => `Works at ${value}`,
    livesAt: value => `Lives in ${value}`,
    activeNow: 'Active now',
    followersText: count => `${count} followers`,
    followingText: count => `Following ${count}`,
    pointsText: count => `${count} points`,
    editPublicDetails: 'Edit public details',
    editProfileSheetTitle: 'Edit Profile',
    editProfileSheetSubtitle: 'What would you like to change?',
    changeCoverLabel: 'Change Cover Photo',
    changeCoverHint: 'Update your background image',
    editDetailsLabel: 'Edit Details',
    editDetailsHint: 'Name, bio, work...',
    sheetCancel: 'Cancel',
    viewStoryAction: 'View story',
    viewStoryHint: 'Watch their story',
    viewProfileAction: 'View profile',
    viewProfileHint: 'Open their profile',
    storySheetTitle: name => `${name}'s Story`,
    storySheetSubtitle: 'What would you like to do?',
    friends: 'Friends',
    findFriends: 'Find friends',
    friendFallback: 'Friend',
    seeAll: 'See all',
    composerPlaceholder: "What's on your mind?",
    goLive: 'Live',
    photoVideo: 'Photo/video',
    lifeEvent: 'Life event',
    posts: 'Posts',
    manage: 'Manage',
    loadPostsError: 'Could not load posts',
    noPosts: 'No posts yet',
    edit: 'Edit',
    avatarOptionsTitle: 'Profile picture options',
    avatarSheetTitle: 'Options',
    avatarSheetSubtitle: 'What would you like to do?',
    viewAvatarLabel: 'View profile picture',
    viewAvatarHint: 'Open their avatar',
    cancel: 'Cancel',
    errorTitle: 'Error',
    reactionError: 'Could not update reaction. Please try again.',
    voteError: 'Could not submit vote. Please try again.',
    connectError: 'Could not send friend request. Please try again.',
    pokeSuccessTitle: 'Poked',
    pokeSuccessMessage: name => `You poked ${name}.`,
    pokeError: 'Could not poke this user right now.',
  },
};

function apiSucceeded(value: unknown) {
  return (
    value === 200 || value === '200' || value === true || value === 'success'
  );
}

const FALLBACK_COVER =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCNqLNeeWsi7Qk4abx08XCTrKI5CmUGgDCiX-kH7Y_8LIIX5Slo9GRgEra_4deGp5e9pYozUmQdYGZi1sNQSks0QtbNWgpmn5gJgrF62Z8I8UMQpqKiMHLQ8Rzd9oUUIITFJPuwExVflVdeB1fRKjSGDO7zAocaZElLgpqJr6Mjvoj2FKOUVfnTk8XxnkG5WNijLpmXavW9TFlNhtlfLYbSE2qofOA8or7d_AfsUWZV43ADdtVFNH7VwEEazqapaL-Vndqksu_vDnE';
const FALLBACK_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBg12HbWQ9COz6EW-AyHRwh6TTRPdTun5HWxmzi1GHtkTwHjsF2VhXQV6yg-mCV0YYTXBDcEOCpZdcTGiCK1PpdUNPDQs6XTApo0nb_7Vi7IJPOfkXwbA1cq6d18Fft2V5ELBI4ZKLT6lvpj4O-9EBj3u3QfGt-Dzy_wf-DNRLwVAEeuaiEJ4B2Fvch4B0S9tk5tMCvbYQwuzGl0ttLC2hVIJh1Oj6Dn4dp6ueFANa1Yxy__ZIQLHKmtsMh2U8NBz0DLPHRlOZOzF4';
const profilePostStyles = StyleSheet.create({
  stateCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E6EB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    color: '#65676B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E4E6EB',
    marginBottom: 8,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  author: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginRight: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  authorText: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    color: '#050505',
    fontSize: 14,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    color: '#65676B',
    fontSize: 12,
    marginRight: 4,
  },
  moreButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    color: '#050505',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  mediaWrap: {
    marginTop: 8,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  mediaImage: {
    width: '100%',
    height: PROFILE_POST_MEDIA_HEIGHT,
    backgroundColor: '#F1F5F9',
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  gridImage: {
    flex: 1,
    height: 160,
    backgroundColor: '#F1F5F9',
  },
  videoWrap: {
    width: '100%',
    height: PROFILE_POST_MEDIA_HEIGHT,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  videoThumb: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.72,
  },
  playBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    marginTop: 12,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  likeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  reactionBadgeEmoji: {
    fontSize: 10,
    lineHeight: 13,
  },
  summaryText: {
    color: '#65676B',
    fontSize: 12,
    marginLeft: 6,
  },
  actionRow: {
    marginTop: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  actionEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  reactionPicker: {
    position: 'absolute',
    left: 14,
    bottom: 46,
    zIndex: 20,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 12,
  },
  reactionPickerItem: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  reactionPickerItemActive: {
    backgroundColor: '#EEF4FF',
  },
  reactionPickerEmoji: {
    fontSize: 28,
    lineHeight: 32,
  },
});

const profileStoryStyles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#E4E6EB',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  headerRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#050505',
    fontSize: 17,
    fontWeight: '700',
  },
  countText: {
    color: '#65676B',
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    width: 112,
    height: 170,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#E4E6EB',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  ring: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: APP_BRAND_COLOR,
    backgroundColor: '#FFFFFF',
    padding: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 26,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  playBadge: {
    position: 'absolute',
    top: 72,
    left: 41,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  label: {
    position: 'absolute',
    left: 9,
    right: 9,
    bottom: 9,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  createCard: {
    width: 112,
    height: 170,
    borderRadius: 0,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  createAvatar: {
    width: '100%',
    height: 116,
  },
  createBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  createPlus: {
    position: 'absolute',
    top: -16,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: APP_BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    marginTop: 14,
    color: '#050505',
    fontSize: 12,
    fontWeight: '700',
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonCard: {
    width: 112,
    height: 170,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#F0F2F5',
  },
  skeletonFooter: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
  },
  skeletonAvatar: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    padding: 2,
  },
});

function ProfileStoryCover({
  story,
  fallbackUri,
}: {
  story: StoryItem;
  fallbackUri: string;
}) {
  const coverUri = useStoryCoverImageUri({ story, fallbackUri });

  return (
    <Image
      source={{ uri: coverUri || fallbackUri || FALLBACK_AVATAR }}
      style={profileStoryStyles.cover}
      resizeMode="cover"
    />
  );
}

function updateProfileTopReactions(
  current: ReactionType[],
  previousReaction: ReactionType | null,
  nextReaction: ReactionType | null,
  nextLikeCount: number,
) {
  let next = [...(current ?? [])];

  if (previousReaction && previousReaction !== nextReaction) {
    next = next.filter(type => type !== previousReaction);
  }

  if (nextReaction && !next.includes(nextReaction)) {
    next = [nextReaction, ...next];
  }

  if (next.length === 0 && nextLikeCount > 0) {
    next = [nextReaction ?? previousReaction ?? 'like'];
  }

  return next.filter(Boolean).slice(0, 3);
}

function getOldestProfilePostId(posts: ProfileFeedPost[]) {
  const ids = posts
    .map(post => Number(post.id))
    .filter(id => Number.isFinite(id) && id > 0);
  return ids.length > 0 ? String(Math.min(...ids)) : undefined;
}

// Skeleton Loading Component with pulse animation
function SkeletonBlock({
  height,
  width,
  borderRadius,
}: {
  height: number | string;
  width?: number | string;
  borderRadius?: number;
}) {
  const pulseAnim = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View
      style={[
        {
          height: height as number,
          width: (width as number) ?? '100%',
          borderRadius: borderRadius ?? 8,
          backgroundColor: '#E4E6EB',
          overflow: 'hidden',
        },
        typeof width === 'string' && { width: width as any },
      ]}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: '#CBD5E1',
          opacity: pulseAnim,
        }}
      />
    </View>
  );
}

// Full Header Skeleton
function FullProfileSkeleton({
  onBack,
}: {
  onBack: () => void;
}) {
  const skeletonSafeTopInset =
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

  return (
    <View className="flex-1 bg-[#F0F2F5]">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={profileMainStyles.coverContainer}>
          <SkeletonBlock
            height={PROFILE_COVER_HEIGHT}
            width={SCREEN_WIDTH}
            borderRadius={0}
          />
          <View
            style={[
              profileMainStyles.headerOverlay,
              {
                paddingTop: skeletonSafeTopInset + 8,
                height: skeletonSafeTopInset + 48,
              },
            ]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Back"
              activeOpacity={0.8}
              hitSlop={PROFILE_HEADER_BUTTON_HIT_SLOP}
              onPress={onBack}
              style={profileMainStyles.circleButton}
            >
              <ArrowLeft size={18} color="#050505" />
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              <SkeletonBlock height={36} width={36} borderRadius={18} />
              <SkeletonBlock height={36} width={36} borderRadius={18} />
            </View>
          </View>
          <View style={[profileMainStyles.editCoverButton, { width: 154 }]}>
            <SkeletonBlock height={18} width={126} borderRadius={9} />
          </View>
        </View>

        <View style={profileMainStyles.profileInfoCard}>
          <View style={profileMainStyles.avatarRow}>
            <View style={profileMainStyles.avatarContainer}>
              <View className="h-[100px] w-[100px] overflow-hidden rounded-full border-4 border-white bg-white">
                <SkeletonBlock height={100} width={100} borderRadius={50} />
              </View>
              <View style={profileMainStyles.avatarCameraBadge}>
                <SkeletonBlock height={16} width={16} borderRadius={8} />
              </View>
            </View>
            <View style={profileMainStyles.identityBesideAvatar}>
              <SkeletonBlock height={26} width="72%" borderRadius={8} />
            </View>
          </View>

          <View style={profileMainStyles.profileStatsFullWidth}>
            <SkeletonBlock height={16} width="92%" borderRadius={6} />
          </View>
          <View style={profileMainStyles.followerPreviewRow}>
            <View style={profileMainStyles.followerAvatarStack}>
              {[0, 1, 2].map((item, index) => (
                <View
                  key={`follower-preview-skeleton-${item}`}
                  style={[
                    profileMainStyles.followerAvatarWrap,
                    index > 0 && profileMainStyles.followerAvatarOverlap,
                  ]}
                >
                  <SkeletonBlock height={34} width={34} borderRadius={17} />
                </View>
              ))}
            </View>
            <View className="ml-2">
              <SkeletonBlock height={14} width={132} borderRadius={6} />
            </View>
          </View>

          <View style={profileMainStyles.primaryButtonsRow}>
            <View style={profileMainStyles.dashboardButton}>
              <SkeletonBlock height={18} width="70%" borderRadius={9} />
            </View>
            <View
              style={[
                profileMainStyles.storyAddButton,
                profileMainStyles.activitiesActionButton,
              ]}
            >
              <SkeletonBlock height={18} width="72%" borderRadius={9} />
            </View>
            <View
              style={[
                profileMainStyles.storyAddButton,
                profileMainStyles.cartActionButton,
              ]}
            >
              <SkeletonBlock height={18} width="70%" borderRadius={9} />
            </View>
          </View>
        </View>

        <View className="h-px bg-[#E4E6EB]" />

        <View style={profileMainStyles.profileOverviewSection}>
          <View className="mb-3 flex-row items-center justify-between">
            <SkeletonBlock height={22} width={168} borderRadius={7} />
            <SkeletonBlock height={34} width={34} borderRadius={17} />
          </View>
          {[0, 1, 2].map(item => (
            <View
              key={`detail-skeleton-${item}`}
              className="mb-2 flex-row items-center"
            >
              <SkeletonBlock height={18} width={18} borderRadius={7} />
              <View className="ml-3 flex-1">
                <SkeletonBlock height={15} width="68%" borderRadius={6} />
              </View>
            </View>
          ))}
          <View className="mt-1">
            <SkeletonBlock height={16} width={124} borderRadius={7} />
          </View>
        </View>

        <View style={profileMainStyles.postsHeader}>
          <View>
            <SkeletonBlock height={22} width={74} borderRadius={8} />
            <View className="mt-2">
              <SkeletonBlock height={3} width={34} borderRadius={2} />
            </View>
          </View>
          <SkeletonBlock height={30} width={118} borderRadius={15} />
        </View>
        <PostSkeletonCard />
      </ScrollView>
    </View>
  );
}

function PostSkeletonCard() {
  return (
    <View className="w-full bg-white mb-2 p-4 border-t border-b border-[#E4E6EB]">
      <View className="flex-row items-center">
        <SkeletonBlock height={38} width={38} borderRadius={19} />
        <View className="ml-3 flex-1 space-y-1">
          <SkeletonBlock height={14} width={120} borderRadius={4} />
          <SkeletonBlock height={10} width={80} borderRadius={3} />
        </View>
      </View>
      <View className="mt-3.5 space-y-2">
        <SkeletonBlock height={14} width="90%" borderRadius={4} />
        <SkeletonBlock height={14} width="70%" borderRadius={4} />
      </View>
      <View className="mt-3.5">
        <SkeletonBlock height={180} borderRadius={8} />
      </View>
    </View>
  );
}

function ProfileScreen() {
  const language = useAppLanguage();
  const copy = PROFILE_COPY[language];
  const postCardCopy = POST_CARD_COPY[language];
  const pokeCopy = getPokeCopy(language);
  const insets = useSafeAreaInsets();
  const { bottomContentPadding, scrollIndicatorBottomInset } =
    useMainTabContentInsets();
  const safeTopInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight ?? 24
      : 44;
  const profileHeaderHeight = safeTopInset + PROFILE_HEADER_HEIGHT;
  const navigation = useNavigation<ProfileNav>();
  const route = useRoute<ProfileRoute>();
  const isProfileFocused = useIsFocused();
  const {
    profile,
    followers,
    following,
    isLoading,
    loadProfile,
    toggleFollow,
    pokeUser,
    updateAvatar,
    updateCover,
  } = useProfileViewModel();

  const session = sessionStorage.getSession();
  const currentUserId = session?.userId;
  const targetUserId = route.params?.userId ?? currentUserId ?? profile?.id;
  const isOwnProfile = resolveProfileOwnership({
    currentUserId,
    routeUserId: route.params?.userId,
    loadedProfileId: profile?.id,
  });
  const profileLiveVm = useLiveViewModel({
    enabled: Boolean(targetUserId) && isProfileFocused,
    userId: targetUserId ? String(targetUserId) : undefined,
    refreshIntervalMs: 10_000,
  });
  const activeProfileLive = useMemo(() => {
    return (
      [...profileLiveVm.liveStreams]
        .filter(item => item.state !== 'offline')
        .sort((left, right) => {
          if (left.state === 'live' && right.state !== 'live') return -1;
          if (left.state !== 'live' && right.state === 'live') return 1;
          return (
            new Date(right.startedAt).getTime() -
            new Date(left.startedAt).getTime()
          );
        })[0] ?? null
    );
  }, [profileLiveVm.liveStreams]);

  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);
  const [isLoadingCover, setIsLoadingCover] = useState(false);
  const [profileCropRequest, setProfileCropRequest] = useState<{
    target: ImageCropTarget;
    image: CropSourceImage;
  } | null>(null);
  const [isRelationshipSheetVisible, setRelationshipSheetVisible] =
    useState(false);
  const [relationshipAction, setRelationshipAction] = useState<
    'unfollow' | 'block' | null
  >(null);

  const [posts, setPosts] = useState<ProfileFeedPost[]>([]);
  const {
    postIds: realtimeVisiblePostIds,
    schedulePostIds: scheduleRealtimeVisiblePostIds,
  } = useDeferredVisiblePostIds();
  const profilePostsRef = useRef<ProfileFeedPost[]>([]);
  const profilePostIndexByIdRef = useRef<Map<string, number>>(new Map());
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [postsCursor, setPostsCursor] = useState<string | undefined>(undefined);
  const isLoadingMorePostsRef = React.useRef(false);
  const activeProfileVideoIdRef = useRef<string | null>(null);
  const pendingProfileActiveVideoIdRef = useRef<string | null>(null);
  const pendingProfileDwellVideoIdRef = useRef<string | null>(null);
  const profileVideoDwellTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const profilePrefetchedMediaUrlsRef = useRef<Set<string>>(new Set());
  const profileQueuedMediaUrlsRef = useRef<Set<string>>(new Set());
  const profilePendingMediaUrlsRef = useRef<string[]>([]);
  const profileMediaPrefetchTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const profilePrefetchedVideoPosterKeysRef = useRef<Set<string>>(new Set());
  const profileQueuedVideoPosterKeysRef = useRef<Set<string>>(new Set());
  const profilePendingVideoPosterPostsRef = useRef<FeedVideoPost[]>([]);
  const profileVideoPosterPrefetchTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const profileVideoPosterPrefetchTaskRef = useRef<ReturnType<
    typeof InteractionManager.runAfterInteractions
  > | null>(null);
  const profileScrollYRef = useRef(0);
  const profileHeaderSolidRef = useRef(false);
  const profileHeaderSolidProgress = useRef(new Animated.Value(0)).current;
  const isProfileScrollingRef = useRef(false);
  const isProfileMomentumScrollingRef = useRef(false);
  const profileScrollDirectionRef = useRef<ProfileScrollDirection>('none');
  const profileViewportHeightRef = useRef(0);
  const nativeTabScrollPublisherStateRef = useRef(
    createNativeTabScrollPublisherState(),
  );
  const [postsError, setPostsError] = useState<string | null>(null);
  const [userStory, setUserStory] = useState<StoryItem | null>(null);
  const [allStories, setAllStories] = useState<StoryItem[]>([]);
  const [isStoryLoading, setIsStoryLoading] = useState(false);
  const [isPersonalDetailsExpanded, setPersonalDetailsExpanded] =
    useState(false);
  const [isProfileHeaderSolid, setProfileHeaderSolid] = useState(false);
  const [isActivitiesSheetVisible, setActivitiesSheetVisible] = useState(false);
  const [isConnectLoading, setIsConnectLoading] = useState(false);
  const [isPokeLoading, setIsPokeLoading] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<PhotoViewerState>(null);
  const openingPhotoViewerRef = useRef(false);
  const photoPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [pickerAnchor, setPickerAnchor] = useState<{
    postId: string;
    x: number;
    y: number;
  } | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [profileMediaSheet, setProfileMediaSheet] =
    useState<ProfileMediaSheetState>(null);
  const profileMediaSheetProgress = useRef(new Animated.Value(0)).current;
  const activitiesSheetProgress = useRef(new Animated.Value(0)).current;
  const [shouldRenderActivitiesList, setShouldRenderActivitiesList] =
    useState(false);

  // Note: tab bar is hidden via direct tabBarVisibility calls in each handler below.
  const [storyOptionsSheet, setStoryOptionsSheet] = useState<StoryItem | null>(
    null,
  );
  const [sharingPost, setSharingPost] = useState<FeedPost | undefined>(
    undefined,
  );
  const [postMenuVisible, setPostMenuVisible] = useState(false);
  const [selectedPostForMenu, setSelectedPostForMenu] =
    useState<FeedPost | null>(null);
  const canDeleteSelectedPost =
    selectedPostForMenu?.permissions?.canDelete === true;
  const [reactionsSheetVisible, setReactionsSheetVisible] = useState(false);
  const [reactionsSheetPostId, setReactionsSheetPostId] = useState<
    string | null
  >(null);

  const openReactionsSheet = useCallback((postId: string, _post: FeedPost) => {
    setReactionsSheetPostId(postId);
    setReactionsSheetVisible(true);
  }, []);

  const closeReactionsSheet = useCallback(() => {
    setReactionsSheetVisible(false);
  }, []);
  const filteredProfilePosts = useMemo(
    () => hiddenPostsStorage.filterVisiblePosts(posts, currentUserId),
    [currentUserId, posts],
  );

  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const hasDragged = useSharedValue(false);
  const profileBackTranslateX = useSharedValue(0);
  const profileBackClosing = useSharedValue(false);

  const feedRepo = useMemo(() => createFeedRepository(), []);
  const pollRepo = useMemo(() => createPollRepository(), []);
  const storiesRepo = useMemo(() => createStoriesRepository(), []);
  const updateProfileCommentCount = useCallback(
    (postId: string, delta: number) => {
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? { ...post, commentCount: Math.max(0, post.commentCount + delta) }
            : post,
        ),
      );
    },
    [],
  );
  const commentVm = useFeedCommentsViewModel({
    onCommentCountChange: updateProfileCommentCount,
  });

  useEffect(() => {
    const profileUserId = targetUserId ?? currentUserId ?? profile?.id;
    if (!profileUserId) return undefined;

    return postCreatedEvents.subscribe(post => {
      if (!isProfileFeedPost(post)) return;
      if (String(post.publisher.id) !== String(profileUserId)) return;

      setPosts(prev => [
        post,
        ...prev.filter(existingPost => existingPost.id !== post.id),
      ]);
      setPostsError(null);
    });
  }, [currentUserId, profile?.id, targetUserId]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const syncCurrentUserAvatar = (
      cachedProfile: ReturnType<typeof sessionStorage.getUserProfile>,
    ) => {
      const avatarUrl = cachedProfile?.avatarUrl;
      if (!avatarUrl) return;

      setPosts(previousPosts => {
        let changed = false;
        const nextPosts = previousPosts.map(post => {
          if (
            String(post.publisher?.id) !== String(currentUserId) ||
            post.publisher.avatarUrl === avatarUrl
          ) {
            return post;
          }

          changed = true;
          return {
            ...post,
            publisher: {
              ...post.publisher,
              avatarUrl,
            },
          };
        });

        if (changed) {
          profilePostsRef.current = nextPosts;
        }
        return changed ? nextPosts : previousPosts;
      });
    };

    syncCurrentUserAvatar(sessionStorage.getUserProfile());
    return sessionStorage.subscribeToUserProfile(syncCurrentUserAvatar);
  }, [currentUserId]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;

    return () => {
      publishNativeTabScrollBehavior('onScrollDown');
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'ios') return undefined;

      return () => {
        publishNativeTabScrollBehavior('onScrollDown');
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      profileBackTranslateX.value = 0;
      profileBackClosing.value = false;
      return undefined;
    }, [profileBackClosing, profileBackTranslateX]),
  );

  const setActiveProfileVideoId = useCallback((nextVideoId: string | null) => {
    publishFeedActiveVideo(nextVideoId);
    if (activeProfileVideoIdRef.current === nextVideoId) return;
    activeProfileVideoIdRef.current = nextVideoId;
  }, []);

  const clearProfileVideoDwellTimer = useCallback(() => {
    if (!profileVideoDwellTimerRef.current) return;
    clearTimeout(profileVideoDwellTimerRef.current);
    profileVideoDwellTimerRef.current = null;
    pendingProfileDwellVideoIdRef.current = null;
  }, []);

  const scheduleActiveProfileVideoId = useCallback(
    (nextVideoId: string | null, commitImmediately = false) => {
      if (nextVideoId === activeProfileVideoIdRef.current) {
        clearProfileVideoDwellTimer();
        return;
      }

      if (commitImmediately || nextVideoId === null) {
        clearProfileVideoDwellTimer();
        setActiveProfileVideoId(nextVideoId);
        return;
      }

      if (
        pendingProfileDwellVideoIdRef.current === nextVideoId &&
        profileVideoDwellTimerRef.current
      ) {
        return;
      }

      clearProfileVideoDwellTimer();
      pendingProfileDwellVideoIdRef.current = nextVideoId;
      profileVideoDwellTimerRef.current = setTimeout(() => {
        profileVideoDwellTimerRef.current = null;
        if (pendingProfileDwellVideoIdRef.current !== nextVideoId) return;
        pendingProfileDwellVideoIdRef.current = null;
        setActiveProfileVideoId(nextVideoId);
      }, PROFILE_POST_ACTIVE_DWELL_MS);
    },
    [clearProfileVideoDwellTimer, setActiveProfileVideoId],
  );

  const profilePostsViewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: PROFILE_POST_VIEWABLE_PERCENT,
    minimumViewTime: 0,
  });

  const scheduleProfileMediaPrefetchFlush = useCallback(() => {
    if (profileMediaPrefetchTimerRef.current) return;

    profileMediaPrefetchTimerRef.current = setTimeout(() => {
      profileMediaPrefetchTimerRef.current = null;
      const nextUrls = profilePendingMediaUrlsRef.current.splice(
        0,
        PROFILE_POST_MEDIA_PREFETCH_BATCH_SIZE,
      );

      nextUrls.forEach(url => {
        profileQueuedMediaUrlsRef.current.delete(url);
        Image.prefetch(url).catch(() => {
          profilePrefetchedMediaUrlsRef.current.delete(url);
        });
      });

      if (profilePendingMediaUrlsRef.current.length > 0) {
        scheduleProfileMediaPrefetchFlush();
      }
    }, PROFILE_POST_MEDIA_PREFETCH_BATCH_DELAY_MS);
  }, []);

  const queueProfileMediaPrefetch = useCallback(
    (urls: string[]) => {
      if (urls.length === 0) return;

      let queuedAny = false;
      urls.forEach(url => {
        if (profilePrefetchedMediaUrlsRef.current.has(url)) return;
        if (profileQueuedMediaUrlsRef.current.has(url)) return;

        profilePrefetchedMediaUrlsRef.current.add(url);
        profileQueuedMediaUrlsRef.current.add(url);
        profilePendingMediaUrlsRef.current.push(url);
        queuedAny = true;
      });

      if (queuedAny) {
        scheduleProfileMediaPrefetchFlush();
      }
    },
    [scheduleProfileMediaPrefetchFlush],
  );

  const scheduleProfileVideoPosterPrefetchFlush = useCallback(() => {
    if (
      profileVideoPosterPrefetchTimerRef.current ||
      profileVideoPosterPrefetchTaskRef.current
    ) {
      return;
    }

    profileVideoPosterPrefetchTimerRef.current = setTimeout(() => {
      profileVideoPosterPrefetchTimerRef.current = null;
      const nextPosts = profilePendingVideoPosterPostsRef.current.splice(
        0,
        PROFILE_POST_VIDEO_POSTER_PREFETCH_LIMIT,
      );
      if (nextPosts.length === 0) return;

      profileVideoPosterPrefetchTaskRef.current =
        InteractionManager.runAfterInteractions(() => {
          profileVideoPosterPrefetchTaskRef.current = null;

          nextPosts.forEach(post => {
            const videoUrl = post.videoUrl?.trim();
            if (!videoUrl || post.thumbnailUrl?.trim()) return;

            const cacheKey = getFeedVideoPosterCacheKeyForPost(
              post.id,
              videoUrl,
            );
            profileQueuedVideoPosterKeysRef.current.delete(cacheKey);
            if (getCachedVideoPosterThumbnail(videoUrl, cacheKey)?.uri) return;

            createCachedVideoPosterThumbnail(videoUrl, cacheKey).catch(
              () => undefined,
            );
          });

          if (profilePendingVideoPosterPostsRef.current.length > 0) {
            scheduleProfileVideoPosterPrefetchFlush();
          }
        });
    }, PROFILE_POST_VIDEO_POSTER_PREFETCH_BATCH_DELAY_MS);
  }, []);

  const queueProfileVideoPosterPrefetch = useCallback(
    (postsToPrefetch: FeedVideoPost[]) => {
      if (postsToPrefetch.length === 0) return;

      let queuedAny = false;
      for (const post of postsToPrefetch) {
        const videoUrl = post.videoUrl?.trim();
        if (!videoUrl || post.thumbnailUrl?.trim()) continue;

        const cacheKey = getFeedVideoPosterCacheKeyForPost(post.id, videoUrl);
        if (profilePrefetchedVideoPosterKeysRef.current.has(cacheKey)) continue;
        if (profileQueuedVideoPosterKeysRef.current.has(cacheKey)) continue;

        if (getCachedVideoPosterThumbnail(videoUrl, cacheKey)?.uri) {
          profilePrefetchedVideoPosterKeysRef.current.add(cacheKey);
          continue;
        }

        profilePrefetchedVideoPosterKeysRef.current.add(cacheKey);
        profileQueuedVideoPosterKeysRef.current.add(cacheKey);
        profilePendingVideoPosterPostsRef.current.push(post);
        queuedAny = true;
      }

      if (queuedAny) {
        scheduleProfileVideoPosterPrefetchFlush();
      }
    },
    [scheduleProfileVideoPosterPrefetchFlush],
  );

  const prefetchProfileVideoPostersInRange = useCallback(
    (startIndex: number, endIndex: number) => {
      const currentPosts = profilePostsRef.current;
      if (currentPosts.length === 0) return;

      const start = Math.max(0, startIndex);
      const end = Math.min(currentPosts.length, Math.max(start, endIndex));
      if (start >= end) return;

      const postsToPrefetch: FeedVideoPost[] = [];
      for (let index = start; index < end; index += 1) {
        const post = currentPosts[index];
        if (post?.kind !== 'video') continue;

        postsToPrefetch.push(post);
        if (
          postsToPrefetch.length >= PROFILE_POST_VIDEO_POSTER_PREFETCH_LIMIT
        ) {
          break;
        }
      }

      queueProfileVideoPosterPrefetch(postsToPrefetch);
    },
    [queueProfileVideoPosterPrefetch],
  );

  useEffect(
    () => () => {
      if (profileMediaPrefetchTimerRef.current) {
        clearTimeout(profileMediaPrefetchTimerRef.current);
        profileMediaPrefetchTimerRef.current = null;
      }
      if (profileVideoPosterPrefetchTimerRef.current) {
        clearTimeout(profileVideoPosterPrefetchTimerRef.current);
        profileVideoPosterPrefetchTimerRef.current = null;
      }
      profileVideoPosterPrefetchTaskRef.current?.cancel?.();
      profileVideoPosterPrefetchTaskRef.current = null;
      profilePrefetchedMediaUrlsRef.current.clear();
      profilePendingMediaUrlsRef.current = [];
      profileQueuedMediaUrlsRef.current.clear();
      profilePrefetchedVideoPosterKeysRef.current.clear();
      profilePendingVideoPosterPostsRef.current = [];
      profileQueuedVideoPosterKeysRef.current.clear();
    },
    [],
  );

  const onProfilePostViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: FlashListViewToken<ProfileListItem>[];
    }) => {
      const visiblePostIds = viewableItems
        .filter(item => item.isViewable)
        .map(item => String(getProfileListItemPost(item.item)?.id ?? ''))
        .filter(postId => /^[1-9][0-9]*$/.test(postId));
      scheduleRealtimeVisiblePostIds(visiblePostIds);
      const currentPosts = profilePostsRef.current;
      const visibleVideo = viewableItems.find(
        item =>
          item.isViewable &&
          getProfileListItemPost(item.item)?.kind === 'video',
      );
      const visibleVideoPost = getProfileListItemPost(visibleVideo?.item);
      const nextVisibleVideoId = visibleVideoPost
        ? String(visibleVideoPost.id)
        : null;

      if (isProfileScrollingRef.current) {
        pendingProfileActiveVideoIdRef.current = nextVisibleVideoId;

        const activeVideoStillViewable = activeProfileVideoIdRef.current
          ? viewableItems.some(
              item =>
                item.isViewable &&
                getProfileListItemPost(item.item)?.kind === 'video' &&
                String(getProfileListItemPost(item.item)?.id) ===
                  activeProfileVideoIdRef.current,
            )
          : false;

        if (activeProfileVideoIdRef.current && !activeVideoStillViewable) {
          scheduleActiveProfileVideoId(null);
        }
      } else {
        scheduleActiveProfileVideoId(nextVisibleVideoId);
      }

      if (currentPosts.length === 0) {
        publishFeedWarmVideoIds([]);
        return;
      }

      let firstVisibleIndex = Number.POSITIVE_INFINITY;
      let furthestVisibleIndex = -1;
      viewableItems.forEach(viewable => {
        if (!viewable?.isViewable) return;
        const viewedPost = getProfileListItemPost(viewable.item);
        if (!viewedPost) return;

        const index =
          profilePostIndexByIdRef.current.get(String(viewedPost.id)) ?? -1;

        if (index < 0) return;
        if (index < firstVisibleIndex) firstVisibleIndex = index;
        if (index > furthestVisibleIndex) furthestVisibleIndex = index;
      });

      if (furthestVisibleIndex < 0) {
        publishFeedWarmVideoIds([]);
        return;
      }

      const direction = profileScrollDirectionRef.current;
      const rawPrefetchStartIndex =
        direction === 'up'
          ? firstVisibleIndex - PROFILE_POST_MEDIA_PREFETCH_LOOKAHEAD
          : furthestVisibleIndex - PROFILE_POST_MEDIA_PREFETCH_BEHIND;
      const rawPrefetchEndIndex =
        direction === 'up'
          ? firstVisibleIndex + PROFILE_POST_MEDIA_PREFETCH_BEHIND + 1
          : furthestVisibleIndex + PROFILE_POST_MEDIA_PREFETCH_LOOKAHEAD + 1;
      const prefetchStartIndex = Math.max(0, rawPrefetchStartIndex);
      const prefetchEndIndex = Math.min(
        currentPosts.length,
        rawPrefetchEndIndex,
      );
      let queuedPrefetchCount = 0;
      const urlsToPrefetch: string[] = [];
      for (
        let index = prefetchStartIndex;
        index < prefetchEndIndex &&
        queuedPrefetchCount < PROFILE_POST_MEDIA_PREFETCH_LIMIT;
        index += 1
      ) {
        for (const url of collectProfilePostMediaUrls(currentPosts[index])) {
          if (profilePrefetchedMediaUrlsRef.current.has(url)) continue;
          if (profileQueuedMediaUrlsRef.current.has(url)) continue;

          urlsToPrefetch.push(url);
          queuedPrefetchCount += 1;

          if (queuedPrefetchCount >= PROFILE_POST_MEDIA_PREFETCH_LIMIT) break;
        }
      }
      queueProfileMediaPrefetch(urlsToPrefetch);
      const posterPrefetchStartIndex =
        direction === 'up'
          ? firstVisibleIndex - PROFILE_POST_VIDEO_POSTER_PREFETCH_AHEAD_ITEMS
          : furthestVisibleIndex -
            PROFILE_POST_VIDEO_POSTER_PREFETCH_BEHIND_ITEMS;
      const posterPrefetchEndIndex =
        direction === 'up'
          ? firstVisibleIndex +
            PROFILE_POST_VIDEO_POSTER_PREFETCH_BEHIND_ITEMS +
            1
          : furthestVisibleIndex +
            PROFILE_POST_VIDEO_POSTER_PREFETCH_AHEAD_ITEMS +
            1;
      prefetchProfileVideoPostersInRange(
        posterPrefetchStartIndex,
        posterPrefetchEndIndex,
      );

      if (isProfileScrollingRef.current) {
        publishFeedWarmVideoIds([]);
        return;
      }

      const activeVideoId = visibleVideoPost
        ? String(visibleVideoPost.id)
        : activeProfileVideoIdRef.current;
      const warmVideoIds: string[] = [];
      const candidateIndices: number[] = [];
      const pushCandidateIndex = (index: number) => {
        if (
          index < 0 ||
          index >= currentPosts.length ||
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

      const maxWarmOffset = Math.max(
        PROFILE_POST_VIDEO_WARM_AHEAD_ITEMS,
        PROFILE_POST_VIDEO_WARM_BEHIND_ITEMS,
      );
      for (let offset = 1; offset <= maxWarmOffset; offset += 1) {
        if (direction === 'up') {
          if (offset <= PROFILE_POST_VIDEO_WARM_BEHIND_ITEMS) {
            pushCandidateIndex(firstVisibleIndex - offset);
          }
          if (offset <= PROFILE_POST_VIDEO_WARM_AHEAD_ITEMS) {
            pushCandidateIndex(furthestVisibleIndex + offset);
          }
        } else {
          if (offset <= PROFILE_POST_VIDEO_WARM_AHEAD_ITEMS) {
            pushCandidateIndex(furthestVisibleIndex + offset);
          }
          if (offset <= PROFILE_POST_VIDEO_WARM_BEHIND_ITEMS) {
            pushCandidateIndex(firstVisibleIndex - offset);
          }
        }
      }

      for (const index of candidateIndices) {
        const post = currentPosts[index];
        if (post.kind !== 'video') continue;
        if (post.id === activeVideoId) continue;

        warmVideoIds.push(post.id);
        if (warmVideoIds.length >= PROFILE_POST_VIDEO_WARM_MAX_COUNT) break;
      }

      publishFeedWarmVideoIds(warmVideoIds);
    },
  ).current;

  usePostRealtimeScope({
    postIds: realtimeVisiblePostIds,
    posts: filteredProfilePosts,
    enabled: isProfileFocused,
    onSnapshot: nextPost => {
      setPosts(current =>
        current.map(post =>
          String(post.id) === String(nextPost.id)
            ? (nextPost as ProfileFeedPost)
            : post,
        ),
      );
    },
    onDeleted: postId => {
      setPosts(current => current.filter(post => String(post.id) !== postId));
    },
  });

  useEffect(() => {
    profilePostsRef.current = filteredProfilePosts;
    profilePostIndexByIdRef.current = new Map(
      filteredProfilePosts.map((post, index) => [String(post.id), index]),
    );

    if (filteredProfilePosts.length === 0) {
      clearProfileVideoDwellTimer();
      publishFeedWarmVideoIds([]);
      return;
    }

    if (profileScrollYRef.current <= 24) {
      const initialWarmVideoIds: string[] = [];
      const activeVideoId = activeProfileVideoIdRef.current;
      for (
        let index = 0;
        index <
        Math.min(
          filteredProfilePosts.length,
          PROFILE_POST_VIDEO_WARM_AHEAD_ITEMS + 1,
        );
        index += 1
      ) {
        const post = filteredProfilePosts[index];
        if (post.kind !== 'video') continue;
        if (post.id === activeVideoId) continue;

        initialWarmVideoIds.push(post.id);
        if (initialWarmVideoIds.length >= PROFILE_POST_VIDEO_WARM_MAX_COUNT)
          break;
      }
      publishFeedWarmVideoIds(initialWarmVideoIds);
      prefetchProfileVideoPostersInRange(
        0,
        PROFILE_POST_VIDEO_POSTER_PREFETCH_AHEAD_ITEMS + 1,
      );
    }

    const videoIds = new Set(
      filteredProfilePosts
        .filter((post): post is FeedVideoPost => post.kind === 'video')
        .map(post => post.id),
    );

    if (
      activeProfileVideoIdRef.current &&
      !videoIds.has(activeProfileVideoIdRef.current)
    ) {
      clearProfileVideoDwellTimer();
      setActiveProfileVideoId(null);
    }
  }, [
    clearProfileVideoDwellTimer,
    filteredProfilePosts,
    prefetchProfileVideoPostersInRange,
    setActiveProfileVideoId,
  ]);

  // ── Re-fetch only when the route target changes ────────────────────
  // ProfileMore / other overlays keep this screen mounted and can
  // trigger blur -> focus cycles. We do not want those to refetch the
  // profile data or reset the post list; only a real target change
  // should reload the screen state.
  const routeProfileKey = route.params?.userId
    ? String(route.params.userId)
    : 'self';
  const lastLoadedUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastLoadedUserIdRef.current === routeProfileKey) {
      return;
    }
    lastLoadedUserIdRef.current = routeProfileKey;

    // Reset user-scoped state so the previous user's posts/stories
    // don't bleed into the new user's profile view.
    setPosts([]);
    setPersonalDetailsExpanded(false);
    setPostsCursor(undefined);
    setHasMorePosts(false);
    setPostsError(null);
    setUserStory(null);
    setAllStories([]);
    setIsStoryLoading(false);
    setIsConnectLoading(false);
    setIsPokeLoading(false);
    setStoryOptionsSheet(null);
    setSharingPost(undefined);
    clearProfileVideoDwellTimer();
    setActiveProfileVideoId(null);
    isProfileScrollingRef.current = false;
    isProfileMomentumScrollingRef.current = false;
    pendingProfileActiveVideoIdRef.current = null;
    publishFeedWarmVideoIds([]);
    if (profileMediaPrefetchTimerRef.current) {
      clearTimeout(profileMediaPrefetchTimerRef.current);
      profileMediaPrefetchTimerRef.current = null;
    }
    if (profileVideoPosterPrefetchTimerRef.current) {
      clearTimeout(profileVideoPosterPrefetchTimerRef.current);
      profileVideoPosterPrefetchTimerRef.current = null;
    }
    profileVideoPosterPrefetchTaskRef.current?.cancel?.();
    profileVideoPosterPrefetchTaskRef.current = null;
    profilePrefetchedMediaUrlsRef.current.clear();
    profileQueuedMediaUrlsRef.current.clear();
    profilePendingMediaUrlsRef.current = [];
    profilePrefetchedVideoPosterKeysRef.current.clear();
    profileQueuedVideoPosterKeysRef.current.clear();
    profilePendingVideoPosterPostsRef.current = [];

    loadProfile({
      userId: route.params?.userId,
      includeFriends: true,
    }).catch(() => undefined);
  }, [
    route.params?.userId,
    routeProfileKey,
    clearProfileVideoDwellTimer,
    loadProfile,
    setActiveProfileVideoId,
  ]);

  useFocusEffect(
    useCallback(() => {
      publishFeedScrollBusy(false);

      return () => {
        publishFeedScrollBusy(false);
        clearProfileVideoDwellTimer();
        setActiveProfileVideoId(null);
        isProfileScrollingRef.current = false;
        isProfileMomentumScrollingRef.current = false;
        pendingProfileActiveVideoIdRef.current = null;
        publishFeedWarmVideoIds([]);
        if (profileMediaPrefetchTimerRef.current) {
          clearTimeout(profileMediaPrefetchTimerRef.current);
          profileMediaPrefetchTimerRef.current = null;
        }
        if (profileVideoPosterPrefetchTimerRef.current) {
          clearTimeout(profileVideoPosterPrefetchTimerRef.current);
          profileVideoPosterPrefetchTimerRef.current = null;
        }
        profileVideoPosterPrefetchTaskRef.current?.cancel?.();
        profileVideoPosterPrefetchTaskRef.current = null;
        profilePendingMediaUrlsRef.current = [];
        profileQueuedMediaUrlsRef.current.clear();
        profilePendingVideoPosterPostsRef.current = [];
        profileQueuedVideoPosterKeysRef.current.clear();
      };
    }, [clearProfileVideoDwellTimer, setActiveProfileVideoId]),
  );

  // Load User Posts
  useEffect(() => {
    console.log(
      '[ProfileScreen] Loading posts for targetUserId:',
      targetUserId,
    );
    if (!targetUserId) {
      console.log('[ProfileScreen] targetUserId is empty, skipping load posts');
      setPosts([]);
      setPostsCursor(undefined);
      setHasMorePosts(false);
      setPostsError(null);
      setIsPostsLoading(false);
      return;
    }

    let cancelled = false;
    setPosts([]);
    setPostsCursor(undefined);
    setHasMorePosts(false);
    isLoadingMorePostsRef.current = false;
    setIsLoadingMorePosts(false);
    setIsPostsLoading(true);
    setPostsError(null);
    feedRepo
      .getUserPosts(targetUserId, PROFILE_POST_PAGE_SIZE)
      .then(res => {
        if (cancelled) return;
        console.log('[ProfileScreen] Loaded posts count:', res?.length);
        const filteredPosts = (res ?? []).filter(
          (p): p is ProfileFeedPost =>
            p.kind === 'text' || p.kind === 'video' || p.kind === 'poll',
        );
        setPosts(filteredPosts);
        setPostsCursor(getOldestProfilePostId(filteredPosts));
        setHasMorePosts(filteredPosts.length >= PROFILE_POST_PAGE_SIZE);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[ProfileScreen] Error loading posts:', err);
        setPostsError(
          err instanceof Error ? err.message : 'Không tải được bài viết.',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsPostsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [feedRepo, targetUserId]);

  useEffect(() => {
    if (filteredProfilePosts.length === 0) return;

    const urlsToPrefetch: string[] = [];
    for (
      let index = 0;
      index <
      Math.min(
        filteredProfilePosts.length,
        PROFILE_POST_MEDIA_PREFETCH_LOOKAHEAD,
      );
      index += 1
    ) {
      for (const url of collectProfilePostMediaUrls(
        filteredProfilePosts[index],
      )) {
        if (profilePrefetchedMediaUrlsRef.current.has(url)) continue;

        profilePrefetchedMediaUrlsRef.current.add(url);
        urlsToPrefetch.push(url);
        if (urlsToPrefetch.length >= PROFILE_POST_MEDIA_PREFETCH_LIMIT) break;
      }

      if (urlsToPrefetch.length >= PROFILE_POST_MEDIA_PREFETCH_LIMIT) break;
    }

    queueProfileMediaPrefetch(urlsToPrefetch);
  }, [filteredProfilePosts, queueProfileMediaPrefetch]);

  // Load User Active Story
  useEffect(() => {
    if (!targetUserId) {
      setUserStory(null);
      setAllStories([]);
      setIsStoryLoading(false);
      return;
    }

    let cancelled = false;
    setUserStory(null);
    setAllStories([]);
    setIsStoryLoading(true);

    Promise.all([
      storiesRepo.getUserStories().catch(() => [] as StoryItem[]),
      storiesRepo.getStories().catch(() => [] as StoryItem[]),
    ])
      .then(([userStories, feedStories]) => {
        if (cancelled) return;

        const storyMap = new Map<string, StoryItem>();
        for (const story of [...userStories, ...feedStories]) {
          storyMap.set(`${story.publisher.userId}-${story.id}`, story);
        }

        setUserStory(
          mergeStoriesForProfile(Array.from(storyMap.values()), targetUserId),
        );

        // Filter other users' stories to show in the tray
        const otherStories = feedStories.filter(
          story => String(story.publisher.userId) !== String(targetUserId),
        );
        // Deduplicate other stories by publisher.userId to keep one per user
        const dedupedOthersMap = new Map<string, StoryItem>();
        for (const story of otherStories) {
          const existing = dedupedOthersMap.get(String(story.publisher.userId));
          if (!existing || (story.postedAt ?? 0) > (existing.postedAt ?? 0)) {
            dedupedOthersMap.set(String(story.publisher.userId), story);
          }
        }
        setAllStories(
          isOwnProfile ? Array.from(dedupedOthersMap.values()) : [],
        );
      })
      .catch(() => {
        if (!cancelled) {
          setUserStory(null);
          setAllStories([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsStoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOwnProfile, storiesRepo, targetUserId]);

  const displayName = profile?.name ?? profile?.username ?? '';
  const username = profile?.username ? `@${profile.username}` : '';
  const coverUrl = profile?.coverUrl ?? FALLBACK_COVER;
  const avatarUrl = profile?.avatarUrl ?? FALLBACK_AVATAR;
  const profilePostCountText = useMemo(() => {
    const suffix = hasMorePosts ? '+' : '';
    return language === 'vi'
      ? `${posts.length}${suffix} bài viết`
      : `${posts.length}${suffix} posts`;
  }, [hasMorePosts, language, posts.length]);
  const profileFollowerPreview = useMemo(
    () => followers.filter(follower => follower.id).slice(0, 3),
    [followers],
  );
  const profilePersonalDetailGroups = useMemo(() => {
    const primary: Array<{
      key: string;
      Icon: typeof Clock;
      text: string;
    }> = [];
    const additional: typeof primary = [];

    const addressText = cleanProfileValue(profile?.address);
    if (addressText) {
      primary.push({
        key: 'address',
        Icon: MapPin,
        text: addressText,
      });
    }

    const countryText = getCountryDisplayName(profile?.countryId);
    if (countryText) {
      primary.push({
        key: 'country',
        Icon: Globe2,
        text:
          language === 'vi'
            ? `Sống tại ${countryText}`
            : `Lives in ${countryText}`,
      });
    }

    const birthdayText = formatBirthdayText(profile?.birthday, language);
    if (birthdayText) {
      primary.push({
        key: 'birthday',
        Icon: CalendarDays,
        text: birthdayText,
      });
    }

    const workingText = cleanProfileValue(profile?.working);
    if (workingText) {
      additional.push({
        key: 'working',
        Icon: BriefcaseBusiness,
        text:
          language === 'vi'
            ? `Làm việc tại ${workingText}`
            : `Works at ${workingText}`,
      });
    }

    const genderText = getGenderDisplayText(
      profile?.genderText,
      profile?.gender,
      language,
    );
    if (genderText) {
      additional.push({
        key: 'gender',
        Icon: User,
        text:
          language === 'vi'
            ? `Giới tính: ${genderText}`
            : `Gender: ${genderText}`,
      });
    }

    const phoneText = cleanProfileValue(profile?.phoneNumber);
    if (phoneText) {
      additional.push({
        key: 'phone',
        Icon: Phone,
        text: phoneText,
      });
    }

    const emailText = cleanProfileValue(profile?.email);
    if (emailText) {
      additional.push({
        key: 'email',
        Icon: Mail,
        text: emailText,
      });
    }

    const websiteText = cleanProfileValue(profile?.website);
    if (websiteText) {
      additional.push({
        key: 'website',
        Icon: Link2,
        text: websiteText,
      });
    }

    const registeredText = cleanProfileValue(profile?.registered);
    if (registeredText) {
      additional.push({
        key: 'registered',
        Icon: CalendarDays,
        text:
          language === 'vi'
            ? `Tham gia từ ${registeredText}`
            : `Joined ${registeredText}`,
      });
    }

    additional.push({
      key: 'activity',
      Icon: Clock,
      text: getActivityDisplayText(
        profile?.lastSeenText,
        language,
        copy.activeNow,
      ),
    });

    return { primary, additional };
  }, [
    copy.activeNow,
    language,
    profile?.address,
    profile?.birthday,
    profile?.countryId,
    profile?.email,
    profile?.gender,
    profile?.genderText,
    profile?.lastSeenText,
    profile?.phoneNumber,
    profile?.registered,
    profile?.website,
    profile?.working,
  ]);
  const visibleProfileDetailItems = isPersonalDetailsExpanded
    ? [
        ...profilePersonalDetailGroups.primary,
        ...profilePersonalDetailGroups.additional,
      ]
    : profilePersonalDetailGroups.primary;
  const hasAdditionalProfileDetails =
    profilePersonalDetailGroups.additional.length > 0;
  const profileActivityItems = useMemo<ProfileActivityItem[]>(() => {
    const actorName = displayName || copy.userFallback;
    const actorLabel = isOwnProfile
      ? language === 'vi'
        ? 'Bạn'
        : 'You'
      : actorName;
    const items: ProfileActivityItem[] = [];

    if (following.length > 0) {
      items.push({
        id: 'following-summary',
        Icon: UserCheck,
        title:
          language === 'vi'
            ? `${actorLabel} đang theo dõi ${formatCount(
                following.length,
              )} người`
            : `${actorLabel} follows ${formatCount(following.length)} people`,
        subtitle:
          language === 'vi' ? 'Hoạt động kết nối' : 'Connection activity',
        color: APP_BRAND_COLOR,
        backgroundColor: '#E7F3FF',
      });
    }

    if (followers.length > 0) {
      items.push({
        id: 'followers-summary',
        Icon: Users,
        title:
          language === 'vi'
            ? `${formatCount(followers.length)} người đang theo dõi ${
                isOwnProfile ? 'bạn' : actorName
              }`
            : `${formatCount(followers.length)} followers`,
        subtitle:
          language === 'vi' ? 'Tương tác cộng đồng' : 'Community activity',
        color: '#0F766E',
        backgroundColor: '#CCFBF1',
      });
    }

    [...posts]
      .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0))
      .slice(0, 12)
      .forEach(post => {
        const postKind = getProfilePostKindLabel(post, language);
        const preview = getProfilePostPreviewText(post, language);
        const timeText = formatPostTime(post.postedAt, postCardCopy);
        const targetText =
          language === 'vi' ? `trên ${postKind}` : `on this ${postKind}`;

        items.push({
          id: `posted-${post.id}`,
          Icon: FileText,
          title:
            language === 'vi'
              ? `${actorLabel} đã đăng ${postKind}`
              : `${actorLabel} posted a ${postKind}`,
          subtitle: `${preview} · ${timeText}`,
          color: APP_BRAND_COLOR,
          backgroundColor: APP_COLORS.brand.soft,
        });

        if (isOwnProfile && post.myReaction) {
          items.push({
            id: `reacted-${post.id}`,
            Icon: Heart,
            title:
              language === 'vi'
                ? `${actorLabel} đã thả ${postCardCopy.reactionLabel[
                    post.myReaction
                  ].toLowerCase()} ${targetText}`
                : `${actorLabel} reacted ${
                    postCardCopy.reactionLabel[post.myReaction]
                  } ${targetText}`,
            subtitle: `${preview} · ${timeText}`,
            color: '#E11D48',
            backgroundColor: '#FFE4E6',
          });
        }

        if (post.likeCount > 0) {
          items.push({
            id: `reactions-${post.id}`,
            Icon: Heart,
            title:
              language === 'vi'
                ? `${postKind} nhận ${formatCount(post.likeCount)} cảm xúc`
                : `${postKind} received ${formatCount(
                    post.likeCount,
                  )} reactions`,
            subtitle: `${preview} · ${timeText}`,
            color: '#E11D48',
            backgroundColor: '#FFE4E6',
          });
        }

        if (post.commentCount > 0) {
          items.push({
            id: `comments-${post.id}`,
            Icon: MessageCircle,
            title:
              language === 'vi'
                ? `${postKind} có ${formatCount(post.commentCount)} bình luận`
                : `${postKind} has ${formatCount(post.commentCount)} comments`,
            subtitle: `${preview} · ${timeText}`,
            color: '#7C3AED',
            backgroundColor: '#F3E8FF',
          });
        }

        const shareCount =
          'shareCount' in post && typeof post.shareCount === 'number'
            ? post.shareCount
            : 0;
        if (shareCount > 0) {
          items.push({
            id: `shares-${post.id}`,
            Icon: Repeat2,
            title:
              language === 'vi'
                ? `${postKind} được chia sẻ ${formatCount(shareCount)} lần`
                : `${postKind} was shared ${formatCount(shareCount)} times`,
            subtitle: `${preview} · ${timeText}`,
            color: '#EA580C',
            backgroundColor: '#FFEDD5',
          });
        }
      });

    return items.slice(0, 32);
  }, [
    copy.userFallback,
    displayName,
    followers.length,
    following.length,
    isOwnProfile,
    language,
    postCardCopy,
    posts,
  ]);
  const shouldShowStorySection = shouldShowProfileStorySection({
    isOwnProfile,
    hasStory: Boolean(userStory),
    isLoading: isStoryLoading,
  });
  const relationshipState =
    profile?.followingState ??
    (profile?.followedByCurrentUser ? 'following' : 'none');
  const isFriendProfile = !isOwnProfile && relationshipState === 'following';
  const isRequestedProfile = !isOwnProfile && relationshipState === 'requested';

  const handleSetPostReaction = useCallback(
    async (postId: string, nextReaction: ReactionType) => {
      let snapshot: ProfileFeedPost | undefined;
      let targetReaction: ReactionType | null = nextReaction;
      setPickerAnchor(null);

      setPosts(prev =>
        prev.map(post => {
          if (post.id !== postId) return post;

          snapshot = post;
          targetReaction =
            post.myReaction === nextReaction ? null : nextReaction;
          const wasReacted = post.myReaction !== null;
          const willBeReacted = targetReaction !== null;
          const countDelta = Number(willBeReacted) - Number(wasReacted);
          const nextLikeCount = Math.max(0, post.likeCount + countDelta);

          return {
            ...post,
            isLiked: willBeReacted,
            likeCount: nextLikeCount,
            myReaction: targetReaction,
            topReactions: updateProfileTopReactions(
              post.topReactions,
              post.myReaction,
              targetReaction,
              nextLikeCount,
            ),
          };
        }),
      );

      try {
        await feedRepo.setReaction(postId, targetReaction);
      } catch {
        if (snapshot) {
          const original = snapshot;
          setPosts(prev =>
            prev.map(post => (post.id === postId ? original : post)),
          );
        }
        Alert.alert(copy.errorTitle, copy.reactionError);
      }
    },
    [copy.errorTitle, copy.reactionError, feedRepo],
  );

  const handleOpenPicker = useCallback(
    (postId: string, x: number, y: number) => {
      setPickerAnchor({ postId, x, y });
    },
    [],
  );

  const handlePickReaction = useCallback(
    (reaction: ReactionType) => {
      if (!pickerAnchor) return;
      handleSetPostReaction(pickerAnchor.postId, reaction);
      setPickerAnchor(null);
    },
    [handleSetPostReaction, pickerAnchor],
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

      if (photoPressTimeoutRef.current) {
        clearTimeout(photoPressTimeoutRef.current);
      }

      const safeIndex = Math.min(Math.max(photoIndex, 0), total - 1);
      openingPhotoViewerRef.current = true;
      setPhotoViewer({ post, initialIndex: safeIndex });

      photoPressTimeoutRef.current = setTimeout(() => {
        openingPhotoViewerRef.current = false;
        photoPressTimeoutRef.current = null;
      }, 400);

      // Prefetch nearby photos
      const nearbyPhotos = [
        post.photos[safeIndex],
        post.photos[safeIndex - 1],
        post.photos[safeIndex + 1],
      ].filter(Boolean);
      nearbyPhotos.forEach(url => {
        Image.prefetch(url).catch(() => undefined);
      });
    },
    [],
  );

  const handleClosePhotoViewer = useCallback(() => {
    setPhotoViewer(null);
    openingPhotoViewerRef.current = false;
    if (photoPressTimeoutRef.current) {
      clearTimeout(photoPressTimeoutRef.current);
      photoPressTimeoutRef.current = null;
    }
  }, []);

  const handlePhotoViewerCommentTap = useCallback(
    (postId: string) => {
      const post = posts.find(item => item.id === postId);
      navigateToPostComments(navigation, postId, post);
    },
    [navigation, posts],
  );

  const handlePhotoViewerFollowChange = useCallback(
    (publisherId: string, isFollowing: boolean) => {
      if (!publisherId) return;
      setPosts(previous =>
        previous.map(post => {
          if (String(post.publisher?.id) !== String(publisherId)) return post;
          return {
            ...post,
            publisher: {
              ...post.publisher,
              isFollowing,
            },
          };
        }),
      );
    },
    [],
  );

  const handleOpenSharePost = useCallback((post: FeedPost) => {
    if (!isFeedPostShareable(post)) return;
    setSharingPost(post);
    setShareModalVisible(true);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShareModalVisible(false);
    setSharingPost(undefined);
  }, []);

  const handleInternalSharePost = useCallback(
    (input: SharePostInput) => feedRepo.sharePost(input),
    [feedRepo],
  );

  const handleNavigateToProfile = useCallback(
    (userId: string) => {
      navigateToUserProfile(navigation, userId);
    },
    [navigation],
  );

  const handleOpenProfileLive = useCallback(
    (item: LiveStreamItem) => {
      navigation.navigate(ROUTES.LIVE_ROOM, { postId: item.postId });
    },
    [navigation],
  );

  const handleOpenConnections = useCallback(
    (initialTab: 'followers' | 'following') => {
      if (!targetUserId) return;
      setProfileConnectionsSnapshot(String(targetUserId), followers, following);
      navigation.navigate(ROUTES.PROFILE_FRIENDS, {
        userId: String(targetUserId),
        displayName: displayName || copy.userFallback,
        avatarUrl,
        initialTab,
        followersCount: followers.length,
        followingCount: following.length,
      });
    },
    [
      avatarUrl,
      copy.userFallback,
      displayName,
      followers,
      following,
      navigation,
      targetUserId,
    ],
  );

  const handleOpenFollowersList = useCallback(
    () => handleOpenConnections('followers'),
    [handleOpenConnections],
  );

  const handleOpenFollowingList = useCallback(
    () => handleOpenConnections('following'),
    [handleOpenConnections],
  );

  const handleVotePoll = useCallback(
    async (postId: string, optionId: string) => {
      let snapshot: FeedPollPost | undefined;

      setPosts(prev =>
        prev.map(post => {
          if (post.id !== postId || post.kind !== 'poll') return post;
          snapshot = post;

          const options = post.options.map(option => ({
            ...option,
            optionVotes:
              option.id === optionId
                ? option.optionVotes + 1
                : option.optionVotes,
          }));
          const totalVotes = options.reduce(
            (sum, option) => sum + option.optionVotes,
            0,
          );

          return {
            ...post,
            options: options.map(option => {
              const percentageNum =
                totalVotes > 0
                  ? Math.round((option.optionVotes / totalVotes) * 100)
                  : 0;
              return {
                ...option,
                all: totalVotes,
                percentage: `${percentageNum}%`,
                percentageNum,
              };
            }),
            votedId: optionId,
            totalVotes,
          };
        }),
      );

      try {
        const response = await pollRepo.votePoll(optionId);
        setPosts(prev =>
          prev.map(post => {
            if (post.id !== postId || post.kind !== 'poll') return post;
            const apiTotal = Math.max(
              0,
              ...response.options.map(option => option.all),
            );
            return {
              ...post,
              options: response.options,
              votedId: optionId,
              totalVotes:
                apiTotal > 0
                  ? apiTotal
                  : response.options.reduce(
                      (sum, option) => sum + option.optionVotes,
                      0,
                    ),
            };
          }),
        );
      } catch {
        if (snapshot) {
          const original = snapshot;
          setPosts(prev =>
            prev.map(post => (post.id === postId ? original : post)),
          );
        }
        Alert.alert(copy.errorTitle, copy.voteError);
      }
    },
    [copy.errorTitle, copy.voteError, pollRepo],
  );

  const selectedCommentPost = useMemo(
    () =>
      posts.find(post => post.id === commentVm.selectedCommentPostId) ?? null,
    [commentVm.selectedCommentPostId, posts],
  );

  const handleRetryComments = useCallback(() => {
    if (commentVm.selectedCommentPostId) {
      commentVm.openComments(commentVm.selectedCommentPostId);
    }
  }, [commentVm]);

  const handleOpenPostMenu = useCallback((post: FeedPost) => {
    setSelectedPostForMenu(post);
    setPostMenuVisible(true);
  }, []);

  const handleClosePostMenu = useCallback(() => {
    setPostMenuVisible(false);
    setSelectedPostForMenu(null);
  }, []);

  const removeProfilePostFromList = useCallback((postId: string) => {
    setPosts(previous => previous.filter(post => post.id !== postId));
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      LOCAL_POST_HIDDEN_EVENT,
      (event: { postId?: string; userId?: string }) => {
        const postId = String(event?.postId ?? '').trim();
        if (!postId) return;
        const currentOwnerKey = currentUserId || 'guest';
        if (event?.userId && event.userId !== currentOwnerKey) return;
        removeProfilePostFromList(postId);
      },
    );
    return () => subscription.remove();
  }, [currentUserId, removeProfilePostFromList]);

  const handleSavePost = useCallback(
    async (postId: string) => {
      try {
        const result = await feedRepo.savePost(postId);
        if (result.saved) {
          Alert.alert(postCardCopy.savedTitle, postCardCopy.savedMessage);
        } else {
          Alert.alert(postCardCopy.unsavedTitle, postCardCopy.unsavedMessage);
        }
      } catch {
        Alert.alert(postCardCopy.errorTitle, postCardCopy.saveErrorMessage);
      }
    },
    [feedRepo, postCardCopy],
  );

  const handleReportPost = useCallback(
    async (postId: string) => {
      try {
        const result = await feedRepo.reportPost(postId);
        if (result.reported) {
          Alert.alert(
            postCardCopy.reportSentTitle,
            postCardCopy.reportSentMessage,
          );
        } else {
          Alert.alert(
            postCardCopy.reportCancelledTitle,
            postCardCopy.reportCancelledMessage,
          );
        }
      } catch {
        Alert.alert(postCardCopy.errorTitle, postCardCopy.reportErrorMessage);
      }
    },
    [feedRepo, postCardCopy],
  );

  const handleHidePost = useCallback(
    async (postId: string) => {
      hiddenPostsStorage.hidePost(postId, currentUserId);
      removeProfilePostFromList(postId);
    },
    [currentUserId, removeProfilePostFromList],
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      if (!canDeleteSelectedPost || selectedPostForMenu?.id !== postId) {
        throw new Error(
          language === 'vi'
            ? 'Bạn chỉ có thể xóa bài viết của mình.'
            : 'You can only delete your own posts.',
        );
      }

      try {
        const result = await feedRepo.deletePost(postId);
        if (result.deleted) {
          removeProfilePostFromList(postId);
          Alert.alert(
            language === 'vi' ? 'Thông báo' : 'Notice',
            language === 'vi'
              ? 'Đã xóa bài viết thành công.'
              : 'Post deleted successfully.',
          );
        } else {
          Alert.alert(
            language === 'vi' ? 'Thông báo' : 'Notice',
            language === 'vi'
              ? 'Không thể xóa bài viết này.'
              : 'This post could not be deleted.',
          );
        }
      } catch {
        Alert.alert(
          postCardCopy.errorTitle,
          language === 'vi'
            ? 'Có lỗi xảy ra khi xóa bài viết.'
            : 'An error occurred while deleting this post.',
        );
      }
    },
    [
      canDeleteSelectedPost,
      feedRepo,
      language,
      postCardCopy.errorTitle,
      removeProfilePostFromList,
      selectedPostForMenu?.id,
    ],
  );

  const handleLoadMorePosts = useCallback(async () => {
    if (
      !targetUserId ||
      !postsCursor ||
      !hasMorePosts ||
      isLoadingMorePostsRef.current
    ) {
      return;
    }

    isLoadingMorePostsRef.current = true;
    setIsLoadingMorePosts(true);
    try {
      const response = await feedRepo.getUserPosts(
        targetUserId,
        PROFILE_POST_PAGE_SIZE,
        postsCursor,
      );
      const nextPosts = response.filter(
        (post): post is ProfileFeedPost =>
          post.kind === 'text' || post.kind === 'video' || post.kind === 'poll',
      );
      const nextCursor = getOldestProfilePostId(nextPosts);

      setPosts(previous => {
        const merged = new Map(previous.map(post => [post.id, post]));
        for (const post of nextPosts) {
          merged.set(post.id, post);
        }
        return Array.from(merged.values()).sort(
          (a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0),
        );
      });
      setPostsCursor(nextCursor ?? postsCursor);
      setHasMorePosts(
        nextPosts.length >= PROFILE_POST_PAGE_SIZE &&
          Boolean(nextCursor) &&
          nextCursor !== postsCursor,
      );
    } catch (caughtError) {
      console.error('[ProfileScreen] Error loading more posts:', caughtError);
    } finally {
      isLoadingMorePostsRef.current = false;
      setIsLoadingMorePosts(false);
    }
  }, [feedRepo, hasMorePosts, postsCursor, targetUserId]);

  const animateProfileHeaderSolid = useCallback(
    (solid: boolean) => {
      Animated.timing(profileHeaderSolidProgress, {
        toValue: solid ? 1 : 0,
        duration: solid ? 120 : 90,
        useNativeDriver: true,
      }).start();
    },
    [profileHeaderSolidProgress],
  );

  const handleProfileScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const previousY = profileScrollYRef.current;
      const deltaY = contentOffset.y - previousY;
      if (Math.abs(deltaY) > PROFILE_SCROLL_DIRECTION_THRESHOLD) {
        profileScrollDirectionRef.current = deltaY > 0 ? 'down' : 'up';
      }
      profileScrollYRef.current = contentOffset.y;
      profileViewportHeightRef.current = layoutMeasurement.height;

      const shouldUseSolidHeader =
        contentOffset.y >=
        Math.max(0, PROFILE_COVER_HEIGHT - profileHeaderHeight);
      if (profileHeaderSolidRef.current !== shouldUseSolidHeader) {
        profileHeaderSolidRef.current = shouldUseSolidHeader;
        animateProfileHeaderSolid(shouldUseSolidHeader);
        setProfileHeaderSolid(shouldUseSolidHeader);
      }

      if (Platform.OS === 'ios') {
        publishNativeTabScrollIntent(
          nativeTabScrollPublisherStateRef,
          contentOffset.y,
        );
      }
      if (
        contentSize.height - (contentOffset.y + layoutMeasurement.height) <
        480
      ) {
        handleLoadMorePosts();
      }
    },
    [animateProfileHeaderSolid, handleLoadMorePosts, profileHeaderHeight],
  );

  const finishProfileScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      profileScrollYRef.current = contentOffset.y;
      profileViewportHeightRef.current = layoutMeasurement.height;
      isProfileScrollingRef.current = false;
      isProfileMomentumScrollingRef.current = false;
      publishFeedScrollBusy(false);
      const nextVideoId = pendingProfileActiveVideoIdRef.current;
      pendingProfileActiveVideoIdRef.current = null;
      scheduleActiveProfileVideoId(nextVideoId, true);
    },
    [scheduleActiveProfileVideoId],
  );

  const handleProfileViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      profileViewportHeightRef.current = event.nativeEvent.layout.height;
    },
    [],
  );

  const handleProfileScrollBegin = useCallback(() => {
    isProfileScrollingRef.current = true;
    pendingProfileActiveVideoIdRef.current = activeProfileVideoIdRef.current;
    clearProfileVideoDwellTimer();
    publishFeedWarmVideoIds([]);
    publishFeedScrollBusy(true);
  }, [clearProfileVideoDwellTimer]);

  const handleProfileMomentumScrollBegin = useCallback(() => {
    isProfileMomentumScrollingRef.current = true;
    handleProfileScrollBegin();
  }, [handleProfileScrollBegin]);

  const handleProfileScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, velocity } = event.nativeEvent;
      profileScrollYRef.current = contentOffset.y;
      profileViewportHeightRef.current = layoutMeasurement.height;

      const velocityY = Math.abs(velocity?.y ?? 0);
      if (velocityY > 0.05 || isProfileMomentumScrollingRef.current) {
        return;
      }

      finishProfileScroll(event);
    },
    [finishProfileScroll],
  );

  const openProfileMediaSheet = useCallback(
    (target: ProfileMediaSheetTarget) => {
      tabBarVisibility.setVisible(false);
      profileMediaSheetProgress.stopAnimation();
      profileMediaSheetProgress.setValue(0);
      setProfileMediaSheet(target);
      requestAnimationFrame(() => {
        Animated.timing(profileMediaSheetProgress, {
          toValue: 1,
          duration: PROFILE_SHEET_OPEN_DURATION_MS,
          useNativeDriver: true,
        }).start();
      });
    },
    [profileMediaSheetProgress],
  );

  const closeProfileMediaSheet = useCallback(
    (afterClose?: () => void) => {
      profileMediaSheetProgress.stopAnimation();
      Animated.timing(profileMediaSheetProgress, {
        toValue: 0,
        duration: PROFILE_SHEET_CLOSE_DURATION_MS,
        useNativeDriver: true,
      }).start(() => {
        setProfileMediaSheet(null);
        tabBarVisibility.setVisible(true);
        if (afterClose) {
          requestAnimationFrame(afterClose);
        }
      });
    },
    [profileMediaSheetProgress],
  );

  // Avatar Press Handler
  const handleAvatarPress = () => {
    openProfileMediaSheet('avatar');
  };

  const handleCloseProfileMediaSheet = useCallback(() => {
    closeProfileMediaSheet();
  }, [closeProfileMediaSheet]);

  const handleViewProfileMedia = useCallback(() => {
    const mediaTarget = profileMediaSheet;
    if (!mediaTarget) return;

    closeProfileMediaSheet(() => {
      if (mediaTarget === 'cover') {
        navigation.navigate(ROUTES.COVER_VIEWER, {
          coverUrl: coverUrl,
          userName: displayName,
          userId: targetUserId ?? currentUserId ?? profile?.id,
        });
        return;
      }

      const destination = resolveProfileAvatarViewDestination({
        isOwnProfile,
        avatarPostId: profile?.avatarPostId,
      });
      if (destination.kind === 'post-detail') {
        navigation.navigate(ROUTES.POST_DETAIL, {
          postId: destination.postId,
        });
        return;
      }

      navigation.navigate(ROUTES.AVATAR_VIEWER, {
        avatarUrl: avatarUrl,
        userName: displayName,
        userId: targetUserId ?? currentUserId ?? profile?.id,
      });
    });
  }, [
    avatarUrl,
    closeProfileMediaSheet,
    coverUrl,
    currentUserId,
    displayName,
    isOwnProfile,
    navigation,
    profile?.id,
    profile?.avatarPostId,
    profileMediaSheet,
    targetUserId,
  ]);

  const handleCreateStoryFromMediaSheet = useCallback(() => {
    closeProfileMediaSheet(() => {
      navigation.navigate(ROUTES.CREATE_STORY);
    });
  }, [closeProfileMediaSheet, navigation]);

  const handleViewStoryFromMediaSheet = useCallback(() => {
    if (!userStory) return;

    const storyToView = userStory;
    closeProfileMediaSheet(() => {
      navigation.navigate(ROUTES.STORY_VIEWER, {
        stories: [storyToView],
        initialUserIndex: 0,
      });
    });
  }, [closeProfileMediaSheet, navigation, userStory]);

  // Cover Photo Press Handler
  const handleCoverPress = () => {
    if (isOwnProfile) {
      openProfileMediaSheet('cover');
      return;
    }

    navigation.navigate(ROUTES.COVER_VIEWER, {
      coverUrl: coverUrl,
      userName: displayName,
      userId: targetUserId ?? currentUserId ?? profile?.id,
    });
  };

  const selectProfileImageForCrop = useCallback(
    async (target: ImageCropTarget) => {
      try {
        const result = await launchImageLibrary({
          mediaType: 'photo',
          quality: 1,
          selectionLimit: 1,
        });
        if (result.didCancel || !result.assets || result.assets.length === 0) {
          return;
        }

        const asset = result.assets[0];
        if (!asset.uri) return;

        setProfileCropRequest({
          target,
          image: {
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            fileName: asset.fileName,
            type: asset.type,
          },
        });
      } catch (err) {
        console.error('[Profile] Cannot select profile image:', err);
        Alert.alert(
          copy.errorTitle,
          'Không thể mở thư viện ảnh. Vui lòng thử lại.',
        );
      }
    },
    [copy.errorTitle],
  );

  const handleChangeAvatar = useCallback(() => {
    selectProfileImageForCrop('avatar');
  }, [selectProfileImageForCrop]);

  const handleChangeCover = useCallback(() => {
    selectProfileImageForCrop('cover');
  }, [selectProfileImageForCrop]);

  const handleCroppedProfileImage = useCallback(
    async (asset: CroppedImageAsset) => {
      const cropTarget = profileCropRequest?.target;
      if (!cropTarget) return;

      setProfileCropRequest(null);

      const attemptUpload = async () => {
        const isAvatar = cropTarget === 'avatar';
        const errorMessage = isAvatar
          ? 'Không thể cập nhật ảnh đại diện.'
          : 'Không thể cập nhật ảnh bìa.';
        const setLoading = isAvatar ? setIsLoadingAvatar : setIsLoadingCover;

        setLoading(true);
        try {
          const result = isAvatar
            ? await updateAvatar(asset.uri)
            : await updateCover(asset);
          if (result) {
            loadProfile({ userId: targetUserId }).catch(error => {
              console.warn(
                '[Profile] Profile media updated but revalidation failed:',
                error,
              );
            });
            return;
          }

          Alert.alert(copy.errorTitle, errorMessage, [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Thử lại',
              onPress: () => {
                attemptUpload();
              },
            },
          ]);
        } catch (err) {
          console.error('[Profile] Cannot update profile media:', err);
          Alert.alert(copy.errorTitle, errorMessage, [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Thử lại',
              onPress: () => {
                attemptUpload();
              },
            },
          ]);
        } finally {
          setLoading(false);
        }
      };

      await attemptUpload();
    },
    [
      copy.errorTitle,
      loadProfile,
      profileCropRequest?.target,
      targetUserId,
      updateAvatar,
      updateCover,
    ],
  );

  const handleChangeProfileMedia = useCallback(() => {
    const mediaTarget = profileMediaSheet;
    if (!mediaTarget) return;

    closeProfileMediaSheet(() => {
      if (mediaTarget === 'cover') {
        handleChangeCover();
        return;
      }

      handleChangeAvatar();
    });
  }, [
    closeProfileMediaSheet,
    handleChangeAvatar,
    handleChangeCover,
    profileMediaSheet,
  ]);

  const handleOpenStory = () => {
    if (!userStory) return;
    navigation.navigate(ROUTES.STORY_VIEWER, {
      stories: [userStory],
      initialUserIndex: 0,
    });
  };

  const handleCreateStory = () => {
    navigation.navigate(ROUTES.CREATE_STORY);
  };

  const handleOpenStoriesList = useCallback(() => {
    const profileStories = [...(userStory ? [userStory] : []), ...allStories];

    navigation.navigate(ROUTES.STORIES_LIST, {
      stories: profileStories,
      title: copy.stories,
    });
  }, [allStories, copy.stories, navigation, userStory]);

  const handleOpenSettings = useCallback(() => {
    navigation.navigate(ROUTES.MAIN_TABS, {
      screen: ROUTES.SETTINGS,
      params: {
        initialPanel: 'main',
        fromProfile: true,
        returnProfilePreview: {
          displayName: displayName || copy.userFallback,
          username,
          avatarUrl,
          coverUrl,
        },
      },
    });
  }, [
    avatarUrl,
    copy.userFallback,
    coverUrl,
    displayName,
    navigation,
    username,
  ]);

  const handleOpenActivities = useCallback(() => {
    navigation.navigate(ROUTES.ACTIVITY_CENTER, {
      initialTab: 'reaction',
    });
  }, [navigation]);

  const handleCloseActivities = useCallback(() => {
    setShouldRenderActivitiesList(false);
    activitiesSheetProgress.stopAnimation();
    Animated.timing(activitiesSheetProgress, {
      toValue: 0,
      duration: PROFILE_SHEET_CLOSE_DURATION_MS,
      useNativeDriver: true,
    }).start(() => {
      setActivitiesSheetVisible(false);
    });
  }, [activitiesSheetProgress]);

  const handleOpenCart = useCallback(() => {
    if (!isOwnProfile) return;
    navigation.navigate(ROUTES.MY_PRODUCTS);
  }, [isOwnProfile, navigation]);

  const handleOpenPublicProducts = useCallback(() => {
    if (isOwnProfile) {
      navigation.navigate(ROUTES.MY_PRODUCTS);
    } else if (targetUserId) {
      navigation.navigate(ROUTES.MY_PRODUCTS, {
        userId: String(targetUserId),
      });
    }
  }, [isOwnProfile, navigation, targetUserId]);

  const handleOpenMessages = () => {
    if (!targetUserId || isOwnProfile) {
      navigation.navigate(ROUTES.MESSAGES);
      return;
    }

    const chat: ChatItem = {
      id: `user:${targetUserId}`,
      chatType: 'user',
      userId: String(targetUserId),
      username: profile?.username ?? '',
      name: displayName || profile?.username || copy.userFallback,
      avatar: avatarUrl,
      lastMessage: '',
      lastMessageTime: 0,
      unreadCount: 0,
      isOnline: false,
      isVerified: Boolean(profile?.verified),
    };

    if (Platform.OS === 'ios') {
      navigation.replace(ROUTES.CHAT, { chat });
      return;
    }

    navigation.navigate(ROUTES.CHAT, { chat });
  };

  const handleOpenProfileMore = useCallback(() => {
    navigation.navigate(ROUTES.PROFILE_MORE, {
      userId: targetUserId ? String(targetUserId) : undefined,
      displayName,
      username: profile?.username,
      avatarUrl,
      phoneNumber: profile?.phoneNumber,
      followersCount: followers.length,
      followingCount: following.length,
      followedByCurrentUser: Boolean(profile?.followedByCurrentUser),
      followsCurrentUser: Boolean(profile?.followsCurrentUser),
      blocked: Boolean(profile?.blocked),
      pro: Boolean(profile?.pro),
      privacy: profile?.privacy,
    });
  }, [
    avatarUrl,
    displayName,
    followers.length,
    following.length,
    navigation,
    profile?.blocked,
    profile?.followedByCurrentUser,
    profile?.followsCurrentUser,
    profile?.phoneNumber,
    profile?.privacy,
    profile?.pro,
    profile?.username,
    targetUserId,
  ]);

  const handleProfileBack = useCallback(() => {
    navigateBackOrFeed(navigation);
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          handleProfileBack();
          return true;
        },
      );

      return () => subscription.remove();
    }, [handleProfileBack]),
  );

  const handleConnectUser = async () => {
    if (
      !targetUserId ||
      isOwnProfile ||
      isRequestedProfile ||
      isConnectLoading
    ) {
      return;
    }

    setIsConnectLoading(true);
    try {
      await toggleFollow(String(targetUserId));
    } catch (caughtError) {
      console.error('[ProfileScreen] Failed to connect user:', caughtError);
      Alert.alert(copy.errorTitle, copy.connectError);
    } finally {
      setIsConnectLoading(false);
    }
  };

  const openRelationshipActionsSheet = useCallback(() => {
    if (!isFriendProfile || isOwnProfile) {
      return;
    }

    setRelationshipSheetVisible(true);
  }, [isFriendProfile, isOwnProfile]);

  const closeRelationshipActionsSheet = useCallback(() => {
    if (relationshipAction) {
      return;
    }

    setRelationshipSheetVisible(false);
  }, [relationshipAction]);

  const handleUnfollowFromProfile = useCallback(async () => {
    if (!targetUserId || relationshipAction) {
      return;
    }

    setRelationshipAction('unfollow');
    try {
      await toggleFollow(String(targetUserId));
      setRelationshipSheetVisible(false);
      showToast({
        message: copy.unfollowSuccess,
        type: 'success',
      });
    } catch (caughtError) {
      console.error('[ProfileScreen] Failed to unfollow user:', caughtError);
      Alert.alert(copy.errorTitle, copy.unfollowError);
    } finally {
      setRelationshipAction(null);
    }
  }, [
    copy.errorTitle,
    copy.unfollowError,
    copy.unfollowSuccess,
    relationshipAction,
    targetUserId,
    toggleFollow,
  ]);

  const handleBlockFromProfile = useCallback(() => {
    if (!targetUserId || relationshipAction) {
      return;
    }

    Alert.alert(
      copy.blockTitle,
      copy.blockConfirm(displayName || copy.userFallback),
      [
        { text: copy.sheetCancel, style: 'cancel' },
        {
          text: copy.blockUser,
          style: 'destructive',
          onPress: async () => {
            setRelationshipAction('block');
            try {
              const response = await apiBridge.post<{
                api_status?: string | number;
                block_status?: string;
                message?: string;
              }>(apiRoutes.social.block, {
                user_id: String(targetUserId),
                block_action: 'block',
              });

              if (
                response.block_status !== 'blocked' &&
                !apiSucceeded(response.api_status)
              ) {
                throw new Error(response.message || copy.blockError);
              }

              showToast({
                message: copy.blockSuccess,
                type: 'success',
              });
              setRelationshipSheetVisible(false);

              if (navigation.canGoBack()) {
                navigation.goBack();
                return;
              }

              navigation.navigate(ROUTES.MAIN_TABS, { screen: ROUTES.FEED });
            } catch (caughtError) {
              console.error(
                '[ProfileScreen] Failed to block user:',
                caughtError,
              );
              Alert.alert(copy.errorTitle, copy.blockError);
            } finally {
              setRelationshipAction(null);
            }
          },
        },
      ],
    );
  }, [copy, displayName, navigation, relationshipAction, targetUserId]);

  const handlePokeUser = async () => {
    if (!targetUserId || isOwnProfile || isPokeLoading) {
      return;
    }

    setIsPokeLoading(true);
    try {
      await pokeUser(String(targetUserId));
      const successMsg = pokeCopy.pokeSuccessMessage;
      const message =
        typeof successMsg === 'function'
          ? successMsg(displayName || copy.userFallback)
          : String(successMsg);
      showToast({
        message,
        type: 'success',
      });
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : String(pokeCopy.profilePokeError);
      showToast({ message: errorMessage, type: 'warning' });
    } finally {
      setIsPokeLoading(false);
    }
  };

  const handleEditProfilePress = useCallback(() => {
    if (!isOwnProfile) return;
    setEditSheetVisible(true);
    tabBarVisibility.setVisible(false);
  }, [isOwnProfile]);

  const handleEditPersonalDetails = useCallback(() => {
    if (!isOwnProfile) return;
    navigation.navigate(ROUTES.EDIT_PROFILE);
  }, [isOwnProfile, navigation]);

  const handleEditCover = useCallback(() => {
    setEditSheetVisible(false);
    // Delay to let the close animation play before launching the picker.
    setTimeout(() => handleChangeCover(), 250);
  }, [handleChangeCover]);

  const handleEditDetails = useCallback(() => {
    setEditSheetVisible(false);
    tabBarVisibility.setVisible(true);
    setTimeout(() => navigation.navigate(ROUTES.EDIT_PROFILE), 250);
  }, [navigation]);

  const handleOpenFriendStory = useCallback((story: StoryItem) => {
    setStoryOptionsSheet(story);
    tabBarVisibility.setVisible(false);
  }, []);

  const handleConfirmViewStory = useCallback(() => {
    const story = storyOptionsSheet;
    setStoryOptionsSheet(null);
    tabBarVisibility.setVisible(true);
    if (story) {
      setTimeout(() => {
        navigation.navigate(ROUTES.STORY_VIEWER, {
          stories: [story],
          initialUserIndex: 0,
        });
      }, 250);
    }
  }, [storyOptionsSheet, navigation]);

  const handleViewProfileFromStory = useCallback(() => {
    const story = storyOptionsSheet;
    setStoryOptionsSheet(null);
    tabBarVisibility.setVisible(true);
    if (story?.publisher?.userId) {
      setTimeout(() => {
        handleNavigateToProfile(String(story.publisher.userId));
      }, 250);
    }
  }, [storyOptionsSheet, handleNavigateToProfile]);

  const profilePostsListContentStyle = useMemo(
    () => ({ paddingBottom: bottomContentPadding }),
    [bottomContentPadding],
  );
  const profileScrollIndicatorInsets = useMemo(
    () => ({ bottom: scrollIndicatorBottomInset }),
    [scrollIndicatorBottomInset],
  );
  const profileMediaSheetBackdropAnimatedStyle = useMemo(
    () => ({
      opacity: profileMediaSheetProgress,
    }),
    [profileMediaSheetProgress],
  );
  const profileMediaSheetAnimatedStyle = useMemo(
    () => ({
      opacity: profileMediaSheetProgress,
      transform: [
        {
          translateY: profileMediaSheetProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [28, 0],
            extrapolate: 'clamp',
          }),
        },
        {
          scale: profileMediaSheetProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.98, 1],
            extrapolate: 'clamp',
          }),
        },
      ],
    }),
    [profileMediaSheetProgress],
  );
  const activitiesSheetBackdropAnimatedStyle = useMemo(
    () => ({
      opacity: activitiesSheetProgress,
    }),
    [activitiesSheetProgress],
  );
  const activitiesSheetAnimatedStyle = useMemo(
    () => ({
      opacity: activitiesSheetProgress,
      transform: [
        {
          translateY: activitiesSheetProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [34, 0],
            extrapolate: 'clamp',
          }),
        },
        {
          scale: activitiesSheetProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.985, 1],
            extrapolate: 'clamp',
          }),
        },
      ],
    }),
    [activitiesSheetProgress],
  );

  const renderProfilePostContent = useCallback(
    (post: ProfileFeedPost) => {
      if (post.kind === 'video') {
        return (
          <View>
            <HomeVideoPostCard
              post={post}
              copy={postCardCopy}
              onReact={handleSetPostReaction}
              onOpenPicker={handleOpenPicker}
              onCommentTap={commentVm.openComments}
              onShare={handleOpenSharePost}
              isScreenFocused={isProfileFocused}
              gestureX={gestureX}
              gestureY={gestureY}
              gestureActive={gestureActive}
              gestureStartX={gestureStartX}
              gestureStartY={gestureStartY}
              hasDragged={hasDragged}
              navigateToProfile={handleNavigateToProfile}
              onOpenReactions={openReactionsSheet}
              onOpenPostMenu={handleOpenPostMenu}
              keepPreparedVideoMounted={!PROFILE_IS_ANDROID}
            />
          </View>
        );
      }

      if (post.kind === 'poll') {
        return (
          <PollPostCard
            post={post}
            onVote={handleVotePoll}
            onReact={handleSetPostReaction}
            onOpenPicker={handleOpenPicker}
            onCommentTap={commentVm.openComments}
            onShare={handleOpenSharePost}
            onProfilePress={handleNavigateToProfile}
            onMorePress={handleOpenPostMenu}
            currentUserAvatar={avatarUrl}
            gestureX={gestureX}
            gestureY={gestureY}
            gestureActive={gestureActive}
            gestureStartX={gestureStartX}
            gestureStartY={gestureStartY}
            hasDragged={hasDragged}
          />
        );
      }

      return (
        <TextPostCard
          post={post}
          copy={postCardCopy}
          onReact={handleSetPostReaction}
          onOpenPicker={handleOpenPicker}
          onCommentTap={commentVm.openComments}
          onPhotoPress={handlePhotoPress}
          onShare={handleOpenSharePost}
          gestureX={gestureX}
          gestureY={gestureY}
          gestureActive={gestureActive}
          gestureStartX={gestureStartX}
          gestureStartY={gestureStartY}
          hasDragged={hasDragged}
          navigateToProfile={handleNavigateToProfile}
          onOpenReactions={openReactionsSheet}
          onOpenPostMenu={handleOpenPostMenu}
        />
      );
    },
    [
      avatarUrl,
      commentVm.openComments,
      gestureActive,
      gestureStartX,
      gestureStartY,
      gestureX,
      gestureY,
      hasDragged,
      handleNavigateToProfile,
      handleOpenPicker,
      handleOpenPostMenu,
      handleOpenSharePost,
      handlePhotoPress,
      handleSetPostReaction,
      handleVotePoll,
      isProfileFocused,
      openReactionsSheet,
      postCardCopy,
    ],
  );

  const profileListItemKeyExtractor = useCallback((item: ProfileListItem) => {
    if (item.type === 'post') {
      return `${item.post.kind}-${item.post.id}`;
    }
    if (item.type === 'live') {
      return `live-${item.item.postId}`;
    }
    return item.type;
  }, []);

  const profileListItemType = useCallback((item: ProfileListItem) => {
    if (item.type === 'post') return item.post.kind;
    return item.type;
  }, []);

  const profileContentHeader = (
    <>
      {/* Cover Photo */}
      <View
        key={`cover-${targetUserId}-${isOwnProfile}`}
        style={profileMainStyles.coverContainer}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleCoverPress}
          style={{ width: SCREEN_WIDTH, height: PROFILE_COVER_HEIGHT }}
        >
          <Image
            source={{ uri: coverUrl }}
            style={{ width: SCREEN_WIDTH, height: PROFILE_COVER_HEIGHT }}
            resizeMode="cover"
          />
        </TouchableOpacity>

        {isLoadingCover && (
          <View
            className="absolute inset-0 bg-black/30 items-center justify-center"
            style={{ zIndex: 998 }}
          >
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}

        {isOwnProfile && (
          <TouchableOpacity
            style={[
              profileMainStyles.editCoverButton,
              { zIndex: 100, elevation: 12 },
            ]}
            activeOpacity={0.85}
            onPress={handleEditProfilePress}
          >
            <Edit size={14} color="#050505" />
            <Text style={profileMainStyles.editCoverText}>
              {language === 'vi' ? 'Chỉnh sửa hồ sơ' : 'Edit profile'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Details Card (White Container) */}
      <View style={profileMainStyles.profileInfoCard}>
        {/* Avatar Section */}
        <View style={profileMainStyles.avatarRow}>
          <View style={profileMainStyles.avatarContainer}>
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85}>
              {userStory ? (
                // Instagram-style story ring avatar.
                <View
                  style={{
                    width: 110,
                    height: 110,
                    position: 'relative',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Svg
                    width={110}
                    height={110}
                    style={{ position: 'absolute', top: 0, left: 0 }}
                  >
                    <Defs>
                      <SvgLinearGradient
                        id="profileAvatarStoryInstagramGradient"
                        x1="8%"
                        y1="94%"
                        x2="92%"
                        y2="6%"
                      >
                        <Stop offset="0%" stopColor="#FEDA75" />
                        <Stop offset="19%" stopColor="#FA7E1E" />
                        <Stop offset="45%" stopColor="#D62976" />
                        <Stop offset="72%" stopColor="#962FBF" />
                        <Stop offset="100%" stopColor="#4F5BD5" />
                      </SvgLinearGradient>
                    </Defs>
                    <Circle
                      cx={55}
                      cy={55}
                      r={51.7}
                      stroke="url(#profileAvatarStoryInstagramGradient)"
                      strokeWidth={5.2}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </Svg>
                  <View
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      overflow: 'hidden',
                      borderWidth: 4,
                      borderColor: '#FFFFFF',
                      backgroundColor: '#CBD5E1',
                      position: 'relative',
                    }}
                  >
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                    {isLoadingAvatar && (
                      <View
                        className="absolute inset-0 bg-black/30 items-center justify-center rounded-full"
                        style={{ zIndex: 998 }}
                      >
                        <ActivityIndicator size="small" color="#ffffff" />
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    profileMainStyles.avatarBorder,
                    {
                      borderWidth: 0,
                      borderColor: 'transparent',
                      padding: 0,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      overflow: 'hidden',
                      borderWidth: 4,
                      borderColor: '#FFFFFF',
                      backgroundColor: '#CBD5E1',
                      position: 'relative',
                    }}
                  >
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                    {isLoadingAvatar && (
                      <View
                        className="absolute inset-0 bg-black/30 items-center justify-center rounded-full"
                        style={{ zIndex: 998 }}
                      >
                        <ActivityIndicator size="small" color="#ffffff" />
                      </View>
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Edit Avatar Badge */}
            {isOwnProfile && (
              <TouchableOpacity
                style={profileMainStyles.avatarCameraBadge}
                activeOpacity={0.8}
                onPress={handleChangeAvatar}
              >
                {isLoadingAvatar ? (
                  <ActivityIndicator size="small" color="#050505" />
                ) : (
                  <Camera size={14} color="#050505" />
                )}
              </TouchableOpacity>
            )}
          </View>
          <View style={profileMainStyles.identityBesideAvatar}>
            <View style={profileMainStyles.nameRow}>
              <Text
                allowFontScaling={false}
                style={profileMainStyles.displayNameText}
                numberOfLines={2}
              >
                {displayName || copy.userFallback}
              </Text>
              {profile?.verified && (
                <View className="ml-2 mt-0.5">
                  <Verified
                    size={18}
                    color="#FFFFFF"
                    fill={APP_COLORS.status.info}
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={profileMainStyles.profileStatsFullWidth}>
          <Text
            allowFontScaling={false}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            numberOfLines={1}
            style={profileMainStyles.profileStatsText}
          >
            {profilePostCountText}
            {' · '}
            <Text
              accessibilityRole="button"
              onPress={handleOpenFollowersList}
              style={profileMainStyles.profileStatsLinkText}
            >
              {language === 'vi'
                ? `${formatCount(followers.length)} người theo dõi`
                : `${formatCount(followers.length)} followers`}
            </Text>
            {' · '}
            <Text
              accessibilityRole="button"
              onPress={handleOpenFollowingList}
              style={profileMainStyles.profileStatsLinkText}
            >
              {language === 'vi'
                ? `${formatCount(following.length)} đang theo dõi`
                : `${formatCount(following.length)} following`}
            </Text>
          </Text>
        </View>

        {isOwnProfile && profileFollowerPreview.length > 0 && (
          <TouchableOpacity
            style={profileMainStyles.followerPreviewRow}
            activeOpacity={0.78}
            onPress={handleOpenFollowersList}
          >
            <View style={profileMainStyles.followerAvatarStack}>
              {profileFollowerPreview.map((follower, index) => (
                <View
                  key={String(follower.id)}
                  style={[
                    profileMainStyles.followerAvatarWrap,
                    index > 0 && profileMainStyles.followerAvatarOverlap,
                    { zIndex: profileFollowerPreview.length - index },
                  ]}
                >
                  <Image
                    source={{ uri: follower.avatarUrl ?? FALLBACK_AVATAR }}
                    style={profileMainStyles.followerAvatar}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>
            <Text style={profileMainStyles.followerPreviewText}>
              {language === 'vi' ? 'Người theo dõi mình' : 'My followers'}
            </Text>
          </TouchableOpacity>
        )}

        {!!cleanProfileValue(profile?.about) && (
          <Text style={profileMainStyles.profileBioText} numberOfLines={3}>
            {cleanProfileValue(profile?.about)}
          </Text>
        )}

        {/* Action Buttons Row */}
        <View
          key={`actions-${targetUserId}-${isOwnProfile}`}
          style={profileMainStyles.primaryButtonsRow}
        >
          {isOwnProfile ? (
            <>
              <TouchableOpacity
                style={profileMainStyles.dashboardButton}
                activeOpacity={0.85}
                onPress={handleOpenSettings}
              >
                <Edit size={16} color="#FFFFFF" />
                <Text
                  style={profileMainStyles.dashboardButtonText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.9}
                >
                  {copy.dashboard}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  profileMainStyles.storyAddButton,
                  profileMainStyles.activitiesActionButton,
                ]}
                activeOpacity={0.85}
                onPress={handleOpenActivities}
              >
                <Sparkles size={16} color={APP_BRAND_COLOR} />
                <Text
                  style={profileMainStyles.storyAddButtonText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.86}
                >
                  {copy.addToStory}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  profileMainStyles.storyAddButton,
                  profileMainStyles.cartActionButton,
                ]}
                activeOpacity={0.85}
                onPress={handleOpenCart}
              >
                <ShoppingCart size={16} color={APP_BRAND_COLOR} />
                <Text
                  style={profileMainStyles.storyAddButtonText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.9}
                >
                  {copy.cartLabel}
                </Text>
              </TouchableOpacity>
            </>
          ) : isFriendProfile ? (
            <>
              <TouchableOpacity
                className="h-10 flex-1 flex-row items-center justify-center rounded-full bg-[#E4E6EB] px-4"
                activeOpacity={0.8}
                onPress={openRelationshipActionsSheet}
              >
                <UserCheck size={16} color="#050505" />
                <Text className="ml-1.5 text-[14px] font-bold text-[#050505]">
                  {copy.followed}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="h-10 flex-1 flex-row items-center justify-center rounded-full bg-brand px-4"
                activeOpacity={0.8}
                onPress={handleOpenMessages}
              >
                <MessageCircle size={16} color="#FFFFFF" />
                <Text className="ml-1.5 text-[14px] font-bold text-white">
                  {copy.message}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="h-10 w-[82px] flex-row items-center justify-center rounded-full bg-[#E4E6EB]"
                activeOpacity={0.8}
                disabled={isPokeLoading}
                onPress={handlePokeUser}
              >
                <Sparkles size={15} color="#050505" />
                <Text className="ml-1 text-[13px] font-bold text-[#050505]">
                  {copy.poke}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                className={`h-10 flex-1 flex-row items-center justify-center rounded-full px-4 ${
                  isRequestedProfile ? 'bg-[#E4E6EB]' : 'bg-brand'
                }`}
                activeOpacity={0.8}
                disabled={isRequestedProfile || isConnectLoading}
                onPress={handleConnectUser}
              >
                <UserPlus
                  size={16}
                  color={isRequestedProfile ? '#050505' : '#FFFFFF'}
                />
                <Text
                  className={`ml-1.5 text-[14px] font-bold ${
                    isRequestedProfile ? 'text-[#050505]' : 'text-white'
                  }`}
                >
                  {isRequestedProfile
                    ? copy.requestSent
                    : isConnectLoading
                    ? copy.sending
                    : copy.follow}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="h-10 flex-1 flex-row items-center justify-center rounded-full bg-[#E4E6EB] px-4"
                activeOpacity={0.8}
                onPress={handleOpenMessages}
              >
                <MessageCircle size={16} color="#050505" />
                <Text className="ml-1.5 text-[14px] font-bold text-[#050505]">
                  {copy.message}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Stories (Tin) Section */}
      {shouldShowStorySection && (
        <View
          style={[
            { borderWidth: 0, borderRadius: 0, padding: 14 },
            profileMainStyles.halfCard,
          ]}
        >
          <View style={profileMainStyles.cardHeader}>
            <Text style={profileMainStyles.cardTitle}>{copy.stories}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenStoriesList}
            >
              <Text style={profileMainStyles.cardHeaderAction}>
                {language === 'vi' ? 'Xem tất cả >' : 'See all >'}
              </Text>
            </TouchableOpacity>
          </View>

          {isStoryLoading && !userStory ? (
            <View style={profileStoryStyles.skeletonRow}>
              {[0, 1].map(item => (
                <View
                  key={`story-skeleton-${item}`}
                  style={profileStoryStyles.skeletonCard}
                >
                  <SkeletonBlock height={100} width={95} borderRadius={12} />
                  <View style={{ marginTop: 6 }}>
                    <SkeletonBlock height={10} width={68} borderRadius={5} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {isOwnProfile && (
                <View style={{ width: 95 }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={{
                      height: 100,
                      width: 95,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: '#CBD5E1',
                      backgroundColor: '#FFFFFF',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={handleCreateStory}
                  >
                    <PlusCircle size={22} color={APP_BRAND_COLOR} />
                  </TouchableOpacity>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: APP_BRAND_COLOR,
                      textAlign: 'center',
                      marginTop: 6,
                    }}
                    numberOfLines={1}
                  >
                    {language === 'vi' ? 'Tạo tin mới' : 'Create story'}
                  </Text>
                </View>
              )}

              {!!userStory && (
                <View style={{ width: 95 }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={{
                      height: 100,
                      width: 95,
                      borderRadius: 12,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                    onPress={handleOpenStory}
                  >
                    <ProfileStoryCover
                      story={userStory}
                      fallbackUri={avatarUrl || FALLBACK_AVATAR}
                    />
                    <View style={profileStoryStyles.overlay} />
                    {userStory.hasUnseen && (
                      <View style={profileMainStyles.friendOnlineDot} />
                    )}
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: '#FFFFFF',
                        backgroundColor: '#FFFFFF',
                        overflow: 'hidden',
                      }}
                    >
                      <Image
                        source={{ uri: avatarUrl }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </View>
                  </TouchableOpacity>
                  <Text style={profileMainStyles.friendName} numberOfLines={1}>
                    {language === 'vi' ? 'Tin của bạn' : 'Your story'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      color: '#65676B',
                      textAlign: 'center',
                      marginTop: 1,
                    }}
                    numberOfLines={1}
                  >
                    {getStoryTimeText(userStory, language)}
                  </Text>
                </View>
              )}

              {allStories.map(story => (
                <View key={`friend-story-${story.id}`} style={{ width: 95 }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={{
                      height: 100,
                      width: 95,
                      borderRadius: 12,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                    onPress={() => handleOpenFriendStory(story)}
                  >
                    <ProfileStoryCover
                      story={story}
                      fallbackUri={story.publisher.avatarUrl || FALLBACK_AVATAR}
                    />
                    <View style={profileStoryStyles.overlay} />
                    {story.hasUnseen && (
                      <View style={profileMainStyles.friendOnlineDot} />
                    )}
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: '#FFFFFF',
                        backgroundColor: '#FFFFFF',
                        overflow: 'hidden',
                      }}
                    >
                      <Image
                        source={{
                          uri: story.publisher.avatarUrl || FALLBACK_AVATAR,
                        }}
                        style={{ width: '100%', height: '100%' }}
                      />
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: '#22C55E',
                          borderWidth: 1,
                          borderColor: '#FFFFFF',
                        }}
                      />
                    </View>
                  </TouchableOpacity>
                  <Text style={profileMainStyles.friendName} numberOfLines={1}>
                    {story.publisher.name || story.publisher.username}
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      color: '#65676B',
                      textAlign: 'center',
                      marginTop: 1,
                    }}
                    numberOfLines={1}
                  >
                    {getStoryTimeText(story, language)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
      <View className="h-px bg-[#E4E6EB]" />

      {/* Personal information — full-width, expandable, and education-free. */}
      <View style={profileMainStyles.profileOverviewSection}>
        <View style={profileMainStyles.overviewSectionHeader}>
          <Text style={profileMainStyles.overviewSectionTitle}>
            {copy.details}
          </Text>
          {isOwnProfile && (
            <TouchableOpacity
              style={profileMainStyles.overviewEditButton}
              activeOpacity={0.8}
              onPress={handleEditPersonalDetails}
            >
              <Edit size={17} color="#65676B" />
            </TouchableOpacity>
          )}
        </View>

        {visibleProfileDetailItems.length > 0 ? (
          visibleProfileDetailItems.map(item => {
            const DetailIcon = item.Icon;
            return (
              <View key={item.key} style={profileMainStyles.personalDetailRow}>
                <View style={profileMainStyles.personalDetailIcon}>
                  <DetailIcon size={19} color="#050505" strokeWidth={2} />
                </View>
                <Text style={profileMainStyles.personalDetailText}>
                  {item.text}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={profileMainStyles.personalDetailsEmptyText}>
            {language === 'vi'
              ? 'Chưa có thông tin cá nhân công khai.'
              : 'No public personal information yet.'}
          </Text>
        )}

        {hasAdditionalProfileDetails && (
          <TouchableOpacity
            style={profileMainStyles.seeMoreDetailsButton}
            activeOpacity={0.78}
            onPress={() =>
              setPersonalDetailsExpanded(currentValue => !currentValue)
            }
          >
            <Text style={profileMainStyles.seeMoreDetailsText}>
              {isPersonalDetailsExpanded
                ? language === 'vi'
                  ? 'Thu gọn chi tiết'
                  : 'Show fewer details'
                : language === 'vi'
                ? 'Xem thêm chi tiết'
                : 'See more details'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Composer — shared with Home feed */}
      {isOwnProfile && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            marginTop: 12,
            paddingTop: 4,
          }}
        >
          <ComposerCard
            onPress={() => navigation.navigate(ROUTES.CREATE_POST)}
            avatarUrl={avatarUrl}
            copy={{
              composerPlaceholder: copy.composerPlaceholder,
              library: language === 'vi' ? 'Ảnh/video' : 'Photo/video',
              tag: language === 'vi' ? 'Gắn thẻ' : 'Tag',
              feeling: language === 'vi' ? 'Cảm xúc' : 'Feeling',
            }}
          />
        </View>
      )}

      {/* Posts Section Header */}
      <View style={profileMainStyles.postsHeader}>
        <View>
          <Text style={profileMainStyles.postsTabTitle}>{copy.posts}</Text>
          <View style={profileMainStyles.postsTabUnderline} />
        </View>
        {isOwnProfile ? (
          <TouchableOpacity
            style={profileMainStyles.managePostsButton}
            activeOpacity={0.8}
          >
            <Sliders size={12} color={APP_BRAND_COLOR} />
            <Text style={profileMainStyles.managePostsText}>
              {language === 'vi' ? 'Quản lý bài viết' : 'Manage posts'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={profileMainStyles.managePostsButton}
            activeOpacity={0.8}
            onPress={handleOpenPublicProducts}
          >
            <ShoppingBag size={13} color={APP_BRAND_COLOR} />
            <Text style={profileMainStyles.managePostsText}>
              {language === 'vi' ? 'Sản phẩm' : 'Products'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const profilePostsEmptyComponent = useMemo(
    () =>
      isPostsLoading && posts.length === 0 ? (
        <View>
          <PostSkeletonCard />
          <PostSkeletonCard />
        </View>
      ) : postsError ? (
        <View style={profilePostStyles.stateCard}>
          <Text style={[profilePostStyles.stateText, { color: '#EF4444' }]}>
            {copy.loadPostsError}: {postsError}
          </Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={profilePostStyles.stateCard}>
          <Text style={profilePostStyles.stateText}>{copy.noPosts}</Text>
        </View>
      ) : null,
    [
      copy.loadPostsError,
      copy.noPosts,
      isPostsLoading,
      posts.length,
      postsError,
    ],
  );

  const profilePostsFooterComponent = useMemo(
    () =>
      isLoadingMorePosts ? (
        <View className="items-center py-4">
          <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
        </View>
      ) : null,
    [isLoadingMorePosts],
  );

  const shouldRenderProfilePostsState = profilePostsEmptyComponent !== null;
  const profileListItems = useMemo<ProfileListItem[]>(() => {
    const items: ProfileListItem[] = [];
    if (activeProfileLive) {
      items.push({ type: 'live', item: activeProfileLive });
    }

    if (shouldRenderProfilePostsState) {
      items.push({ type: 'state' });
    } else {
      filteredProfilePosts.forEach(post => {
        items.push({ type: 'post', post });
      });
    }
    return items;
  }, [activeProfileLive, filteredProfilePosts, shouldRenderProfilePostsState]);

  const renderProfileListItem = useCallback(
    ({ item }: FlashListRenderItemInfo<ProfileListItem>) => {
      if (item.type === 'state') {
        return <>{profilePostsEmptyComponent}</>;
      }

      if (item.type === 'live') {
        return (
          <LiveStreamPostCard
            item={item.item}
            copy={postCardCopy}
            onPress={handleOpenProfileLive}
          />
        );
      }

      return renderProfilePostContent(item.post);
    },
    [
      handleOpenProfileLive,
      postCardCopy,
      profilePostsEmptyComponent,
      renderProfilePostContent,
    ],
  );

  const canSwipeBackToPreviousProfileScreen = navigation.canGoBack();
  const isProfileSwipeBackBlocked =
    Boolean(photoViewer) ||
    profileCropRequest !== null ||
    profileMediaSheet !== null ||
    isActivitiesSheetVisible ||
    isRelationshipSheetVisible ||
    editSheetVisible ||
    storyOptionsSheet !== null ||
    shareModalVisible ||
    postMenuVisible ||
    reactionsSheetVisible ||
    commentVm.isCommentsOpen;

  const profileSwipeBackGesture = useMemo(
    () =>
      Gesture.Pan()
        .hitSlop({
          left: PROFILE_BACK_GESTURE_START_X,
          width: PROFILE_BACK_GESTURE_WIDTH,
          top: -profileHeaderHeight,
        })
        .activeOffsetX([PROFILE_BACK_GESTURE_ACTIVE_OFFSET_X, 999])
        .failOffsetY([
          -PROFILE_BACK_GESTURE_FAIL_OFFSET_Y,
          PROFILE_BACK_GESTURE_FAIL_OFFSET_Y,
        ])
        .enabled(
          canSwipeBackToPreviousProfileScreen && !isProfileSwipeBackBlocked,
        )
        .onBegin(() => {
          'worklet';
          if (profileBackClosing.value) return;
          cancelAnimation(profileBackTranslateX);
        })
        .onUpdate(event => {
          'worklet';
          if (profileBackClosing.value) return;
          profileBackTranslateX.value = Math.min(
            SCREEN_WIDTH,
            Math.max(0, event.translationX),
          );
        })
        .onEnd(event => {
          'worklet';
          if (profileBackClosing.value) return;

          const shouldClose =
            event.translationX >
              SCREEN_WIDTH * PROFILE_BACK_GESTURE_DISTANCE_RATIO ||
            event.velocityX > PROFILE_BACK_GESTURE_VELOCITY;

          if (shouldClose) {
            profileBackClosing.value = true;
            profileBackTranslateX.value = withTiming(
              SCREEN_WIDTH,
              {
                duration: PROFILE_BACK_CLOSE_DURATION_MS,
                easing: Easing.out(Easing.cubic),
              },
              finished => {
                if (finished) {
                  runOnJS(handleProfileBack)();
                }
              },
            );
            return;
          }

          profileBackTranslateX.value = withTiming(0, {
            duration: PROFILE_BACK_CANCEL_DURATION_MS,
            easing: Easing.out(Easing.cubic),
          });
        }),
    [
      canSwipeBackToPreviousProfileScreen,
      handleProfileBack,
      isProfileSwipeBackBlocked,
      profileBackClosing,
      profileBackTranslateX,
      profileHeaderHeight,
    ],
  );

  const profileSwipeBackScreenStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, profileBackTranslateX.value / SCREEN_WIDTH);

    return {
      borderTopLeftRadius: interpolate(progress, [0, 1], [0, 18], 'clamp'),
      borderBottomLeftRadius: interpolate(progress, [0, 1], [0, 18], 'clamp'),
      transform: [{ translateX: profileBackTranslateX.value }],
    };
  });

  const profileSwipeBackDimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      profileBackTranslateX.value,
      [0, SCREEN_WIDTH * PROFILE_BACK_GESTURE_DISTANCE_RATIO, SCREEN_WIDTH],
      [0.1, 0.06, 0],
      'clamp',
    ),
  }));

  const profileSwipeBackCueStyle = useAnimatedStyle(() => {
    const threshold = SCREEN_WIDTH * PROFILE_BACK_GESTURE_DISTANCE_RATIO;

    return {
      opacity: interpolate(
        profileBackTranslateX.value,
        [0, 34, threshold],
        [0, 0.85, 1],
        'clamp',
      ),
      transform: [
        {
          translateX: interpolate(
            profileBackTranslateX.value,
            [0, threshold],
            [-54, 18],
            'clamp',
          ),
        },
        {
          scale: interpolate(
            profileBackTranslateX.value,
            [0, threshold],
            [0.76, 1.08],
            'clamp',
          ),
        },
      ],
    };
  });

  const profilePostsListElement = (
    <FlashList
      style={profileMainStyles.postsList}
      data={profileListItems}
      keyExtractor={profileListItemKeyExtractor}
      getItemType={profileListItemType}
      renderItem={renderProfileListItem}
      ListHeaderComponent={profileContentHeader}
      ListFooterComponent={profilePostsFooterComponent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={profilePostsListContentStyle}
      scrollIndicatorInsets={profileScrollIndicatorInsets}
      onLayout={handleProfileViewportLayout}
      onScroll={handleProfileScroll}
      onScrollBeginDrag={handleProfileScrollBegin}
      onMomentumScrollBegin={handleProfileMomentumScrollBegin}
      onMomentumScrollEnd={finishProfileScroll}
      onScrollEndDrag={handleProfileScrollEndDrag}
      scrollEventThrottle={16}
      onEndReached={handleLoadMorePosts}
      onEndReachedThreshold={0.35}
      onViewableItemsChanged={onProfilePostViewableItemsChanged}
      viewabilityConfig={profilePostsViewabilityConfigRef.current}
      drawDistance={PROFILE_POST_DRAW_DISTANCE}
      maxItemsInRecyclePool={PROFILE_POST_RECYCLE_POOL_SIZE}
      maintainVisibleContentPosition={
        PROFILE_POST_MAINTAIN_VISIBLE_CONTENT_POSITION
      }
      removeClippedSubviews={PROFILE_IS_ANDROID}
    />
  );

  const profileHeaderOverlayElement = (
    <View
      style={[
        profileMainStyles.headerOverlay,
        {
          paddingTop: safeTopInset + 8,
          height: profileHeaderHeight,
        },
      ]}
      pointerEvents="box-none"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          profileMainStyles.headerOverlaySolidBackdrop,
          { opacity: profileHeaderSolidProgress },
        ]}
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={language === 'vi' ? 'Quay lại' : 'Back'}
        style={[
          profileMainStyles.circleButton,
          isProfileHeaderSolid && profileMainStyles.circleButtonOnSolidHeader,
        ]}
        activeOpacity={0.8}
        hitSlop={PROFILE_HEADER_BUTTON_HIT_SLOP}
        onPress={handleProfileBack}
      >
        <ArrowLeft size={18} color="#050505" />
      </TouchableOpacity>

      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          style={[
            profileMainStyles.circleButton,
            isProfileHeaderSolid && profileMainStyles.circleButtonOnSolidHeader,
          ]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate(ROUTES.SEARCH)}
        >
          <Search size={18} color="#050505" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            profileMainStyles.circleButton,
            isProfileHeaderSolid && profileMainStyles.circleButtonOnSolidHeader,
          ]}
          activeOpacity={0.8}
          onPress={handleOpenProfileMore}
        >
          <MoreHorizontal size={18} color="#050505" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading && !profile) {
    return <FullProfileSkeleton onBack={handleProfileBack} />;
  }

  return (
    <GestureHandlerRootView style={profileMainStyles.gestureRoot}>
      <Reanimated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          profileMainStyles.profileSwipeBackDim,
          profileSwipeBackDimStyle,
        ]}
      />
      <Reanimated.View
        pointerEvents="none"
        style={[
          profileMainStyles.profileSwipeBackCue,
          profileSwipeBackCueStyle,
        ]}
      >
        <ArrowLeft size={18} color={APP_BRAND_COLOR} strokeWidth={2.6} />
        <Text style={profileMainStyles.profileSwipeBackCueText}>
          {language === 'vi' ? 'Vuốt để quay lại' : 'Swipe to go back'}
        </Text>
      </Reanimated.View>
      <GestureDetector gesture={profileSwipeBackGesture}>
        <Reanimated.View
          style={[profileMainStyles.container, profileSwipeBackScreenStyle]}
        >
          <FocusAwareStatusBar
            barStyle="dark-content"
            translucent
            backgroundColor="transparent"
          />
          {profilePostsListElement}
          {profileHeaderOverlayElement}
          <Modal
            visible={isRelationshipSheetVisible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={closeRelationshipActionsSheet}
          >
            <View style={profileMainStyles.relationshipSheetRoot}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={closeRelationshipActionsSheet}
                style={profileMainStyles.relationshipSheetBackdrop}
              />
              <View
                style={[
                  profileMainStyles.relationshipSheetCard,
                  { paddingBottom: Math.max(insets.bottom, 18) },
                ]}
              >
                <View style={profileMainStyles.relationshipSheetHandle} />
                <Text style={profileMainStyles.relationshipSheetTitle}>
                  {copy.followActionsTitle}
                </Text>
                <Text style={profileMainStyles.relationshipSheetSubtitle}>
                  {copy.followActionsSubtitle}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={handleUnfollowFromProfile}
                  disabled={relationshipAction !== null}
                  style={profileMainStyles.relationshipSheetAction}
                >
                  <View
                    style={[
                      profileMainStyles.relationshipSheetActionIcon,
                      { backgroundColor: APP_COLORS.brand.soft },
                    ]}
                  >
                    {relationshipAction === 'unfollow' ? (
                      <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
                    ) : (
                      <UserMinus size={18} color={APP_BRAND_COLOR} />
                    )}
                  </View>
                  <View
                    style={profileMainStyles.relationshipSheetActionContent}
                  >
                    <Text
                      style={profileMainStyles.relationshipSheetActionTitle}
                    >
                      {copy.unfollow}
                    </Text>
                    <Text style={profileMainStyles.relationshipSheetActionHint}>
                      {copy.unfollowHint}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={handleBlockFromProfile}
                  disabled={relationshipAction !== null}
                  style={profileMainStyles.relationshipSheetAction}
                >
                  <View
                    style={[
                      profileMainStyles.relationshipSheetActionIcon,
                      { backgroundColor: '#FEF2F2' },
                    ]}
                  >
                    {relationshipAction === 'block' ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <UserRoundX size={18} color="#EF4444" />
                    )}
                  </View>
                  <View
                    style={profileMainStyles.relationshipSheetActionContent}
                  >
                    <Text
                      style={[
                        profileMainStyles.relationshipSheetActionTitle,
                        { color: APP_COLORS.status.destructive },
                      ]}
                    >
                      {copy.blockUser}
                    </Text>
                    <Text style={profileMainStyles.relationshipSheetActionHint}>
                      {copy.blockHint}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={closeRelationshipActionsSheet}
                  style={profileMainStyles.relationshipSheetCancel}
                  disabled={relationshipAction !== null}
                >
                  <Text style={profileMainStyles.relationshipSheetCancelText}>
                    {copy.sheetCancel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          <EditProfileActionSheet
            visible={isOwnProfile && editSheetVisible}
            onClose={() => {
              setEditSheetVisible(false);
              tabBarVisibility.setVisible(true);
            }}
            language={language}
            avatarUrl={avatarUrl}
            onChangeCover={handleEditCover}
            onEditDetails={handleEditDetails}
            copy={{
              title: copy.editProfileSheetTitle,
              subtitle: copy.editProfileSheetSubtitle,
              changeCoverLabel: copy.changeCoverLabel,
              changeCoverHint: copy.changeCoverHint,
              editDetailsLabel: copy.editDetailsLabel,
              editDetailsHint: copy.editDetailsHint,
              cancel: copy.sheetCancel,
            }}
          />
          <Modal
            visible={!!profileMediaSheet}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleCloseProfileMediaSheet}
          >
            <View style={profileMainStyles.mediaSheetRoot}>
              <Animated.View
                pointerEvents="none"
                style={[
                  profileMainStyles.mediaSheetBackdrop,
                  profileMediaSheetBackdropAnimatedStyle,
                ]}
              />
              <TouchableOpacity
                activeOpacity={1}
                onPress={handleCloseProfileMediaSheet}
                style={StyleSheet.absoluteFill}
              />
              <Animated.View
                style={[
                  profileMainStyles.mediaSheet,
                  { paddingBottom: Math.max(insets.bottom, 16) },
                  profileMediaSheetAnimatedStyle,
                ]}
              >
                <View style={profileMainStyles.mediaSheetHandle} />
                <View style={profileMainStyles.mediaSheetHeader}>
                  <Image
                    source={{
                      uri: profileMediaSheet === 'cover' ? coverUrl : avatarUrl,
                    }}
                    style={[
                      profileMainStyles.mediaSheetPreview,
                      profileMediaSheet === 'avatar' &&
                        profileMainStyles.mediaSheetAvatarPreview,
                    ]}
                    resizeMode="cover"
                  />
                  <View style={profileMainStyles.mediaSheetTitleWrap}>
                    <Text style={profileMainStyles.mediaSheetTitle}>
                      {profileMediaSheet === 'cover'
                        ? language === 'vi'
                          ? 'Ảnh bìa'
                          : 'Cover photo'
                        : copy.avatarOptionsTitle}
                    </Text>
                    <Text
                      style={profileMainStyles.mediaSheetSubtitle}
                      numberOfLines={1}
                    >
                      {displayName || copy.userFallback}
                    </Text>
                  </View>
                </View>

                {profileMediaSheet === 'avatar' && userStory ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={handleViewStoryFromMediaSheet}
                    style={profileMainStyles.mediaActionRow}
                  >
                    <View
                      style={[
                        profileMainStyles.mediaActionIcon,
                        { backgroundColor: APP_COLORS.brand.soft },
                      ]}
                    >
                      <Sparkles size={19} color={APP_BRAND_COLOR} />
                    </View>
                    <View style={profileMainStyles.mediaActionContent}>
                      <Text style={profileMainStyles.mediaActionLabel}>
                        {copy.viewStory}
                      </Text>
                      <Text style={profileMainStyles.mediaActionHint}>
                        {isOwnProfile
                          ? language === 'vi'
                            ? 'Mở tin đang hoạt động của bạn'
                            : 'Open your active story'
                          : language === 'vi'
                          ? `Xem ${userStory.media.length} đoạn tin của ${displayName}`
                          : `View ${userStory.media.length} story segments from ${displayName}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={handleViewProfileMedia}
                  style={profileMainStyles.mediaActionRow}
                >
                  <View
                    style={[
                      profileMainStyles.mediaActionIcon,
                      { backgroundColor: '#E7F3FF' },
                    ]}
                  >
                    <Eye size={19} color={APP_BRAND_COLOR} />
                  </View>
                  <View style={profileMainStyles.mediaActionContent}>
                    <Text style={profileMainStyles.mediaActionLabel}>
                      {profileMediaSheet === 'cover'
                        ? language === 'vi'
                          ? 'Xem ảnh bìa'
                          : 'View cover photo'
                        : copy.viewAvatarLabel}
                    </Text>
                    <Text style={profileMainStyles.mediaActionHint}>
                      {profileMediaSheet === 'cover'
                        ? language === 'vi'
                          ? 'Mở ảnh bìa hiện tại'
                          : 'Open current cover photo'
                        : copy.viewAvatarHint}
                    </Text>
                  </View>
                </TouchableOpacity>

                {isOwnProfile ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={handleChangeProfileMedia}
                    style={profileMainStyles.mediaActionRow}
                  >
                    <View
                      style={[
                        profileMainStyles.mediaActionIcon,
                        { backgroundColor: '#ECFEFF' },
                      ]}
                    >
                      <Camera size={19} color="#0891B2" />
                    </View>
                    <View style={profileMainStyles.mediaActionContent}>
                      <Text style={profileMainStyles.mediaActionLabel}>
                        {profileMediaSheet === 'cover'
                          ? copy.changeCoverLabel
                          : language === 'vi'
                          ? 'Thay ảnh đại diện'
                          : 'Change profile picture'}
                      </Text>
                      <Text style={profileMainStyles.mediaActionHint}>
                        {profileMediaSheet === 'cover'
                          ? copy.changeCoverHint
                          : language === 'vi'
                          ? 'Cập nhật ảnh đại diện của bạn'
                          : 'Update your profile picture'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {isOwnProfile && profileMediaSheet === 'avatar' ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={handleCreateStoryFromMediaSheet}
                    style={profileMainStyles.mediaActionRow}
                  >
                    <View
                      style={[
                        profileMainStyles.mediaActionIcon,
                        { backgroundColor: '#F5F3FF' },
                      ]}
                    >
                      <PlusCircle size={19} color="#7C3AED" />
                    </View>
                    <View style={profileMainStyles.mediaActionContent}>
                      <Text style={profileMainStyles.mediaActionLabel}>
                        {copy.createStory}
                      </Text>
                      <Text style={profileMainStyles.mediaActionHint}>
                        {language === 'vi'
                          ? 'Đăng tin mới từ hồ sơ của bạn'
                          : 'Create a new story from your profile'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={handleCloseProfileMediaSheet}
                  style={profileMainStyles.mediaCancelButton}
                >
                  <Text style={profileMainStyles.mediaCancelText}>
                    {copy.sheetCancel}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Modal>
          <StoryOptionsSheet
            visible={!!storyOptionsSheet}
            story={
              storyOptionsSheet
                ? { publisher: storyOptionsSheet.publisher }
                : null
            }
            onClose={() => {
              setStoryOptionsSheet(null);
              tabBarVisibility.setVisible(true);
            }}
            language={language}
            onViewStory={handleConfirmViewStory}
            onViewProfile={handleViewProfileFromStory}
            copy={{
              title: copy.storySheetTitle(
                storyOptionsSheet?.publisher?.name?.trim() ||
                  (language === 'vi' ? 'người dùng' : 'user'),
              ),
              subtitle: copy.storySheetSubtitle,
              viewStoryLabel: copy.viewStoryAction,
              viewStoryHint: copy.viewStoryHint,
              viewProfileLabel: copy.viewProfileAction,
              viewProfileHint: copy.viewProfileHint,
              cancel: copy.sheetCancel,
            }}
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
          <PostReactionsSheet
            visible={reactionsSheetVisible}
            postId={reactionsSheetPostId}
            onClose={closeReactionsSheet}
          />
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
          <PhotoViewerModal
            state={photoViewer}
            onClose={handleClosePhotoViewer}
            onReact={handleSetPostReaction}
            onCommentTap={handlePhotoViewerCommentTap}
            onProfilePress={handleNavigateToProfile}
            onInternalShare={handleInternalSharePost}
            onFollowChange={handlePhotoViewerFollowChange}
            posts={posts}
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
          />
          <ShareActionSheet
            visible={shareModalVisible}
            onClose={handleCloseShareModal}
            post={sharingPost}
          />
          <Modal
            visible={isActivitiesSheetVisible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleCloseActivities}
          >
            <View style={profileMainStyles.activitiesModalRoot}>
              <Animated.View
                pointerEvents="none"
                style={[
                  profileMainStyles.activitiesBackdrop,
                  activitiesSheetBackdropAnimatedStyle,
                ]}
              />
              <TouchableOpacity
                activeOpacity={1}
                onPress={handleCloseActivities}
                style={StyleSheet.absoluteFill}
              />
              <Animated.View
                style={[
                  profileMainStyles.activitiesSheet,
                  { paddingBottom: Math.max(insets.bottom, 16) },
                  activitiesSheetAnimatedStyle,
                ]}
              >
                <View style={profileMainStyles.activitiesHandle} />
                <View style={profileMainStyles.activitiesHeader}>
                  <View style={profileMainStyles.activitiesAvatarWrap}>
                    <Image
                      source={{ uri: avatarUrl }}
                      style={profileMainStyles.activitiesAvatar}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={profileMainStyles.activitiesTitle}>
                      {language === 'vi' ? 'Các hoạt động' : 'Activities'}
                    </Text>
                    <Text
                      style={profileMainStyles.activitiesSubtitle}
                      numberOfLines={1}
                    >
                      {displayName || copy.userFallback}
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={handleCloseActivities}
                    style={profileMainStyles.activitiesCloseButton}
                  >
                    <X size={20} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <View style={profileMainStyles.activitiesSummaryRow}>
                  <View style={profileMainStyles.activitiesSummaryPill}>
                    <Text style={profileMainStyles.activitiesSummaryValue}>
                      {formatCount(posts.length)}
                    </Text>
                    <Text style={profileMainStyles.activitiesSummaryLabel}>
                      {language === 'vi' ? 'Bài viết' : 'Posts'}
                    </Text>
                  </View>
                  <View style={profileMainStyles.activitiesSummaryPill}>
                    <Text style={profileMainStyles.activitiesSummaryValue}>
                      {formatCount(
                        posts.reduce(
                          (total, post) => total + post.likeCount,
                          0,
                        ),
                      )}
                    </Text>
                    <Text style={profileMainStyles.activitiesSummaryLabel}>
                      {language === 'vi' ? 'Cảm xúc' : 'Reactions'}
                    </Text>
                  </View>
                  <View style={profileMainStyles.activitiesSummaryPill}>
                    <Text style={profileMainStyles.activitiesSummaryValue}>
                      {formatCount(
                        posts.reduce(
                          (total, post) => total + post.commentCount,
                          0,
                        ),
                      )}
                    </Text>
                    <Text style={profileMainStyles.activitiesSummaryLabel}>
                      {language === 'vi' ? 'Bình luận' : 'Comments'}
                    </Text>
                  </View>
                </View>

                <Text style={profileMainStyles.activitiesSourceText}>
                  {language === 'vi'
                    ? 'Tổng hợp từ dữ liệu hồ sơ đang tải'
                    : 'Built from the currently loaded profile data'}
                </Text>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={
                    profileMainStyles.activitiesListContent
                  }
                >
                  {!shouldRenderActivitiesList ? (
                    <View style={profileMainStyles.activitiesOpeningState}>
                      <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
                    </View>
                  ) : profileActivityItems.length > 0 ? (
                    profileActivityItems.map(item => {
                      const ActivityIcon = item.Icon;
                      return (
                        <View
                          key={item.id}
                          style={profileMainStyles.activityRow}
                        >
                          <View
                            style={[
                              profileMainStyles.activityIcon,
                              { backgroundColor: item.backgroundColor },
                            ]}
                          >
                            <ActivityIcon size={17} color={item.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={profileMainStyles.activityTitle}>
                              {item.title}
                            </Text>
                            <Text
                              style={profileMainStyles.activitySubtitle}
                              numberOfLines={2}
                            >
                              {item.subtitle}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={profileMainStyles.activitiesEmptyState}>
                      <Sparkles size={24} color={APP_BRAND_COLOR} />
                      <Text style={profileMainStyles.activitiesEmptyTitle}>
                        {language === 'vi'
                          ? 'Chưa có hoạt động'
                          : 'No activities yet'}
                      </Text>
                      <Text style={profileMainStyles.activitiesEmptyText}>
                        {language === 'vi'
                          ? 'Khi hồ sơ có bài viết, cảm xúc hoặc bình luận, chúng sẽ xuất hiện ở đây.'
                          : 'Posts, reactions, and comments will appear here when available.'}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            </View>
          </Modal>
          <ImageCropperModal
            visible={profileCropRequest !== null}
            image={profileCropRequest?.image ?? null}
            target={profileCropRequest?.target ?? 'avatar'}
            onCancel={() => setProfileCropRequest(null)}
            onComplete={handleCroppedProfileImage}
          />
        </Reanimated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const profileMainStyles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    overflow: 'hidden',
  },
  profileSwipeBackDim: {
    backgroundColor: '#000000',
  },
  profileSwipeBackCue: {
    position: 'absolute',
    left: Platform.OS === 'android' ? 30 : 14,
    top: '50%',
    marginTop: -22,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 10,
  },
  profileSwipeBackCueText: {
    marginLeft: 7,
    color: APP_BRAND_COLOR,
    fontSize: 13,
    fontWeight: '900',
  },
  postsList: {
    flex: 1,
  },
  coverContainer: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: PROFILE_COVER_HEIGHT,
    backgroundColor: '#E4E6EB',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 30,
  },
  headerOverlaySolidBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E6EB',
  },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  circleButtonOnSolidHeader: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  editCoverButton: {
    position: 'absolute',
    right: 16,
    bottom: 12,
    height: 32,
    borderRadius: 9999,
    backgroundColor: '#E4E6EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 4,
    zIndex: 5,
  },
  editCoverText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#050505',
    marginLeft: 6,
  },
  profileInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginTop: -50,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarBorder: {
    borderRadius: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E4E6EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  identityBesideAvatar: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
    paddingTop: 57,
    paddingRight: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#050505',
  },
  profileStatsFullWidth: {
    width: '100%',
    marginTop: 10,
  },
  profileStatsText: {
    color: '#334155',
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  profileStatsLinkText: {
    color: '#1E3A5F',
    fontWeight: '800',
  },
  followerPreviewRow: {
    alignSelf: 'flex-start',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
    paddingRight: 12,
  },
  followerAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 1,
  },
  followerAvatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#E2E8F0',
  },
  followerAvatarOverlap: {
    marginLeft: -10,
  },
  followerAvatar: {
    width: '100%',
    height: '100%',
  },
  followerPreviewText: {
    marginLeft: 9,
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '600',
  },
  profileBioText: {
    marginTop: 6,
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  primaryButtonsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 6,
  },
  dashboardButton: {
    flex: 0.96,
    height: 36,
    borderRadius: 9999,
    backgroundColor: APP_BRAND_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  dashboardButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
    flexShrink: 1,
    includeFontPadding: false,
  },
  storyAddButton: {
    flex: 1,
    height: 36,
    borderRadius: 9999,
    backgroundColor: '#E7F3FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0E8FF',
    minWidth: 0,
    overflow: 'hidden',
    paddingHorizontal: 7,
  },
  activitiesActionButton: {
    flex: 1.28,
  },
  cartActionButton: {
    flex: 0.92,
  },
  storyAddButtonText: {
    color: APP_BRAND_COLOR,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 5,
    flexShrink: 1,
    includeFontPadding: false,
  },
  profileOverviewSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  overviewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overviewSectionTitle: {
    color: '#050505',
    fontSize: 18,
    fontWeight: '800',
  },
  overviewEditButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  personalDetailRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  personalDetailIcon: {
    width: 30,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  personalDetailText: {
    flex: 1,
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  personalDetailsEmptyText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  seeMoreDetailsButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    justifyContent: 'center',
    marginTop: 2,
    paddingRight: 12,
  },
  seeMoreDetailsText: {
    color: '#65676B',
    fontSize: 13,
    fontWeight: '700',
  },
  cardRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    gap: 12,
  },
  halfCard: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#E4E6EB',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#050505',
  },
  cardHeaderAction: {
    fontSize: 12,
    color: APP_BRAND_COLOR,
    fontWeight: '700',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
  },
  cardButton: {
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E7F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  cardButtonText: {
    fontSize: 12,
    color: APP_BRAND_COLOR,
    fontWeight: '700',
  },
  friendsSubtitle: {
    fontSize: 11,
    color: '#65676B',
    marginTop: -8,
    marginBottom: 10,
  },
  friendFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  friendFilterChip: {
    flex: 1,
    minHeight: 26,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  friendFilterChipActive: {
    backgroundColor: '#E7F3FF',
    borderColor: '#B9DBFF',
  },
  friendFilterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  friendFilterTextActive: {
    color: APP_BRAND_COLOR,
  },
  friendsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  friendThumb: {
    flex: 1,
    alignItems: 'center',
  },
  friendImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  friendImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  friendOnlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  friendName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#050505',
    marginTop: 4,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  dotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: APP_BRAND_COLOR,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    opacity: 0.5,
  },
  relationshipSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  relationshipSheetBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.46)',
  },
  relationshipSheetCard: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 18,
  },
  relationshipSheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 9999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  relationshipSheetTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  relationshipSheetSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  relationshipSheetAction: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  relationshipSheetActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  relationshipSheetActionContent: {
    flex: 1,
    minWidth: 0,
  },
  relationshipSheetActionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  relationshipSheetActionHint: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 2,
  },
  relationshipSheetCancel: {
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.neutral.muted,
    marginTop: 2,
  },
  relationshipSheetCancelText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  mediaSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  mediaSheetBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  mediaSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 18,
  },
  mediaSheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 9999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  mediaSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  mediaSheetPreview: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  mediaSheetAvatarPreview: {
    borderRadius: 27,
  },
  mediaSheetTitleWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  mediaSheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  mediaSheetSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  mediaActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  mediaActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mediaActionContent: {
    flex: 1,
    minWidth: 0,
  },
  mediaActionLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  mediaActionHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  mediaCancelButton: {
    height: 46,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.neutral.muted,
    marginTop: 6,
  },
  mediaCancelText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  activitiesModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  activitiesBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.44)',
  },
  activitiesSheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 18,
  },
  activitiesHandle: {
    width: 48,
    height: 5,
    borderRadius: 9999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  activitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activitiesAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 2,
    backgroundColor: '#E7F3FF',
  },
  activitiesAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  activitiesTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  activitiesSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  activitiesCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  activitiesSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  activitiesSummaryPill: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  activitiesSummaryValue: {
    fontSize: 17,
    fontWeight: '900',
    color: APP_BRAND_COLOR,
  },
  activitiesSummaryLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  activitiesSourceText: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  activitiesListContent: {
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  activitiesOpeningState: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityRow: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  activitySubtitle: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 15,
  },
  activitiesEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 34,
  },
  activitiesEmptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  activitiesEmptyText: {
    marginTop: 6,
    maxWidth: 280,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    color: '#64748B',
  },
  postsHeader: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E4E6EB',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postsTabTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#050505',
    paddingBottom: 4,
  },
  postsTabUnderline: {
    height: 3,
    backgroundColor: APP_BRAND_COLOR,
    width: 32,
    borderRadius: 1.5,
  },
  managePostsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F3FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  managePostsText: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_BRAND_COLOR,
  },
});

export default ProfileScreen;
