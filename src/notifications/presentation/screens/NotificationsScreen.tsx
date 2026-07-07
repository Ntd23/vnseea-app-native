// Description: Renders the VNSEEA notifications tab with section grouping,
// tabs (All / Unread), filter sheet, animated cards, and i18n.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { Check } from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { ChatItem } from '../../../messages/domain/types/messages.types';
import type { GroupItem } from '../../../community/domain/types/community.types';
import type { PagesItem } from '../../../pages/domain/types/pages.types';
import { useNotificationsViewModel } from '../../application/view-models/useNotificationsViewModel';
import type { NotificationsItem } from '../../domain/types/notifications.types';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import NotificationsHeader from '../components/NotificationsHeader';
import NotificationsFilterSheet from '../components/NotificationsFilterSheet';
import NotificationSectionList from '../components/NotificationSectionList';
import NotificationCard from '../components/NotificationCard';
import NotificationsEmptyState from '../components/NotificationsEmptyState';
import NotificationsSkeleton from '../components/NotificationsSkeleton';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  createNativeTabScrollPublisherState,
  publishNativeTabScrollBehavior,
  publishNativeTabScrollIntent,
} from '../../../navigation/nativeTabScrollPublisher';
import { useMainTabContentInsets } from '../../../navigation/useMainTabContentInsets';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';

type NotificationsNav = NativeStackNavigationProp<RootStackParamList>;

function BeautifulBellIllustration() {
  return (
    <View className="items-center justify-center mb-6 mt-8 relative">
      {/* Plus sign left */}
      <Text className="absolute left-[28%] top-[10%] text-slate-300 font-bold text-lg">+</Text>
      {/* Plus sign right */}
      <Text className="absolute right-[26%] top-[55%] text-slate-300 font-bold text-lg">+</Text>
      {/* Bubble left */}
      <View className="absolute left-[30%] top-[48%] h-3.5 w-3.5 rounded-full border-2 border-slate-200 bg-transparent" />
      {/* Bubble right */}
      <View className="absolute right-[28%] top-[18%] h-3 w-3 rounded-full border border-slate-200 bg-transparent" />
      {/* Small sparkles */}
      <Text className="absolute left-[38%] top-[2%] text-slate-200 text-[10px]">✦</Text>
      <Text className="absolute right-[42%] top-[0%] text-slate-200 text-[10px]">✦</Text>

      {/* Bell body (tilted) */}
      <View style={{ transform: [{ rotate: '-15deg' }] }}>
        <Svg width={110} height={110} viewBox="0 0 100 100">
          <Defs>
            <SvgLinearGradient id="bellGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#e8f0fe" />
              <Stop offset="100%" stopColor="#c5daf8" />
            </SvgLinearGradient>
          </Defs>
          {/* Bell body */}
          <Path
            d="M50 15c-15.5 0-22 12-22 28v18c0 5-4.5 9.5-9.5 9.5h63c-5 0-9.5-4.5-9.5-9.5V43c0-16-6.5-28-22-28z"
            fill="url(#bellGrad)"
          />
          {/* Bell clapper (bottom dot) */}
          <Circle cx="50" cy="78" r="8" fill="#a4c2f4" />
          {/* Bell rim */}
          <Path
            d="M17 70.5c0-1.4 1.1-2.5 2.5-2.5h61c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5H19.5c-1.4 0-2.5-1.1-2.5-2.5z"
            fill="#b9d3f9"
          />
        </Svg>
      </View>

      {/* Overlapping blue check badge at bottom right */}
      <View className="absolute bottom-[2px] right-[38%] h-6 w-6 items-center justify-center rounded-full bg-[#0000ff] border-2 border-white">
        <Check size={12} color="#ffffff" strokeWidth={3} />
      </View>
    </View>
  );
}

function BackgroundBellWatermark() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
      }}
    >
      <View style={{ opacity: 0.08 }}>
        <BeautifulBellIllustration />
      </View>
    </View>
  );
}

function includesAny(value: string, tokens: string[]) {
  const normalized = value.toLowerCase();
  return tokens.some(token => normalized.includes(token));
}

function toPositiveNumberId(value: string | undefined) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function toPageRouteItem(item: NotificationsItem): PagesItem {
  const pageId = item.pageId ?? '';
  const pageName = item.pageName ?? '';
  return {
    id: pageId || pageName,
    pageId,
    pageName,
    pageTitle: item.text || 'Trang',
    likes: 0,
  };
}

function toGroupRouteItem(item: NotificationsItem): GroupItem {
  const groupId = item.groupId ?? '';
  return {
    id: groupId,
    groupId,
    groupName: '',
    groupTitle: item.text || 'Nhóm',
    privacy: 'public',
  };
}

