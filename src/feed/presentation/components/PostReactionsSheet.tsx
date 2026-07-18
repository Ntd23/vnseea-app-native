// Description: Modal-based bottom sheet listing everyone who reacted to a
// post, with per-reaction tabs (Tất cả / 👍 / ❤️ / ...) and a Follow button
// on each row. Mirrors the bottom-sheet UX used by `ReelCommentsSheet`
// (slide-up spring animation, semi-transparent backdrop, grabber handle,
// 60% screen height) so tapping "Bạn và 1 người khác" feels like opening
// the comments sheet rather than pushing a new screen.
//
// The screen never holds data-loading state directly — it consumes
// `usePostReactionsViewModel(postId)` and only renders the returned slice.
// All styling uses NativeWind token utilities (no StyleSheet.create).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Heart, UserPlus, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { usePostReactionsViewModel } from '../../application/view-models/usePostReactionsViewModel';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { getFeedCopy, type PostReactionTab } from '../../application/i18n/feedCopy';
import { backendApi } from '../../../shared-kernel/infrastructure/api/backendApi';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { PostReactionUser } from '../../domain/types/reactions.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import { FEED_REACTION_IMAGES } from './FeedReactionAssets';

const BRAND = '#0000ff';

const TAB_KEYS: PostReactionTab[] = [
  'all',
  'like',
  'love',
  'haha',
  'wow',
  'sad',
  'angry',
];

// Sheet height — 60% of the screen (matches the user-approved spec).
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;
// Spring entry point — the sheet starts this many pixels below the bottom
// and slides up to translateY=0. Matches ReelCommentsSheet's "spring from
// below" feel without an extra height measurement.
const SHEET_OFFSCREEN_OFFSET = 600;

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
}

// ── Sub-components (moved verbatim from PostReactionsScreen) ─────────────

