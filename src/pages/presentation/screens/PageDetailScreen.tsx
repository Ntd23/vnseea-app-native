// Description: Renders a full data-driven Page detail surface.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Camera,
  Check,
  ChevronRight,
  Edit3,
  Flag,
  Globe2,
  Heart,
  Image as ImageIcon,
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
import type {
  FeedPollPost,
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
} from '../../../feed/domain/types/feed.types';
import type { SharePostInput } from '../../../feed/domain/repositories/FeedRepository';
import { useFeedCommentsViewModel } from '../../../feed/application/view-models/useFeedCommentsViewModel';
import {
  FEED_COPY as POST_CARD_COPY,
  HomeVideoPostCard,
  ReactionPickerOverlay,
  TextPostCard,
} from '../../../feed/presentation/components/PostCards';
import PostReactionsSheet from '../../../feed/presentation/components/PostReactionsSheet';
import {
  PhotoViewerModal,
  type PhotoViewerState,
} from '../../../shared-kernel/presentation/components/PhotoViewerModal';
import { PollPostCard } from '../../../feed/presentation/components/PollPostCard';
import { ShareActionSheet } from '../../../shared-kernel/presentation/components/ShareActionSheet';
import { ReelCommentsSheet } from '../../../reels/presentation/components/ReelCommentsSheet';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { usePageDetailViewModel } from '../../application/view-models/usePageDetailViewModel';
import type {
  PageDetailTab,
} from '../../application/view-models/usePageDetailViewModel';
import type { PageReview, PageUser, PagesItem } from '../../domain/types/pages.types';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
// Dedicated page-only share sheet. Distinct from the shared
// `ShareActionSheet` (which targets a FeedPost) — pages don't
// have a post to share, just a public URL, so we render a
// minimal 2-action modal (copy + native share) with a page
// preview header. Defined next to the screen so the other Page
// work currently in flight (offers, etc.) doesn't collide with
// the import surface.
import PageShareActionSheet from '../components/PageShareActionSheet';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';

type PageDetailProps = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.PAGE_DETAIL
>;

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

interface ScaleButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
}

function ScaleButton({
  children,
  onPress,
  style,
  disabled,
}: ScaleButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) scale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    if (!disabled) scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

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
      className="items-center justify-center rounded-full bg-[#EEF2FF]"
      style={{ width: size, height: size }}
    >
      <Flag size={Math.max(20, size * 0.45)} color="#0000FF" />
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