function getNavigateTo(item: NotificationsItem, navigation: NotificationsNav) {
  const type = item.type || '';

  // Handle poke notifications first - navigate to profile
  if (includesAny(type, ['poke', 'poked'])) {
    if (item.notifierId) {
      navigateToUserProfile(navigation, item.notifierId);
    }
    return;
  }

  if (item.fundingId && includesAny(type, ['fund', 'funding'])) {
    navigation.navigate(ROUTES.FUNDING_DETAIL, { fundId: item.fundingId });
    return;
  }

  if (item.productId && includesAny(type, ['product', 'market', 'order'])) {
    const productId = toPositiveNumberId(item.productId);
    if (!productId) {
      navigation.navigate(ROUTES.FEED as any);
      return;
    }
    navigation.navigate(ROUTES.PRODUCT_DETAIL, {
      productId,
    });
    return;
  }

  if (item.jobId && includesAny(type, ['job', 'apply'])) {
    navigation.navigate(ROUTES.JOB_DETAIL, { jobId: item.jobId });
    return;
  }

  if (item.blogId && includesAny(type, ['blog', 'article'])) {
    navigation.navigate(ROUTES.BLOG_DETAIL, { blogId: item.blogId });
    return;
  }

  if (item.postId && includesAny(type, ['live_video'])) {
    const postId = toPositiveNumberId(item.postId);
    if (!postId) {
      navigation.navigate(ROUTES.FEED as any);
      return;
    }
    navigation.navigate(ROUTES.LIVE_ROOM, { postId });
    return;
  }

  if (item.postId) {
    const postId = toPositiveNumberId(item.postId);
    if (!postId) {
      navigation.navigate(ROUTES.FEED as any);
      return;
    }
    navigation.navigate(ROUTES.POST_DETAIL, { postId: String(postId) });
    return;
  }

  switch (item.type) {
    case 'following':
    case 'visited_profile':
    case 'accepted_request':
      if (item.notifierId) {
        navigateToUserProfile(navigation, item.notifierId);
      }
      break;
    case 'liked_post':
    case 'wondered_post':
    case 'shared_post':
    case 'comment':
    case 'comment_reply':
    case 'comment_mention':
    case 'comment_reply_mention':
    case 'post_mention':
    case 'liked_comment':
    case 'wondered_comment':
    case 'profile_wall_post':
      navigation.navigate(ROUTES.FEED as any);
      break;
    case 'joined_group':
    case 'requested_to_join_group':
    case 'accepted_join_request':
      if (item.groupId) {
        navigation.navigate(ROUTES.GROUP_DETAIL, { group: toGroupRouteItem(item) });
      }
      break;
    case 'interested_event':
    case 'going_event':
    case 'invited_event':
      navigation.navigate(ROUTES.EVENTS as any);
      break;
    case 'liked_page':
      if (item.pageId || item.pageName) {
        navigation.navigate(ROUTES.PAGE_DETAIL, { page: toPageRouteItem(item) });
      } else {
        navigation.navigate(ROUTES.PAGES as any);
      }
      break;
    default:
      navigation.navigate(ROUTES.FEED as any);
  }
}

