// Description: Messages screen with stories, tabs filtering, and multi-user messaging
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  MessageCircle,
  Mic,
  PhoneCall,
  Search,
  Send,
  Users,
  Video,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { useMessagesViewModel } from '../../application/view-models/useMessagesViewModel';
import { useStoriesViewModel } from '../../../stories';
import type { ChatItem, ChatPreviewKind } from '../../domain/types/messages.types';

type MessageNav = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'users' | 'groups' | 'all';

// Format time to Vietnamese style
function formatTime(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return '';

  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800) {
    const date = new Date(timestamp * 1000);
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[date.getDay()];
  }
  const date = new Date(timestamp * 1000);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

// Get message preview icon and text based on message kind
function getMessagePreview(
  lastMessage: string,
  messageKind?: ChatPreviewKind,
  isFromMe: boolean = false
): { icon: React.ReactNode; text: string } {
  // Based on ChatPreviewKind type
  switch (messageKind) {
    case 'image':
      return {
        icon: <ImageIcon size={14} color="#64748b" />,
        text: isFromMe ? 'Bạn đã gửi ảnh' : 'Đã gửi ảnh',
      };
    case 'video':
      return {
        icon: <Video size={14} color="#64748b" />,
        text: isFromMe ? 'Bạn đã gửi video' : 'Đã gửi video',
      };
    case 'audio':
      return {
        icon: <Mic size={14} color="#64748b" />,
        text: isFromMe ? 'Bạn đã gửi đoạn ghi âm' : 'Đã gửi đoạn ghi âm',
      };
    case 'audio_call':
      return {
        icon: <PhoneCall size={14} color="#22c55e" />,
        text: isFromMe ? 'Cuộc gọi thoại' : 'Cuộc gọi thoại',
      };
    case 'video_call':
      return {
        icon: <Video size={14} color="#3b82f6" />,
        text: isFromMe ? 'Cuộc gọi video' : 'Cuộc gọi video',
      };
    case 'file':
      return {
        icon: <Mic size={14} color="#64748b" />,
        text: isFromMe ? 'Bạn đã gửi file' : 'Đã gửi file',
      };
    case 'product':
      return {
        icon: <MessageCircle size={14} color="#64748b" />,
        text: isFromMe ? 'Bạn đã gửi sản phẩm' : 'Đã gửi sản phẩm',
      };
    case 'sticker':
      return {
        icon: <MessageCircle size={14} color="#64748b" />,
        text: isFromMe ? 'Bạn đã gửi nhãn dán' : 'Đã gửi nhãn dán',
      };
    case 'text':
    default:
      // Text message - show first part or last message
      if (lastMessage && lastMessage.trim()) {
        const text = lastMessage.length > 40 ? lastMessage.substring(0, 40) + '...' : lastMessage;
        return {
          icon: null,
          text: isFromMe ? `Bạn: ${text}` : text,
        };
      }
      // No message - show placeholder
      return {
        icon: null,
        text: 'Bắt đầu trò chuyện',
      };
  }
}

// Online indicator dot
function OnlineDot({ isOnline }: { isOnline: boolean }) {
  if (!isOnline) return null;
  return (
    <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
  );
}

// User avatar component
function UserAvatar({
  uri,
  name,
  size = 56,
}: {
  uri?: string;
  name: string;
  size?: number;
}) {
  const [error, setError] = useState(false);

  if (error || !uri) {
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <View
        className="items-center justify-center rounded-full bg-blue-100"
        style={{ width: size, height: size }}
      >
        <Text
          className="font-bold text-blue-600"
          style={{ fontSize: size ? size * 0.35 : 16 }}
        >
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      className="rounded-full"
      style={{ width: size, height: size }}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
}

// Unread badge
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <View className="min-h-6 min-w-6 items-center justify-center rounded-full bg-blue-500 px-2">
      <Text className="text-xs font-bold text-white">
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

// Story bubble
function StoryBubble({
  story,
  onPress,
}: {
  story: {
    id: string;
    publisher: { name: string; avatarUrl?: string };
    thumbnailUrl?: string;
    hasUnseen: boolean;
    isViewed: boolean;
  };
  onPress: () => void;
}) {
  const hasUnseen = story.hasUnseen && !story.isViewed;
  const ringColor = hasUnseen ? 'ring-blue-500' : 'ring-gray-300';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="items-center"
      style={{ width: 70 }}
    >
      <View className="mb-1">
        <View className={`h-16 w-16 items-center justify-center rounded-full ring-2 ${ringColor}`}>
          {story.publisher.avatarUrl ? (
            <Image
              source={{ uri: story.publisher.avatarUrl }}
              className="h-14 w-14 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-14 w-14 rounded-full bg-gray-300" />
          )}
        </View>
        {hasUnseen && (
          <View className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-blue-500" />
        )}
      </View>
      <Text className="text-xs text-gray-600" numberOfLines={1}>
        {story.publisher.name}
      </Text>
    </TouchableOpacity>
  );
}

