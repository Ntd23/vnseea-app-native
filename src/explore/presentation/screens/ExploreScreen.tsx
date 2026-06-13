// Description: Explore / Hashtags screen that lists trending hashtags and opens their post detail feed.
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';
import {
  AlertCircle,
  ArrowLeft,
  Hash,
  Search,
  TrendingUp,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { tabBarVisibility } from '../../../navigation/tabBarVisibility';
import {
  EXPLORE_TABS,
  useExploreViewModel,
} from '../../application/view-models/useExploreViewModel';
import type { TrendingHashtag } from '../../domain/types/explore.types';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import type {
  FeedPost,
  FeedTextPost,
} from '../../../feed/domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { TextPostCard } from '../../../feed/presentation/screens/FeedScreen';
import HashtagCard from '../components/HashtagCard';
import HashtagSkeleton from '../components/HashtagSkeleton';
import HashtagTabs from '../components/HashtagTabs';
import StatPill from '../components/StatPill';

const BRAND = '#0000ff';
const feedRepository = createFeedRepository();

type ExploreNav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Compact, Vietnamese-friendly counter for the StatPill row.
 *   330000 → "330K", 1500000 → "1.5M". Mirrors `formatCompactCount`
 *   inside HashtagCard so the two stay in lock-step.
 */
function formatCountVi(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) {
    const value = n / 1000;
    const rounded = Math.round(value * 10) / 10;
    return `${
      Number.isInteger(rounded)
        ? rounded
        : rounded.toFixed(1).replace(/\.0$/, '')
    }K`;
  }
  if (n < 1_000_000_000) {
    const value = n / 1_000_000;
    const rounded = Math.round(value * 10) / 10;
    return `${
      Number.isInteger(rounded)
        ? rounded
        : rounded.toFixed(1).replace(/\.0$/, '')
    }M`;
  }
  return `${Math.round(n / 1_000_000_000)}B`;
}