function ActionButton({
  icon,
  label,
  active,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <ScaleButton
      onPress={onPress}
      disabled={disabled}
      style={{ flex: 1 }}
    >
      <View
        className={`items-center justify-center rounded-2xl py-3 border ${
          active
            ? 'bg-blue-50/50 border-blue-100'
            : 'bg-white border-slate-100'
        }`}
        style={{ minHeight: 72 }}
      >
        {icon}
        <Text
          className={`text-[11px] mt-1.5 font-bold ${
            active ? 'text-blue-600' : 'text-slate-600'
          }`}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </ScaleButton>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View className="items-center flex-1">
      <Text className="text-xl font-bold text-slate-900">{value}</Text>
      <Text className="text-xs text-slate-500 mt-1 font-medium">{label}</Text>
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
  onCreatePost,
  onCreateOffer,
  onChangeAvatar,
  onChangeCover,
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
  onCreatePost?: () => void;
  onCreateOffer?: () => void;
  onChangeAvatar?: () => void;
  onChangeCover?: () => void;
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

  return (
    <View className="bg-white">
      {/* Cover Image Container — relative so the floating Back/More
          buttons below can position themselves over the image. They
          ride with the cover as the user scrolls (this is intentional
          per the design brief: "the two buttons should follow the
          cover, not stay pinned at the very top"). */}
      <View className="h-60 bg-[#F1F5F9] relative">
        {page.cover ? (
          <Image
            source={{ uri: page.cover }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Flag size={64} color="rgba(0,47,255,0.15)" />
          </View>
        )}

        {/* Back + More buttons — anchored to the cover image at the
            top-left / top-right. They scroll WITH the cover because
            they live inside the ListHeader (PageHero), not above the
            FlatList. We pass the screen's safe-area insets down so
            they sit just under the status bar on every device. */}
        {onBack ? (
          <TouchableOpacity
            className="absolute h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200"
            style={{
              top: insets.top + 8,
              left: 16,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 8,
              elevation: 4,
            }}
            activeOpacity={0.8}
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
        ) : null}
        {onMore ? (
          <TouchableOpacity
            className="absolute h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200"
            style={{
              top: insets.top + 8,
              right: 16,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 8,
              elevation: 4,
            }}
            activeOpacity={0.8}
            onPress={onMore}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreHorizontal size={22} color="#0F172A" />
          </TouchableOpacity>
        ) : null}

        {canManagePage && onChangeCover ? (
          <TouchableOpacity
            className="absolute bottom-4 right-4 h-9 w-9 items-center justify-center rounded-full bg-white shadow-md border border-slate-100"
            activeOpacity={0.8}
            onPress={onChangeCover}
            disabled={isUploadingCover}
          >
            {isUploadingCover ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Camera size={18} color="#0F172A" />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Page Content Detail */}
      <View className="px-4 pb-5">
        {/* Avatar Container with Overlap */}
        <View className="-mt-16 flex-row items-end justify-between mb-4">
          <View className="relative">
            <PageAvatar page={page} size={100} />
            {canManagePage && onChangeAvatar ? (
              <TouchableOpacity
                className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border border-slate-100"
                activeOpacity={0.8}
                onPress={onChangeAvatar}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Camera size={15} color="#0F172A" />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Title and Handle (Inline badge check) */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)}>
          <View className="flex-row items-center flex-wrap">
            <Text className="text-2xl font-bold text-slate-900 mr-2">
              {title}
            </Text>
            {page.mapPinApproved ? (
              <BadgeCheck size={22} color="#002fff" fill="#002fff" />
            ) : null}
          </View>
          {handle ? (
            <Text className="mt-1 text-sm font-semibold text-slate-400">{handle}</Text>
          ) : null}
          {page.pageDescription ? (
            <Text className="mt-2 text-sm text-slate-600 leading-relaxed font-medium" numberOfLines={4}>
              {page.pageDescription}
            </Text>
          ) : null}
        </Animated.View>

        {/* Metrics Section (White rounded card with thin border) */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View className="mt-4 flex-row justify-around rounded-2xl bg-white border border-slate-100 py-4 shadow-sm">
            <Metric value={formatCount(page.likes)} label={copy.likesLabel} />
            <Metric value={formatCount(page.followersCount)} label={copy.followersLabel} />
            <Metric value={formatCount(page.postCount)} label={copy.postsLabel} />
          </View>
        </Animated.View>

        {/* Create Post Button (Full width blue capsule button) */}
        {canManagePage ? (
          <Animated.View
            entering={FadeInDown.delay(150).duration(400)}
            className="mt-4 flex-row gap-2"
          >
            <ScaleButton onPress={onCreatePost} style={{ flex: 1 }}>
              <View className="min-h-[48px] flex-row items-center justify-center rounded-2xl bg-[#002fff] px-3 shadow-sm">
                <Edit3 size={18} color="#FFFFFF" />
                <Text className="ml-2 text-sm font-bold text-white" numberOfLines={1}>
                  {copy.createPostBtn}
                </Text>
              </View>
            </ScaleButton>
            <ScaleButton onPress={onCreateOffer} style={{ flex: 1 }}>
              <View className="min-h-[48px] flex-row items-center justify-center rounded-2xl border border-[#002fff] bg-white px-3">
                <Tag size={18} color="#002fff" />
                <Text className="ml-2 text-sm font-bold text-[#002fff]" numberOfLines={1}>
                  {copy.createOfferBtn}
                </Text>
              </View>
            </ScaleButton>
          </Animated.View>
        ) : null}

        {/* Actions Row (Liked, Following, Invite, Share) */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View className="mt-4 flex-row gap-2">
            <ActionButton
              active={page.isLiked}
              label={page.isLiked ? copy.likedBtn : copy.likeBtn}
              icon={
                page.isLiked ? (
                  <Heart size={20} color="#002fff" fill="#002fff" />
                ) : (
                  <Heart size={20} color="#64748B" />
                )
              }
              disabled={isActionLoading}
              onPress={onLike}
            />
            <ActionButton
              active={page.isFollowing}
              label={page.isFollowing ? copy.followingBtn : copy.followBtn}
              icon={
                page.isFollowing ? (
                  <Bell size={20} color="#002fff" fill="#002fff" />
                ) : (
                  <Bell size={20} color="#64748B" />
                )
              }
              disabled={isActionLoading}
              onPress={onFollow}
            />
            <ActionButton
              label={copy.inviteBtn}
              icon={<UserPlus size={20} color="#64748B" />}
              onPress={onInvite}
            />
            <ActionButton
              label={copy.shareBtn}
              icon={<Share2 size={20} color="#64748B" />}
              onPress={onShare}
            />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
function Tabs({
  activeTab,
  onChange,
  tabs,
}: {
  activeTab: PageDetailTab;
  onChange: (tab: PageDetailTab) => void;
  tabs: Array<{ id: PageDetailTab; label: string }>;
}) {
  return (
    <View className="mt-2 flex-row bg-white px-2">
      {tabs.map(tab => {
        const active = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            className="min-h-[48px] flex-1 items-center justify-center border-b-2"
            style={{ borderBottomColor: active ? '#002fff' : 'transparent' }}
            activeOpacity={0.8}
            onPress={() => onChange(tab.id)}
          >
            <Text
              className="text-caption-primary font-bold"
              style={{ color: active ? '#002fff' : '#64748B' }}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Post-type filter chips for the "posts" tab.
 *
 * Renders a horizontal pill control with three options — "Tất cả"
 * (everything), "Bài viết" (text + photo posts), and "Video" (reels)
 * — each with a small count badge so the user knows how many posts
 * they'll see before tapping. Client-side filter, so changing
 * chips is instant and never hits the network.
 *
 * When there are zero posts in a given bucket we still render the
 * chip but tap is a no-op visually (the count "0" makes the empty
 * outcome obvious). We keep the chip visible to avoid layout
 * shift when the user filters and posts come/go.
 */
const POST_FILTER_TABS: Array<{
  id: 'all' | 'text' | 'video';
  labelKey: 'filterAll' | 'filterText' | 'filterVideo';
  countKey: 'all' | 'text' | 'video';
}> = [
  { id: 'all', labelKey: 'filterAll', countKey: 'all' },
  { id: 'text', labelKey: 'filterText', countKey: 'text' },
  { id: 'video', labelKey: 'filterVideo', countKey: 'video' },
];

function PostFilterChips({
  active,
  counts,
  copy,
  onChange,
}: {
  active: 'all' | 'text' | 'video';
  counts: { all: number; text: number; video: number };
  copy: { filterAll: string; filterText: string; filterVideo: string };
  onChange: (next: 'all' | 'text' | 'video') => void;
}) {
  return (
    <View className="mt-3 flex-row gap-2 bg-white px-3 pb-2 pt-1">
      {POST_FILTER_TABS.map(({ id, labelKey, countKey }) => {
        const isActive = active === id;
        const count = counts[countKey];
        const label = copy[labelKey];
        return (
          <TouchableOpacity
            key={id}
            className={`min-h-[34px] flex-row items-center rounded-full border px-3 ${
              isActive
                ? 'border-[#002fff] bg-[#eef2ff]'
                : 'border-slate-200 bg-white'
            }`}
            activeOpacity={0.8}
            onPress={() => onChange(id)}
          >
            <Text
              className={`text-caption-primary font-bold ${
                isActive ? 'text-[#002fff]' : 'text-slate-600'
              }`}
              numberOfLines={1}
            >
              {label}
            </Text>
            <View
              className={`ml-1.5 min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 ${
                isActive ? 'bg-[#002fff]' : 'bg-slate-100'
              }`}
            >
              <Text
                className={`text-[11px] font-bold ${
                  isActive ? 'text-white' : 'text-slate-500'
                }`}
                numberOfLines={1}
              >
                {count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="flex-row items-center rounded-2xl bg-white px-4 py-4">
      {icon}
      <Text className="ml-3 flex-1 text-body-primary">{label}</Text>
    </View>
  );
}

function AboutTab({ page }: { page: PagesItem }) {
  return (
    <View className="gap-3 px-4 py-4">
      {page.pageDescription ? (
        <InfoRow
          icon={<Flag size={20} color="#0000FF" />}
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
        <InfoRow
          icon={<Globe2 size={20} color="#475569" />}
          label={page.url}
        />
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

function UsersTab({
  title,
  users,
}: {
  title: string;
  users: PageUser[];
}) {
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
        className="mt-3 min-h-[42px] flex-row items-center justify-center rounded-xl bg-[#0000FF]"
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
          <Text className="text-caption-secondary">{formatTime(review.postedAt)}</Text>
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
            <ActivityIndicator color="#0000FF" />
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

function VideoPreview({ post, onOpen }: { post: FeedVideoPost; onOpen: () => void }) {
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
        <View
          key={option.id}
          className="rounded-2xl bg-slate-100 px-4 py-3"
        >
          <View
            className="absolute bottom-0 left-0 top-0 rounded-2xl bg-blue-100"
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
              <ActivityIndicator color="#0000FF" />
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
                          invited ? 'bg-slate-100' : 'bg-[#0000FF]'
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
  const vm = usePageDetailViewModel(route.params.page);
  const didFocusRef = useRef(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  // Page-share modal — separate from `inviteVisible` so the offers
  // work happening in this file (and any other modal work) can
  // mount and unmount freely without colliding with the share state.
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [postShareVisible, setPostShareVisible] = useState(false);
  const [sharingPost, setSharingPost] = useState<FeedPost | undefined>();
  const [pickerAnchor, setPickerAnchor] = useState<{
    postId: string;
    x: number;
    y: number;
  } | null>(null);
  const [activeVideoPostId, setActiveVideoPostId] = useState<string | null>(null);
  // Photo viewer modal — mirrors Feed / Profile. Opens when the user
  // taps any photo inside a page post so the page is consistent with
  // the global viewer (swipe, progress, reaction, comment).
  const [photoViewer, setPhotoViewer] = useState<PhotoViewerState>(null);
  const openingPhotoViewerRef = useRef(false);
  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const hasDragged = useSharedValue(false);
  const commentVm = useFeedCommentsViewModel({
    onCommentCountChange: vm.updatePostCommentCount,
  });
  const [reactionsSheetVisible, setReactionsSheetVisible] = useState(false);
  const [reactionsSheetPostId, setReactionsSheetPostId] = useState<string | null>(null);

  const openReactionsSheet = useCallback((postId: string, _post: FeedPost) => {
    setReactionsSheetPostId(postId);
    setReactionsSheetVisible(true);
  }, []);

  const closeReactionsSheet = useCallback(() => {
    setReactionsSheetVisible(false);
  }, []);
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item?: FeedPost }> }) => {
      const nextVideo = viewableItems.find(
        entry => entry.item?.kind === 'video',
      )?.item;
      setActiveVideoPostId(prev =>
        prev === nextVideo?.id ? prev : nextVideo?.id ?? null,
      );
    },
  ).current;
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 160,
  }).current;
  const currentUserId = sessionStorage.getSession()?.userId;
  const adminInfo =
    vm.page.adminInfo && typeof vm.page.adminInfo === 'object'
      ? (vm.page.adminInfo as Record<string, unknown>)
      : null;
  const canManagePage =
    Boolean(currentUserId && vm.page.ownerId && String(currentUserId) === String(vm.page.ownerId)) ||
    Boolean(adminInfo && Object.keys(adminInfo).length > 0);

  const language = useAppLanguage();
  const copy = PAGE_DETAIL_COPY[language] || PAGE_DETAIL_COPY.vi;
  const postCardCopy = POST_CARD_COPY[language];
  const insets = useSafeAreaInsets();

  const tabs = useMemo(() => [
    { id: 'posts' as PageDetailTab, label: copy.tabPosts },
    { id: 'about' as PageDetailTab, label: copy.tabAbout },
    { id: 'followers' as PageDetailTab, label: copy.tabFollowers },
    { id: 'reviews' as PageDetailTab, label: copy.tabReviews },
    { id: 'admins' as PageDetailTab, label: copy.tabAdmins },
  ], [copy]);

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
      navigation.navigate(ROUTES.PROFILE, { userId });
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

  // Open the dedicated page share sheet. Previously this jumped
  // straight to React Native's native Share dialog with a fixed
  // message, which gave the user no chance to copy the link first.
  // The new sheet (PageShareActionSheet) offers both actions
  // and shows a page preview so users know what they're sharing.
  const handleShare = useCallback(() => {
    setShareSheetVisible(true);
  }, []);

  const handleCreatePost = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_POST, { page: vm.page });
  }, [navigation, vm.page]);

  const handleCreateOffer = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_OFFER, {
      pageId: Number(vm.page.pageId),
      pageName: vm.page.pageTitle,
    });
  }, [navigation, vm.page.pageId, vm.page.pageTitle]);

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

      await vm.updatePageAvatar({
        uri: asset.uri,
        name: asset.fileName ?? `avatar_${Date.now()}.jpg`,
        type: asset.type ?? 'image/jpeg',
      });
    } catch (err) {
      Alert.alert(
        'Lỗi',
        err instanceof Error ? err.message : 'Không thể cập nhật ảnh đại diện.',
      );
    }
  }, [vm]);

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

      await vm.updatePageCover({
        uri: asset.uri,
        name: asset.fileName ?? `cover_${Date.now()}.jpg`,
        type: asset.type ?? 'image/jpeg',
      });
    } catch (err) {
      Alert.alert(
        'Lỗi',
        err instanceof Error ? err.message : 'Không thể cập nhật ảnh bìa.',
      );
    }
  }, [vm]);

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
        onCreatePost={handleCreatePost}
        onCreateOffer={handleCreateOffer}
        onChangeAvatar={handleChangeAvatar}
        onChangeCover={handleChangeCover}
        isUploadingAvatar={vm.isUploadingAvatar}
        isUploadingCover={vm.isUploadingCover}
        // Pass the Back / More handlers down so the hero can render
        // them ON TOP of the cover image. They are intentionally
        // part of the scrolling ListHeader (NOT a screen-level
        // absolute overlay) so they ride the cover as the user
        // scrolls up/down.
        onBack={() => navigation.goBack()}
        onMore={handleReport}
        copy={copy}
      />
      {vm.error ? (
        <View className="mx-4 mt-3 rounded-2xl bg-red-50 px-4 py-3">
          <Text className="text-caption-primary text-red-600">{vm.error}</Text>
        </View>
      ) : null}
      <Tabs activeTab={vm.activeTab} onChange={vm.setActiveTab} tabs={tabs} />
      {vm.activeTab === 'posts' ? (
        <PostFilterChips
          active={vm.postFilter}
          counts={vm.postCounts}
          copy={copy}
          onChange={vm.setPostFilter}
        />
      ) : null}
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
          />
        );
      }

      if (item.kind === 'video') {
        return (
          <HomeVideoPostCard
            post={item}
            copy={postCardCopy}
            isActive={activeVideoPostId === item.id}
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
      handleOpenPostShare,
      handleOpenReactionPicker,
      handlePhotoPress,
      hasDragged,
      language,
      postCardCopy,
      vm.togglePostReaction,
      vm.votePoll,
    ],
  );

  const footer = (
    <>
      {vm.activeTab === 'posts' && vm.isLoadingPostsMore ? (
        <View className="py-4">
          <ActivityIndicator color="#002fff" />
        </View>
      ) : null}
      {vm.activeTab === 'about' ? <AboutTab page={vm.page} /> : null}
      {vm.activeTab === 'followers' ? (
        <UsersTab title={copy.followersTitle} users={vm.followers} />
      ) : null}
      {vm.activeTab === 'admins' ? (
        <UsersTab title={copy.adminsTitle} users={vm.admins} />
      ) : null}
      {vm.activeTab === 'reviews' ? (
        <ReviewsTab
          reviews={vm.reviews}
          hasMore={vm.reviewsHasMore}
          isLoadingMore={vm.isLoadingReviewsMore}
          onLoadMore={vm.loadMoreReviews}
          onRate={vm.ratePage}
        />
      ) : null}
    </>
  );

  const selectedCommentPost = useMemo(
    () =>
      vm.posts.find(
        post => post.id === commentVm.selectedCommentPostId,
      ) as (FeedTextPost | FeedVideoPost | FeedPollPost) | undefined,
    [commentVm.selectedCommentPostId, vm.posts],
  );

  return (
    <View className="flex-1 surface-base">
      <FocusAwareStatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <FeedHeader />

      {/* Standard sticky AppBar */}
      <View
        style={{
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        }}
      >
        <View
          style={{
            height: 56,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: '#0F172A',
              flex: 1,
            }}
            numberOfLines={1}
          >
            {vm.page.pageTitle || vm.page.pageName || copy.defaultTitle}
          </Text>
        </View>
      </View>

      <FlatList
        className="flex-1"
        data={vm.activeTab === 'posts' ? vm.displayedPosts : []}
        keyExtractor={item => `${item.kind}:${item.id}`}
        renderItem={renderPost}
        ListHeaderComponent={listHeader}
        ListFooterComponent={footer}
        ListEmptyComponent={
          vm.activeTab === 'posts' ? (
            <View className="px-4 py-10">
              {vm.isLoading ? (
                <ActivityIndicator color="#002fff" />
              ) : (
                <Text className="rounded-2xl bg-white px-4 py-8 text-center text-body-secondary">
                  {copy.emptyPosts}
                </Text>
              )}
            </View>
          ) : null
        }
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.refresh}
            tintColor="#002fff"
            colors={['#002fff']}
          />
        }
        onEndReached={vm.activeTab === 'posts' ? vm.loadMorePosts : undefined}
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
      <PageShareActionSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        page={vm.page}
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
        sheetHeight="90%"
      />
      <ShareActionSheet
        visible={postShareVisible}
        onClose={handleClosePostShare}
        post={sharingPost}
        onInternalShare={handleInternalSharePost}
      />
      <PhotoViewerModal
        state={photoViewer}
        onClose={handleClosePhotoViewer}
        onReact={vm.togglePostReaction}
        onCommentTap={handleOpenComments}
        posts={vm.posts}
      />
    </View>
  );
}

export default PageDetailScreen;