function NotificationsScreen() {
  const navigation = useNavigation<NotificationsNav>();
  const {
    bottomContentPadding,
    scrollIndicatorBottomInset,
  } = useMainTabContentInsets();
  const {
    notifications,
    filteredNotifications,
    error,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    pendingActions,
    activeFilter,
    setActiveFilter,
    language,
    copy,
    loadFirstPage,
    refresh,
    loadMore,
    markAsSeen,
    deleteNotification,
    acceptGroupChatInvitation,
    rejectGroupChatInvitation,
  } = useNotificationsViewModel();

  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const hasNotifications = notifications.length > 0;
  const visibleNotifications = filteredNotifications;
  const hasFiltered = visibleNotifications.length > 0;
  const hasNotificationsRef = useRef(hasNotifications);
  const nativeTabScrollPublisherStateRef = useRef(
    createNativeTabScrollPublisherState(),
  );
  const iosNotificationsListContentStyle = useMemo(
    () => ({ paddingBottom: bottomContentPadding }),
    [bottomContentPadding],
  );

  useEffect(() => {
    hasNotificationsRef.current = hasNotifications;
  }, [hasNotifications]);

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

  useFocusEffect(
    useCallback(() => {
      loadFirstPage(false, hasNotificationsRef.current);
      const interval = setInterval(() => {
        loadFirstPage(false, true);
      }, 10000);

      return () => clearInterval(interval);
    }, [loadFirstPage]),
  );

  const handlePress = useCallback(
    (item: NotificationsItem) => {
      const isSyntheticGroupChatRequest = item.id.startsWith(
        'group-chat-request:',
      );

      if (!item.seen && !isSyntheticGroupChatRequest) {
        markAsSeen(item.id);
      }

      if (item.type === 'added_you_to_group') {
        return;
      }

      if (item.type === 'accept_group_chat_request' && item.groupChatId) {
        const groupChatItem: ChatItem = {
          id: `group:${item.groupChatId}`,
          chatType: 'group',
          userId: item.groupChatId,
          username: '',
          name:
            item.text.replace(
              ' đã chấp nhận lời mời tham gia nhóm chat',
              '',
            ) || 'Nhóm chat',
          avatar: item.notifier?.avatarUrl || '',
          lastMessage: '',
          lastMessageTime: Date.now() / 1000,
          unreadCount: 0,
          isOnline: false,
          isVerified: false,
        };
        navigation.navigate(ROUTES.CHAT, { chat: groupChatItem });
        return;
      }

      getNavigateTo(item, navigation);
    },
    [markAsSeen, navigation],
  );

  const handleLongPress = useCallback(
    (item: NotificationsItem) => {
      Alert.alert(copy.deleteTitle, copy.deleteMessage, [
        { text: copy.deleteCancel, style: 'cancel' },
        {
          text: copy.deleteConfirm,
          style: 'destructive',
          onPress: () => {
            deleteNotification(item.id).catch(() => undefined);
          },
        },
      ]);
    },
    [copy.deleteCancel, copy.deleteConfirm, copy.deleteMessage, copy.deleteTitle, deleteNotification],
  );

  const handleAcceptGroupChat = useCallback(
    async (groupChatId: string) => {
      const success = await acceptGroupChatInvitation(groupChatId);
      if (success) {
        Alert.alert(
          language === 'vi' ? 'Thành công' : 'Success',
          copy.groupJoined,
        );
      } else {
        Alert.alert(
          language === 'vi' ? 'Lỗi' : 'Error',
          copy.acceptFailed,
        );
      }
    },
    [acceptGroupChatInvitation, copy.acceptFailed, copy.groupJoined, language],
  );

  const handleRejectGroupChat = useCallback(
    async (groupChatId: string) => {
      const success = await rejectGroupChatInvitation(groupChatId);
      if (!success) {
        Alert.alert(
          language === 'vi' ? 'Lỗi' : 'Error',
          copy.rejectFailed,
        );
      }
    },
    [copy.rejectFailed, language, rejectGroupChatInvitation],
  );

  const notificationsListHeaderComponent = (
    <NotificationsHeader
      title={copy.headerTitle}
      onFilterPress={() => setFilterSheetVisible(true)}
      filterActive={activeFilter !== 'all'}
    />
  );

  const renderNotificationItem = useCallback(
    ({ item, index }: ListRenderItemInfo<NotificationsItem>) => {
      const isGroupChatInvite = item.type === 'added_you_to_group';
      const isPending =
        isGroupChatInvite && item.groupChatId
          ? pendingActions.has(item.groupChatId)
          : false;

      return (
        <NotificationCard
          item={item}
          index={index}
          language={language}
          onPress={handlePress}
          onLongPress={isGroupChatInvite ? undefined : handleLongPress}
          onAcceptGroupChat={
            isGroupChatInvite ? handleAcceptGroupChat : undefined
          }
          onRejectGroupChat={
            isGroupChatInvite ? handleRejectGroupChat : undefined
          }
          isPending={isPending}
          labels={{
            acceptInvite: copy.acceptInvite,
            rejectInvite: copy.rejectInvite,
          }}
        />
      );
    },
    [
      copy.acceptInvite,
      copy.rejectInvite,
      handleAcceptGroupChat,
      handleLongPress,
      handlePress,
      handleRejectGroupChat,
      language,
      pendingActions,
    ],
  );

  const notificationsListEmptyComponent =
    isLoading && !hasNotifications ? (
      <NotificationsSkeleton />
    ) : error && !hasNotifications ? (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="mb-3 text-center text-body-secondary">
          {error}
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => loadFirstPage()}
          className="rounded-full bg-[#0000ff] px-6 py-2.5"
        >
          <Text className="text-[14px] font-semibold text-white">
            {copy.retry}
          </Text>
        </TouchableOpacity>
      </View>
    ) : !hasNotifications ? (
      <NotificationsEmptyState
        variant="all"
        title={copy.emptyTitle}
        description={copy.emptyDescription}
      />
    ) : !hasFiltered ? (
      <NotificationsEmptyState
        variant="all"
        title={copy.emptyTitle}
        description={copy.emptyDescription}
      />
    ) : null;

  const notificationsListFooterComponent =
    isLoadingMore ? (
      <View className="items-center py-4">
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    ) : !hasMore && visibleNotifications.length > 0 ? (
      <View className="items-center justify-center pt-6 pb-8">
        <Text className="text-[12px] font-semibold text-slate-400 text-center">
          ✨ {copy.allLoaded}
        </Text>
      </View>
    ) : null;

  const handleNotificationsEndReached = useCallback(() => {
    if (hasFiltered && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasFiltered, hasMore, isLoadingMore, loadMore]);

  const handleNotificationsScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS !== 'ios') return;

      publishNativeTabScrollIntent(
        nativeTabScrollPublisherStateRef,
        event.nativeEvent.contentOffset.y,
      );
    },
    [],
  );

  const iosNotificationsListElement = (
    <FlatList
      data={hasFiltered ? visibleNotifications : []}
      keyExtractor={item => item.id}
      renderItem={renderNotificationItem}
      ListHeaderComponent={notificationsListHeaderComponent}
      ListEmptyComponent={notificationsListEmptyComponent}
      ListFooterComponent={notificationsListFooterComponent}
      contentContainerClassName="px-4 pt-3"
      contentContainerStyle={iosNotificationsListContentStyle}
      scrollIndicatorInsets={{ bottom: scrollIndicatorBottomInset }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refresh}
          colors={['#0000ff']}
        />
      }
      onEndReached={handleNotificationsEndReached}
      onEndReachedThreshold={0.35}
      onScroll={handleNotificationsScroll}
      scrollEventThrottle={16}
    />
  );

  const notificationsBody = (
    <>
      <NotificationsHeader
        title={copy.headerTitle}
        onFilterPress={() => setFilterSheetVisible(true)}
        filterActive={activeFilter !== 'all'}
      />

      <View className="flex-1">
        {isLoading && !hasNotifications ? (
          <NotificationsSkeleton />
        ) : error && !hasNotifications ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="mb-3 text-center text-body-secondary">
              {error}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => loadFirstPage()}
              className="rounded-full bg-[#0000ff] px-6 py-2.5"
            >
              <Text className="text-[14px] font-semibold text-white">
                {copy.retry}
              </Text>
            </TouchableOpacity>
          </View>
        ) : !hasNotifications ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-1"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refresh}
                colors={['#0000ff']}
              />
            }
          >
            <NotificationsEmptyState
              variant="all"
              title={copy.emptyTitle}
              description={copy.emptyDescription}
            />
          </ScrollView>
        ) : !hasFiltered ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-1"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refresh}
                colors={['#0000ff']}
              />
            }
          >
            <NotificationsEmptyState
              variant="all"
              title={copy.emptyTitle}
              description={copy.emptyDescription}
            />
          </ScrollView>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 pb-10 pt-3"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refresh}
                colors={['#0000ff']}
              />
            }
            onScroll={e => {
              const y = e.nativeEvent.contentOffset.y;
              const height = e.nativeEvent.contentSize.height;
              const viewHeight = e.nativeEvent.layoutMeasurement.height;
              if (
                y + viewHeight >= height - 100 &&
                hasMore &&
                !isLoadingMore
              ) {
                loadMore();
              }
            }}
            scrollEventThrottle={400}
          >
            <NotificationSectionList
              items={visibleNotifications}
              language={language}
              pendingActions={pendingActions}
              onItemPress={handlePress}
              onItemLongPress={handleLongPress}
              onAcceptGroupChat={handleAcceptGroupChat}
              onRejectGroupChat={handleRejectGroupChat}
              labels={{
                acceptInvite: copy.acceptInvite,
                rejectInvite: copy.rejectInvite,
              }}
            />

            {isLoadingMore ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#0000ff" />
              </View>
            ) : null}

            {!hasMore && visibleNotifications.length > 0 ? (
              <View className="items-center justify-center pt-6 pb-8">
                <Text className="text-[12px] font-semibold text-slate-400 text-center">
                  ✨ {copy.allLoaded}
                </Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView
      style={{ backgroundColor: '#f4f7fa' }}
      className="flex-1"
      edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['top']}
    >
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#f4f7fa" />
      {/* FeedHeader is the app-wide top bar (menu, logo, search, create,
          messages). It already manages its own top safe-area inset, so we
          render it on top of the notifications body. */}
      <FeedHeader />

      <View className="flex-1 relative">
        <BackgroundBellWatermark />
        {Platform.OS === 'ios' ? iosNotificationsListElement : notificationsBody}
      </View>

      <NotificationsFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        active={activeFilter}
        onSelect={setActiveFilter}
        labels={{
          title: copy.filter,
          filterAll: copy.filterAll,
          filterLikes: copy.filterLikes,
          filterComments: copy.filterComments,
          filterFollows: copy.filterFollows,
          filterGroups: copy.filterGroups,
          filterEvents: copy.filterEvents,
          close: language === 'vi' ? 'Đóng' : 'Close',
        }}
      />
    </SafeAreaView>
  );
}

export default NotificationsScreen;
