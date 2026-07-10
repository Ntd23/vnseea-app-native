// Description: Renders the canonical Messages conversation list with user, broadcast, and group tabs.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {

  ActivityIndicator,

  Alert,

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

  Keyboard,
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

  ImageIcon,

  Link2,

  ListChecks,

  MessageCircle,

  Mic,

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

  Zap,

} from 'lucide-react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { showToast, ToastContainer } from '../../../shared-kernel/presentation/components/ToastNotification';

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

import { ColorPicker } from '../../../shared-kernel/presentation/components/ColorPicker';

import { HeaderProfileDrawer } from '../../../feed/presentation/components/HeaderProfileDrawer';

type MessagesNav = NativeStackNavigationProp<RootStackParamList>;

type ChatFilter = 'broadcast' | 'users' | 'groups';

const MESSAGE_COPY: Record<

  AppLanguage,

  {

    title: string;

    searchPlaceholder: string;

    createStory: string;

    createGroupChat: string;

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

    sentLink: string;

    sentLinkMe: string;

    mePrefix: string;

    broadcastLabel: string;

    selectLabelPlaceholder: string;

    noLabelsYet: string;

    sendTo: string;

    selectAll: string;

    selectLabelToLoadRecipients: string;

    typeYourMessagePlaceholder: string;

    chooseFile: string;

    optionalLabel: string;

    sendMessageButton: string;

    createLabelBtn: string;

    quickSendBtn: string;

    createNewLabelTitle: string;

    labelNameTitle: string;

    labelNamePlaceholder: string;

    labelColorTitle: string;

    colorPickerPreset: string;

    colorPickerCustom: string;

    colorPickerPopular: string;

    colorPickerAllColors: string;

    colorPickerCustomize: string;

    colorPickerHexCode: string;

    colorPickerSelected: string;

    cancelButton: string;

    createButton: string;

    manageLabels: string;

    assignLabels: string;

    yourLabelList: string;

    manageYourLabels: string;

    manageTip: string;

    attach: string;

    remove: string;

    delete: string;

  }

