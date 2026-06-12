// Description: Renders the VNSEEA notifications tab with section grouping,
// tabs (All / Unread), filter sheet, animated cards, and i18n.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { ChatItem } from '../../../messages/domain/types/messages.types';
import type { GroupItem } from '../../../community/domain/types/community.types';
import type { PagesItem } from '../../../pages/domain/types/pages.types';
import { useNotificationsViewModel } from '../../application/view-models/useNotificationsViewModel';
import type { NotificationsItem } from '../../domain/types/notifications.types';
import NotificationsHeader from '../components/NotificationsHeader';
import NotificationsTabs from '../components/NotificationsTabs';
import NotificationsFilterSheet from '../components/NotificationsFilterSheet';
import NotificationSectionList from '../components/NotificationSectionList';
import NotificationsEmptyState from '../components/NotificationsEmptyState';
import NotificationsSkeleton from '../components/NotificationsSkeleton';

type NotificationsNav = NativeStackNavigationProp<RootStackParamList>;

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
  return {
    id: pageId,
    pageId,
    pageName: '',
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
        navigation.navigate(ROUTES.PROFILE, { userId: item.notifierId } as any);
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
      if (item.pageId) {
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
    notifications,
    filteredNotifications,
    unreadCount,
    error,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    pendingActions,
    activeTab,
    setActiveTab,
    activeFilter,
    setActiveFilter,
    language,
    copy,
    loadFirstPage,
    refresh,
    loadMore,
    markAsSeen,
    markAllAsSeen,
    deleteNotification,
    acceptGroupChatInvitation,
    rejectGroupChatInvitation,
  } = useNotificationsViewModel();

  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const hasNotifications = notifications.length > 0;
  const hasFiltered = filteredNotifications.length > 0;

  useFocusEffect(
    useCallback(() => {
      loadFirstPage(false, hasNotifications);
      const interval = setInterval(() => {
        loadFirstPage(false, true);
      }, 10000);

      return () => clearInterval(interval);
    }, [hasNotifications, loadFirstPage]),
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

  const handleMarkAllSeen = useCallback(() => {
    markAllAsSeen();
    Alert.alert(copy.headerTitle, copy.markAllSeenToast);
  }, [copy.headerTitle, copy.markAllSeenToast, markAllAsSeen]);

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

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <NotificationsHeader
        title={copy.headerTitle}
        onMarkAllRead={handleMarkAllSeen}
        onFilterPress={() => setFilterSheetVisible(true)}
        filterActive={activeFilter !== 'all'}
      />

      {hasNotifications ? (
        <NotificationsTabs
          labels={{ all: copy.tabAll, unread: copy.tabUnread }}
          active={activeTab}
          onChange={setActiveTab}
          unreadCount={unreadCount}
        />
      ) : null}

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
              variant={activeTab === 'unread' ? 'unread' : 'all'}
              title={
                activeTab === 'unread' ? copy.noUnread : copy.emptyTitle
              }
              description={
                activeTab === 'unread'
                  ? copy.noUnreadDescription
                  : copy.emptyDescription
              }
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
              items={filteredNotifications}
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

            {!hasMore && filteredNotifications.length > 0 ? (
              <Text className="py-4 text-center text-caption-secondary">
                {copy.allLoaded}
              </Text>
            ) : null}
          </ScrollView>
        )}
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