// Chat list item with message preview, time, and type indicators
function ChatListItem({
  chat,
  onPress,
  onLongPress,
}: {
  chat: ChatItem;
  onPress: (chat: ChatItem) => void;
  onLongPress?: (chat: ChatItem) => void;
}) {
  // Check if this is a group chat
  const isGroup = chat.chatType === 'group';

  // Get message preview with icon based on lastMessageKind
  const messagePreview = getMessagePreview(
    chat.lastMessage || '',
    chat.lastMessageKind,
    false // isFromMe - we don't have this info from chat list
  );

  return (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3"
      activeOpacity={0.8}
      onPress={() => onPress(chat)}
      onLongPress={() => onLongPress?.(chat)}
    >
      <View className="relative">
        <UserAvatar uri={chat.avatar} name={chat.name} size={56} />
        <OnlineDot isOnline={chat.isOnline} />
      </View>

      <View className="ml-3 flex-1 border-b border-gray-100 py-2">
        <View className="mb-1 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
              {chat.name}
            </Text>
            {chat.isVerified && (
              <CheckCircle2 size={14} color="#3b82f6" className="ml-1" />
            )}
            {isGroup && (
              <View className="ml-1 h-5 w-5 items-center justify-center rounded-full bg-purple-100">
                <Users size={12} color="#7c3aed" />
              </View>
            )}
          </View>
          <Text className="text-xs text-gray-500 whitespace-nowrap">
            {formatTime(chat.lastMessageTime)}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            {messagePreview.icon && (
              <View className="mr-1">{messagePreview.icon}</View>
            )}
            <Text
              className={`flex-1 text-sm ${chat.unreadCount > 0 ? 'font-medium text-gray-800' : 'text-gray-500'}`}
              numberOfLines={1}
            >
              {messagePreview.text}
            </Text>
          </View>
          <UnreadBadge count={chat.unreadCount} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Tab button
function TabButton({
  title,
  isActive,
  onPress,
}: {
  title: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`flex-1 items-center justify-center px-2 py-3 ${isActive ? 'border-b-2 border-blue-500' : ''}`}
    >
      <Text className={`text-sm font-semibold ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// User list item (for selecting multiple users)
function UserListItem({
  user,
  onPress,
}: {
  user: {
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
  };
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="flex-row items-center px-4 py-3"
    >
      <View className="relative">
        <UserAvatar uri={user.avatar} name={user.name} size={48} />
        {user.isOnline && (
          <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
        )}
      </View>
      <Text className="ml-3 flex-1 text-sm font-medium text-gray-800">{user.name}</Text>
    </TouchableOpacity>
  );
}

// Group list item
function GroupListItem({
  group,
  onPress,
}: {
  group: {
    id: string;
    name: string;
    avatar?: string;
    lastMessageTime?: number;
    unreadCount?: number;
  };
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="flex-row items-center px-4 py-3"
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-purple-100">
        <Users size={24} color="#7c3aed" />
      </View>
      <View className="ml-3 flex-1 border-b border-gray-100 py-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-gray-900">{group.name}</Text>
          {group.lastMessageTime && (
            <Text className="text-xs text-gray-500">{formatTime(group.lastMessageTime)}</Text>
          )}
        </View>
        {group.unreadCount !== undefined && group.unreadCount > 0 && (
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="flex-1 text-xs text-gray-500">Nhắn tin nhóm</Text>
            <UnreadBadge count={group.unreadCount} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Empty state
function EmptyChats({ message }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-blue-50">
        <MessageCircle size={48} color="#3b82f6" />
      </View>
      <Text className="mb-2 text-xl font-bold text-gray-900">Chưa có cuộc trò chuyện</Text>
      <Text className="text-center text-sm text-gray-500">
        {message || 'Chọn người để bắt đầu cuộc trò chuyện'}
      </Text>
    </View>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <View className="flex-1 px-4 py-4">
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} className="mb-4 flex-row items-center">
          <View className="h-14 w-14 rounded-full bg-gray-200" />
          <View className="ml-3 flex-1">
            <View className="mb-2 h-4 w-32 rounded bg-gray-200" />
            <View className="h-3 w-48 rounded bg-gray-100" />
          </View>
        </View>
      ))}
    </View>
  );
}

// Main screen
export default function MessageScreen() {
  const navigation = useNavigation<MessageNav>();
  const vm = useMessagesViewModel();
  const {
    chatSyncIntervalMs,
    loadGroupChats,
    syncLatestChats,
  } = vm;
  const storiesVm = useStoriesViewModel();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [isSelectingMode, setIsSelectingMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      syncLatestChats().catch(() => undefined);

      const interval = setInterval(() => {
        syncLatestChats().catch(() => undefined);
        if (activeTab === 'groups' || activeTab === 'all') {
          loadGroupChats(false).catch(() => undefined);
        }
      }, chatSyncIntervalMs);

      return () => clearInterval(interval);
    }, [activeTab, chatSyncIntervalMs, loadGroupChats, syncLatestChats]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await vm.loadChats();
    setRefreshing(false);
  }, [vm]);

  const handleChatPress = useCallback(
    (chat: ChatItem) => {
      console.log('[MessageScreen] Opening chat:', chat.name, chat.id);
      navigation.navigate(ROUTES.CHAT, { chat });
    },
    [navigation],
  );

  const handleChatLongPress = useCallback(
    (chat: ChatItem) => {
      Alert.alert(
        chat.name,
        'Chọn hành động',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa cuộc trò chuyện',
            style: 'destructive',
            onPress: () => {
              console.log('Delete chat:', chat.id);
            },
          },
        ],
      );
    },
    [],
  );

  const handleCreateGroup = () => {
    navigation.navigate(ROUTES.CREATE_GROUP_CHAT);
  };

  const handleStoryPress = useCallback(
    (index: number) => {
      navigation.navigate(ROUTES.STORY_VIEWER, {
        stories: storiesVm.stories,
        initialUserIndex: index,
      });
    },
    [navigation, storiesVm.stories],
  );

  const handleStartMultiUser = () => {
    setIsSelectingMode(true);
    setActiveTab('users');
  };

  const handleCancelSelecting = () => {
    setIsSelectingMode(false);
    setSelectedUserIds([]);
    setMessageText('');
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId],
    );
  };

  const handleSendMultiUser = async () => {
    if (selectedUserIds.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một người để gửi tin nhắn.');
      return;
    }

    if (!messageText.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung tin nhắn.');
      return;
    }

    const success = await vm.sendBulkMessages(selectedUserIds, messageText.trim());

    if (success) {
      Alert.alert('Thành công', `Tin nhắn đã được gửi đến ${selectedUserIds.length} người!`);
      setMessageText('');
      setSelectedUserIds([]);
      setIsSelectingMode(false);
    } else {
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    }
  };

  // Get users from chats (for user selection mode)
  const allUsers = vm.chats
    .filter(c => c.chatType === 'user')
    .map(c => ({
      id: c.userId || c.id,
      name: c.name,
      avatar: c.avatar,
      isOnline: c.isOnline,
    }));

  // Get groups from chats
  const groupChats = vm.chats.filter(c => c.chatType === 'group');

  // Filter chats based on tab and search
  const filteredChats = vm.chats.filter(chat => {
    // Filter by tab
    if (activeTab === 'users' && chat.chatType !== 'user') return false;
    if (activeTab === 'groups' && chat.chatType !== 'group') return false;

    // Filter by search
    if (searchQuery) {
      return chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  // Stories from storiesViewModel
  const displayStories = [
    { id: 'create', publisher: { name: 'Tạo tin' }, hasUnseen: false, isViewed: false },
    ...storiesVm.stories,
  ];

  // Multi-user selection mode
  if (isSelectingMode) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={handleCancelSelecting}
          >
            <ArrowLeft size={22} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Gửi tin nhắn</Text>
          <View className="h-10 w-10 items-center justify-center">
            {selectedUserIds.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSendMultiUser}
              >
                <Send size={22} color="#3b82f6" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Selected count */}
        {selectedUserIds.length > 0 && (
          <View className="bg-blue-50 px-4 py-2">
            <Text className="text-sm font-medium text-blue-600">
              Đã chọn {selectedUserIds.length} người
            </Text>
          </View>
        )}

        {/* Message input */}
        <View className="mx-4 mb-3 mt-3 flex-row items-center rounded-full border border-gray-200 bg-gray-50 px-4 py-3">
          <TextInput
            className="flex-1 text-sm text-gray-900"
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#9ca3af"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
        </View>

        {/* Tabs for multi-user mode */}
        <View className="mb-3 flex-row border-b border-gray-200">
          <TabButton
            title="Người dùng"
            isActive={activeTab === 'users'}
            onPress={() => setActiveTab('users')}
          />
          <TabButton
            title="Các nhóm"
            isActive={activeTab === 'groups'}
            onPress={() => setActiveTab('groups')}
          />
        </View>

        {/* User/Group list */}
        {activeTab === 'users' ? (
          <FlatList
            data={allUsers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <UserListItem
                user={item}
                onPress={() => {
                  handleUserToggle(item.id);
                }}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
              />
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-sm text-gray-500">Không có người dùng</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={groupChats}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <GroupListItem
                group={item}
                onPress={() => {
                  handleUserToggle(item.id);
                }}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
              />
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-sm text-gray-500">Chưa có nhóm nào</Text>
              </View>
            }
          />
        )}

        {/* Send button */}
        {selectedUserIds.length > 0 && messageText.trim() && (
          <View className="absolute bottom-6 left-4 right-4">
            <TouchableOpacity
              className="flex-row items-center justify-center rounded-full bg-blue-500 py-4 shadow-lg"
              activeOpacity={0.85}
              onPress={handleSendMultiUser}
            >
              <Send size={20} color="#ffffff" className="mr-2" />
              <Text className="text-base font-semibold text-white">
                Gửi đến {selectedUserIds.length} người
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Normal messages view
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Tin nhắn</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={handleCreateGroup}
        >
          <Users size={20} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View className="mx-4 mb-3 mt-2 flex-row items-center rounded-full bg-gray-100 px-4 py-3">
        <Search size={18} color="#9ca3af" />
        <TextInput
          className="ml-3 flex-1 text-sm text-gray-900"
          placeholder="Tìm kiếm cuộc trò chuyện..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Stories row */}
      {displayStories.length > 1 && (
        <View className="mb-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {displayStories.map((story, index) => (
              <StoryBubble
                key={story.id}
                story={story}
                onPress={() => {
                  if (story.id === 'create') {
                    navigation.navigate(ROUTES.CREATE_STORY);
                  } else {
                    handleStoryPress(index - 1);
                  }
                }}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tabs */}
      <View className="mb-3 flex-row border-b border-gray-200">
        <TabButton
          title="Người dùng"
          isActive={activeTab === 'users'}
          onPress={() => setActiveTab('users')}
        />
        <TabButton
          title="Các nhóm"
          isActive={activeTab === 'groups'}
          onPress={() => setActiveTab('groups')}
        />
        <TabButton
          title="Tất cả"
          isActive={activeTab === 'all'}
          onPress={() => setActiveTab('all')}
        />
      </View>

      {/* Content */}
      {vm.isLoadingChats && !refreshing ? (
        <LoadingSkeleton />
      ) : vm.error && filteredChats.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-4 text-sm text-red-500">{vm.error}</Text>
          <TouchableOpacity
            className="rounded-full bg-blue-500 px-6 py-3"
            activeOpacity={0.8}
            onPress={() => vm.loadChats()}
          >
            <Text className="font-semibold text-white">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === 'users' ? (
        <FlatList
          data={filteredChats}
          keyExtractor={item => item.id}
          extraData={vm.chats}
          renderItem={({ item }) => (
            <ChatListItem
              chat={item}
              onPress={(chat) => handleChatPress(chat)}
              onLongPress={(chat) => handleChatLongPress(chat)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyChats message="Chưa có cuộc trò chuyện với người dùng nào" />}
        />
      ) : activeTab === 'groups' ? (
        <FlatList
          data={filteredChats}
          keyExtractor={item => item.id}
          extraData={vm.chats}
          renderItem={({ item }) => (
            <ChatListItem
              chat={item}
              onPress={(chat) => handleChatPress(chat)}
              onLongPress={(chat) => handleChatLongPress(chat)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyChats message="Chưa có nhóm chat nào" />}
        />
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={item => item.id}
          extraData={vm.chats}
          renderItem={({ item }) => (
            <ChatListItem
              chat={item}
              onPress={(chat) => handleChatPress(chat)}
              onLongPress={(chat) => handleChatLongPress(chat)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyChats />}
        />
      )}

      {/* Multi-user message FAB */}
      <View className="absolute bottom-6 right-6">
        <TouchableOpacity
          className="h-14 w-14 items-center justify-center rounded-full bg-green-500 shadow-lg"
          activeOpacity={0.85}
          onPress={handleStartMultiUser}
          style={{
            shadowColor: '#22c55e',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Users size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
