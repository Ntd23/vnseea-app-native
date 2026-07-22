// Description: Renders the canonical Messages conversation list with user, broadcast, and group tabs.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {

  ActivityIndicator,

  AppState,

  Animated,

  Dimensions,

  FlatList,

  Image,

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

  Bell,

  Check,

  CheckCircle2,

  ChevronDown,

  CircleUser,

  CornerUpLeft,

  FileText,

  ImageIcon,

  Link2,

  MapPin,

  MessageCircle,

  Newspaper,

  Mic,

  Phone,

  Search,

  Send,

  ShoppingBag,

  Tag,

  UserPlus,

  Users,

  Video,

  X,

  Plus,

} from 'lucide-react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { showSnackbar as showToast } from '../../../shared-kernel/presentation/components/Snackbar';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { launchImageLibrary, type MediaType } from 'react-native-image-picker';

import type { RootStackParamList } from '../../../navigation/types';

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

import { HeaderProfileDrawer } from '../../../feed/presentation/components/HeaderProfileDrawer';
import { sortMessageUserChats } from '../utils/messageListOrdering';
import {
  isMessageRealtimeConnected,
  subscribeToMessageInvalidations,
  subscribeToMessageRealtimeConnection,
} from '../../infrastructure/realtime/messageRealtimeRuntime';
import Svg, {
  Circle as SvgCircle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';

type MessagesNav = NativeStackNavigationProp<RootStackParamList>;

type ChatFilter = 'broadcast' | 'users' | 'groups';

const MESSAGE_BROADCAST_RECIPIENT_LIST_MAX_HEIGHT = 240;

const MESSAGE_COPY: Record<

  AppLanguage,

  {

    title: string;

    searchPlaceholder: string;

    createStory: string;

    createGroupChat: string;

    openLabels: string;

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

    productInquiry: string;

    productInquiryMe: string;

    orderRequest: string;

    orderRequestMe: string;

    sentSticker: string;

    sentStickerMe: string;

    sentLink: string;

    sentLinkMe: string;

    sharedPost: string;

    sharedPostMe: string;

    sharedLocation: string;

    sharedLocationMe: string;

    storyReply: string;

    storyReplyMe: string;

    mePrefix: string;

    broadcastLabel: string;

    selectLabelPlaceholder: string;

    noLabelsYet: string;

    sendTo: string;

    selectAll: string;

    selectLabelToLoadRecipients: string;

    noRecipientsSelected: string;

    typeYourMessagePlaceholder: string;

    chooseFile: string;

    chooseImage: string;

    removeImage: string;

    optionalLabel: string;

    sendMessageButton: string;

    createLabelBtn: string;

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

    openLabels: 'Gắn nhãn khách hàng',

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

    productInquiry: 'Hỏi về',

    productInquiryMe: 'Bạn đã hỏi về',

    orderRequest: 'Yêu cầu mua mới',

    orderRequestMe: 'Bạn đã gửi yêu cầu mua',

    sentSticker: 'Đã gửi nhãn dán',

    sentStickerMe: 'Bạn đã gửi nhãn dán',

    sentLink: 'Đã gửi một liên kết',

    sentLinkMe: 'Bạn đã gửi một liên kết',

    sharedPost: 'Đã chia sẻ một bài viết',

    sharedPostMe: 'Bạn đã chia sẻ một bài viết',

    sharedLocation: 'Đã chia sẻ một vị trí',

    sharedLocationMe: 'Bạn đã chia sẻ một vị trí',

    storyReply: 'Đã trả lời tin của bạn',

    storyReplyMe: 'Bạn đã trả lời một tin',

    mePrefix: 'Bạn',

    broadcastLabel: 'Nhãn',

    selectLabelPlaceholder: 'Chọn nhãn',

    noLabelsYet: 'Chưa có nhãn nào',

    sendTo: 'Gửi tới',

    selectAll: 'Chọn tất cả',

    selectLabelToLoadRecipients: 'Chọn nhãn để tải người nhận',

    noRecipientsSelected: 'Chưa chọn người nhận',

    typeYourMessagePlaceholder: 'Nhập tin nhắn...',

    chooseFile: 'Chọn tệp...',

    chooseImage: 'Chọn ảnh đính kèm',

    removeImage: 'Xóa ảnh đính kèm',

    optionalLabel: 'Không bắt buộc',

    sendMessageButton: 'Gửi tin nhắn',

    createLabelBtn: 'Tạo nhãn',

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

    openLabels: 'Assign customer labels',

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

    productInquiry: 'Asked about',

    productInquiryMe: 'You asked about',

    orderRequest: 'New purchase request',

    orderRequestMe: 'You sent purchase request',

    sentSticker: 'Sent a sticker',

    sentStickerMe: 'You sent a sticker',

    sentLink: 'Sent a link',

    sentLinkMe: 'You sent a link',

    sharedPost: 'Shared a post',

    sharedPostMe: 'You shared a post',

    sharedLocation: 'Shared a location',

    sharedLocationMe: 'You shared a location',

    storyReply: 'Replied to your story',

    storyReplyMe: 'You replied to a story',

    mePrefix: 'You',

    broadcastLabel: 'Label',

    selectLabelPlaceholder: 'Select label',

    noLabelsYet: 'No labels yet',

    sendTo: 'Send to',

    selectAll: 'Select all',

    selectLabelToLoadRecipients: 'Select a label to load recipients',

    noRecipientsSelected: 'No recipients selected',

    typeYourMessagePlaceholder: 'Type your message',

    chooseFile: 'Choose file...',

    chooseImage: 'Choose an image attachment',

    removeImage: 'Remove image attachment',

    optionalLabel: 'Optional',

    sendMessageButton: 'Send message',

    createLabelBtn: 'Create label',

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

    case 'product': {

      const productName = lastMessage.replace(/^Hỏi về\s*/i, '').trim();

      return {

        icon: <ShoppingBag size={14} color="#64748b" />,

        text: `${
          isFromMe ? copy.productInquiryMe : copy.productInquiry
        }${productName ? ` ${productName}` : ''}`,

      };

    }

    case 'order': {

      const orderHash = lastMessage.match(/#([^\s]+)$/)?.[1];

      return {

        icon: <ShoppingBag size={14} color="#2563eb" />,

        text: `${
          isFromMe ? copy.orderRequestMe : copy.orderRequest
        }${orderHash ? ` #${orderHash}` : ''}`,

      };

    }

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

    case 'shared_post':

      return {

        icon: <Newspaper size={14} color="#2563eb" />,

        text: isFromMe ? copy.sharedPostMe : copy.sharedPost,

      };

    case 'location':

      return {

        icon: <MapPin size={14} color="#dc2626" />,

        text: isFromMe ? copy.sharedLocationMe : copy.sharedLocation,

      };

    case 'story':

      return {

        icon: <MessageCircle size={14} color="#8b5cf6" />,

        text: isFromMe ? copy.storyReplyMe : copy.storyReply,

      };

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

    <ScrollView
      horizontal
      className="mt-1"
      contentContainerClassName="flex-row items-center gap-1 pr-2"
      showsHorizontalScrollIndicator={false}
      nestedScrollEnabled
      accessibilityLabel={labels.map(label => label.name).join(', ')}
    >

      {labels.map(label => (

        <View

          key={label.id}

          className="h-3 w-3 rounded border border-slate-200"

          style={{ backgroundColor: label.color }}

        />

      ))}

    </ScrollView>

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

  const MESSAGE_LIST_LABEL_BUTTON_SIZE = 32;
  const MESSAGE_LIST_LABEL_BUTTON_HIT_SLOP = 6;

  // Check if this is a group chat

  const isGroup = chat.chatType === 'group';

  // Get message preview with icon based on lastMessageKind

  const messagePreview = getMessagePreview(

    chat.lastMessage || '',

    chat.lastMessageKind,

    Boolean(chat.lastMessageIsMine),

    copy,

  );
  const messagePreviewText =
    chat.lastMessageKind === 'audio_call' || chat.lastMessageKind === 'video_call'
      ? getVisibleLastMessage(chat, copy)
      : messagePreview.text;
  const messagePreviewIcon = chat.lastMessageIsReply ? (
    <CornerUpLeft size={14} color="#64748b" />
  ) : (
    messagePreview.icon
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

        <PresenceDot status={chat.isOnline ? 'online' : 'offline'} />

      </View>

      <View className="ml-3 flex-1 border-b border-gray-100 py-2">

        <View className="mb-1 flex-row items-center">

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

        </View>

        <View className="flex-row items-center">

          <View className="min-w-0 flex-1 flex-row items-center">

            {messagePreviewIcon ? (

              <View style={{ marginRight: 6 }}>

                {messagePreviewIcon}

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

          <Text className="ml-2 shrink-0 text-xs text-gray-500">

            {formatTime(chat.lastMessageTime, copy)}

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

              {chat.chatType === 'user' && (

                <TouchableOpacity

                  accessibilityRole="button"
                  accessibilityLabel={copy.openLabels}
                  hitSlop={MESSAGE_LIST_LABEL_BUTTON_HIT_SLOP}
                  className="items-center justify-center rounded-full border border-slate-200 bg-white"
                  style={{
                    width: MESSAGE_LIST_LABEL_BUTTON_SIZE,
                    height: MESSAGE_LIST_LABEL_BUTTON_SIZE,
                  }}

                  activeOpacity={0.7}

                  onPress={() => onOpenLabels?.(chat)}

                >

                  <Tag size={19} color="#64748b" />

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

              <View style={styles.messageStoryInstagramRing}>
                <Svg
                  width={62}
                  height={62}
                  viewBox="0 0 62 62"
                  style={[
                    styles.messageStoryRingSvg,
                    !hasUnseen && styles.messageStoryRingSvgSeen,
                  ]}
                >
                  <Defs>
                    <SvgLinearGradient
                      id="messageStoryInstagramGradient"
                      x1="8%"
                      y1="94%"
                      x2="92%"
                      y2="6%"
                    >
                      <Stop offset="0%" stopColor="#FEDA75" />
                      <Stop offset="19%" stopColor="#FA7E1E" />
                      <Stop offset="45%" stopColor="#D62976" />
                      <Stop offset="72%" stopColor="#962FBF" />
                      <Stop offset="100%" stopColor="#4F5BD5" />
                    </SvgLinearGradient>
                  </Defs>
                  <SvgCircle
                    cx="31"
                    cy="31"
                    r="28"
                    stroke="url(#messageStoryInstagramGradient)"
                    strokeWidth="4.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </Svg>
                <View style={styles.messageStoryAvatarFrame}>
                  <Image
                    source={{ uri: story.publisher.avatarUrl }}
                    style={styles.messageStoryAvatarImage}
                    resizeMode="cover"
                  />
                </View>

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

// Main screen

function MessageScreen() {

  const navigation = useNavigation<MessagesNav>();

  const language = useAppLanguage();

  const copy = MESSAGE_COPY[language];

  // Branding & Header states/hooks

  const { notificationCount } = useUnreadBadgeCounts();

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

    error,

    loadChats,

    loadLabels,

    loadFollowingUserIds,

    isSending,

    sendBulkMessages,

    selectBroadcastLabel,

  } = useMessagesViewModel();

  const [refreshing, setRefreshing] = useState(false);

  const [isRealtimeConnected, setIsRealtimeConnected] = useState(
    isMessageRealtimeConnected(),
  );

  const [query, setQuery] = useState('');

  const [activeFilter, setActiveFilter] = useState<ChatFilter>('users');

  const [broadcastText, setBroadcastText] = useState('');

  const [broadcastAttachment, setBroadcastAttachment] =

    useState<MessageAttachment | null>(null);

  const [showBroadcastLabelOptions, setShowBroadcastLabelOptions] =

    useState(false);

  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(

    new Set(),

  );

  const hasFocusedOnceRef = useRef(false);

  const viewPagerRef = useRef<ScrollView | null>(null);

  const screenWidth = Dimensions.get('window').width;

  const initialScrollOffset = useRef(

    activeFilter === 'users' ? screenWidth : activeFilter === 'groups' ? screenWidth * 2 : 0

  ).current;

  const handleCreateGroupChat = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_GROUP_CHAT);
  }, [navigation]);

  const handleOpenLabels = useCallback(
    (chat: ChatItem) => {
      const userId = chat.participantId || chat.userId;
      if (!userId || chat.chatType !== 'user') return;
      navigation.navigate(ROUTES.MESSAGE_LABELS, {
        mode: 'assign',
        target: {
          userId,
          name: chat.name,
          username: chat.username,
          avatar: chat.avatar,
        },
      });
    },
    [navigation],
  );

  const handleCreateLabel = useCallback(() => {
    navigation.navigate(ROUTES.MESSAGE_LABELS, {
      mode: 'create',
    });
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

  }, [activeFilter, screenWidth]);

  useEffect(
    () => subscribeToMessageRealtimeConnection(setIsRealtimeConnected),
    [],
  );

  useFocusEffect(

    useCallback(() => {

      let realtimeRefreshRunning = false;
      let realtimeRefreshDirty = false;
      let realtimeRefreshCancelled = false;
      let realtimeRetryTimer: ReturnType<typeof setTimeout> | null = null;

      const flushRealtimeRefresh = async () => {
        if (realtimeRefreshRunning || realtimeRefreshCancelled) return;
        realtimeRefreshRunning = true;
        try {
          while (realtimeRefreshDirty && !realtimeRefreshCancelled) {
            realtimeRefreshDirty = false;
            const refreshed = await loadChats(false, {
              forceRefresh: true,
              includeDiscovery: false,
            });
            if (!refreshed && !realtimeRefreshCancelled) {
              realtimeRefreshDirty = true;
              if (!realtimeRetryTimer) {
                realtimeRetryTimer = setTimeout(() => {
                  realtimeRetryTimer = null;
                  flushRealtimeRefresh().catch(() => undefined);
                }, 300);
              }
              return;
            }
          }
        } finally {
          realtimeRefreshRunning = false;
        }
      };

      if (hasFocusedOnceRef.current) {

        loadLabels()
          .then(() =>
            loadChats(false, {
              forceRefresh: true,
              includeDiscovery: true,
            }),
          )
          .catch(() => undefined);

        loadFollowingUserIds(true).catch(() => undefined);

      } else {

        hasFocusedOnceRef.current = true;

      }

      const unsubscribeRealtime = subscribeToMessageInvalidations(() => {
        realtimeRefreshDirty = true;
        flushRealtimeRefresh().catch(() => undefined);
      });

      if (isRealtimeConnected) {
        return () => {
          realtimeRefreshCancelled = true;
          unsubscribeRealtime();
          if (realtimeRetryTimer) clearTimeout(realtimeRetryTimer);
        };
      }

      const interval = setInterval(() => {
        if (AppState.currentState !== 'active') return;
        loadChats(false).catch(() => undefined);
      }, 5000);

      return () => {
        realtimeRefreshCancelled = true;
        unsubscribeRealtime();
        if (realtimeRetryTimer) clearTimeout(realtimeRetryTimer);
        clearInterval(interval);
      };

    }, [isRealtimeConnected, loadChats, loadFollowingUserIds, loadLabels]),

  );

  const broadcastRecipientChats = useMemo(

    () =>

      broadcastRecipients.map(recipient => ({

        id: `user:${recipient.userId}`,

        hasConversationRecord: false,

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

  const selectedBroadcastRecipientChats = useMemo(
    () =>
      broadcastRecipientChats.filter(chat =>
        selectedRecipients.has(chat.userId),
      ),
    [broadcastRecipientChats, selectedRecipients],
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

    return sortMessageUserChats(filtered);

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
    } catch {
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

                    onPress={handleCreateLabel}

                    activeOpacity={0.8}

                    className="flex-1 flex-row items-center justify-center bg-indigo-50 border border-indigo-100 py-3 rounded-xl active:scale-95"

                  >

                    <Plus size={16} color="#4F46E5" className="mr-1.5" />

                    <Text className="text-indigo-600 font-bold text-sm">

                      {copy.createLabelBtn}

                    </Text>

                  </TouchableOpacity>

                  <TouchableOpacity

                    onPress={() => handleSendBroadcast().catch(() => undefined)}

                    activeOpacity={0.8}

                    disabled={!canSendBroadcast}

                    className={`flex-1 flex-row items-center justify-center py-3 rounded-xl active:scale-95 ${
                      canSendBroadcast ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}

                  >

                    {isSending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Send size={16} color="#ffffff" className="mr-1.5" />
                    )}

                    <Text className="text-white font-bold text-sm">

                      {copy.sendMessageButton}

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

                  <View className="mb-3 flex-row items-end gap-2">

                    <TextInput

                      className="min-h-14 max-h-28 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-base text-slate-900"

                      placeholder={copy.typeYourMessagePlaceholder}

                      placeholderTextColor="#94a3b8"

                      value={broadcastText}

                      multiline

                      textAlignVertical="top"

                      onChangeText={setBroadcastText}

                    />

                    <TouchableOpacity

                      accessibilityRole="button"

                      accessibilityLabel={copy.chooseImage}

                      className="h-11 w-11 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50"

                      activeOpacity={0.8}

                      onPress={() => {

                        handleChooseBroadcastImage().catch(() => undefined);

                      }}

                    >

                      <ImageIcon size={21} color="#4F46E5" />

                    </TouchableOpacity>

                  </View>

                  {broadcastAttachment ? (

                    <View className="mb-3 flex-row items-center rounded-xl border border-indigo-100 bg-indigo-50 p-2">

                      <Image

                        source={{ uri: broadcastAttachment.uri }}

                        className="h-12 w-12 rounded-lg bg-slate-100"

                        resizeMode="cover"

                      />

                      <Text className="ml-3 flex-1 text-sm font-semibold text-slate-700" numberOfLines={1}>

                        {broadcastAttachment.name}

                      </Text>

                      <TouchableOpacity

                        accessibilityRole="button"

                        accessibilityLabel={copy.removeImage}

                        className="h-10 w-10 items-center justify-center rounded-full"

                        onPress={() => setBroadcastAttachment(null)}

                      >

                        <X size={19} color="#64748B" />

                      </TouchableOpacity>

                    </View>

                  ) : null}

                  <View className="mb-2 flex-row items-center justify-between">

                    <Text className="text-xs font-bold uppercase text-slate-400">

                      {copy.selectedRecipients(selectedBroadcastRecipientChats.length)}

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

                  <ScrollView

                    nestedScrollEnabled

                    style={{
                      maxHeight: MESSAGE_BROADCAST_RECIPIENT_LIST_MAX_HEIGHT,
                    }}

                    contentContainerStyle={{ flexGrow: 1 }}

                    className="mb-1 min-h-12 rounded-xl border border-indigo-100"

                    showsVerticalScrollIndicator={selectedBroadcastRecipientChats.length > 3}

                  >

                    {selectedBroadcastRecipientChats.length === 0 ? (

                      <Text className="px-3 py-4 text-sm text-slate-400">

                        {broadcastRecipientChats.length === 0
                          ? copy.selectLabelToLoadRecipients
                          : copy.noRecipientsSelected}

                      </Text>

                    ) : (

                      selectedBroadcastRecipientChats.map(chat => (

                          <View

                            key={chat.userId}

                            className="min-h-14 flex-row items-center border-b border-slate-100 px-3 py-2"

                          >

                            <UserAvatar uri={chat.avatar} name={chat.name} size={36} />

                            <View className="ml-3 flex-1">

                              <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>

                                {chat.name}

                              </Text>

                              {chat.username ? (

                                <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>

                                  @{chat.username}

                                </Text>

                              ) : null}

                            </View>

                            <TouchableOpacity

                              accessibilityRole="button"

                              accessibilityLabel={`${copy.remove} ${chat.name}`}

                              className="h-10 w-10 items-center justify-center rounded-full"

                              onPress={() => {

                                setSelectedRecipients(previous => {

                                  const next = new Set(previous);

                                  next.delete(chat.userId);

                                  return next;

                                });

                              }}

                            >

                              <X size={18} color="#64748B" />

                            </TouchableOpacity>

                          </View>

                        ))

                    )}

                  </ScrollView>

                </View>

              </View>

            }

            ListEmptyComponent={renderListEmpty('broadcast')}

            renderItem={({ item }) => (

              <ChatListItem

                chat={item}

                onPress={handleChatPress}

                onOpenLabels={handleOpenLabels}

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

                onOpenLabels={handleOpenLabels}

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

                onOpenLabels={handleOpenLabels}

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

      <HeaderProfileDrawer

        visible={menuVisible}

        onClose={() => setMenuVisible(false)}

      />

    </SafeAreaView>

  );

}



export default MessageScreen;

const styles = StyleSheet.create({

  messageStoryInstagramRing: {

    position: 'relative',

    width: 62,

    height: 62,

    borderRadius: 31,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: 'transparent',

    shadowColor: '#E1306C',

    shadowOffset: { width: 0, height: 4 },

    shadowOpacity: 0.22,

    shadowRadius: 8,

    elevation: 3,

  },

  messageStoryRingSvg: {

    position: 'absolute',

    top: 0,

    left: 0,

  },

  messageStoryRingSvgSeen: {

    opacity: 0.95,

  },

  messageStoryAvatarFrame: {

    width: 54,

    height: 54,

    borderRadius: 27,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#FFFFFF',

    padding: 3,

  },

  messageStoryAvatarImage: {

    width: '100%',

    height: '100%',

    borderRadius: 24,

    backgroundColor: '#F1F5F9',

  },

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
