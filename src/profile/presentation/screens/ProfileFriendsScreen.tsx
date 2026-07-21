// Description: Shows tabbed followers, following, and mutual connections for a profile.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  InteractionManager,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView, {
  type PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view';
import {
  ArrowLeft,
  BadgeCheck,
  MessageCircle,
  MoreHorizontal,
  Search,
  UserMinus,
  UserPlus,
  UserRoundX,
  X,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { showSnackbar } from '../../../shared-kernel/presentation/components/Snackbar';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import type { ChatItem } from '../../../messages/domain/types/messages.types';
import type { UserProfile } from '../../../user/domain/types/user.types';
import { createUserRepository } from '../../../user/infrastructure/repositories/ApiUserRepository';
import { getProfileConnectionsSnapshot } from '../../application/cache/profileConnectionsSnapshot';

type ProfileFriendsRoute = RouteProp<
  RootStackParamList,
  typeof ROUTES.PROFILE_FRIENDS
>;
type ProfileFriendsNavigation = NativeStackNavigationProp<RootStackParamList>;
type ConnectionTab = 'followers' | 'following' | 'friends';

const CONNECTIONS_PAGE_SIZE = 30;
const CONNECTION_TABS: ConnectionTab[] = [
  'followers',
  'following',
  'friends',
];
const FALLBACK_AVATAR =
  'https://demo.vnseea.vn/themes/wowonder/img/default-avatar.png';

const CONNECTIONS_COPY = {
  vi: {
    fallbackTitle: 'Kết nối',
    followers: 'Người theo dõi',
    following: 'Đang theo dõi',
    friends: 'Bạn bè',
    followersCount: (count: number) => `${count} người theo dõi`,
    followingCount: (count: number) => `Đang theo dõi ${count} người`,
    friendsCount: (count: number) => `${count} bạn bè`,
    searchPlaceholder: 'Tìm kiếm trong danh sách',
    empty: 'Chưa có người dùng nào trong danh sách này.',
    emptySearch: 'Không tìm thấy người dùng phù hợp.',
    retry: 'Tải lại',
    follow: 'Theo dõi',
    followBack: 'Theo dõi lại',
    message: (name: string) => `Nhắn tin cho ${name}`,
    unfollow: (name: string) => `Bỏ theo dõi ${name}`,
    block: (name: string) => `Chặn ${name}`,
    blockHint: (name: string) =>
      `${name} sẽ không thể xem hoặc liên hệ với bạn.`,
    followed: 'Đã theo dõi người dùng.',
    unfollowed: 'Đã bỏ theo dõi người dùng.',
    blocked: 'Đã chặn người dùng.',
    actionError: 'Không thể thực hiện thao tác. Vui lòng thử lại.',
  },
  en: {
    fallbackTitle: 'Connections',
    followers: 'Followers',
    following: 'Following',
    friends: 'Friends',
    followersCount: (count: number) => `${count} followers`,
    followingCount: (count: number) => `Following ${count} people`,
    friendsCount: (count: number) => `${count} friends`,
    searchPlaceholder: 'Search this list',
    empty: 'There are no people in this list yet.',
    emptySearch: 'No matching people found.',
    retry: 'Retry',
    follow: 'Follow',
    followBack: 'Follow back',
    message: (name: string) => `Message ${name}`,
    unfollow: (name: string) => `Unfollow ${name}`,
    block: (name: string) => `Block ${name}`,
    blockHint: (name: string) =>
      `${name} will no longer be able to view or contact you.`,
    followed: 'User followed.',
    unfollowed: 'User unfollowed.',
    blocked: 'User blocked.',
    actionError: 'Could not complete this action. Please try again.',
  },
} as const;

const userRepository = createUserRepository();

function getUserKey(user: UserProfile) {
  return String(user.id ?? user.username ?? user.name ?? '');
}

function mergeUniqueUsers(...lists: UserProfile[][]) {
  const usersById = new Map<string, UserProfile>();

  lists.flat().forEach(user => {
    const key = getUserKey(user);
    if (!key) return;
    usersById.set(key, user);
  });

  return Array.from(usersById.values());
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

function ConnectionListSkeleton() {
  return (
    <View className="px-4 pt-3">
      {Array.from({ length: 7 }).map((_, index) => (
        <View
          key={`connection-skeleton-${index}`}
          className="min-h-[82px] flex-row items-center border-b border-slate-100 py-3"
        >
          <View className="h-16 w-16 rounded-full bg-slate-100" />
          <View className="ml-4 flex-1">
            <View className="h-4 w-40 rounded-full bg-slate-100" />
            <View className="mt-2 h-3 w-24 rounded-full bg-slate-100" />
          </View>
          <View className="h-10 w-10 rounded-full bg-slate-100" />
        </View>
      ))}
    </View>
  );
}

function ConnectionSeparator() {
  return <View className="ml-[96px] h-px bg-slate-100" />;
}

export default function ProfileFriendsScreen() {
  const navigation = useNavigation<ProfileFriendsNavigation>();
  const route = useRoute<ProfileFriendsRoute>();
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const copy = CONNECTIONS_COPY[language];
  const {
    userId,
    title,
    displayName,
    avatarUrl,
    initialTab = 'followers',
    initialFriends,
    initialFollowers,
    initialFollowing,
    followersCount,
    followingCount,
  } = route.params;
  const pagerRef = useRef<PagerView>(null);
  const initialTabIndex = Math.max(0, CONNECTION_TABS.indexOf(initialTab));
  const cachedSnapshot = useMemo(
    () => getProfileConnectionsSnapshot(userId),
    [userId],
  );
  const seededFollowers = useMemo(
    () =>
      mergeUniqueUsers(
        initialFollowers ??
          cachedSnapshot?.followers ??
          (initialTab === 'followers' ? initialFriends ?? [] : []),
      ),
    [cachedSnapshot?.followers, initialFollowers, initialFriends, initialTab],
  );
  const seededFollowing = useMemo(
    () =>
      mergeUniqueUsers(
        initialFollowing ??
          cachedSnapshot?.following ??
          (initialTab === 'following' ? initialFriends ?? [] : []),
      ),
    [cachedSnapshot?.following, initialFollowing, initialFriends, initialTab],
  );
  const hasSeededConnections =
    seededFollowers.length > 0 || seededFollowing.length > 0;
  const [activeTab, setActiveTab] = useState<ConnectionTab>(initialTab);
  const [mountedTabs, setMountedTabs] = useState<Set<ConnectionTab>>(
    () => new Set([initialTab]),
  );
  const [followers, setFollowers] = useState<UserProfile[]>(seededFollowers);
  const [following, setFollowing] = useState<UserProfile[]>(seededFollowing);
  const [followersOffset, setFollowersOffset] = useState(0);
  const [followingOffset, setFollowingOffset] = useState(0);
  const [hasMoreFollowers, setHasMoreFollowers] = useState(true);
  const [hasMoreFollowing, setHasMoreFollowing] = useState(true);
  const [isLoading, setIsLoading] = useState(!hasSeededConnections);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearchVisible, setSearchVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedUserTab, setSelectedUserTab] =
    useState<ConnectionTab>(initialTab);
  const [actionLoading, setActionLoading] = useState<
    'follow' | 'unfollow' | 'block' | null
  >(null);

  const followingIds = useMemo(
    () => new Set(following.map(user => getUserKey(user))),
    [following],
  );
  const mutualFriends = useMemo(
    () => followers.filter(user => followingIds.has(getUserKey(user))),
    [followers, followingIds],
  );
  const usersByTab = useMemo<Record<ConnectionTab, UserProfile[]>>(
    () => ({
      followers,
      following,
      friends: mutualFriends,
    }),
    [followers, following, mutualFriends],
  );
  const displayedUsersByTab = useMemo<Record<ConnectionTab, UserProfile[]>>(
    () => {
      if (!query.trim()) return usersByTab;

      return {
        followers: followers.filter(user => matchesQuery(user, query)),
        following: following.filter(user => matchesQuery(user, query)),
        friends: mutualFriends.filter(user => matchesQuery(user, query)),
      };
    },
    [followers, following, mutualFriends, query, usersByTab],
  );
  const headingsByTab = useMemo<Record<ConnectionTab, string>>(
    () => ({
      followers: copy.followersCount(
        Math.max(followersCount ?? 0, followers.length),
      ),
      following: copy.followingCount(
        Math.max(followingCount ?? 0, following.length),
      ),
      friends: copy.friendsCount(mutualFriends.length),
    }),
    [
      copy,
      followers.length,
      followersCount,
      following.length,
      followingCount,
      mutualFriends.length,
    ],
  );

  const loadConnections = useCallback(
    async (
      mode: 'initial' | 'refresh' | 'more' = 'initial',
      requestedTab: ConnectionTab = activeTab,
    ) => {
      if (!userId) return;
      if (mode === 'more') {
        if (isLoadingMore) return;
        const canLoadMore =
          requestedTab === 'followers'
            ? hasMoreFollowers
            : requestedTab === 'following'
            ? hasMoreFollowing
            : hasMoreFollowers || hasMoreFollowing;
        if (!canLoadMore) return;
        setIsLoadingMore(true);
      } else if (mode === 'refresh') {
        setIsRefreshing(true);
      } else if (!hasSeededConnections) {
        setIsLoading(true);
      }

      setError(null);
      const types: Array<'followers' | 'following'> =
        mode !== 'initial' && requestedTab !== 'friends'
          ? [requestedTab]
          : ['followers', 'following'];
      const nextFollowersOffset = mode === 'more' ? followersOffset : 0;
      const nextFollowingOffset = mode === 'more' ? followingOffset : 0;

      try {
        const result = await userRepository.getFriends({
          userId,
          type: types,
          limit: CONNECTIONS_PAGE_SIZE,
          followersOffset: types.includes('followers')
            ? nextFollowersOffset
            : undefined,
          followingOffset: types.includes('following')
            ? nextFollowingOffset
            : undefined,
        });

        if (types.includes('followers')) {
          setFollowers(current =>
            mode === 'more'
              ? mergeUniqueUsers(current, result.followers)
              : mergeUniqueUsers(result.followers),
          );
          setFollowersOffset(nextFollowersOffset + result.followers.length);
          setHasMoreFollowers(
            result.followers.length >= CONNECTIONS_PAGE_SIZE,
          );
        }
        if (types.includes('following')) {
          setFollowing(current =>
            mode === 'more'
              ? mergeUniqueUsers(current, result.following)
              : mergeUniqueUsers(result.following),
          );
          setFollowingOffset(nextFollowingOffset + result.following.length);
          setHasMoreFollowing(
            result.following.length >= CONNECTIONS_PAGE_SIZE,
          );
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : String(caughtError),
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [
      activeTab,
      followersOffset,
      followingOffset,
      hasSeededConnections,
      hasMoreFollowers,
      hasMoreFollowing,
      isLoadingMore,
      userId,
    ],
  );

  useEffect(() => {
    void loadConnections('initial');
    // Pagination state must not restart the initial route load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const ensureTabMounted = useCallback((tab: ConnectionTab) => {
    setMountedTabs(current => {
      if (current.has(tab)) return current;
      const next = new Set(current);
      next.add(tab);
      return next;
    });
  }, []);

  useEffect(() => {
    let warmupTimer: ReturnType<typeof setTimeout> | undefined;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      warmupTimer = setTimeout(() => {
        setMountedTabs(new Set(CONNECTION_TABS));
      }, 120);
    });

    return () => {
      interactionTask.cancel();
      if (warmupTimer) clearTimeout(warmupTimer);
    };
  }, []);

  const handleSelectTab = useCallback(
    (tab: ConnectionTab) => {
      const nextPage = CONNECTION_TABS.indexOf(tab);
      if (nextPage < 0) return;
      ensureTabMounted(tab);
      setActiveTab(tab);
      pagerRef.current?.setPage(nextPage);
    },
    [ensureTabMounted],
  );

  const handlePageSelected = useCallback(
    (event: PagerViewOnPageSelectedEvent) => {
      const nextTab = CONNECTION_TABS[event.nativeEvent.position];
      if (nextTab) {
        ensureTabMounted(nextTab);
        setActiveTab(nextTab);
      }
    },
    [ensureTabMounted],
  );

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigateToUserProfile(navigation, userId);
  }, [navigation, userId]);

  const handleOpenProfile = useCallback(
    (targetUserId: string) => {
      navigateToUserProfile(navigation, targetUserId);
    },
    [navigation],
  );

  const handleOpenMessage = useCallback(
    (user: UserProfile) => {
      if (!user.id) return;
      const chat: ChatItem = {
        id: `user:${user.id}`,
        chatType: 'user',
        userId: String(user.id),
        username: user.username ?? '',
        name: user.name || user.username || copy.fallbackTitle,
        avatar: user.avatarUrl || FALLBACK_AVATAR,
        lastMessage: '',
        lastMessageTime: 0,
        unreadCount: 0,
        isOnline: false,
        isVerified: Boolean(user.verified),
      };
      setSelectedUser(null);
      navigation.navigate(ROUTES.CHAT, { chat });
    },
    [copy.fallbackTitle, navigation],
  );

  const updateFollowState = useCallback(
    async (user: UserProfile, shouldFollow: boolean) => {
      if (!user.id || actionLoading) return;
      setActionLoading(shouldFollow ? 'follow' : 'unfollow');
      try {
        await apiBridge.post(apiRoutes.social.follow, {
          user_id: String(user.id),
          follow_action: shouldFollow ? 'follow' : 'unfollow',
        });
        if (shouldFollow) {
          setFollowing(current =>
            mergeUniqueUsers(current, [
              {
                ...user,
                followingState: 'following',
              },
            ]),
          );
        } else {
          setFollowing(current =>
            current.filter(item => getUserKey(item) !== getUserKey(user)),
          );
        }
        setSelectedUser(null);
        showSnackbar({
          message: shouldFollow ? copy.followed : copy.unfollowed,
          type: 'success',
        });
      } catch {
        showSnackbar({ message: copy.actionError, type: 'warning' });
      } finally {
        setActionLoading(null);
      }
    },
    [actionLoading, copy.actionError, copy.followed, copy.unfollowed],
  );

  const blockUser = useCallback(
    async (user: UserProfile) => {
      if (!user.id || actionLoading) return;
      setActionLoading('block');
      try {
        await apiBridge.post(apiRoutes.social.block, {
          user_id: String(user.id),
          block_action: 'block',
        });
        const blockedKey = getUserKey(user);
        setFollowers(current =>
          current.filter(item => getUserKey(item) !== blockedKey),
        );
        setFollowing(current =>
          current.filter(item => getUserKey(item) !== blockedKey),
        );
        setSelectedUser(null);
        showSnackbar({ message: copy.blocked, type: 'success' });
      } catch {
        showSnackbar({ message: copy.actionError, type: 'warning' });
      } finally {
        setActionLoading(null);
      }
    },
    [actionLoading, copy.actionError, copy.blocked],
  );

  const selectedUserIsFollowing = selectedUser
    ? followingIds.has(getUserKey(selectedUser))
    : false;
  const menuTab = selectedUserTab || activeTab;

  const renderConnection = useCallback(
    ({ item }: { item: UserProfile }, tab: ConnectionTab) => {
      const itemKey = getUserKey(item);
      const name = item.name || item.username || copy.fallbackTitle;
      const isFollowing = followingIds.has(itemKey);

      return (
        <View className="min-h-[88px] flex-row items-center bg-white px-4 py-3">
          <TouchableOpacity
            activeOpacity={0.82}
            className="flex-1 flex-row items-center"
            onPress={() => item.id && handleOpenProfile(String(item.id))}
          >
            <Image
              source={{ uri: item.avatarUrl || FALLBACK_AVATAR }}
              className="h-16 w-16 rounded-full border border-slate-200 bg-slate-100"
              resizeMode="cover"
            />
            <View className="ml-4 flex-1 pr-2">
              <View className="flex-row items-center">
                <Text
                  className="flex-shrink text-[17px] font-bold text-slate-950"
                  numberOfLines={2}
                >
                  {name}
                </Text>
                {item.verified ? (
                  <View className="ml-1.5">
                    <BadgeCheck size={16} color="#1877F2" fill="#1877F2" />
                  </View>
                ) : null}
              </View>
              {!!item.about && (
                <Text
                  className="mt-1 text-[12px] font-medium text-slate-500"
                  numberOfLines={1}
                >
                  {item.about}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {tab === 'followers' && !isFollowing ? (
            <TouchableOpacity
              activeOpacity={0.82}
              className="mr-1 min-h-[38px] items-center justify-center rounded-xl bg-[#1877F2] px-4"
              onPress={() => void updateFollowState(item, true)}
            >
              <Text className="text-[13px] font-bold text-white">
                {copy.follow}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.75}
            className="h-11 w-11 items-center justify-center rounded-full"
            onPress={() => {
              setSelectedUserTab(tab);
              setSelectedUser(item);
            }}
          >
            <MoreHorizontal size={24} color="#65676B" />
          </TouchableOpacity>
        </View>
      );
    },
    [
      copy.fallbackTitle,
      copy.follow,
      followingIds,
      handleOpenProfile,
      updateFollowState,
    ],
  );

  const renderListEmpty = useCallback(
    (tab: ConnectionTab) => {
      if (isLoading && usersByTab[tab].length === 0) {
        return <ConnectionListSkeleton />;
      }

      return (
        <View className="items-center px-8 py-20">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-blue-50">
            <Search size={32} color="#1877F2" />
          </View>
          <Text className="mt-4 text-center text-[15px] font-semibold text-slate-600">
            {query.trim() ? copy.emptySearch : error || copy.empty}
          </Text>
          {!query.trim() && error ? (
            <TouchableOpacity
              activeOpacity={0.82}
              className="mt-5 min-h-[42px] items-center justify-center rounded-full bg-[#1877F2] px-6"
              onPress={() => void loadConnections('refresh', tab)}
            >
              <Text className="text-[14px] font-bold text-white">
                {copy.retry}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    },
    [
      copy.empty,
      copy.emptySearch,
      copy.retry,
      error,
      isLoading,
      loadConnections,
      query,
      usersByTab,
    ],
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View className="border-b border-[#E4E6EB] bg-white px-4 pb-3 pt-1">
        <View className="min-h-[54px] flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleBack}
            className="h-11 w-11 items-center justify-center rounded-full"
          >
            <ArrowLeft size={27} color="#050505" />
          </TouchableOpacity>

          <Text
            className="flex-1 px-3 text-center text-[21px] font-extrabold text-[#050505]"
            numberOfLines={1}
          >
            {displayName || title || copy.fallbackTitle}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            className="h-11 w-11 items-center justify-center rounded-full"
            onPress={() => setSearchVisible(current => !current)}
          >
            {isSearchVisible ? (
              <X size={24} color="#050505" />
            ) : (
              <Search size={27} color="#050505" />
            )}
          </TouchableOpacity>
          <Image
            source={{ uri: avatarUrl || FALLBACK_AVATAR }}
            className="ml-1 h-9 w-9 rounded-full bg-slate-100"
          />
        </View>

        <View className="mt-3 flex-row gap-2">
          {CONNECTION_TABS.map(tab => {
            const selected = activeTab === tab;
            const label =
              tab === 'followers'
                ? copy.followers
                : tab === 'following'
                ? copy.following
                : copy.friends;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.8}
                className={`min-h-[44px] flex-1 items-center justify-center rounded-full px-2 ${
                  selected ? 'bg-[#DCEEFF]' : 'bg-[#E4E6EB]'
                }`}
                delayPressIn={0}
                onPress={() => handleSelectTab(tab)}
              >
                <Text
                  className={`text-[14px] font-bold ${
                    selected ? 'text-[#0866FF]' : 'text-[#050505]'
                  }`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isSearchVisible ? (
          <View className="mt-3 min-h-[46px] flex-row items-center rounded-full bg-[#F0F2F5] px-4">
            <Search size={19} color="#65676B" />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder={copy.searchPlaceholder}
              placeholderTextColor="#8E9094"
              className="ml-3 flex-1 text-[15px] text-[#050505]"
              autoCorrect={false}
            />
          </View>
        ) : null}
      </View>

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={initialTabIndex}
        offscreenPageLimit={2}
        onPageSelected={handlePageSelected}
      >
        {CONNECTION_TABS.map(tab => (
          <View key={tab} collapsable={false} style={styles.page}>
            <View className="flex-row items-center justify-between px-4 pb-2 pt-5">
              <Text className="text-[22px] font-extrabold text-[#050505]">
                {headingsByTab[tab]}
              </Text>
            </View>

            {mountedTabs.has(tab) ? (
              <FlatList
                data={displayedUsersByTab[tab]}
                keyExtractor={getUserKey}
                renderItem={item => renderConnection(item, tab)}
                ItemSeparatorComponent={ConnectionSeparator}
                contentContainerStyle={{
                  paddingBottom: Math.max(insets.bottom, 18),
                }}
                ListEmptyComponent={renderListEmpty(tab)}
                ListFooterComponent={
                  isLoadingMore && activeTab === tab ? (
                    <View className="items-center py-5">
                      <ActivityIndicator color="#1877F2" />
                    </View>
                  ) : (
                    <View className="h-5" />
                  )
                }
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing && activeTab === tab}
                    onRefresh={() => void loadConnections('refresh', tab)}
                    tintColor="#1877F2"
                    colors={['#1877F2']}
                  />
                }
                onEndReached={() => {
                  if (activeTab === tab && !query.trim()) {
                    void loadConnections('more', tab);
                  }
                }}
                onEndReachedThreshold={0.4}
                showsVerticalScrollIndicator={false}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                updateCellsBatchingPeriod={32}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
              />
            ) : (
              <ConnectionListSkeleton />
            )}
          </View>
        ))}
      </PagerView>

      <Modal
        visible={selectedUser !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedUser(null)}
      >
        <View className="flex-1 justify-end">
          <TouchableOpacity
            activeOpacity={1}
            className="absolute inset-0 bg-black/40"
            onPress={() => setSelectedUser(null)}
          />
          {selectedUser ? (
            <View
              className="rounded-t-[28px] bg-white px-5 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 18) }}
            >
              <View className="mb-5 h-1.5 w-12 self-center rounded-full bg-slate-400" />

              <TouchableOpacity
                activeOpacity={0.82}
                className="min-h-[68px] flex-row items-center"
                onPress={() => handleOpenMessage(selectedUser)}
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <MessageCircle size={23} color="#050505" />
                </View>
                <Text className="ml-4 flex-1 text-[17px] font-semibold text-[#050505]">
                  {copy.message(
                    selectedUser.name ||
                      selectedUser.username ||
                      copy.fallbackTitle,
                  )}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                disabled={actionLoading !== null}
                className="min-h-[76px] flex-row items-center"
                onPress={() =>
                  void updateFollowState(
                    selectedUser,
                    menuTab === 'followers' && !selectedUserIsFollowing,
                  )
                }
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  {menuTab === 'followers' && !selectedUserIsFollowing ? (
                    <UserPlus size={23} color="#050505" />
                  ) : (
                    <UserMinus size={23} color="#050505" />
                  )}
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[17px] font-semibold text-[#050505]">
                    {menuTab === 'followers' && !selectedUserIsFollowing
                      ? copy.followBack
                      : copy.unfollow(
                          selectedUser.name ||
                            selectedUser.username ||
                            copy.fallbackTitle,
                        )}
                  </Text>
                  {menuTab !== 'followers' || selectedUserIsFollowing ? (
                    <Text className="mt-1 text-[13px] leading-5 text-[#65676B]">
                      {language === 'vi'
                        ? 'Bạn sẽ không còn thấy bài viết của họ trong luồng đang theo dõi.'
                        : 'Their posts will no longer appear in your following feed.'}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                disabled={actionLoading !== null}
                className="min-h-[82px] flex-row items-center"
                onPress={() => void blockUser(selectedUser)}
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <UserRoundX size={23} color="#050505" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[17px] font-semibold text-[#050505]">
                    {copy.block(
                      selectedUser.name ||
                        selectedUser.username ||
                        copy.fallbackTitle,
                    )}
                  </Text>
                  <Text className="mt-1 text-[13px] leading-5 text-[#65676B]">
                    {copy.blockHint(
                      selectedUser.name ||
                        selectedUser.username ||
                        copy.fallbackTitle,
                    )}
                  </Text>
                </View>
              </TouchableOpacity>

              {actionLoading ? (
                <View className="absolute inset-x-0 bottom-5 items-center">
                  <ActivityIndicator color="#1877F2" />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
