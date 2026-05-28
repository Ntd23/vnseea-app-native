// Description: Renders the Facebook-style profile screen with user-backed API data.
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Briefcase,
  Camera,
  Clock,
  Edit3,
  MapPin,
  MoreHorizontal,
  PlusCircle,
  Search,
  User,
  Users,
  UserCheck,
  Sparkles,
  Verified,
  MessageCircle,
  Globe,
  Share2,
  Play,
  ThumbsUp,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useProfileViewModel } from '../../application/view-models/useProfileViewModel';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import { createStoriesRepository } from '../../../stories/infrastructure/repositories/ApiStoriesRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { FeedTextPost, FeedVideoPost } from '../../../feed/domain/types/feed.types';
import type {
  StoryItem,
  StoryMedia,
} from '../../../stories/domain/types/stories.types';

type ProfileNav = NativeStackNavigationProp<RootStackParamList>;
type ProfileFeedPost = FeedTextPost | FeedVideoPost;
type ProfileRoute = RouteProp<RootStackParamList, typeof ROUTES.PROFILE>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRIEND_ITEM_WIDTH = (SCREEN_WIDTH - 64 - 16) / 3;

const FALLBACK_COVER =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCNqLNeeWsi7Qk4abx08XCTrKI5CmUGgDCiX-kH7Y_8LIIX5Slo9GRgEra_4deGp5e9pYozUmQdYGZi1sNQSks0QtbNWgpmn5gJgrF62Z8I8UMQpqKiMHLQ8Rzd9oUUIITFJPuwExVflVdeB1fRKjSGDO7zAocaZElLgpqJr6Mjvoj2FKOUVfnTk8XxnkG5WNijLpmXavW9TFlNhtlfLYbSE2qofOA8or7d_AfsUWZV43ADdtVFNH7VwEEazqapaL-Vndqksu_vDnE';
const FALLBACK_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBg12HbWQ9COz6EW-AyHRwh6TTRPdTun5HWxmzi1GHtkTwHjsF2VhXQV6yg-mCV0YYTXBDcEOCpZdcTGiCK1PpdUNPDQs6XTApo0nb_7Vi7IJPOfkXwbA1cq6d18Fft2V5ELBI4ZKLT6lvpj4O-9EBj3u3QfGt-Dzy_wf-DNRLwVAEeuaiEJ4B2Fvch4B0S9tk5tMCvbYQwuzGl0ttLC2hVIJh1Oj6Dn4dp6ueFANa1Yxy__ZIQLHKmtsMh2U8NBz0DLPHRlOZOzF4';
const FALLBACK_FRIENDS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD1ieW2j4f-Xpi2IQaTOfhldZV_bq_cxNC3J8YvwLIMj3JoQf59xE_k7gRHQjjfMpGvfe3N9VNdzWDpAJ-EaJMQZhPXHulWgUWPbW4p7bHmW8OCX3bQIQjt8Qa3T5sb48Em_nnY7VjvCY9Heq0Pf628HeYvVWT_YM5vqrvie_uqkbTUIvDtIe0FeZycbHduWhd6UbIZM7YqZ2FRIhIsQZgSiH0JCdMCHho07QUOFTmuK8RExLIncYMPS2HCsqjehGsRdnDzIx7Ybrw',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDLWS5tf0Fpf1ZFDA8P_g7Gl6UFYvTeEdbq0rTHTrnIJFduAXKiZilywPSKobKVJmePltF4AL3UzBkk86bs_-nCNz21jwD7bIY4qdP0TW7-e8IaeD7K_I1_x9z7CY766cwG1ylT91GzYqnWsS4RT8sCyL7FGgLp9PgrttHr18EyTTnJ5q9ohUrT9wLqxfikI6VjZ3R7Yt0S1ii4gM3UjuX0GR4JJeQj7M6QJI_vyBu-PAzJn0IF7i4EFtXmnRSAjppkw1CfWjMcuVE',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDBM__UehaAgiDA9uC3Kw8OPZ3kYz67EbNRd0wutGdRStdNAQuO0bto9DiVW1VWK8Yedmg9NDq7gtlhaK1r-06a7Da1fs5flP275bMscPfGbnGLhLuJ4AvhV57akqf3YcT1OuEZ8ec6CzJxl9QXZpFcb2iJ5XcAwJcy4PfAo3-wMa2kEGtv108qFxXFyCnHe38B1ei1Jrx-dxSsVshOyAE4UluTEh_assYq9hyzWTJa2d71vIxqOp-U1-5oh8O1wKYT0Kivx75ge0U',
];

