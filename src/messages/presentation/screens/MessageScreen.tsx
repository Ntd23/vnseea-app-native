// Description: Messages screen with real API integration - displays chat list and conversations
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  MessageCircle,
  MoreVertical,
  Phone,
  Search,
  Send,
  Video,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { useMessagesViewModel } from '../../application/view-models/useMessagesViewModel';
import type { ChatItem } from '../../domain/types/messages.types';

type MessageNav = NativeStackNavigationProp<RootStackParamList>;

// Avatar placeholder
const DEFAULT_AVATAR = 'https://via.placeholder.com/100';

// Format time to Vietnamese style
function formatTime(timestamp: number): string {
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
    <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
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
}: {
  chat: ChatItem;
  onPress: (chat: ChatItem) => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3 active:bg-gray-100"
      activeOpacity={0.8}
      onPress={() => onPress(chat)}
    >
      <View className="relative">
        <UserAvatar uri={chat.avatar} name={chat.name} />
        <OnlineDot isOnline={chat.isOnline} />
      </View>

      <View className="ml-3 flex-1 border-b border-gray-100 py-3">
        <View className="mb-1 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-base font-semibold text-gray-900">{chat.name}</Text>
            {chat.isVerified && (
              <CheckCircle2 size={14} color="#3b82f6" className="ml-1" />
            )}
          </View>
          <Text className="text-xs text-gray-500">{formatTime(chat.lastMessageTime)}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text
            className={`flex-1 text-sm ${chat.unreadCount > 0 ? 'font-medium text-gray-800' : 'text-gray-500'}`}
            numberOfLines={1}
          >
            {chat.lastMessage || 'Chưa có tin nhắn'}
          </Text>
          <UnreadBadge count={chat.unreadCount} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Empty state
function EmptyChats() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-blue-50">
        <MessageCircle size={48} color="#3b82f6" />
      </View>
      <Text className="mb-2 text-xl font-bold text-gray-900">Chưa có tin nhắn nào</Text>
      <Text className="text-center text-sm text-gray-500">
        Bắt đầu trò chuyện với bạn bè bằng cách nhấn vào biểu tượng tin nhắn bên dưới
      </Text>
    </View>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <View className="flex-1 px-4">
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
function SearchBar() {
  return (
    <View className="mx-4 mb-4 flex-row items-center rounded-full bg-gray-100 px-4 py-3">
      <Search size={18} color="#9ca3af" />
      <TextInput
        className="ml-3 flex-1 text-sm text-gray-900"
        placeholder="Tìm kiếm cuộc trò chuyện..."
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}

// Main screen
function MessageScreen() {
  const navigation = useNavigation<MessageNav>();
  const {
    chats,
    isLoadingChats,
    error,
    loadChats,
    loadMessages,
  } = useMessagesViewModel();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, [loadChats]);

  const handleChatPress = useCallback(
    (chat: ChatItem) => {
      loadMessages(chat);
      // TODO: Navigate to conversation detail screen
      Alert.alert('Mở cuộc trò chuyện', `Với: ${chat.name}`);
    },
    [loadMessages],
  );

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
        >
          <Edit3 size={20} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <SearchBar />

      {isLoadingChats && !refreshing ? (
        <LoadingSkeleton />
      ) : error && chats.length === 0 ? (
        <ErrorState message={error} onRetry={loadChats} />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChatListItem chat={item} onPress={handleChatPress} />
          )}
          ListEmptyComponent={<EmptyChats />}
          contentContainerStyle={chats.length === 0 ? { flex: 1 } : undefined}
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

export default MessageScreen