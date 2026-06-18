// Description: Shows the full friends list for a profile with API-backed data.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  BadgeCheck,
  Search,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import type { UserProfile } from '../../../user/domain/types/user.types';
import { createUserRepository } from '../../../user/infrastructure/repositories/ApiUserRepository';

type ProfileFriendsRoute = RouteProp<
  RootStackParamList,
  typeof ROUTES.PROFILE_FRIENDS
>;
type ProfileFriendsNavigation = NativeStackNavigationProp<RootStackParamList>;

const FRIENDS_PAGE_SIZE = 30;
const FALLBACK_AVATAR = 'https://demo.vnseea.vn/themes/wowonder/img/default-avatar.png';
const ANIMATED_CARD_COUNT = 12;

const FRIENDS_COPY = {
  vi: {
    title: 'B\u1ea1n b\u00e8',
    subtitle: (count: number) => `${count} ng\u01b0\u1eddi trong danh s\u00e1ch`,
    searchPlaceholder: 'T\u00ecm theo t\u00ean ho\u1eb7c username',
    emptyTitle: 'Ch\u01b0a c\u00f3 b\u1ea1n b\u00e8 \u0111\u1ec3 hi\u1ec3n th\u1ecb',
    emptyDescription: 'Khi ng\u01b0\u1eddi d\u00f9ng c\u00f3 b\u1ea1n b\u00e8 ho\u1eb7c ng\u01b0\u1eddi theo d\u00f5i, danh s\u00e1ch s\u1ebd xu\u1ea5t hi\u1ec7n \u1edf \u0111\u00e2y.',
    emptySearchTitle: 'Kh\u00f4ng t\u00ecm th\u1ea5y ng\u01b0\u1eddi ph\u00f9 h\u1ee3p',
    retry: 'T\u1ea3i l\u1ea1i',
    viewProfile: 'Xem h\u1ed3 s\u01a1',
  },
  en: {
    title: 'Friends',
    subtitle: (count: number) => `${count} people in this list`,
    searchPlaceholder: 'Search by name or username',
    emptyTitle: 'No friends to show yet',
    emptyDescription: 'Friends and followers for this profile will appear here.',
    emptySearchTitle: 'No matching people found',
    retry: 'Retry',
    viewProfile: 'View profile',
  },
} as const;

const userRepository = createUserRepository();

function getUserKey(user: UserProfile) {
  return String(user.id ?? user.username ?? user.name ?? '');
}

function mergeUniqueUsers(...lists: UserProfile[][]) {
  const seen = new Set<string>();
  const merged: UserProfile[] = [];

  lists.flat().forEach(user => {
    const key = getUserKey(user);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(user);
  });

  return merged;
}

function matchesQuery(user: UserProfile, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [user.name, user.username, user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalized);
}

function FriendSkeletonGrid() {
  return (
    <View className="flex-row flex-wrap gap-3 px-4 pt-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <View
          key={`friend-skeleton-${index}`}
          className="flex-1 rounded-[24px] border border-slate-100 bg-white p-4"
          style={{ minWidth: '47%' }}
        >
          <View className="h-20 w-20 self-center rounded-full bg-slate-100" />
          <View className="mt-4 h-4 w-24 self-center rounded-full bg-slate-100" />
          <View className="mt-2 h-3 w-16 self-center rounded-full bg-slate-100" />
          <View className="mt-4 h-9 rounded-full bg-slate-100" />
        </View>
      ))}
    </View>
  );
}