function formatRelativeTime(timestamp: number | undefined) {
  if (!timestamp) return '';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(timestamp * 1000).toLocaleDateString('vi-VN');
}

function mergeStoriesForProfile(
  stories: StoryItem[],
  targetUserId: string,
): StoryItem | null {
  const userStories = stories
    .filter(story => String(story.publisher.userId) === String(targetUserId))
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

function DetailRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="mb-3.5 flex-row items-center">
      <View className="w-6 items-center justify-center">{icon}</View>
      <Text className="ml-3 flex-1 text-[14px] leading-snug text-[#050505]">
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
  const insets = useSafeAreaInsets();
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
      <View className="mt-5 flex-row px-4 gap-2">
        <View className="flex-1">
          <SkeletonBlock height={38} borderRadius={8} />
        </View>
        <View className="flex-1">
          <SkeletonBlock height={38} borderRadius={8} />
        </View>
        <View className="w-[38px]">
          <SkeletonBlock height={38} width={38} borderRadius={8} />
        </View>
      </View>

      {/* Stats Divider Line */}
      <View className="mx-4 mt-5 border-b border-[#E4E6EB]" />

      {/* Details Card Skeleton */}
      <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
        <SkeletonBlock height={18} width={80} borderRadius={4} />
        <View className="mt-4 space-y-3">
          {[1, 2, 3].map(i => (
            <View key={i} className="flex-row items-center">
              <SkeletonBlock height={18} width={18} borderRadius={4} />
              <View className="ml-3 flex-1">
                <SkeletonBlock height={14} width="80%" borderRadius={4} />
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ProfileNav>();
  const route = useRoute<ProfileRoute>();
  const { profile, followers, following, isLoading, error, loadProfile } =
    useProfileViewModel();

  const session = sessionStorage.getSession();
  const currentUserId = session?.userId;
  const targetUserId = route.params?.userId ?? currentUserId ?? profile?.id;
  const isOwnProfile =
    !route.params?.userId ||
    (currentUserId
      ? String(route.params.userId) === String(currentUserId)
      : false);

  const [posts, setPosts] = useState<ProfileFeedPost[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [userStory, setUserStory] = useState<StoryItem | null>(null);

  const feedRepo = useMemo(() => createFeedRepository(), []);
  const storiesRepo = useMemo(() => createStoriesRepository(), []);

  useEffect(() => {
    loadProfile({
      userId: route.params?.userId,
      includeFriends: true,
    }).catch(() => undefined);
  }, [loadProfile, route.params?.userId]);

  // Load User Posts
  useEffect(() => {
    console.log('[ProfileScreen] Loading posts for targetUserId:', targetUserId);
    if (!targetUserId) {
      console.log('[ProfileScreen] targetUserId is empty, skipping load posts');
      setPosts([]);
      setPostsError(null);
      setIsPostsLoading(false);
      return;
    }
    setIsPostsLoading(true);
    setPostsError(null);
    feedRepo.getUserPosts(targetUserId)
      .then(res => {
        console.log('[ProfileScreen] Loaded posts count:', res?.length);
        const filteredPosts = (res ?? []).filter(
          (p): p is ProfileFeedPost => p.kind === 'text' || p.kind === 'video'
        );
        setPosts(filteredPosts);
      })
      .catch(err => {
        console.error('[ProfileScreen] Error loading posts:', err);
        setPostsError(err instanceof Error ? err.message : 'Không tải được bài viết.');
      })
      .finally(() => setIsPostsLoading(false));
  }, [feedRepo, targetUserId]);

  // Load User Active Story
  useEffect(() => {
    if (!targetUserId) {
      setUserStory(null);
      return;
    }

    let cancelled = false;
    setUserStory(null);

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
      })
      .catch(() => {
        if (!cancelled) {
          setUserStory(null);
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
  const friendAvatars =
    followers.length > 0
      ? followers.slice(0, 5).map(friend => friend.avatarUrl ?? FALLBACK_AVATAR)
      : FALLBACK_FRIENDS;

  // Toggle Like Action on a specific post
  const handleToggleLike = async (post: ProfileFeedPost) => {
    try {
      const newLiked = !post.isLiked;
      // Optimistic update
      setPosts(prev =>
        prev.map(p => {
          if (p.id === post.id) {
            return {
              ...p,
              isLiked: newLiked,
              likeCount: newLiked ? p.likeCount + 1 : Math.max(0, p.likeCount - 1),
              myReaction: newLiked ? 'like' : null,
            } as any;
          }
          return p;
        })
      );
      await feedRepo.setReaction(post.id, newLiked ? 'like' : null);
    } catch {
      // Revert on error
      setPosts(prev =>
        prev.map(p => {
          if (p.id === post.id) {
            return post;
          }
          return p;
        })
      );
      Alert.alert('Lỗi', 'Không thể cập nhật lượt thích. Vui lòng thử lại.');
    }
  };

  // Avatar Press Handler
  const handleAvatarPress = () => {
    if (userStory) {
      Alert.alert(
        'Tùy chọn ảnh đại diện',
        '',
        [
          {
            text: 'Xem tin',
            onPress: () => {
              navigation.navigate(ROUTES.STORY_VIEWER, {
                stories: [userStory],
                initialUserIndex: 0,
              });
            },
          },
          {
            text: 'Xem ảnh đại diện',
            onPress: () => {
              // Placeholder for viewing photo
            },
          },
          {
            text: 'Hủy',
            style: 'cancel',
          },
        ]
      );
    } else {
      Alert.alert('Ảnh đại diện', 'Xem ảnh đại diện?', [
        { text: 'Xem', onPress: () => {} },
        { text: 'Hủy', style: 'cancel' }
      ]);
    }
  };

  if (isLoading && !profile) {
    return <FullProfileSkeleton />;
  }

  return (
    <View className="flex-1 bg-[#F0F2F5]">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Fixed Floating Header (Persistent Navigation Controls) */}
      <View
        className="absolute top-0 left-0 right-0 z-20 flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top + 8, height: insets.top + 48 }}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full bg-black/40"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full bg-black/40"
            activeOpacity={0.8}
            onPress={() => navigation.navigate(ROUTES.SEARCH)}
          >
            <Search size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full bg-black/40"
            activeOpacity={0.8}
          >
            <MoreHorizontal size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Profile Header Area (Cover Image, Avatar, Profile Info, Buttons) */}
        <View className="bg-white pb-5 shadow-sm">
          {/* Cover Photo */}
          <View className="relative w-full" style={{ height: 210 }}>
            <Image
              source={{ uri: coverUrl }}
              className="h-full w-full"
              style={{ width: SCREEN_WIDTH }}
              resizeMode="cover"
            />

            {/* Gradient Overlays */}
            <View
              className="absolute top-0 left-0 right-0"
              style={{
                height: 80,
                backgroundColor: 'rgba(0,0,0,0.25)',
              }}
            />
            <View
              className="absolute bottom-0 left-0 right-0"
              style={{
                height: 50,
                backgroundColor: 'rgba(0,0,0,0.15)',
              }}
            />

            {/* Role Badge ("Marketing Staff") */}
            <View
              className="absolute left-4 rounded-xl border border-white/20 bg-red-600/90 px-3.5 py-1.5 backdrop-blur-sm"
              style={{ top: insets.top + 50 }}
            >
              <View className="flex-row items-center">
                <Verified size={13} color="#FFFFFF" fill="#FFFFFF" />
                <Text className="ml-1.5 text-[11px] font-semibold text-white">
                  Marketing Staff
                </Text>
              </View>
            </View>

            {/* Edit Cover Photo Button */}
            <TouchableOpacity
              className="absolute bottom-3.5 right-3.5 flex-row items-center rounded-lg bg-black/50 px-3 py-1.5"
              activeOpacity={0.8}
            >
              <Camera size={14} color="#FFFFFF" />
              <Text className="ml-1.5 text-[11px] font-semibold text-white">
                Chỉnh sửa
              </Text>
            </TouchableOpacity>
          </View>

          {/* Avatar Section (Overlapping Cover Photo + Story active Ring) */}
          <View className="items-center -mt-[60px] relative z-10">
            <View className="relative">
              <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85}>
                <View
                  className="h-[126px] w-[126px] rounded-full justify-center items-center"
                  style={{
                    borderWidth: userStory ? 3.5 : 0,
                    borderColor: userStory ? (userStory.hasUnseen ? '#1877F2' : '#CBD5E1') : 'transparent',
                    padding: userStory ? 2.5 : 0,
                  }}
                >
                  <View className="h-full w-full overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md">
                    <Image
                      source={{ uri: avatarUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </View>
                </View>
              </TouchableOpacity>
              {/* Edit Avatar Badge */}
              <TouchableOpacity
                className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#E4E6EB] shadow-md animate-none"
                activeOpacity={0.8}
              >
                <Camera size={15} color="#050505" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Name & Username */}
          <View className="mt-3.5 items-center px-4">
            <View className="flex-row items-center">
              <Text
                allowFontScaling={false}
                className="text-center text-[24px] font-bold tracking-wide text-[#050505]"
                numberOfLines={2}
              >
                {displayName || 'Người dùng'}
              </Text>
              {profile?.verified && (
                <View className="ml-2 mt-0.5">
                  <Verified size={18} color="#FFFFFF" fill="#1877F2" />
                </View>
              )}
            </View>
            {!!username && (
              <Text className="mt-1 text-[13px] text-[#65676B]">
                {username}
              </Text>
            )}
          </View>

          {/* Facebook-style Action Buttons Row */}
          <View className="mt-5 flex-row px-4 gap-2">
            <TouchableOpacity
              className="h-[38px] flex-1 flex-row items-center justify-center rounded-lg bg-[#1877F2] px-4"
              activeOpacity={0.8}
            >
              <PlusCircle size={16} color="#FFFFFF" />
              <Text className="ml-1.5 text-[14px] font-bold text-white">
                Theo dõi
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="h-[38px] flex-1 flex-row items-center justify-center rounded-lg bg-[#E4E6EB] px-4"
              activeOpacity={0.8}
            >
              <MessageCircle size={16} color="#050505" />
              <Text className="ml-1.5 text-[14px] font-bold text-[#050505]">
                Nhắn tin
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="h-[38px] w-[38px] items-center justify-center rounded-lg bg-[#E4E6EB]"
              activeOpacity={0.8}
            >
              <MoreHorizontal size={18} color="#050505" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Error State Banner */}
        {!!error && (
          <View className="mx-4 mt-4 flex-row items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <Text className="text-[12px] text-red-600">{error}</Text>
          </View>
        )}

        {/* Details Card (Chi tiết) */}
        <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm border border-[#E4E6EB]">
          <Text className="text-[17px] font-bold text-[#050505] mb-4">Chi tiết</Text>

          <View className="mb-1">
            <DetailRow
              icon={<User size={18} color="#65676B" />}
              text={profile?.pro ? 'Thành viên VIP Member' : 'Thành viên'}
            />
            {!!profile?.working && (
              <DetailRow
                icon={<Briefcase size={18} color="#65676B" />}
                text={`Làm việc tại ${profile.working}`}
              />
            )}
            {!!profile?.address && (
              <DetailRow
                icon={<MapPin size={18} color="#65676B" />}
                text={`Sống tại ${profile.address}`}
              />
            )}
            <DetailRow
              icon={<Clock size={18} color="#65676B" />}
              text={profile?.lastSeenText ?? 'Đang hoạt động'}
            />

            {/* Followers, Following, and Points inside Details List */}
            <DetailRow
              icon={<Users size={18} color="#65676B" />}
              text={`Có ${followerCount} người theo dõi`}
            />
            <DetailRow
              icon={<UserCheck size={18} color="#65676B" />}
              text={`Đang theo dõi ${followingCount} người`}
            />
            <DetailRow
              icon={<Sparkles size={18} color="#65676B" />}
              text={`Tích lũy ${profile?.points ?? 0} điểm`}
            />
            
            {!!profile?.about && (
              <Text className="mt-2 border-t border-[#F0F2F5] pt-3 text-[14px] text-[#65676B] leading-relaxed">
                {profile.about}
              </Text>
            )}
          </View>

          {/* Facebook-style Edit Details Button */}
          <TouchableOpacity
            className="w-full h-9 bg-[#E4E6EB] rounded-lg justify-center items-center mt-3"
            activeOpacity={0.8}
          >
            <Text className="text-[14px] font-semibold text-[#050505]">
              Chỉnh sửa chi tiết công khai
            </Text>
          </TouchableOpacity>
        </View>

        {/* Friends Card (Bạn bè) */}
        <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm border border-[#E4E6EB]">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-[17px] font-bold text-[#050505]">Bạn bè</Text>
              <Text className="mt-0.5 text-[12px] text-[#65676B]">
                {followerCount} người theo dõi
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.8}>
              <Text className="text-[14px] font-semibold text-[#1877F2]">Tìm bạn bè</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap gap-2">
            {friendAvatars.map((friend, index) => (
              <View
                key={`${friend}-${index}`}
                style={{ width: FRIEND_ITEM_WIDTH, marginBottom: 12 }}
              >
                <Image
                  source={{ uri: friend }}
                  className="rounded-lg bg-slate-100"
                  style={{ width: FRIEND_ITEM_WIDTH, height: FRIEND_ITEM_WIDTH }}
                  resizeMode="cover"
                />
                <Text
                  className="mt-1.5 text-[12px] font-semibold text-[#050505]"
                  numberOfLines={1}
                >
                  {followers[index]?.name ??
                    ['Trần Văn A', 'Lê Thị B', 'Nguyễn C', 'Phạm D', 'Hoàng E'][index] ??
                    'Bạn bè'}
                </Text>
              </View>
            ))}

            {/* "See All" grid item block */}
            <TouchableOpacity
              className="items-center justify-center rounded-lg bg-[#F0F2F5]"
              style={{ width: FRIEND_ITEM_WIDTH, height: FRIEND_ITEM_WIDTH }}
              activeOpacity={0.8}
            >
              <Text className="text-[14px] font-semibold text-[#65676B]">
                +{Math.max(followerCount - friendAvatars.length, 0)}
              </Text>
              <Text className="mt-0.5 text-[10px] text-[#65676B] font-medium">
                Xem tất cả
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Facebook-style Composer Card ("Bạn đang nghĩ gì?") - Only for Own Profile */}
        {isOwnProfile && (
          <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm border border-[#E4E6EB]">
            <View className="flex-row items-center">
              <View className="h-9 w-9 overflow-hidden rounded-full bg-slate-100 mr-3 border border-slate-200">
                <Image source={{ uri: avatarUrl }} className="h-full w-full" />
              </View>
              <TouchableOpacity
                className="flex-1 h-9 rounded-full border border-[#E4E6EB] justify-center px-4 bg-slate-50"
                activeOpacity={0.8}
                onPress={() => navigation.navigate(ROUTES.CREATE_POST)}
              >
                <Text className="text-[14px] text-[#65676B]">Bạn đang nghĩ gì?</Text>
              </TouchableOpacity>
            </View>
            <View className="border-t border-[#F0F2F5] mt-3.5 pt-2.5 flex-row justify-between">
              <TouchableOpacity
                className="flex-row items-center py-1 px-2"
                onPress={() => navigation.navigate(ROUTES.CREATE_POST)}
              >
                <View className="h-4 w-4 bg-red-100 rounded-full items-center justify-center mr-2">
                  <Play size={10} color="#EF4444" fill="#EF4444" />
                </View>
                <Text className="text-[12px] font-semibold text-[#65676B]">Phát trực tiếp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center py-1 px-2"
                onPress={() => navigation.navigate(ROUTES.CREATE_POST)}
              >
                <View className="h-4 w-4 bg-green-100 rounded-full items-center justify-center mr-2">
                  <PlusCircle size={10} color="#22C55E" />
                </View>
                <Text className="text-[12px] font-semibold text-[#65676B]">Ảnh/video</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center py-1 px-2"
                onPress={() => navigation.navigate(ROUTES.CREATE_POST)}
              >
                <View className="h-4 w-4 bg-blue-100 rounded-full items-center justify-center mr-2">
                  <Sparkles size={10} color="#1877F2" />
                </View>
                <Text className="text-[12px] font-semibold text-[#65676B]">Sự kiện trong đời</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Posts Section Header */}
        <View className="mx-4 mt-4 mb-2 flex-row items-center justify-between px-1">
          <Text className="text-[17px] font-bold text-[#050505]">Bài viết</Text>
          <TouchableOpacity activeOpacity={0.8}>
            <Text className="text-[14px] font-semibold text-[#1877F2]">Quản lý</Text>
          </TouchableOpacity>
        </View>

        {/* Posts List */}
        {isPostsLoading && posts.length === 0 ? (
          <View>
            <PostSkeletonCard />
            <PostSkeletonCard />
          </View>
        ) : postsError ? (
          <View className="mx-4 mt-2 rounded-xl bg-white p-6 items-center justify-center border border-[#E4E6EB]">
            <Text className="text-[14px] font-semibold text-red-500 text-center">
              Lỗi tải bài viết: {postsError}
            </Text>
          </View>
        ) : posts.length === 0 ? (
          <View className="mx-4 mt-2 rounded-xl bg-white p-6 items-center justify-center border border-[#E4E6EB]">
            <Text className="text-[14px] font-semibold text-[#65676B]">Chưa có bài viết nào</Text>
          </View>
        ) : (
          <View>
            {posts.map(post => {
              const postPublisher = post.publisher || {};
              const postName = postPublisher.name || displayName || 'Người dùng';
              const postAvatar = postPublisher.avatarUrl || avatarUrl;

              return (
                <View
                  key={post.id}
                  className="w-full bg-white mb-2 p-4 border-t border-b border-[#E4E6EB]"
                >
                  {/* Post Header */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="h-9.5 w-9.5 overflow-hidden rounded-full bg-slate-100 mr-2.5">
                        <Image source={{ uri: postAvatar }} className="h-full w-full" />
                      </View>
                      <View>
                        <Text className="text-[14px] font-bold text-[#050505]">{postName}</Text>
                        <View className="flex-row items-center mt-0.5">
                          <Text className="text-[12px] text-[#65676B] mr-1">
                            {formatRelativeTime(post.postedAt)}
                          </Text>
                          <Globe size={11} color="#65676B" />
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity activeOpacity={0.8}>
                      <MoreHorizontal size={18} color="#65676B" />
                    </TouchableOpacity>
                  </View>

                  {/* Post Content */}
                  {!!post.caption && (
                    <Text className="text-[14px] text-[#050505] leading-relaxed mt-3 mb-2">
                      {post.caption}
                    </Text>
                  )}

                  {/* Post Media */}
                  {post.kind === 'video' && post.videoUrl ? (
                    <View className="w-full h-[220px] bg-black rounded-lg mt-2 overflow-hidden justify-center items-center relative">
                      {!!post.thumbnailUrl && (
                        <Image
                          source={{ uri: post.thumbnailUrl }}
                          className="absolute h-full w-full opacity-60"
                          resizeMode="cover"
                        />
                      )}
                      <View className="h-12 w-12 rounded-full bg-white/30 items-center justify-center border border-white/20">
                        <Play size={20} color="#FFFFFF" fill="#FFFFFF" className="ml-1" />
                      </View>
                    </View>
                  ) : post.kind === 'text' && post.photos && post.photos.length > 0 ? (
                    <View className="mt-2">
                      {post.photos.length === 1 && (
                        <Image
                          source={{ uri: post.photos[0] }}
                          className="w-full h-[220px] rounded-lg bg-slate-100"
                          resizeMode="cover"
                        />
                      )}
                      {post.photos.length > 1 && (
                        <View className="flex-row gap-1">
                          {post.photos.slice(0, 2).map((photoUrl, idx) => (
                            <Image
                              key={`${photoUrl}-${idx}`}
                              source={{ uri: photoUrl }}
                              className="flex-1 h-[150px] rounded-lg bg-slate-100"
                              resizeMode="cover"
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  ) : null}

                  {/* Stats Divider & Row */}
                  {(post.likeCount > 0 || post.commentCount > 0) && (
                    <View className="mt-3.5 pt-2 flex-row justify-between items-center border-t border-[#F0F2F5]">
                      <View className="flex-row items-center">
                        {post.likeCount > 0 && (
                          <>
                            <View className="h-4 w-4 rounded-full bg-[#1877F2] items-center justify-center">
                              <ThumbsUp size={9} color="#FFFFFF" />
                            </View>
                            <Text className="text-[12px] text-[#65676B] ml-1.5">
                              {post.likeCount}
                            </Text>
                          </>
                        )}
                      </View>
                      <View>
                        {post.commentCount > 0 && (
                          <Text className="text-[12px] text-[#65676B]">
                            {post.commentCount} bình luận
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Post Action Buttons Row */}
                  <View className="mt-3 border-t border-[#F0F2F5] pt-1 flex-row">
                    <TouchableOpacity
                      className="flex-1 flex-row justify-center items-center py-2"
                      activeOpacity={0.8}
                      onPress={() => handleToggleLike(post)}
                    >
                      <ThumbsUp
                        size={16}
                        color={post.isLiked ? '#1877F2' : '#65676B'}
                      />
                      <Text
                        className="ml-1.5 text-[13px] font-bold"
                        style={{ color: post.isLiked ? '#1877F2' : '#65676B' }}
                      >
                        Thích
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-1 flex-row justify-center items-center py-2"
                      activeOpacity={0.8}
                    >
                      <MessageCircle size={16} color="#65676B" />
                      <Text className="ml-1.5 text-[13px] font-bold text-[#65676B]">
                        Bình luận
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-1 flex-row justify-center items-center py-2"
                      activeOpacity={0.8}
                    >
                      <Share2 size={16} color="#65676B" />
                      <Text className="ml-1.5 text-[13px] font-bold text-[#65676B]">
                        Chia sẻ
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default ProfileScreen;