function ExploreScreen() {
  const navigation = useNavigation<ExploreNav>();
  const {
    tags,
    isLoading,
    isRefreshing,
    error,
    activeTab,
    setActiveTab,
    reload,
    stats,
  } = useExploreViewModel();

  const lastScrollY = useRef(0);
  const [selectedHashtag, setSelectedHashtag] =
    useState<TrendingHashtag | null>(null);
  const [hashtagPosts, setHashtagPosts] = useState<FeedTextPost[]>([]);
  const [isHashtagLoading, setIsHashtagLoading] = useState(false);
  const [isHashtagRefreshing, setIsHashtagRefreshing] = useState(false);
  const [hashtagError, setHashtagError] = useState<string | null>(null);

  // Hide the bottom tab bar when scrolling down, show on scroll up —
  // matches the pattern the previous mock screen used (kept here so the
  // real-data screen doesn't regress on UX).
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const diff = currentY - lastScrollY.current;
      if (currentY <= 50) {
        tabBarVisibility.setVisible(true);
      } else if (diff > 15) {
        tabBarVisibility.setVisible(false);
      } else if (diff < -15) {
        tabBarVisibility.setVisible(true);
      }
      lastScrollY.current = currentY;
    },
    [],
  );

  const loadHashtagPosts = useCallback(
    async (hashtag: TrendingHashtag, refresh = false) => {
      if (refresh) {
        setIsHashtagRefreshing(true);
      } else {
        setIsHashtagLoading(true);
      }
      setHashtagError(null);

      try {
        const posts = await feedRepository.getHashtagPosts(hashtag.tag, 20);
        setHashtagPosts(posts);
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : 'Không thể tải bài viết của hashtag này.';
        setHashtagError(message);
      } finally {
        setIsHashtagLoading(false);
        setIsHashtagRefreshing(false);
      }
    },
    [],
  );

  const handleHashtagPress = useCallback(
    (hashtag: TrendingHashtag) => {
      setSelectedHashtag(hashtag);
      setHashtagPosts([]);
      void loadHashtagPosts(hashtag);
    },
    [loadHashtagPosts],
  );

  const handleBackToHashtags = useCallback(() => {
    setSelectedHashtag(null);
    setHashtagPosts([]);
    setHashtagError(null);
    tabBarVisibility.setVisible(true);
  }, []);

  const handleRefreshHashtag = useCallback(() => {
    if (selectedHashtag) {
      void loadHashtagPosts(selectedHashtag, true);
    }
  }, [loadHashtagPosts, selectedHashtag]);

  const navigateToProfile = useCallback(
    (userId: string) => {
      navigation.navigate(ROUTES.PROFILE, { userId });
    },
    [navigation],
  );

  const handlePostPress = useCallback(
    (post: FeedPost) => {
      navigation.navigate(ROUTES.POST_DETAIL, {
        postId: post.id,
        post,
      });
    },
    [navigation],
  );

  const handleCommentTap = useCallback(
    (postId: string) => {
      navigation.navigate(ROUTES.POST_DETAIL, { postId });
    },
    [navigation],
  );

  const handlePhotoPress = useCallback(
    (post: FeedTextPost) => {
      handlePostPress(post);
    },
    [handlePostPress],
  );

  const handleNoopReact = useCallback(
    (_postId: string, _reaction: ReactionType) => {},
    [],
  );
  const handleNoopOpenPicker = useCallback(
    (_postId: string, _x: number, _y: number) => {},
    [],
  );

  const renderItem = useCallback<ListRenderItem<TrendingHashtag>>(
    ({ item, index }) => (
      <HashtagCard hashtag={item} index={index} onPress={handleHashtagPress} />
    ),
    [handleHashtagPress],
  );

  const keyExtractor = useCallback((item: TrendingHashtag) => item.id, []);
  const postKeyExtractor = useCallback((item: FeedTextPost) => item.id, []);

  const renderHashtagPost = useCallback<ListRenderItem<FeedTextPost>>(
    ({ item }) => (
      <TextPostCard
        post={item}
        onReact={handleNoopReact}
        onOpenPicker={handleNoopOpenPicker}
        onCommentTap={handleCommentTap}
        onPhotoPress={handlePhotoPress}
        navigateToProfile={navigateToProfile}
        onPostPress={handlePostPress}
      />
    ),
    [
      handleCommentTap,
      handleNoopOpenPicker,
      handleNoopReact,
      handlePhotoPress,
      handlePostPress,
      navigateToProfile,
    ],
  );

  const ListHeader = (
    <View>
      {/* Stat pills row */}
      <View className="mb-4 flex-row gap-3">
        <StatPill
          Icon={TrendingUp}
          value={formatCountVi(stats.totalPosts)}
          label="Bài viết thịnh hành"
        />
        <StatPill
          Icon={Hash}
          value={formatCountVi(stats.totalHashtags)}
          label="Hashtag đang theo dõi"
          brandTint
        />
      </View>

      {/* Tabs row */}
      <View className="mb-4">
        <HashtagTabs
          tabs={EXPLORE_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </View>

      {/* Inline error banner — non-blocking, keeps the skeleton out
          so the user can still see whatever was last loaded. */}
      {error && (
        <View
          className="mb-3 flex-row items-center rounded-2xl border border-[#ef4444]/30 bg-[#fef2f2] p-3"
          accessibilityLiveRegion="polite"
        >
          <AlertCircle size={18} color="#ef4444" strokeWidth={2.2} />
          <Text className="ml-2 flex-1 text-caption-primary text-[#b91c1c]">
            {error}
          </Text>
          <TouchableOpacity
            onPress={reload}
            className="ml-2 rounded-full bg-white/70 px-3 py-1"
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text className="text-caption-primary text-[#b91c1c]">Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const ListEmpty = !isLoading ? (
    <View className="items-center justify-center px-6 py-12">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-[#0000ff]/8">
        <Hash size={28} color={BRAND} strokeWidth={2} />
      </View>
      <Text className="mt-4 text-title-primary text-center">
        Chưa có hashtag nào
      </Text>
      <Text className="mt-2 text-body-secondary text-center">
        Hiện chưa có chủ đề thịnh hành nào để hiển thị. Quay lại sau nhé.
      </Text>
      <TouchableOpacity
        onPress={reload}
        className="btn-primary mt-5"
        activeOpacity={0.9}
      >
        <Text className="text-caption-primary text-inverse">Thử lại</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const HashtagPostEmpty = !isHashtagLoading ? (
    <View className="items-center justify-center px-6 py-16">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-[#0000ff]/8">
        <Hash size={28} color={BRAND} strokeWidth={2} />
      </View>
      <Text className="mt-4 text-title-primary text-center">
        Chưa có bài viết
      </Text>
      <Text className="mt-2 text-body-secondary text-center">
        Hashtag này hiện chưa có bài viết nào để hiển thị.
      </Text>
      {hashtagError ? (
        <Text className="mt-3 text-caption-primary text-center text-[#b91c1c]">
          {hashtagError}
        </Text>
      ) : null}
      <TouchableOpacity
        onPress={handleRefreshHashtag}
        className="btn-primary mt-5"
        activeOpacity={0.9}
      >
        <Text className="text-caption-primary text-inverse">Thử lại</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  if (selectedHashtag) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND} />

        <View className="surface-brand h-14 flex-row items-center justify-between px-4">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={handleBackToHashtags}
            accessibilityLabel="Quay lại danh sách hashtag"
          >
            <ArrowLeft size={23} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
          <Text className="text-title-primary text-inverse" numberOfLines={1}>
            #{selectedHashtag.tag}
          </Text>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() =>
              navigation.navigate(ROUTES.SEARCH, {
                q: `#${selectedHashtag.tag}`,
              })
            }
            accessibilityLabel="Mở tìm kiếm"
          >
            <Search size={21} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={isHashtagLoading ? [] : hashtagPosts}
          renderItem={renderHashtagPost}
          keyExtractor={postKeyExtractor}
          contentContainerClassName="px-4 pb-28 pt-4"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          ListHeaderComponent={
            hashtagError && hashtagPosts.length > 0 ? (
              <View
                className="mb-3 flex-row items-center rounded-2xl border border-[#ef4444]/30 bg-[#fef2f2] p-3"
                accessibilityLiveRegion="polite"
              >
                <AlertCircle size={18} color="#ef4444" strokeWidth={2.2} />
                <Text className="ml-2 flex-1 text-caption-primary text-[#b91c1c]">
                  {hashtagError}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            isHashtagLoading ? (
              <View className="items-center justify-center py-16">
                <ActivityIndicator color={BRAND} />
              </View>
            ) : (
              HashtagPostEmpty
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isHashtagRefreshing}
              onRefresh={handleRefreshHashtag}
              tintColor={BRAND}
              colors={[BRAND]}
              progressViewOffset={8}
            />
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header — gradient brand bar */}
      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <View className="h-10 w-10 items-center justify-center rounded-full">
          <Hash size={23} color="#FFFFFF" strokeWidth={2.2} />
        </View>
        <Text className="text-title-primary text-inverse">Hashtags</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.navigate(ROUTES.SEARCH)}
          accessibilityLabel="Mở tìm kiếm"
        >
          <Search size={21} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={isLoading ? [] : tags}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerClassName="px-4 pb-28 pt-4"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        ListHeaderComponent={isLoading ? null : ListHeader}
        ListEmptyComponent={
          isLoading ? <HashtagSkeleton count={4} /> : ListEmpty
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={reload}
            tintColor={BRAND}
            colors={[BRAND]}
            progressViewOffset={8}
          />
        }
      />
    </SafeAreaView>
  );
}

// Mark this file as a re-render boundary for React DevTools.
const MemoExploreScreen = React.memo(ExploreScreen);
export default MemoExploreScreen;