export default function ProfileFriendsScreen() {
  const navigation = useNavigation<ProfileFriendsNavigation>();
  const route = useRoute<ProfileFriendsRoute>();
  const language = useAppLanguage();
  const copy = FRIENDS_COPY[language];
  const { userId, title, initialFriends } = route.params;

  const [friends, setFriends] = useState<UserProfile[]>(
    mergeUniqueUsers(initialFriends ?? []),
  );
  const [followersOffset, setFollowersOffset] = useState(0);
  const [followingOffset, setFollowingOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const headerTranslateY = useSharedValue(-28);
  const headerOpacity = useSharedValue(0);

  useEffect(() => {
    headerTranslateY.value = withTiming(0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
    headerOpacity.value = withTiming(1, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [headerOpacity, headerTranslateY]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const displayFriends = useMemo(
    () => friends.filter(friend => matchesQuery(friend, query)),
    [friends, query],
  );

  const loadFriends = useCallback(
    async (mode: 'initial' | 'refresh' | 'more' = 'initial') => {
      if (!userId) return;
      if (mode === 'more') {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
      } else if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      const nextFollowersOffset = mode === 'more' ? followersOffset : 0;
      const nextFollowingOffset = mode === 'more' ? followingOffset : 0;

      try {
        const result = await userRepository.getFriends({
          userId,
          type: ['followers', 'following'],
          limit: FRIENDS_PAGE_SIZE,
          followersOffset: nextFollowersOffset,
          followingOffset: nextFollowingOffset,
        });

        const incoming = mergeUniqueUsers(result.followers, result.following);
        setFriends(prev =>
          mode === 'more' ? mergeUniqueUsers(prev, incoming) : incoming,
        );
        setFollowersOffset(nextFollowersOffset + result.followers.length);
        setFollowingOffset(nextFollowingOffset + result.following.length);
        setHasMore(
          result.followers.length >= FRIENDS_PAGE_SIZE ||
            result.following.length >= FRIENDS_PAGE_SIZE,
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : String(caughtError),
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [followersOffset, followingOffset, hasMore, isLoadingMore, userId],
  );

  useEffect(() => {
    loadFriends('initial');
    // This effect is intentionally keyed by route user only. Pagination
    // offsets are owned by load-more calls, not the first screen fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(ROUTES.PROFILE, { userId });
  }, [navigation, userId]);

  const handleOpenProfile = useCallback(
    (friendId: string) => {
      navigation.navigate(ROUTES.PROFILE, { userId: friendId });
    },
    [navigation],
  );

  const renderFriend = useCallback(
    ({ item }: { item: UserProfile }) => {
      const name = item.name || item.username || copy.title;
      const username = item.username ? `@${item.username}` : '';
      return (
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => handleOpenProfile(String(item.id))}
          className="flex-1 rounded-[24px] border border-[#E4E6EB] bg-white p-4"
          style={{
            flex: 0.5,
            minWidth: '46%',
            maxWidth: '48.5%',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.03,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View className="self-center">
            <Image
              source={{ uri: item.avatarUrl || FALLBACK_AVATAR }}
              className="h-20 w-20 rounded-full bg-slate-100"
              resizeMode="cover"
            />
            <View className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
          </View>

          <View className="mt-3 flex-row items-center justify-center">
            <Text
              className="max-w-[112px] text-center text-[15px] font-extrabold text-slate-950"
              numberOfLines={1}
            >
              {name}
            </Text>
            {item.verified ? (
              <View className="ml-1">
                <BadgeCheck size={16} color="#1877f2" fill="#1877f2" />
              </View>
            ) : null}
          </View>
          {username ? (
            <Text
              className="mt-1 text-center text-[12px] font-semibold text-slate-500"
              numberOfLines={1}
            >
              {username}
            </Text>
          ) : null}

          <View className="mt-4 min-h-[38px] flex-row items-center justify-center rounded-xl bg-[#E7F3FF] px-3 active:bg-[#D0E8FF]">
            <User size={15} color="#1877f2" />
            <Text className="ml-2 text-[13px] font-bold text-[#1877f2]">
              {copy.viewProfile}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [copy.title, copy.viewProfile, handleOpenProfile],
  );

  const ListEmpty = useMemo(() => {
    if (isLoading && friends.length === 0) {
      return <FriendSkeletonGrid />;
    }

    return (
      <View className="items-center px-8 py-16">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-indigo-50">
          {query.trim() ? (
            <Search size={34} color="#0000ff" />
          ) : (
            <Sparkles size={34} color="#0000ff" />
          )}
        </View>
        <Text className="mt-4 text-center text-[17px] font-extrabold text-slate-900">
          {query.trim() ? copy.emptySearchTitle : copy.emptyTitle}
        </Text>
        {!query.trim() ? (
          <Text className="mt-2 text-center text-[13px] font-semibold leading-5 text-slate-500">
            {error || copy.emptyDescription}
          </Text>
        ) : null}
        {!query.trim() ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => loadFriends('refresh')}
            className="mt-5 min-h-[42px] items-center justify-center rounded-full bg-[#0000ff] px-6"
          >
            <Text className="text-[14px] font-extrabold text-white">
              {copy.retry}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [copy, error, friends.length, isLoading, loadFriends, query]);

  const ListFooter = useMemo(() => {
    if (!isLoadingMore) return <View className="h-6" />;
    return (
      <View className="items-center py-5">
        <ActivityIndicator color="#0000ff" />
      </View>
    );
  }, [isLoadingMore]);

  return (
    <SafeAreaView className="flex-1 bg-[#F0F2F5]" edges={['top', 'left', 'right']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      <Animated.View
        style={headerStyle}
        className="border-b border-[#E4E6EB] bg-white px-4 pb-4 pt-2"
      >
        <View className="min-h-[52px] flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="h-11 w-11 items-center justify-center rounded-full bg-slate-100/80"
          >
            <ArrowLeft size={23} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1 items-center px-2">
            <Text
              className="text-[21px] font-extrabold text-slate-950"
              numberOfLines={1}
            >
              {title || copy.title}
            </Text>
            <Text className="mt-0.5 text-[12px] font-semibold text-[#65676B]">
              {copy.subtitle(friends.length)}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            className="h-11 w-11 items-center justify-center rounded-full bg-[#E7F3FF]"
          >
            <UserPlus size={22} color="#1877F2" />
          </TouchableOpacity>
        </View>

        <View className="mt-3 min-h-[48px] flex-row items-center rounded-full bg-[#F0F2F5] px-4">
          <Search size={20} color="#65676B" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={copy.searchPlaceholder}
            placeholderTextColor="#8E9094"
            className="ml-3 flex-1 text-[15px] font-normal text-slate-900"
            autoCorrect={false}
          />
        </View>
      </Animated.View>

      <FlatList
        data={displayFriends}
        keyExtractor={item => getUserKey(item)}
        renderItem={renderFriend}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 34,
          gap: 12,
        }}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadFriends('refresh')}
            tintColor="#0000ff"
            colors={['#0000ff']}
            progressBackgroundColor="#ffffff"
          />
        }
        onEndReached={() => {
          if (!query.trim()) {
            loadFriends('more');
          }
        }}
        onEndReachedThreshold={0.45}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}
