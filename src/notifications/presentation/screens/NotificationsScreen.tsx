// Description: Renders the VNSEEA notifications tab with real API data.
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bell,
  BellOff,
  CalendarDays,
  CheckCircle2,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Share2,
  ThumbsUp,
  UserCheck,
  UserPlus,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { ChatItem } from '../../../messages/domain/types/messages.types';
import { useNotificationsViewModel } from '../../application/view-models/useNotificationsViewModel';
import type { NotificationsItem } from '../../domain/types/notifications.types';

type NotificationsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

// Notification type to icon mapper
const NOTIFICATION_ICONS: Record<string, { Icon: typeof ThumbsUp; iconColor: string }> = {
  following: { Icon: UserPlus, iconColor: '#1877F2' },
  liked_post: { Icon: Heart, iconColor: '#F33E58' },
  wondered_post: { Icon: Heart, iconColor: '#F7B125' },
  shared_post: { Icon: Share2, iconColor: '#65676B' },
  comment: { Icon: MessageCircle, iconColor: '#1877F2' },
  comment_reply: { Icon: MessageCircle, iconColor: '#1877F2' },
  profile_wall_post: { Icon: ImageIcon, iconColor: '#1877F2' },
  visited_profile: { Icon: UserCheck, iconColor: '#65676B' },
  joined_group: { Icon: UserCheck, iconColor: '#1877F2' },
  accepted_request: { Icon: UserCheck, iconColor: '#34A853' },
  interested_event: { Icon: CalendarDays, iconColor: '#EA4335' },
  going_event: { Icon: CalendarDays, iconColor: '#34A853' },
};

function getNotificationIcon(type: string) {
  return NOTIFICATION_ICONS[type] ?? { Icon: Bell, iconColor: '#65676B' };
}

