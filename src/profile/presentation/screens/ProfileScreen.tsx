// Description: Renders the Facebook-style profile screen with user-backed API data.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
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
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useProfileViewModel } from '../../application/view-models/useProfileViewModel';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import { useFeedCommentsViewModel } from '../../../feed/application/view-models/useFeedCommentsViewModel';
import {
  HomeVideoPostCard,
  PhotoViewerModal,
  ReactionPickerOverlay,
  TextPostCard,
  type PhotoViewerState,
} from '../../../feed/presentation/screens/FeedScreen';
import { PollPostCard } from '../../../feed/presentation/components/PollPostCard';
import { createPollRepository } from '../../../poll/infrastructure/repositories/ApiPollRepository';
import { createStoriesRepository } from '../../../stories/infrastructure/repositories/ApiStoriesRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { ShareActionSheet } from '../../../shared-kernel/presentation/components/ShareActionSheet';
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
const PROFILE_STORY_MAX_AGE_SECONDS = 24 * 60 * 60;
const PROFILE_POST_PAGE_SIZE = 20;

const FALLBACK_COVER =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCNqLNeeWsi7Qk4abx08XCTrKI5CmUGgDCiX-kH7Y_8LIIX5Slo9GRgEra_4deGp5e9pYozUmQdYGZi1sNQSks0QtbNWgpmn5gJgrF62Z8I8UMQpqKiMHLQ8Rzd9oUUIITFJPuwExVflVdeB1fRKjSGDO7zAocaZElLgpqJr6Mjvoj2FKOUVfnTk8XxnkG5WNijLpmXavW9TFlNhtlfLYbSE2qofOA8or7d_AfsUWZV43ADdtVFNH7VwEEazqapaL-Vndqksu_vDnE';
const FALLBACK_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBg12HbWQ9COz6EW-AyHRwh6TTRPdTun5HWxmzi1GHtkTwHjsF2VhXQV6yg-mCV0YYTXBDcEOCpZdcTGiCK1PpdUNPDQs6XTApo0nb_7Vi7IJPOfkXwbA1cq6d18Fft2V5ELBI4ZKLT6lvpj4O-9EBj3u3QfGt-Dzy_wf-DNRLwVAEeuaiEJ4B2Fvch4B0S9tk5tMCvbYQwuzGl0ttLC2hVIJh1Oj6Dn4dp6ueFANa1Yxy__ZIQLHKmtsMh2U8NBz0DLPHRlOZOzF4';
const FALLBACK_FRIENDS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD1ieW2j4f-Xpi2IQaTOfhldZV_bq_cxNC3J8YvwLIMj3JoQf59xE_k7gRHQjjfMpGvfe3N9VNdzWDpAJ-EaJMQZhPXHulWgUWPbW4p7bHmW8OCX3bQIQjt8Qa3T5sb48Em_nnY7VjvCY9Heq0Pf628HeYvVWT_YM5vqrvie_uqkbTUIvDtIe0FeZycbHduWhd6UbIZM7YqZ2FRIhIsQZgSiH0JCdMCHho07QUOFTmuK8RExLIncYMPS2HCsqjehGsRdnDzIx7Ybrw',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDLWS5tf0Fpf1ZFDA8P_g7Gl6UFYvTeEdbq0rTHTrnIJFduAXKiZilywPSKobKVJmePltF4AL3UzBkk86bs_-nCNz21jwD7bIY4qdP0TW7-e8IaeD7K_I1_x9z7CY766cwG1ylT91GzYqnWsS4RT8sCyL7FGgLp9PgrttHr18EyTTnJ5q9ohUrT9wLqxfikI6VjZ3R7Yt0S1ii4gM3UjuX0GR4JJeQj7M6QJI_vyBu-PAzJn0IF7i4EFtXmnRSAjppkw1CfWjMcuVE',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDBM__UehaAgiDA9uC3Kw8OPZ3kYz67EbNRd0wutGdRStdNAQuO0bto9DiVW1VWK8Yedmg9NDq7gtlhaK1r-06a7Da1fs5flP275bMscPfGbnGLhLuJ4AvhV57akqf3YcT1OuEZ8ec6CzJxl9QXZpFcb2iJ5XcAwJcy4PfAo3-wMa2kEGtv108qFxXFyCnHe38B1ei1Jrx-dxSsVshOyAE4UluTEh_assYq9hyzWTJa2d71vIxqOp-U1-5oh8O1wKYT0Kivx75ge0U',
];

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
    borderRadius: 14,
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
    borderRadius: 14,
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
    borderRadius: 20,
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
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E6EB',
    backgroundColor: '#F0F2F5',
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
    borderRadius: 14,
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
    borderRadius: 20,
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
  const {
    profile,
    followers,
    following,
    isLoading,
    error,
    loadProfile,
    toggleFollow,
    pokeUser,
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

  const [posts, setPosts] = useState<ProfileFeedPost[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [postsCursor, setPostsCursor] = useState<string | undefined>(undefined);
  const isLoadingMorePostsRef = React.useRef(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [userStory, setUserStory] = useState<StoryItem | null>(null);
  const [isStoryLoading, setIsStoryLoading] = useState(false);
  const [isConnectLoading, setIsConnectLoading] = useState(false);
  const [isPokeLoading, setIsPokeLoading] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<PhotoViewerState>(null);
  const [pickerAnchor, setPickerAnchor] = useState<{
    postId: string;
    x: number;
    y: number;
  } | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
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
      setIsStoryLoading(false);
      return;
    }

    let cancelled = false;
    setUserStory(null);
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
      })
      .catch(() => {
        if (!cancelled) {
          setUserStory(null);
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
  const friendAvatars =
    followers.length > 0
      ? followers.slice(0, 5).map(friend => friend.avatarUrl ?? FALLBACK_AVATAR)
      : FALLBACK_FRIENDS;
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
      Alert.alert('Lỗi', 'Không thể cập nhật cảm xúc. Vui lòng thử lại.');
    }
  }, [feedRepo]);

  const handleOpenPicker = useCallback((postId: string, x: number, y: number) => {
    setPickerAnchor({ postId, x, y });
  }, []);

  const handlePickReaction = useCallback((reaction: ReactionType) => {
    if (!pickerAnchor) return;
    handleSetPostReaction(pickerAnchor.postId, reaction);
  }, [handleSetPostReaction, pickerAnchor]);

  const handlePhotoPress = useCallback((post: FeedTextPost, initialIndex: number) => {
    setPhotoViewer({ post, initialIndex });
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
      Alert.alert('Lỗi', 'Không thể gửi phiếu bầu. Vui lòng thử lại.');
    }
  }, [pollRepo]);

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
            text: 'Hủy',
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
      name: displayName || profile?.username || 'Người dùng',
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
      Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn. Vui lòng thử lại.');
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
      Alert.alert('Đã chọc', `Bạn đã chọc ${displayName || 'người dùng này'}.`);
    } catch (caughtError) {
      console.error('[ProfileScreen] Failed to poke user:', caughtError);
      Alert.alert('Lỗi', 'Không thể chọc người dùng này lúc này.');
    } finally {
      setIsPokeLoading(false);
    }
  };

  if (isLoading && !profile) {
    return <FullProfileSkeleton />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
        onScroll={handleProfileScroll}
        scrollEventThrottle={240}
      >
        {/* Profile Header Area (Cover Image, Avatar, Profile Info, Buttons) */}
        <View className="bg-white pb-5 shadow-sm">
          {/* Cover Photo */}
          <View className="relative w-full" style={{ height: 210 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleCoverPress}
              style={{ width: SCREEN_WIDTH, height: 210 }}
            >
              <Image
                source={{ uri: coverUrl }}
                className="h-full w-full"
                style={{ width: SCREEN_WIDTH }}
                resizeMode="cover"
              />
            </TouchableOpacity>

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
              onPress={handleCoverPress}
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
            {isOwnProfile ? (
              <>
                <TouchableOpacity
                  className="h-[38px] flex-1 flex-row items-center justify-center rounded-lg bg-[#1877F2] px-4"
                  activeOpacity={0.8}
                  onPress={handleOpenDashboard}
                >
                  <Briefcase size={16} color="#FFFFFF" />
                  <Text className="ml-1.5 text-[14px] font-bold text-white">
                    Bảng điều khiển
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-[38px] flex-1 flex-row items-center justify-center rounded-lg bg-[#E4E6EB] px-4"
                  activeOpacity={0.8}
                  onPress={handleCreateStory}
                >
                  <PlusCircle size={16} color="#050505" />
                  <Text className="ml-1.5 text-[14px] font-bold text-[#050505]">
                    Thêm vào tin
                  </Text>
                </TouchableOpacity>
              </>
            ) : isFriendProfile ? (
              <>
                <TouchableOpacity
                  className="h-[38px] flex-1 flex-row items-center justify-center rounded-lg bg-[#E4E6EB] px-4"
                  activeOpacity={0.8}
                >
                  <UserCheck size={16} color="#050505" />
                  <Text className="ml-1.5 text-[14px] font-bold text-[#050505]">
                    Đã theo dõi
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-[38px] flex-1 flex-row items-center justify-center rounded-lg bg-[#1877F2] px-4"
                  activeOpacity={0.8}
                  onPress={handleOpenMessages}
                >
                  <MessageCircle size={16} color="#FFFFFF" />
                  <Text className="ml-1.5 text-[14px] font-bold text-white">
                    Nhắn tin
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-[38px] w-[82px] flex-row items-center justify-center rounded-lg bg-[#E4E6EB]"
                  activeOpacity={0.8}
                  disabled={isPokeLoading}
                  onPress={handlePokeUser}
                >
                  <Sparkles size={15} color="#050505" />
                  <Text className="ml-1 text-[13px] font-bold text-[#050505]">
                    Chọc
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  className={`h-[38px] flex-1 flex-row items-center justify-center rounded-lg px-4 ${
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
                      ? 'Đã gửi yêu cầu'
                      : isConnectLoading
                        ? 'Đang gửi...'
                        : 'Theo dõi'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-[38px] flex-1 flex-row items-center justify-center rounded-lg bg-[#E4E6EB] px-4"
                  activeOpacity={0.8}
                  onPress={handleOpenMessages}
                >
                  <MessageCircle size={16} color="#050505" />
                  <Text className="ml-1.5 text-[14px] font-bold text-[#050505]">
                    Nhắn tin
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {shouldShowStorySection && (
          <View style={profileStoryStyles.section}>
            <View style={profileStoryStyles.headerRow}>
              <Text style={profileStoryStyles.title}>Tin</Text>
              {!!userStory && (
                <Text style={profileStoryStyles.countText}>
                  {storySegmentCount} đoạn tin
                </Text>
              )}
            </View>

            {isStoryLoading && !userStory ? (
              <View style={profileStoryStyles.skeletonRow}>
                {[0, 1].map(item => (
                  <View key={`story-skeleton-${item}`} style={profileStoryStyles.skeletonCard}>
                    <SkeletonBlock height={116} width={112} borderRadius={0} />
                    <View style={profileStoryStyles.skeletonFooter}>
                      <SkeletonBlock height={10} width={68} borderRadius={5} />
                      <View style={{ marginTop: 7 }}>
                        <SkeletonBlock height={10} width={48} borderRadius={5} />
                      </View>
                    </View>
                    <View style={profileStoryStyles.skeletonAvatar}>
                      <SkeletonBlock height={32} width={32} borderRadius={16} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={profileStoryStyles.row}
              >
                {!!userStory && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={profileStoryStyles.card}
                    onPress={handleOpenStory}
                  >
                    <Image
                      source={{ uri: storyPreviewUrl }}
                      style={profileStoryStyles.cover}
                      resizeMode="cover"
                    />
                    <View style={profileStoryStyles.overlay} />
                    <View
                      style={[
                        profileStoryStyles.ring,
                        {
                          borderColor:
                            userStory.hasUnseen && !userStory.isViewed
                              ? '#1877F2'
                              : '#CBD5E1',
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: userStory.publisher.avatarUrl || avatarUrl }}
                        style={profileStoryStyles.avatar}
                        resizeMode="cover"
                      />
                    </View>
                    {storySegmentCount > 1 && (
                      <View style={profileStoryStyles.badge}>
                        <Text style={profileStoryStyles.badgeText}>
                          {storySegmentCount}
                        </Text>
                      </View>
                    )}
                    {storyHasVideo && (
                      <View style={profileStoryStyles.playBadge}>
                        <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                      </View>
                    )}
                    <Text style={profileStoryStyles.label} numberOfLines={2}>
                      Xem tin
                    </Text>
                  </TouchableOpacity>
                )}

                {isOwnProfile && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={profileStoryStyles.createCard}
                    onPress={handleCreateStory}
                  >
                    <Image
                      source={{ uri: avatarUrl }}
                      style={profileStoryStyles.createAvatar}
                      resizeMode="cover"
                    />
                    <View style={profileStoryStyles.createBody}>
                      <View style={profileStoryStyles.createPlus}>
                        <PlusCircle size={18} color="#FFFFFF" />
                      </View>
                      <Text style={profileStoryStyles.createText}>Tạo tin</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        )}

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
          <View style={profilePostStyles.stateCard}>
            <Text style={[profilePostStyles.stateText, { color: '#EF4444' }]}>
              Lỗi tải bài viết: {postsError}
            </Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={profilePostStyles.stateCard}>
            <Text style={profilePostStyles.stateText}>Chưa có bài viết nào</Text>
          </View>
        ) : (
          <View>
            {posts.map(post => {
              if (post.kind === 'video') {
                return (
                  <HomeVideoPostCard
                    key={`video-${post.id}`}
                    post={post}
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
          onClose={() => setPhotoViewer(null)}
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
      </View>
    </GestureHandlerRootView>
  );
}

export default ProfileScreen;
