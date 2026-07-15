// Description: Renders the Facebook-style profile screen with user-backed API data.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
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
  StatusBar,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Clock,
  Compass,
  Eye,
  FileText,
  Globe2,
  Heart,
  Image as ImageIcon,
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
  Verified,
  MessageCircle,
  ShoppingBag,
  ShoppingCart,
  Video,
  X,

  Copy,

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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import {
  FlashList,
  type ListRenderItemInfo as FlashListRenderItemInfo,
  type ViewToken as FlashListViewToken,
} from '@shopify/flash-list';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { launchImageLibrary } from 'react-native-image-picker';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useMainTabContentInsets } from '../../../navigation/useMainTabContentInsets';
import { useProfileViewModel } from '../../application/view-models/useProfileViewModel';
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
  publishFeedActiveVideo,
  publishFeedScrollBusy,
  publishFeedWarmVideoIds,
  ReactionPickerOverlay,
  TextPostCard,
} from '../../../feed/presentation/components/PostCards';
import PostReactionsSheet from '../../../feed/presentation/components/PostReactionsSheet';
import { ComposerCard } from '../../../feed/presentation/components/ComposerCard';
import {
  FeedSourceFilterBar,
  type FeedSourceFilterBarItem,
} from '../../../feed/presentation/components/FeedSourceFilterBar';
import { PollPostCard } from '../../../feed/presentation/components/PollPostCard';
import { createPollRepository } from '../../../poll/infrastructure/repositories/ApiPollRepository';
import { createStoriesRepository } from '../../../stories/infrastructure/repositories/ApiStoriesRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { ShareActionSheet } from '../../../shared-kernel/presentation/components/ShareActionSheet';
import { PostMenuActionSheet } from '../../../shared-kernel/presentation/components/PostMenuActionSheet';
import { ToastContainer, showToast } from '../../../shared-kernel/presentation/components/ToastNotification';
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
import type { SharePostInput } from '../../../feed/domain/repositories/FeedRepository';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type {
  StoryItem,
  StoryMedia,
} from '../../../stories/domain/types/stories.types';
import { useStoryCoverImageUri } from '../../../stories/presentation/hooks/useStoryCoverImageUri';
import type { ChatItem } from '../../../messages/domain/types/messages.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';

type ProfileNav = NativeStackNavigationProp<RootStackParamList>;
type ProfileFeedPost = FeedTextPost | FeedVideoPost | FeedPollPost;
type ProfileListItem =
  | { type: 'filter' }
  | { type: 'state' }
  | { type: 'post'; post: ProfileFeedPost };
type ProfileRoute = RouteProp<
  RootStackParamList,
  typeof ROUTES.PROFILE | typeof ROUTES.USER_PROFILE
>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PROFILE_COVER_HEIGHT = 210;
const PROFILE_POST_MEDIA_HEIGHT = Math.min(320, Math.round(SCREEN_WIDTH * 0.62));
// One friend tile width in a 2-col grid inside the wider Friends column.
// PROFILE_FRIENDS_PAGE_WIDTH = width of one "page" (2 columns) = 2 tiles + 1 gap.
const PROFILE_DETAILS_COLUMN_FLEX = 0.86;
const PROFILE_FRIENDS_COLUMN_FLEX = 1.14;
const PROFILE_FRIENDS_COLUMN_WIDTH = Math.floor(
  SCREEN_WIDTH *
    (PROFILE_FRIENDS_COLUMN_FLEX /
      (PROFILE_DETAILS_COLUMN_FLEX + PROFILE_FRIENDS_COLUMN_FLEX)),
);
const FRIEND_TILE_WIDTH = Math.floor((PROFILE_FRIENDS_COLUMN_WIDTH - 32 - 6) / 2);
const PROFILE_FRIENDS_PAGE_WIDTH = FRIEND_TILE_WIDTH * 2 + 6;
const PROFILE_STORY_MAX_AGE_SECONDS = 24 * 60 * 60;
const PROFILE_POST_PAGE_SIZE = 20;
const PROFILE_IS_ANDROID = Platform.OS === 'android';
const PROFILE_POST_DRAW_DISTANCE = PROFILE_IS_ANDROID
  ? Math.max(3000, Math.round(SCREEN_HEIGHT * 3.4))
  : Math.max(5200, Math.round(SCREEN_HEIGHT * 5.5));
const PROFILE_POST_RECYCLE_POOL_SIZE = PROFILE_IS_ANDROID ? 12 : 22;
const PROFILE_POST_MEDIA_PREFETCH_BEHIND = 2;
const PROFILE_POST_MEDIA_PREFETCH_LOOKAHEAD = PROFILE_IS_ANDROID ? 8 : 12;
const PROFILE_POST_MEDIA_PREFETCH_LIMIT = PROFILE_IS_ANDROID ? 10 : 16;
const PROFILE_POST_VIDEO_WARM_BEHIND_ITEMS = PROFILE_IS_ANDROID ? 1 : 3;
const PROFILE_POST_VIDEO_WARM_AHEAD_ITEMS = PROFILE_IS_ANDROID ? 3 : 6;
const PROFILE_POST_VIDEO_WARM_MAX_COUNT = PROFILE_IS_ANDROID ? 1 : 2;
const PROFILE_POST_VIEWABLE_PERCENT = 55;
const PROFILE_POST_ACTIVE_DWELL_MS = 160;
const PROFILE_POST_MEDIA_PREFETCH_BATCH_SIZE = PROFILE_IS_ANDROID ? 2 : 3;
const PROFILE_POST_MEDIA_PREFETCH_BATCH_DELAY_MS = PROFILE_IS_ANDROID ? 140 : 110;
const PROFILE_SCROLL_DIRECTION_THRESHOLD = 6;
const PROFILE_HEADER_HEIGHT = 48;
const PROFILE_SHEET_OPEN_DURATION_MS = 120;
const PROFILE_SHEET_CLOSE_DURATION_MS = 90;
const COUNTRY_NAME_BY_ID = new Map(
  COUNTRY_OPTIONS.map(country => [country.id, country.name]),
);

type ProfileScrollDirection = 'up' | 'down' | 'none';
type ProfileFriendsTab = 'following' | 'followers';
type ProfileMediaSheetState = 'avatar' | 'cover' | null;
type ProfileMediaSheetTarget = NonNullable<ProfileMediaSheetState>;
type ProfilePostFilter = 'all' | 'photos' | 'videos';
type ProfileFilterBarKey = ProfilePostFilter | 'nearby' | 'marketplace';
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
  if (!text || text === '0' || text.toLowerCase() === 'null') return '';
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
    ? `${Number(day)}/${Number(month)}/${year}`
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

