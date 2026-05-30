// Description: Settings Messages screen - displays user conversations with real API data
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Edit3,
  MessageCircle,
  MoreVertical,
  Phone,
  Search,
  Send,
  Users,
  Video,
  Plus,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { useMessagesViewModel } from '../../../messages/application/view-models/useMessagesViewModel';
import type { ChatItem } from '../../../messages/domain/types/messages.types';
import { useStoriesViewModel } from '../../../stories';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { ROUTES } from '../../../navigation/constants/routes';

type SettingsMessagesNav = NativeStackNavigationProp<RootStackParamList>;

type ChatFilter = 'broadcast' | 'users' | 'groups';

// Format time to Vietnamese style
function formatTime(timestamp: number): string {
  if (!timestamp) return '';
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

// Online indicator dot
function OnlineDot({ isOnline }: { isOnline: boolean }) {
  if (!isOnline) return null;
  return (
    <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
  );
}

// User avatar component
function UserAvatar({ uri, name, size = 56 }: { uri?: string; name: string; size?: number }) {
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
        <Text className="text-lg font-bold text-blue-600">{initials}</Text>
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

// Chat list item
function ChatListItem({
  chat,
  onPress,
  selectable = false,
  selected = false,
}: {
  chat: ChatItem;
  onPress: (chat: ChatItem) => void;
  selectable?: boolean;
  selected?: boolean;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3 active:bg-gray-50"
      activeOpacity={0.8}
      onPress={() => onPress(chat)}
    >
      <View className="relative">
        <UserAvatar uri={chat.avatar} name={chat.name} />
        <OnlineDot isOnline={chat.isOnline} />
      </View>

      <View className="ml-3 flex-1 border-b border-gray-100 py-2">
        <View className="mb-1 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
              {chat.name}
            </Text>
            {chat.isVerified && (
              <CheckCircle2 size={14} color="#3b82f6" className="ml-1" />
            )}
          </View>
          <Text className="ml-2 text-xs text-gray-500">
            {formatTime(chat.lastMessageTime)}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text
            className={`flex-1 text-sm ${chat.unreadCount > 0 ? 'font-medium text-gray-800' : 'text-gray-500'}`}
            numberOfLines={1}
          >
            {chat.lastMessage || 'Chưa có tin nhắn'}
          </Text>
          {selectable ? (
            <View
              className={`ml-3 h-6 w-6 items-center justify-center rounded-full border ${
                selected
                  ? 'border-blue-600 bg-blue-600'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {selected && <Check size={15} color="#ffffff" />}
            </View>
          ) : (
            <View className="ml-2 flex-row items-center gap-2">
              <UnreadBadge count={chat.unreadCount} />
              <TouchableOpacity className="p-1" activeOpacity={0.7}>
                <MoreVertical size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Empty state
function EmptyChats({
  filter,
  hasQuery,
}: {
  filter: ChatFilter;
  hasQuery: boolean;
}) {
  const title = hasQuery
    ? 'Không tìm thấy cuộc trò chuyện'
    : filter === 'groups'
      ? 'Chưa có cuộc trò chuyện nhóm'
      : 'Chưa có cuộc trò chuyện nào';

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-blue-50">
        <MessageCircle size={48} color="#3b82f6" />
      </View>
      <Text className="mb-2 text-xl font-bold text-gray-900">{title}</Text>
      <Text className="text-center text-sm text-gray-500">
        Bắt đầu trò chuyện bằng cách nhấn vào biểu tượng soạn tin nhắn.
      </Text>
    </View>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <View className="flex-1 px-4 py-2">
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} className="flex-row items-center py-4">
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

// Error state
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <MessageCircle size={40} color="#ef4444" />
      </View>
      <Text className="mb-2 text-lg font-semibold text-gray-900">Đã xảy ra lỗi</Text>
      <Text className="mb-6 text-center text-sm text-gray-500">{message}</Text>
      <TouchableOpacity
        className="rounded-full bg-blue-500 px-6 py-3"
        activeOpacity={0.8}
        onPress={onRetry}
      >
        <Text className="font-semibold text-white">Thử lại</Text>
      </TouchableOpacity>
    </View>
  );
}

// Search bar
function SearchBar({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="mx-4 mb-3 flex-row items-center rounded-xl bg-gray-100 px-4 py-3">
      <Search size={18} color="#9ca3af" />
      <TextInput
        className="ml-3 flex-1 text-sm text-gray-900"
        placeholder="Tìm kiếm"
        placeholderTextColor="#9ca3af"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const FILTERS: Array<{
  key: ChatFilter;
  label: string;
  icon: typeof MessageCircle;
}> = [
  { key: 'broadcast', label: 'Gửi nhiều người', icon: Send },
  { key: 'users', label: 'Người dùng', icon: MessageCircle },
  { key: 'groups', label: 'Các nhóm', icon: Users },
];

function ChatFilters({
  value,
  onChange,
}: {
  value: ChatFilter;
  onChange: (value: ChatFilter) => void;
}) {
  return (
    <View className="mx-4 mb-2 flex-row gap-1">
      {FILTERS.map(filter => {
        const active = filter.key === value;
        const Icon = filter.icon;

        return (
          <TouchableOpacity
            key={filter.key}
            className={`flex-1 flex-row items-center justify-center rounded-lg px-1 py-3 ${
              active ? 'bg-indigo-100' : 'bg-white'
            }`}
            activeOpacity={0.8}
            onPress={() => onChange(filter.key)}
          >
            <Icon size={15} color={active ? '#0000ff' : '#8b8b8b'} />
            <Text
              className={`ml-1 text-xs font-semibold ${
                active ? 'text-blue-700' : 'text-gray-500'
              }`}
              numberOfLines={1}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Header action buttons
function HeaderActions() {
  return (
    <View className="flex-row items-center gap-2">
      <TouchableOpacity
        className="h-10 w-10 items-center justify-center rounded-full bg-blue-50"
        activeOpacity={0.8}
      >
        <Phone size={18} color="#3b82f6" />
      </TouchableOpacity>
      <TouchableOpacity
        className="h-10 w-10 items-center justify-center rounded-full bg-blue-50"
        activeOpacity={0.8}
      >
        <Video size={18} color="#3b82f6" />
      </TouchableOpacity>
    </View>
  );
}

// Messenger-style Stories row below search bar
function StoriesBubbleRow() {
  const navigation = useNavigation<SettingsMessagesNav>();
  const storiesVm = useStoriesViewModel();
  
  const cachedProfile = sessionStorage.getUserProfile();
  const avatarUrl = cachedProfile?.avatarUrl || undefined;

  const goToCreateStory = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_STORY);
  }, [navigation]);

  const goToViewerForGroup = useCallback(
    (index: number) => {
      navigation.navigate(ROUTES.STORY_VIEWER, {
        stories: storiesVm.stories,
        initialUserIndex: index,
      });
    },
    [navigation, storiesVm.stories],
  );

  return (
    <View className="py-3 border-b border-gray-100 bg-white">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
      >
        {/* Create Story Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={goToCreateStory}
          className="items-center"
          style={{ width: 68 }}
        >
          <View className="relative h-[60px] w-[60px] items-center justify-center rounded-full bg-slate-100">
            <Image
              source={{ uri: avatarUrl || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }}
              className="h-14 w-14 rounded-full"
              resizeMode="cover"
            />
            <View className="absolute bottom-0 right-0 h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600">
              <Plus size={12} color="#FFFFFF" strokeWidth={3} />
            </View>
          </View>
          <Text className="mt-1.5 text-center text-xs font-semibold text-gray-500" numberOfLines={1}>
            Tạo tin
          </Text>
        </TouchableOpacity>

        {/* Stories from Friends */}
        {storiesVm.stories.map((story, index) => {
          const hasUnseen = story.hasUnseen && !story.isViewed;
          
          return (
            <TouchableOpacity
              key={story.publisher.userId}
              activeOpacity={0.85}
              onPress={() => goToViewerForGroup(index)}
              className="items-center"
              style={{ width: 68 }}
            >
              <View
                className={`h-[60px] w-[60px] items-center justify-center rounded-full border-2 ${
                  hasUnseen ? 'border-blue-500' : 'border-gray-200'
                } p-[2px]`}
              >
                <Image
                  source={{ uri: story.publisher.avatarUrl }}
                  className="h-full w-full rounded-full"
                  resizeMode="cover"
                />
              </View>
              <Text className="mt-1.5 text-center text-xs text-gray-700 font-medium" numberOfLines={1}>
                {story.publisher.name.split(' ').pop()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Main screen
function SettingsMessagesScreen() {
  const navigation = useNavigation<SettingsMessagesNav>();
  const {
    chats,
    isLoadingChats,
    error,
    loadChats,
    loadMessages,
    isSending,
    sendBulkMessages,
  } = useMessagesViewModel();

  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('users');
  const [broadcastText, setBroadcastText] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(
    new Set(),
  );

  const visibleChats = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');

    return chats.filter(chat => {
      const matchesFilter =
        activeFilter === 'groups'
          ? chat.chatType === 'group'
          : activeFilter === 'broadcast'
            ? chat.chatType === 'user'
            : chat.chatType !== 'group';
      const matchesQuery =
        !normalizedQuery ||
        `${chat.name} ${chat.username} ${chat.lastMessage}`
          .toLocaleLowerCase('vi-VN')
          .includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, chats, query]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, [loadChats]);

  const handleChatPress = useCallback(
    (chat: ChatItem) => {
      if (activeFilter === 'broadcast') {
        setSelectedRecipients(previous => {
          const next = new Set(previous);

          if (next.has(chat.userId)) {
            next.delete(chat.userId);
          } else {
            next.add(chat.userId);
          }

          return next;
        });
        return;
      }

      if (chat.chatType === 'user') {
        void loadMessages(chat);
      }
      // TODO: Navigate to conversation detail screen
      // For now, just show an alert
      console.log('Selected chat:', chat.name);
    },
    [activeFilter, loadMessages],
  );

  const handleSendBroadcast = useCallback(async () => {
    const sent = await sendBulkMessages(
      [...selectedRecipients],
      broadcastText,
    );

    if (sent) {
      setSelectedRecipients(new Set());
      setBroadcastText('');
    }
  }, [broadcastText, selectedRecipients, sendBulkMessages]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Tin nhắn</Text>
        </View>
        <HeaderActions />
      </View>

      {/* Content */}
      <SearchBar value={query} onChangeText={setQuery} />
      <StoriesBubbleRow />
      <ChatFilters value={activeFilter} onChange={setActiveFilter} />
      {activeFilter === 'broadcast' && (
        <View className="mx-4 mb-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <Text className="mb-2 text-xs font-semibold text-gray-600">
            Đã chọn {selectedRecipients.size} người
          </Text>
          <View className="flex-row items-center">
            <TextInput
              className="mr-2 flex-1 rounded-lg bg-white px-3 py-2 text-sm text-gray-900"
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#9ca3af"
              value={broadcastText}
              onChangeText={setBroadcastText}
            />
            <TouchableOpacity
              className={`h-10 w-10 items-center justify-center rounded-full ${
                selectedRecipients.size > 0 && broadcastText.trim() && !isSending
                  ? 'bg-blue-600'
                  : 'bg-gray-300'
              }`}
              activeOpacity={0.8}
              disabled={
                selectedRecipients.size === 0 ||
                !broadcastText.trim() ||
                isSending
              }
              onPress={() => void handleSendBroadcast()}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Send size={17} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isLoadingChats && !refreshing ? (
        <LoadingSkeleton />
      ) : error && chats.length === 0 ? (
        <ErrorState message={error} onRetry={loadChats} />
      ) : (
        <FlatList
          data={visibleChats}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChatListItem
              chat={item}
              onPress={handleChatPress}
              selectable={activeFilter === 'broadcast'}
              selected={selectedRecipients.has(item.userId)}
            />
          )}
          ListEmptyComponent={
            <EmptyChats filter={activeFilter} hasQuery={query.trim().length > 0} />
          }
          contentContainerStyle={visibleChats.length === 0 ? { flex: 1 } : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3b82f6']}
              tintColor="#3b82f6"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* New message FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-blue-500 shadow-lg"
        activeOpacity={0.85}
        style={{
          shadowColor: '#3b82f6',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Edit3 size={24} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default SettingsMessagesScreen
