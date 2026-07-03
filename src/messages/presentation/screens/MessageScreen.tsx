// Description: Renders the canonical Messages conversation list with user, broadcast, and group tabs.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleUser,
  Edit3,
  FileText,
  Film,
  ImageIcon,
  MessageCircle,
  Mic,
  Package,
  Phone,
  Search,
  Send,
  Tag,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Video,
  X,
  Plus,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary, type MediaType } from 'react-native-image-picker';
import type { RootStackParamList } from '../../../navigation/types';
import type { RootStackRouteName } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { useMessagesViewModel } from '../../application/view-models/useMessagesViewModel';
import type {
  ChatItem,
  ChatPreviewKind,
  MessageAttachment,
  MessageLabel,
} from '../../domain/types/messages.types';
import { useStoriesViewModel } from '../../../stories';
import type { StoryItem } from '../../../stories';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAuthBranding } from '../../../auth/application/view-models/useAuthBranding';
import { useUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import { useNotificationBadgeViewModel } from '../../../notifications';
import CreateActionSheet from '../../../shared-kernel/presentation/components/CreateActionSheet';
import { HeaderProfileDrawer } from '../../../feed/presentation/components/HeaderProfileDrawer';

type MessagesNav = NativeStackNavigationProp<RootStackParamList>;

type ChatFilter = 'broadcast' | 'users' | 'groups';

const MESSAGE_COPY: Record<
  AppLanguage,
  {
    title: string;
    searchPlaceholder: string;
    createStory: string;
    retry: string;
    errorTitle: string;
    filters: Record<ChatFilter, string>;
    selectedRecipients: (count: number) => string;
    broadcastPlaceholder: string;
    now: string;
    minuteSuffix: string;
    weekdays: string[];
    noMessage: string;
    startConversation: string;
    sentImage: string;
    sentImageMe: string;
    sentVideo: string;
    sentVideoMe: string;
    sentAudio: string;
    sentAudioMe: string;
    audioCall: string;
    groupAudioCall: string;
    videoCall: string;
    groupVideoCall: string;
    sentFile: string;
    sentFileMe: string;
    sentProduct: string;
    sentProductMe: string;
    sentSticker: string;
    sentStickerMe: string;
    mePrefix: string;
  }
> = {
  vi: {
    title: 'Tin nhắn',
    searchPlaceholder: 'Tìm kiếm',
    createStory: 'Tạo tin',
    retry: 'Thử lại',
    errorTitle: 'Đã xảy ra lỗi',
    filters: {
      broadcast: 'Gửi nhiều người',
      users: 'Người dùng',
      groups: 'Các nhóm',
    },
    selectedRecipients: count => `Đã chọn ${count} người`,
    broadcastPlaceholder: 'Nhập tin nhắn...',
    now: 'Vừa xong',
    minuteSuffix: 'phút',
    weekdays: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    noMessage: 'Chưa có tin nhắn',
    startConversation: 'Bắt đầu trò chuyện',
    sentImage: 'Đã gửi ảnh',
    sentImageMe: 'Bạn đã gửi ảnh',
    sentVideo: 'Đã gửi video',
    sentVideoMe: 'Bạn đã gửi video',
    sentAudio: 'Đã gửi đoạn ghi âm',
    sentAudioMe: 'Bạn đã gửi đoạn ghi âm',
    audioCall: 'Cuộc gọi thoại',
    groupAudioCall: 'Cuộc gọi thoại nhóm',
    videoCall: 'Cuộc gọi video',
    groupVideoCall: 'Cuộc gọi video nhóm',
    sentFile: 'Đã gửi file',
    sentFileMe: 'Bạn đã gửi file',
    sentProduct: 'Đã gửi sản phẩm',
    sentProductMe: 'Bạn đã gửi sản phẩm',
    sentSticker: 'Đã gửi nhãn dán',
    sentStickerMe: 'Bạn đã gửi nhãn dán',
    mePrefix: 'Bạn',
  },
  en: {
    title: 'Messages',
    searchPlaceholder: 'Search',
    createStory: 'Create story',
    retry: 'Try again',
    errorTitle: 'Something went wrong',
    filters: {
      broadcast: 'Broadcast',
      users: 'People',
      groups: 'Groups',
    },
    selectedRecipients: count => `${count} selected`,
    broadcastPlaceholder: 'Type a message...',
    now: 'Just now',
    minuteSuffix: 'min',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    noMessage: 'No messages yet',
    startConversation: 'Start a conversation',
    sentImage: 'Sent a photo',
    sentImageMe: 'You sent a photo',
    sentVideo: 'Sent a video',
    sentVideoMe: 'You sent a video',
    sentAudio: 'Sent a voice message',
    sentAudioMe: 'You sent a voice message',
    audioCall: 'Voice call',
    groupAudioCall: 'Group voice call',
    videoCall: 'Video call',
    groupVideoCall: 'Group video call',
    sentFile: 'Sent a file',
    sentFileMe: 'You sent a file',
    sentProduct: 'Sent a product',
    sentProductMe: 'You sent a product',
    sentSticker: 'Sent a sticker',
    sentStickerMe: 'You sent a sticker',
    mePrefix: 'You',
  },
};

// Format time to Vietnamese style
function formatTime(timestamp: number, copy: typeof MESSAGE_COPY.vi): string {
  if (!timestamp) return '';
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return copy.now;
  if (diff < 3600) return `${Math.floor(diff / 60)} ${copy.minuteSuffix}`;
  if (diff < 86400) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (diff < 604800) {
    const date = new Date(timestamp * 1000);
    return copy.weekdays[date.getDay()];
  }
  const date = new Date(timestamp * 1000);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

// Get message preview icon and text based on message kind
function getMessagePreview(
  lastMessage: string,
  messageKind?: ChatPreviewKind,
  isFromMe: boolean = false,
  copy: typeof MESSAGE_COPY.vi = MESSAGE_COPY.vi,
): { icon: React.ReactNode; text: string } {
  // Based on ChatPreviewKind type
  switch (messageKind) {
    case 'image':
      return {
        icon: <ImageIcon size={14} color="#64748b" />,
        text: isFromMe ? copy.sentImageMe : copy.sentImage,
      };
    case 'video':
      return {
        icon: <Video size={14} color="#64748b" />,
        text: isFromMe ? copy.sentVideoMe : copy.sentVideo,
      };
    case 'audio':
      return {
        icon: <Mic size={14} color="#64748b" />,
        text: isFromMe ? copy.sentAudioMe : copy.sentAudio,
      };
    case 'audio_call':
      return {
        icon: <Phone size={14} color="#22c55e" />,
        text: copy.audioCall,
      };
    case 'video_call':
      return {
        icon: <Video size={14} color="#3b82f6" />,
        text: copy.videoCall,
      };
    case 'file':
      return {
        icon: <Mic size={14} color="#64748b" />,
        text: isFromMe ? copy.sentFileMe : copy.sentFile,
      };
    case 'product':
      return {
        icon: <MessageCircle size={14} color="#64748b" />,
        text: isFromMe ? copy.sentProductMe : copy.sentProduct,
      };
    case 'sticker':
      return {
        icon: <MessageCircle size={14} color="#64748b" />,
        text: isFromMe ? copy.sentStickerMe : copy.sentSticker,
      };
    case 'text':
    default:
      // Text message - show first part or last message
      if (lastMessage && lastMessage.trim()) {
        const text =
          lastMessage.length > 40
            ? lastMessage.substring(0, 40) + '...'
            : lastMessage;
        return {
          icon: null,
          text: isFromMe ? `${copy.mePrefix}: ${text}` : text,
        };
      }
      // No message - show placeholder
      return {
        icon: null,
        text: copy.startConversation,
      };
  }
}

type PresenceStatus = 'online' | 'offline' | 'hidden';

// Presence indicator dot
function PresenceDot({
  status,
  size = 14,
}: {
  status: PresenceStatus;
  size?: number;
}) {
  if (status === 'hidden') return null;

  const borderWidth = Math.max(2, Math.round(size * 0.15));

  return (
    <View
      className="absolute bottom-0 right-0"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor: '#ffffff',
        backgroundColor: status === 'online' ? '#22c55e' : '#94a3b8',
      }}
    />
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

function ChatLabelBadges({ labels }: { labels?: MessageLabel[] }) {
  if (!labels || labels.length === 0) return null;

  return (
    <View className="mt-1 flex-row items-center gap-1">
      {labels.slice(0, 4).map(label => (
        <View
          key={label.id}
          className="h-3 w-3 rounded border border-slate-200"
          style={{ backgroundColor: label.color }}
        />
      ))}
      {labels.length > 4 && (
        <Text className="text-[10px] font-semibold text-slate-400">
          +{labels.length - 4}
        </Text>
      )}
    </View>
  );
}

function LastMessagePreviewIcon({ kind }: { kind?: ChatPreviewKind }) {
  if (kind === 'audio_call') return <Phone size={14} color="#2563EB" />;
  if (kind === 'video_call') return <Video size={14} color="#2563EB" />;
  if (kind === 'image') return <ImageIcon size={14} color="#16A34A" />;
  if (kind === 'video') return <Film size={14} color="#7C3AED" />;
  if (kind === 'audio') return <Mic size={14} color="#EA580C" />;
  if (kind === 'file') return <FileText size={14} color="#64748B" />;
  if (kind === 'product') return <Package size={14} color="#0891B2" />;

  return null;
}

function getVisibleLastMessage(
  chat: ChatItem,
  copy: typeof MESSAGE_COPY.vi = MESSAGE_COPY.vi,
) {
  if (chat.lastMessageKind === 'audio_call') {
    return chat.chatType === 'group' ? copy.groupAudioCall : copy.audioCall;
  }
  if (chat.lastMessageKind === 'video_call') {
    return chat.chatType === 'group' ? copy.groupVideoCall : copy.videoCall;
  }

  return chat.lastMessage || copy.noMessage;
}

// Chat list item
function ChatListItem({
  chat,
  onPress,
  onLongPress,
  onOpenLabels,
  selectable = false,
  selected = false,
  copy,
}: {
  chat: ChatItem;
  onPress: (chat: ChatItem) => void;
  onLongPress?: (chat: ChatItem) => void;
  onOpenLabels?: (chat: ChatItem) => void;
  selectable?: boolean;
  selected?: boolean;
  copy: typeof MESSAGE_COPY.vi;
}) {
  // Check if this is a group chat
  const isGroup = chat.chatType === 'group';

  // Get message preview with icon based on lastMessageKind
  const messagePreview = getMessagePreview(
    chat.lastMessage || '',
    chat.lastMessageKind,
    false, // isFromMe - we don't have this info from chat list
    copy,
  );

  return (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3 active:bg-gray-50"
      activeOpacity={0.8}
      onPress={() => onPress(chat)}
      onLongPress={() => onLongPress?.(chat)}
    >
      <View className="relative">
        <UserAvatar uri={chat.avatar} name={chat.name} size={56} />
        <PresenceDot status={chat.isOnline ? 'online' : 'offline'} />
      </View>

      <View className="ml-3 flex-1 border-b border-gray-100 py-2">
        <View className="mb-1 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Text
              className="text-base font-semibold text-gray-900"
              numberOfLines={1}
            >
              {chat.name}
            </Text>
            {chat.isVerified && (
              <CheckCircle2 size={14} color="#3b82f6" className="ml-1" />
            )}
            {chat.isFollowing && (!chat.lastMessage || chat.lastMessageTime === 0) && (
              <View
                style={{
                  marginLeft: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#dbeafe',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                  gap: 3,
                }}
              >
                <UserPlus size={10} color="#2563eb" />
                <Text style={{ fontSize: 10, color: '#2563eb', fontWeight: '600' }}>
                  Bạn bè mới
                </Text>
              </View>
            )}
            {!chat.isFollowing && chat.isFollower && (
              <View
                style={{
                  marginLeft: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f3e8ff',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                  gap: 3,
                }}
              >
                <UserPlus size={10} color="#7c3aed" />
                <Text style={{ fontSize: 10, color: '#7c3aed', fontWeight: '600' }}>
                  Người follow
                </Text>
              </View>
            )}
            {isGroup && (
              <View className="ml-1 h-5 w-5 items-center justify-center rounded-full bg-purple-100">
                <Users size={12} color="#7c3aed" />
              </View>
            )}
          </View>
          <Text className="ml-2 text-xs text-gray-500">
            {formatTime(chat.lastMessageTime, copy)}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            <LastMessagePreviewIcon kind={chat.lastMessageKind} />
            <Text
              className={`flex-1 text-sm ${
                chat.lastMessageKind && chat.lastMessageKind !== 'text'
                  ? 'ml-1.5'
                  : ''
              } ${
                chat.unreadCount > 0
                  ? 'font-medium text-gray-800'
                  : 'text-gray-500'
              }`}
              numberOfLines={1}
            >
              {getVisibleLastMessage(chat)}
            </Text>
          </View>
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
              {chat.chatType === 'user' && (
                <TouchableOpacity
                  className="rounded-full border border-slate-200 bg-white p-1"
                  activeOpacity={0.7}
                  onPress={() => onOpenLabels?.(chat)}
                >
                  <Tag size={15} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        <ChatLabelBadges labels={chat.labels} />
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
      className={`flex-1 items-center justify-center px-2 py-3 ${
        isActive ? 'border-b-2 border-blue-500' : ''
      }`}
    >
      <Text
        className={`text-sm font-semibold ${
          isActive ? 'text-blue-600' : 'text-gray-500'
        }`}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// Group list item
export function GroupListItem({
  group,
  onPress,
  copy = MESSAGE_COPY.vi,
}: {
  group: {
    id: string;
    name: string;
    avatar?: string;
    lastMessageTime?: number;
    unreadCount?: number;
  };
  onPress: () => void;
  copy?: typeof MESSAGE_COPY.vi;
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
          <Text className="text-sm font-semibold text-gray-900">
            {group.name}
          </Text>
          {group.lastMessageTime && (
            <Text className="text-xs text-gray-500">
              {formatTime(group.lastMessageTime, copy)}
            </Text>
          )}
        </View>
        {group.unreadCount !== undefined && group.unreadCount > 0 && (
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="flex-1 text-xs text-gray-500">
              {copy.filters.groups}
            </Text>
            <UnreadBadge count={group.unreadCount} />
          </View>
        )}
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

// Error state
function ErrorState({
  message,
  onRetry,
  copy,
}: {
  message: string;
  onRetry: () => void;
  copy: typeof MESSAGE_COPY.vi;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <MessageCircle size={40} color="#ef4444" />
      </View>
      <Text className="mb-2 text-lg font-semibold text-gray-900">
        {copy.errorTitle}
      </Text>
      <Text className="mb-6 text-center text-sm text-gray-500">{message}</Text>
      <TouchableOpacity
        className="rounded-full bg-blue-500 px-6 py-3"
        activeOpacity={0.8}
        onPress={onRetry}
      >
        <Text className="font-semibold text-white">{copy.retry}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Search bar
function SearchBar({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View 
      className="mx-4 mt-4 mb-3 flex-row items-center rounded-full bg-slate-100 px-4"
      style={{ paddingVertical: Platform.OS === 'ios' ? 8 : 4 }}
    >
      <Search size={16} color="#64748b" />
      <TextInput
        className="ml-2 flex-1 text-sm text-slate-800"
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        style={{ paddingVertical: 0, height: 32 }}
      />
    </View>
  );
}

const FILTERS: Array<{
  key: ChatFilter;
  icon: typeof MessageCircle;
}> = [
  { key: 'broadcast', icon: Send },
  { key: 'users', icon: MessageCircle },
  { key: 'groups', icon: Users },
];

function ChatFilters({
  value,
  onChange,
  labels,
}: {
  value: ChatFilter;
  onChange: (value: ChatFilter) => void;
  labels: Record<ChatFilter, string>;
}) {
  return (
    <View className="mx-4 mt-2 mb-3 flex-row rounded-full bg-slate-100 p-1">
      {FILTERS.map(filter => {
        const active = filter.key === value;
        const Icon = filter.icon;

        return (
          <Pressable
            key={filter.key}
            className={`flex-1 flex-row items-center justify-center rounded-full py-2.5 ${
              active ? 'bg-white' : 'bg-transparent'
            }`}
            style={active ? {
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 1,
            } : undefined}
            onPress={() => onChange(filter.key)}
          >
            <Icon size={14} color={active ? '#2563eb' : '#64748b'} strokeWidth={active ? 2.5 : 2} />
            <Text
              className={`ml-1.5 text-xs font-semibold ${
                active ? 'text-slate-800 font-bold' : 'text-slate-500'
              }`}
              numberOfLines={1}
            >
              {labels[filter.key]}
            </Text>
          </Pressable>
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
function StoriesBubbleRow({
  chats,
  createStoryLabel,
}: {
  chats: ChatItem[];
  createStoryLabel: string;
}) {
  const navigation = useNavigation<MessagesNav>();
  const storiesVm = useStoriesViewModel();

  const cachedProfile = sessionStorage.getUserProfile();
  const avatarUrl = cachedProfile?.avatarUrl || undefined;
  const currentUserId = sessionStorage.getSession()?.userId ?? '';

  const goToCreateStory = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_STORY);
  }, [navigation]);

  const onlineByUserId = useMemo(() => {
    const statuses = new Map<string, boolean>();
    for (const chat of chats) {
      if (chat.chatType === 'user' && chat.userId) {
        statuses.set(chat.userId, chat.isOnline);
      }
    }
    return statuses;
  }, [chats]);

  const stories = useMemo<StoryItem[]>(
    () =>
      storiesVm.stories
        .filter(story => story.publisher.userId !== currentUserId)
        .map(story => {
          const knownOnline = onlineByUserId.get(story.publisher.userId);
          if (knownOnline === undefined) return story;

          return {
            ...story,
            publisher: {
              ...story.publisher,
              isOnline: knownOnline,
            },
          };
        }),
    [currentUserId, onlineByUserId, storiesVm.stories],
  );

  const goToViewerForGroup = useCallback(
    (index: number) => {
      navigation.navigate(ROUTES.STORY_VIEWER, {
        stories,
        initialUserIndex: index,
      });
    },
    [navigation, stories],
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
              source={{
                uri:
                  avatarUrl ||
                  'https://cdn-icons-png.flaticon.com/512/847/847969.png',
              }}
              className="h-14 w-14 rounded-full"
              resizeMode="cover"
            />
            <View className="absolute bottom-0 right-0 h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600">
              <Plus size={12} color="#FFFFFF" strokeWidth={3} />
            </View>
          </View>
          <Text
            className="mt-1.5 text-center text-xs font-semibold text-gray-500"
            numberOfLines={1}
          >
            {createStoryLabel}
          </Text>
        </TouchableOpacity>

        {/* Stories from Friends */}
        {stories.map((story, index) => {
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
                className={`relative h-[60px] w-[60px] items-center justify-center rounded-full border-2 ${
                  hasUnseen ? 'border-blue-500' : 'border-gray-200'
                } p-[2px]`}
              >
                <Image
                  source={{ uri: story.publisher.avatarUrl }}
                  className="h-full w-full rounded-full"
                  resizeMode="cover"
                />
                <PresenceDot
                  status={story.publisher.isOnline ? 'online' : 'hidden'}
                  size={13}
                />
              </View>
              <Text
                className="mt-1.5 text-center text-xs text-gray-700 font-medium"
                numberOfLines={1}
              >
                {story.publisher.name.split(' ').pop()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

type LabelSheetTab = 'assign' | 'manage';

const DEFAULT_LABEL_COLOR = '#3b82f6';

function hexOK(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value || '');
}

function MessageLabelsModal({
  visible,
  chat,
  labels,
  isLoading,
  onClose,
  onCreate,
  onDelete,
  onAttach,
  onDetach,
}: {
  visible: boolean;
  chat: ChatItem | null;
  labels: MessageLabel[];
  isLoading: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<boolean>;
  onDelete: (labelId: string) => Promise<boolean>;
  onAttach: (userId: string, labelId: string) => Promise<boolean>;
  onDetach: (userId: string, labelId: string) => Promise<boolean>;
}) {
  const [activeTab, setActiveTab] = useState<LabelSheetTab>('assign');
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState(DEFAULT_LABEL_COLOR);

  const attachedLabelIds = useMemo(
    () => new Set((chat?.labels ?? []).map(label => label.id)),
    [chat?.labels],
  );

  const handleCreate = useCallback(async () => {
    const color = hexOK(labelColor) ? labelColor : DEFAULT_LABEL_COLOR;
    const created = await onCreate(labelName, color);
    if (created) {
      setLabelName('');
      setLabelColor(DEFAULT_LABEL_COLOR);
    }
  }, [labelColor, labelName, onCreate]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/30">
        <View className="max-h-[86%] rounded-t-3xl bg-white px-5 pb-6 pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-900">
              Message labels
            </Text>
            <TouchableOpacity
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              onPress={onClose}
            >
              <X size={20} color="#334155" />
            </TouchableOpacity>
          </View>

          <View className="mb-5 flex-row border-b border-slate-200">
            {(
              [
                ['assign', 'Assign labels'],
                ['manage', 'Manage labels'],
              ] as const
            ).map(([key, title]) => (
              <TouchableOpacity
                key={key}
                className={`flex-1 items-center border-b-2 py-3 ${
                  activeTab === key ? 'border-blue-500' : 'border-transparent'
                }`}
                onPress={() => setActiveTab(key)}
              >
                <Text
                  className={`font-bold ${
                    activeTab === key ? 'text-blue-600' : 'text-slate-500'
                  }`}
                >
                  {title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'assign' ? (
            <View>
              <Text className="mb-3 text-base font-bold text-slate-900">
                Your label list
              </Text>
              <View className="overflow-hidden rounded-xl border border-slate-200">
                {labels.length === 0 ? (
                  <Text className="px-4 py-5 text-center text-sm text-slate-500">
                    No labels yet
                  </Text>
                ) : (
                  labels.map(label => {
                    const attached = attachedLabelIds.has(label.id);
                    return (
                      <View
                        key={label.id}
                        className="flex-row items-center border-b border-slate-100 px-4 py-3 last:border-b-0"
                      >
                        <View
                          className="mr-3 h-4 w-4 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <Text className="flex-1 text-base font-semibold text-slate-700">
                          {label.name}
                        </Text>
                        <TouchableOpacity
                          className={`rounded-lg px-4 py-2 ${
                            attached ? 'bg-slate-100' : 'bg-blue-500'
                          }`}
                          disabled={!chat || isLoading}
                          onPress={() => {
                            if (!chat) return;
                            const action = attached ? onDetach : onAttach;
                            action(chat.userId, label.id).catch(
                              () => undefined,
                            );
                          }}
                        >
                          <Text
                            className={`font-bold ${
                              attached ? 'text-slate-600' : 'text-white'
                            }`}
                          >
                            {attached ? 'Remove' : 'Attach'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>
              <Text className="mt-4 text-sm text-slate-500">
                Tip: use Attach/Remove to apply labels to the current contact.
              </Text>
            </View>
          ) : (
            <View>
              <Text className="mb-3 text-base font-bold text-slate-900">
                Manage your labels
              </Text>
              <View className="mb-4 flex-row items-center gap-2">
                <TextInput
                  className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-base text-slate-900"
                  placeholder="New label name"
                  placeholderTextColor="#94a3b8"
                  value={labelName}
                  onChangeText={setLabelName}
                />
                <View
                  className="h-11 w-12 rounded-lg border border-slate-300"
                  style={{
                    backgroundColor: hexOK(labelColor)
                      ? labelColor
                      : DEFAULT_LABEL_COLOR,
                  }}
                />
                <TextInput
                  className="h-11 w-28 rounded-lg border border-slate-300 px-3 text-base text-slate-900"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={7}
                  placeholder="#RRGGBB"
                  placeholderTextColor="#94a3b8"
                  value={labelColor}
                  onChangeText={setLabelColor}
                />
                <TouchableOpacity
                  className={`h-11 justify-center rounded-lg px-4 ${
                    labelName.trim() && !isLoading
                      ? 'bg-blue-500'
                      : 'bg-slate-300'
                  }`}
                  disabled={!labelName.trim() || isLoading}
                  onPress={() => {
                    handleCreate().catch(() => undefined);
                  }}
                >
                  <Text className="font-bold text-white">Create</Text>
                </TouchableOpacity>
              </View>
              <Text className="mb-4 text-xs text-slate-500">
                Use a hex color like #3b82f6.
              </Text>
              <View className="overflow-hidden rounded-xl border border-slate-200">
                {labels.length === 0 ? (
                  <Text className="px-4 py-5 text-center text-sm text-slate-500">
                    No labels yet
                  </Text>
                ) : (
                  labels.map(label => (
                    <View
                      key={label.id}
                      className="flex-row items-center border-b border-slate-100 px-4 py-3 last:border-b-0"
                    >
                      <View
                        className="mr-3 h-4 w-4 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <Text className="flex-1 text-base font-semibold text-slate-700">
                        {label.name}
                      </Text>
                      <TouchableOpacity
                        className="rounded-lg bg-red-500 px-4 py-2"
                        disabled={isLoading}
                        onPress={() => {
                          onDelete(label.id).catch(() => undefined);
                        }}
                      >
                        <Text className="font-bold text-white">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {isLoading && (
            <View className="mt-4 flex-row justify-center">
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Main screen
function MessageScreen() {
  const navigation = useNavigation<MessagesNav>();
  const language = useAppLanguage();
  const copy = MESSAGE_COPY[language];

  // Branding & Header states/hooks
  const { messageCount, notificationCount } = useUnreadBadgeCounts();
  const { logoUrl, imageErrorCount, notifyImageError } = useAuthBranding();
  const { user } = useCurrentUserViewModel();
  useNotificationBadgeViewModel();
  const [menuVisible, setMenuVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const handlePressLogo = useCallback(() => {
    navigation.navigate(ROUTES.MAIN_TABS, {
      screen: ROUTES.FEED,
    });
  }, [navigation]);

  const avatarUrl = user?.avatar;
  const transitionAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (avatarUrl) {
      const timer = setTimeout(() => {
        Animated.timing(transitionAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [avatarUrl, transitionAnim]);

  const {
    chats,
    labels,
    broadcastLabelId,
    broadcastRecipients,
    isLoadingChats,
    isLoadingLabels,
    error,
    loadChats,
    loadFollowingUserIds,
    isSending,
    sendBulkMessages,
    createLabel,
    deleteLabel,
    attachLabel,
    detachLabel,
    selectBroadcastLabel,
  } = useMessagesViewModel();

  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('users');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastAttachment, setBroadcastAttachment] =
    useState<MessageAttachment | null>(null);
  const [showBroadcastLabelOptions, setShowBroadcastLabelOptions] =
    useState(false);
  const [labelTargetChat, setLabelTargetChat] = useState<ChatItem | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(
    new Set(),
  );
  const hasFocusedOnceRef = useRef(false);
  const viewPagerRef = useRef<ScrollView | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const initialScrollOffset = useRef(
    activeFilter === 'users' ? screenWidth : activeFilter === 'groups' ? screenWidth * 2 : 0
  ).current;

  const isProgrammaticScrollRef = useRef(false);

  const handleTabPress = useCallback((filter: ChatFilter) => {
    isProgrammaticScrollRef.current = true;
    setActiveFilter(filter);
    setQuery('');
    const index = FILTERS.findIndex(f => f.key === filter);
    if (index !== -1) {
      viewPagerRef.current?.scrollTo({ x: index * screenWidth, animated: true });
    }
  }, [screenWidth]);

  const handleScroll = useCallback((e: any) => {
    if (isProgrammaticScrollRef.current) {
      return;
    }
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    const newFilter = FILTERS[index]?.key;
    if (newFilter && newFilter !== activeFilter) {
      setActiveFilter(newFilter);
      setQuery('');
    }
  }, [activeFilter, screenWidth]);

  const handleMomentumScrollEnd = useCallback(() => {
    isProgrammaticScrollRef.current = false;
  }, []);

  useEffect(() => {
    const index = FILTERS.findIndex(f => f.key === activeFilter);
    if (index !== -1) {
      const timer = setTimeout(() => {
        viewPagerRef.current?.scrollTo({ x: index * screenWidth, animated: false });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [screenWidth]);

  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnceRef.current) {
        loadChats(false, { forceRefresh: true, includeDiscovery: true }).catch(() => undefined);
        loadFollowingUserIds(true).catch(() => undefined);
      } else {
        hasFocusedOnceRef.current = true;
      }

      const interval = setInterval(() => {
        loadChats(false).catch(() => undefined);
      }, 5000);

      return () => clearInterval(interval);
    }, [loadChats, loadFollowingUserIds]),
  );

  const broadcastRecipientChats = useMemo(
    () =>
      broadcastRecipients.map(recipient => ({
        id: `user:${recipient.userId}`,
        chatId: recipient.userId,
        chatType: 'user' as const,
        participantId: recipient.userId,
        userId: recipient.userId,
        username: recipient.username,
        name: recipient.name || recipient.username || 'User',
        avatar: recipient.avatar,
        lastMessage: '',
        lastMessageTime: 0,
        unreadCount: 0,
        isOnline: false,
        isVerified: false,
        isFollowing: false,
        labels: recipient.labels,
      })),
    [broadcastRecipients],
  );

  const broadcastChats = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');
    const sourceChats = broadcastLabelId ? broadcastRecipientChats : [];
    return sourceChats.filter(chat => {
      const matchesQuery =
        !normalizedQuery ||
        `${chat.name} ${chat.username} ${getVisibleLastMessage(chat, copy)}`
          .toLocaleLowerCase('vi-VN')
          .includes(normalizedQuery);
      return matchesQuery;
    });
  }, [broadcastLabelId, broadcastRecipientChats, query, copy]);

  const usersChats = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');
    const filtered = chats.filter(chat => {
      const matchesFilter = chat.chatType !== 'group';
      const matchesQuery =
        !normalizedQuery ||
        `${chat.name} ${chat.username} ${getVisibleLastMessage(chat, copy)}`
          .toLocaleLowerCase('vi-VN')
          .includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });

    filtered.sort((a, b) => {
      const getPriority = (chat: ChatItem) => {
        if (chat.unreadCount > 0) return 4;
        const hasMsg = chat.lastMessageTime > 0;
        if (chat.isFollowing && !hasMsg) return 2;
        if (hasMsg) {
          const nowSeconds = Date.now() / 1000;
          const isRecent = nowSeconds - chat.lastMessageTime < 86400;
          return isRecent ? 3 : 1;
        }
        return 0;
      };

      const aPri = getPriority(a);
      const bPri = getPriority(b);
      if (aPri !== bPri) return bPri - aPri;

      const timeDiff = b.lastMessageTime - a.lastMessageTime;
      if (timeDiff !== 0) return timeDiff;
      return b.unreadCount - a.unreadCount;
    });

    return filtered;
  }, [chats, query, copy]);

  const groupsChats = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');
    return chats.filter(chat => {
      const matchesFilter = chat.chatType === 'group';
      const matchesQuery =
        !normalizedQuery ||
        `${chat.name} ${chat.username} ${getVisibleLastMessage(chat, copy)}`
          .toLocaleLowerCase('vi-VN')
          .includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [chats, query, copy]);

  const visibleChats = useMemo(() => {
    if (activeFilter === 'broadcast') return broadcastChats;
    if (activeFilter === 'groups') return groupsChats;
    return usersChats;
  }, [activeFilter, broadcastChats, groupsChats, usersChats]);

  const selectedBroadcastLabel = useMemo(
    () => labels.find(label => label.id === broadcastLabelId),
    [broadcastLabelId, labels],
  );

  const currentLabelChat = useMemo(() => {
    if (!labelTargetChat) return null;
    return (
      chats.find(
        chat =>
          chat.chatType === 'user' && chat.userId === labelTargetChat.userId,
      ) ?? labelTargetChat
    );
  }, [chats, labelTargetChat]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadChats(true, { forceRefresh: true }),
      loadFollowingUserIds(true),
    ]).catch(() => undefined);
    setRefreshing(false);
  }, [loadChats, loadFollowingUserIds]);

  const handleChatPress = useCallback(
    (chat: ChatItem) => {
      if (activeFilter === 'broadcast') {
        if (!broadcastLabelId) return;
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

      navigation.navigate(ROUTES.CHAT, { chat });
    },
    [activeFilter, broadcastLabelId, navigation],
  );

  const handleSelectBroadcastLabel = useCallback(
    async (labelId: string) => {
      setShowBroadcastLabelOptions(false);
      const recipients = await selectBroadcastLabel(labelId);
      setSelectedRecipients(
        new Set(recipients.map(recipient => recipient.userId)),
      );
    },
    [selectBroadcastLabel],
  );

  const handleToggleSelectAllRecipients = useCallback(() => {
    const allIds = visibleChats.map(chat => chat.userId).filter(Boolean);
    setSelectedRecipients(previous =>
      previous.size === allIds.length ? new Set() : new Set(allIds),
    );
  }, [visibleChats]);

  const handleChooseBroadcastImage = useCallback(async () => {
    const mediaType: MediaType = 'photo';
    const result = await launchImageLibrary({
      mediaType,
      selectionLimit: 1,
      quality: 0.9,
    });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setBroadcastAttachment({
      uri: asset.uri,
      name: asset.fileName || `broadcast_${Date.now()}.jpg`,
      type: asset.type || 'image/jpeg',
      mediaType: 'image',
    });
  }, []);

  const handleSendBroadcast = useCallback(async () => {
    const attachments = broadcastAttachment ? [broadcastAttachment] : [];
    const sent = await sendBulkMessages(
      [...selectedRecipients],
      broadcastText,
      attachments,
    );

    if (sent) {
      setSelectedRecipients(new Set());
      setBroadcastText('');
      setBroadcastAttachment(null);
    }
  }, [
    broadcastAttachment,
    broadcastText,
    selectedRecipients,
    sendBulkMessages,
  ]);

  const canSendBroadcast =
    selectedRecipients.size > 0 &&
    Boolean(broadcastText.trim() || broadcastAttachment) &&
    !isSending;

  const renderListEmpty = useCallback((filter: ChatFilter) => {
    if (isLoadingChats && !refreshing) {
      return <LoadingSkeleton />;
    }
    const currentChats = filter === 'broadcast' ? broadcastChats : filter === 'groups' ? groupsChats : usersChats;
    if (error && currentChats.length === 0) {
      return <ErrorState message={error} onRetry={() => loadChats()} copy={copy} />;
    }
    return <EmptyChats filter={filter} hasQuery={query.trim().length > 0} />;
  }, [isLoadingChats, refreshing, broadcastChats, groupsChats, usersChats, error, copy, loadChats, query]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerRoot}>
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePressLogo}
              style={styles.brandRow}
            >
              {logoUrl && imageErrorCount === 0 ? (
                <View style={styles.logoPill}>
                  <Image
                    source={{ uri: logoUrl }}
                    style={styles.logoImage}
                    resizeMode="contain"
                    onError={notifyImageError}
                  />
                </View>
              ) : (
                <View style={styles.textLogoPill}>
                  <Text style={styles.brandText}>VNSEEA</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.navigate(ROUTES.SEARCH)}
              style={styles.headerIcon}
            >
              <Search size={19} color="#0758ff" strokeWidth={2.4} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate(ROUTES.MAIN_TABS, {
                  screen: ROUTES.NOTIFICATIONS,
                })
              }
              style={[styles.headerIcon, styles.messageButton]}
            >
              <Bell size={19} color="#0758ff" strokeWidth={2.35} />
              {notificationCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setMenuVisible(true)}
              style={styles.headerIcon}
            >
              <View style={styles.profileIconContainer}>
                <Animated.View
                  style={[
                    styles.profileIconLayer,
                    {
                      opacity: transitionAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                      transform: [
                        {
                          scale: transitionAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0.7],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <CircleUser size={19} color="#0758ff" strokeWidth={2.2} />
                </Animated.View>
                {avatarUrl ? (
                  <Animated.View
                    style={[
                      styles.profileIconLayer,
                      {
                        opacity: transitionAnim,
                        transform: [
                          {
                            scale: transitionAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.7, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatarImage}
                    />
                  </Animated.View>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showTooltip && (
        <View style={styles.tooltipBubble}>
          <Text style={styles.tooltipText}>Chạm logo để về Home 🏠</Text>
          <View style={styles.tooltipArrow} />
        </View>
      )}

      {/* Fixed Tab Bar right below the Header */}
      <ChatFilters
        value={activeFilter}
        onChange={handleTabPress}
        labels={copy.filters}
      />

      {/* Swipeable page views */}
      <ScrollView
        ref={viewPagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentOffset={{
          x: initialScrollOffset,
          y: 0
        }}
        style={{ flex: 1 }}
      >
        {/* PAGE 0: Broadcast (Gửi nhiều người) */}
        <View style={{ width: screenWidth, flex: 1 }}>
          <FlatList
            data={isLoadingChats && !refreshing ? [] : broadcastChats}
            keyExtractor={item => item.id}
            extraData={`${activeFilter}:${selectedRecipients.size}:${query}:${labels.length}:${broadcastLabelId}:${isLoadingChats}:${refreshing}:${error}`}
            ListHeaderComponent={
              <View style={{ backgroundColor: '#ffffff' }}>
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  placeholder={copy.searchPlaceholder}
                />
                
                {/* Broadcast Panel */}
                <View className="mx-4 mb-3 rounded-2xl border border-indigo-100 bg-white p-4">
                  <Text className="mb-2 text-xs font-bold uppercase text-slate-400">
                    Label
                  </Text>
                  <TouchableOpacity
                    className="mb-2 flex-row items-center rounded-xl border border-indigo-200 px-3 py-3"
                    activeOpacity={0.8}
                    onPress={() => setShowBroadcastLabelOptions(previous => !previous)}
                  >
                    {selectedBroadcastLabel && (
                      <View
                        className="mr-2 h-3 w-3 rounded-full"
                        style={{ backgroundColor: selectedBroadcastLabel.color }}
                      />
                    )}
                    <Text className="flex-1 text-base text-slate-900">
                      {selectedBroadcastLabel?.name || 'Select label'}
                    </Text>
                    <ChevronDown size={18} color="#475569" />
                  </TouchableOpacity>

                  {showBroadcastLabelOptions && (
                    <View className="mb-3 overflow-hidden rounded-xl border border-slate-200">
                      {labels.length === 0 ? (
                        <Text className="px-3 py-3 text-sm text-slate-500">
                          No labels yet
                        </Text>
                      ) : (
                        labels.map(label => (
                          <TouchableOpacity
                            key={label.id}
                            className="flex-row items-center border-b border-slate-100 px-3 py-3 last:border-b-0"
                            onPress={() => {
                              handleSelectBroadcastLabel(label.id).catch(
                                () => undefined,
                              );
                            }}
                          >
                            <View
                              className="mr-2 h-3 w-3 rounded-full"
                              style={{ backgroundColor: label.color }}
                            />
                            <Text className="flex-1 font-semibold text-slate-700">
                              {label.name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}

                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-xs font-bold uppercase text-slate-400">
                      Send to
                    </Text>
                    <TouchableOpacity
                      className="flex-row items-center"
                      activeOpacity={0.8}
                      disabled={broadcastRecipientChats.length === 0}
                      onPress={handleToggleSelectAllRecipients}
                    >
                      <View
                        className={`mr-2 h-5 w-5 items-center justify-center rounded ${
                          broadcastRecipientChats.length > 0 &&
                          selectedRecipients.size === broadcastRecipientChats.length
                            ? 'bg-blue-600'
                            : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {broadcastRecipientChats.length > 0 &&
                          selectedRecipients.size === broadcastRecipientChats.length && (
                            <Check size={14} color="#ffffff" />
                          )}
                      </View>
                      <Text className="text-xs font-bold text-slate-500">
                        Select all
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="mb-3 min-h-12 flex-row flex-wrap items-center gap-2 rounded-xl border border-indigo-100 px-3 py-2">
                    {broadcastRecipientChats.length === 0 ? (
                      <Text className="text-sm text-slate-400">
                        Select a label to load recipients
                      </Text>
                    ) : (
                      broadcastRecipientChats
                        .filter(chat => selectedRecipients.has(chat.userId))
                        .map(chat => (
                          <TouchableOpacity
                            key={chat.userId}
                            className="flex-row items-center rounded-full bg-indigo-50 px-2 py-1"
                            onPress={() => handleChatPress(chat)}
                          >
                            <UserAvatar uri={chat.avatar} name={chat.name} size={24} />
                            <Text className="ml-1 max-w-[110px] text-xs font-semibold text-slate-600">
                              {chat.name}
                            </Text>
                            <X size={13} color="#94a3b8" />
                          </TouchableOpacity>
                        ))
                    )}
                  </View>

                  <TextInput
                    className="mb-3 min-h-20 border border-slate-300 px-3 py-2 text-base text-slate-900"
                    placeholder="Type your message"
                    placeholderTextColor="#94a3b8"
                    value={broadcastText}
                    multiline
                    textAlignVertical="top"
                    onChangeText={setBroadcastText}
                  />

                  <TouchableOpacity
                    className="mb-3 items-center justify-center rounded-2xl border border-indigo-100 py-3"
                    activeOpacity={0.8}
                    onPress={() => {
                      handleChooseBroadcastImage().catch(() => undefined);
                    }}
                  >
                    <View className="mb-2 h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                      <Upload size={18} color="#64748b" />
                    </View>
                    <Text className="font-semibold text-slate-900">
                      {broadcastAttachment?.name || 'Choose file...'}
                    </Text>
                    <Text className="mt-1 text-sm text-slate-500">Optional</Text>
                  </TouchableOpacity>

                  <View className="items-end border-t border-slate-100 pt-3">
                    <TouchableOpacity
                      className={`flex-row items-center rounded-full px-5 py-3 ${
                        canSendBroadcast ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                      activeOpacity={0.8}
                      disabled={!canSendBroadcast}
                      onPress={() => {
                        handleSendBroadcast().catch(() => undefined);
                      }}
                    >
                      {isSending ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Send size={17} color="#ffffff" />
                          <Text className="ml-2 font-bold text-white">
                            Send message
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            }
            ListEmptyComponent={renderListEmpty('broadcast')}
            renderItem={({ item }) => (
              <ChatListItem
                chat={item}
                onPress={handleChatPress}
                onOpenLabels={chat => setLabelTargetChat(chat)}
                selectable={true}
                selected={selectedRecipients.has(item.userId)}
                copy={copy}
              />
            )}
            contentContainerStyle={
              (isLoadingChats && !refreshing) || (error && broadcastChats.length === 0) || broadcastChats.length === 0
                ? { flexGrow: 1 }
                : undefined
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* PAGE 1: People (Người dùng) */}
        <View style={{ width: screenWidth, flex: 1 }}>
          <FlatList
            data={isLoadingChats && !refreshing ? [] : usersChats}
            keyExtractor={item => item.id}
            extraData={`${activeFilter}:${selectedRecipients.size}:${query}:${labels.length}:${broadcastLabelId}:${isLoadingChats}:${refreshing}:${error}`}
            ListHeaderComponent={
              <View style={{ backgroundColor: '#ffffff' }}>
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  placeholder={copy.searchPlaceholder}
                />
                <StoriesBubbleRow chats={chats} createStoryLabel={copy.createStory} />
              </View>
            }
            ListEmptyComponent={renderListEmpty('users')}
            renderItem={({ item }) => (
              <ChatListItem
                chat={item}
                onPress={handleChatPress}
                onOpenLabels={chat => setLabelTargetChat(chat)}
                selectable={false}
                selected={false}
                copy={copy}
              />
            )}
            contentContainerStyle={
              (isLoadingChats && !refreshing) || (error && usersChats.length === 0) || usersChats.length === 0
                ? { flexGrow: 1 }
                : undefined
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* PAGE 2: Groups (Các nhóm) */}
        <View style={{ width: screenWidth, flex: 1 }}>
          <FlatList
            data={isLoadingChats && !refreshing ? [] : groupsChats}
            keyExtractor={item => item.id}
            extraData={`${activeFilter}:${selectedRecipients.size}:${query}:${labels.length}:${broadcastLabelId}:${isLoadingChats}:${refreshing}:${error}`}
            ListHeaderComponent={
              <View style={{ backgroundColor: '#ffffff' }}>
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  placeholder={copy.searchPlaceholder}
                />
              </View>
            }
            ListEmptyComponent={renderListEmpty('groups')}
            renderItem={({ item }) => (
              <ChatListItem
                chat={item}
                onPress={handleChatPress}
                onOpenLabels={chat => setLabelTargetChat(chat)}
                selectable={false}
                selected={false}
                copy={copy}
              />
            )}
            contentContainerStyle={
              (isLoadingChats && !refreshing) || (error && groupsChats.length === 0) || groupsChats.length === 0
                ? { flexGrow: 1 }
                : undefined
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>

      {activeFilter !== 'broadcast' && (
        <View className="absolute bottom-6 right-6">
          <Pressable
            className="h-14 w-14 items-center justify-center rounded-full bg-blue-600"
            style={({ pressed }: { pressed: boolean }) => ({
              shadowColor: '#2563eb',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
            onPress={() => navigation.navigate(ROUTES.CREATE_GROUP_CHAT)}
          >
            <Users size={24} color="#ffffff" />
          </Pressable>
        </View>
      )}

      <MessageLabelsModal
        visible={Boolean(currentLabelChat)}
        chat={currentLabelChat}
        labels={labels}
        isLoading={isLoadingLabels}
        onClose={() => setLabelTargetChat(null)}
        onCreate={createLabel}
        onDelete={deleteLabel}
        onAttach={attachLabel}
        onDetach={detachLabel}
      />
      <HeaderProfileDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
    </SafeAreaView>
  );
}

export default MessageScreen;

const styles = StyleSheet.create({
  headerRoot: {
    height: 68,
    borderBottomWidth: 1,
    borderBottomColor: '#e8ebf3',
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  topBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPill: {
    backgroundColor: '#1200ff',
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 6,
    height: 37,
    minWidth: 110,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0000ff',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  logoImage: {
    width: 100,
    height: '100%',
  },
  textLogoPill: {
    minWidth: 110,
    height: 37,
    borderRadius: 11,
    backgroundColor: '#1200ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0000ff',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eef1f7',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  messageButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff3b4f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileIconContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  profileIconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  avatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  tooltipBubble: {
    position: 'absolute',
    top: 60,
    left: 12,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 9999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
    minWidth: 150,
  },
  tooltipText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    top: -6,
    left: 51,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderLeftColor: 'transparent',
    borderRightWidth: 6,
    borderRightColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: '#0f172a',
  },
});