function ReactionTab({
  tab,
  label,
  count,
  active,
  onPress,
}: {
  tab: PostReactionTab;
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`flex-row items-center rounded-full px-3.5 py-2 ${
        active ? 'bg-[#0000ff]' : 'bg-white border border-slate-200'
      }`}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {tab !== 'all' ? (
        <Image
          source={FEED_REACTION_IMAGES[tab]}
          style={{ width: 18, height: 18, marginRight: 6 }}
          resizeMode="contain"
        />
      ) : null}
      <Text
        className={`text-caption-primary font-semibold ${
          active ? 'text-white' : 'text-slate-700'
        }`}
      >
        {label}
      </Text>
      <View
        className={`ml-2 rounded-full px-1.5 ${
          active ? 'bg-white/25' : 'bg-slate-100'
        }`}
      >
        <Text
          className={`text-caption-secondary ${
            active ? 'text-white' : 'text-slate-600'
          }`}
        >
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function FollowButton({
  isFollowing,
  onPress,
  isLoading,
  followLabel,
  followingLabel,
}: {
  isFollowing: boolean;
  onPress: () => void;
  isLoading: boolean;
  followLabel: string;
  followingLabel: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isLoading}
      className={`flex-row items-center rounded-full px-4 py-2 ${
        isFollowing ? 'bg-[#0000ff]/10' : 'bg-[#0000ff]'
      }`}
      accessibilityRole="button"
      accessibilityLabel={isFollowing ? followingLabel : followLabel}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={isFollowing ? BRAND : '#FFFFFF'}
        />
      ) : isFollowing ? (
        <>
          <Check size={14} color={BRAND} strokeWidth={2.5} />
          <Text className="ml-1.5 text-caption-primary font-semibold text-brand">
            {followingLabel}
          </Text>
        </>
      ) : (
        <>
          <UserPlus size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="ml-1.5 text-caption-primary font-semibold text-white">
            {followLabel}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function ReactionUserRow({
  user,
  onOpenProfile,
  onToggleFollow,
  followLabel,
  followingLabel,
  isFollowLoading,
}: {
  user: PostReactionUser;
  onOpenProfile: (userId: string) => void;
  onToggleFollow: (userId: string, currentlyFollowing: boolean) => void;
  followLabel: string;
  followingLabel: string;
  isFollowLoading: boolean;
}) {
  const initial = (user.name?.[0] ?? user.username?.[0] ?? '?').toUpperCase();
  const showReactionBadge = user.reaction !== 'like';

  const handleProfile = useCallback(() => {
    onOpenProfile(user.id);
  }, [onOpenProfile, user.id]);

  const handleFollow = useCallback(() => {
    onToggleFollow(user.id, user.isFollowing);
  }, [onToggleFollow, user.id, user.isFollowing]);

  return (
    <View className="flex-row items-center border-b border-slate-100 px-4 py-3">
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleProfile}
        disabled={!user.id}
        className="relative"
      >
        {user.avatarUrl ? (
          <Image
            source={{ uri: user.avatarUrl }}
            className="avatar-md bg-slate-200"
            resizeMode="cover"
          />
        ) : (
          <View className="avatar-md items-center justify-center bg-[#0000ff]/10">
            <Text className="text-caption-primary text-brand">{initial}</Text>
          </View>
        )}
        {showReactionBadge ? (
          <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white">
            <Image
              source={FEED_REACTION_IMAGES[user.reaction]}
              style={{ width: 17, height: 17 }}
              resizeMode="contain"
            />
          </View>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleProfile}
        disabled={!user.id}
        className="ml-3 flex-1"
      >
        <Text className="text-title-primary" numberOfLines={1}>
          {user.name || user.username || 'Người dùng'}
        </Text>
        {user.username ? (
          <Text className="mt-0.5 text-caption-secondary" numberOfLines={1}>
            @{user.username}
          </Text>
        ) : null}
      </TouchableOpacity>

      <FollowButton
        isFollowing={user.isFollowing}
        onPress={handleFollow}
        isLoading={isFollowLoading}
        followLabel={followLabel}
        followingLabel={followingLabel}
      />
    </View>
  );
}

// ── Main sheet ───────────────────────────────────────────────────────────

function PostReactionsSheetBase({ visible, postId, onClose }: Props) {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  // Sheet's bottom padding. Same convention as ReelCommentsSheet:
  // iOS uses 0 (the grabber / safe-area inset handles it) and Android
  // uses the safe-area inset (or 10px minimum).
  const sheetBottomPadding = Platform.OS === 'ios' ? 0 : Math.max(insets.bottom, 10);

  const language = useAppLanguage();
  const copy = useMemo(() => getFeedCopy(language), [language]);

  const {
    activeTab,
    switchTab,
    users,
    counts,
    totalCount,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    refresh,
    loadMore,
    retry,
  } = usePostReactionsViewModel(postId ?? '');

  // Per-user loading state for the follow toggle — see PostReactionsScreen
  // for the full rationale on optimistic mirror + revert-on-error.
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);
  const [localFollowing, setLocalFollowing] = useState<Record<string, boolean>>(
    {},
  );

  const getFollowingState = useCallback(
    (user: PostReactionUser) =>
      localFollowing[user.id] ?? user.isFollowing,
    [localFollowing],
  );

  // Mirror ReelCommentsSheet: keep the modal mounted briefly after closing
  // so the close animation has time to play out before React tears it down.
  const [isMounted, setIsMounted] = useState(visible);
  const openProgress = useRef(new Animated.Value(0)).current;
  const pendingProfileUserIdRef = useRef<string | null>(null);

  const completePendingProfileNavigation = useCallback(() => {
    const userId = pendingProfileUserIdRef.current;
    if (!userId) return;

    pendingProfileUserIdRef.current = null;
    navigateToUserProfile(navigation, userId);
  }, [navigation]);

  const requestProfileNavigation = useCallback(
    (userId: string) => {
      if (!userId || pendingProfileUserIdRef.current) return;

      pendingProfileUserIdRef.current = userId;
      onClose();
    },
    [onClose],
  );

  const handleModalDismiss = useCallback(() => {
    completePendingProfileNavigation();
  }, [completePendingProfileNavigation]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      openProgress.setValue(0);
      Animated.spring(openProgress, {
        toValue: 1,
        damping: 18,
        stiffness: 180,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(openProgress, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [openProgress, visible]);

  useEffect(() => {
    if (Platform.OS === 'ios' || isMounted) return;
    completePendingProfileNavigation();
  }, [completePendingProfileNavigation, isMounted]);

  const backdropOpacity = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const sheetTranslateY = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_OFFSCREEN_OFFSET, 0],
  });

  const sheetScale = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
  });

  const handleToggleFollow = useCallback(
    async (userId: string, currentlyFollowing: boolean) => {
      if (!userId || followLoadingId === userId) return;

      const nextState = !currentlyFollowing;
      setLocalFollowing(prev => ({ ...prev, [userId]: nextState }));
      setFollowLoadingId(userId);

      try {
        const session = sessionStorage.getSession();
        const response = await backendApi.post<{
          api_status: number | string;
        }>(apiRoutes.social.follow, {
          user_id: userId,
          follow_action: nextState ? 'follow' : 'unfollow',
          // Some installs also require the viewer id for audit; harmless
          // to send when others ignore it.
          ...(session?.userId ? { following_user_id: session.userId } : {}),
        });

        if (String(response.api_status) !== '200') {
          throw new Error('Không cập nhật được trạng thái theo dõi.');
        }
      } catch {
        setLocalFollowing(prev => ({ ...prev, [userId]: currentlyFollowing }));
      } finally {
        setFollowLoadingId(null);
      }
    },
    [followLoadingId],
  );

  const renderItem = useCallback(
    ({ item }: { item: PostReactionUser }) => (
      <ReactionUserRow
        user={item}
        onOpenProfile={requestProfileNavigation}
        onToggleFollow={handleToggleFollow}
        followLabel={copy.reactionsFollowButton}
        followingLabel={copy.reactionsFollowingButton}
        isFollowLoading={followLoadingId === item.id}
      />
    ),
    [
      requestProfileNavigation,
      handleToggleFollow,
      copy.reactionsFollowButton,
      copy.reactionsFollowingButton,
      followLoadingId,
    ],
  );

  const decoratedUsers = useMemo(
    () =>
      users.map(u => ({
        ...u,
        isFollowing: getFollowingState(u),
      })),
    [users, getFollowingState],
  );

  const keyExtractor = useCallback((item: PostReactionUser) => item.id, []);

  const handleLoadMore = useCallback(() => {
    void loadMore();
  }, [loadMore]);

  // Keep the Modal instance mounted with visible=false so iOS can deliver
  // onDismiss before profile navigation starts.
  if (!isMounted) {
    return (
      <Modal
        visible={false}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
        onDismiss={handleModalDismiss}
      />
    );
  }

  // Defensive: if the sheet is opening but we have no postId yet (caller
  // toggled visible before setting postId), bail with a blank sheet so
  // the VM stays in its initial empty state instead of erroring out.
  const showBody = Boolean(postId);

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      onDismiss={handleModalDismiss}
    >
      <View className="flex-1 justify-end">
        <Pressable
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng"
        >
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.36)',
              opacity: backdropOpacity,
            }}
          />
        </Pressable>

        <Animated.View
          style={{
            height: SHEET_HEIGHT,
            paddingBottom: sheetBottomPadding,
            borderTopLeftRadius: Platform.OS === 'ios' ? 30 : 18,
            borderTopRightRadius: Platform.OS === 'ios' ? 30 : 18,
            backgroundColor:
              Platform.OS === 'ios' ? 'rgba(248, 250, 252, 0.94)' : '#ffffff',
            overflow: 'hidden',
            borderWidth: Platform.OS === 'ios' ? 0.5 : 0,
            borderColor: 'rgba(255, 255, 255, 0.74)',
            shadowColor: '#1f2a44',
            shadowOffset: { width: 0, height: -18 },
            shadowOpacity: Platform.OS === 'ios' ? 0.18 : 0,
            shadowRadius: Platform.OS === 'ios' ? 34 : 0,
            transform: [
              { translateY: sheetTranslateY },
              { scale: sheetScale },
            ],
          }}
        >
          {/* Grabber */}
          <View
            style={{
              alignSelf: 'center',
              width: Platform.OS === 'ios' ? 40 : 36,
              height: Platform.OS === 'ios' ? 5 : 4,
              borderRadius: 999,
              backgroundColor:
                Platform.OS === 'ios' ? 'rgba(15, 23, 42, 0.18)' : '#d1d5db',
              marginTop: Platform.OS === 'ios' ? 10 : 8,
            }}
          />

          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
            <View className="h-10 w-10" />
            <View className="flex-1 items-center">
              <Text className="text-title-primary text-center">
                {copy.reactionsHeaderTitle}
              </Text>
              {totalCount > 0 ? (
                <Text className="mt-0.5 text-caption-secondary text-center">
                  {copy.reactionsCounterLabel(totalCount)}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={onClose}
              accessibilityLabel="Đóng"
            >
              <X size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          {showBody ? (
            <>
              {/* Tab strip — horizontal scroll so 7 tabs + counts stay readable
                  on narrow phones. Counts always come from the aggregate
                  `counts` map (filled by the 'all' fetch), not from the
                  per-tab user list. */}
              <View className="border-b border-slate-200 bg-white">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="px-3 py-3 gap-2"
                >
                  {TAB_KEYS.map(tab => {
                    const label = copy.reactionsTabLabel(tab);
                    const count =
                      tab === 'all'
                        ? totalCount
                        : counts[tab as ReactionType] ?? 0;
                    return (
                      <ReactionTab
                        key={tab}
                        tab={tab}
                        label={label}
                        count={count}
                        active={activeTab === tab}
                        onPress={() => switchTab(tab)}
                      />
                    );
                  })}
                </ScrollView>
              </View>

              {/* Body */}
              {isLoading && decoratedUsers.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color={BRAND} />
                  <Text className="mt-3 text-caption-secondary">
                    {copy.reactionsLoading}
                  </Text>
                </View>
              ) : error && decoratedUsers.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8">
                  <Text className="text-center text-title-primary">
                    {copy.reactionsErrorTitle}
                  </Text>
                  <Text className="mt-2 text-center text-body-secondary">{error}</Text>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={retry}
                    className="btn-primary mt-6 min-h-[44px] px-6"
                  >
                    <Text className="text-caption-primary text-inverse">
                      {copy.reactionsRetry}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : decoratedUsers.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8">
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <Heart size={28} color="#94a3b8" />
                  </View>
                  <Text className="mt-4 text-center text-title-primary">
                    {copy.reactionsEmptyForTab(activeTab)}
                  </Text>
                  {activeTab === 'all' ? (
                    <Text className="mt-2 text-center text-body-secondary">
                      {copy.reactionsEmptyDescription}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <FlatList
                  data={decoratedUsers}
                  keyExtractor={keyExtractor}
                  renderItem={renderItem}
                  contentContainerClassName="pb-10"
                  showsVerticalScrollIndicator={false}
                  onEndReachedThreshold={0.4}
                  onEndReached={handleLoadMore}
                  refreshControl={
                    <RefreshControl
                      refreshing={isRefreshing}
                      onRefresh={refresh}
                      tintColor={BRAND}
                      colors={[BRAND]}
                    />
                  }
                  ListFooterComponent={
                    isLoadingMore ? (
                      <View className="items-center py-4">
                        <ActivityIndicator size="small" color={BRAND} />
                      </View>
                    ) : null
                  }
                />
              )}
            </>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

export default PostReactionsSheetBase;