function getProfilePostPreviewText(post: ProfileFeedPost, language: AppLanguage) {
  const caption =
    post.kind === 'poll'
      ? post.pollQuestion
      : cleanProfileValue(post.caption);

  if (caption) return caption;
  if (post.kind === 'video') return language === 'vi' ? 'Video đã đăng' : 'Posted video';
  if (post.kind === 'poll') return language === 'vi' ? 'Bình chọn đã đăng' : 'Posted poll';
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

function getProfileListItemPost(item?: ProfileListItem): ProfileFeedPost | null {
  return item?.type === 'post' ? item.post : null;
}

function canProfilePostAppearInFilter(
  post: ProfileFeedPost,
  filter: ProfilePostFilter,
) {
  if (filter === 'photos') {
    return post.kind === 'text' && post.photos.length > 0;
  }

  if (filter === 'videos') {
    return post.kind === 'video';
  }

  return true;
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

function getStoryTimeText(story: StoryItem | null | undefined, lang: AppLanguage): string {
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
const PROFILE_COPY: Record<AppLanguage, {
  userFallback: string;
  dashboard: string;
  addToStory: string;
  cartLabel: string;
  followed: string;
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
}> = {
  vi: {
    userFallback: 'Người dùng',
    dashboard: 'Chỉnh sửa',
    addToStory: 'Các hoạt động',
    cartLabel: 'Giỏ hàng',
    followed: 'Đã theo dõi',
    message: 'Nhắn tin',
    poke: 'Chọc',
    requestSent: 'Đã gửi yêu cầu',
    sending: 'Đang gửi...',
    follow: 'Theo dõi',
    stories: 'Tin',
    storySegments: count => `${count} đoạn tin`,
    viewStory: 'Xem tin',
    createStory: 'Tạo tin',
    details: 'Chi tiết',
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
  },en: {
    userFallback: 'User',
    dashboard: 'Edit',
    addToStory: 'Activities',
    cartLabel: 'Cart',
    followed: 'Following',
    message: 'Message',
    poke: 'Poke',
    requestSent: 'Request sent',
    sending: 'Sending...',
    follow: 'Follow',
    stories: 'Stories',
    storySegments: count => `${count} stories`,
    viewStory: 'View story',
    createStory: 'Create story',
    details: 'Details',
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
    borderColor: '#1877F2',
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
    backgroundColor: '#1877F2',
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

function isFreshProfileStory(story: StoryItem, nowSeconds: number) {
  const postedAt = story.postedAt ?? 0;
  if (postedAt <= 0) return false;
  if (nowSeconds - postedAt > PROFILE_STORY_MAX_AGE_SECONDS) return false;
  if (story.expiresAt > 0 && story.expiresAt <= nowSeconds) return false;
  return true;
}

function mergeStoriesForProfile(
  stories: StoryItem[],
  targetUserId: string,
): StoryItem | null {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const userStories = stories
    .filter(story => String(story.publisher.userId) === String(targetUserId))
    .filter(story => isFreshProfileStory(story, nowSeconds))
    .sort((a, b) => (a.postedAt ?? 0) - (b.postedAt ?? 0));

  if (userStories.length === 0) {
    return null;
  }

  const latestStory = userStories[userStories.length - 1];
  const oldestStory = userStories[0];
  const media: StoryMedia[] = [];

  for (const story of userStories) {
    for (const item of story.media) {
      const segment: StoryMedia = {
        ...item,
        storyId: item.storyId ?? story.id,
        postedAt: item.postedAt ?? story.postedAt,
      };
      const exists = media.some(
        current =>
          current.url === segment.url &&
          (current.storyId ?? '') === (segment.storyId ?? ''),
      );
      if (!exists) {
        media.push(segment);
      }
    }
  }

  return {
    ...latestStory,
    thumbnailUrl: latestStory.thumbnailUrl ?? oldestStory.thumbnailUrl,
    media,
    isViewed: userStories.every(story => story.isViewed),
    hasUnseen: userStories.some(story => story.hasUnseen && !story.isViewed),
  };
}

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
function SkeletonBlock({ height, width, borderRadius }: { height: number | string; width?: number | string; borderRadius?: number }) {
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
      ])
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
function FullProfileSkeleton() {
  const skeletonSafeTopInset =
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

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
            pointerEvents="none"
          >
            <SkeletonBlock height={36} width={36} borderRadius={18} />
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
          </View>

          <View style={profileMainStyles.nameBlock}>
            <SkeletonBlock height={28} width={170} borderRadius={8} />
            <View className="mt-2">
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

        <View className="bg-white">
          <View className="flex-row">
            <View style={profileMainStyles.profileDetailsColumn}>
              <View className="mb-3 flex-row items-center justify-between">
                <SkeletonBlock height={18} width={82} borderRadius={6} />
                <SkeletonBlock height={14} width={56} borderRadius={7} />
              </View>
              {[0, 1, 2, 3, 4].map(item => (
                <View key={`detail-skeleton-${item}`} className="mb-2 flex-row items-center">
                  <SkeletonBlock height={14} width={14} borderRadius={7} />
                  <View className="ml-2 flex-1">
                    <SkeletonBlock height={13} width="84%" borderRadius={6} />
                  </View>
                </View>
              ))}
              <View className="mt-2">
                <SkeletonBlock height={32} width="100%" borderRadius={8} />
              </View>
            </View>

            <View style={profileMainStyles.profileFriendsColumn}>
              <View className="mb-2 flex-row items-center justify-between">
                <SkeletonBlock height={18} width={78} borderRadius={6} />
                <SkeletonBlock height={14} width={64} borderRadius={7} />
              </View>
              <View className="mb-2 flex-row gap-2">
                <SkeletonBlock height={28} width={82} borderRadius={14} />
                <SkeletonBlock height={28} width={82} borderRadius={14} />
              </View>
              <View className="flex-row flex-wrap gap-[6px]">
                {[0, 1, 2, 3].map(item => (
                  <View key={`friend-skeleton-${item}`} style={{ width: FRIEND_TILE_WIDTH }}>
                    <SkeletonBlock
                      height={FRIEND_TILE_WIDTH}
                      width={FRIEND_TILE_WIDTH}
                      borderRadius={8}
                    />
                    <View className="mt-1">
                      <SkeletonBlock height={11} width="80%" borderRadius={5} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
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
        <View className="bg-white px-4 pb-2 pt-2">
          <SkeletonBlock height={50} width="100%" borderRadius={16} />
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
  const {
    bottomContentPadding,
    scrollIndicatorBottomInset,
  } = useMainTabContentInsets();
  const safeTopInset = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44);
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
  } =
    useProfileViewModel();

  const session = sessionStorage.getSession();
  const currentUserId = session?.userId;
  const targetUserId = route.params?.userId ?? currentUserId ?? profile?.id;
  const isOwnProfile =
    !route.params?.userId ||
    (currentUserId
      ? String(route.params.userId) === String(currentUserId)
      : false);

  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);
  const [isLoadingCover, setIsLoadingCover] = useState(false);

  const [posts, setPosts] = useState<ProfileFeedPost[]>([]);
  const profilePostsRef = useRef<ProfileFeedPost[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [postsCursor, setPostsCursor] = useState<string | undefined>(undefined);
  const isLoadingMorePostsRef = React.useRef(false);
  const activeProfileVideoIdRef = useRef<string | null>(null);
  const pendingProfileActiveVideoIdRef = useRef<string | null>(null);
  const pendingProfileDwellVideoIdRef = useRef<string | null>(null);
  const profileVideoDwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const profilePrefetchedMediaUrlsRef = useRef<Set<string>>(new Set());
  const profileQueuedMediaUrlsRef = useRef<Set<string>>(new Set());
  const profilePendingMediaUrlsRef = useRef<string[]>([]);
  const profileMediaPrefetchTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [profileFriendsTab, setProfileFriendsTab] =
    useState<ProfileFriendsTab>('following');
  const [profilePostFilter, setProfilePostFilter] =
    useState<ProfilePostFilter>('all');
  const [isProfileHeaderSolid, setProfileHeaderSolid] = useState(false);
  const [isActivitiesSheetVisible, setActivitiesSheetVisible] = useState(false);
  const [isConnectLoading, setIsConnectLoading] = useState(false);
  const [isPokeLoading, setIsPokeLoading] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<PhotoViewerState>(null);
  const openingPhotoViewerRef = useRef(false);
  const photoPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [storyOptionsSheet, setStoryOptionsSheet] = useState<StoryItem | null>(null);
  const [sharingPost, setSharingPost] = useState<FeedPost | undefined>(undefined);
  const [postMenuVisible, setPostMenuVisible] = useState(false);
  const [selectedPostForMenu, setSelectedPostForMenu] =
    useState<FeedPost | null>(null);
  const [reactionsSheetVisible, setReactionsSheetVisible] = useState(false);
  const [reactionsSheetPostId, setReactionsSheetPostId] = useState<string | null>(null);

  const openReactionsSheet = useCallback((postId: string, _post: FeedPost) => {
    setReactionsSheetPostId(postId);
    setReactionsSheetVisible(true);
  }, []);

  const closeReactionsSheet = useCallback(() => {
    setReactionsSheetVisible(false);
  }, []);
  const filteredProfilePosts = useMemo(
    () => posts.filter(post => canProfilePostAppearInFilter(post, profilePostFilter)),
    [posts, profilePostFilter],
  );

  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const hasDragged = useSharedValue(false);

  const feedRepo = useMemo(() => createFeedRepository(), []);
  const pollRepo = useMemo(() => createPollRepository(), []);
  const storiesRepo = useMemo(() => createStoriesRepository(), []);
  const updateProfileCommentCount = useCallback((postId: string, delta: number) => {
    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? { ...post, commentCount: Math.max(0, post.commentCount + delta) }
          : post,
      ),
    );
  }, []);
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

  useEffect(
    () => () => {
      if (profileMediaPrefetchTimerRef.current) {
        clearTimeout(profileMediaPrefetchTimerRef.current);
        profileMediaPrefetchTimerRef.current = null;
      }
      profilePrefetchedMediaUrlsRef.current.clear();
      profilePendingMediaUrlsRef.current = [];
      profileQueuedMediaUrlsRef.current.clear();
    },
    [],
  );

  const onProfilePostViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: FlashListViewToken<ProfileListItem>[] }) => {
      const currentPosts = profilePostsRef.current;
      const visibleVideo = viewableItems.find(
        item => item.isViewable && getProfileListItemPost(item.item)?.kind === 'video',
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

        const index = currentPosts.findIndex(post => post.id === viewedPost.id);

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
      const prefetchEndIndex = Math.min(currentPosts.length, rawPrefetchEndIndex);
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

      for (let index = firstVisibleIndex; index <= furthestVisibleIndex; index += 1) {
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

  useEffect(() => {
    profilePostsRef.current = filteredProfilePosts;

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
        index < Math.min(filteredProfilePosts.length, PROFILE_POST_VIDEO_WARM_AHEAD_ITEMS + 1);
        index += 1
      ) {
        const post = filteredProfilePosts[index];
        if (post.kind !== 'video') continue;
        if (post.id === activeVideoId) continue;

        initialWarmVideoIds.push(post.id);
        if (initialWarmVideoIds.length >= PROFILE_POST_VIDEO_WARM_MAX_COUNT) break;
      }
      publishFeedWarmVideoIds(initialWarmVideoIds);
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
    setActiveProfileVideoId,
  ]);

  // ── Re-fetch when the route's userId changes ──────────────────────
  // Opening another user's profile from sibling screens does not
  // remount this component, and React Navigation only fires
  // `useFocusEffect` on blur -> focus, not params-only changes.
  // Compare the new param against the last value we acted on and
  // reset derived state + reload when they differ.
  const lastLoadedUserIdRef = useRef<string | undefined>(route.params?.userId);
  useEffect(() => {
    const nextUserId = route.params?.userId;
    if (lastLoadedUserIdRef.current === nextUserId) {
      return;
    }
    lastLoadedUserIdRef.current = nextUserId;

    // Reset user-scoped state so the previous user's posts/stories
    // don't bleed into the new user's profile view.
    setPosts([]);
    setProfilePostFilter('all');
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
    profilePrefetchedMediaUrlsRef.current.clear();
    profileQueuedMediaUrlsRef.current.clear();
    profilePendingMediaUrlsRef.current = [];

    loadProfile({
      userId: nextUserId,
      includeFriends: true,
    }).catch(() => undefined);
  }, [
    route.params?.userId,
    clearProfileVideoDwellTimer,
    loadProfile,
    setActiveProfileVideoId,
  ]);

  useFocusEffect(useCallback(() => {
    loadProfile({
      userId: route.params?.userId,
      includeFriends: true,
    }).catch(() => undefined);
  }, [loadProfile, route.params?.userId]));

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
        profilePendingMediaUrlsRef.current = [];
        profileQueuedMediaUrlsRef.current.clear();
      };
    }, [clearProfileVideoDwellTimer, setActiveProfileVideoId]),
  );

  // Load User Posts
  useEffect(() => {
    console.log('[ProfileScreen] Loading posts for targetUserId:', targetUserId);
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
    feedRepo.getUserPosts(targetUserId, PROFILE_POST_PAGE_SIZE)
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
        setPostsError(err instanceof Error ? err.message : 'Không tải được bài viết.');
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
      index < Math.min(filteredProfilePosts.length, PROFILE_POST_MEDIA_PREFETCH_LOOKAHEAD);
      index += 1
    ) {
      for (const url of collectProfilePostMediaUrls(filteredProfilePosts[index])) {
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
          story => String(story.publisher.userId) !== String(targetUserId)
        );
        // Deduplicate other stories by publisher.userId to keep one per user
        const dedupedOthersMap = new Map<string, StoryItem>();
        for (const story of otherStories) {
          const existing = dedupedOthersMap.get(String(story.publisher.userId));
          if (!existing || (story.postedAt ?? 0) > (existing.postedAt ?? 0)) {
            dedupedOthersMap.set(String(story.publisher.userId), story);
          }
        }
        setAllStories(Array.from(dedupedOthersMap.values()));
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
  }, [storiesRepo, targetUserId]);

  const displayName = profile?.name ?? profile?.username ?? '';
  const username = profile?.username ? `@${profile.username}` : '';
  const coverUrl = profile?.coverUrl ?? FALLBACK_COVER;
  const avatarUrl = profile?.avatarUrl ?? FALLBACK_AVATAR;
  const activeProfileFriends =
    profileFriendsTab === 'following' ? following : followers;
  const activeProfileFriendsCount = activeProfileFriends.length;
  const profileFriends = useMemo(
    () => activeProfileFriends.filter(friend => friend.id).slice(0, 5),
    [activeProfileFriends],
  );
  const profilePostCountText = useMemo(() => {
    const suffix = hasMorePosts ? '+' : '';
    return language === 'vi'
      ? `${posts.length}${suffix} bài viết`
      : `${posts.length}${suffix} posts`;
  }, [hasMorePosts, language, posts.length]);
  const profileDetailItems = useMemo(() => {
    const items: Array<{
      key: string;
      Icon: typeof Clock;
      text: string;
    }> = [
      {
        key: 'activity',
        Icon: Clock,
        text: getActivityDisplayText(profile?.lastSeenText, language, copy.activeNow),
      },
      {
        key: 'posts',
        Icon: FileText,
        text: profilePostCountText,
      },
    ];

    const genderText = getGenderDisplayText(
      profile?.genderText,
      profile?.gender,
      language,
    );
    if (genderText) {
      items.push({
        key: 'gender',
        Icon: User,
        text: language === 'vi' ? `Giới tính: ${genderText}` : `Gender: ${genderText}`,
      });
    }

    const birthdayText = formatBirthdayText(profile?.birthday, language);
    if (birthdayText) {
      items.push({
        key: 'birthday',
        Icon: CalendarDays,
        text: language === 'vi' ? `Sinh nhật: ${birthdayText}` : `Birthday: ${birthdayText}`,
      });
    }

    const countryText = getCountryDisplayName(profile?.countryId);
    if (countryText) {
      items.push({
        key: 'country',
        Icon: Globe2,
        text: language === 'vi' ? `Sống ở ${countryText}` : `Lives in ${countryText}`,
      });
    }

    const addressText = cleanProfileValue(profile?.address);
    if (addressText) {
      items.push({
        key: 'address',
        Icon: MapPin,
        text: addressText,
      });
    }

    return items;
  }, [
    copy.activeNow,
    language,
    profile?.address,
    profile?.birthday,
    profile?.countryId,
    profile?.gender,
    profile?.genderText,
    profile?.lastSeenText,
    profilePostCountText,
  ]);
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
            ? `${actorLabel} đang theo dõi ${formatCount(following.length)} người`
            : `${actorLabel} follows ${formatCount(following.length)} people`,
        subtitle:
          language === 'vi'
            ? 'Hoạt động kết nối'
            : 'Connection activity',
        color: '#1877F2',
        backgroundColor: '#E7F3FF',
      });
    }

    if (followers.length > 0) {
      items.push({
        id: 'followers-summary',
        Icon: Users,
        title:
          language === 'vi'
            ? `${formatCount(followers.length)} người đang theo dõi ${isOwnProfile ? 'bạn' : actorName}`
            : `${formatCount(followers.length)} followers`,
        subtitle:
          language === 'vi'
            ? 'Tương tác cộng đồng'
            : 'Community activity',
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
          color: '#1D4ED8',
          backgroundColor: '#DBEAFE',
        });

        if (isOwnProfile && post.myReaction) {
          items.push({
            id: `reacted-${post.id}`,
            Icon: Heart,
            title:
              language === 'vi'
                ? `${actorLabel} đã thả ${postCardCopy.reactionLabel[post.myReaction].toLowerCase()} ${targetText}`
                : `${actorLabel} reacted ${postCardCopy.reactionLabel[post.myReaction]} ${targetText}`,
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
                : `${postKind} received ${formatCount(post.likeCount)} reactions`,
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
  const shouldShowStorySection = Boolean(userStory) || isStoryLoading;
  const relationshipState =
    profile?.followingState ??
    (profile?.followedByCurrentUser ? 'following' : 'none');
  const isFriendProfile = !isOwnProfile && relationshipState === 'following';
  const isRequestedProfile = !isOwnProfile && relationshipState === 'requested';

  const handleSetPostReaction = useCallback(async (
    postId: string,
    nextReaction: ReactionType,
  ) => {
    let snapshot: ProfileFeedPost | undefined;
    let targetReaction: ReactionType | null = nextReaction;
    setPickerAnchor(null);

    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;

        snapshot = post;
        targetReaction = post.myReaction === nextReaction ? null : nextReaction;
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
        setPosts(prev => prev.map(post => (post.id === postId ? original : post)));
      }
      Alert.alert(copy.errorTitle, copy.reactionError);
    }
  }, [copy.errorTitle, copy.reactionError, feedRepo]);

  const handleOpenPicker = useCallback((postId: string, x: number, y: number) => {
    setPickerAnchor({ postId, x, y });
  }, []);

  const handlePickReaction = useCallback((reaction: ReactionType) => {
    if (!pickerAnchor) return;
    handleSetPostReaction(pickerAnchor.postId, reaction);
    setPickerAnchor(null);
  }, [handleSetPostReaction, pickerAnchor]);

  const handlePhotoPress = useCallback((post: FeedTextPost, photoIndex: number) => {
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
  }, []);

  const handleClosePhotoViewer = useCallback(() => {
    setPhotoViewer(null);
    openingPhotoViewerRef.current = false;
    if (photoPressTimeoutRef.current) {
      clearTimeout(photoPressTimeoutRef.current);
      photoPressTimeoutRef.current = null;
    }
  }, []);

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

  const handleNavigateToProfile = useCallback((userId: string) => {
    navigateToUserProfile(navigation, userId);
  }, [navigation]);

  const handleOpenFriendsList = useCallback(() => {
    if (!targetUserId) return;
    navigation.navigate(ROUTES.PROFILE_FRIENDS, {
      userId: String(targetUserId),
      title:
        profileFriendsTab === 'following'
          ? language === 'vi'
            ? 'Đang theo dõi'
            : 'Following'
          : language === 'vi'
            ? 'Người theo dõi'
            : 'Followers',
      initialFriends: activeProfileFriends.filter(friend => friend.id),
    });
  }, [
    activeProfileFriends,
    language,
    navigation,
    profileFriendsTab,
    targetUserId,
  ]);

  const handleVotePoll = useCallback(async (postId: string, optionId: string) => {
    let snapshot: FeedPollPost | undefined;

    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId || post.kind !== 'poll') return post;
        snapshot = post;

        const options = post.options.map(option => ({
          ...option,
          optionVotes:
            option.id === optionId ? option.optionVotes + 1 : option.optionVotes,
        }));
        const totalVotes = options.reduce((sum, option) => sum + option.optionVotes, 0);

        return {
          ...post,
          options: options.map(option => {
            const percentageNum =
              totalVotes > 0 ? Math.round((option.optionVotes / totalVotes) * 100) : 0;
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
          const apiTotal = Math.max(0, ...response.options.map(option => option.all));
          return {
            ...post,
            options: response.options,
            votedId: optionId,
            totalVotes:
              apiTotal > 0
                ? apiTotal
                : response.options.reduce((sum, option) => sum + option.optionVotes, 0),
          };
        }),
      );
    } catch {
      if (snapshot) {
        const original = snapshot;
        setPosts(prev => prev.map(post => (post.id === postId ? original : post)));
      }
      Alert.alert(copy.errorTitle, copy.voteError);
    }
  }, [copy.errorTitle, copy.voteError, pollRepo]);

  const selectedCommentPost = useMemo(
    () => posts.find(post => post.id === commentVm.selectedCommentPostId) ?? null,
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
          Alert.alert(postCardCopy.reportSentTitle, postCardCopy.reportSentMessage);
        } else {
          Alert.alert(postCardCopy.reportCancelledTitle, postCardCopy.reportCancelledMessage);
        }
      } catch {
        Alert.alert(postCardCopy.errorTitle, postCardCopy.reportErrorMessage);
      }
    },
    [feedRepo, postCardCopy],
  );

  const handleHidePost = useCallback(
    async (postId: string) => {
      removeProfilePostFromList(postId);
      Alert.alert(
        language === 'vi' ? 'Thông báo' : 'Notice',
        language === 'vi'
          ? 'Đã ẩn bài viết khỏi hồ sơ này.'
          : 'This post has been hidden from this profile view.',
      );
    },
    [language, removeProfilePostFromList],
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
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
    [feedRepo, language, postCardCopy.errorTitle, removeProfilePostFromList],
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
  }, [
    feedRepo,
    hasMorePosts,
    postsCursor,
    targetUserId,
  ]);

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
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const previousY = profileScrollYRef.current;
      const deltaY = contentOffset.y - previousY;
      if (Math.abs(deltaY) > PROFILE_SCROLL_DIRECTION_THRESHOLD) {
        profileScrollDirectionRef.current = deltaY > 0 ? 'down' : 'up';
      }
      profileScrollYRef.current = contentOffset.y;
      profileViewportHeightRef.current = layoutMeasurement.height;

      const shouldUseSolidHeader =
        contentOffset.y >= Math.max(0, PROFILE_COVER_HEIGHT - profileHeaderHeight);
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
    if (isOwnProfile) {
      openProfileMediaSheet('avatar');
      return;
    }

    navigation.navigate(ROUTES.AVATAR_VIEWER, {
      avatarUrl: avatarUrl,
      userName: displayName,
      userId: targetUserId ?? currentUserId ?? profile?.id,
    });
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
    navigation,
    profile?.id,
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

  const handleChangeAvatar = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }
      const asset = result.assets[0];
      if (!asset.uri) return;

      setIsLoadingAvatar(true);
      const success = await updateAvatar(asset.uri);
      if (success) {
        // Reload profile to reflect changes
        await loadProfile({ userId: targetUserId });
      } else {
        Alert.alert(copy.errorTitle, 'Không thể cập nhật ảnh đại diện.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAvatar(false);
    }
  }, [copy.errorTitle, loadProfile, targetUserId, updateAvatar]);

  const handleChangeCover = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }
      const asset = result.assets[0];
      if (!asset.uri) return;

      setIsLoadingCover(true);
      const success = await updateCover({
        uri: asset.uri,
        name: asset.fileName ?? `cover_${Date.now()}.jpg`,
        type: asset.type ?? 'image/jpeg',
      });
      if (success) {
        // Reload profile to reflect changes
        await loadProfile({ userId: targetUserId });
      } else {
        Alert.alert(copy.errorTitle, 'Không thể cập nhật ảnh bìa.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCover(false);
    }
  }, [copy.errorTitle, loadProfile, targetUserId, updateCover]);

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
    const profileStories = [
      ...(userStory ? [userStory] : []),
      ...allStories,
    ];

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
  }, [avatarUrl, copy.userFallback, coverUrl, displayName, navigation, username]);

  const handleOpenActivities = useCallback(() => {
    setShouldRenderActivitiesList(false);
    activitiesSheetProgress.stopAnimation();
    activitiesSheetProgress.setValue(0);
    setActivitiesSheetVisible(true);
    requestAnimationFrame(() => {
      Animated.timing(activitiesSheetProgress, {
        toValue: 1,
        duration: PROFILE_SHEET_OPEN_DURATION_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShouldRenderActivitiesList(true);
        }
      });
    });
  }, [activitiesSheetProgress]);

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
    // Khi ở own profile → sản phẩm của mình (không truyền userId)
    // Khi ở profile người khác → sản phẩm của người đó (truyền userId)
    if (isOwnProfile) {
      navigation.navigate(ROUTES.MY_PRODUCTS);
    } else if (targetUserId) {
      navigation.navigate(ROUTES.MY_PRODUCTS, {
        userId: String(targetUserId),
      });
    }
  }, [isOwnProfile, navigation, targetUserId]);

  const profilePostFilterItems = useMemo<Array<FeedSourceFilterBarItem<ProfileFilterBarKey>>>(
    () => [
      {
        key: 'all',
        accessibilityLabel: language === 'vi' ? 'Tất cả bài viết' : 'All posts',
        icon: active => (
          <Compass
            size={24}
            color={active ? '#0758ff' : '#9ca3af'}
            strokeWidth={active ? 2.5 : 2}
          />
        ),
      },
      {
        key: 'nearby',
        accessibilityLabel: language === 'vi' ? 'Địa chỉ' : 'Nearby',
        icon: () => (
          <MapPin
            size={24}
            color="#9ca3af"
            strokeWidth={2}
          />
        ),
        onPress: () => navigation.navigate(ROUTES.NEARBY_USERS),
      },
      {
        key: 'photos',
        accessibilityLabel: language === 'vi' ? 'Ảnh' : 'Photos',
        icon: active => (
          <ImageIcon
            size={24}
            color={active ? '#0758ff' : '#9ca3af'}
            strokeWidth={active ? 2.5 : 2}
          />
        ),
      },
      {
        key: 'videos',
        accessibilityLabel: 'Video',
        icon: active => (
          <Video
            size={24}
            color={active ? '#0758ff' : '#9ca3af'}
            strokeWidth={active ? 2.5 : 2}
          />
        ),
      },
      {
        key: 'marketplace',
        accessibilityLabel: language === 'vi' ? 'Cửa hàng' : 'Shop',
        icon: () => (
          <ShoppingBag
            size={24}
            color="#9ca3af"
            strokeWidth={2}
          />
        ),
        onPress: handleOpenCart,
      },
    ],
    [handleOpenCart, language, navigation],
  );

  const handleProfilePostFilterChange = useCallback((key: ProfileFilterBarKey) => {
    if (key === 'all' || key === 'photos' || key === 'videos') {
      setProfilePostFilter(key);
    }
  }, []);

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

    navigation.navigate(ROUTES.CHAT, { chat });
  };

  const handleOpenProfileMore = useCallback(() => {
    navigation.navigate(ROUTES.PROFILE_MORE, {
      userId: targetUserId ? String(targetUserId) : undefined,
      isOwnProfile,
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
    isOwnProfile,
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

  const handleConnectUser = async () => {
    if (!targetUserId || isOwnProfile || isRequestedProfile || isConnectLoading) {
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

  const handlePokeUser = async () => {
    if (!targetUserId || isOwnProfile || isPokeLoading) {
      return;
    }

    setIsPokeLoading(true);
    try {
      await pokeUser(String(targetUserId));
      const successMsg = pokeCopy.pokeSuccessMessage;
      const message = typeof successMsg === 'function' 
        ? successMsg(displayName || copy.userFallback) 
        : String(successMsg);
      showToast({
        message,
        type: 'success',
      });
    } catch (caughtError) {
      const errorMessage = caughtError instanceof Error ? caughtError.message : String(pokeCopy.profilePokeError);
      showToast({ message: errorMessage, type: 'warning' });
    } finally {
      setIsPokeLoading(false);
    }
  };

  const handleCopyUsername = useCallback(async () => {
    if (!profile?.username) return;
    try {
      const { Clipboard } = require('react-native');
      await Clipboard.setString(profile.username);
      Alert.alert(
        language === 'vi' ? 'Thành công' : 'Success',
        language === 'vi' ? 'Đã sao chép tên người dùng vào khay nhớ tạm.' : 'Username copied to clipboard.',
      );
    } catch (err) {
      console.error(err);
    }
  }, [profile?.username, language]);

  const handleEditProfilePress = useCallback(() => {
    if (!isOwnProfile) return;
    setEditSheetVisible(true);
    tabBarVisibility.setVisible(false);
  }, [isOwnProfile]);

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
  const profileListHeaderComponentStyle = useMemo(
    () => ({ marginBottom: -profileHeaderHeight }),
    [profileHeaderHeight],
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

  const renderProfilePostContent = useCallback((post: ProfileFeedPost) => {
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
  }, [
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
  ]);

  const profileListItemKeyExtractor = useCallback(
    (item: ProfileListItem) =>
      item.type === 'post' ? `${item.post.kind}-${item.post.id}` : item.type,
    [],
  );

  const profileListItemType = useCallback(
    (item: ProfileListItem) =>
      item.type === 'post' ? item.post.kind : item.type,
    [],
  );

  const profileContentHeader = (
    <>
          {/* Cover Photo */}
          <View key={`cover-${targetUserId}-${isOwnProfile}`} style={profileMainStyles.coverContainer}>
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
              <View className="absolute inset-0 bg-black/30 items-center justify-center" style={{ zIndex: 998 }}>
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            )}

            {/* Edit Profile (own) or Cart (other) button overlapping cover photo bottom right */}
            {isOwnProfile ? (
              <TouchableOpacity
                style={[profileMainStyles.editCoverButton, { zIndex: 100, elevation: 12 }]}
                activeOpacity={0.85}
                onPress={handleEditProfilePress}
              >
                <Edit size={14} color="#050505" />
                <Text style={profileMainStyles.editCoverText}>
                  {language === 'vi' ? 'Chỉnh sữa hồ sơ' : 'Edit profile'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[profileMainStyles.editCoverButton, { zIndex: 100, elevation: 12 }]}
                activeOpacity={0.85}
                onPress={handleOpenCart}
              >
                <ShoppingCart size={14} color="#050505" />
                <Text style={profileMainStyles.editCoverText}>
                  {copy.cartLabel}
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
                    // Gradient ring avatar (sky blue → purple, or gray gradient if viewed)
                    <View style={{ width: 110, height: 110, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                      <Svg width={110} height={110} style={{ position: 'absolute', top: 0, left: 0 }}>
                        <Defs>
                          <SvgLinearGradient
                            id="storyRingGrad"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="1"
                          >
                            <Stop offset="0%" stopColor="#1877F2" />
                            <Stop offset="100%" stopColor="#42A5F5" />
                          </SvgLinearGradient>
                        </Defs>
                        <Circle
                          cx={55}
                          cy={55}
                          r={52}
                          stroke="url(#storyRingGrad)"
                          strokeWidth={4}
                          fill="none"
                        />
                      </Svg>
                      <View style={{ width: 96, height: 96, borderRadius: 48, overflow: 'hidden', borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: '#CBD5E1', position: 'relative' }}>
                        <Image
                          source={{ uri: avatarUrl }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                        {isLoadingAvatar && (
                          <View className="absolute inset-0 bg-black/30 items-center justify-center rounded-full" style={{ zIndex: 998 }}>
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
                        }
                      ]}
                    >
                      <View style={{ width: 100, height: 100, borderRadius: 50, overflow: 'hidden', borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: '#CBD5E1', position: 'relative' }}>
                        <Image
                          source={{ uri: avatarUrl }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                        {isLoadingAvatar && (
                          <View className="absolute inset-0 bg-black/30 items-center justify-center rounded-full" style={{ zIndex: 998 }}>
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
            </View>

            {/* Profile Name & Username left-aligned */}
            <View style={profileMainStyles.nameBlock}>
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
                    <Verified size={18} color="#FFFFFF" fill="#1877F2" />
                  </View>
                )}
              </View>
              {!!username && (
                <View style={profileMainStyles.usernameRow}>
                  <Text style={profileMainStyles.usernameText}>
                    {username}
                  </Text>
                  <TouchableOpacity
                    style={profileMainStyles.copyButton}
                    onPress={handleCopyUsername}
                    activeOpacity={0.7}
                  >
                    <Copy size={13} color="#65676B" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Action Buttons Row */}
            <View key={`actions-${targetUserId}-${isOwnProfile}`} style={profileMainStyles.primaryButtonsRow}>
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
                    <Sparkles size={16} color="#1877F2" />
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
                    <ShoppingCart size={16} color="#1877F2" />
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
                  >
                    <UserCheck size={16} color="#050505" />
                    <Text className="ml-1.5 text-[14px] font-bold text-[#050505]">
                      {copy.followed}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="h-10 flex-1 flex-row items-center justify-center rounded-full bg-[#1877F2] px-4"
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
                      isRequestedProfile ? 'bg-[#E4E6EB]' : 'bg-[#1877F2]'
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
            <View style={[{ borderWidth: 0, borderRadius: 0, padding: 14 }, profileMainStyles.halfCard]}>
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
                    <View key={`story-skeleton-${item}`} style={profileStoryStyles.skeletonCard}>
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
                        <PlusCircle size={22} color="#1877F2" />
                      </TouchableOpacity>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: '#1877F2',
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
                      <Text style={{ fontSize: 9, color: '#65676B', textAlign: 'center', marginTop: 1 }} numberOfLines={1}>
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
                            source={{ uri: story.publisher.avatarUrl || FALLBACK_AVATAR }}
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
                      <Text style={{ fontSize: 9, color: '#65676B', textAlign: 'center', marginTop: 1 }} numberOfLines={1}>
                        {getStoryTimeText(story, language)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
          <View className="h-px bg-[#E4E6EB]" />

          {/* Details & Friends — single row, no card chrome, just 2 columns split by vertical line */}
          <View
            className="bg-white"
            style={{ marginHorizontal: 0, marginTop: 0 }}
          >
            <View className="flex-row">
              {/* Details — left column */}
              <View style={profileMainStyles.profileDetailsColumn}>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[15px] font-bold text-[#050505]">{copy.details}</Text>
                  <TouchableOpacity activeOpacity={0.8} onPress={handleEditProfilePress}>
                    <Text className="text-[12px] font-bold text-[#1877F2]">
                      {language === 'vi' ? 'Chỉnh sữa' : 'Edit'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {profileDetailItems.map(item => {
                  const DetailIcon = item.Icon;
                  return (
                    <View key={item.key} className="mb-1.5 flex-row items-center">
                      <DetailIcon size={13} color="#65676B" />
                      <Text
                        className="ml-1.5 flex-1 text-[12px] font-medium text-[#1E293B]"
                        numberOfLines={2}
                      >
                        {item.text}
                      </Text>
                    </View>
                  );
                })}

                <TouchableOpacity
                  className="mt-1 h-7 items-center justify-center rounded-md bg-[#E7F3FF]"
                  activeOpacity={0.8}
                  onPress={() => isOwnProfile && navigation.navigate(ROUTES.EDIT_PROFILE)}
                >
                  <Text className="text-[12px] font-bold text-[#1877F2]" numberOfLines={1}>
                    Chỉnh sữa chi tiết
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Friends — right column */}
              <View style={profileMainStyles.profileFriendsColumn}>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[15px] font-bold text-[#050505]">{copy.friends}</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleOpenFriendsList}
                  >
                    <Text className="text-[12px] font-bold text-[#1877F2]">
                      {language === 'vi' ? 'Xem tất cả >' : 'See all >'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={profileMainStyles.friendFilterRow}>
                  {(['following', 'followers'] as const).map(tab => {
                    const isActiveTab = profileFriendsTab === tab;
                    const label =
                      tab === 'following'
                        ? language === 'vi'
                          ? 'Đang theo dõi'
                          : 'Following'
                        : language === 'vi'
                          ? 'Người theo dõi'
                          : 'Followers';

                    return (
                      <TouchableOpacity
                        key={tab}
                        activeOpacity={0.82}
                        onPress={() => setProfileFriendsTab(tab)}
                        style={[
                          profileMainStyles.friendFilterChip,
                          isActiveTab && profileMainStyles.friendFilterChipActive,
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            profileMainStyles.friendFilterText,
                            isActiveTab && profileMainStyles.friendFilterTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text className="mb-2 text-[11px] text-[#65676B]">
                  {activeProfileFriendsCount}{' '}
                  {profileFriendsTab === 'following'
                    ? language === 'vi'
                      ? 'người đang theo dõi'
                      : 'following'
                    : language === 'vi'
                      ? 'người theo dõi'
                      : 'followers'}
                </Text>

                {profileFriends.length > 0 ? (
                  profileFriends.length <= 4 ? (
                    // 4 or fewer friends: show all in a 2x2 grid
                    <View className="flex-row flex-wrap" style={{ rowGap: 6, columnGap: 6 }}>
                      {profileFriends.map(friend => (
                        <TouchableOpacity
                          key={String(friend.id)}
                          style={{ width: '48%' }}
                          activeOpacity={0.85}
                          onPress={() => handleNavigateToProfile(String(friend.id))}
                        >
                          <View style={{ width: '100%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F1F5F9', position: 'relative' }}>
                            <Image
                              source={{ uri: friend.avatarUrl ?? FALLBACK_AVATAR }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                            <View style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', borderWidth: 1.5, borderColor: '#FFFFFF' }} />
                          </View>
                          <Text className="mt-0.5 text-center text-[10px] font-bold text-[#050505]" numberOfLines={1}>
                            {friend.name || friend.username || copy.friendFallback}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    // 5+ friends: group into pages of 4 (2 rows x 2 cols), swipe horizontally between pages
                    <FlatList
                      data={Array.from({ length: Math.ceil(profileFriends.length / 4) }, (_, i) =>
                        profileFriends.slice(i * 4, (i + 1) * 4)
                      )}
                      keyExtractor={(_, index) => `friends-page-${index}`}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      snapToInterval={PROFILE_FRIENDS_PAGE_WIDTH}
                      contentContainerStyle={{ gap: 0 }}
                      renderItem={({ item: pageFriends }) => (
                        <View
                          style={{
                            width: PROFILE_FRIENDS_PAGE_WIDTH,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            rowGap: 6,
                            columnGap: 6,
                          }}
                        >
                          {pageFriends.map(friend => (
                            <TouchableOpacity
                              key={String(friend.id)}
                              style={{ width: '48%' }}
                              activeOpacity={0.85}
                              onPress={() => handleNavigateToProfile(String(friend.id))}
                            >
                              <View style={{ width: '100%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F1F5F9', position: 'relative' }}>
                                <Image
                                  source={{ uri: friend.avatarUrl ?? FALLBACK_AVATAR }}
                                  style={{ width: '100%', height: '100%' }}
                                  resizeMode="cover"
                                />
                                <View style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', borderWidth: 1.5, borderColor: '#FFFFFF' }} />
                              </View>
                              <Text className="mt-0.5 text-center text-[10px] font-bold text-[#050505]" numberOfLines={1}>
                                {friend.name || friend.username || copy.friendFallback}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    />
                  )
                ) : (
                  <View className="rounded-md bg-[#F8FAFC] px-2 py-3 items-center justify-center">
                    <Text className="text-[10px] text-[#65676B] text-center">
                      {profileFriendsTab === 'following'
                        ? language === 'vi'
                          ? 'Chưa theo dõi ai'
                          : 'Not following anyone'
                        : language === 'vi'
                          ? 'Chưa có người theo dõi'
                          : 'No followers yet'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Composer — shared with Home feed */}
          {isOwnProfile && (
            <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 12, paddingTop: 4 }}>
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
              <Text style={profileMainStyles.postsTabTitle}>
                {copy.posts}
              </Text>
              <View style={profileMainStyles.postsTabUnderline} />
            </View>
            <TouchableOpacity
              style={profileMainStyles.managePostsButton}
              activeOpacity={0.8}
            >
              <Sliders size={12} color="#1877F2" />
              <Text style={profileMainStyles.managePostsText}>
                {language === 'vi' ? 'Quản lý bài viết' : 'Manage posts'}
              </Text>
            </TouchableOpacity>
          </View>
    </>
  );

  const profilePostsEmptyComponent =
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
    ) : filteredProfilePosts.length === 0 ? (
      <View style={profilePostStyles.stateCard}>
        <Text style={profilePostStyles.stateText}>
          {language === 'vi'
            ? 'Chưa có bài viết phù hợp với bộ lọc này.'
            : 'No posts match this filter yet.'}
        </Text>
      </View>
    ) : null;

  const profilePostsFooterComponent = isLoadingMorePosts ? (
    <View className="items-center py-4">
      <ActivityIndicator size="small" color="#1877F2" />
    </View>
  ) : null;

  const shouldRenderProfilePostsState = profilePostsEmptyComponent !== null;
  const profileListItems = useMemo<ProfileListItem[]>(
    () => [
      { type: 'filter' },
      ...(shouldRenderProfilePostsState
        ? [{ type: 'state' } as ProfileListItem]
        : filteredProfilePosts.map(
            post => ({ type: 'post', post }) as ProfileListItem,
          )),
    ],
    [filteredProfilePosts, shouldRenderProfilePostsState],
  );

  const renderProfileListItem = useCallback(
    ({ item }: FlashListRenderItemInfo<ProfileListItem>) => {
      if (item.type === 'filter') {
        return (
          <FeedSourceFilterBar<ProfileFilterBarKey>
            activeKey={profilePostFilter}
            items={profilePostFilterItems}
            onChange={handleProfilePostFilterChange}
          />
        );
      }

      if (item.type === 'state') {
        return <>{profilePostsEmptyComponent}</>;
      }

      return renderProfilePostContent(item.post);
    },
    [
      handleProfilePostFilterChange,
      profilePostFilter,
      profilePostFilterItems,
      profilePostsEmptyComponent,
      renderProfilePostContent,
    ],
  );

  const profilePostsListElement = (
    <FlashList
      style={profileMainStyles.postsList}
      data={profileListItems}
      keyExtractor={profileListItemKeyExtractor}
      getItemType={profileListItemType}
      renderItem={renderProfileListItem}
      ListHeaderComponent={profileContentHeader}
      ListHeaderComponentStyle={profileListHeaderComponentStyle}
      ListFooterComponent={profilePostsFooterComponent}
      stickyHeaderIndices={[0]}
      stickyHeaderConfig={{
        offset: profileHeaderHeight,
        useNativeDriver: true,
        hideRelatedCell: false,
      }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={profilePostsListContentStyle}
      scrollIndicatorInsets={{ bottom: scrollIndicatorBottomInset }}
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
      maintainVisibleContentPosition={{ disabled: true }}
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
        style={[
          profileMainStyles.circleButton,
          isProfileHeaderSolid && profileMainStyles.circleButtonOnSolidHeader,
        ]}
        activeOpacity={0.8}
        onPress={() => navigation.goBack()}
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
    return <FullProfileSkeleton />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={profileMainStyles.container}>
        <FocusAwareStatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        {profilePostsListElement}
        {profileHeaderOverlayElement}
        <EditProfileActionSheet
          visible={editSheetVisible}
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
                  source={{ uri: profileMediaSheet === 'cover' ? coverUrl : avatarUrl }}
                  style={[
                    profileMainStyles.mediaSheetPreview,
                    profileMediaSheet === 'avatar' && profileMainStyles.mediaSheetAvatarPreview,
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
                  <Text style={profileMainStyles.mediaSheetSubtitle} numberOfLines={1}>
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
                  <View style={[profileMainStyles.mediaActionIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Sparkles size={19} color="#2563EB" />
                  </View>
                  <View style={profileMainStyles.mediaActionContent}>
                    <Text style={profileMainStyles.mediaActionLabel}>
                      {copy.viewStory}
                    </Text>
                    <Text style={profileMainStyles.mediaActionHint}>
                      {language === 'vi'
                        ? 'Mở tin đang hoạt động của bạn'
                        : 'Open your active story'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handleViewProfileMedia}
                style={profileMainStyles.mediaActionRow}
              >
                <View style={[profileMainStyles.mediaActionIcon, { backgroundColor: '#E7F3FF' }]}>
                  <Eye size={19} color="#1877F2" />
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

              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handleChangeProfileMedia}
                style={profileMainStyles.mediaActionRow}
              >
                <View style={[profileMainStyles.mediaActionIcon, { backgroundColor: '#ECFEFF' }]}>
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

              {profileMediaSheet === 'avatar' ? (
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={handleCreateStoryFromMediaSheet}
                  style={profileMainStyles.mediaActionRow}
                >
                  <View style={[profileMainStyles.mediaActionIcon, { backgroundColor: '#F5F3FF' }]}>
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
          story={storyOptionsSheet ? { publisher: storyOptionsSheet.publisher } : null}
          onClose={() => {
              setStoryOptionsSheet(null);
              tabBarVisibility.setVisible(true);
            }}
          language={language}
          onViewStory={handleConfirmViewStory}
          onViewProfile={handleViewProfileFromStory}
          copy={{
            title: copy.storySheetTitle(
              storyOptionsSheet?.publisher?.name?.trim() || (language === 'vi' ? 'người dùng' : 'user')
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
          onSave={handleSavePost}
          onHide={handleHidePost}
          onDelete={handleDeletePost}
          onReport={handleReportPost}
        />
        <PhotoViewerModal
          state={photoViewer}
          onClose={handleClosePhotoViewer}
          onReact={handleSetPostReaction}
          onCommentTap={commentVm.openComments}
          onProfilePress={handleNavigateToProfile}
          onInternalShare={handleInternalSharePost}
          onFollowChange={handlePhotoViewerFollowChange}
          posts={posts}
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
                  <Text style={profileMainStyles.activitiesSubtitle} numberOfLines={1}>
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
                      posts.reduce((total, post) => total + post.likeCount, 0),
                    )}
                  </Text>
                  <Text style={profileMainStyles.activitiesSummaryLabel}>
                    {language === 'vi' ? 'Cảm xúc' : 'Reactions'}
                  </Text>
                </View>
                <View style={profileMainStyles.activitiesSummaryPill}>
                  <Text style={profileMainStyles.activitiesSummaryValue}>
                    {formatCount(
                      posts.reduce((total, post) => total + post.commentCount, 0),
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
                contentContainerStyle={profileMainStyles.activitiesListContent}
              >
                {!shouldRenderActivitiesList ? (
                  <View style={profileMainStyles.activitiesOpeningState}>
                    <ActivityIndicator size="small" color="#1877F2" />
                  </View>
                ) : profileActivityItems.length > 0 ? (
                  profileActivityItems.map(item => {
                    const ActivityIcon = item.Icon;
                    return (
                      <View key={item.id} style={profileMainStyles.activityRow}>
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
                    <Sparkles size={24} color="#1877F2" />
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
        <ToastContainer />
      </View>
    </GestureHandlerRootView>
  );
}

const profileMainStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
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
  nameBlock: {
    marginTop: 12,
    alignItems: 'flex-start',
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
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  usernameText: {
    fontSize: 13,
    color: '#65676B',
    fontWeight: '500',
  },
  copyButton: {
    marginLeft: 6,
    padding: 2,
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
    backgroundColor: '#1877F2',
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
    color: '#1877F2',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 5,
    flexShrink: 1,
    includeFontPadding: false,
  },
  profileDetailsColumn: {
    flex: PROFILE_DETAILS_COLUMN_FLEX,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#E4E6EB',
  },
  profileFriendsColumn: {
    flex: PROFILE_FRIENDS_COLUMN_FLEX,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    color: '#1877F2',
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
    color: '#1877F2',
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
    color: '#1877F2',
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
    backgroundColor: '#1877F2',
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    opacity: 0.5,
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
    backgroundColor: '#EEF2FF',
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
    color: '#1877F2',
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
    backgroundColor: '#1877F2',
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
    color: '#1877F2',
  },
});

export default ProfileScreen;
