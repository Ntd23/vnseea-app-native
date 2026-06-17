// Description: Renders the Facebook-style profile screen with user-backed API data.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  ArrowLeft,
  Briefcase,
  Camera,
  Clock,
  MapPin,
  MoreHorizontal,
  PlusCircle,
  Search,
  User,
  UserPlus,
  Users,
  UserCheck,
  Sparkles,
  Verified,
  MessageCircle,
  Play,
  ChevronRight,
  Video,
  Image as ImageIcon,
  Calendar,

  Copy,

  Edit,

  SlidersHorizontal as Sliders,

  Star,
} from 'lucide-react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { launchImageLibrary } from 'react-native-image-picker';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useProfileViewModel } from '../../application/view-models/useProfileViewModel';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import { useFeedCommentsViewModel } from '../../../feed/application/view-models/useFeedCommentsViewModel';
import {
  PhotoViewerModal,
  type PhotoViewerState,
} from '../../../feed/presentation/screens/FeedScreen';
import {
  FEED_COPY as POST_CARD_COPY,
  HomeVideoPostCard,
  ReactionPickerOverlay,
  TextPostCard,
} from '../../../feed/presentation/components/PostCards';
import { ComposerCard } from '../../../feed/presentation/components/ComposerCard';
import { PollPostCard } from '../../../feed/presentation/components/PollPostCard';
import { createPollRepository } from '../../../poll/infrastructure/repositories/ApiPollRepository';
import { createStoriesRepository } from '../../../stories/infrastructure/repositories/ApiStoriesRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { ShareActionSheet } from '../../../shared-kernel/presentation/components/ShareActionSheet';
import { EditProfileActionSheet } from '../../../shared-kernel/presentation/components/EditProfileActionSheet';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { getPokeCopy } from '../../../poke/application/i18n/pokeCopy';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { ReelCommentsSheet } from '../../../reels/presentation/components/ReelCommentsSheet';
import type {
  FeedPollPost,
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
} from '../../../feed/domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type {
  StoryItem,
  StoryMedia,
} from '../../../stories/domain/types/stories.types';
import type { ChatItem } from '../../../messages/domain/types/messages.types';

type ProfileNav = NativeStackNavigationProp<RootStackParamList>;
type ProfileFeedPost = FeedTextPost | FeedVideoPost | FeedPollPost;
type ProfileRoute = RouteProp<RootStackParamList, typeof ROUTES.PROFILE>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRIEND_ITEM_WIDTH = (SCREEN_WIDTH - 64 - 16) / 3;
const PROFILE_POST_MEDIA_HEIGHT = Math.min(320, Math.round(SCREEN_WIDTH * 0.62));
// 4 friends in the right column of the Details+Friends row
const PROFILE_FRIENDS_PAGE_WIDTH = Math.floor((SCREEN_WIDTH / 2 - 32 - 12) / 4);
const PROFILE_STORY_MAX_AGE_SECONDS = 24 * 60 * 60;
const PROFILE_POST_PAGE_SIZE = 20;

