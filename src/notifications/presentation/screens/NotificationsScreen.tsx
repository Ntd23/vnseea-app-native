// Description: Renders the VNSEEA notifications tab with section grouping,
// tabs (All / Unread), filter sheet, animated cards, and i18n.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
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
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { Check } from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { ChatItem } from '../../../messages/domain/types/messages.types';
import type { GroupItem } from '../../../community/domain/types/community.types';
import type { PagesItem } from '../../../pages/domain/types/pages.types';
import type { OrdersItem } from '../../../orders/domain/types/orders.types';
import { createOrdersRepository } from '../../../orders/infrastructure/repositories/ApiOrdersRepository';
import { createEventsRepository } from '../../../events/infrastructure/repositories/ApiEventsRepository';
import { useNotificationsViewModel } from '../../application/view-models/useNotificationsViewModel';
import {
  GROUP_CHAT_INVITE_NOTIFICATION,
  type NotificationsItem,
} from '../../domain/types/notifications.types';
import { resolveNotificationDestination } from '../../application/navigation/resolveNotificationDestination';
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

const ordersRepository = createOrdersRepository();
const eventsRepository = createEventsRepository();

function BeautifulBellIllustration() {
  return (
    <View className="items-center justify-center mb-6 mt-8 relative">
      {/* Plus sign left */}
      <Text className="absolute left-[28%] top-[10%] text-slate-300 font-bold text-lg">
        +
      </Text>
      {/* Plus sign right */}
      <Text className="absolute right-[26%] top-[55%] text-slate-300 font-bold text-lg">
        +
      </Text>
      {/* Bubble left */}
      <View className="absolute left-[30%] top-[48%] h-3.5 w-3.5 rounded-full border-2 border-slate-200 bg-transparent" />
      {/* Bubble right */}
      <View className="absolute right-[28%] top-[18%] h-3 w-3 rounded-full border border-slate-200 bg-transparent" />
      {/* Small sparkles */}
      <Text className="absolute left-[38%] top-[2%] text-slate-200 text-[10px]">
        ✦
      </Text>
      <Text className="absolute right-[42%] top-[0%] text-slate-200 text-[10px]">
        ✦
      </Text>

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
  const groupId = item.groupId || item.groupName || '';
  return {
    id: groupId,
    groupId,
    groupName: item.groupName ?? '',
    groupTitle: item.text || 'Nhóm',
    privacy: 'public',
    url: item.url || undefined,
  };
}

function normalizeOrderIdentifier(value: string | undefined) {
  return (value ?? '').trim().replace(/^#/, '').toLowerCase();
}

function findOrderByIdentifier(items: OrdersItem[], orderId: string) {
  const target = normalizeOrderIdentifier(orderId);
  if (!target) return undefined;
  return items.find(order => {
    if (normalizeOrderIdentifier(order.id) === target) return true;
    if (normalizeOrderIdentifier(order.code) === target) return true;
    return order.lines.some(
      line => normalizeOrderIdentifier(line.id) === target,
    );
  });
}

function toGroupChatRouteItem(
  item: NotificationsItem,
  groupChatId: string,
): ChatItem {
  return {
    id: `group:${groupChatId}`,
    chatType: 'group',
    userId: groupChatId,
    username: '',
    name: item.notifier?.name || item.text || 'Nhóm chat',
    avatar: item.notifier?.avatarUrl || '',
    lastMessage: '',
    lastMessageTime: Date.now() / 1000,
    unreadCount: 0,
    isOnline: false,
    isVerified: false,
  };
}

async function openExternalNotificationUrl(
  url: string,
  navigation: NotificationsNav,
) {
  try {
    await Linking.openURL(url);
  } catch {
    navigation.navigate(ROUTES.FEED as any);
  }
}

async function navigateToNotification(
  item: NotificationsItem,
  navigation: NotificationsNav,
) {
  const destination = resolveNotificationDestination(item);

  switch (destination.kind) {
    case 'profile':
      navigateToUserProfile(navigation, destination.userId);
      return;
    case 'groupChat':
      navigation.navigate(ROUTES.CHAT, {
        chat: toGroupChatRouteItem(item, destination.groupChatId),
      });
      return;
    case 'funding':
      navigation.navigate(ROUTES.FUNDING_DETAIL, {
        fundId: destination.fundId,
      });
      return;
    case 'product': {
      const productId = toPositiveNumberId(destination.productId);
      if (productId) {
        navigation.navigate(ROUTES.PRODUCT_DETAIL, { productId });
      } else if (destination.fallbackUrl) {
        await openExternalNotificationUrl(destination.fallbackUrl, navigation);
      } else {
        navigation.navigate(ROUTES.MARKETPLACE);
      }
      return;
    }
    case 'job':
      navigation.navigate(ROUTES.JOB_DETAIL, { jobId: destination.jobId });
      return;
    case 'blog':
      navigation.navigate(ROUTES.BLOG_DETAIL, { blogId: destination.blogId });
      return;
    case 'live': {
      const postId = toPositiveNumberId(destination.postId);
      if (postId) navigation.navigate(ROUTES.LIVE_ROOM, { postId });
      else navigation.navigate(ROUTES.LIVE);
      return;
    }
    case 'post':
      navigation.navigate(ROUTES.POST_DETAIL, { postId: destination.postId });
      return;
    case 'page':
      navigation.navigate(ROUTES.PAGE_DETAIL, { page: toPageRouteItem(item) });
      return;
    case 'pages':
      navigation.navigate(ROUTES.PAGES);
      return;
    case 'group':
      navigation.navigate(ROUTES.GROUP_DETAIL, {
        group: toGroupRouteItem(item),
      });
      return;
    case 'groups':
      navigation.navigate(ROUTES.EXPLORE_GROUPS);
      return;
    case 'event': {
      try {
        const event =
          destination.event ??
          (destination.eventId
            ? await eventsRepository.getById(destination.eventId)
            : null);
        if (event) {
          navigation.navigate(ROUTES.EVENT_DETAIL, { event });
          return;
        }
      } catch (error) {
        console.warn('[NotificationsScreen] load event target failed', error);
      }
      navigation.navigate(ROUTES.EVENTS);
      return;
    }
    case 'events':
      navigation.navigate(ROUTES.EVENTS);
      return;
    case 'messages':
      navigation.navigate(ROUTES.MESSAGES);
      return;
    case 'memories':
      navigation.navigate(ROUTES.MEMORIES);
      return;
    case 'forum':
      navigation.navigate(ROUTES.FORUM);
      return;
    case 'stories':
      navigation.navigate(ROUTES.STORIES_LIST);
      return;
    case 'points':
      navigation.navigate(ROUTES.MY_POINTS);
      return;
    case 'balance':
      navigation.navigate(ROUTES.MY_BALANCE);
      return;
    case 'withdrawal':
      navigation.navigate(ROUTES.WITHDRAWAL);
      return;
    case 'orders': {
      if (destination.orderId) {
        try {
          const page =
            destination.mode === 'seller'
              ? await ordersRepository.getSellerOrders({ limit: 100 })
              : await ordersRepository.getPurchasedOrders({ limit: 100 });
          const order = findOrderByIdentifier(page.items, destination.orderId);
          if (order) {
            navigation.navigate(ROUTES.ORDER_DETAIL, { order });
            return;
          }
        } catch (error) {
          console.warn('[NotificationsScreen] load order target failed', error);
        }
      }
      navigation.navigate(ROUTES.MY_PRODUCTS, {
        initialTab: destination.mode === 'seller' ? 'orders' : 'purchased',
      });
      return;
    }
    case 'external':
      await openExternalNotificationUrl(destination.url, navigation);
      return;
    case 'feed':
    default:
      navigation.navigate(ROUTES.FEED as any);
  }
}

function NotificationsScreen() {
  const navigation = useNavigation<NotificationsNav>();
  const { bottomContentPadding, scrollIndicatorBottomInset } =
    useMainTabContentInsets();
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
      const isSyntheticGroupChatRequest =
        item.type === GROUP_CHAT_INVITE_NOTIFICATION;

      if (!item.seen && !isSyntheticGroupChatRequest) {
        markAsSeen(item.id).catch(() => undefined);
      }

      navigateToNotification(item, navigation).catch(navigationError => {
        console.warn(
          '[NotificationsScreen] navigation failed',
          navigationError,
        );
        navigation.navigate(ROUTES.FEED as any);
      });
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
    [
      copy.deleteCancel,
      copy.deleteConfirm,
      copy.deleteMessage,
      copy.deleteTitle,
      deleteNotification,
    ],
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
        Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', copy.acceptFailed);
      }
    },
    [acceptGroupChatInvitation, copy.acceptFailed, copy.groupJoined, language],
  );

  const handleRejectGroupChat = useCallback(
    async (groupChatId: string) => {
      const success = await rejectGroupChatInvitation(groupChatId);
      if (!success) {
        Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', copy.rejectFailed);
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
      const isGroupChatInvite = item.type === GROUP_CHAT_INVITE_NOTIFICATION;
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
        <Text className="mb-3 text-center text-body-secondary">{error}</Text>
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

  const notificationsListFooterComponent = isLoadingMore ? (
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
              if (y + viewHeight >= height - 100 && hasMore && !isLoadingMore) {
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
        {Platform.OS === 'ios'
          ? iosNotificationsListElement
          : notificationsBody}
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
