// Description: Renders a full data-driven Page detail surface.
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import { PROFILE_COVER_ASPECT_RATIO } from '../../../shared-kernel/application/constants/profileImageGeometry';
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
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Animated, { useSharedValue, FadeInDown } from 'react-native-reanimated';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Briefcase,
  Camera,
  Check,
  ChevronRight,
  Edit3,
  FileText,
  Flag,
  Gift,
  Globe2,
  Heart,
  MapPin,
  Tag,
  MessageCircle,
  MoreHorizontal,
  Play,
  Search,
  Send,
  Share2,
  Star,
  ThumbsUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { navigateToPostComments } from '../../../navigation/postNavigation';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import { useSafeBottomPadding } from '../../../shared-kernel/presentation/layout/useSafeBottomLayout';
import type {
  FeedPollPost,
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
} from '../../../feed/domain/types/feed.types';
import { createFeedRepository } from '../../../feed';
import { isFeedPostShareable } from '../../../feed/domain/policies/feedPostPrivacy';
import type { SharePostInput } from '../../../feed/domain/repositories/FeedRepository';
import { useFeedCommentsViewModel } from '../../../feed/application/view-models/useFeedCommentsViewModel';
import { usePostRealtimeScope } from '../../../feed/application/realtime/usePostRealtimeScope';
import {
  FEED_COPY as POST_CARD_COPY,
  HomeVideoPostCard,
  ReactionPickerOverlay,
  TextPostCard,
} from '../../../feed/presentation/components/PostCards';
import { ComposerCard } from '../../../feed/presentation/components/ComposerCard';
import PostReactionsSheet from '../../../feed/presentation/components/PostReactionsSheet';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import {
  PhotoViewerModal,
  type PhotoViewerState,
} from '../../../shared-kernel/presentation/components/PhotoViewerModal';
import {
  ImageCropperModal,
  type CropSourceImage,
  type CroppedImageAsset,
  type ImageCropTarget,
} from '../../../shared-kernel/presentation/components/ImageCropperModal';
import {
  PROFILE_IMAGE_PICKER_OPTIONS,
  prepareProfileImageForCrop,
  waitForImagePickerDismissal,
} from '../../../shared-kernel/presentation/utils/profileImagePicker';
import { PollPostCard } from '../../../feed/presentation/components/PollPostCard';
import { FeedShareBottomSheet } from '../../../feed/presentation/components/FeedShareBottomSheet';
import type { SharePageInput } from '../../../feed/presentation/components/FeedShareBottomSheet';
import {
  buildSharedPageMessage,
  buildSharedPageUrl,
  createMessagesRepository,
} from '../../../messages';
import { ReelCommentsSheet } from '../../../reels/presentation/components/ReelCommentsSheet';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { usePageDetailViewModel } from '../../application/view-models/usePageDetailViewModel';
import type {
  PageReview,
  PageUser,
  PagesItem,
} from '../../domain/types/pages.types';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import PageDetailMenuActionSheet from '../components/PageDetailMenuActionSheet';
import { PagePostMenuActionSheet } from '../components/PagePostMenuActionSheet';
import {
  PageMediaViewerModal,
  type PageMediaKind,
} from '../components/PageMediaViewerModal';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type PageDetailProps = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.PAGE_DETAIL
>;

const pageShareFeedRepository = createFeedRepository();
const pageShareMessagesRepository = createMessagesRepository();

const PAGE_DETAIL_COPY = {
  vi: {
    likesLabel: 'Lượt thích',
    followersLabel: 'Theo dõi',
    postsLabel: 'Bài viết',
    createPostBtn: 'Đăng bài cho trang',
    likeBtn: 'Thích',
    likedBtn: 'Đã thích',
    followBtn: 'Theo dõi',
    followingBtn: 'Đang theo dõi',
    inviteBtn: 'Mời',
    shareBtn: 'Chia sẻ',
    reportBtn: 'Báo cáo',
    cancelBtn: 'Hủy',
    reportTitle: 'Báo cáo trang',
    reportMessage: 'Bạn muốn gửi báo cáo trang này?',
    reportSent: 'Đã gửi',
    reportSentMsg: 'Báo cáo đã được gửi.',
    reportFailed: 'Không gửi được',
    emptyPosts: 'Trang này chưa có bài viết.',
    defaultTitle: 'Trang',
    tabPosts: 'Bài viết',
    tabAbout: 'Giới thiệu',
    tabFollowers: 'Theo dõi',
    tabReviews: 'Đánh giá',
    tabAdmins: 'Quản trị',
    followersTitle: 'người theo dõi',
    adminsTitle: 'quản trị viên',
    createOfferBtn: 'Tạo ưu đãi',
    filterAll: 'Tất cả',
    filterText: 'Bài viết',
    filterVideo: 'Video',
  },
  en: {
    likesLabel: 'Likes',
    followersLabel: 'Followers',
    postsLabel: 'Posts',
    createPostBtn: 'Post for page',
    createOfferBtn: 'Create offer',
    filterAll: 'All',
    filterText: 'Posts',
    filterVideo: 'Videos',
    likeBtn: 'Like',
    likedBtn: 'Liked',
    followBtn: 'Follow',
    followingBtn: 'Following',
    inviteBtn: 'Invite',
    shareBtn: 'Share',
    reportBtn: 'Report',
    cancelBtn: 'Cancel',
    reportTitle: 'Report Page',
    reportMessage: 'Do you want to report this page?',
    reportSent: 'Sent',
    reportSentMsg: 'Report has been sent.',
    reportFailed: 'Failed to send',
    emptyPosts: 'No posts on this page.',
    defaultTitle: 'Page',
    tabPosts: 'Posts',
    tabAbout: 'About',
    tabFollowers: 'Followers',
    tabReviews: 'Reviews',
    tabAdmins: 'Admins',
    followersTitle: 'followers',
    adminsTitle: 'admins',
  },
};

const PAGE_DETAIL_UI_COPY = {
  vi: {
    likesLabel: 'Lượt thích',
    followersLabel: 'Theo dõi',
    postsLabel: 'Bài viết',
    createPostBtn: 'Hôm nay bạn thế nào?',
    createJobBtn: 'Tạo Công Việc',
    offersBtn: 'Lời Đề Nghị',
    editBtn: 'Chỉnh Sửa',
    changeCoverBtn: 'Thay ảnh bìa',
    changeAvatarBtn: 'Thay ảnh đại diện',
    viewCoverBtn: 'Xem ảnh bìa',
    viewAvatarBtn: 'Xem ảnh đại diện',
    backBtn: 'Quay lại',
    moreBtn: 'Tùy chọn trang',
    likeBtn: 'Thích',
    likedBtn: 'Đã thích',
    followBtn: 'Theo dõi',
    followingBtn: 'Đang theo dõi',
    inviteBtn: 'Mời',
    inviteRow: 'Mời bạn bè thích Trang này',
    inviteHint: 'Mở danh sách bạn bè để gửi lời mời',
    shareBtn: 'Chia sẻ',
    reportBtn: 'Báo cáo',
    cancelBtn: 'Hủy',
    reportTitle: 'Báo cáo trang',
    reportMessage: 'Bạn muốn gửi báo cáo trang này?',
    reportSent: 'Đã gửi',
    reportSentMsg: 'Báo cáo đã được gửi.',
    reportFailed: 'Không gửi được',
    emptyPosts: 'vẫn chưa đăng bất cứ điều gì',
    emptyPhotos: 'Trang này chưa có ảnh.',
    emptyVideos: 'Trang này chưa có video.',
    emptyMusic: 'Trang này chưa có nhạc.',
    searchPosts: 'Tìm kiếm các bài viết',
    clearSearchBtn: 'Xóa nội dung tìm kiếm',
    loadingPosts: 'Đang tải bài viết...',
    noSearchResults: 'Không tìm thấy bài viết phù hợp.',
    firstPostBtn: 'Đăng bài đầu tiên',
    infoTitle: 'Thông tin',
    aboutTitle: 'Về',
    suggestedTitle: 'Các trang bạn có thể thích',
    weekDelta: '+0 Tuần này',
    defaultTitle: 'Trang',
    tabPosts: 'Bài viết',
    filterAll: 'Tất cả',
    tabInfo: 'Thông tin',
    tabPhotos: 'Ảnh',
    tabVideos: 'Video',
    tabMusic: 'Nhạc',
    editPostTitle: 'Chỉnh sửa bài',
    editPostPlaceholder: 'Nội dung bài viết',
    editPostCancel: 'Hủy',
    editPostSave: 'Lưu',
    editPostSaving: 'Đang lưu...',
    editPostEmpty: 'Nội dung bài viết không được để trống.',
    commentsEnabledTitle: 'Đã bật nhận xét',
    commentsEnabledMessage: 'Người dùng có thể bình luận về bài viết này.',
    commentsDisabledTitle: 'Đã tắt nhận xét',
    commentsDisabledMessage: 'Người dùng không thể bình luận về bài viết này.',
    pinnedTitle: 'Đã ghim bài đăng',
    pinnedMessage: 'Bài đăng đã được ghim lên đầu trang.',
    unpinnedTitle: 'Đã bỏ ghim bài đăng',
    unpinnedMessage: 'Bài đăng không còn được ghim trong trang.',
  },
  en: {
    likesLabel: 'Likes',
    followersLabel: 'Followers',
    postsLabel: 'Posts',
    createPostBtn: 'What is on your mind?',
    createJobBtn: 'Create Job',
    offersBtn: 'Offers',
    editBtn: 'Edit',
    changeCoverBtn: 'Change cover',
    changeAvatarBtn: 'Change profile picture',
    viewCoverBtn: 'View cover photo',
    viewAvatarBtn: 'View profile picture',
    backBtn: 'Go back',
    moreBtn: 'Page options',
    likeBtn: 'Like',
    likedBtn: 'Liked',
    followBtn: 'Follow',
    followingBtn: 'Following',
    inviteBtn: 'Invite',
    inviteRow: 'Invite friends to like this Page',
    inviteHint: 'Open your friend list to send invitations',
    shareBtn: 'Share',
    reportBtn: 'Report',
    cancelBtn: 'Cancel',
    reportTitle: 'Report Page',
    reportMessage: 'Do you want to report this page?',
    reportSent: 'Sent',
    reportSentMsg: 'Report has been sent.',
    reportFailed: 'Failed to send',
    emptyPosts: 'has not posted anything yet',
    emptyPhotos: 'This page has no photos.',
    emptyVideos: 'This page has no videos.',
    emptyMusic: 'This page has no music.',
    searchPosts: 'Search posts',
    clearSearchBtn: 'Clear search',
    loadingPosts: 'Loading posts...',
    noSearchResults: 'No matching posts found.',
    firstPostBtn: 'Create the first post',
    infoTitle: 'Information',
    aboutTitle: 'About',
    suggestedTitle: 'Pages you may like',
    weekDelta: '+0 this week',
    defaultTitle: 'Page',
    tabPosts: 'Posts',
    filterAll: 'All',
    tabInfo: 'Info',
    tabPhotos: 'Photos',
    tabVideos: 'Videos',
    tabMusic: 'Music',
    editPostTitle: 'Edit post',
    editPostPlaceholder: 'Post content',
    editPostCancel: 'Cancel',
    editPostSave: 'Save',
    editPostSaving: 'Saving...',
    editPostEmpty: 'Post content cannot be empty.',
    commentsEnabledTitle: 'Comments enabled',
    commentsEnabledMessage: 'Users can comment on this post.',
    commentsDisabledTitle: 'Comments disabled',
    commentsDisabledMessage: 'Users cannot comment on this post.',
    pinnedTitle: 'Post pinned',
    pinnedMessage: 'The post was pinned to the top of this page.',
    unpinnedTitle: 'Post unpinned',
    unpinnedMessage: 'The post is no longer pinned on this page.',
  },
};