function formatMessageTime(timestamp: number): string {
  if (!timestamp) return 'Vừa xong';

  const now = Date.now() / 1000;
  const diff = now - timestamp;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) {
    return new Date(timestamp * 1000).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return new Date(timestamp * 1000).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

// Generate notification text from type and data
function getNotificationText(item: NotificationsItem): string {
  const name = item.notifier?.name || 'Người dùng';

  switch (item.type) {
    case 'following':
      return `${name} đã theo dõi bạn`;
    case 'liked_post':
      return `${name} đã thích bài viết của bạn`;
    case 'wondered_post':
      return `${name} đã bày tỏ cảm xúc với bài viết của bạn`;
    case 'shared_post':
      return `${name} đã chia sẻ bài viết của bạn`;
    case 'comment':
      return `${name} đã bình luận về bài viết của bạn`;
    case 'comment_reply':
      return `${name} đã trả lời bình luận của bạn`;
    case 'comment_mention':
    case 'post_mention':
      return `${name} đã nhắc đến bạn trong bài viết`;
    case 'profile_wall_post':
      return `${name} đã đăng lên trang cá nhân của bạn`;
    case 'visited_profile':
      return `${name} đã xem trang cá nhân của bạn`;
    case 'joined_group':
      return `${name} đã tham gia nhóm của bạn`;
    case 'accepted_request':
      return `${name} đã chấp nhận lời mời kết bạn`;
    case 'interested_event':
      return `${name} quan tâm đến sự kiện của bạn`;
    case 'going_event':
      return `${name} sẽ tham dự sự kiện của bạn`;
    default:
      return item.text || `${name} có thông báo mới`;
  }
}

// Navigate to appropriate screen based on notification type
function getNavigateTo(
  item: NotificationsItem,
  navigation: NotificationsNav,
) {
  switch (item.type) {
    case 'following':
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
    case 'post_mention':
    case 'profile_wall_post':
      navigation.navigate(ROUTES.FEED as any);
      break;
    case 'joined_group':
    case 'requested_to_join_group':
    case 'accepted_join_request':
      if (item.groupId) {
        navigation.navigate(ROUTES.GROUP_DETAIL as any, { groupId: item.groupId });
      }
      break;
    case 'interested_event':
    case 'going_event':
    case 'invited_event':
      navigation.navigate(ROUTES.EVENTS as any);
      break;
    case 'liked_page':
      navigation.navigate(ROUTES.PAGES as any);
      break;
    default:
      // Navigate to feed by default
      navigation.navigate(ROUTES.FEED as any);
  }
}

interface NotificationCardProps {
  item: NotificationsItem;
  onPress: (item: NotificationsItem) => void;
  onLongPress?: (item: NotificationsItem) => void;
}

function NotificationCard({ item, onPress, onLongPress }: NotificationCardProps) {
  const { Icon, iconColor } = getNotificationIcon(item.type);
  const text = getNotificationText(item);

  return (
    <TouchableOpacity
      className={`surface-card mb-3 flex-row p-4 ${
        !item.seen ? 'bg-[#E7F3FF]' : ''
      }`}
      activeOpacity={0.84}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress?.(item)}
    >
      {/* Avatar or Icon */}
      {item.notifier?.avatarUrl ? (
        <View className="relative">
          <Image
            source={{ uri: item.notifier.avatarUrl }}
            className="h-14 w-14 rounded-full"
            resizeMode="cover"
          />
          {/* Notification type badge */}
          <View
            className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: iconColor }}
          >
            <Icon size={12} color="#FFFFFF" />
          </View>
        </View>
      ) : (
        <View
          className="h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <Icon size={22} color={iconColor} />
        </View>
      )}

      {/* Content */}
      <View className="ml-4 flex-1">
        <View className="flex-row items-start justify-between">
          <Text
            className="flex-1 text-body-primary leading-snug"
            numberOfLines={3}
          >
            {text}
          </Text>
          {!item.seen && (
            <View className="ml-2 h-2 w-2 rounded-full bg-[#1877F2]" />
          )}
        </View>
        <Text className="mt-1 text-caption-secondary">
          {item.timeText || 'Vừa xong'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function UnreadMessageCard({
  chat,
  onPress,
}: {
  chat: ChatItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="surface-card mb-3 flex-row items-center bg-[#E7F3FF] p-4"
      activeOpacity={0.84}
      onPress={onPress}
    >
      {chat.avatar ? (
        <Image
          source={{ uri: chat.avatar }}
          className="h-14 w-14 rounded-full"
          resizeMode="cover"
        />
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-full bg-[#1877F2]">
          <MessageCircle size={25} color="#FFFFFF" />
        </View>
      )}
      <View className="ml-4 flex-1">
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 text-body-primary font-semibold" numberOfLines={1}>
            {chat.name}
          </Text>
          <Text className="ml-2 text-caption-secondary">
            {formatMessageTime(chat.lastMessageTime)}
          </Text>
        </View>
        <Text className="mt-1 text-body-secondary" numberOfLines={2}>
          {chat.lastMessage || 'Đã gửi cho bạn một tin nhắn'}
        </Text>
      </View>
      <View className="ml-3 min-h-6 min-w-6 items-center justify-center rounded-full bg-[#1877F2] px-2">
        <Text className="text-xs font-bold text-white">
          {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function UnreadMessagesFallbackCard({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  if (count <= 0) return null;

  return (
    <TouchableOpacity
      className="surface-card mb-3 flex-row items-center bg-[#E7F3FF] p-4"
      activeOpacity={0.84}
      onPress={onPress}
    >
      <View className="h-14 w-14 items-center justify-center rounded-full bg-[#1877F2]">
        <MessageCircle size={25} color="#FFFFFF" />
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-body-primary font-semibold">
          Bạn có {count > 99 ? '99+' : count} tin nhắn chưa đọc
        </Text>
        <Text className="mt-1 text-caption-secondary">Nhấn để mở hộp thư</Text>
      </View>
    </TouchableOpacity>
  );
}

function NotificationsScreen() {
  const navigation = useNavigation<NotificationsNav>();
  const {
    notifications,
    unreadMessageCount,
    unreadMessageChats,
    error,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    loadFirstPage,
    refresh,
    loadMore,
    markAsSeen,
    markAllAsSeen,
    deleteNotification,
  } = useNotificationsViewModel();
  const hasNotifications = notifications.length > 0 || unreadMessageCount > 0;
  const remainingUnreadMessageCount = Math.max(
    0,
    unreadMessageCount -
      unreadMessageChats.reduce((total, chat) => total + chat.unreadCount, 0),
  );

  useFocusEffect(
    useCallback(() => {
      loadFirstPage(false, notifications.length > 0);
      const interval = setInterval(() => {
        loadFirstPage(false, true);
      }, 10000);

      return () => clearInterval(interval);
    }, [loadFirstPage, notifications.length]),
  );

  const handlePress = useCallback(
    (item: NotificationsItem) => {
      if (!item.seen) {
        markAsSeen(item.id);
      }
      getNavigateTo(item, navigation);
    },
    [markAsSeen, navigation],
  );

  const handleLongPress = useCallback(
    (item: NotificationsItem) => {
      Alert.alert('Xóa thông báo', 'Bạn có muốn xóa thông báo này?', [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => deleteNotification(item.id),
        },
      ]);
    },
    [deleteNotification],
  );

  const handleMarkAllSeen = useCallback(() => {
    markAllAsSeen();
    Alert.alert('Thông báo', 'Đã đánh dấu tất cả là đã đọc');
  }, [markAllAsSeen]);

  const handleOpenMessages = useCallback(() => {
    navigation.navigate(ROUTES.MESSAGES);
  }, [navigation]);

  const handleOpenChat = useCallback(
    (chat: ChatItem) => {
      navigation.navigate(ROUTES.CHAT, { chat });
    },
    [navigation],
  );

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <View className="h-10 w-10 items-center justify-center rounded-full">
          <Bell size={22} color="#FFFFFF" />
        </View>
        <Text className="text-title-primary text-inverse">Thông báo</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={handleMarkAllSeen}
        >
          <CheckCircle2 size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading && !hasNotifications ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={BRAND} />
          <Text className="mt-2 text-body-secondary">Đang tải thông báo...</Text>
        </View>
      ) : error && !hasNotifications ? (
        <View className="flex-1 items-center justify-center px-8">
          <BellOff size={48} color="#CBD5E1" />
          <Text className="mt-4 text-center text-body-secondary">{error}</Text>
          <TouchableOpacity
            className="mt-4 rounded-lg bg-[#0000ff] px-6 py-2"
            activeOpacity={0.8}
            onPress={() => loadFirstPage()}
          >
            <Text className="text-white">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : !hasNotifications ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-1 items-center justify-center px-8"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              colors={[BRAND]}
            />
          }
        >
          <BellOff size={64} color="#CBD5E1" />
          <Text className="mt-4 text-center text-heading text-[#94A3B8]">
            Chưa có thông báo nào
          </Text>
          <Text className="mt-2 text-center text-body-secondary text-[#94A3B8]">
            Khi có thông báo mới, chúng sẽ xuất hiện ở đây.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-10 pt-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              colors={[BRAND]}
            />
          }
          onScrollEndDrag={e => {
            const y = e.nativeEvent.contentOffset.y;
            const height = e.nativeEvent.contentSize.height;
            const viewHeight = e.nativeEvent.layoutMeasurement.height;
            if (y + viewHeight >= height - 100 && hasMore && !isLoadingMore) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {unreadMessageChats.map(chat => (
            <UnreadMessageCard
              key={`message-${chat.id}`}
              chat={chat}
              onPress={() => handleOpenChat(chat)}
            />
          ))}

          {remainingUnreadMessageCount > 0 && (
            <UnreadMessagesFallbackCard
              count={remainingUnreadMessageCount}
              onPress={handleOpenMessages}
            />
          )}

          {notifications.map(item => (
            <NotificationCard
              key={item.id}
              item={item}
              onPress={handlePress}
              onLongPress={handleLongPress}
            />
          ))}

          {isLoadingMore && (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color={BRAND} />
            </View>
          )}

          {!hasMore && notifications.length > 0 && (
            <Text className="text-center py-4 text-caption-secondary">
              Đã hiển thị tất cả thông báo
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default NotificationsScreen;