> = {

  vi: {

    title: 'Tin nhắn',

    searchPlaceholder: 'Tìm kiếm',

    createStory: 'Tạo tin',

    createGroupChat: 'Tạo nhóm chat',

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

    sentLink: 'Liên kết',

    sentLinkMe: 'Bạn đã gửi liên kết',

    mePrefix: 'Bạn',

    broadcastLabel: 'Nhãn',

    selectLabelPlaceholder: 'Chọn nhãn',

    noLabelsYet: 'Chưa có nhãn nào',

    sendTo: 'Gửi tới',

    selectAll: 'Chọn tất cả',

    selectLabelToLoadRecipients: 'Chọn nhãn để tải người nhận',

    typeYourMessagePlaceholder: 'Nhập tin nhắn...',

    chooseFile: 'Chọn tệp...',

    optionalLabel: 'Không bắt buộc',

    sendMessageButton: 'Gửi tin nhắn',

    createLabelBtn: 'Tạo nhãn',

    quickSendBtn: 'Gửi nhanh',

    createNewLabelTitle: 'Tạo nhãn mới',

    labelNameTitle: 'Tên nhãn',

    labelNamePlaceholder: 'Nhập tên nhãn...',

    labelColorTitle: 'Màu sắc',

    colorPickerPreset: 'Màu có sẵn',

    colorPickerCustom: 'Tùy chỉnh',

    colorPickerPopular: 'Phổ biến',

    colorPickerAllColors: 'Tất cả màu',

    colorPickerCustomize: 'Điều chỉnh màu sắc',

    colorPickerHexCode: 'Mã màu',

    colorPickerSelected: 'Màu đã chọn',

    cancelButton: 'Hủy',

    createButton: 'Tạo',

    manageLabels: 'Quản lý nhãn',

    assignLabels: 'Gán nhãn',

    yourLabelList: 'Danh sách nhãn của bạn',

    manageYourLabels: 'Quản lý nhãn của bạn',

    manageTip: 'Dùng nút Gán / Gỡ để áp dụng nhãn cho người liên hệ hiện tại.',

    attach: 'Gán',

    remove: 'Gỡ',

    delete: 'Xóa',

  },

  en: {

    title: 'Messages',

    searchPlaceholder: 'Search',

    createStory: 'Create story',

    createGroupChat: 'Create group chat',

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

    sentLink: 'Link',

    sentLinkMe: 'You sent a link',

    mePrefix: 'You',

    broadcastLabel: 'Label',

    selectLabelPlaceholder: 'Select label',

    noLabelsYet: 'No labels yet',

    sendTo: 'Send to',

    selectAll: 'Select all',

    selectLabelToLoadRecipients: 'Select a label to load recipients',

    typeYourMessagePlaceholder: 'Type your message',

    chooseFile: 'Choose file...',

    optionalLabel: 'Optional',

    sendMessageButton: 'Send message',

    createLabelBtn: 'Create label',

    quickSendBtn: 'Quick send',

    createNewLabelTitle: 'Create new label',

    labelNameTitle: 'Label name',

    labelNamePlaceholder: 'Enter label name',

    labelColorTitle: 'Color',

    colorPickerPreset: 'Preset Colors',

    colorPickerCustom: 'Customize',

    colorPickerPopular: 'Popular',

    colorPickerAllColors: 'All Colors',

    colorPickerCustomize: 'Adjust color',

    colorPickerHexCode: 'Color code',

    colorPickerSelected: 'Selected color',

    cancelButton: 'Cancel',

    createButton: 'Create',

    manageLabels: 'Manage labels',

    assignLabels: 'Assign labels',

    yourLabelList: 'Your label list',

    manageYourLabels: 'Manage your labels',

    manageTip: 'Use Attach/Remove to apply labels to the current contact.',

    attach: 'Attach',

    remove: 'Remove',

    delete: 'Delete',

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

const MESSAGE_LIST_URL_REGEX =
  /(?:https?:\/\/|www\.)[^\s<>"']+|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+(?:\/[^\s<>"']*)?/i;

function extractMessageListUrl(value: string) {
  return value.match(MESSAGE_LIST_URL_REGEX)?.[0] ?? '';
}

function getLinkHost(value: string) {
  const rawUrl = extractMessageListUrl(value);
  if (!rawUrl) return '';

  return rawUrl
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split(/[/?#]/)[0];
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

        icon: <FileText size={14} color="#64748b" />,

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

    case 'link': {

      const host = getLinkHost(lastMessage);

      return {

        icon: <Link2 size={14} color="#2563eb" />,

        text: `${isFromMe ? copy.sentLinkMe : copy.sentLink}${host ? ` · ${host}` : ''}`,

      };

    }

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

  if (chat.lastMessageKind === 'link') {

    const host = getLinkHost(chat.lastMessage);

    return `${copy.sentLink}${host ? ` · ${host}` : ''}`;

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
  const messagePreviewText =
    chat.lastMessageKind === 'audio_call' || chat.lastMessageKind === 'video_call'
      ? getVisibleLastMessage(chat, copy)
      : messagePreview.text;

  return (

    <TouchableOpacity

      className="flex-row items-center px-4 py-3"

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

            {messagePreview.icon ? (

              <View style={{ marginRight: 6 }}>

                {messagePreview.icon}

              </View>

            ) : null}

            <Text

              className={`flex-1 text-sm ${

                chat.lastMessageKind && chat.lastMessageKind !== 'text'

                  ? ''

                  : ''

              } ${

                chat.unreadCount > 0

                  ? chat.lastMessageKind === 'link'
                    ? 'font-semibold text-blue-700'
                    : 'font-medium text-gray-800'

                  : chat.lastMessageKind === 'link'
                    ? 'text-blue-600'
                    : 'text-gray-500'

              }`}

              numberOfLines={1}

            >

              {messagePreviewText}

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

  copy,

}: {

  visible: boolean;

  chat: ChatItem | null;

  labels: MessageLabel[];

  isLoading: boolean;

  onClose: () => void;

  onCreate: (name: string, color: string) => Promise<any>;

  onDelete: (labelId: string) => Promise<boolean>;

  onAttach: (userId: string, labelId: string) => Promise<boolean>;

  onDetach: (userId: string, labelId: string) => Promise<boolean>;

  copy: typeof MESSAGE_COPY.vi;

}) {

  const [activeTab, setActiveTab] = useState<LabelSheetTab>('assign');

  const [labelName, setLabelName] = useState('');

  const [labelColor, setLabelColor] = useState(DEFAULT_LABEL_COLOR);

  const [showColorPicker, setShowColorPicker] = useState(false);

  const attachedLabelIds = useMemo(

    () => new Set((chat?.labels ?? []).map(l => l.id)),

    [chat?.labels],

  );

  const handleCreate = useCallback(async () => {
    const color = hexOK(labelColor) ? labelColor : DEFAULT_LABEL_COLOR;
    const name = labelName.trim();
    if (!name) return;
    const created = await onCreate(name, color);
    if (created) {
      setLabelName('');
      setLabelColor(DEFAULT_LABEL_COLOR);
      setShowColorPicker(false);
      showToast({ message: 'Da tao nhan thanh cong!', type: 'success' });
    } else {
      showToast({ message: 'Tao nhan that bai.', type: 'error' });
    }
  }, [labelColor, labelName, onCreate]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
        <View style={{ width: '90%', maxHeight: '82%', borderRadius: 20, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
          <View className="px-5 pt-4 pb-6" style={{ maxHeight: '100%' }}>

            {/* Header */}
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900">
                Thẻ phân loại
              </Text>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Custom Tab Bar */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginBottom: 20 }}>
              {(
                [
                  ['assign', copy.assignLabels],
                  ['manage', copy.manageLabels],
                ] as const
              ).map(([key, title]) => {
                const isActive = activeTab === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: isActive ? 2 : 0,
                      borderBottomColor: isActive ? '#3B82F6' : 'transparent',
                    }}
                    onPress={() => setActiveTab(key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontWeight: '700',
                        fontSize: 14,
                        color: isActive ? '#3B82F6' : '#64748B',
                      }}
                    >
                      {title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Scrollable Content */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {activeTab === 'assign' ? (
                <>
                  <Text className="mb-3 text-sm font-bold text-slate-700">
                    Danh sách thẻ của bạn
                  </Text>

                  <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                    {labels.length === 0 ? (
                      <View className="items-center py-10">
                        <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                          <Tag size={24} color="#94a3b8" />
                        </View>
                        <Text className="text-sm text-slate-500">{copy.noLabelsYet}</Text>
                      </View>
                    ) : (
                      labels.map(label => {
                        const attached = attachedLabelIds.has(label.id);
                        return (
                          <View
                            key={label.id}
                            className="flex-row items-center border-b border-slate-100 px-4 py-3"
                          >
                            <View
                              className="mr-3 h-4 w-4 rounded-full"
                              style={{ backgroundColor: label.color }}
                            />
                            <Text className="flex-1 text-base font-semibold text-slate-700">
                              {label.name}
                            </Text>
                            <TouchableOpacity
                              style={{
                                backgroundColor: attached ? '#F1F5F9' : '#3B82F6',
                                borderRadius: 8,
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                              }}
                              disabled={!chat || isLoading}
                              activeOpacity={0.8}
                              onPress={() => {
                                if (!chat) return;
                                const action = attached ? onDetach : onAttach;
                                action(chat.userId, label.id).then((success) => {
                                  if (success) {
                                    showToast({ message: attached ? 'Da go nhan!' : 'Da gan nhan!', type: 'success' });
                                  }
                                }).catch(() => undefined);
                              }}
                            >
                              <Text
                                style={{
                                  color: attached ? '#64748B' : '#FFFFFF',
                                  fontWeight: 'bold',
                                }}
                              >
                                {attached ? 'Gỡ' : 'Gán'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    )}
                  </View>

                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 12 }}>
                    Mẹo: nhấn "Gán/Gỡ" để áp dụng cho đối tượng hiện tại.
                  </Text>
                </>
              ) : (
                <>
                  <Text className="mb-3 text-sm font-bold text-slate-700">
                    Danh sách thẻ của bạn
                  </Text>

                  {/* List of Your Labels */}
                  <View className="overflow-hidden rounded-2xl border border-slate-100 mb-6 bg-white">
                    {labels.length === 0 ? (
                      <View className="items-center py-10">
                        <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                          <Tag size={24} color="#94a3b8" />
                        </View>
                        <Text className="text-sm text-slate-500">{copy.noLabelsYet}</Text>
                      </View>
                    ) : (
                      labels.map(label => (
                        <View
                          key={label.id}
                          className="flex-row items-center border-b border-slate-100 px-4 py-3"
                        >
                          <View
                            className="mr-3 h-4 w-4 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          <Text className="flex-1 text-base font-semibold text-slate-700">
                            {label.name}
                          </Text>
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#FEE2E2',
                              borderRadius: 8,
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                            }}
                            disabled={isLoading}
                            activeOpacity={0.8}
                            onPress={async () => {
                              try {
                                const success = await onDelete(label.id);
                                if (success) {
                                  showToast({ message: 'Da xoa nhan thanh cong!', type: 'success' });
                                }
                              } catch (err) {}
                            }}
                          >
                            <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Xoá</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Create New Label Form */}
                  <Text className="mb-3 text-sm font-bold text-slate-700">
                    Tạo thẻ mới
                  </Text>

                  <TextInput
                    style={{
                      height: 44,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 14,
                      fontSize: 15,
                      color: '#0F172A',
                      marginBottom: 12,
                    }}
                    placeholder={copy.labelNamePlaceholder}
                    placeholderTextColor="#94a3b8"
                    value={labelName}
                    onChangeText={setLabelName}
                  />

                  {/* Side-by-side color picker indicator & Create button */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <TouchableOpacity
                      style={{
                        width: 70,
                        height: 36,
                        borderRadius: 6,
                        backgroundColor: hexOK(labelColor) ? labelColor : DEFAULT_LABEL_COLOR,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                      }}
                      activeOpacity={0.8}
                      onPress={() => setShowColorPicker(v => !v)}
                    />
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#3B82F6',
                        borderRadius: 6,
                        paddingHorizontal: 20,
                        height: 36,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      disabled={!labelName.trim() || isLoading}
                      activeOpacity={0.8}
                      onPress={() => handleCreate().catch(() => undefined)}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>Tạo</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {showColorPicker && (
                    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 mb-4">
                      <ColorPicker
                        value={labelColor}
                        onChange={setLabelColor}
                        label={copy.labelColorTitle}
                      />
                    </View>
                  )}

                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                    Bạn có thể xoá thẻ trong danh sách phía trên.
                  </Text>
                </>
              )}
            </ScrollView>

            {isLoading && (
              <View className="mt-4 flex-row justify-center">
                <ActivityIndicator size="small" color="#2563eb" />
              </View>
            )}

            {/* Bottom Footer Close Button */}
            <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#E2E8F0',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
                onPress={onClose}
              >
                <Text style={{ color: '#334155', fontWeight: '700', fontSize: 14 }}>Đóng</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </View>
    </Modal>
  );}

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

    markAllAsRead,

    createLabel,

    deleteLabel,

    attachLabel,

    detachLabel,

    selectBroadcastLabel,

  } = useMessagesViewModel();

  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState('');

  const [showCreateLabelBroadcastModal, setShowCreateLabelBroadcastModal] = useState(false);

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

  const hasUnreadChats = useMemo(
    () => chats.some(chat => chat.unreadCount > 0),
    [chats],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!hasUnreadChats) {
      showToast({ message: 'Không có tin nhắn chưa đọc.', type: 'warning' });
      return;
    }

    const ok = await markAllAsRead();
    showToast({
      message: ok ? 'Đã đánh dấu là đã đọc.' : 'Không đánh dấu đã đọc được.',
      type: ok ? 'success' : 'error',
    });
  }, [hasUnreadChats, markAllAsRead]);

  const handleCreateGroupChat = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_GROUP_CHAT);
  }, [navigation]);

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
    const recipientCount = selectedRecipients.size;
    try {
      const sent = await sendBulkMessages(
        [...selectedRecipients],
        broadcastText,
        attachments,
      );
      if (sent) {
        setSelectedRecipients(new Set());
        setBroadcastText('');
        setBroadcastAttachment(null);
        showToast({ message: 'Da gui thanh cong!', type: 'success' });
      } else {
        showToast({ message: 'Gui tin nhan that bai.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Gui tin nhan that bai.', type: 'error' });
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

  const handleCreateLabelWithRecipients = useCallback(
    async (name: string, color: string, selectedUserIds: string[]) => {
      const labelId = await createLabel(name, color);
      if (!labelId) {
        showToast({ message: 'Tao nhan that bai.', type: 'error' });
        return false;
      }
      if (selectedUserIds.length > 0) {
        await Promise.all(
          selectedUserIds.map(userId => attachLabel(userId, labelId).catch(() => undefined))
        );
        await loadChats();
      }
      showToast({ message: 'Da tao nhan thanh cong!', type: 'success' });
      return true;
    },
    [createLabel, attachLabel, loadChats],
  );

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

                <View className="flex-row px-4 py-3 gap-3 bg-white">

                  <TouchableOpacity

                    onPress={() => setShowCreateLabelBroadcastModal(true)}

                    activeOpacity={0.8}

                    className="flex-1 flex-row items-center justify-center bg-indigo-50 border border-indigo-100 py-3 rounded-xl active:scale-95"

                  >

                    <Plus size={16} color="#4F46E5" className="mr-1.5" />

                    <Text className="text-indigo-600 font-bold text-sm">

                      {copy.createLabelBtn}

                    </Text>

                  </TouchableOpacity>

                  <TouchableOpacity

                    onPress={() => {

                      Alert.alert(

                        language === 'vi' ? 'Thông báo' : 'Notice',

                        language === 'vi' ? 'Tính năng gửi nhanh đang được phát triển!' : 'Quick send feature is under development!'

                      );

                    }}

                    activeOpacity={0.8}

                    className="flex-1 flex-row items-center justify-center bg-indigo-600 py-3 rounded-xl active:scale-95"

                  >

                    <Zap size={15} color="#ffffff" className="mr-1.5" />

                    <Text className="text-white font-bold text-sm">

                      {copy.quickSendBtn}

                    </Text>

                  </TouchableOpacity>

                </View>

                {/* Broadcast Panel */}

                <View className="mx-4 mb-3 rounded-2xl border border-indigo-100 bg-white p-4">

                  <Text className="mb-2 text-xs font-bold uppercase text-slate-400">

                    {copy.broadcastLabel}

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

                      {selectedBroadcastLabel?.name || copy.selectLabelPlaceholder}

                    </Text>

                    <ChevronDown size={18} color="#475569" />

                  </TouchableOpacity>

                  {showBroadcastLabelOptions && (

                    <View className="mb-3 overflow-hidden rounded-xl border border-slate-200">

                      {labels.length === 0 ? (

                        <Text className="px-3 py-3 text-sm text-slate-500">

                          {copy.noLabelsYet}

                        </Text>

                      ) : (

                        labels.map(label => (

                          <TouchableOpacity

                            key={label.id}

                            className="flex-row items-center border-b border-slate-100 px-3 py-3"

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

                      {copy.sendTo}

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

                        {copy.selectAll}

                      </Text>

                    </TouchableOpacity>

                  </View>

                  <View className="mb-3 min-h-12 flex-row flex-wrap items-center gap-2 rounded-xl border border-indigo-100 px-3 py-2">

                    {broadcastRecipientChats.length === 0 ? (

                      <Text className="text-sm text-slate-400">

                        {copy.selectLabelToLoadRecipients}

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

                    placeholder={copy.typeYourMessagePlaceholder}

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

                      {broadcastAttachment?.name || copy.chooseFile}

                    </Text>

                    <Text className="mt-1 text-sm text-slate-500">{copy.optionalLabel}</Text>

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

                            {copy.sendMessageButton}

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

                <TouchableOpacity
                  activeOpacity={0.85}
                  accessibilityLabel={copy.createGroupChat}
                  accessibilityRole="button"
                  onPress={handleCreateGroupChat}
                  style={styles.groupsCreateCta}
                >
                  <View style={styles.groupsCreateCtaIcon}>
                    <Users size={18} color="#2563eb" />
                  </View>
                  <Text style={styles.groupsCreateCtaText}>
                    {copy.createGroupChat}
                  </Text>
                  <Plus size={18} color="#2563eb" />
                </TouchableOpacity>

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

            onPress={handleMarkAllAsRead}
            disabled={!hasUnreadChats}

          >

            <ListChecks size={24} color="#ffffff" />

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

        copy={copy}

      />

      <HeaderProfileDrawer

        visible={menuVisible}

        onClose={() => setMenuVisible(false)}

      />

      <CreateLabelBroadcastModal

        visible={showCreateLabelBroadcastModal}

        onClose={() => setShowCreateLabelBroadcastModal(false)}

        onCreate={handleCreateLabelWithRecipients}

        users={usersChats}

        copy={copy}

      />

          <ToastContainer />
    </SafeAreaView>

  );

}



// ── Quick Send Modal ──────────────────────────────────────────
interface QuickSendModalProps {
  visible: boolean;
  onClose: () => void;
  recipients: { userId: string; name: string; avatar?: string }[];
  labels: MessageLabel[];
  sendBulkMessages: (userIds: string[], text: string, attachments: any[]) => Promise<boolean>;
  copy: typeof MESSAGE_COPY.vi;
}

function QuickSendModal({
  visible,
  onClose,
  recipients,
  labels,
  sendBulkMessages,
  copy,
}: QuickSendModalProps) {
  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ uri: string; name: string; type: string; mediaType: string } | null>(null);
  const [isCustomSelection, setIsCustomSelection] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const wasVisibleRef = useRef(false);
  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setMessageText('');
      setSelectedImage(null);
      setSelectedUserIds(new Set(recipients.map(r => r.userId)));
      setIsCustomSelection(false);
      setSearchQuery('');
      setIsSending(false);
      setShowRecipientModal(false);
    }
    wasVisibleRef.current = visible;
  }, [visible, recipients]);

  const handlePickImage = useCallback(async () => {
    const mediaType: MediaType = 'photo';
    try {
      const result = await launchImageLibrary({ mediaType, selectionLimit: 1, quality: 0.9 });
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      setSelectedImage({ uri: asset.uri, name: asset.fileName || `quick_send_${Date.now()}.jpg`, type: asset.type || 'image/jpeg', mediaType: 'image' });
    } catch (err) { console.warn('Pick image error:', err); }
  }, []);

  const handleRemoveImage = useCallback(() => setSelectedImage(null), []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return recipients;
    return recipients.filter(u => (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [recipients, searchQuery]);

  const toggleUser = useCallback((userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  }, []);

  const handleToggleSelectAllUsers = useCallback(() => {
    setSelectedUserIds(prev => {
      const next = new Set<string>();
      if (prev.size < filteredUsers.length) filteredUsers.forEach(u => next.add(u.userId));
      return next;
    });
  }, [filteredUsers]);

  const isAllUsersSelected = filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length;

  const finalRecipientIds = useMemo(() => {
    return isCustomSelection ? selectedUserIds : new Set(recipients.map(r => r.userId));
  }, [isCustomSelection, selectedUserIds, recipients]);

  const handleSend = useCallback(async () => {
    const userIds = Array.from(finalRecipientIds);
    if (userIds.length === 0) {
      showToast({ message: 'Vui long chon nguoi nhan.', type: 'warning' });
      return;
    }
    setIsSending(true);
    const attachments = selectedImage ? [selectedImage] : [];
    try {
      const success = await sendBulkMessages(userIds, messageText, attachments);
      if (success) {
        showToast({ message: 'Da gui thanh cong!', type: 'success' });
        onClose();
      } else {
        showToast({ message: 'Gui that bai.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Khong the gui tin nhan.', type: 'error' });
    } finally {
      setIsSending(false);
    }
  }, [finalRecipientIds, messageText, selectedImage, sendBulkMessages, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={Keyboard.dismiss}>
        <Pressable
          style={{ height: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
          className="bg-white p-5"
          onPress={() => {}}
        >
          <View className="mb-4 flex-row items-center justify-between border-b border-slate-100 pb-3">
            <View className="flex-1 pr-4">
              <Text className="text-lg font-bold text-slate-900">Gui nhanh tin nhan</Text>
              <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                {isCustomSelection
                  ? `Dang chon loc: Gui den ${finalRecipientIds.size}/${recipients.length} nguoi`
                  : `Mac dinh gui den tat ca ban be & nguoi theo doi (${recipients.length} nguoi)`}
              </Text>
            </View>
            <TouchableOpacity className="h-8 w-8 items-center justify-center rounded-full bg-slate-100" onPress={onClose}>
              <X size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            <View className="flex-1 border border-slate-200 rounded-2xl bg-white p-3.5 flex-row items-end mb-4">
              <TextInput
                className="flex-1 text-sm text-slate-800 p-0 mr-2 h-full"
                style={{ textAlignVertical: 'top' }}
                placeholder="Nhap noi dung tin nhan gui nhanh hang loat..."
                placeholderTextColor="#94a3b8"
                value={messageText}
                onChangeText={setMessageText}
                multiline
              />
              <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100" onPress={handlePickImage}>
                <ImageIcon size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <View className="mb-4 flex-row items-center bg-slate-50 border border-slate-100 rounded-xl p-2">
                <Image source={{ uri: selectedImage.uri }} className="h-12 w-12 rounded-lg" resizeMode="cover" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs font-semibold text-slate-700" numberOfLines={1}>{selectedImage.name}</Text>
                  <Text className="text-[10px] text-slate-400">Hinh anh dinh kem</Text>
                </View>
                <TouchableOpacity className="h-7 w-7 items-center justify-center rounded-full bg-red-50" onPress={handleRemoveImage}>
                  <Trash2 size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}

            <View className="mb-4 flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => { setIsCustomSelection(true); setShowRecipientModal(true); }}
                className="flex-1 flex-row items-center bg-indigo-50 border border-indigo-100 px-4 py-3 rounded-xl"
              >
                <Users size={15} color="#4f46e5" />
                <Text className="text-xs font-bold text-indigo-600 ml-2">
                  {isCustomSelection ? `Da chon: ${selectedUserIds.size} nguoi` : 'Chon nguoi nhan cu the'}
                </Text>
              </TouchableOpacity>
              {isCustomSelection && (
                <TouchableOpacity onPress={() => setIsCustomSelection(false)} className="bg-slate-100 border border-slate-200 px-4 py-3 rounded-xl">
                  <Text className="text-xs font-bold text-slate-600">Gui tat ca</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="border-t border-slate-100 pt-3">
            {keyboardVisible ? (
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className={`flex-1 items-center justify-center rounded-xl py-3.5 ${
                    (messageText.trim() || selectedImage) && finalRecipientIds.size > 0 ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                  disabled={!(messageText.trim() || selectedImage) || finalRecipientIds.size === 0 || isSending}
                  onPress={handleSend}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className={`font-bold ${(messageText.trim() || selectedImage) && finalRecipientIds.size > 0 ? 'text-white' : 'text-slate-400'}`}>Gui nhanh</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 items-center justify-center rounded-xl bg-slate-100 py-3.5" onPress={() => Keyboard.dismiss()}>
                  <Text className="font-bold text-slate-600">Xong</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                className={`w-full items-center justify-center rounded-xl py-3.5 ${
                  (messageText.trim() || selectedImage) && finalRecipientIds.size > 0 ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
                disabled={!(messageText.trim() || selectedImage) || finalRecipientIds.size === 0 || isSending}
                onPress={handleSend}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className={`font-bold ${(messageText.trim() || selectedImage) && finalRecipientIds.size > 0 ? 'text-white' : 'text-slate-400'}`}>Gui nhanh</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>

      <Modal visible={showRecipientModal} transparent animationType="slide" onRequestClose={() => setShowRecipientModal(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setShowRecipientModal(false)}>
          <Pressable style={{ height: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24 }} className="bg-white p-5" onPress={() => {}}>
            <View className="mb-4 flex-row items-center justify-between border-b border-slate-100 pb-3">
              <View>
                <Text className="text-base font-bold text-slate-900">Chon nguoi nhan cu the</Text>
                <Text className="text-xs text-slate-400 mt-0.5">Da chon {selectedUserIds.size}/{recipients.length} nguoi dung</Text>
              </View>
              <TouchableOpacity className="h-8 w-8 items-center justify-center rounded-full bg-slate-100" onPress={() => setShowRecipientModal(false)}>
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-2.5 px-1">
                <Text className="text-xs font-bold uppercase text-slate-400">Danh sach ban be & nguoi theo doi</Text>
                <TouchableOpacity onPress={handleToggleSelectAllUsers} disabled={filteredUsers.length === 0}>
                  <Text className="text-xs font-bold text-blue-600">{isAllUsersSelected ? 'Bo chon tat ca' : 'Chon tat ca'}</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                className="mb-3 h-10 rounded-xl border border-slate-200 px-3.5 text-xs text-slate-900 bg-slate-50"
                placeholder="Tim kiem nguoi dung..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <ScrollView nestedScrollEnabled className="flex-1 border border-slate-100 rounded-2xl p-2.5 bg-slate-50/50">
                {filteredUsers.length === 0 ? (
                  <Text className="text-center text-xs text-slate-400 py-6">Khong tim thay nguoi dung</Text>
                ) : (
                  filteredUsers.map(user => {
                    const isSelected = selectedUserIds.has(user.userId);
                    return (
                      <TouchableOpacity
                        key={user.userId}
                        className="flex-row items-center justify-between py-3 border-b border-slate-100/60"
                        activeOpacity={0.8}
                        onPress={() => toggleUser(user.userId)}
                      >
                        <View className="flex-row items-center">
                          <UserAvatar uri={user.avatar} name={user.name} size={32} />
                          <Text className="ml-3 font-semibold text-sm text-slate-800">{user.name}</Text>
                        </View>
                        <View
                          style={{
                            width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                            borderColor: isSelected ? '#4f46e5' : '#94a3b8',
                            backgroundColor: isSelected ? '#4f46e5' : '#ffffff',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {isSelected && <Check size={14} color="#ffffff" strokeWidth={3.5} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>

            <View className="border-t border-slate-100 pt-3 flex-row gap-3">
              <TouchableOpacity className="flex-1 items-center justify-center rounded-xl bg-slate-100 py-3.5" onPress={() => { setIsCustomSelection(false); setShowRecipientModal(false); }}>
                <Text className="font-bold text-slate-600">Gui tat ca</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 items-center justify-center rounded-xl bg-indigo-600 py-3.5" onPress={() => setShowRecipientModal(false)}>
                <Text className="font-bold text-white">Ap dung</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
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

  groupsCreateCta: {

    marginHorizontal: 16,

    marginBottom: 12,

    minHeight: 52,

    borderRadius: 16,

    borderWidth: 1,

    borderColor: '#dbeafe',

    backgroundColor: '#eff6ff',

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 14,

    paddingVertical: 10,

  },

  groupsCreateCtaIcon: {

    width: 34,

    height: 34,

    borderRadius: 17,

    backgroundColor: '#dbeafe',

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 10,

  },

  groupsCreateCtaText: {

    flex: 1,

    color: '#1e3a8a',

    fontSize: 14,

    fontWeight: '800',

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

function CreateLabelBroadcastModal({

  visible,

  onClose,

  onCreate,

  users,

  copy,

}: {

  visible: boolean;

  onClose: () => void;

  onCreate: (name: string, color: string, selectedUserIds: string[]) => Promise<boolean>;

  users: ChatItem[];

  copy: any;

}) {

  const [step, setStep] = useState(1); // 1: name, 2: color, 3: users

  const [labelName, setLabelName] = useState('');

  const [labelColor, setLabelColor] = useState('#3b82f6');

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const [userSearchQuery, setUserSearchQuery] = useState('');

  useEffect(() => {

    if (visible) {

      setStep(1);

      setLabelName('');

      setLabelColor('#3b82f6');

      setSelectedUserIds(new Set());

      setUserSearchQuery('');

    }

  }, [visible]);

  const filteredUsers = useMemo(() => {

    if (!userSearchQuery.trim()) return users;

    return users.filter(u =>

      u.name.toLowerCase().includes(userSearchQuery.toLowerCase())

    );

  }, [users, userSearchQuery]);

  const handleCreate = useCallback(async () => {

    if (!labelName.trim()) return;

    const created = await onCreate(

      labelName.trim(),

      labelColor,

      Array.from(selectedUserIds)

    );

    if (created) {

      onClose();

    }

  }, [labelName, labelColor, selectedUserIds, onCreate, onClose]);

  const isAllSelected = filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length;

  const handleToggleSelectAll = useCallback(() => {

    setSelectedUserIds(prev => {

      const next = new Set<string>();

      if (prev.size < filteredUsers.length) {

        filteredUsers.forEach(u => next.add(u.userId));

      }

      return next;

    });

  }, [filteredUsers]);

  const renderStepIndicator = () => (

    <View className="flex-row items-center justify-center mb-6">

      {[1, 2, 3].map(s => (

        <React.Fragment key={s}>

          <View

            className={`h-9 w-9 rounded-full items-center justify-center ${

              step >= s ? 'bg-blue-500' : 'bg-slate-200'

            }`}

          >

            <Text className={`text-sm font-extrabold ${step >= s ? 'text-white' : 'text-slate-400'}`}>

              {s}

            </Text>

          </View>

          {s < 3 && (

            <View className={`h-0.5 w-14 ${step > s ? 'bg-blue-500' : 'bg-slate-200'}`} />

          )}

        </React.Fragment>

      ))}

    </View>

  );

  const renderNameStep = () => (

    <View>

      <Text className="mb-1.5 text-xs font-bold uppercase text-slate-400">

        {copy.labelNameTitle}

      </Text>

      <TextInput

        className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900"

        placeholder={copy.labelNamePlaceholder}

        placeholderTextColor="#94a3b8"

        value={labelName}

        onChangeText={setLabelName}

        autoFocus

      />

      <Text className="mt-2 text-xs text-slate-400">

        Đặt tên cho nhãn để dễ phân loại tin nhắn

      </Text>

    </View>

  );

  const renderColorStep = () => (

    <View>

      <Text className="mb-2 text-xs font-bold uppercase text-slate-400">

        {copy.labelColorTitle}

      </Text>

      <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">

        <ColorPicker

          value={labelColor}

          onChange={setLabelColor}

          label={copy.labelColorTitle}

        />

      </View>

    </View>

  );

  const renderUsersStep = () => (

    <View>

      <View className="flex-row items-center justify-between mb-2.5 px-1">

        <Text className="text-xs font-bold uppercase text-slate-400">

          {copy.filters?.users || 'Người dùng'}

        </Text>

        <TouchableOpacity onPress={handleToggleSelectAll} disabled={filteredUsers.length === 0}>

          <Text className="text-xs font-bold text-blue-600">

            {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}

          </Text>

        </TouchableOpacity>

      </View>

      <TextInput

        className="mb-3 h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 bg-slate-50"

        placeholder={copy.searchPlaceholder}

        placeholderTextColor="#94a3b8"

        value={userSearchQuery}

        onChangeText={setUserSearchQuery}

      />

      <ScrollView nestedScrollEnabled className="max-h-72 border border-slate-100 rounded-xl p-2.5 bg-slate-50">

        {filteredUsers.length === 0 ? (

          <Text className="text-center text-xs text-slate-400 py-4">

            Không tìm thấy người dùng

          </Text>

        ) : (

          filteredUsers.map(user => {

            const isSelected = selectedUserIds.has(user.userId);

            return (

              <TouchableOpacity

                key={user.userId}

                className="flex-row items-center justify-between py-2.5 border-b border-slate-100/50"

                activeOpacity={0.8}

                onPress={() => {

                  setSelectedUserIds(prev => {

                    const next = new Set(prev);

                    if (next.has(user.userId)) {

                      next.delete(user.userId);

                    } else {

                      next.add(user.userId);

                    }

                    return next;

                  });

                }}

              >

                <View className="flex-row items-center">

                  <UserAvatar uri={user.avatar} name={user.name} size={32} />

                  <Text className="ml-3 font-semibold text-sm text-slate-800">

                    {user.name}

                  </Text>

                </View>

                <View

                  className={`h-5.5 w-5.5 items-center justify-center rounded border ${

                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'

                  }`}

                >

                  {isSelected && <Check size={12} color="#ffffff" />}

                </View>

              </TouchableOpacity>

            );

          })

        )}

      </ScrollView>

      <Text className="mt-2 text-xs text-slate-400">

        Bước này có thể bỏ qua nếu không cần lọc theo người dùng

      </Text>

    </View>

  );

  const renderContent = () => {

    switch (step) {

      case 1:

        return renderNameStep();

      case 2:

        return renderColorStep();

      case 3:

        return renderUsersStep();

      default:

        return null;

    }

  };

  const getTitle = () => {

    switch (step) {

      case 1:

        return 'Bước 1: Tên nhãn';

      case 2:

        return 'Bước 2: Màu sắc';

      case 3:

        return 'Bước 3: Thêm người';

      default:

        return copy.createNewLabelTitle;

    }

  };

  return (

    <Modal

      visible={visible}

      transparent

      animationType="fade"

      onRequestClose={onClose}

    >

      <Pressable className="flex-1 justify-center bg-black/40 px-6" onPress={onClose}>

        <Pressable className="rounded-3xl bg-white p-5" onPress={() => {}}>

          <View className="mb-4 flex-row items-center justify-between border-b border-slate-100 pb-3">

            <Text className="text-lg font-bold text-slate-900">

              {getTitle()}

            </Text>

            <TouchableOpacity

              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"

              onPress={onClose}

            >

              <X size={18} color="#475569" />

            </TouchableOpacity>

          </View>

          {renderStepIndicator()}

          <ScrollView showsVerticalScrollIndicator={false} className="mb-4">

            {renderContent()}

          </ScrollView>

          <View className="flex-row gap-3 border-t border-slate-100 pt-3">

            {step > 1 ? (

              <TouchableOpacity

                className="flex-1 items-center justify-center rounded-xl bg-slate-100 py-3"

                onPress={() => setStep(s => s - 1)}

              >

                <Text className="font-bold text-slate-600">Quay lại</Text>

              </TouchableOpacity>

            ) : (

              <TouchableOpacity

                className="flex-1 items-center justify-center rounded-xl bg-slate-100 py-3"

                onPress={onClose}

              >

                <Text className="font-bold text-slate-600">

                  {copy.cancelButton}

                </Text>

              </TouchableOpacity>

            )}

            {step < 3 ? (

              <TouchableOpacity

                className={`flex-1 items-center justify-center rounded-xl py-3 ${

                  step === 1 && !labelName.trim()

                    ? 'bg-blue-300'

                    : 'bg-blue-500'

                }`}

                disabled={step === 1 && !labelName.trim()}

                onPress={() => setStep(s => s + 1)}

              >

                <Text className="font-bold text-white">Tiếp theo</Text>

              </TouchableOpacity>

            ) : (

              <TouchableOpacity

                className="flex-1 items-center justify-center rounded-xl bg-blue-500 py-3"

                onPress={handleCreate}

              >

                <Text className="font-bold text-white">Xong</Text>

              </TouchableOpacity>

            )}

          </View>

        </Pressable>

      </Pressable>

    </Modal>

  );

}