// Keep the Page hero geometry identical to the main Profile hero. Explicit
// React Native styles are used here because negative/arbitrary utility classes
// were not applied consistently on some Android builds.
const PAGE_HERO_AVATAR_SIZE = 100;
const PAGE_HERO_AVATAR_OVERLAP = 50;
const PAGE_HERO_IDENTITY_TOP_PADDING = 57;
const PAGE_HERO_AVATAR_ROW_STYLE = {
  marginTop: -PAGE_HERO_AVATAR_OVERLAP,
  zIndex: 20,
  elevation: 3,
} as const;
const PAGE_HERO_IDENTITY_STYLE = {
  paddingTop: PAGE_HERO_IDENTITY_TOP_PADDING,
} as const;

function formatCount(value?: number) {
  const safeValue = value ?? 0;
  if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}M`;
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}K`;
  return String(safeValue);
}

function formatTime(timestamp?: number) {
  if (!timestamp) return 'Vừa xong';
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày`;
  return new Date(timestamp * 1000).toLocaleDateString('vi-VN');
}

function PageImageFallback({ size = 52 }: { size?: number }) {
  return (
    <View
      className="items-center justify-center rounded-full bg-brand-soft"
      style={{ width: size, height: size }}
    >
      <Flag size={Math.max(20, size * 0.45)} color={APP_BRAND_COLOR} />
    </View>
  );
}

function PageAvatar({ page, size = 86 }: { page: PagesItem; size?: number }) {
  if (page.avatar) {
    return (
      <Image
        source={{ uri: page.avatar }}
        className="rounded-full border-4 border-white bg-white"
        style={{ width: size, height: size }}
        resizeMode="cover"
      />
    );
  }

  return <PageImageFallback size={size} />;
}

function UserAvatar({ user, size = 48 }: { user: PageUser; size?: number }) {
  if (user.avatarUrl) {
    return (
      <Image
        source={{ uri: user.avatarUrl }}
        className="rounded-full bg-slate-100"
        style={{ width: size, height: size }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full bg-slate-100"
      style={{ width: size, height: size }}
    >
      <Users size={Math.max(18, size * 0.42)} color="#64748B" />
    </View>
  );
}

function HeroActionButton({
  icon,
  label,
  onPress,
  disabled,
  variant = 'secondary',
  className = 'flex-1',
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'active';
  className?: string;
}) {
  const surfaceClass =
    variant === 'primary'
      ? 'border-brand bg-brand'
      : variant === 'active'
      ? 'border-brand-border bg-brand-subtle'
      : 'border-slate-200 bg-white';
  const textClass =
    variant === 'primary'
      ? 'text-white'
      : variant === 'active'
      ? 'text-brand'
      : 'text-slate-700';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      className={`${className} min-h-12 flex-row items-center justify-center rounded-2xl border px-3 ${surfaceClass} ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      {icon}
      <Text className={`ml-2 text-sm font-bold ${textClass}`} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View className="items-center flex-1">
      <Text className="text-lg font-extrabold text-slate-900">{value}</Text>
      <Text className="mt-0.5 text-xs font-medium text-slate-500">{label}</Text>
    </View>
  );
}