function getActiveTimeValue(lastSeenText?: string | null): string {
  const value = String(lastSeenText ?? '').trim();
  if (!value) return '--';
  return value.replace(/^active\s+/i, '').replace(/^hoạt động\s+/i, '');
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
    dashboard: 'Bảng điều khiển',
    addToStory: 'Thêm vào tin',
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
    editPublicDetails: 'Chỉnh sữa chi tiết công khai',
    editProfileSheetTitle: 'Chỉnh sữa hồ sơ',
    editProfileSheetSubtitle: 'Bạn muốn thay đổi điều gì?',
    changeCoverLabel: 'Thay đổi ảnh bìa',
    changeCoverHint: 'Cập nhật ảnh nền của bạn',
    editDetailsLabel: 'Chỉnh sữa thông tin',
    editDetailsHint: 'Tên, tiểu sử, công việc...',
    sheetCancel: 'Hủy',
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
    edit: 'Chỉnh sữa',
    avatarOptionsTitle: 'Tùy chọn ảnh đại diện',
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
    dashboard: 'Dashboard',
    addToStory: 'Add to story',
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

function getStoryPreviewUrl(story: StoryItem | null, fallbackAvatar: string) {
  if (!story) return fallbackAvatar;
  const imageSegment = story.media.find(item => item.type === 'image');
  return (
    story.thumbnailUrl ||
    imageSegment?.url ||
    story.publisher.avatarUrl ||
    fallbackAvatar
  );
}

function hasVideoStory(story: StoryItem | null) {
  return Boolean(story?.media.some(item => item.type === 'video'));
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

function formatJoinedDate(registered: string | undefined, lang: AppLanguage): string {
  if (!registered) return '';
  const timestamp = Number(registered);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    try {
      const d = new Date(registered);
      if (!isNaN(d.getTime())) {
        return formatFormattedDate(d, lang);
      }
    } catch (err) {
      return '';
    }
    return '';
  }
  const date = new Date(timestamp * 1000);
  return formatFormattedDate(date, lang);
}

function formatFormattedDate(date: Date, lang: AppLanguage): string {
  if (lang === 'vi') {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `Đã tham gia ${day} Thg ${month}, ${year}`;
  } else {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `Joined ${month} ${day}, ${year}`;
  }
}

function DetailRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="mb-3.5 flex-row items-center">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-50 border border-slate-200/40 shadow-sm mr-3">
        {icon}
      </View>
      <Text className="flex-1 text-[14px] leading-snug text-[#1e293b] font-medium">
        {text}
      </Text>
    </View>
  );
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
  return (
    <View className="flex-1 bg-[#F0F2F5]">
      {/* Cover Skeleton */}
      <View className="h-[210px] w-full bg-[#E4E6EB] relative">
        <SkeletonBlock height={210} width={SCREEN_WIDTH} borderRadius={0} />
      </View>

      {/* Avatar Skeleton Overlap */}
      <View className="items-center -mt-[60px] relative z-10">
        <View className="h-[120px] w-[120px] rounded-full border-4 border-white bg-white overflow-hidden shadow-sm">
          <SkeletonBlock height={120} width={120} borderRadius={60} />
        </View>
      </View>

      {/* Name and Username Skeleton */}
      <View className="mt-4 items-center px-4">
        <SkeletonBlock height={24} width={180} borderRadius={6} />
        <View className="mt-2">
          <SkeletonBlock height={14} width={100} borderRadius={4} />
        </View>
      </View>

      {/* Actions Row Skeleton */}
      <View className="mt-5 flex-row px-4 gap-3">
        <View className="flex-1">
          <SkeletonBlock height={40} borderRadius={20} />
        </View>
        <View className="flex-1">
          <SkeletonBlock height={40} borderRadius={20} />
        </View>
      </View>

      {/* Stats Divider Line */}
      <View className="mx-4 mt-5 border-b border-[#E4E6EB]" />

      {/* Details Card Skeleton */}
      <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm border border-[#E4E6EB]">
        <SkeletonBlock height={18} width={80} borderRadius={4} />
        <View className="mt-4">
          {[1, 2, 3, 4].map(i => (
            <View key={i} className="flex-row items-center mb-3.5">
              <SkeletonBlock height={32} width={32} borderRadius={16} />
              <View className="ml-3 flex-1">
                <SkeletonBlock height={14} width="70%" borderRadius={4} />
              </View>
            </View>
          ))}
        </View>
        <View className="mt-4">
          <SkeletonBlock height={36} borderRadius={8} />
        </View>
      </View>
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
  const navigation = useNavigation<ProfileNav>();
  const route = useRoute<ProfileRoute>();
  const {
    profile,
    followers,
    following,
    isLoading,
    error,
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
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [postsCursor, setPostsCursor] = useState<string | undefined>(undefined);
  const isLoadingMorePostsRef = React.useRef(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [userStory, setUserStory] = useState<StoryItem | null>(null);
  const [allStories, setAllStories] = useState<StoryItem[]>([]);
  const [isStoryLoading, setIsStoryLoading] = useState(false);
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
  const [sharingPost, setSharingPost] = useState<FeedPost | undefined>(undefined);
  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);

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

  useFocusEffect(useCallback(() => {
    loadProfile({
      userId: route.params?.userId,
      includeFriends: true,
    }).catch(() => undefined);
  }, [loadProfile, route.params?.userId]));

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
  const followerCount = followers.length;
  const followingCount = following.length;
  const profileFriends = useMemo(
    () => followers.filter(friend => friend.id).slice(0, 5),
    [followers],
  );
  const storyPreviewUrl = getStoryPreviewUrl(userStory, avatarUrl);
  const storySegmentCount = userStory?.media.length ?? 0;
  const storyHasVideo = hasVideoStory(userStory);
  const shouldShowStorySection = Boolean(userStory) || isStoryLoading || isOwnProfile;
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

  const handleOpenSharePost = useCallback((post: FeedPost) => {
    setSharingPost(post);
    setShareModalVisible(true);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShareModalVisible(false);
    setSharingPost(undefined);
  }, []);

  const handleNavigateToProfile = useCallback((userId: string) => {
    navigation.navigate(ROUTES.PROFILE, { userId });
  }, [navigation]);

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

  const handleProfileScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      if (
        contentSize.height - (contentOffset.y + layoutMeasurement.height) <
        480
      ) {
        handleLoadMorePosts();
      }
    },
    [handleLoadMorePosts],
  );

  // Avatar Press Handler
  const handleAvatarPress = () => {
    if (isOwnProfile) {
      // Navigate to AvatarViewerScreen for own profile
      navigation.navigate(ROUTES.AVATAR_VIEWER, {
        avatarUrl: avatarUrl,
        userName: displayName,
        userId: currentUserId ?? profile?.id,
      });
    } else if (userStory) {
      Alert.alert(
        copy.avatarOptionsTitle,
        '',
        [
          {
            text: copy.viewStory,
            onPress: () => {
              navigation.navigate(ROUTES.STORY_VIEWER, {
                stories: [userStory],
                initialUserIndex: 0,
              });
            },
          },
          {
            text: copy.cancel,
            style: 'cancel',
          },
        ]
      );
    }
  };

  // Cover Photo Press Handler
  const handleCoverPress = () => {
    navigation.navigate(ROUTES.COVER_VIEWER, {
      coverUrl: coverUrl,
      userName: displayName,
      userId: targetUserId ?? currentUserId ?? profile?.id,
    });
  };

  const handleChangeAvatar = async () => {
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
  };

  const handleChangeCover = async () => {
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
  };

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

  const handleOpenDashboard = () => {
    navigation.navigate(ROUTES.MAIN_TABS, { screen: ROUTES.SETTINGS });
  };

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
  }, [isOwnProfile]);

  const handleEditCover = useCallback(() => {
    setEditSheetVisible(false);
    // Delay to let the close animation play before launching the picker.
    setTimeout(() => handleChangeCover(), 250);
  }, [handleChangeCover]);

  const handleEditDetails = useCallback(() => {
    setEditSheetVisible(false);
    setTimeout(() => navigation.navigate(ROUTES.EDIT_PROFILE), 250);
  }, [navigation]);

  const handleOpenFriendStory = useCallback((story: StoryItem) => {
    navigation.navigate(ROUTES.STORY_VIEWER, {
      stories: [story],
      initialUserIndex: 0,
    });
  }, [navigation]);

  if (isLoading && !profile) {
    return <FullProfileSkeleton />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={profileMainStyles.container}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          onScroll={handleProfileScroll}
          scrollEventThrottle={240}
        >
          {/* Cover Photo */}
          <View style={profileMainStyles.coverContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleCoverPress}
              style={{ width: SCREEN_WIDTH, height: 210 }}
            >
              <Image
                source={{ uri: coverUrl }}
                style={{ width: SCREEN_WIDTH, height: 210 }}
                resizeMode="cover"
              />
            </TouchableOpacity>

            {isLoadingCover && (
              <View className="absolute inset-0 bg-black/30 items-center justify-center" style={{ zIndex: 998 }}>
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            )}

            {/* Floating Header Inside Cover Photo */}
            <View
              style={[profileMainStyles.headerOverlay, { paddingTop: insets.top + 8, height: insets.top + 48 }]}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                style={profileMainStyles.circleButton}
                activeOpacity={0.8}
                onPress={() => navigation.goBack()}
              >
                <ArrowLeft size={18} color="#050505" />
              </TouchableOpacity>

              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  style={profileMainStyles.circleButton}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate(ROUTES.SEARCH)}
                >
                  <Search size={18} color="#050505" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={profileMainStyles.circleButton}
                  activeOpacity={0.8}
                >
                  <MoreHorizontal size={18} color="#050505" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Edit Profile Button overlapping cover photo bottom right */}
            {isOwnProfile && (
              <TouchableOpacity
                style={profileMainStyles.editCoverButton}
                activeOpacity={0.85}
                onPress={handleEditProfilePress}
              >
                <Edit size={14} color="#050505" />
                <Text style={profileMainStyles.editCoverText}>
                  {language === 'vi' ? 'Chỉnh sữa hồ sơ' : 'Edit profile'}
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
                  <View
                    style={[
                      profileMainStyles.avatarBorder,
                      {
                        borderWidth: userStory ? 3.5 : 0,
                        borderColor: userStory ? (userStory.hasUnseen ? '#1877F2' : '#CBD5E1') : 'transparent',
                        padding: userStory ? 2.5 : 0,
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

            {/* Stats Grid */}
            <View style={profileMainStyles.statsContainer}>
              <View style={profileMainStyles.statItem}>
                <View style={[profileMainStyles.statIconContainer, { backgroundColor: '#E7F3FF' }]}>
                  <Users size={15} color="#1877F2" />
                </View>
                <Text style={profileMainStyles.statNumber}>{followerCount}</Text>
                <Text style={profileMainStyles.statLabel}>
                  {language === 'vi' ? 'Bạn bè' : 'Friends'}
                </Text>
              </View>

              <View style={profileMainStyles.statItem}>
                <View style={[profileMainStyles.statIconContainer, { backgroundColor: '#F0F9FF' }]}>
                  <Clock size={15} color="#0EA5E9" />
                </View>
                <Text style={profileMainStyles.statNumber}>
                  {getActiveTimeValue(profile?.lastSeenText)}
                </Text>
                <Text style={profileMainStyles.statLabel}>
                  {language === 'vi' ? 'Thời gian' : 'Time'}
                </Text>
              </View>

              <View style={profileMainStyles.statItem}>
                <View style={[profileMainStyles.statIconContainer, { backgroundColor: '#ECFDF5' }]}>
                  <Users size={15} color="#10B981" />
                </View>
                <Text style={profileMainStyles.statNumber}>{followerCount}</Text>
                <Text style={profileMainStyles.statLabel}>
                  {language === 'vi' ? 'Người theo dõi' : 'Followers'}
                </Text>
              </View>

              <View style={profileMainStyles.statItem}>
                <View style={[profileMainStyles.statIconContainer, { backgroundColor: '#FFF7ED' }]}>
                  <UserCheck size={15} color="#F59E0B" />
                </View>
                <Text style={profileMainStyles.statNumber}>{followingCount}</Text>
                <Text style={profileMainStyles.statLabel}>
                  {language === 'vi' ? 'Đang theo dõi' : 'Following'}
                </Text>
              </View>

              <View style={profileMainStyles.statItem}>
                <View style={[profileMainStyles.statIconContainer, { backgroundColor: '#F5F3FF' }]}>
                  <Star size={15} color="#8B5CF6" />
                </View>
                <Text style={profileMainStyles.statNumber}>
                  {Number(profile?.points ?? 0)}
                </Text>
                <Text style={profileMainStyles.statLabel}>
                  {language === 'vi' ? 'Điểm' : 'Points'}
                </Text>
              </View>
            </View>

            {/* Action Buttons Row */}
            <View style={profileMainStyles.primaryButtonsRow}>
              {isOwnProfile ? (
                <>
                  <TouchableOpacity
                    style={profileMainStyles.dashboardButton}
                    activeOpacity={0.85}
                    onPress={handleOpenDashboard}
                  >
                    <Briefcase size={16} color="#FFFFFF" />
                    <Text style={profileMainStyles.dashboardButtonText}>
                      Dashboard
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={profileMainStyles.storyAddButton}
                    activeOpacity={0.85}
                    onPress={handleCreateStory}
                  >
                    <PlusCircle size={16} color="#1877F2" />
                    <Text style={profileMainStyles.storyAddButtonText}>
                      {language === 'vi' ? 'Thêm vào tin' : 'Add to story'}
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
                        <Image
                          source={{ uri: storyPreviewUrl }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
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
                        <Image
                          source={{ uri: getStoryPreviewUrl(story, story.publisher.avatarUrl || FALLBACK_AVATAR) }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
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
              <View className="flex-1 px-4 py-3" style={{ borderRightWidth: 1, borderRightColor: '#E4E6EB' }}>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[15px] font-bold text-[#050505]">{copy.details}</Text>
                  <TouchableOpacity activeOpacity={0.8} onPress={handleEditProfilePress}>
                    <Text className="text-[12px] font-bold text-[#1877F2]">
                      {language === 'vi' ? 'Chỉnh sữa' : 'Edit'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="flex-row items-center mb-1.5">
                  <User size={13} color="#65676B" />
                  <Text className="ml-1.5 flex-1 text-[12px] font-medium text-[#1E293B]" numberOfLines={1}>
                    {profile?.pro ? copy.vipMember : copy.member}
                  </Text>
                </View>
                <View className="flex-row items-center mb-1.5">
                  <Clock size={13} color="#65676B" />
                  <Text className="ml-1.5 flex-1 text-[12px] font-medium text-[#1E293B]" numberOfLines={1}>
                    {profile?.lastSeenText ?? copy.activeNow}
                  </Text>
                </View>
                <View className="flex-row items-center mb-1.5">
                  <Users size={13} color="#65676B" />
                  <Text className="ml-1.5 flex-1 text-[12px] font-medium text-[#1E293B]" numberOfLines={1}>
                    {followerCount} {language === 'vi' ? 'người theo dõi' : 'followers'}
                  </Text>
                </View>
                <View className="flex-row items-center mb-1.5">
                  <UserCheck size={13} color="#65676B" />
                  <Text className="ml-1.5 flex-1 text-[12px] font-medium text-[#1E293B]" numberOfLines={1}>
                    Đang theo {followingCount} người
                  </Text>
                </View>
                <View className="flex-row items-center mb-1.5">
                  <Star size={13} color="#65676B" />
                  <Text className="ml-1.5 flex-1 text-[12px] font-medium text-[#1E293B]" numberOfLines={1}>
                    {Number(profile?.points ?? 0)} điểm thưởng
                  </Text>
                </View>

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
              <View className="flex-1 px-4 py-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[15px] font-bold text-[#050505]">{copy.friends}</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate(ROUTES.INVITE_FRIENDS)}
                  >
                    <Text className="text-[12px] font-bold text-[#1877F2]">
                      {language === 'vi' ? 'Xem tất cả >' : 'See all >'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text className="mb-2 text-[11px] text-[#65676B]">
                  {followerCount} {language === 'vi' ? 'người bạn' : 'friends'}
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
                    // 5+ friends: horizontal FlatList, 4 visible at a time, swipe to next page
                    <FlatList
                      data={profileFriends}
                      keyExtractor={(item) => String(item.id)}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      snapToInterval={PROFILE_FRIENDS_PAGE_WIDTH}
                      contentContainerStyle={{ gap: 4 }}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          key={String(item.id)}
                          style={{ width: PROFILE_FRIENDS_PAGE_WIDTH }}
                          activeOpacity={0.85}
                          onPress={() => handleNavigateToProfile(String(item.id))}
                        >
                          <View style={{ width: '100%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F1F5F9', position: 'relative' }}>
                            <Image
                              source={{ uri: item.avatarUrl ?? FALLBACK_AVATAR }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                            <View style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', borderWidth: 1.5, borderColor: '#FFFFFF' }} />
                          </View>
                          <Text className="mt-0.5 text-center text-[10px] font-bold text-[#050505]" numberOfLines={1}>
                            {item.name || item.username || copy.friendFallback}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  )
                ) : (
                  <View className="rounded-md bg-[#F8FAFC] px-2 py-3 items-center justify-center">
                    <Text className="text-[10px] text-[#65676B] text-center">
                      {language === 'vi' ? 'Chưa có bạn bè' : 'No friends'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Composer — shared with Home feed */}
          {isOwnProfile && (
            <ComposerCard
              onPress={() => navigation.navigate(ROUTES.CREATE_POST)}
              avatarUrl={avatarUrl}
              copy={{
                composerPlaceholder: copy.composerPlaceholder,
                library: copy.photoVideo,
                tag: language === 'vi' ? 'Gắn thẻ' : 'Tag',
                feeling: copy.lifeEvent,
              }}
            />
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

          {/* Posts List */}
          {isPostsLoading && posts.length === 0 ? (
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
          ) : (
            <View>
              {posts.map(post => {
                if (post.kind === 'video') {
                  return (
                    <HomeVideoPostCard
                      key={`video-${post.id}`}
                      post={post}
                      copy={postCardCopy}
                      onReact={handleSetPostReaction}
                      onOpenPicker={handleOpenPicker}
                      onCommentTap={commentVm.openComments}
                      onShare={handleOpenSharePost}
                      isActive={false}
                      gestureX={gestureX}
                      gestureY={gestureY}
                      gestureActive={gestureActive}
                      navigateToProfile={handleNavigateToProfile}
                    />
                  );
                }

                if (post.kind === 'poll') {
                  return (
                    <PollPostCard
                      key={`poll-${post.id}`}
                      post={post}
                      onVote={handleVotePoll}
                      onReact={handleSetPostReaction}
                      onOpenPicker={handleOpenPicker}
                      onCommentTap={commentVm.openComments}
                      onShare={handleOpenSharePost}
                      onProfilePress={handleNavigateToProfile}
                      currentUserAvatar={avatarUrl}
                    />
                  );
                }

                return (
                  <TextPostCard
                    key={`text-${post.id}`}
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
                    navigateToProfile={handleNavigateToProfile}
                  />
                );
              })}
            </View>
          )}
          {isLoadingMorePosts ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color="#1877F2" />
            </View>
          ) : null}
        </ScrollView>
        <EditProfileActionSheet
          visible={editSheetVisible}
          onClose={() => setEditSheetVisible(false)}
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
        <ReactionPickerOverlay
          anchor={pickerAnchor}
          onPick={handlePickReaction}
          onDismiss={() => setPickerAnchor(null)}
          gestureX={gestureX}
          gestureY={gestureY}
          gestureActive={gestureActive}
        />
        <PhotoViewerModal
          state={photoViewer}
          onClose={handleClosePhotoViewer}
          onReact={handleSetPostReaction}
          onCommentTap={commentVm.openComments}
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
  coverContainer: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: 210,
    backgroundColor: '#E4E6EB',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F2F5',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#050505',
  },
  statLabel: {
    fontSize: 10,
    color: '#65676B',
    fontWeight: '600',
    marginTop: 2,
  },
  primaryButtonsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  dashboardButton: {
    flex: 1,
    height: 36,
    borderRadius: 9999,
    backgroundColor: '#1877F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
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
  },
  storyAddButtonText: {
    color: '#1877F2',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
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