function PageHero({
  page,
  isActionLoading,
  onInvite,
  onLike,
  onFollow,
  onShare,
  canManagePage,
  onCreateJob,
  onOpenOffers,
  onEditPage,
  onChangeAvatar,
  onChangeCover,
  onViewAvatar,
  onViewCover,
  isUploadingAvatar = false,
  isUploadingCover = false,
  onBack,
  onMore,
  copy,
}: {
  page: PagesItem;
  isActionLoading: boolean;
  onInvite: () => void;
  onLike: () => void;
  onFollow: () => void;
  onShare: () => void;
  canManagePage?: boolean;
  onCreateJob?: () => void;
  onOpenOffers?: () => void;
  onEditPage?: () => void;
  onChangeAvatar?: () => void;
  onChangeCover?: () => void;
  onViewAvatar?: () => void;
  onViewCover?: () => void;
  isUploadingAvatar?: boolean;
  isUploadingCover?: boolean;
  /** Back + More handlers — placed ON the cover image so they ride
   *  with it as the user scrolls the page timeline. */
  onBack?: () => void;
  onMore?: () => void;
  copy: any;
}) {
  const title = page.pageTitle || page.pageName || copy.defaultTitle;
  const handle = page.pageName ? `@${page.pageName}` : '';
  // We honour the safe-area inset for the header buttons so they sit
  // just below the status bar / camera notch, regardless of device.
  const insets = useSafeAreaInsets();
  const navigationButtonTop = Math.max(12, Math.min(insets.top, 18));

  return (
    <View className="surface-base pb-1">
      {/* Cover Image Container — relative so the floating Back/More
          buttons below can position themselves over the image. They
          ride with the cover as the user scrolls (this is intentional
          per the design brief: "the two buttons should follow the
          cover, not stay pinned at the very top"). */}
      <View
        className="relative w-full overflow-hidden bg-slate-100"
        style={{ aspectRatio: PROFILE_COVER_ASPECT_RATIO }}
      >
        {page.cover ? (
          <TouchableOpacity
            accessibilityRole="imagebutton"
            accessibilityLabel={copy.viewCoverBtn}
            activeOpacity={0.96}
            className="absolute inset-0"
            style={{ zIndex: 0 }}
            disabled={!onViewCover}
            onPress={onViewCover}
          >
            <Image
              source={{ uri: page.cover }}
              className="h-full w-full"
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : (
          <View className="h-full w-full items-center justify-center bg-brand-subtle">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-white/80">
              <Flag size={38} color={APP_BRAND_COLOR} />
            </View>
          </View>
        )}

        {onBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={copy.backBtn || 'Quay lại'}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="absolute left-4 h-9 w-9 items-center justify-center rounded-full bg-white"
            style={{ top: navigationButtonTop }}
            onPress={onBack}
          >
            <ArrowLeft
              size={18}
              color={APP_COLORS.neutral.text}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        ) : null}

        {onMore ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={copy.moreBtn || 'Tùy chọn trang'}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="absolute right-4 h-9 w-9 items-center justify-center rounded-full bg-white"
            style={{ top: navigationButtonTop }}
            onPress={onMore}
          >
            <MoreHorizontal
              size={19}
              color={APP_COLORS.neutral.text}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        ) : null}

        {isUploadingCover ? (
          <View className="absolute inset-0 items-center justify-center bg-black/30">
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : null}

        {canManagePage && onChangeCover ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={copy.changeCoverBtn}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="absolute bottom-3 right-4 min-h-10 max-w-[58%] flex-row items-center justify-center rounded-full bg-[#E4E6EB] px-3.5 py-2"
            style={{ zIndex: 30, elevation: 8 }}
            disabled={isUploadingCover}
            onPress={onChangeCover}
          >
            {isUploadingCover ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Camera size={14} color="#050505" />
            )}
            <Text
              className="ml-1.5 min-w-0 flex-shrink text-[13px] font-bold text-[#050505]"
              numberOfLines={1}
              maxFontSizeMultiplier={1.1}
            >
              {copy.changeCoverBtn}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Page Content Detail */}
      <Animated.View
        entering={FadeInDown.delay(40).duration(400)}
        className="relative overflow-visible border-y border-[#dddfe2] bg-white px-4 pb-5"
        style={{ zIndex: 10, elevation: 2 }}
        pointerEvents="box-none"
      >
        <View
          className="relative flex-row items-start"
          style={PAGE_HERO_AVATAR_ROW_STYLE}
          pointerEvents="box-none"
        >
          <View className="relative z-20">
            <TouchableOpacity
              accessibilityRole="imagebutton"
              accessibilityLabel={copy.viewAvatarBtn}
              activeOpacity={0.9}
              className="rounded-full"
              disabled={!page.avatar || !onViewAvatar}
              onPress={onViewAvatar}
            >
              <PageAvatar page={page} size={PAGE_HERO_AVATAR_SIZE} />
            </TouchableOpacity>
            {isUploadingAvatar ? (
              <View className="absolute inset-0 items-center justify-center rounded-full bg-black/30">
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : null}
            {canManagePage && onChangeAvatar ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={copy.changeAvatarBtn}
                activeOpacity={0.82}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="absolute bottom-0 right-0 h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white bg-[#E4E6EB]"
                disabled={isUploadingAvatar}
                onPress={onChangeAvatar}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Camera size={14} color="#050505" />
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          <Animated.View
            entering={FadeInDown.delay(50).duration(400)}
            className="ml-3.5 min-w-0 flex-1 pr-0.5"
            style={PAGE_HERO_IDENTITY_STYLE}
            pointerEvents="box-none"
          >
            <View className="flex-row items-center">
              <Text
                className="flex-shrink text-[22px] font-extrabold text-[#050505]"
                numberOfLines={2}
              >
                {title}
              </Text>
              {page.mapPinApproved ? (
                <BadgeCheck
                  size={20}
                  color={APP_BRAND_COLOR}
                  fill={APP_BRAND_COLOR}
                  className="ml-1"
                />
              ) : null}
            </View>
            {handle ? (
              <Text
                className="mt-1 text-sm font-medium text-slate-500"
                numberOfLines={1}
              >
                {handle}
              </Text>
            ) : null}
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(90).duration(400)}>
          <View className="mt-2.5 flex-row items-center border-y border-slate-100 py-3">
            <Metric value={formatCount(page.likes)} label={copy.likesLabel} />
            <View className="h-8 w-px bg-slate-200" />
            <Metric
              value={formatCount(page.followersCount)}
              label={copy.followersLabel}
            />
            <View className="h-8 w-px bg-slate-200" />
            <Metric
              value={formatCount(page.postCount)}
              label={copy.postsLabel}
            />
          </View>
        </Animated.View>

        {canManagePage ? (
          <Animated.View
            entering={FadeInDown.delay(140).duration(400)}
            className="mt-4"
          >
            <View className="flex-row gap-2">
              <HeroActionButton
                icon={<Edit3 size={18} color={APP_COLORS.brand.onPrimary} />}
                label={copy.editBtn}
                variant="primary"
                onPress={onEditPage || (() => {})}
              />
              <HeroActionButton
                icon={<Share2 size={18} color={APP_COLORS.neutral.textMuted} />}
                label={copy.shareBtn}
                onPress={onShare}
              />
            </View>
            <View className="mt-2 flex-row gap-2">
              <HeroActionButton
                icon={<Briefcase size={18} color={APP_COLORS.status.success} />}
                label={copy.createJobBtn}
                onPress={onCreateJob || (() => {})}
              />
              <HeroActionButton
                icon={<Gift size={18} color={APP_COLORS.status.info} />}
                label={copy.offersBtn}
                onPress={onOpenOffers || (() => {})}
              />
            </View>
          </Animated.View>
        ) : null}

        {!canManagePage ? (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View className="mt-4 flex-row gap-2">
              <HeroActionButton
                label={page.isLiked ? copy.likedBtn : copy.likeBtn}
                icon={
                  page.isLiked ? (
                    <Heart
                      size={20}
                      color={APP_BRAND_COLOR}
                      fill={APP_BRAND_COLOR}
                    />
                  ) : (
                    <Heart size={20} color={APP_COLORS.neutral.textMuted} />
                  )
                }
                variant={page.isLiked ? 'active' : 'secondary'}
                disabled={isActionLoading}
                onPress={onLike}
              />
              <HeroActionButton
                label={page.isFollowing ? copy.followingBtn : copy.followBtn}
                icon={
                  page.isFollowing ? (
                    <Bell
                      size={20}
                      color={APP_BRAND_COLOR}
                      fill={APP_BRAND_COLOR}
                    />
                  ) : (
                    <Bell size={20} color={APP_COLORS.brand.onPrimary} />
                  )
                }
                variant={page.isFollowing ? 'active' : 'primary'}
                disabled={isActionLoading}
                onPress={onFollow}
              />
            </View>
            <View className="mt-2 flex-row gap-2">
              <HeroActionButton
                label={copy.inviteBtn}
                icon={
                  <UserPlus size={20} color={APP_COLORS.neutral.textMuted} />
                }
                onPress={onInvite}
              />
              <HeroActionButton
                label={copy.shareBtn}
                icon={<Share2 size={20} color={APP_COLORS.neutral.textMuted} />}
                onPress={onShare}
              />
            </View>
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}
function PostSearchBox({
  value,
  placeholder,
  activeTab,
  allCount,
  photoCount,
  allLabel,
  photoLabel,
  postsLabel,
  clearLabel,
  onChangeText,
  onChangeTab,
}: {
  value: string;
  placeholder: string;
  activeTab: 'all' | 'photos';
  allCount: number;
  photoCount: number;
  allLabel: string;
  photoLabel: string;
  postsLabel: string;
  clearLabel: string;
  onChangeText: (text: string) => void;
  onChangeTab: (tab: 'all' | 'photos') => void;
}) {
  return (
    <View className="mb-2 mt-2 border-y border-[#dddfe2] bg-white p-3">
      <View className="mb-3 flex-row items-center justify-between px-1">
        <Text className="text-title-primary text-slate-900">{postsLabel}</Text>
        <View className="rounded-full bg-slate-100 px-2.5 py-1">
          <Text className="text-xs font-bold text-slate-500">
            {formatCount(activeTab === 'photos' ? photoCount : allCount)}
          </Text>
        </View>
      </View>

      <View className="input-shell min-h-12 flex-row items-center px-3">
        <Search size={19} color={APP_COLORS.neutral.iconMuted} />
        <TextInput
          className="ml-2 flex-1 py-2 text-sm text-slate-900"
          value={value}
          placeholder={placeholder}
          placeholderTextColor={APP_COLORS.neutral.iconMuted}
          returnKeyType="search"
          onChangeText={onChangeText}
        />
        {value ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={clearLabel}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
            onPress={() => onChangeText('')}
          >
            <X size={16} color={APP_COLORS.neutral.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="mt-3 flex-row gap-2">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'all' }}
          activeOpacity={0.8}
          className={`min-h-10 flex-1 flex-row items-center justify-center rounded-full border px-3 ${
            activeTab === 'all'
              ? 'border-brand bg-brand-subtle'
              : 'border-slate-200 bg-white'
          }`}
          onPress={() => onChangeTab('all')}
        >
          <FileText
            size={16}
            color={
              activeTab === 'all'
                ? APP_BRAND_COLOR
                : APP_COLORS.neutral.textMuted
            }
          />
          <Text
            className={`ml-2 text-sm font-bold ${
              activeTab === 'all' ? 'text-brand' : 'text-slate-600'
            }`}
          >
            {allLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'photos' }}
          activeOpacity={0.8}
          className={`min-h-10 flex-1 flex-row items-center justify-center rounded-full border px-3 ${
            activeTab === 'photos'
              ? 'border-brand bg-brand-subtle'
              : 'border-slate-200 bg-white'
          }`}
          onPress={() => onChangeTab('photos')}
        >
          <Camera
            size={16}
            color={
              activeTab === 'photos'
                ? APP_BRAND_COLOR
                : APP_COLORS.neutral.textMuted
            }
          />
          <Text
            className={`ml-2 text-sm font-bold ${
              activeTab === 'photos' ? 'text-brand' : 'text-slate-600'
            }`}
          >
            {photoLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const PAGE_CATEGORY_LABELS: Record<string, string> = {
  '1': 'Ô tô và Xe cộ',
  '2': 'Hài kịch',
  '3': 'Kinh tế và Thương mại',
  '4': 'Giáo dục',
  '5': 'Giải trí',
  '6': 'Phim & Hoạt hình',
  '7': 'Khoa học và Công nghệ',
  '8': 'Cách sống',
  '9': 'Du lịch và Sự kiện',
  '10': 'Thời trang',
  '11': 'Thể thao',
};

function getPageCategoryLabel(page: PagesItem) {
  return (
    PAGE_CATEGORY_LABELS[page.pageCategory || ''] || page.pageCategory || ''
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View className="flex-row items-center border-b border-slate-100 bg-white px-4 py-3">
      <View className="mr-2 h-6 w-6 items-center justify-center rounded-full bg-brand">
        {icon}
      </View>
      <Text className="text-base font-bold text-slate-900">{title}</Text>
    </View>
  );
}

function InvitePageRow({
  label,
  hint,
  onPress,
}: {
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      className="mt-2 min-h-16 flex-row items-center border-y border-[#dddfe2] bg-white px-4 py-3"
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View className="icon-chip h-10 w-10 items-center justify-center">
        <UserPlus size={19} color={APP_BRAND_COLOR} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-title-primary text-slate-900">{label}</Text>
        <Text className="mt-0.5 text-caption-secondary">{hint}</Text>
      </View>
      <ChevronRight size={20} color={APP_COLORS.neutral.iconMuted} />
    </TouchableOpacity>
  );
}

function InfoRow({
  icon,
  label,
  trailing,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      {icon}
      <Text className="ml-3 flex-1 text-body-primary">{label}</Text>
      {trailing}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        className="flex-row items-center border-b border-slate-100 bg-white px-4 py-3"
        activeOpacity={0.85}
        onPress={onPress}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-row items-center border-b border-slate-100 bg-white px-4 py-3">
      {content}
    </View>
  );
}

function PageInfoSections({
  page,
  copy,
  onOpenOffers,
  onCreateJob,
}: {
  page: PagesItem;
  copy: typeof PAGE_DETAIL_UI_COPY.vi;
  onOpenOffers: () => void;
  onCreateJob: () => void;
}) {
  const categoryLabel = getPageCategoryLabel(page);

  return (
    <View className="mt-3">
      <SectionHeader
        icon={<FileText size={14} color="#FFFFFF" />}
        title={copy.infoTitle}
      />
      <View className="bg-white">
        <InfoRow
          icon={<ThumbsUp size={18} color="#64748B" fill="#64748B" />}
          label={`${formatCount(page.likes)} những người như thế này`}
          trailing={
            <Text className="text-sm font-semibold text-green-600">
              {copy.weekDelta}
            </Text>
          }
        />
        <InfoRow
          icon={<FileText size={18} color="#64748B" />}
          label={`${formatCount(page.postCount)} bài viết`}
        />
        <InfoRow
          icon={<Briefcase size={18} color="#64748B" />}
          label="Việc làm"
          onPress={onCreateJob}
        />
        <InfoRow
          icon={<Gift size={18} color="#64748B" />}
          label="Lời đề nghị"
          onPress={onOpenOffers}
        />
        {categoryLabel ? (
          <InfoRow
            icon={<Tag size={18} color="#64748B" />}
            label={categoryLabel}
          />
        ) : null}
        {page.address ? (
          <InfoRow
            icon={<MapPin size={18} color="#64748B" />}
            label={page.address}
          />
        ) : null}
      </View>

      <View className="mt-3">
        <SectionHeader
          icon={<Flag size={14} color="#FFFFFF" />}
          title={copy.aboutTitle}
        />
        <Text className="bg-white px-4 py-4 text-sm leading-6 text-slate-700">
          {page.pageDescription ||
            page.pageTitle ||
            page.pageName ||
            copy.defaultTitle}
        </Text>
      </View>
    </View>
  );
}

function SuggestedPagesSection({
  pages,
  copy,
  onOpenPage,
  onLikePage,
  onFollowPage,
}: {
  pages: PagesItem[];
  copy: typeof PAGE_DETAIL_UI_COPY.vi;
  onOpenPage: (page: PagesItem) => void;
  onLikePage: (pageId: string | number) => void;
  onFollowPage: (pageId: string | number) => void;
}) {
  if (pages.length === 0) return null;

  return (
    <View className="mt-3 bg-white pb-3">
      <SectionHeader
        icon={<Flag size={14} color="#FFFFFF" />}
        title={copy.suggestedTitle}
      />
      {pages.map(page => {
        const categoryLabel = getPageCategoryLabel(page);
        return (
          <View
            key={String(page.pageId || page.id)}
            className="border-b border-slate-100 pb-3"
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onOpenPage(page)}
            >
              <View className="h-28 bg-slate-200">
                {page.cover ? (
                  <Image
                    source={{ uri: page.cover }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : null}
              </View>
              <View className="flex-row px-4 pt-3">
                <PageAvatar page={page} size={42} />
                <View className="ml-3 flex-1">
                  <Text
                    className="text-sm font-bold text-slate-900"
                    numberOfLines={1}
                  >
                    {page.pageTitle || page.pageName || copy.defaultTitle}
                  </Text>
                  {categoryLabel ? (
                    <Text
                      className="mt-0.5 text-xs text-slate-500"
                      numberOfLines={1}
                    >
                      {categoryLabel}
                    </Text>
                  ) : null}
                  <Text className="mt-1 text-xs text-slate-500">
                    {formatCount(page.likes)} những người như thế này
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            <View className="mx-4 mt-3 flex-row gap-2">
              <TouchableOpacity
                className={`flex-1 h-10 flex-row items-center justify-center rounded-lg ${
                  page.isLiked ? 'bg-brand-subtle' : 'bg-brand'
                }`}
                activeOpacity={0.86}
                onPress={() => onLikePage(page.pageId)}
              >
                <Heart
                  size={16}
                  color={page.isLiked ? APP_BRAND_COLOR : '#FFFFFF'}
                  fill={page.isLiked ? APP_BRAND_COLOR : 'transparent'}
                />
                <Text
                  className={`ml-1 text-sm font-bold ${
                    page.isLiked ? 'text-brand' : 'text-white'
                  }`}
                >
                  {page.isLiked ? copy.likedBtn : copy.likeBtn}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 h-10 flex-row items-center justify-center rounded-lg ${
                  page.isFollowing ? 'bg-brand-subtle' : 'bg-slate-100'
                }`}
                activeOpacity={0.86}
                onPress={() => onFollowPage(page.pageId)}
              >
                <Bell
                  size={16}
                  color={page.isFollowing ? APP_BRAND_COLOR : '#64748B'}
                  fill={page.isFollowing ? APP_BRAND_COLOR : 'transparent'}
                />
                <Text
                  className={`ml-1 text-sm font-bold ${
                    page.isFollowing ? 'text-brand' : 'text-slate-600'
                  }`}
                >
                  {page.isFollowing ? copy.followingBtn : copy.followBtn}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AboutTab({ page }: { page: PagesItem }) {
  return (
    <View className="gap-3 px-4 py-4">
      {page.pageDescription ? (
        <InfoRow
          icon={<Flag size={20} color={APP_BRAND_COLOR} />}
          label={page.pageDescription}
        />
      ) : null}
      {page.pageCategory ? (
        <InfoRow
          icon={<BadgeCheck size={20} color="#475569" />}
          label={page.pageCategory}
        />
      ) : null}
      {page.address ? (
        <InfoRow
          icon={<MapPin size={20} color="#475569" />}
          label={page.address}
        />
      ) : null}
      {page.url ? (
        <InfoRow icon={<Globe2 size={20} color="#475569" />} label={page.url} />
      ) : null}
      {!page.pageDescription &&
      !page.pageCategory &&
      !page.address &&
      !page.url ? (
        <Text className="rounded-2xl bg-white px-4 py-6 text-center text-body-secondary">
          Trang này chưa có thông tin giới thiệu.
        </Text>
      ) : null}
    </View>
  );
}

function UserRow({
  user,
  trailing,
}: {
  user: PageUser;
  trailing?: React.ReactNode;
}) {
  const roleLabel =
    user.role === 'owner'
      ? 'Chủ sở hữu'
      : user.role === 'admin'
      ? 'Quản trị viên'
      : '';

  return (
    <View className="flex-row items-center border-b border-slate-100 bg-white px-4 py-3">
      <UserAvatar user={user} />
      <View className="ml-3 flex-1">
        <Text className="text-title-primary" numberOfLines={1}>
          {user.name}
        </Text>
        {roleLabel ? (
          <Text className="mt-0.5 text-caption-secondary" numberOfLines={1}>
            {roleLabel}
            {user.username ? ` · @${user.username}` : ''}
          </Text>
        ) : user.username ? (
          <Text className="mt-0.5 text-caption-secondary" numberOfLines={1}>
            @{user.username}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

function UsersTab({ title, users }: { title: string; users: PageUser[] }) {
  if (users.length === 0) {
    return (
      <View className="px-4 py-5">
        <Text className="rounded-2xl bg-white px-4 py-6 text-center text-body-secondary">
          Chưa có dữ liệu {title.toLowerCase()}.
        </Text>
      </View>
    );
  }

  return (
    <View className="py-4">
      <Text className="mb-2 px-4 text-caption-secondary">
        {users.length} {title.toLowerCase()}
      </Text>
      <View className="overflow-hidden bg-white">
        {users.map(user => (
          <UserRow key={user.id} user={user} />
        ))}
      </View>
    </View>
  );
}

function RateBox({
  disabled,
  onSubmit,
}: {
  disabled?: boolean;
  onSubmit: (rating: number, text: string) => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await onSubmit(rating, text.trim() || 'Đánh giá từ ứng dụng');
      setText('');
      Alert.alert('Đã gửi', 'Đánh giá của bạn đã được gửi.');
    } catch (err) {
      Alert.alert(
        'Không gửi được',
        err instanceof Error ? err.message : 'Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, rating, text]);

  return (
    <View className="mx-4 mt-4 rounded-2xl bg-white p-4">
      <Text className="text-title-primary">Đánh giá trang</Text>
      <View className="mt-3 flex-row">
        {[1, 2, 3, 4, 5].map(value => (
          <TouchableOpacity
            key={value}
            className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-slate-100"
            activeOpacity={0.8}
            disabled={disabled || submitting}
            onPress={() => setRating(value)}
          >
            <Star
              size={22}
              color="#F59E0B"
              fill={value <= rating ? '#F59E0B' : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        className="mt-3 min-h-[78px] rounded-2xl border border-slate-200 px-4 py-3 text-body-primary"
        placeholder="Viết cảm nhận của bạn..."
        placeholderTextColor="#94A3B8"
        multiline
        value={text}
        onChangeText={setText}
        editable={!disabled && !submitting}
      />
      <TouchableOpacity
        className="mt-3 min-h-[42px] flex-row items-center justify-center rounded-xl bg-brand"
        activeOpacity={0.85}
        disabled={disabled || submitting}
        onPress={handleSubmit}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Send size={17} color="#FFFFFF" />
            <Text className="ml-2 text-title-primary text-white">
              Gửi đánh giá
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function ReviewRow({ review }: { review: PageReview }) {
  return (
    <View className="border-b border-slate-100 bg-white px-4 py-4">
      <View className="flex-row items-center">
        {review.user ? <UserAvatar user={review.user} size={42} /> : null}
        <View className="ml-3 flex-1">
          <Text className="text-title-primary" numberOfLines={1}>
            {review.user?.name ?? 'Người dùng'}
          </Text>
          <Text className="text-caption-secondary">
            {formatTime(review.postedAt)}
          </Text>
        </View>
        <View className="flex-row items-center rounded-full bg-amber-50 px-2 py-1">
          <Star size={14} color="#F59E0B" fill="#F59E0B" />
          <Text className="ml-1 text-caption-primary text-amber-700">
            {review.rating || 0}
          </Text>
        </View>
      </View>
      {review.text ? (
        <Text className="mt-3 text-body-primary">{review.text}</Text>
      ) : null}
    </View>
  );
}

function ReviewsTab({
  reviews,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onRate,
}: {
  reviews: PageReview[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onRate: (rating: number, text: string) => Promise<void>;
}) {
  return (
    <View className="pb-6">
      <RateBox onSubmit={onRate} />
      {reviews.length === 0 ? (
        <View className="px-4 py-5">
          <Text className="rounded-2xl bg-white px-4 py-6 text-center text-body-secondary">
            Chưa có đánh giá nào.
          </Text>
        </View>
      ) : (
        <View className="mt-4 overflow-hidden bg-white">
          {reviews.map(review => (
            <ReviewRow key={review.id} review={review} />
          ))}
        </View>
      )}
      {hasMore ? (
        <TouchableOpacity
          className="mx-4 mt-4 min-h-[44px] items-center justify-center rounded-xl bg-white"
          activeOpacity={0.8}
          disabled={isLoadingMore}
          onPress={onLoadMore}
        >
          {isLoadingMore ? (
            <ActivityIndicator color={APP_BRAND_COLOR} />
          ) : (
            <Text className="text-title-primary text-brand">
              Tải thêm đánh giá
            </Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function PostImageGrid({
  post,
  onOpen,
}: {
  post: FeedTextPost;
  onOpen: () => void;
}) {
  if (post.photos.length === 0) return null;

  const photos = post.photos.slice(0, 4);
  return (
    <TouchableOpacity
      className="mt-3 flex-row flex-wrap overflow-hidden bg-slate-100"
      activeOpacity={0.92}
      onPress={onOpen}
    >
      {photos.map((url, index) => (
        <View
          key={`${url}-${index}`}
          style={{
            width: photos.length === 1 ? '100%' : '50%',
            height: photos.length === 1 ? 260 : 150,
            padding: 1,
          }}
        >
          <Image
            source={{ uri: url }}
            className="h-full w-full bg-slate-200"
            resizeMode="cover"
          />
          {index === 3 && post.photos.length > 4 ? (
            <View className="absolute inset-0 items-center justify-center bg-black/50">
              <Text className="text-2xl font-bold text-white">
                +{post.photos.length - 4}
              </Text>
            </View>
          ) : null}
        </View>
      ))}
    </TouchableOpacity>
  );
}

function VideoPreview({
  post,
  onOpen,
}: {
  post: FeedVideoPost;
  onOpen: () => void;
}) {
  return (
    <TouchableOpacity
      className="mt-3 h-56 items-center justify-center bg-black"
      activeOpacity={0.9}
      onPress={onOpen}
    >
      {post.thumbnailUrl ? (
        <Image
          source={{ uri: post.thumbnailUrl }}
          className="absolute h-full w-full"
          resizeMode="cover"
        />
      ) : null}
      <View className="h-16 w-16 items-center justify-center rounded-full bg-black/60">
        <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

function PollPreview({ post }: { post: FeedPollPost }) {
  return (
    <View className="mt-3 gap-2">
      {post.options.slice(0, 4).map(option => (
        <View key={option.id} className="rounded-2xl bg-slate-100 px-4 py-3">
          <View
            className="absolute bottom-0 left-0 top-0 rounded-2xl bg-brand-soft"
            style={{ width: `${Math.min(100, option.percentageNum)}%` }}
          />
          <View className="flex-row items-center">
            <Text className="flex-1 text-body-primary">{option.text}</Text>
            <Text className="text-caption-primary">{option.percentage}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function PagePostCard({
  post,
  onOpen,
}: {
  post: FeedPost;
  onOpen: (post: FeedPost) => void;
}) {
  if (post.kind !== 'text' && post.kind !== 'video' && post.kind !== 'poll') {
    return null;
  }

  const caption = post.caption;
  const publisher = post.publisher;

  return (
    <TouchableOpacity
      className="mb-2 bg-white"
      activeOpacity={0.95}
      onPress={() => onOpen(post)}
    >
      <View className="px-4 py-3">
        <View className="flex-row items-center">
          {publisher.avatarUrl ? (
            <Image
              source={{ uri: publisher.avatarUrl }}
              className="h-11 w-11 rounded-full bg-slate-100"
              resizeMode="cover"
            />
          ) : (
            <PageImageFallback size={44} />
          )}
          <View className="ml-3 flex-1">
            <Text className="text-title-primary" numberOfLines={1}>
              {publisher.name}
            </Text>
            <Text className="text-caption-secondary">
              {formatTime(post.postedAt)} · Công khai
            </Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </View>

        {caption ? (
          <Text className="mt-3 text-body-primary">{caption}</Text>
        ) : null}

        {post.kind === 'text' ? (
          <PostImageGrid post={post} onOpen={() => onOpen(post)} />
        ) : null}
        {post.kind === 'video' ? (
          <VideoPreview post={post} onOpen={() => onOpen(post)} />
        ) : null}
        {post.kind === 'poll' ? <PollPreview post={post} /> : null}

        <View className="mt-3 flex-row items-center border-t border-slate-100 pt-3">
          <Heart size={17} color="#EF4444" />
          <Text className="ml-1 flex-1 text-caption-secondary">
            {formatCount(post.likeCount)}
          </Text>
          <MessageCircle size={17} color="#64748B" />
          <Text className="ml-1 text-caption-secondary">
            {formatCount(post.commentCount)} bình luận
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function InviteModal({
  visible,
  users,
  invitedUserIds,
  isLoading,
  onClose,
  onInvite,
}: {
  visible: boolean;
  users: PageUser[];
  invitedUserIds: Set<string>;
  isLoading: boolean;
  onClose: () => void;
  onInvite: (userId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter(user => {
      return (
        user.name.toLowerCase().includes(normalized) ||
        user.username.toLowerCase().includes(normalized)
      );
    });
  }, [query, users]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setBusyUserId(null);
    }
  }, [visible]);

  const handleInvite = useCallback(
    async (userId: string) => {
      setBusyUserId(userId);
      try {
        await onInvite(userId);
      } catch (err) {
        Alert.alert(
          'Không gửi được lời mời',
          err instanceof Error ? err.message : 'Vui lòng thử lại.',
        );
      } finally {
        setBusyUserId(null);
      }
    },
    [onInvite],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/35"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[82%] rounded-t-[28px] bg-white px-4 pb-5 pt-4">
          <View className="flex-row items-center">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-slate-950">
                Mời theo dõi trang
              </Text>
              <Text className="mt-1 text-body-secondary">
                Chọn bạn bè để gửi lời mời.
              </Text>
            </View>
            <TouchableOpacity
              className="h-11 w-11 items-center justify-center rounded-full bg-slate-100"
              activeOpacity={0.8}
              onPress={onClose}
            >
              <X size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View className="mt-4 flex-row items-center rounded-2xl bg-slate-100 px-4">
            <Search size={20} color="#64748B" />
            <TextInput
              className="ml-3 h-12 flex-1 text-body-primary"
              placeholder="Tìm người dùng..."
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {isLoading ? (
            <View className="h-52 items-center justify-center">
              <ActivityIndicator color={APP_BRAND_COLOR} />
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={item => item.id}
              className="mt-3"
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text className="py-12 text-center text-body-secondary">
                  Không có người dùng phù hợp.
                </Text>
              }
              renderItem={({ item }) => {
                const invited = invitedUserIds.has(item.id);
                return (
                  <UserRow
                    user={item}
                    trailing={
                      <TouchableOpacity
                        className={`min-h-[36px] min-w-[78px] items-center justify-center rounded-full px-3 ${
                          invited ? 'bg-slate-100' : 'bg-brand'
                        }`}
                        activeOpacity={0.85}
                        disabled={invited || busyUserId === item.id}
                        onPress={() => handleInvite(item.id)}
                      >
                        {busyUserId === item.id ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text
                            className={`text-caption-primary ${
                              invited ? 'text-slate-500' : 'text-white'
                            }`}
                          >
                            {invited ? 'Đã mời' : 'Mời'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    }
                  />
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PageDetailScreen({ navigation, route }: PageDetailProps) {
  const editSheetBottomPadding = useSafeBottomPadding(24);
  const vm = usePageDetailViewModel(route.params.page);
  const isFocused = useIsFocused();
  const didFocusRef = useRef(false);
  const createPostNavigationInFlightRef = useRef(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  // Page-share modal — separate from `inviteVisible` so the offers
  // work happening in this file (and any other modal work) can
  // mount and unmount freely without colliding with the share state.
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [postShareVisible, setPostShareVisible] = useState(false);
  const [sharingPost, setSharingPost] = useState<FeedPost | undefined>();
  const [postMenuVisible, setPostMenuVisible] = useState(false);
  const [selectedPostForMenu, setSelectedPostForMenu] =
    useState<FeedPost | null>(null);
  const [editingPost, setEditingPost] = useState<
    FeedTextPost | FeedVideoPost | FeedPollPost | null
  >(null);
  const [editPostText, setEditPostText] = useState('');
  const [editPostError, setEditPostError] = useState<string | null>(null);
  const [isSavingEditedPost, setIsSavingEditedPost] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState<{
    postId: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (isFocused) {
      createPostNavigationInFlightRef.current = false;
    }
  }, [isFocused]);
  const [activeVideoPostId, setActiveVideoPostId] = useState<string | null>(
    null,
  );
  const [realtimeVisiblePostIds, setRealtimeVisiblePostIds] = useState<
    string[]
  >([]);
  // Photo viewer modal — mirrors Feed / Profile. Opens when the user
  // taps any photo inside a page post so the page is consistent with
  // the global viewer (swipe, progress, reaction, comment).
  const [photoViewer, setPhotoViewer] = useState<PhotoViewerState>(null);
  const [pageCropRequest, setPageCropRequest] = useState<{
    target: ImageCropTarget;
    image: CropSourceImage;
  } | null>(null);
  const [pageMediaViewer, setPageMediaViewer] =
    useState<PageMediaKind | null>(null);
  const openingPhotoViewerRef = useRef(false);
  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const hasDragged = useSharedValue(false);
  const currentUserId = sessionStorage.getSession()?.userId;
  const adminInfo =
    vm.page.adminInfo && typeof vm.page.adminInfo === 'object'
      ? (vm.page.adminInfo as Record<string, unknown>)
      : null;
  const isPageOwner = Boolean(
    currentUserId &&
      vm.page.ownerId &&
      String(currentUserId) === String(vm.page.ownerId),
  );
  const canManagePage =
    isPageOwner || Boolean(adminInfo && Object.keys(adminInfo).length > 0);
  const commentAsPage = useMemo(
    () =>
      isPageOwner && vm.page.pageId
        ? {
            pageId: String(vm.page.pageId),
            publisher: {
              userId: String(vm.page.ownerId || currentUserId || '0'),
              username: vm.page.pageName || '',
              name: vm.page.pageTitle || vm.page.pageName || '',
              avatarUrl: vm.page.avatar || undefined,
              entityType: 'page' as const,
              pageId: String(vm.page.pageId),
              isVerified: Boolean(vm.page.verified),
            },
          }
        : undefined,
    [
      currentUserId,
      isPageOwner,
      vm.page.avatar,
      vm.page.ownerId,
      vm.page.pageId,
      vm.page.pageName,
      vm.page.pageTitle,
      vm.page.verified,
    ],
  );
  const commentVm = useFeedCommentsViewModel({
    onCommentCountChange: vm.updatePostCommentCount,
    commentAsPage,
  });
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
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item?: FeedPost }> }) => {
      const visiblePostIds = viewableItems
        .map(entry => String(entry.item?.id ?? ''))
        .filter(postId => /^[1-9][0-9]*$/.test(postId));
      setRealtimeVisiblePostIds(previous => {
        const next = Array.from(new Set(visiblePostIds)).slice(0, 50);
        return previous.join(',') === next.join(',') ? previous : next;
      });
      const nextVideo = viewableItems.find(
        entry => entry.item?.kind === 'video',
      )?.item;
      setActiveVideoPostId(prev =>
        prev === nextVideo?.id ? prev : nextVideo?.id ?? null,
      );
    },
  ).current;
  usePostRealtimeScope({
    postIds: realtimeVisiblePostIds,
    posts: vm.posts,
    enabled: isFocused,
    onSnapshot: vm.applyRealtimePost,
    onDeleted: vm.removeRealtimePost,
    onCommentMutation: change => {
      if (String(commentVm.selectedCommentPostId) === change.postId) {
        void commentVm.refreshComments();
      }
    },
  });
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 160,
  }).current;
  const language = useAppLanguage();
  const copy = PAGE_DETAIL_UI_COPY[language] || PAGE_DETAIL_UI_COPY.vi;
  const postCardCopy = POST_CARD_COPY[language];
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (inviteVisible) {
      void vm.loadInviteCandidates();
    }
  }, [inviteVisible, vm.loadInviteCandidates]);

  useFocusEffect(
    useCallback(() => {
      if (didFocusRef.current) {
        void vm.refresh();
      }
      didFocusRef.current = true;
    }, [vm.refresh]),
  );

  const handleOpenPost = useCallback(
    (post: FeedPost) => {
      navigation.navigate(ROUTES.POST_DETAIL, {
        postId: post.id,
        post,
      });
    },
    [navigation],
  );

  const handleNavigateToProfile = useCallback(
    (userId: string) => {
      if (!userId) return;
      navigateToUserProfile(navigation, userId);
    },
    [navigation],
  );

  const handleOpenReactionPicker = useCallback(
    (postId: string, x: number, y: number) => {
      setPickerAnchor({ postId, x, y });
    },
    [],
  );

  const handlePickReaction = useCallback(
    (reaction: ReactionType) => {
      if (!pickerAnchor) return;
      void vm.togglePostReaction(pickerAnchor.postId, reaction);
      setPickerAnchor(null);
    },
    [pickerAnchor, vm],
  );

  const handleOpenComments = useCallback(
    (postId: string) => {
      commentVm.openComments(postId);
    },
    [commentVm],
  );

  const handleRetryComments = useCallback(() => {
    if (commentVm.selectedCommentPostId) {
      commentVm.openComments(commentVm.selectedCommentPostId);
    }
  }, [commentVm]);

  const handleOpenPostShare = useCallback((post: FeedPost) => {
    if (!isFeedPostShareable(post)) return;
    setSharingPost(post);
    setPostShareVisible(true);
  }, []);

  const handleClosePostShare = useCallback(() => {
    setPostShareVisible(false);
    setTimeout(() => setSharingPost(undefined), 300);
  }, []);

  const handleInternalSharePost = useCallback(
    (input: SharePostInput) => vm.sharePost(input),
    [vm],
  );

  const handleInternalSharePage = useCallback(
    async (input: SharePageInput) => {
      const publicUrl = input.page.url?.trim();
      if (!publicUrl) {
        throw new Error('Trang này chưa có liên kết công khai.');
      }

      const pageTitle =
        input.page.pageTitle || input.page.pageName || 'Trang';
      const shareText = buildSharedPageMessage({
        url: publicUrl,
        pageTitle,
        note: input.text,
      });

      if (input.destination === 'message') {
        if (input.recipientGroupId) {
          await pageShareMessagesRepository.sendGroupMessage(
            String(input.recipientGroupId),
            shareText,
          );
          return;
        }
        if (input.recipientUserId) {
          await pageShareMessagesRepository.sendMessage(
            String(input.recipientUserId),
            shareText,
          );
          return;
        }
        throw new Error('Bạn chưa chọn người nhận để gửi trang.');
      }

      const pagePreviewDescription =
        input.page.pageDescription?.trim() ||
        [
          input.page.followersCount
            ? `${input.page.followersCount} người theo dõi`
            : undefined,
          input.page.postCount
            ? `${input.page.postCount} bài viết`
            : undefined,
        ]
          .filter(Boolean)
          .join(' · ') ||
        'Khám phá Trang trên VNSEEA';

      const draft = {
        text: input.text?.trim() || '',
        photos: [],
        privacy: 'public' as const,
        linkPreview: {
          url: buildSharedPageUrl(publicUrl),
          title: pageTitle,
          description: pagePreviewDescription,
          image: input.page.cover || input.page.avatar,
        },
        ...(input.destination === 'page' && input.pageId
          ? { pageId: String(input.pageId) }
          : {}),
        ...(input.destination === 'group' && input.groupId
          ? { groupId: String(input.groupId) }
          : {}),
      };

      await pageShareFeedRepository.createPost(draft);
    },
    [],
  );

  const handlePostShared = useCallback(() => {
    void vm.refresh();
  }, [vm]);

  const handlePhotoPress = useCallback(
    (post: FeedTextPost, photoIndex: number) => {
      // Debounce so the same tap can't open two viewers if the
      // card and the page-level gesture both fire. Mirrors the
      // guard in FeedScreen / ProfileScreen so behavior stays in sync.
      if (openingPhotoViewerRef.current) return;
      const total = post.photos?.length ?? 0;
      if (total <= 0) return;
      const safeIndex = Math.min(Math.max(photoIndex, 0), total - 1);
      openingPhotoViewerRef.current = true;
      setPhotoViewer({ post, initialIndex: safeIndex });
      setTimeout(() => {
        openingPhotoViewerRef.current = false;
      }, 300);
    },
    [],
  );

  const handleClosePhotoViewer = useCallback(() => {
    setPhotoViewer(null);
    openingPhotoViewerRef.current = false;
  }, []);

  const handlePhotoViewerCommentTap = useCallback(
    (postId: string) => {
      const post = vm.posts.find(item => item.id === postId);
      navigateToPostComments(navigation, postId, post);
    },
    [navigation, vm.posts],
  );

  // Open the shared Feed-style composer for page links.
  const handleShare = useCallback(() => {
    setShareSheetVisible(true);
  }, []);

  const handleCreatePost = useCallback((action?: any) => {
    const cleanAction = typeof action === 'string' ? action : undefined;

    if (cleanAction === 'product') {
      navigation.navigate(ROUTES.CREATE_PRODUCT);
      return;
    }
    if (cleanAction === 'job') {
      navigation.navigate(ROUTES.CREATE_JOB, {
        pageId: String(vm.page.pageId),
        pageName: vm.page.pageTitle || vm.page.pageName,
      });
      return;
    }

    if (createPostNavigationInFlightRef.current) return;
    createPostNavigationInFlightRef.current = true;

    navigation.navigate(ROUTES.CREATE_POST, {
      page: {
        id: vm.page.id,
        pageId: String(vm.page.pageId),
        pageName: vm.page.pageName,
        pageTitle: vm.page.pageTitle,
        avatar: vm.page.avatar,
      },
      initialAction: cleanAction as
        | 'photo'
        | 'video'
        | 'poll'
        | undefined,
    });
  }, [
    navigation,
    vm.page.avatar,
    vm.page.id,
    vm.page.pageId,
    vm.page.pageName,
    vm.page.pageTitle,
  ]);

  const handleCreateJob = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_JOB, {
      pageId: String(vm.page.pageId),
      pageName: vm.page.pageTitle || vm.page.pageName,
    });
  }, [navigation, vm.page.pageId, vm.page.pageName, vm.page.pageTitle]);

  const handleOpenOffers = useCallback(() => {
    navigation.navigate(ROUTES.PAGE_OFFERS, {
      pageId: Number(vm.page.pageId),
      pageName: vm.page.pageTitle || vm.page.pageName,
      isOwner: canManagePage,
    });
  }, [
    canManagePage,
    navigation,
    vm.page.pageId,
    vm.page.pageName,
    vm.page.pageTitle,
  ]);

  const handleEditPage = useCallback(() => {
    navigation.navigate(ROUTES.EDIT_PAGE, { page: vm.page });
  }, [navigation, vm.page]);

  const handleReportFromMenu = useCallback(async () => {
    await vm.reportPage('Báo cáo từ ứng dụng');
    Alert.alert(copy.reportSent, copy.reportSentMsg);
  }, [copy.reportSent, copy.reportSentMsg, vm]);

  const handleOpenPageSettings = useCallback(
    (pageId: string) => {
      navigation.navigate(ROUTES.PAGE_SETTINGS, { pageId, page: vm.page });
    },
    [navigation, vm.page],
  );

  const handleOpenSuggestedPage = useCallback(
    (page: PagesItem) => {
      navigation.push(ROUTES.PAGE_DETAIL, { page });
    },
    [navigation],
  );

  const handleOpenPostMenu = useCallback((post: FeedPost) => {
    setSelectedPostForMenu(post);
    setPostMenuVisible(true);
  }, []);

  const handleClosePostMenu = useCallback(() => {
    setPostMenuVisible(false);
    setTimeout(() => setSelectedPostForMenu(null), 200);
  }, []);

  const handleEditPost = useCallback((post: FeedPost) => {
    if (post.kind !== 'text' && post.kind !== 'video' && post.kind !== 'poll') {
      return;
    }

    setEditingPost(post);
    setEditPostText(
      post.caption ?? (post.kind === 'poll' ? post.pollQuestion ?? '' : ''),
    );
    setEditPostError(null);
  }, []);

  const handleCloseEditPost = useCallback(() => {
    if (isSavingEditedPost) {
      return;
    }

    setEditingPost(null);
    setEditPostText('');
    setEditPostError(null);
  }, [isSavingEditedPost]);

  const handleSaveEditedPost = useCallback(async () => {
    if (!editingPost) {
      return;
    }

    const nextText = editPostText.trim();
    if (!nextText) {
      setEditPostError(copy.editPostEmpty);
      return;
    }

    setIsSavingEditedPost(true);
    setEditPostError(null);
    try {
      await vm.editPost(editingPost.id, nextText);
      setEditingPost(null);
      setEditPostText('');
    } catch (err) {
      setEditPostError(
        err instanceof Error ? err.message : 'Không chỉnh sửa được bài viết.',
      );
    } finally {
      setIsSavingEditedPost(false);
    }
  }, [copy.editPostEmpty, editPostText, editingPost, vm]);

  const handleDeletePost = useCallback(
    async (post: FeedPost) => {
      await vm.deletePost(post.id);
    },
    [vm],
  );

  const handleTogglePostComments = useCallback(
    async (post: FeedPost) => {
      const result = await vm.togglePostComments(post.id);
      Alert.alert(
        result.enabled ? copy.commentsEnabledTitle : copy.commentsDisabledTitle,
        result.enabled
          ? copy.commentsEnabledMessage
          : copy.commentsDisabledMessage,
      );
    },
    [
      copy.commentsDisabledMessage,
      copy.commentsDisabledTitle,
      copy.commentsEnabledMessage,
      copy.commentsEnabledTitle,
      vm,
    ],
  );

  const handlePinPost = useCallback(
    async (post: FeedPost) => {
      const result = await vm.pinPost(post.id);
      Alert.alert(
        result.pinned ? copy.pinnedTitle : copy.unpinnedTitle,
        result.pinned ? copy.pinnedMessage : copy.unpinnedMessage,
      );
    },
    [
      copy.pinnedMessage,
      copy.pinnedTitle,
      copy.unpinnedMessage,
      copy.unpinnedTitle,
      vm,
    ],
  );

  const handleReport = useCallback(() => {
    Alert.alert(copy.reportTitle, copy.reportMessage, [
      { text: copy.cancelBtn, style: 'cancel' },
      {
        text: copy.reportBtn,
        style: 'destructive',
        onPress: () => {
          void vm
            .reportPage('Báo cáo từ ứng dụng')
            .then(() => Alert.alert(copy.reportSent, copy.reportSentMsg))
            .catch(err =>
              Alert.alert(
                copy.reportFailed,
                err instanceof Error ? err.message : 'Vui lòng thử lại.',
              ),
            );
        },
      },
    ]);
  }, [vm, copy]);

  const selectPageImageForCrop = useCallback(
    async (target: ImageCropTarget) => {
      try {
        const result = await launchImageLibrary(PROFILE_IMAGE_PICKER_OPTIONS);
        if (result.didCancel || !result.assets || result.assets.length === 0) {
          return;
        }

        const asset = result.assets[0];
        if (!asset.uri) return;

        await waitForImagePickerDismissal();
        const preparedAsset = await prepareProfileImageForCrop(asset, target);
        setPageCropRequest({
          target,
          image: {
            uri: preparedAsset.uri!,
            width: preparedAsset.width,
            height: preparedAsset.height,
            fileName: preparedAsset.fileName,
            type: preparedAsset.type,
          },
        });
      } catch (err) {
        Alert.alert(
          'Lỗi',
          err instanceof Error
            ? err.message
            : 'Không thể mở thư viện ảnh. Vui lòng thử lại.',
        );
      }
    },
    [],
  );

  const handleChangeAvatar = useCallback(() => {
    void selectPageImageForCrop('avatar');
  }, [selectPageImageForCrop]);

  const handleChangeCover = useCallback(() => {
    void selectPageImageForCrop('cover');
  }, [selectPageImageForCrop]);

  const handleViewAvatar = useCallback(() => {
    if (!vm.page.avatar) return;
    setPageMediaViewer('avatar');
  }, [vm.page.avatar]);

  const handleViewCover = useCallback(() => {
    if (!vm.page.cover) return;
    setPageMediaViewer('cover');
  }, [vm.page.cover]);

  const handleClosePageMediaViewer = useCallback(() => {
    setPageMediaViewer(null);
  }, []);

  const handleChangePageMediaFromViewer = useCallback(async () => {
    const target = pageMediaViewer;
    if (!target) return;

    setPageMediaViewer(null);
    await new Promise<void>(resolve =>
      setTimeout(resolve, Platform.OS === 'ios' ? 240 : 160),
    );
    await selectPageImageForCrop(target);
  }, [pageMediaViewer, selectPageImageForCrop]);

  const handleCroppedPageImage = useCallback(
    async (asset: CroppedImageAsset) => {
      const target = pageCropRequest?.target;
      if (!target) return;

      setPageCropRequest(null);
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

      try {
        if (target === 'avatar') {
          await vm.updatePageAvatar(asset);
        } else {
          await vm.updatePageCover(asset);
        }
      } catch (err) {
        Alert.alert(
          'Lỗi',
          err instanceof Error
            ? err.message
            : target === 'avatar'
              ? 'Không thể cập nhật ảnh đại diện.'
              : 'Không thể cập nhật ảnh bìa.',
        );
      }
    },
    [pageCropRequest?.target, vm.updatePageAvatar, vm.updatePageCover],
  );

  const listHeader = (
    <>
      <PageHero
        page={vm.page}
        isActionLoading={vm.isActionLoading}
        onInvite={() => setInviteVisible(true)}
        onLike={vm.toggleLike}
        onFollow={vm.toggleFollow}
        onShare={handleShare}
        canManagePage={canManagePage}
        onCreateJob={handleCreateJob}
        onOpenOffers={handleOpenOffers}
        onEditPage={handleEditPage}
        onChangeAvatar={handleChangeAvatar}
        onChangeCover={handleChangeCover}
        onViewAvatar={handleViewAvatar}
        onViewCover={handleViewCover}
        isUploadingAvatar={vm.isUploadingAvatar}
        isUploadingCover={vm.isUploadingCover}
        // Pass the Back / More handlers down so the hero can render
        // them ON TOP of the cover image. They are intentionally
        // part of the scrolling ListHeader (NOT a screen-level
        // absolute overlay) so they ride the cover as the user
        // scrolls up/down.
        onBack={() => navigation.goBack()}
        onMore={() => setMenuVisible(true)}
        copy={copy}
      />
      {canManagePage ? (
        <InvitePageRow
          label={copy.inviteRow}
          hint={copy.inviteHint}
          onPress={() => setInviteVisible(true)}
        />
      ) : null}
      {isPageOwner ? (
        <ComposerCard
          onPress={handleCreatePost}
          onPressAction={handleCreatePost}
          avatarUrl={vm.page.avatar}
          displayName={vm.page.pageTitle || 'Quản trị'}
          copy={postCardCopy}
        />
      ) : null}
      {vm.error ? (
        <View className="mt-2 border-y border-red-100 bg-red-50 px-4 py-3">
          <Text className="text-caption-primary text-red-600">{vm.error}</Text>
        </View>
      ) : null}
      <PostSearchBox
        value={vm.searchQuery}
        placeholder={copy.searchPosts}
        activeTab={vm.activeTab}
        allCount={vm.postCounts.all}
        photoCount={vm.postCounts.photos}
        allLabel={copy.filterAll}
        photoLabel={copy.tabPhotos}
        postsLabel={copy.tabPosts}
        clearLabel={copy.clearSearchBtn}
        onChangeText={vm.setSearchQuery}
        onChangeTab={vm.setActiveTab}
      />
    </>
  );

  const renderPost = useCallback(
    ({ item }: ListRenderItemInfo<FeedPost>) => {
      if (item.kind === 'text') {
        return (
          <TextPostCard
            post={item}
            copy={postCardCopy}
            onReact={vm.togglePostReaction}
            onOpenPicker={handleOpenReactionPicker}
            onCommentTap={handleOpenComments}
            onPhotoPress={handlePhotoPress}
            onShare={handleOpenPostShare}
            navigateToProfile={handleNavigateToProfile}
            onPostPress={handleOpenPost}
            gestureX={gestureX}
            gestureY={gestureY}
            gestureActive={gestureActive}
            gestureStartX={gestureStartX}
            gestureStartY={gestureStartY}
            hasDragged={hasDragged}
            onOpenReactions={openReactionsSheet}
            onOpenPostMenu={handleOpenPostMenu}
          />
        );
      }

      if (item.kind === 'video') {
        return (
          <HomeVideoPostCard
            post={item}
            copy={postCardCopy}
            isActive={activeVideoPostId === item.id}
            isScreenFocused={isFocused}
            onReact={vm.togglePostReaction}
            onOpenPicker={handleOpenReactionPicker}
            onCommentTap={handleOpenComments}
            onShare={handleOpenPostShare}
            navigateToProfile={handleNavigateToProfile}
            gestureX={gestureX}
            gestureY={gestureY}
            gestureActive={gestureActive}
            gestureStartX={gestureStartX}
            gestureStartY={gestureStartY}
            hasDragged={hasDragged}
            onOpenReactions={openReactionsSheet}
            onOpenPostMenu={handleOpenPostMenu}
          />
        );
      }

      if (item.kind === 'poll') {
        return (
          <PollPostCard
            post={item}
            onVote={vm.votePoll}
            onPress={handleOpenPost}
            onProfilePress={handleNavigateToProfile}
            onReact={vm.togglePostReaction}
            onOpenPicker={handleOpenReactionPicker}
            onCommentTap={handleOpenComments}
            onShare={handleOpenPostShare}
            language={language}
            gestureX={gestureX}
            gestureY={gestureY}
            gestureActive={gestureActive}
            gestureStartX={gestureStartX}
            gestureStartY={gestureStartY}
            hasDragged={hasDragged}
            onMorePress={handleOpenPostMenu}
          />
        );
      }

      return null;
    },
    [
      gestureActive,
      gestureStartX,
      gestureStartY,
      gestureX,
      gestureY,
      activeVideoPostId,
      handleNavigateToProfile,
      handleOpenComments,
      handleOpenPost,
      handleOpenPostMenu,
      handleOpenPostShare,
      handleOpenReactionPicker,
      handlePhotoPress,
      hasDragged,
      isFocused,
      language,
      postCardCopy,
      vm.togglePostReaction,
      vm.votePoll,
    ],
  );

  const footer = (
    <>
      {vm.isLoadingPostsMore ? (
        <View className="py-4">
          <ActivityIndicator color={APP_BRAND_COLOR} />
        </View>
      ) : null}
      {vm.activeTab === 'all' ? (
        <>
          <PageInfoSections
            page={vm.page}
            copy={copy}
            onOpenOffers={handleOpenOffers}
            onCreateJob={handleCreateJob}
          />
          <SuggestedPagesSection
            pages={vm.suggestedPages}
            copy={copy}
            onOpenPage={handleOpenSuggestedPage}
            onLikePage={vm.toggleSuggestedPageLike}
            onFollowPage={vm.toggleSuggestedPageFollow}
          />
        </>
      ) : null}
    </>
  );

  const selectedCommentPost = useMemo(
    () =>
      vm.posts.find(post => post.id === commentVm.selectedCommentPostId) as
        | (FeedTextPost | FeedVideoPost | FeedPollPost)
        | undefined,
    [commentVm.selectedCommentPostId, vm.posts],
  );

  return (
    <View className="flex-1 surface-base">
      <FocusAwareStatusBar barStyle="dark-content" />

      <SafeAreaFeedHeader />

      <FlatList
        className="flex-1"
        data={vm.displayedPosts}
        keyExtractor={item => `${item.kind}:${item.id}`}
        renderItem={renderPost}
        ListHeaderComponent={listHeader}
        ListFooterComponent={footer}
        ListEmptyComponent={
          <View className="py-2">
            {vm.isLoading ? (
              <View className="items-center border-y border-[#dddfe2] bg-white px-5 py-12">
                <ActivityIndicator color={APP_BRAND_COLOR} />
                <Text className="mt-3 text-caption-secondary">
                  {copy.loadingPosts}
                </Text>
              </View>
            ) : (
              <View className="items-center border-y border-[#dddfe2] bg-white px-5 py-10">
                <View className="icon-chip h-16 w-16 items-center justify-center">
                  <FileText size={28} color={APP_BRAND_COLOR} />
                </View>
                <Text className="mt-4 text-center text-title-primary text-slate-900">
                  {vm.searchQuery.trim()
                    ? copy.noSearchResults
                    : vm.activeTab === 'photos'
                    ? copy.emptyPhotos
                    : `${
                        vm.page.pageName ||
                        vm.page.pageTitle ||
                        copy.defaultTitle
                      } ${copy.emptyPosts}`}
                </Text>
                {isPageOwner &&
                !vm.searchQuery.trim() &&
                vm.activeTab === 'all' ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={copy.firstPostBtn}
                    activeOpacity={0.9}
                    className="btn-primary mt-5 min-h-12 px-5"
                    onPress={() => handleCreatePost()}
                  >
                    <Edit3 size={18} color={APP_COLORS.brand.onPrimary} />
                    <Text className="ml-2 text-sm font-bold text-white">
                      {copy.firstPostBtn}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        }
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.refresh}
            tintColor={APP_BRAND_COLOR}
            colors={[APP_BRAND_COLOR]}
          />
        }
        onEndReached={vm.loadMorePosts}
        onEndReachedThreshold={0.55}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      <InviteModal
        visible={inviteVisible}
        users={vm.inviteCandidates}
        invitedUserIds={vm.invitedUserIds}
        isLoading={vm.isLoadingInvites}
        onClose={() => setInviteVisible(false)}
        onInvite={vm.inviteUser}
      />

      {/* Page share sheet — opened from the hero `Share` button.
          Passes the live `vm.page` so the preview + link copy
          always reflect the most recent data, including any in-flight
          edits the user made to the page info. */}
      <FeedShareBottomSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        page={vm.page}
        onInternalPageShare={handleInternalSharePage}
      />
      <PageDetailMenuActionSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        page={vm.page}
        isOwnerOrAdmin={canManagePage}
        onReport={handleReportFromMenu}
        onOpenSettings={handleOpenPageSettings}
      />
      <PagePostMenuActionSheet
        visible={postMenuVisible}
        post={selectedPostForMenu}
        onClose={handleClosePostMenu}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
        onToggleComments={handleTogglePostComments}
        onPin={handlePinPost}
      />
      <Modal
        visible={editingPost !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCloseEditPost}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleCloseEditPost}
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
        />
        <View
          className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white px-4 pt-4"
          style={{ paddingBottom: editSheetBottomPadding }}
        >
          <Text className="text-xl font-bold text-slate-900">
            {copy.editPostTitle}
          </Text>
          <TextInput
            value={editPostText}
            onChangeText={setEditPostText}
            multiline
            textAlignVertical="top"
            editable={!isSavingEditedPost}
            placeholder={copy.editPostPlaceholder}
            placeholderTextColor="#94A3B8"
            className="mt-4 min-h-[150px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
          />
          {editPostError ? (
            <Text className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-600">
              {editPostError}
            </Text>
          ) : null}
          <View className="mt-5 flex-row items-center justify-between">
            <TouchableOpacity
              disabled={isSavingEditedPost}
              onPress={handleCloseEditPost}
              className="min-h-[46px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white"
              activeOpacity={0.78}
            >
              <Text className="text-base font-bold text-slate-600">
                {copy.editPostCancel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isSavingEditedPost}
              onPress={() => void handleSaveEditedPost()}
              className="ml-3 min-h-[46px] flex-1 items-center justify-center rounded-xl bg-brand"
              activeOpacity={0.82}
            >
              {isSavingEditedPost ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="ml-2 text-base font-bold text-white">
                    {copy.editPostSaving}
                  </Text>
                </View>
              ) : (
                <Text className="text-base font-bold text-white">
                  {copy.editPostSave}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
      <FeedShareBottomSheet
        visible={postShareVisible}
        onClose={handleClosePostShare}
        post={sharingPost}
        onInternalShare={handleInternalSharePost}
        onShared={handlePostShared}
      />
      <PageMediaViewerModal
        visible={pageMediaViewer !== null}
        uri={
          pageMediaViewer === 'avatar' ? vm.page.avatar : vm.page.cover
        }
        kind={pageMediaViewer ?? 'avatar'}
        pageTitle={
          vm.page.pageTitle || vm.page.pageName || copy.defaultTitle
        }
        canEdit={canManagePage}
        isUploading={
          pageMediaViewer === 'avatar'
            ? vm.isUploadingAvatar
            : vm.isUploadingCover
        }
        onClose={handleClosePageMediaViewer}
        onChange={handleChangePageMediaFromViewer}
      />
      <ImageCropperModal
        visible={pageCropRequest !== null}
        image={pageCropRequest?.image ?? null}
        target={pageCropRequest?.target ?? 'avatar'}
        onCancel={() => setPageCropRequest(null)}
        onComplete={handleCroppedPageImage}
      />
      <PhotoViewerModal
        state={photoViewer}
        onClose={handleClosePhotoViewer}
        onReact={vm.togglePostReaction}
        onCommentTap={handlePhotoViewerCommentTap}
        onProfilePress={handleNavigateToProfile}
        onInternalShare={handleInternalSharePost}
        posts={vm.posts}
      />
    </View>
  );
}

export default PageDetailScreen;
