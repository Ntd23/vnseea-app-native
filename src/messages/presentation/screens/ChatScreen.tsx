// Description: Renders a Messages chat conversation with media, voice notes, and LiveKit call actions.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  PanResponder,
  ToastAndroid,
  Dimensions,
  Pressable,
  FlatList,
  type ListRenderItem,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  FastForward,
  ImagePlus,
  Info,
  Link as LinkIcon,
  LogOut,
  MessageCircle,
  Mic,
  Pencil,
  Phone,
  PhoneMissed,
  Play,
  Pause,
  Rewind,
  Send,
  ShoppingBag,
  Square,
  Trash2,
  UserMinus,
  UserPlus,
  Video,
  Volume2,
  VolumeX,
  X,
  CornerUpLeft,
  Copy,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  launchImageLibrary,
  type Asset,
  type MediaType,
} from 'react-native-image-picker';
import VideoPlayer from 'react-native-video';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import { useChatViewModel } from '../../application/view-models/useChatViewModel';
import { useGroupLiveKitCallSession } from '../../application/view-models/useGroupLiveKitCallSession';
import { useLiveKitCallSession } from '../../application/view-models/useLiveKitCallSession';
import type {
  GroupAddableUser,
  GroupChatInfo,
  GroupChatMember,
  GroupSharedAssets,
  MessageAttachment,
  MessageItem,
} from '../../domain/types/messages.types';
import type { ProductItem } from '../../../product/domain/types/product.types';
import { AudioPlayer } from '../../../shared-kernel/presentation/components/AudioPlayer';
import { AudioWaveform } from '../../../shared-kernel/presentation/components/AudioWaveform';
import { useAudioRecorder } from '../../../shared-kernel/application/hooks/useAudioRecorder';
import { formatAudioDuration } from '../../../shared-kernel/application/utils/audioFiles';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { ROOT_SAFE_AREA_EDGES } from '../../../shared-kernel/presentation/utils/safeAreaEdges';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

function formatPrice(price: string, symbolOrCode: string): string {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return price;

  let currency = symbolOrCode;
  if (currency === '0') currency = '$';
  else if (currency === '1') currency = '€';
  else if (currency === 'VNSEEA' || currency === 'vnd') currency = 'VNSEEA';

  const formatted = numPrice.toLocaleString('vi-VN');

  if (currency === 'VNSEEA') {
    return `${formatted} VNSEEA`;
  }
  if (currency === '$' || currency === 'USD') {
    return `$${formatted}`;
  }
  if (currency === '€' || currency === 'EUR') {
    return `€${formatted}`;
  }
  return `${formatted} ${currency}`;
}

type ChatScreenProps = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.CHAT
>;

type ChatMediaViewerItem = {
  uri: string;
  type: 'image' | 'video';
};

type OpenChatMedia = (
  media: ChatMediaViewerItem,
  mediaItems?: ChatMediaViewerItem[],
) => void;

const MAX_MEDIA_ATTACHMENTS = 10;
const IMAGE_GROUP_WINDOW_SECONDS = 120;
const IMAGE_GALLERY_WIDTH = Math.min(Dimensions.get('window').width - 92, 332);
const IMAGE_GALLERY_GAP = 3;
const IMAGE_GALLERY_TILE_SIZE = (IMAGE_GALLERY_WIDTH - IMAGE_GALLERY_GAP) / 2;
const VIDEO_PREVIEW_HEIGHT = Math.round(IMAGE_GALLERY_WIDTH * 0.74);

const CHAT_COPY: Record<
  AppLanguage,
  {
    today: string;
    yesterday: string;
    loadingMessages: string;
    hello: (name: string) => string;
    emptyHint: string;
    newMessages: string;
    recording: (duration: string) => string;
    inputPlaceholder: string;
    retryHint: string;
    clearHistory: string;
    clearHistoryMessage: string;
    cancel: string;
    delete: string;
    removeMember: string;
    removeMemberMessage: (name: string) => string;
    audioCallFailedTitle: string;
    missingRecipient: string;
    missingGroup: string;
    recordFailed: string;
    groupChat: string;
    addMembers: string;
    groupMembers: string;
    sharedMedia: string;
    emptySharedMedia: string;
    leaveGroup: string;
    leaveGroupMessage: string;
    leaveGroupConfirm: string;
    errorTitle: string;
    cannotFindMember: string;
    cannotAddMember: string;
    cannotSaveGroup: string;
    cannotClearHistory: string;
    cannotLeaveGroup: string;
    cannotRemoveMember: string;
    missedCall: string;
    noAnswer: string;
  }
> = {
  vi: {
    today: 'Hôm nay',
    yesterday: 'Hôm qua',
    loadingMessages: 'Đang tải tin nhắn...',
    hello: name => `Chào ${name}!`,
    emptyHint: 'Gửi tin nhắn để bắt đầu cuộc trò chuyện',
    newMessages: 'Tin nhắn mới',
    recording: duration => `Đang ghi âm ${duration}`,
    inputPlaceholder: 'Tin nhắn',
    retryHint: 'Vui lòng thử lại.',
    clearHistory: 'Xóa lịch sử trò chuyện',
    clearHistoryMessage: 'Bạn muốn xóa lịch sử nhóm này?',
    cancel: 'Hủy',
    delete: 'Xóa',
    removeMember: 'Xóa thành viên',
    removeMemberMessage: name => `Xóa ${name} khỏi nhóm?`,
    audioCallFailedTitle: 'Không gọi được',
    missingRecipient: 'Thiếu mã người nhận cuộc gọi.',
    missingGroup: 'Thiếu mã nhóm để bắt đầu cuộc gọi.',
    recordFailed: 'Không ghi âm được',
    groupChat: 'Nhắn tin nhóm',
    addMembers: 'Thêm thành viên',
    groupMembers: 'Thành viên nhóm',
    sharedMedia: 'Ảnh/Video',
    emptySharedMedia: 'Chưa có Ảnh/Video được chia sẻ trong hội thoại này',
    leaveGroup: 'Rời nhóm',
    leaveGroupMessage: 'Bạn sẽ không còn nhận tin nhắn từ nhóm này.',
    leaveGroupConfirm: 'Rời nhóm',
    errorTitle: 'Lỗi',
    cannotFindMember: 'Không tìm được thành viên',
    cannotAddMember: 'Không thêm được thành viên',
    cannotSaveGroup: 'Không lưu được nhóm',
    cannotClearHistory: 'Không xóa được lịch sử',
    cannotLeaveGroup: 'Không rời được nhóm',
    cannotRemoveMember: 'Không xóa được thành viên',
    missedCall: 'Cuộc gọi nhỡ',
    noAnswer: 'Không trả lời',
  },
  en: {
    today: 'Today',
    yesterday: 'Yesterday',
    loadingMessages: 'Loading messages...',
    hello: name => `Hi ${name}!`,
    emptyHint: 'Send a message to start the conversation',
    newMessages: 'New messages',
    recording: duration => `Recording ${duration}`,
    inputPlaceholder: 'Message',
    retryHint: 'Please try again.',
    clearHistory: 'Clear chat history',
    clearHistoryMessage: 'Do you want to clear this group history?',
    cancel: 'Cancel',
    delete: 'Delete',
    removeMember: 'Remove member',
    removeMemberMessage: name => `Remove ${name} from the group?`,
    audioCallFailedTitle: 'Cannot start call',
    missingRecipient: 'Missing recipient ID.',
    missingGroup: 'Missing group ID to start the call.',
    recordFailed: 'Could not record audio',
    groupChat: 'Group chat',
    addMembers: 'Add members',
    groupMembers: 'Group members',
    sharedMedia: 'Photos/Videos',
    emptySharedMedia: 'No photos or videos have been shared in this chat',
    leaveGroup: 'Leave group',
    leaveGroupMessage: 'You will no longer receive messages from this group.',
    leaveGroupConfirm: 'Leave group',
    errorTitle: 'Error',
    cannotFindMember: 'Member not found',
    cannotAddMember: 'Could not add member',
    cannotSaveGroup: 'Could not save group',
    cannotClearHistory: 'Could not clear history',
    cannotLeaveGroup: 'Could not leave group',
    cannotRemoveMember: 'Could not remove member',
    missedCall: 'Missed call',
    noAnswer: 'No answer',
  },
};

// Format time
function formatMessageTime(timestamp: number) {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

type LinkTextSegment = {
  text: string;
  url?: string;
};

function normalizeDetectedUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function splitLinkTextSegments(text: string): LinkTextSegment[] {
  const urlPattern =
    /((?:https?:\/\/|www\.)[^\s<>()]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>()]*)?)/gi;
  const segments: LinkTextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    const rawLink = match[0];
    const trailingMatch = rawLink.match(/[.,!?;:\])]+$/);
    const trailingText = trailingMatch?.[0] ?? '';
    const linkText = trailingText
      ? rawLink.slice(0, -trailingText.length)
      : rawLink;

    if (linkText) {
      segments.push({
        text: linkText,
        url: normalizeDetectedUrl(linkText),
      });
    }
    if (trailingText) {
      segments.push({ text: trailingText });
    }

    lastIndex = match.index + rawLink.length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ text }];
}

function LinkifiedText({
  text,
  className,
  style,
  linkColor = '#2563EB',
  numberOfLines,
}: {
  text: string;
  className?: string;
  style?: StyleProp<TextStyle>;
  linkColor?: string;
  numberOfLines?: number;
}) {
  const segments = useMemo(() => splitLinkTextSegments(text), [text]);

  return (
    <Text className={className} style={style} numberOfLines={numberOfLines}>
      {segments.map((segment, index) =>
        segment.url ? (
          <Text
            key={`${segment.url}-${index}`}
            style={[styles.inlineLink, { color: linkColor }]}
            onPress={() => Linking.openURL(segment.url!).catch(() => undefined)}
          >
            {segment.text}
          </Text>
        ) : (
          segment.text
        ),
      )}
    </Text>
  );
}

// Format date separator
function formatDateSeparator(
  timestamp: number,
  copy: typeof CHAT_COPY.vi,
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const messageDate = new Date(timestamp * 1000);
  messageDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return copy.today;
  if (diffDays === 1) return copy.yesterday;
  return messageDate.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'short',
  });
}

type ChatMessageListItem =
  | { kind: 'message'; id: string; message: MessageItem }
  | { kind: 'media-group'; id: string; messages: MessageItem[] };

function isGroupableMediaMessage(message: MessageItem) {
  return Boolean(
    message.media &&
      (message.mediaType === 'image' || message.mediaType === 'video'),
  );
}

function buildMessageListItems(messages: MessageItem[]): ChatMessageListItem[] {
  const items: ChatMessageListItem[] = [];

  for (let index = 0; index < messages.length; ) {
    const message = messages[index];
    if (!isGroupableMediaMessage(message)) {
      items.push({ kind: 'message', id: message.id, message });
      index += 1;
      continue;
    }

    const group = [message];
    let nextIndex = index + 1;
    while (nextIndex < messages.length) {
      const nextMessage = messages[nextIndex];
      const previousMessage = group[group.length - 1];
      const isNearPrevious =
        Math.abs(previousMessage.time - nextMessage.time) <=
        IMAGE_GROUP_WINDOW_SECONDS;

      if (
        !isGroupableMediaMessage(nextMessage) ||
        nextMessage.isSentByMe !== message.isSentByMe ||
        !isNearPrevious
      ) {
        break;
      }

      group.push(nextMessage);
      nextIndex += 1;
    }

    items.push(
      group.length > 1
        ? {
            kind: 'media-group',
            id: `media-group-${group.map(item => item.id).join('-')}`,
            messages: group,
          }
        : { kind: 'message', id: message.id, message },
    );
    index = nextIndex;
  }

  return items;
}

function getChatListItemType(item: ChatMessageListItem) {
  if (item.kind === 'media-group') return 'media-group';

  const { message } = item;
  if (message.callEvent) {
    return `call-${message.callEvent.callType}-${message.callEvent.status}`;
  }
  if (message.mediaType) {
    return `media-${message.mediaType}`;
  }
  if (message.message?.includes('TĂ´i muá»‘n há»i vá» sáº£n pháº©m:')) {
    return 'product-inquiry';
  }
  if (message.message?.includes('â†ªï¸ *Tráº£ lá»i tin nháº¯n:*')) {
    return 'reply-message';
  }

  return 'text-message';
}

type MessageSkeletonBubbleWidthStyle =
  | 'messageSkeletonBubbleSmall'
  | 'messageSkeletonBubbleMedium'
  | 'messageSkeletonBubbleLarge'
  | 'messageSkeletonBubbleXLarge';

type MessageSkeletonRow = {
  id: string;
  sentByMe: boolean;
  bubbleWidthStyle: MessageSkeletonBubbleWidthStyle;
  lines: number;
};

const MESSAGE_SKELETON_ROWS: MessageSkeletonRow[] = [
  {
    id: 'skeleton-1',
    sentByMe: false,
    bubbleWidthStyle: 'messageSkeletonBubbleLarge',
    lines: 2,
  },
  {
    id: 'skeleton-2',
    sentByMe: true,
    bubbleWidthStyle: 'messageSkeletonBubbleMedium',
    lines: 1,
  },
  {
    id: 'skeleton-3',
    sentByMe: false,
    bubbleWidthStyle: 'messageSkeletonBubbleXLarge',
    lines: 3,
  },
  {
    id: 'skeleton-4',
    sentByMe: true,
    bubbleWidthStyle: 'messageSkeletonBubbleLarge',
    lines: 2,
  },
  {
    id: 'skeleton-5',
    sentByMe: false,
    bubbleWidthStyle: 'messageSkeletonBubbleSmall',
    lines: 1,
  },
];

function ChatMessagesSkeleton() {
  return (
    <View style={styles.messageSkeletonContainer}>
      {MESSAGE_SKELETON_ROWS.map(row => (
        <View
          key={row.id}
          style={[
            styles.messageSkeletonRow,
            row.sentByMe
              ? styles.messageSkeletonRowSent
              : styles.messageSkeletonRowReceived,
          ]}
        >
          {!row.sentByMe ? (
            <View style={styles.messageSkeletonAvatar} />
          ) : null}
          <View
            style={[
              styles.messageSkeletonBubble,
              styles[row.bubbleWidthStyle],
              row.sentByMe
                ? styles.messageSkeletonBubbleSent
                : styles.messageSkeletonBubbleReceived,
            ]}
          >
            {Array.from({ length: row.lines }).map((_, index) => {
              const isLastLine = index === row.lines - 1;
              return (
                <View
                  key={`${row.id}-line-${index}`}
                  style={[
                    styles.messageSkeletonLine,
                    row.sentByMe
                      ? styles.messageSkeletonLineSent
                      : styles.messageSkeletonLineReceived,
                    index > 0 ? styles.messageSkeletonLineGap : null,
                    isLastLine ? styles.messageSkeletonLineShort : null,
                  ]}
                />
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
function assetToAttachment(asset: Asset): MessageAttachment | undefined {
  if (!asset.uri) return undefined;

  const isVideo =
    asset.type?.startsWith('video/') ||
    /\.(mp4|mov|webm|m4v)$/i.test(asset.fileName ?? '');
  const uri =
    Platform.OS === 'android' && !/^[a-z][a-z0-9+.-]*:\/\//i.test(asset.uri)
      ? `file://${asset.uri}`
      : asset.uri;

  return {
    uri,
    name: asset.fileName ?? `chat-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
    type: asset.type ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
    mediaType: isVideo ? 'video' : 'image',
  };
}

function formatCallDuration(duration: number) {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0) parts.push(`${minutes} phút`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} giây`);

  return parts.join(' ');
}

function getCallDetail(message: MessageItem) {
  const callEvent = message.callEvent!;
  const { status, statusBy, initiatorId, receiverId, isInitiator, isReceiver } =
    callEvent;

  if (status === 'calling') {
    return isInitiator ? 'Đang gọi...' : 'Cuộc gọi đến';
  }

  if (status === 'started') {
    if (!callEvent.isGroupCall) return 'Đang gọi...';
    return isInitiator ? 'Bạn đã bắt đầu' : 'Cuộc gọi đã bắt đầu';
  }

  if (status === 'left') {
    return 'Đã rời cuộc gọi';
  }

  if (status === 'cancelled') {
    if (statusBy === initiatorId) {
      return isInitiator ? 'Bạn đã hủy cuộc gọi' : 'Người gọi đã hủy cuộc gọi';
    }

    return 'Cuộc gọi đã bị hủy';
  }

  if (status === 'declined') {
    if (statusBy === receiverId) {
      return isReceiver ? 'Bạn đã từ chối' : 'Người nhận đã từ chối';
    }

    if (statusBy === initiatorId) {
      return isInitiator ? 'Bạn đã hủy cuộc gọi' : 'Người gọi đã hủy cuộc gọi';
    }

    return 'Cuộc gọi đã bị từ chối';
  }

  if (status === 'missed' || status === 'no_answer') {
    return isInitiator ? 'Không trả lời' : 'Cuộc gọi nhỡ';
  }

  if (status === 'ended') {
    return callEvent.duration
      ? formatCallDuration(callEvent.duration)
      : 'Đã kết thúc';
  }

  if (status === 'busy') {
    return 'Máy bận';
  }

  return 'Cuộc gọi';
}

function TypingIndicator({ name, avatar }: { name: string; avatar: string }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  if (!name) return null;

  return (
    <View className="flex-row items-center px-4 py-2">
      <Image source={{ uri: avatar }} className="mr-2 h-7 w-7 rounded-full" />
      <View className="rounded-2xl bg-[#E4E6F0] px-4 py-3">
        <Text className="text-sm text-gray-600">
          {name} đang nhắn{dots}
        </Text>
      </View>
    </View>
  );
}

function isCallTerminalWithoutAnswer(callEvent: MessageItem['callEvent']) {
  if (!callEvent) return false;
  return ['cancelled', 'declined', 'missed', 'no_answer', 'busy'].includes(
    callEvent.status,
  );
}

function isMissedIncomingCall(callEvent: MessageItem['callEvent']) {
  if (!callEvent) return false;
  return (
    callEvent.isReceiver &&
    ['cancelled', 'declined', 'missed', 'no_answer'].includes(callEvent.status)
  );
}

function getCallCardTitle(callEvent: MessageItem['callEvent']) {
  if (!callEvent) return 'Cuộc gọi';
  if (isCallTerminalWithoutAnswer(callEvent)) {
    return callEvent.callType === 'video'
      ? 'Đã nhỡ cuộc gọi video'
      : 'Đã nhỡ cuộc gọi thoại';
  }

  if (callEvent.callType === 'video') {
    return callEvent.isGroupCall ? 'Cuộc gọi video nhóm' : 'Cuộc gọi video';
  }

  return callEvent.isGroupCall ? 'Cuộc gọi âm thanh nhóm' : 'Cuộc gọi âm thanh';
}

function getCallCardDetail(message: MessageItem) {
  const callEvent = message.callEvent!;
  if (callEvent.status === 'ended') {
    return callEvent.duration
      ? formatCallDuration(callEvent.duration)
      : 'Đã kết thúc';
  }

  if (callEvent.status === 'calling') {
    return callEvent.isInitiator ? 'Đang gọi...' : 'Cuộc gọi đến';
  }

  if (callEvent.status === 'started') {
    return 'Đang gọi...';
  }

  if (callEvent.status === 'busy') {
    return 'Máy bận';
  }

  if (isCallTerminalWithoutAnswer(callEvent)) {
    return formatMessageTime(message.time);
  }

  return getCallDetail(message);
}

function CallEventContent({
  message,
  onRecall,
}: {
  message: MessageItem;
  onRecall?: (callType: 'audio' | 'video') => void;
}) {
  const callEvent = message.callEvent!;
  const hasErrorStatus = isCallTerminalWithoutAnswer(callEvent);
  const missedIncoming = isMissedIncomingCall(callEvent);
  const Icon =
    hasErrorStatus && callEvent.callType === 'audio'
      ? PhoneMissed
      : callEvent.callType === 'video'
      ? Video
      : Phone;

  const isSentByMe = callEvent ? callEvent.isInitiator : message.isSentByMe;
  const iconBgClass = missedIncoming ? 'bg-red-500' : isSentByMe ? 'bg-blue-500' : 'bg-gray-400';

  return (
    <View
      className={`rounded-2xl p-3 border ${
        isSentByMe
          ? 'bg-blue-50 border-blue-100/60'
          : 'bg-[#F0F2F7] border-slate-200/50'
      }`}
      style={{ width: 230 }}
    >
      <View className="flex-row items-center">
        <View
          className={`mr-2.5 h-9 w-9 items-center justify-center rounded-full ${iconBgClass}`}
        >
          <Icon size={16} color="#ffffff" />
        </View>
        <View className="shrink flex-1">
          <Text className="text-[14px] font-semibold text-gray-950" numberOfLines={1}>
            {getCallCardTitle(callEvent)}
          </Text>
          <Text className="mt-0.5 text-[11.5px] text-gray-500" numberOfLines={1}>
            {getCallCardDetail(message)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        className="mt-2.5 items-center justify-center rounded-xl bg-white border border-slate-200/80 shadow-sm"
        style={{ height: 34 }}
        onPress={() => onRecall?.(callEvent.callType)}
      >
        <Text className="text-[12px] font-bold text-gray-950">
          Gọi lại
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Message Bubble
function parseProductInquiry(messageText: string) {
  if (!messageText || !messageText.includes('Tôi muốn hỏi về sản phẩm:')) {
    return null;
  }
  try {
    const nameMatch = messageText.match(/👉\s*\*(.*?)\*/);
    const priceMatch = messageText.match(/💰\s*Giá:\s*\*(.*?)\*/);
    const locationMatch = messageText.match(/📍\s*Địa điểm:\s*\*(.*?)\*/);
    const imageMatch = messageText.match(/📷\s*Ảnh:\s*(http\S+)/);
    const idMatch = messageText.match(/🆔\s*ID:\s*\*(.*?)\*/);
    const msgMatch = messageText.match(/💬\s*Lời nhắn:\s*([\s\S]+)$/);

    if (!nameMatch) return null;

    return {
      name: nameMatch[1],
      price: priceMatch ? priceMatch[1] : '',
      location: locationMatch ? locationMatch[1] : '',
      image: imageMatch ? imageMatch[1] : '',
      id: idMatch ? idMatch[1] : '',
      userMessage: msgMatch ? msgMatch[1].trim() : '',
    };
  } catch (e) {
    return null;
  }
}

type ReplyMediaType = 'image' | 'video' | 'audio' | 'file';

type ParsedReplyMessage = {
  senderName: string;
  originalMessage: string;
  originalMessageId: string;
  originalImage?: string;
  originalMedia?: string;
  originalMediaType?: ReplyMediaType;
  replyText: string;
};

function normalizeReplyMediaType(value: string): ReplyMediaType | undefined {
  if (value === 'image' || value === 'video' || value === 'audio' || value === 'file') {
    return value;
  }
  return undefined;
}

function inferReplyMediaType(
  reply: Pick<ParsedReplyMessage, 'originalImage' | 'originalMessage' | 'originalMediaType'>,
): ReplyMediaType | undefined {
  if (reply.originalMediaType) return reply.originalMediaType;
  if (reply.originalImage) return 'image';

  const normalizedMessage = reply.originalMessage.toLowerCase();
  if (normalizedMessage.includes('video')) return 'video';
  if (
    normalizedMessage.includes('audio') ||
    normalizedMessage.includes('voice') ||
    normalizedMessage.includes('ghi') ||
    normalizedMessage.includes('tho')
  ) {
    return 'audio';
  }
  return undefined;
}

function getReplyMediaLabel(type?: ReplyMediaType) {
  if (type === 'image') return '[Hình ảnh]';
  if (type === 'video') return '[Video]';
  if (type === 'audio') return '[Ghi âm]';
  if (type === 'file') return '[File]';
  return '';
}

function parseMessageReply(messageText: string): ParsedReplyMessage | null {
  if (!messageText || !messageText.includes('↪️ *Trả lời tin nhắn:*')) {
    return null;
  }
  try {
    const senderMatch = messageText.match(/👉\s*\*(.*?)\*:\s*([\s\S]*?)\s*🆔/);
    const idMatch = messageText.match(/🆔\s*ID:\s*\*(.*?)\*/);
    const imageMatch = messageText.match(/🖼️\s*Ảnh:\s*\*(.*?)\*/);

    const mediaMatch = messageText.match(/META_MEDIA:\s*\*(.*?)\*/);
    const mediaTypeMatch = messageText.match(/META_MEDIA_TYPE:\s*\*(.*?)\*/);

    if (!senderMatch) return null;
    const originalMediaType =
      normalizeReplyMediaType(mediaTypeMatch?.[1] ?? '') ??
      (imageMatch ? 'image' : undefined);
    const originalMedia = mediaMatch?.[1] || imageMatch?.[1] || '';

    let replyText = '';
    const doubleNewlineIndex = messageText.indexOf('\n\n');
    if (doubleNewlineIndex !== -1) {
      replyText = messageText.substring(doubleNewlineIndex + 2).trim();
    } else {
      let lastBlockIndex = -1;
      if (imageMatch) {
        lastBlockIndex = messageText.indexOf(imageMatch[0]) + imageMatch[0].length;
      } else if (idMatch) {
        lastBlockIndex = messageText.indexOf(idMatch[0]) + idMatch[0].length;
      }
      if (lastBlockIndex !== -1) {
        replyText = messageText.substring(lastBlockIndex).trim();
      }
    }

    return {
      senderName: senderMatch[1],
      originalMessage: senderMatch[2],
      originalMessageId: idMatch ? idMatch[1] : '',
      originalImage: imageMatch ? imageMatch[1] : '',
      originalMedia,
      originalMediaType,
      replyText: replyText || messageText,
    };
  } catch (e) {
    return null;
  }
}

function getReplyLabel(senderName: string, isSentByMe: boolean, partnerName: string) {
  const isOriginalMe = senderName === 'Tôi';
  if (isSentByMe) {
    return isOriginalMe ? 'Bạn đã trả lời chính mình' : `Bạn đã trả lời ${senderName}`;
  } else {
    return isOriginalMe ? `${partnerName} đã trả lời bạn` : `${partnerName} đã trả lời chính mình`;
  }
}

function getMessageSnippet(message: MessageItem, chatName: string) {
  if (message.media) {
    if (message.mediaType === 'image') return '[Hình ảnh]';
    if (message.mediaType === 'video') return '[Video]';
    if (message.mediaType === 'audio') return '[Ghi âm]';
    return '[File]';
  }

  if (message.media) {
    if (message.mediaType === 'image') return '📷 Hình ảnh';
    if (message.mediaType === 'video') return '🎥 Video';
    if (message.mediaType === 'audio') return '🎵 Tin nhắn thoại';
    return '📎 Tệp tin';
  }

  const productInquiry = parseProductInquiry(message.message);
  if (productInquiry) {
    return `🛍️ Hỏi về sản phẩm: ${productInquiry.name}`;
  }

  const replyInfo = parseMessageReply(message.message);
  if (replyInfo) {
    return replyInfo.replyText;
  }

  return message.message;
}

function ReplyMessageBubble({
  reply,
  isSentByMe,
}: {
  reply: ParsedReplyMessage;
  isSentByMe: boolean;
}) {
  const mediaType = inferReplyMediaType(reply);
  const mediaLabel = getReplyMediaLabel(mediaType);
  const previewText = mediaLabel || reply.originalMessage;
  const originalMedia = reply.originalMedia || reply.originalImage;
  const replyBg = isSentByMe ? 'bg-sky-200/70' : 'bg-black/5';
  const senderColor = 'text-blue-600';
  const originalMessageColor = 'text-slate-500';
  const replyTextColor = 'text-slate-900';

  return (
    <View className="flex-col min-w-[190px] max-w-[260px] mt-0.5">
      {/* Original message frame */}
      <View
        className={`flex-row rounded-lg overflow-hidden ${replyBg} items-stretch`}
        style={{ minHeight: 42 }}
      >
        {/* Left vertical blue line */}
        <View className="w-1 bg-[#0084FF]" />

        {/* Content column */}
        <View className="flex-1 pl-2 py-1.5 justify-center">
          <Text className={`text-[12px] font-bold ${senderColor}`} numberOfLines={1}>
            {reply.senderName}
          </Text>
          {mediaLabel ? (
            <Text className={`text-[11px] mt-0.5 ${originalMessageColor}`} numberOfLines={1}>
              {previewText}
            </Text>
          ) : (
            <LinkifiedText
              text={previewText}
              className={`text-[11px] mt-0.5 ${originalMessageColor}`}
              linkColor="#2563EB"
              numberOfLines={1}
            />
          )}
        </View>

        {!!originalMedia && mediaType === 'image' && (
          <View className="justify-center px-1.5 py-1">
            <Image
              source={{ uri: originalMedia }}
              className="w-9 h-9 rounded bg-slate-200"
              resizeMode="cover"
            />
          </View>
        )}
        {!!mediaType && mediaType !== 'image' && (
          <View className="justify-center px-1.5 py-1">
            <View className="h-9 w-9 items-center justify-center rounded bg-violet-100">
              {mediaType === 'video' ? (
                <Play size={17} color="#7C3AED" fill="#7C3AED" />
              ) : mediaType === 'audio' ? (
                <Mic size={17} color="#7C3AED" />
              ) : (
                <FileText size={17} color="#7C3AED" />
              )}
            </View>
          </View>
        )}
      </View>

      {/* Main Reply message text */}
      <Text className={`text-[15px] leading-5 mt-1.5 ${replyTextColor}`}>
        {reply.replyText}
      </Text>
    </View>
  );
}

function ProductInquiryBubble({
  product,
  isSentByMe,
}: {
  product: {
    name: string;
    price: string;
    location?: string;
    image?: string;
    id?: string;
    userMessage: string;
  };
  isSentByMe: boolean;
}) {
  const cardBg = 'bg-white';
  const cardBorder = 'border-slate-200';
  const nameColor = 'text-slate-800';
  const priceColor = 'text-blue-600';
  const navigation = useNavigation<any>();

  const handlePressProduct = () => {
    if (product.id) {
      navigation.navigate(ROUTES.PRODUCT_DETAIL, {
        productId: Number(product.id),
      });
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePressProduct}
      className={`w-[210px] rounded-2xl border overflow-hidden ${cardBg} ${cardBorder} shadow-sm`}
    >
      {!!product.image && (
        <Image
          source={{ uri: product.image }}
          className="w-full h-28 bg-slate-100"
          resizeMode="cover"
        />
      )}
      <View className="p-2.5">
        <Text className={`text-[13px] font-semibold leading-4 ${nameColor}`} numberOfLines={2}>
          {product.name}
        </Text>
        <Text className={`text-[12px] font-bold mt-1.5 ${priceColor}`}>
          {product.price}
        </Text>
        {!!product.location && (
          <Text className="text-[9.5px] mt-1 text-slate-400 font-medium" numberOfLines={1}>
            📍 {product.location}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function MessageBubble({
  message,
  avatar,
  partnerName,
  showAvatar = true,
  onOpenMedia,
  onReply,
  onLongPress,
  onRecallCall,
  onPressReply,
  onQuickRecord,
}: {
  message: MessageItem;
  avatar: string;
  partnerName: string;
  showAvatar?: boolean;
  onOpenMedia: OpenChatMedia;
  onReply?: (message: MessageItem) => void;
  onLongPress?: (message: MessageItem) => void;
  onRecallCall?: (callType: 'audio' | 'video') => void;
  onPressReply?: (originalMessageId: string) => void;
  onQuickRecord?: () => void;
}) {
  const isSentByMe = message.callEvent ? message.callEvent.isInitiator : message.isSentByMe;

  const isMediaOnly =
    !message.callEvent &&
    !message.message &&
    ['image', 'video', 'audio'].includes(message.mediaType ?? '');
  const hasMessageMedia =
    !message.callEvent &&
    Boolean(message.media) &&
    ['image', 'video', 'audio'].includes(message.mediaType ?? '');

  const productInquiry = parseProductInquiry(message.message);
  const replyInfo = parseMessageReply(message.message);
  const visibleMessageText = productInquiry
    ? productInquiry.userMessage || 'Mặt hàng này còn không bạn yêu?'
    : replyInfo
    ? replyInfo.replyText
    : message.message;
  const messageTextClassName = `text-[15px] leading-5 ${
    isSentByMe && !replyInfo ? 'text-white' : 'text-gray-900'
  }`;
  const messageLinkColor = isSentByMe && !replyInfo ? '#ffffff' : '#2563EB';
  const usesLightReplyBubble = Boolean(replyInfo) && !hasMessageMedia && !isMediaOnly;

  const translateX = useRef(new Animated.Value(0)).current;
  const replyIconOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 10 && Math.abs(dy) < 8;
      },
      onPanResponderMove: (_, gestureState) => {
        const drag = gestureState.dx;
        if (drag > 0) {
          translateX.setValue(Math.min(drag, 60));
          replyIconOpacity.setValue(Math.min(drag / 45, 1));
        } else {
          translateX.setValue(Math.max(drag, -20));
          replyIconOpacity.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const drag = gestureState.dx;
        if (drag > 45 && onReply) {
          onReply(message);
        }
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            tension: 50,
            friction: 7,
          }),
          Animated.timing(replyIconOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }),
        ]).start();
      },
    })
  ).current;

  return (
    <View
      className="mb-2 px-3 relative justify-center"
      {...panResponder.panHandlers}
    >
      {/* Reply Icon Indicator behind the bubble */}
      <Animated.View
        style={{
          opacity: replyIconOpacity,
          position: 'absolute',
          left: 12,
          top: '25%',
          transform: [
            {
              scale: replyIconOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1],
              }),
            },
          ],
        }}
        className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center border border-slate-200"
      >
        <CornerUpLeft size={16} color="#0084FF" />
      </Animated.View>

      {/* Sliding message row */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        className={`flex-row ${
          isSentByMe ? 'justify-end' : 'justify-start'
        } items-end`}
      >
        {!isSentByMe && (
          showAvatar ? (
            <Image
              source={{ uri: avatar }}
              className="mr-2 mb-1 h-7 w-7 rounded-full bg-gray-200"
              fadeDuration={0}
              resizeMethod="resize"
            />
          ) : (
            <View className="w-7 mr-2" />
          )
        )}

        {isSentByMe && message.mediaType === 'audio' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onQuickRecord}
            className="h-8 w-8 rounded-full justify-center items-center bg-slate-100 border border-slate-200 mr-2 mb-1"
          >
            <Mic size={15} color="#475569" />
          </TouchableOpacity>
        )}

        <View className={`flex-col max-w-[78%] ${isSentByMe ? 'items-end' : 'items-start'}`}>
          {/* Reply Label (outside bubble) */}
          {false && !!replyInfo && (
            <View className="flex-row items-center mb-1 px-1 opacity-70">
              <CornerUpLeft size={11} color="#64748B" className="mr-1" />
              <Text className="text-[10px] font-semibold text-slate-500">
                {getReplyLabel(replyInfo!.senderName, isSentByMe ?? false, partnerName)}
              </Text>
            </View>
          )}

          {/* Replied Content Preview Box (outside bubble) */}
          {false && !!replyInfo && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => replyInfo!.originalMessageId && onPressReply?.(replyInfo!.originalMessageId)}
              className="mb-1 rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
              style={{ opacity: 0.9 }}
            >
              {replyInfo!.originalImage ? (
                <View className="relative">
                  <Image
                    source={{ uri: replyInfo!.originalImage }}
                    className="w-24 h-24 bg-slate-200"
                    resizeMode="cover"
                  />
                  {replyInfo!.originalMessage.includes('🎥') && (
                    <View className="absolute inset-0 items-center justify-center bg-black/25">
                      <Play size={16} color="#ffffff" fill="#ffffff" />
                    </View>
                  )}
                </View>
              ) : (
                <View className="px-3 py-1.5 max-w-[200px]">
                  <LinkifiedText
                    text={replyInfo!.originalMessage}
                    className="text-xs text-slate-600"
                    linkColor="#2563EB"
                    numberOfLines={2}
                  />
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Product Inquiry Card (outside bubble) */}
          {!!productInquiry && (
            <View className="mb-2 shadow-sm">
              <ProductInquiryBubble
                product={productInquiry}
                isSentByMe={isSentByMe ?? false}
              />
            </View>
          )}

          {/* Main Bubble */}
          <View
            className={`${
              message.callEvent
                ? ''
                : `${isSentByMe ? 'self-end' : 'self-start'} ${
                    isMediaOnly || hasMessageMedia
                      ? ''
                      : replyInfo
                      ? isSentByMe
                        ? 'rounded-2xl rounded-br-md border border-sky-200 bg-sky-100 px-3 py-2'
                        : 'rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2'
                      : isSentByMe
                      ? 'rounded-2xl rounded-br-md bg-blue-600 px-3 py-2'
                      : 'rounded-2xl rounded-bl-md bg-gray-100 px-3 py-2'
                  }`
            } ${
              message.deliveryState === 'sending' ? 'opacity-70' : ''
            }`}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() => onLongPress?.(message)}
              delayLongPress={350}
            >
              {message.callEvent ? (
                <CallEventContent message={message} onRecall={onRecallCall} />
              ) : (
                <>
                  <MessageMedia message={message} onOpenMedia={onOpenMedia} />
                  {!!replyInfo ? (
                    hasMessageMedia ? (
                      <View
                        className={`mt-1 rounded-2xl px-3 py-2 ${
                          isSentByMe
                            ? 'rounded-br-md border border-sky-200 bg-sky-100'
                            : 'rounded-bl-md border border-gray-200 bg-white'
                        }`}
                        style={styles.mediaCaptionBubble}
                      >
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => replyInfo!.originalMessageId && onPressReply?.(replyInfo!.originalMessageId)}
                        >
                          <ReplyMessageBubble reply={replyInfo} isSentByMe={isSentByMe ?? false} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => replyInfo!.originalMessageId && onPressReply?.(replyInfo!.originalMessageId)}
                      >
                        <ReplyMessageBubble reply={replyInfo} isSentByMe={isSentByMe ?? false} />
                      </TouchableOpacity>
                    )
                  ) : (
                    !!visibleMessageText && (
                      hasMessageMedia ? (
                        <View
                          className={`mt-1 rounded-2xl px-3 py-2 ${
                            isSentByMe
                              ? 'rounded-br-md bg-blue-600'
                              : 'rounded-bl-md border border-gray-200 bg-white'
                          }`}
                          style={styles.mediaCaptionBubble}
                        >
                          <LinkifiedText
                            text={visibleMessageText}
                            className={messageTextClassName}
                            linkColor={messageLinkColor}
                          />
                        </View>
                      ) : (
                        <LinkifiedText
                          text={visibleMessageText}
                          className={messageTextClassName}
                          linkColor={messageLinkColor}
                        />
                      )
                    )
                  )}
                </>
              )}
              {!message.callEvent && (
                <Text
                  className={`mt-1 text-right text-[10px] ${
                    message.deliveryState === 'failed'
                      ? isMediaOnly
                        ? 'text-red-600'
                        : 'text-red-100'
                      : isMediaOnly
                      ? 'text-gray-500'
                      : usesLightReplyBubble || hasMessageMedia
                      ? 'text-gray-500'
                      : isSentByMe
                      ? 'text-blue-100'
                      : 'text-gray-500'
                  }`}
                >
                  {message.deliveryState === 'sending'
                    ? 'Đang gửi...'
                    : message.deliveryState === 'failed'
                    ? 'Gửi thất bại'
                    : formatMessageTime(message.time)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {!isSentByMe && message.mediaType === 'audio' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onQuickRecord}
            className="h-8 w-8 rounded-full justify-center items-center bg-slate-100 border border-slate-200 ml-2 mb-1"
          >
            <Mic size={15} color="#475569" />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const MemoizedMessageBubble = React.memo(
  MessageBubble,
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.message === nextProps.message.message &&
      prevProps.message.media === nextProps.message.media &&
      prevProps.message.mediaType === nextProps.message.mediaType &&
      prevProps.message.thumbnail === nextProps.message.thumbnail &&
      prevProps.message.deliveryState === nextProps.message.deliveryState &&
      prevProps.message.seen === nextProps.message.seen &&
      prevProps.avatar === nextProps.avatar &&
      prevProps.partnerName === nextProps.partnerName &&
      prevProps.showAvatar === nextProps.showAvatar
    );
  }
);

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function SwipeToCloseContainer({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx);
      },
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx);
      },
      onPanResponderMove: (_, gestureState) => {
        translateY.setValue(gestureState.dy);
        const dragPercent = Math.abs(gestureState.dy) / (SCREEN_HEIGHT / 2);
        opacity.setValue(Math.max(1 - dragPercent, 0.4));
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dy, vy } = gestureState;
        if (Math.abs(dy) > 120 || Math.abs(vy) > 0.8) {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: dy > 0 ? SCREEN_HEIGHT : -SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onClose();
          });
        } else {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 40,
              friction: 6,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const animatedStyle = {
    transform: [{ translateY }],
  };

  return (
    <Animated.View
      style={[{ flex: 1, backgroundColor: 'black' }, { opacity }]}
    >
      <Animated.View
        style={[{ flex: 1 }, animatedStyle]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

function SwipeToCloseImageViewer({
  uri,
  onClose,
}: {
  uri: string;
  onClose: () => void;
}) {
  return (
    <SwipeToCloseContainer onClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </View>
    </SwipeToCloseContainer>
  );
}

function ChatVideoViewer({
  uri,
  onClose,
}: {
  uri: string;
  onClose: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);
  const videoRef = useRef<any>(null);
  const progressWidthRef = useRef(1);

  const triggerControlsTimeout = useCallback((forceAutoHide = false) => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (paused && !forceAutoHide) return;
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, [paused]);

  useEffect(() => {
    triggerControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [triggerControlsTimeout]);

  const handleScreenTap = () => {
    const nextVisible = !showControls;
    setShowControls(nextVisible);
    if (!nextVisible) return;
    triggerControlsTimeout();
  };

  const handlePlayPause = () => {
    setPaused(p => {
      const nextPaused = !p;
      setShowControls(true);
      if (!nextPaused) {
        setTimeout(() => triggerControlsTimeout(true), 0);
      }
      return nextPaused;
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const seekTo = useCallback((nextTime: number) => {
    if (!duration) return;
    const boundedTime = Math.max(0, Math.min(duration, nextTime));
    setCurrentTime(boundedTime);
    videoRef.current?.seek?.(boundedTime);
    setShowControls(true);
    triggerControlsTimeout();
  }, [duration, triggerControlsTimeout]);

  const handleSeekBy = useCallback((deltaSeconds: number) => {
    seekTo(currentTime + deltaSeconds);
  }, [currentTime, seekTo]);

  const seekFromLocationX = useCallback((locationX: number) => {
    const width = Math.max(progressWidthRef.current, 1);
    const ratio = Math.max(0, Math.min(1, locationX / width));
    seekTo(duration * ratio);
  }, [duration, seekTo]);

  const progressPanResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: event => {
        seekFromLocationX(event.nativeEvent.locationX);
      },
      onPanResponderMove: event => {
        seekFromLocationX(event.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
        triggerControlsTimeout();
      },
    }),
    [seekFromLocationX, triggerControlsTimeout],
  );

  return (
    <SwipeToCloseContainer onClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={handleScreenTap}>
        <View className="flex-1 items-center justify-center bg-black">
          <VideoPlayer
            ref={videoRef}
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
            paused={paused}
            muted={muted}
            onProgress={(data) => {
              setCurrentTime(data.currentTime);
            }}
            onLoad={(data) => {
              setDuration(data.duration);
            }}
            controls={false}
          />

          {showControls && (
            <View
              className="absolute inset-0 bg-black/20 items-center justify-center"
              pointerEvents="box-none"
            >
              <View className="flex-row items-center justify-center" pointerEvents="auto">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSeekBy(-10)}
                  className="h-12 w-12 items-center justify-center rounded-full bg-black/60 border border-white/10"
                >
                  <Rewind size={21} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handlePlayPause}
                  className="ml-5 h-16 w-16 items-center justify-center rounded-full bg-black/70 shadow-lg border border-white/10"
                >
                  {paused ? (
                    <Play size={28} color="#ffffff" fill="#ffffff" />
                  ) : (
                    <Pause size={28} color="#ffffff" fill="#ffffff" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSeekBy(10)}
                  className="ml-5 h-12 w-12 items-center justify-center rounded-full bg-black/60 border border-white/10"
                >
                  <FastForward size={21} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Bottom Custom Controls Bar */}
              <View
                className="absolute bottom-8 left-4 right-4 bg-black/60 px-4 py-3 rounded-2xl border border-white/10"
                pointerEvents="auto"
              >
                <View className="flex-row items-center">
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePlayPause}
                    className="h-9 w-9 items-center justify-center rounded-full bg-white/10"
                  >
                    {paused ? (
                      <Play size={15} color="#ffffff" fill="#ffffff" />
                    ) : (
                      <Pause size={15} color="#ffffff" fill="#ffffff" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSeekBy(-10)}
                    className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-white/10"
                  >
                    <Rewind size={15} color="#ffffff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSeekBy(10)}
                    className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-white/10"
                  >
                    <FastForward size={15} color="#ffffff" />
                  </TouchableOpacity>

                  <Text className="ml-3 text-[11px] font-semibold text-white/90">
                    {formatTime(currentTime)}
                  </Text>
                </View>

                <View
                  className="my-3 h-6 justify-center"
                  onLayout={event => {
                    progressWidthRef.current = event.nativeEvent.layout.width;
                  }}
                  {...progressPanResponder.panHandlers}
                >
                  <View className="h-1.5 overflow-hidden rounded-full bg-white/20">
                    <View
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                      }}
                    />
                  </View>
                  <View
                    className="absolute h-4 w-4 rounded-full border border-white bg-blue-500"
                    style={{
                      left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                      marginLeft: -8,
                    }}
                  />
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] font-semibold text-white/70">
                    {formatTime(duration)}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setMuted(m => !m);
                      setShowControls(true);
                      triggerControlsTimeout();
                    }}
                    className="h-9 w-9 items-center justify-center rounded-full bg-white/10"
                  >
                    {muted ? (
                      <VolumeX size={16} color="#ffffff" />
                    ) : (
                      <Volume2 size={16} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Pressable>
    </SwipeToCloseContainer>
  );
}

function ChatImage({ uri }: { uri: string }) {
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!uri) return;
    Image.getSize(
      uri,
      (w, h) => {
        const maxWidth = 240;
        const maxHeight = 280;
        const minWidth = 120;
        const minHeight = 120;
        const aspect = w / h;

        let finalWidth = w;
        let finalHeight = h;

        if (w > h) {
          if (w > maxWidth) {
            finalWidth = maxWidth;
            finalHeight = maxWidth / aspect;
          }
          if (finalHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = maxHeight * aspect;
          }
        } else {
          if (h > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = maxHeight * aspect;
          }
          if (finalWidth > maxWidth) {
            finalWidth = maxWidth;
            finalHeight = maxWidth / aspect;
          }
        }

        if (finalWidth < minWidth) {
          finalWidth = minWidth;
          finalHeight = minWidth / aspect;
        }
        if (finalHeight < minHeight) {
          finalHeight = minHeight;
          finalWidth = minHeight * aspect;
        }

        setDims({
          width: Math.round(finalWidth),
          height: Math.round(finalHeight),
        });
      },
      () => {
        setDims({ width: 240, height: 180 });
      }
    );
  }, [uri]);

  if (!dims) {
    return (
      <View
        className="rounded-2xl bg-gray-200"
        style={{ width: 240, height: 180 }}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: dims.width, height: dims.height }}
      className="rounded-2xl bg-gray-200"
      resizeMode="cover"
    />
  );
}

function getMediaFileName(uri: string) {
  const cleanUri = uri.split('?')[0] ?? uri;
  const fileName = cleanUri.split('/').pop() || 'video.mp4';
  return fileName.length > 30 ? `${fileName.slice(0, 18)}...${fileName.slice(-8)}` : fileName;
}

function ChatVideoPreview({
  uri,
  thumbnail,
  compact = false,
}: {
  uri: string;
  thumbnail?: string;
  compact?: boolean;
}) {
  return (
    <View
      style={compact ? styles.videoPreviewFill : styles.videoPreviewLarge}
      className="overflow-hidden bg-slate-950 justify-center items-center relative"
    >
      {thumbnail ? (
        <Image
          source={{ uri: thumbnail }}
          style={styles.videoPreviewBackdrop}
          resizeMode="cover"
          fadeDuration={120}
        />
      ) : (
        <View style={styles.videoPreviewBackdrop}>
          <Video size={compact ? 32 : 48} color="rgba(255,255,255,0.16)" />
        </View>
      )}
      <View style={styles.videoPreviewScrim} />
      <View className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5">
        <Text className="text-[10px] font-bold text-white">HD</Text>
      </View>
      <View
        className={`items-center justify-center rounded-full bg-white/90 shadow-md ${
          compact ? 'h-11 w-11' : 'h-16 w-16'
        }`}
      >
        <Play
          size={compact ? 20 : 30}
          color="#111827"
          fill="#111827"
          style={{ marginLeft: 3 }}
        />
      </View>
      {!compact ? (
        <View className="absolute bottom-0 left-0 right-0 bg-black/45 px-3 py-2">
          <Text className="text-sm font-bold text-white" numberOfLines={1}>
            {getMediaFileName(uri)}
          </Text>
          <Text className="mt-0.5 text-[11px] font-semibold text-white/75">
            Video
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function RecordingWaveformBar({
  durationMs,
  onCancel,
}: {
  durationMs: number;
  onCancel: () => void;
}) {
  return (
    <View className="mr-2 min-h-10 flex-1 flex-row items-center rounded-3xl bg-red-50 px-3 py-2">
      <View className="mr-2 h-3 w-3 rounded-full bg-red-500" />
      <View className="mr-3 flex-1">
        <AudioWaveform
          animated
          color="#DC2626"
          inactiveColor="#FECACA"
          height={24}
          barCount={26}
        />
      </View>
      <Text className="mr-2 text-xs font-bold text-red-600">
        {formatAudioDuration(durationMs)}
      </Text>
      <TouchableOpacity
        className="h-8 w-8 items-center justify-center rounded-full bg-white"
        activeOpacity={0.8}
        onPress={onCancel}
      >
        <X size={17} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );
}

function MessageMedia({
  message,
  onOpenMedia,
}: {
  message: MessageItem;
  onOpenMedia: OpenChatMedia;
}) {
  if (!message.media) return null;

  if (message.mediaType === 'image') {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onOpenMedia({ uri: message.media!, type: 'image' })}
      >
        <ChatImage uri={message.media} />
      </TouchableOpacity>
    );
  }

  if (message.mediaType === 'video') {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onOpenMedia({ uri: message.media!, type: 'video' })}
      >
        <ChatVideoPreview uri={message.media} thumbnail={message.thumbnail} />
      </TouchableOpacity>
    );
  }

  if (message.mediaType === 'audio') {
    return (
      <View className="w-64">
        <AudioPlayer
          uri={message.media}
          compact
          accentColor="#0084FF"
        />
      </View>
    );
  }

  return null;
}

function MediaMessageGroup({
  messages,
  avatar,
  onOpenMedia,
  onReply,
}: {
  messages: MessageItem[];
  avatar: string;
  onOpenMedia: OpenChatMedia;
  onReply?: (message: MessageItem) => void;
}) {
  const orderedMessages = [...messages].reverse();
  const visibleMessages = orderedMessages.slice(0, 6);
  const hiddenCount = Math.max(
    0,
    orderedMessages.length - visibleMessages.length,
  );
  const newestMessage = messages[0];
  const viewerItems: ChatMediaViewerItem[] = orderedMessages.map(message => ({
    uri: message.media!,
    type: message.mediaType === 'video' ? ('video' as const) : ('image' as const),
  }));
  const captions = orderedMessages
    .map(message => message.message.trim())
    .filter(Boolean);
  const deliveryState = messages.find(
    message => message.deliveryState,
  )?.deliveryState;

  return (
    <View
      className={`mb-2 flex-row px-3 ${
        newestMessage.isSentByMe ? 'justify-end' : 'justify-start'
      } ${deliveryState === 'sending' ? 'opacity-70' : ''}`}
    >
      {!newestMessage.isSentByMe && (
        <Image
          source={{ uri: avatar }}
          className="mr-2 mt-1 h-7 w-7 rounded-full bg-gray-200"
        />
      )}
      <View style={styles.imageGalleryBody}>
        <View style={styles.imageGallery}>
          {visibleMessages.map((message, index) => (
            <TouchableOpacity
              key={message.id}
              activeOpacity={0.9}
              delayLongPress={320}
              onLongPress={() => onReply?.(message)}
              onPress={() => {
                onOpenMedia(
                  {
                    uri: message.media!,
                    type: message.mediaType === 'video' ? 'video' : 'image',
                  },
                  viewerItems,
                );
              }}
              style={styles.imageGalleryTile}
            >
              {message.mediaType === 'video' ? (
                <ChatVideoPreview
                  uri={message.media!}
                  thumbnail={message.thumbnail}
                  compact
                />
              ) : (
                <Image
                  source={{ uri: message.media }}
                  style={styles.imageGalleryImage}
                  resizeMode="cover"
                  fadeDuration={120}
                />
              )}
              {hiddenCount > 0 && index === visibleMessages.length - 1 ? (
                <View style={styles.imageGalleryMore}>
                  <Text className="text-2xl font-bold text-white">
                    +{hiddenCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
        {captions.length > 0 ? (
          <View
            className={`mt-1 rounded-2xl px-3 py-2 ${
              newestMessage.isSentByMe
                ? 'rounded-br-md bg-blue-600'
                : 'rounded-bl-md border border-gray-200 bg-white'
            }`}
          >
            <LinkifiedText
              text={captions.join('\n')}
              className={`text-[15px] leading-5 ${
                newestMessage.isSentByMe ? 'text-white' : 'text-gray-900'
              }`}
              linkColor={newestMessage.isSentByMe ? '#ffffff' : '#2563EB'}
            />
          </View>
        ) : null}
        <Text className="mt-1 text-right text-[10px] text-gray-500">
          {deliveryState === 'sending'
            ? 'Đang gửi...'
            : deliveryState === 'failed'
            ? 'Gửi thất bại'
            : formatMessageTime(newestMessage.time)}
        </Text>
      </View>
    </View>
  );
}

const MemoizedMediaMessageGroup = React.memo(MediaMessageGroup);

type GroupInfoSection = 'members' | 'media' | 'files' | 'links';
type GroupInfoDialog = 'add' | 'edit' | 'delete' | null;

function SectionHeader({
  title,
  isOpen,
  onPress,
}: {
  title: string;
  isOpen: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between border-t border-gray-100 px-5 py-4"
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text className="text-base font-bold text-gray-950">{title}</Text>
      <ChevronDown
        size={20}
        color="#111827"
        style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
      />
    </TouchableOpacity>
  );
}

function GroupMemberRow({
  member,
  canRemove,
  onRemove,
}: {
  member: GroupChatMember;
  canRemove: boolean;
  onRemove: (member: GroupChatMember) => void;
}) {
  return (
    <View className="flex-row items-center px-5 py-2">
      <Image
        source={{ uri: member.avatar }}
        className="h-10 w-10 rounded-full bg-gray-200"
      />
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-gray-900">
          {member.name}
        </Text>
        <Text className="text-xs text-gray-500">
          {member.isOwner
            ? 'Chủ nhóm'
            : member.isAdmin
            ? 'Admin'
            : `@${member.username}`}
        </Text>
      </View>
      {canRemove ? (
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full bg-red-50"
          activeOpacity={0.8}
          onPress={() => onRemove(member)}
        >
          <UserMinus size={18} color="#dc2626" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function AddableUserRow({
  user,
  selected,
  onToggle,
}: {
  user: GroupAddableUser;
  selected: boolean;
  onToggle: (user: GroupAddableUser) => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center px-5 py-2"
      activeOpacity={0.8}
      onPress={() => onToggle(user)}
    >
      <Image
        source={{ uri: user.avatar }}
        className="h-10 w-10 rounded-full bg-gray-200"
      />
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-gray-900">{user.name}</Text>
        <Text className="text-xs text-gray-500">@{user.username}</Text>
      </View>
      <View
        className={`h-7 w-7 items-center justify-center rounded-full ${
          selected ? 'bg-blue-600' : 'border border-gray-300 bg-white'
        }`}
      >
        {selected ? <Check size={16} color="#ffffff" /> : null}
      </View>
    </TouchableOpacity>
  );
}

function GroupInfoModal({
  visible,
  groupInfo,
  assets,
  addableUsers,
  selectedAddableIds,
  addableQuery,
  editName,
  editAvatar,
  activeDialog,
  isLoading,
  isLoadingAddableUsers,
  expandedSections,
  onClose,
  onOpenAddMembers,
  onOpenEditGroup,
  onOpenDeleteGroup,
  onCloseActionDialog,
  onToggleSection,
  onChangeAddableQuery,
  onSearchAddableUsers,
  onToggleAddableUser,
  onSubmitAddUsers,
  onChangeEditName,
  onPickAvatar,
  onSaveGroup,
  onDeleteGroup,
  onClearHistory,
  onLeaveGroup,
  onRemoveMember,
  copy,
}: {
  visible: boolean;
  groupInfo: GroupChatInfo | null;
  assets: GroupSharedAssets | null;
  addableUsers: GroupAddableUser[];
  selectedAddableIds: Set<string>;
  addableQuery: string;
  editName: string;
  editAvatar?: MessageAttachment;
  activeDialog: GroupInfoDialog;
  isLoading: boolean;
  isLoadingAddableUsers: boolean;
  expandedSections: Set<GroupInfoSection>;
  onClose: () => void;
  onOpenAddMembers: () => void;
  onOpenEditGroup: () => void;
  onOpenDeleteGroup: () => void;
  onCloseActionDialog: () => void;
  onToggleSection: (section: GroupInfoSection) => void;
  onChangeAddableQuery: (value: string) => void;
  onSearchAddableUsers: () => void;
  onToggleAddableUser: (user: GroupAddableUser) => void;
  onSubmitAddUsers: () => void;
  onChangeEditName: (value: string) => void;
  onPickAvatar: () => void;
  onSaveGroup: () => void;
  onDeleteGroup: () => void;
  onClearHistory: () => void;
  onLeaveGroup: () => void;
  onRemoveMember: (member: GroupChatMember) => void;
  copy: typeof CHAT_COPY.vi;
}) {
  const isMembersOpen = expandedSections.has('members');
  const isMediaOpen = expandedSections.has('media');
  const isFilesOpen = expandedSections.has('files');
  const isLinksOpen = expandedSections.has('links');

  return (
    <>
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white" edges={ROOT_SAFE_AREA_EDGES}>
        <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-4">
          <Text className="text-lg font-bold text-gray-950">Thông tin</Text>
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
            activeOpacity={0.8}
            onPress={onClose}
          >
            <X size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        {isLoading && !groupInfo ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="items-center px-5 py-6">
              <Image
                source={{ uri: groupInfo?.avatar }}
                className="h-24 w-24 rounded-full bg-red-100"
              />
              <View className="mt-4 flex-row items-center px-4">
                <Text className="text-2xl font-bold text-gray-950">
                  {groupInfo?.name ?? 'Nhóm'}
                </Text>
              </View>
              <Text className="mt-1 text-sm text-gray-500">
                {groupInfo?.memberCount ?? 0} thành viên
              </Text>

              {groupInfo?.isOwner ? (
                <View className="mt-5 w-full flex-row justify-center">
                  <TouchableOpacity
                    className="mx-1 flex-1 items-center rounded-2xl bg-blue-50 px-2 py-3"
                    activeOpacity={0.85}
                    onPress={onOpenAddMembers}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-blue-600">
                      <UserPlus size={20} color="#ffffff" />
                    </View>
                    <Text
                      className="mt-2 text-center text-xs font-semibold text-gray-900"
                      numberOfLines={2}
                    >
                      {copy.addMembers}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="mx-1 flex-1 items-center rounded-2xl bg-gray-100 px-2 py-3"
                    activeOpacity={0.85}
                    onPress={onOpenEditGroup}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
                      <Pencil size={20} color="#111827" />
                    </View>
                    <Text
                      className="mt-2 text-center text-xs font-semibold text-gray-900"
                      numberOfLines={2}
                    >
                      Thay doi thong tin
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="mx-1 flex-1 items-center rounded-2xl bg-red-50 px-2 py-3"
                    activeOpacity={0.85}
                    onPress={onOpenDeleteGroup}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-red-600">
                      <Trash2 size={20} color="#ffffff" />
                    </View>
                    <Text
                      className="mt-2 text-center text-xs font-semibold text-red-700"
                      numberOfLines={2}
                    >
                      Xoa nhom
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {false && groupInfo?.isOwner ? (
                <View className="mt-4 w-full">
                  <TextInput
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-base text-gray-900"
                    placeholder="Tên nhóm"
                    placeholderTextColor="#94a3b8"
                    value={editName}
                    onChangeText={onChangeEditName}
                  />
                  <TouchableOpacity
                    className="mt-3 rounded-2xl bg-blue-600 py-3"
                    activeOpacity={0.85}
                    onPress={onSaveGroup}
                  >
                    <Text className="text-center text-base font-bold text-white">
                      Lưu thay đổi
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {false && groupInfo?.isOwner ? (
              <View className="border-t border-gray-100 px-5 py-4">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                    <UserPlus size={20} color="#0000ff" />
                  </View>
                  <Text className="ml-3 text-base font-semibold text-gray-900">
                    {copy.addMembers}
                  </Text>
                </View>
                <View className="mt-3 flex-row">
                  <TextInput
                    className="mr-2 flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-900"
                    placeholder="Tìm thành viên"
                    placeholderTextColor="#94a3b8"
                    value={addableQuery}
                    onChangeText={onChangeAddableQuery}
                    onSubmitEditing={onSearchAddableUsers}
                  />
                  <TouchableOpacity
                    className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-600"
                    activeOpacity={0.85}
                    onPress={onSearchAddableUsers}
                  >
                    {isLoadingAddableUsers ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <UserPlus size={19} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                </View>
                {addableUsers.map(user => (
                  <AddableUserRow
                    key={user.id}
                    user={user}
                    selected={selectedAddableIds.has(user.id)}
                    onToggle={onToggleAddableUser}
                  />
                ))}
                {!isLoadingAddableUsers && addableUsers.length === 0 ? (
                  <Text className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    Chua co goi y. Nguoi dung da follow qua lai va chua o trong
                    nhom se hien o day.
                  </Text>
                ) : null}
                {selectedAddableIds.size > 0 ? (
                  <TouchableOpacity
                    className="mt-2 rounded-2xl bg-blue-600 py-3"
                    activeOpacity={0.85}
                    onPress={onSubmitAddUsers}
                  >
                    <Text className="text-center text-sm font-bold text-white">
                      Thêm {selectedAddableIds.size} người
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <SectionHeader
              title={copy.groupMembers}
              isOpen={isMembersOpen}
              onPress={() => onToggleSection('members')}
            />
            {isMembersOpen ? (
              <View className="pb-3">
                {(groupInfo?.members ?? []).map(member => (
                  <GroupMemberRow
                    key={member.id}
                    member={member}
                    canRemove={
                      Boolean(groupInfo?.isOwner) &&
                      !member.isOwner &&
                      member.id !== groupInfo?.ownerId
                    }
                    onRemove={onRemoveMember}
                  />
                ))}
              </View>
            ) : null}

            <SectionHeader
              title={copy.sharedMedia}
              isOpen={isMediaOpen}
              onPress={() => onToggleSection('media')}
            />
            {isMediaOpen ? (
              <View className="flex-row flex-wrap px-5 pb-4">
                {(assets?.media ?? []).length === 0 ? (
                  <Text className="py-3 text-sm text-gray-500">
                    {copy.emptySharedMedia}
                  </Text>
                ) : (
                  assets!.media.map(item => (
                    <Image
                      key={item.id}
                      source={{ uri: item.uri }}
                      className="mr-2 mt-2 h-20 w-20 rounded-xl bg-gray-100"
                    />
                  ))
                )}
              </View>
            ) : null}

            <SectionHeader
              title="File"
              isOpen={isFilesOpen}
              onPress={() => onToggleSection('files')}
            />
            {isFilesOpen ? (
              <View className="px-5 pb-4">
                {(assets?.files ?? []).length === 0 ? (
                  <Text className="py-3 text-sm text-gray-500">
                    Chưa có File được chia sẻ trong hội thoại này
                  </Text>
                ) : (
                  assets!.files.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      className="flex-row items-center py-2"
                      activeOpacity={0.8}
                      onPress={() =>
                        Linking.openURL(item.uri).catch(() => undefined)
                      }
                    >
                      <FileText size={18} color="#0000ff" />
                      <Text className="ml-2 flex-1 text-sm font-semibold text-gray-900">
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : null}

            <SectionHeader
              title="Link"
              isOpen={isLinksOpen}
              onPress={() => onToggleSection('links')}
            />
            {isLinksOpen ? (
              <View className="px-5 pb-4">
                {(assets?.links ?? []).length === 0 ? (
                  <Text className="py-3 text-sm text-gray-500">
                    Chưa có Link được chia sẻ trong hội thoại này
                  </Text>
                ) : (
                  assets!.links.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      className="flex-row items-center py-2"
                      activeOpacity={0.8}
                      onPress={() =>
                        Linking.openURL(item.url).catch(() => undefined)
                      }
                    >
                      <LinkIcon size={18} color="#0000ff" />
                      <Text className="ml-2 flex-1 text-sm font-semibold text-blue-700">
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : null}

            <View className="mt-2 border-t border-gray-100 px-5 py-4">
              <TouchableOpacity
                className="flex-row items-center py-3"
                activeOpacity={0.8}
                onPress={onClearHistory}
              >
                <Trash2 size={19} color="#111827" />
                <Text className="ml-3 text-base text-gray-950">
                  Xóa lịch sử trò chuyện
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center py-3"
                activeOpacity={0.8}
                onPress={onLeaveGroup}
              >
                <LogOut size={19} color="#dc2626" />
                <Text className="ml-3 text-base text-red-600">
                  {copy.leaveGroup}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
    <Modal
      visible={visible && activeDialog === 'add'}
      animationType="fade"
      transparent
      onRequestClose={onCloseActionDialog}
    >
      <View className="flex-1 justify-end bg-black/45">
        <View className="max-h-[82%] rounded-t-3xl bg-white px-5 pb-6 pt-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-950">
              {copy.addMembers}
            </Text>
            <TouchableOpacity
              className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
              activeOpacity={0.8}
              onPress={onCloseActionDialog}
            >
              <X size={20} color="#111827" />
            </TouchableOpacity>
          </View>
          <View className="mt-4 flex-row">
            <TextInput
              className="mr-2 flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-900"
              placeholder="Tim thanh vien"
              placeholderTextColor="#94a3b8"
              value={addableQuery}
              onChangeText={onChangeAddableQuery}
              onSubmitEditing={onSearchAddableUsers}
            />
            <TouchableOpacity
              className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-600"
              activeOpacity={0.85}
              onPress={onSearchAddableUsers}
            >
              {isLoadingAddableUsers ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <UserPlus size={19} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
          <ScrollView className="mt-2" showsVerticalScrollIndicator={false}>
            {addableUsers.map(user => (
              <AddableUserRow
                key={user.id}
                user={user}
                selected={selectedAddableIds.has(user.id)}
                onToggle={onToggleAddableUser}
              />
            ))}
            {!isLoadingAddableUsers && addableUsers.length === 0 ? (
              <Text className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
                Chua co goi y. Hay thu tim theo ten hoac username.
              </Text>
            ) : null}
          </ScrollView>
          <TouchableOpacity
            className={`mt-4 rounded-2xl py-3 ${
              selectedAddableIds.size > 0 ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            activeOpacity={0.85}
            disabled={selectedAddableIds.size === 0}
            onPress={onSubmitAddUsers}
          >
            <Text
              className={`text-center text-sm font-bold ${
                selectedAddableIds.size > 0 ? 'text-white' : 'text-gray-500'
              }`}
            >
              Them {selectedAddableIds.size} nguoi
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    <Modal
      visible={visible && activeDialog === 'edit'}
      animationType="fade"
      transparent
      onRequestClose={onCloseActionDialog}
    >
      <View className="flex-1 justify-end bg-black/45">
        <View className="rounded-t-3xl bg-white px-5 pb-6 pt-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-950">
              Thay doi thong tin
            </Text>
            <TouchableOpacity
              className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
              activeOpacity={0.8}
              onPress={onCloseActionDialog}
            >
              <X size={20} color="#111827" />
            </TouchableOpacity>
          </View>
          <View className="mt-5 items-center">
            <Image
              source={{ uri: editAvatar?.uri || groupInfo?.avatar }}
              className="h-24 w-24 rounded-full bg-red-100"
            />
            <TouchableOpacity
              className="mt-3 flex-row items-center rounded-full bg-gray-100 px-4 py-2"
              activeOpacity={0.85}
              onPress={onPickAvatar}
            >
              <ImagePlus size={16} color="#111827" />
              <Text className="ml-2 text-sm font-semibold text-gray-900">
                Doi anh
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            className="mt-5 rounded-2xl border border-gray-200 px-4 py-3 text-base text-gray-900"
            placeholder="Ten nhom"
            placeholderTextColor="#94a3b8"
            value={editName}
            onChangeText={onChangeEditName}
          />
          <TouchableOpacity
            className="mt-4 rounded-2xl bg-blue-600 py-3"
            activeOpacity={0.85}
            onPress={onSaveGroup}
          >
            <Text className="text-center text-base font-bold text-white">
              Luu thay doi
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    <Modal
      visible={visible && activeDialog === 'delete'}
      animationType="fade"
      transparent
      onRequestClose={onCloseActionDialog}
    >
      <View className="flex-1 justify-end bg-black/45">
        <View className="rounded-t-3xl bg-white px-5 pb-6 pt-5">
          <View className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <Trash2 size={25} color="#dc2626" />
            </View>
            <Text className="mt-3 text-lg font-bold text-gray-950">
              Xoa nhom
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-gray-500">
              Hanh dong nay se xoa nhom hien tai. Ban muon tiep tuc?
            </Text>
          </View>
          <View className="mt-5 flex-row">
            <TouchableOpacity
              className="mr-2 flex-1 rounded-2xl bg-gray-100 py-3"
              activeOpacity={0.85}
              onPress={onCloseActionDialog}
            >
              <Text className="text-center text-sm font-bold text-gray-900">
                {copy.cancel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="ml-2 flex-1 rounded-2xl bg-red-600 py-3"
              activeOpacity={0.85}
              onPress={onDeleteGroup}
            >
              <Text className="text-center text-sm font-bold text-white">
                {copy.delete}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { chat } = route.params;
  const language = useAppLanguage();
  const copy = CHAT_COPY[language];
  const insets = useSafeAreaInsets();
  const {
    messages,
    groupInfo,
    groupSharedAssets,
    addableUsers,
    isLoading,
    isLoadingGroupInfo,
    isLoadingAddableUsers,
    isLoadingMore,
    isRefreshing,
    hasMore,
    isTyping,
    isRecording,
    error,
    loadInitial,
    loadOlder,
    refreshLatest,
    sendMessage,
    notifyTyping,
    stopTyping,
    loadGroupInfo,
    searchAddableUsers,
    addGroupUsers,
    removeGroupUser,
    clearGroupHistory,
    leaveGroup,
    deleteGroup,
    editGroup,
  } = useChatViewModel(chat);

  const [text, setText] = useState('');
  const [replyingMessage, setReplyingMessage] = useState<MessageItem | undefined>(undefined);
  const [selectedOptionMessage, setSelectedOptionMessage] = useState<MessageItem | undefined>(undefined);
  const [attachedProduct, setAttachedProduct] = useState<ProductItem | undefined>(route.params?.product);

  useEffect(() => {
    if (route.params?.product) {
      setAttachedProduct(route.params.product);
    }
  }, [route.params?.product]);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isGroupInfoVisible, setIsGroupInfoVisible] = useState(false);
  const [groupInfoDialog, setGroupInfoDialog] =
    useState<GroupInfoDialog>(null);
  const [expandedGroupInfoSections, setExpandedGroupInfoSections] = useState<
    Set<GroupInfoSection>
  >(new Set(['members', 'media', 'files', 'links']));
  const [addableQuery, setAddableQuery] = useState('');
  const [selectedAddableIds, setSelectedAddableIds] = useState<Set<string>>(
    new Set(),
  );
  const [editGroupName, setEditGroupName] = useState(chat.name);
  const [editGroupAvatar, setEditGroupAvatar] = useState<
    MessageAttachment | undefined
  >(undefined);
  const [viewerMediaItems, setViewerMediaItems] = useState<
    ChatMediaViewerItem[]
  >([]);
  const [viewerMediaIndex, setViewerMediaIndex] = useState(0);
  const [isViewerMuted, setIsViewerMuted] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const chatInputBarStyle = useMemo(
    () => ({
      paddingBottom:
        Platform.OS === 'ios' && !isKeyboardVisible
          ? Math.max(insets.bottom + 6, 12)
          : 8,
    }),
    [insets.bottom, isKeyboardVisible],
  );

  const recorder = useAudioRecorder();
  const flatListRef = useRef<FlatList<ChatMessageListItem>>(null);
  const mediaListRef = useRef<FlatList>(null);
  const previousLatestMessageIdRef = useRef<string | undefined>(undefined);
  const didScrollInitialRef = useRef(false);
  const pendingInitialScrollRef = useRef(false);
  const scrollMetricsRef = useRef({
    offsetY: 0,
    contentHeight: 0,
    viewportHeight: 0,
  });
  const pendingOlderAnchorRef = useRef<{
    offsetY: number;
    contentHeight: number;
  } | null>(null);
  const loadingOlderRef = useRef(false);
  const sendAnim = useRef(new Animated.Value(1)).current;
  const canSend =
    Boolean(text.trim()) || attachments.length > 0 || recorder.isRecording || Boolean(attachedProduct);
  const audioAttachment = useMemo(
    () => attachments.find(attachment => attachment.mediaType === 'audio'),
    [attachments],
  );
  const visualAttachments = useMemo(
    () => attachments.filter(attachment => attachment.mediaType !== 'audio'),
    [attachments],
  );
  const messageItems = useMemo(
    () => buildMessageListItems(messages).reverse(),
    [messages],
  );
  const messageItemsRef = useRef(messageItems);
  useEffect(() => {
    messageItemsRef.current = messageItems;
  }, [messageItems]);

  const messageListContentStyle = useMemo(
    () => ({ paddingVertical: 12, paddingBottom: 8 }),
    [],
  );
  const maintainVisibleContentPosition = useMemo(
    () => ({ minIndexForVisible: 0 }),
    [],
  );
  const viewerMedia = viewerMediaItems[viewerMediaIndex];

  useEffect(() => {
    if (viewerMediaItems.length > 0 && viewerMediaIndex >= 0 && viewerMediaIndex < viewerMediaItems.length) {
      const timer = setTimeout(() => {
        mediaListRef.current?.scrollToIndex({
          index: viewerMediaIndex,
          animated: false,
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [viewerMediaIndex, viewerMediaItems.length]);
  const scrollToLatest = useCallback((animated: boolean) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated });
    });
  }, []);

  const handlePressReply = useCallback((originalMessageId: string) => {
    const index = messageItemsRef.current.findIndex(item => item.id === originalMessageId);
    if (index !== -1) {
      try {
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      } catch (e) {
        console.warn('Scroll to index failed:', e);
      }
    }
  }, []);

  const handleQuickRecord = useCallback(() => {
    if (!recorder.isRecording) {
      recorder.startRecording().catch(() => undefined);
    }
  }, [recorder]);

  useEffect(() => {
    didScrollInitialRef.current = false;
    pendingInitialScrollRef.current = false;
    setIsAtBottom(true);
    setShowJumpToLatest(false);
  }, [chat.id]);

  // Keyboard listeners
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', () => {
      setIsKeyboardVisible(true);
      // Only scroll if user was at bottom
      setTimeout(() => scrollToLatest(true), 100);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      setIsKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToLatest]);

  // Auto scroll to bottom when new messages arrive (only if at bottom or keyboard visible)
  useEffect(() => {
    if (messages.length === 0) return;

    if (!didScrollInitialRef.current) {
      return;
    }

    if ((isAtBottom || isKeyboardVisible) && !isLoadingMore) {
      const timer = setTimeout(() => {
        scrollToLatest(true);
        setShowJumpToLatest(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    messages.length,
    isAtBottom,
    isKeyboardVisible,
    isLoadingMore,
    scrollToLatest,
  ]);

  useEffect(() => {
    const latestMessageId = messages[messages.length - 1]?.id;

    if (
      previousLatestMessageIdRef.current &&
      latestMessageId &&
      latestMessageId !== previousLatestMessageIdRef.current &&
      !isAtBottom &&
      !isKeyboardVisible
    ) {
      setShowJumpToLatest(true);
    }

    if (isAtBottom || isKeyboardVisible) {
      setShowJumpToLatest(false);
    }

    previousLatestMessageIdRef.current = latestMessageId;
  }, [isAtBottom, isKeyboardVisible, messages]);

  const handleContentSizeChange = useCallback((_width?: number, height?: number) => {
    if (messages.length === 0) return;
    const nextContentHeight =
      typeof height === 'number' ? height : scrollMetricsRef.current.contentHeight;
    scrollMetricsRef.current.contentHeight = nextContentHeight;
  }, [messages.length]);

  const handleLoadOlder = useCallback(() => {
    if (messageItems.length === 0 || isLoadingMore || loadingOlderRef.current || !hasMore) {
      return;
    }
    loadingOlderRef.current = true;
    loadOlder()
      .catch(() => undefined)
      .finally(() => {
        loadingOlderRef.current = false;
      });
  }, [hasMore, isLoadingMore, loadOlder, messageItems.length]);

  // Track scroll position
  const handleScroll = useCallback(
    (event: any) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      scrollMetricsRef.current = {
        offsetY: contentOffset.y,
        contentHeight: contentSize.height,
        viewportHeight: layoutMeasurement.height,
      };

      const isAtBottomNow = contentOffset.y <= 50;
      if (isAtBottom !== isAtBottomNow) {
        setIsAtBottom(isAtBottomNow);
      }
      setShowJumpToLatest(!isAtBottomNow);
    },
    [isAtBottom],
  );

  const handleOpenMedia = useCallback<OpenChatMedia>(
    (media, mediaItems = [media]) => {
      const items = mediaItems.length > 0 ? mediaItems : [media];
      const index = items.findIndex(item => item.uri === media.uri);
      setViewerMediaItems(items);
      setViewerMediaIndex(Math.max(0, index));
      setIsViewerMuted(false);
    },
    [],
  );

  const handleCloseMedia = useCallback(() => {
    setViewerMediaItems([]);
    setViewerMediaIndex(0);
  }, []);

  const handleChangeText = useCallback(
    (nextText: string) => {
      setText(nextText);
      notifyTyping(nextText);
    },
    [notifyTyping],
  );

  const handleSend = useCallback(async () => {
    const recordedAudio = recorder.isRecording
      ? await recorder.stopRecording()
      : undefined;
    const pendingAttachments = recordedAudio
      ? [{ ...recordedAudio, mediaType: 'audio' as const }]
      : attachments;

    if (!text.trim() && pendingAttachments.length === 0 && !attachedProduct) return;

    // Animate send button
    Animated.sequence([
      Animated.timing(sendAnim, {
        toValue: 0.8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.spring(sendAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    let nextText = text;
    if (attachedProduct) {
      const currencySymbol = attachedProduct.currency_symbol || attachedProduct.currency_code || attachedProduct.currency || 'VNSEEA';
      const formattedPrice = formatPrice(attachedProduct.price, currencySymbol);
      const imageUrl = attachedProduct.images?.[0]?.image || '';
      const productId = attachedProduct.id;

      nextText = `🛍️ *Tôi muốn hỏi về sản phẩm:*\n👉 *${attachedProduct.name}*\n💰 Giá: *${formattedPrice}*${
        attachedProduct.location ? `\n📍 Địa điểm: *${attachedProduct.location}*` : ''
      }${imageUrl ? `\n📷 Ảnh: ${imageUrl}` : ''}${productId ? `\n🆔 ID: *${productId}*` : ''}\n\n💬 Lời nhắn: ${text.trim() || 'Mặt hàng này còn không bạn?'}`;

      setAttachedProduct(undefined);
    } else if (replyingMessage) {
      const originalSnippet = getMessageSnippet(replyingMessage, chat.name);
      const senderName = replyingMessage.isSentByMe ? 'Tôi' : (chat.name || 'Người dùng');

      let originalImageUrl = '';
      let originalMediaUrl = '';
      let originalMediaType = replyingMessage.mediaType;
      if (replyingMessage.media) {
        originalMediaUrl = replyingMessage.media;
        if (replyingMessage.mediaType === 'image') {
          originalImageUrl = replyingMessage.media;
        }
      } else if (replyingMessage.media && replyingMessage.mediaType === 'image') {
        originalImageUrl = replyingMessage.media;
      } else {
        const prod = parseProductInquiry(replyingMessage.message);
        if (prod && prod.image) {
          originalImageUrl = prod.image;
          originalMediaUrl = prod.image;
          originalMediaType = 'image';
        }
      }

      const imgSegment = originalImageUrl ? `\n🖼️ Ảnh: *${originalImageUrl}*` : '';
      const mediaMetaSegment =
        originalMediaUrl && originalMediaType
          ? `\nMETA_MEDIA: *${originalMediaUrl}*\nMETA_MEDIA_TYPE: *${originalMediaType}*`
          : '';
      nextText = `↪️ *Trả lời tin nhắn:*\n👉 *${senderName}*: ${originalSnippet}\n🆔 ID: *${replyingMessage.id}*${imgSegment}${mediaMetaSegment}\n\n${nextText}`;
      setReplyingMessage(undefined);
    }

    const nextAttachments = pendingAttachments;
    setText('');
    stopTyping();
    setAttachments([]);

    if (nextAttachments.length === 0) {
      await sendMessage(nextText);
    } else {
      for (const [index, attachment] of nextAttachments.entries()) {
        await sendMessage(index === 0 ? nextText : '', attachment);
      }
    }
  }, [
    attachments,
    recorder,
    sendMessage,
    stopTyping,
    text,
    sendAnim,
    attachedProduct,
    replyingMessage,
    chat.name,
  ]);

  const handleSelectOptionReply = useCallback(() => {
    if (!selectedOptionMessage) return;
    setReplyingMessage(selectedOptionMessage);
    setSelectedOptionMessage(undefined);
  }, [selectedOptionMessage]);

  const handleSelectOptionCopy = useCallback(async () => {
    if (!selectedOptionMessage) return;
    try {
      const { Clipboard } = require('react-native');
      await Clipboard.setString(selectedOptionMessage.message || '');
      if (Platform.OS === 'android') {
        ToastAndroid.show('Đã sao chép tin nhắn', ToastAndroid.SHORT);
      } else {
        Alert.alert('Thông báo', 'Đã sao chép tin nhắn');
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setSelectedOptionMessage(undefined);
    }
  }, [selectedOptionMessage]);

  const handleSendProductInquiryOption = useCallback(
    async (optionText: string) => {
      if (!attachedProduct) return;
      const currencySymbol = attachedProduct.currency_symbol || attachedProduct.currency_code || attachedProduct.currency || 'VNSEEA';
      const formattedPrice = formatPrice(attachedProduct.price, currencySymbol);
      const imageUrl = attachedProduct.images?.[0]?.image || '';
      const productId = attachedProduct.id;

      const nextText = `🛍️ *Tôi muốn hỏi về sản phẩm:*\n👉 *${attachedProduct.name}*\n💰 Giá: *${formattedPrice}*${
        attachedProduct.location ? `\n📍 Địa điểm: *${attachedProduct.location}*` : ''
      }${imageUrl ? `\n📷 Ảnh: ${imageUrl}` : ''}${productId ? `\n🆔 ID: *${productId}*` : ''}\n\n💬 Lời nhắn: ${optionText}`;

      setAttachedProduct(undefined);
      await sendMessage(nextText);
    },
    [attachedProduct, sendMessage],
  );

  const handlePickMedia = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'mixed' as MediaType,
      selectionLimit: MAX_MEDIA_ATTACHMENTS,
      quality: 0.8,
    });

    if (result.didCancel || result.errorCode) return;

    const selected: MessageAttachment[] = [];
    for (const asset of result.assets ?? []) {
      if (!asset.uri) continue;
      const isVideo =
        asset.type?.startsWith('video/') ||
        /\.(mp4|mov|webm|m4v)$/i.test(asset.fileName ?? '');
      const uri =
        Platform.OS === 'android' && !/^[a-z][a-z0-9+.-]*:\/\//i.test(asset.uri)
          ? `file://${asset.uri}`
          : asset.uri;
      selected.push({
        uri,
        name: asset.fileName ?? `chat-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
        type: asset.type ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
        mediaType: isVideo ? 'video' : 'image',
      });
    }

    if (selected.length > 0) {
      setAttachments(current => {
        const filtered = current.filter(a => a.mediaType !== 'audio');
        return [...filtered, ...selected].slice(0, MAX_MEDIA_ATTACHMENTS);
      });
    }
  }, []);

  const handleToggleRecording = useCallback(async () => {
    try {
      if (recorder.isRecording) {
        const audio = await recorder.stopRecording();
        if (audio) setAttachments([{ ...audio, mediaType: 'audio' }]);
        return;
      }
      setAttachments([]);
      await recorder.startRecording();
    } catch {
      Alert.alert(copy.errorTitle, copy.recordFailed);
    }
  }, [copy.errorTitle, copy.recordFailed, recorder]);

  const { startOutgoingCall } = useLiveKitCallSession();
  const { startGroupCall } = useGroupLiveKitCallSession();

  const groupId = useMemo(() => {
    if (chat.chatType !== 'group') return '';
    return (
      chat.groupId ||
      chat.chatId ||
      chat.userId ||
      chat.id.replace(/^group:/, '')
    );
  }, [chat.chatId, chat.chatType, chat.groupId, chat.id, chat.userId]);

  useEffect(() => {
    if (chat.chatType !== 'group') return;

    loadGroupInfo().catch(() => undefined);
  }, [chat.chatType, loadGroupInfo]);

  const handleStartConversationCall = useCallback(
    (callType: 'audio' | 'video') => {
      if (chat.chatType === 'group') {
        if (!groupId) {
          Alert.alert(copy.audioCallFailedTitle, copy.missingGroup);
          return;
        }
        const callParams = {
          groupId,
          callType,
          direction: 'outgoing' as const,
          groupName: chat.name,
          groupAvatar: chat.avatar,
        };
        startGroupCall(callParams);
        navigation.navigate(ROUTES.GROUP_CALL_ROOM, callParams);
        return;
      }

      const recipientId = chat.participantId || chat.userId || chat.chatId;
      if (!recipientId) {
        Alert.alert(copy.audioCallFailedTitle, copy.missingRecipient);
        return;
      }

      const callParams = {
        recipientId,
        callType,
        direction: 'outgoing' as const,
        peer: {
          id: recipientId,
          name: chat.name,
          avatar: chat.avatar,
          username: chat.username,
        },
      };
      startOutgoingCall(callParams);
      navigation.navigate(ROUTES.CALL_ROOM, callParams);
    },
    [
      chat.avatar,
      chat.chatId,
      chat.chatType,
      chat.name,
      copy.audioCallFailedTitle,
      copy.missingGroup,
      copy.missingRecipient,
      groupId,
      navigation,
      chat.participantId,
      chat.userId,
      chat.username,
      startGroupCall,
      startOutgoingCall,
    ],
  );

  const renderMessageItem = useCallback<ListRenderItem<ChatMessageListItem>>(
    ({ item }) => {
      if (item.kind === 'media-group') {
        return (
          <MemoizedMediaMessageGroup
            messages={item.messages}
            avatar={chat.avatar}
            onOpenMedia={handleOpenMedia}
            onReply={setReplyingMessage}
          />
        );
      }

      const showAvatar =
        item.kind === 'message' && !item.message.isSentByMe
          ? (() => {
              const currentIndex = messageItems.findIndex(x => x.id === item.id);
              if (currentIndex <= 0) return true;
              const successor = messageItems[currentIndex - 1];
              if (!successor || successor.kind !== 'message') return true;
              return successor.message.isSentByMe;
            })()
          : false;

      return (
        <MemoizedMessageBubble
          message={item.message}
          avatar={chat.avatar}
          partnerName={chat.name}
          showAvatar={showAvatar}
          onOpenMedia={handleOpenMedia}
          onReply={setReplyingMessage}
          onLongPress={setSelectedOptionMessage}
          onRecallCall={handleStartConversationCall}
          onPressReply={handlePressReply}
          onQuickRecord={handleQuickRecord}
        />
      );
    },
    [chat.avatar, chat.name, messageItems, handleOpenMedia, handleStartConversationCall, handlePressReply, handleQuickRecord],
  );

  const handleOpenGroupInfo = useCallback(() => {
    if (chat.chatType !== 'group') return;
    setIsGroupInfoVisible(true);
    setGroupInfoDialog(null);
    setExpandedGroupInfoSections(
      new Set(['members', 'media', 'files', 'links']),
    );
    setSelectedAddableIds(new Set());
    loadGroupInfo()
      .then(info => {
        if (info?.name) setEditGroupName(info.name);
      })
      .catch(() => undefined);
  }, [chat.chatType, loadGroupInfo]);

  const handleCloseGroupInfo = useCallback(() => {
    setGroupInfoDialog(null);
    setIsGroupInfoVisible(false);
  }, []);

  const handleCloseGroupInfoDialog = useCallback(() => {
    setGroupInfoDialog(null);
  }, []);

  const handleOpenAddMembersDialog = useCallback(() => {
    setSelectedAddableIds(new Set());
    setAddableQuery('');
    setGroupInfoDialog('add');
    searchAddableUsers('').catch(caught => {
      Alert.alert(
        copy.cannotFindMember,
        caught instanceof Error ? caught.message : copy.retryHint,
      );
    });
  }, [copy.cannotFindMember, copy.retryHint, searchAddableUsers]);

  const handleOpenEditGroupDialog = useCallback(() => {
    setEditGroupName(groupInfo?.name || chat.name);
    setGroupInfoDialog('edit');
  }, [chat.name, groupInfo?.name]);

  const handleOpenDeleteGroupDialog = useCallback(() => {
    setGroupInfoDialog('delete');
  }, []);

  const handleToggleGroupInfoSection = useCallback(
    (section: GroupInfoSection) => {
      setExpandedGroupInfoSections(current => {
        const next = new Set(current);
        if (next.has(section)) {
          next.delete(section);
        } else {
          next.add(section);
        }
        return next;
      });
    },
    [],
  );

  const handleSearchAddableUsers = useCallback(() => {
    searchAddableUsers(addableQuery).catch(caught => {
      Alert.alert(
        copy.cannotFindMember,
        caught instanceof Error ? caught.message : copy.retryHint,
      );
    });
  }, [addableQuery, copy.cannotFindMember, copy.retryHint, searchAddableUsers]);

  const handleToggleAddableUser = useCallback((user: GroupAddableUser) => {
    setSelectedAddableIds(current => {
      const next = new Set(current);
      if (next.has(user.id)) {
        next.delete(user.id);
      } else {
        next.add(user.id);
      }
      return next;
    });
  }, []);

  const handleSubmitAddUsers = useCallback(() => {
    const userIds = [...selectedAddableIds];
    addGroupUsers(userIds)
      .then(success => {
        if (success) {
          setSelectedAddableIds(new Set());
          setAddableQuery('');
          setGroupInfoDialog(null);
          searchAddableUsers('').catch(() => undefined);
        }
      })
      .catch(caught => {
        Alert.alert(
          copy.cannotAddMember,
          caught instanceof Error ? caught.message : copy.retryHint,
        );
      });
  }, [
    addGroupUsers,
    copy.cannotAddMember,
    copy.retryHint,
    searchAddableUsers,
    selectedAddableIds,
  ]);

  const handlePickGroupAvatar = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.8,
      includeBase64: false,
    });
    const asset = result.assets?.[0];
    const attachment = asset ? assetToAttachment(asset) : undefined;
    if (attachment) {
      setEditGroupAvatar({ ...attachment, mediaType: 'image' });
    }
  }, []);

  const handleSaveGroup = useCallback(() => {
    editGroup({
      name: editGroupName.trim() || groupInfo?.name,
      avatar: editGroupAvatar,
    })
      .then(info => {
        if (info) {
          setEditGroupAvatar(undefined);
          setEditGroupName(info.name);
          setGroupInfoDialog(null);
        }
      })
      .catch(caught => {
        Alert.alert(
          copy.cannotSaveGroup,
          caught instanceof Error ? caught.message : copy.retryHint,
        );
      });
  }, [
    copy.cannotSaveGroup,
    copy.retryHint,
    editGroup,
    editGroupAvatar,
    editGroupName,
    groupInfo?.name,
  ]);

  const handleDeleteGroup = useCallback(() => {
    deleteGroup()
      .then(success => {
        if (success) {
          setGroupInfoDialog(null);
          setIsGroupInfoVisible(false);
          navigation.goBack();
        }
      })
      .catch(caught => {
        Alert.alert(
          copy.errorTitle,
          caught instanceof Error ? caught.message : copy.retryHint,
        );
      });
  }, [copy.errorTitle, copy.retryHint, deleteGroup, navigation]);

  const handleClearGroupHistory = useCallback(() => {
    Alert.alert(copy.clearHistory, copy.clearHistoryMessage, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.delete,
        style: 'destructive',
        onPress: () => {
          clearGroupHistory()
            .then(success => {
              if (success) {
                loadInitial().catch(() => undefined);
                loadGroupInfo().catch(() => undefined);
              }
            })
            .catch(caught => {
              Alert.alert(
                copy.cannotClearHistory,
                caught instanceof Error ? caught.message : copy.retryHint,
              );
            });
        },
      },
    ]);
  }, [
    clearGroupHistory,
    copy.cancel,
    copy.cannotClearHistory,
    copy.clearHistory,
    copy.clearHistoryMessage,
    copy.delete,
    copy.retryHint,
    loadGroupInfo,
    loadInitial,
  ]);

  const handleLeaveGroup = useCallback(() => {
    Alert.alert(copy.leaveGroup, copy.leaveGroupMessage, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.leaveGroupConfirm,
        style: 'destructive',
        onPress: () => {
          leaveGroup()
            .then(success => {
              if (success) {
                setIsGroupInfoVisible(false);
                navigation.goBack();
              }
            })
            .catch(caught => {
              Alert.alert(
                copy.cannotLeaveGroup,
                caught instanceof Error ? caught.message : copy.retryHint,
              );
            });
        },
      },
    ]);
  }, [
    copy.cancel,
    copy.cannotLeaveGroup,
    copy.leaveGroup,
    copy.leaveGroupConfirm,
    copy.leaveGroupMessage,
    copy.retryHint,
    leaveGroup,
    navigation,
  ]);

  const handleRemoveGroupMember = useCallback(
    (member: GroupChatMember) => {
      Alert.alert(copy.removeMember, copy.removeMemberMessage(member.name), [
        { text: copy.cancel, style: 'cancel' },
        {
          text: copy.delete,
          style: 'destructive',
          onPress: () => {
            removeGroupUser(member.id).catch(caught => {
              Alert.alert(
                copy.cannotRemoveMember,
                caught instanceof Error ? caught.message : copy.retryHint,
              );
            });
          },
        },
      ]);
    },
    [
      copy.cancel,
      copy.cannotRemoveMember,
      copy.delete,
      copy.removeMember,
      copy.removeMemberMessage,
      copy.retryHint,
      removeGroupUser,
    ],
  );

  const handleOpenConversationInfo = useCallback(() => {
    if (chat.chatType === 'group') {
      handleOpenGroupInfo();
      return;
    }
    if (chat.chatType === 'user') {
      navigateToUserProfile(navigation, chat.userId);
    }
  }, [chat.chatType, chat.userId, handleOpenGroupInfo, navigation]);

  const conversationSubtitle = useMemo(() => {
    if (chat.chatType === 'group') {
      return `${groupInfo?.memberCount ?? 0} ${
        language === 'vi' ? 'thành viên' : 'members'
      }`;
    }
    if (chat.isOnline) {
      return language === 'vi' ? 'Đang hoạt động' : 'Active now';
    }
    return `@${chat.username || chat.name}`;
  }, [
    chat.chatType,
    chat.isOnline,
    chat.name,
    chat.username,
    groupInfo?.memberCount,
    language,
  ]);

  const conversationFooterSubtitle = useMemo(() => {
    if (chat.chatType === 'group') {
      return `${groupInfo?.memberCount ?? 0} ${
        language === 'vi' ? 'thành viên' : 'members'
      }`;
    }
    return `@${chat.username || chat.name}`;
  }, [chat.chatType, chat.name, chat.username, groupInfo?.memberCount, language]);

  const conversationIntroText = useMemo(() => {
    if (chat.chatType === 'group') {
      return language === 'vi'
        ? 'Đây là bắt đầu của nhóm này. Hãy gửi tin nhắn đầu tiên để cùng trò chuyện!'
        : 'This is the beginning of this group. Send the first message to start chatting!';
    }
    return language === 'vi'
      ? `Bạn hiện đã kết nối trên VnSeea. Hãy bắt đầu cuộc trò chuyện với ${chat.name}!`
      : `You are connected on VnSeea. Start the conversation with ${chat.name}!`;
  }, [chat.chatType, chat.name, language]);

  const conversationHeaderActions = useMemo(() => {
    if (chat.chatType !== 'user' && chat.chatType !== 'group') return [];

    const actions = [
      {
        key: 'audio',
        icon: <Phone size={21} color="#0000ff" />,
        onPress: () => handleStartConversationCall('audio'),
      },
      {
        key: 'video',
        icon: <Video size={22} color="#0000ff" />,
        onPress: () => handleStartConversationCall('video'),
      },
    ];

    if (chat.chatType === 'group') {
      actions.push({
        key: 'info',
        icon: <Info size={21} color="#0000ff" />,
        onPress: handleOpenGroupInfo,
      });
    }

    return actions;
  }, [chat.chatType, handleOpenGroupInfo, handleStartConversationCall]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={ROOT_SAFE_AREA_EDGES}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View className="flex-row items-center border-b border-gray-200 px-3 py-2">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#050505" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenConversationInfo}
          >
            <Image
              source={{ uri: chat.avatar }}
              className="ml-1 h-11 w-11 rounded-full"
            />
          </TouchableOpacity>
          <View className="ml-3 flex-1">
            <Text
              className="text-base font-bold text-gray-900"
              numberOfLines={1}
            >
              {chat.name}
            </Text>
            <Text className="text-xs text-gray-500" numberOfLines={1}>
              {conversationSubtitle}
            </Text>
            <Text style={{ display: 'none' }}>
              {chat.chatType === 'group'
                ? `${groupInfo?.memberCount ?? ''} ${
                    language === 'vi' ? 'thành viên' : 'members'
                  }`
                : chat.isOnline
                ? language === 'vi'
                  ? 'Đang hoạt động'
                  : 'Active now'
                : `@${chat.username}`}
            </Text>
          </View>
          {conversationHeaderActions.map(action => (
            <TouchableOpacity
              key={action.key}
              className="h-10 w-10 items-center justify-center rounded-full"
              activeOpacity={0.75}
              onPress={action.onPress}
            >
              {action.icon}
            </TouchableOpacity>
          ))}
        </View>

        {/* Messages */}
        {isLoading ? (
          <ChatMessagesSkeleton />
        ) : (
          <FlatList<ChatMessageListItem>
            key={chat.id}
            ref={flatListRef}
            data={messageItems}
            keyExtractor={item => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={messageListContentStyle}
            inverted
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            onContentSizeChange={handleContentSizeChange}
            scrollEventThrottle={16}
            removeClippedSubviews={true}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
            onEndReached={handleLoadOlder}
            onEndReachedThreshold={2.0}
            ListHeaderComponent={
              <View className="py-2">
                {(isTyping || isRecording) && (
                  <TypingIndicator name={chat.name} avatar={chat.avatar} />
                )}
              </View>
            }
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator
                  className="my-3"
                  size="small"
                  color="#2563eb"
                />
              ) : !hasMore ? (
                <View className="items-center justify-center py-10 px-4">
                  <View className="relative">
                    <Image
                      source={{ uri: chat.avatar }}
                      className="h-24 w-24 rounded-full border-4 border-blue-50 shadow-md"
                    />
                    {chat.isOnline && (
                      <View className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-white bg-green-500" />
                    )}
                  </View>
                  <Text className="mt-4 text-xl font-bold text-gray-900 text-center">
                    {chat.name}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500 text-center">
                    {conversationFooterSubtitle}
                  </Text>
                  <Text style={{ display: 'none' }}>
                    {chat.chatType === 'group'
                      ? `${groupInfo?.memberCount ?? ''} thành viên`
                      : `@${chat.username || chat.name}`}
                  </Text>
                  <Text className="mt-3 text-xs text-gray-400 text-center max-w-[280px]">
                    {conversationIntroText}
                  </Text>
                  <Text style={{ display: 'none' }}>
                    {chat.chatType === 'group'
                      ? 'Đây là sự bắt đầu của nhóm này. Hãy gửi tin nhắn đầu tiên để cùng trò chuyện!'
                      : `Bạn hiện đã kết nối trên VnSeea. Hãy bắt đầu cuộc trò chuyện với ${chat.name}!`}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-6 py-20">
                <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-100">
                  <MessageCircle size={48} color="#9DA9BE" />
                </View>
                <Text className="text-lg font-semibold text-gray-900">
                  {copy.hello(chat.name)}
                </Text>
                <Text className="mt-2 text-center text-sm text-gray-500">
                  {copy.emptyHint}
                </Text>
              </View>
            }
          />
        )}

        {showJumpToLatest && (
          <TouchableOpacity
            className="absolute bottom-24 right-5 h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white shadow-lg"
            style={{ elevation: 6 }}
            activeOpacity={0.85}
            onPress={() => {
              setShowJumpToLatest(false);
              scrollToLatest(true);
            }}
          >
            <ChevronDown size={25} color="#2563EB" strokeWidth={2.6} />
          </TouchableOpacity>
        )}

        {/* Error */}
        {!!error && (
          <TouchableOpacity
            className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2"
            activeOpacity={0.8}
            onPress={() => loadInitial().catch(() => undefined)}
          >
            <Text className="text-center text-xs text-red-600">{error}</Text>
          </TouchableOpacity>
        )}

        {/* Attachments Preview */}
        {visualAttachments.length > 0 && (
          <View className="border-t border-gray-200 bg-white px-3 pt-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 12 }}
            >
              {visualAttachments.map((att, i) => (
                <View
                  key={`${att.uri}-${i}`}
                  className="h-20 w-20 overflow-hidden rounded-xl bg-gray-200"
                >
                  {att.mediaType === 'image' && (
                    <Image
                      source={{ uri: att.uri }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  )}
                  {att.mediaType === 'video' && (
                    <>
                      <VideoPlayer
                        source={{ uri: att.uri }}
                        style={{ height: '100%', width: '100%' }}
                        resizeMode="cover"
                        paused
                        muted
                      />
                      <View className="absolute inset-0 items-center justify-center bg-black/30">
                        <Play size={16} color="#fff" fill="#fff" />
                      </View>
                    </>
                  )}
                  <TouchableOpacity
                    className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60"
                    onPress={() =>
                      setAttachments(current =>
                        current.filter(item => item.uri !== att.uri),
                      )
                    }
                  >
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {audioAttachment ? (
          <View className="border-t border-gray-100 bg-white px-3 py-2">
            <View className="flex-row items-center rounded-3xl bg-slate-50 px-2 py-2">
              <AudioPlayer
                uri={audioAttachment.uri}
                compact
                accentColor="#0084FF"
              />
              <TouchableOpacity
                className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-white"
                activeOpacity={0.8}
                onPress={() =>
                  setAttachments(current =>
                    current.filter(item => item.uri !== audioAttachment.uri),
                  )
                }
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Product Attachment Preview Card */}
        {attachedProduct && (
          <View className="border-t border-gray-100 bg-white">
            {/* Product Info Row */}
            <View className="px-3 pt-2.5 pb-2 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                {attachedProduct.images?.[0]?.image ? (
                  <Image
                    source={{ uri: attachedProduct.images[0].image }}
                    className="h-12 w-12 rounded-lg"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-12 w-12 rounded-lg bg-slate-100 items-center justify-center">
                    <ShoppingBag size={20} color="#94A3B8" />
                  </View>
                )}
                <View className="ml-2.5 flex-1">
                  <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                    {attachedProduct.name}
                  </Text>
                  <Text className="text-xs font-semibold text-[#0F56FB] mt-0.5" numberOfLines={1}>
                    {formatPrice(attachedProduct.price, attachedProduct.currency_symbol || attachedProduct.currency_code || attachedProduct.currency || 'VNSEEA')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                className="h-7 w-7 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
                activeOpacity={0.8}
                onPress={() => {
                  setAttachedProduct(undefined);
                }}
              >
                <X size={14} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Quick Option Suggestion Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 10, paddingTop: 2 }}
            >
              {[
                'Mặt hàng này còn không bạn yêu',
                'Giá cả như nào vậy bạn',
                'Cho mình xin thêm thông tin nhé con vợ',
                'Hàng hiệu à',
              ].map((optionText, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSendProductInquiryOption(optionText)}
                  className="mr-2 rounded-full border border-blue-100 bg-blue-50/50 px-3.5 py-1.5 active:bg-blue-100"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs font-semibold text-blue-600">
                    {optionText}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Reply Preview Bar */}
        {replyingMessage ? (
          <View className="flex-row items-center justify-between border-t border-gray-100 bg-white px-4 py-2">
            <View className="min-w-0 flex-1 flex-row items-center">
              <View className="mr-2.5 h-11 w-0.5 rounded-full bg-[#0084FF]" />
              <View className="min-w-0 flex-1 justify-center">
                <Text className="text-[12px] font-bold text-gray-900" numberOfLines={1}>
                  {replyingMessage.isSentByMe ? 'Bạn' : chat.name || 'Người dùng'}
                </Text>
                <Text className="mt-0.5 text-[12px] leading-4 text-gray-500" numberOfLines={1}>
                  {getMessageSnippet(replyingMessage, chat.name)}
                </Text>
              </View>
              {/* Optional Right image thumbnail in preview bar */}
              {replyingMessage.media && replyingMessage.mediaType === 'image' && (
                <Image
                  source={{ uri: replyingMessage.media }}
                  className="ml-2 h-10 w-10 rounded-md bg-slate-200"
                  resizeMode="cover"
                />
              )}
              {replyingMessage.media && replyingMessage.mediaType === 'video' ? (
                <View className="ml-2 h-10 w-10 items-center justify-center rounded-md bg-slate-900">
                  <Play size={14} color="#ffffff" fill="#ffffff" />
                </View>
              ) : null}
              {replyingMessage.media && replyingMessage.mediaType === 'audio' ? (
                <View className="ml-2 h-10 w-10 items-center justify-center rounded-md bg-violet-100">
                  <Mic size={16} color="#7C3AED" />
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => {
                setReplyingMessage(undefined);
              }}
              className="ml-2 h-8 w-8 items-center justify-center rounded-full"
              activeOpacity={0.75}
            >
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Input Bar */}
        <View
          className="flex-row items-end border-t border-gray-200 bg-white px-3 py-2"
          style={chatInputBarStyle}
        >
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.7}
            onPress={() => handlePickMedia().catch(() => undefined)}
          >
            <ImagePlus size={22} color="#9DA9BE" />
          </TouchableOpacity>

          {recorder.isRecording ? (
            <RecordingWaveformBar
              durationMs={recorder.durationMs}
              onCancel={() => recorder.cancelRecording().catch(() => undefined)}
            />
          ) : (
            <TextInput
              className="mr-2 max-h-28 flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-[15px] text-gray-900"
              placeholder={copy.inputPlaceholder}
              placeholderTextColor="#9DA9BE"
              multiline
              value={text}
              onChangeText={handleChangeText}
            />
          )}

          <TouchableOpacity
            className={`mr-2 h-10 w-10 items-center justify-center rounded-full ${
              recorder.isRecording ? 'bg-red-100' : 'bg-[#0084FF]/10'
            }`}
            activeOpacity={0.7}
            onPress={() => handleToggleRecording().catch(() => undefined)}
          >
            {recorder.isRecording ? (
              <Square size={14} color="#DC2626" fill="#DC2626" />
            ) : (
              <Mic size={20} color="#0084FF" />
            )}
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: sendAnim }] }}>
            <TouchableOpacity
              className={`h-10 w-10 items-center justify-center rounded-full ${
                canSend ? 'bg-[#0084FF]' : 'bg-[#0084FF]/30'
              }`}
              activeOpacity={0.8}
              disabled={!canSend}
              onPress={() => handleSend().catch(() => undefined)}
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
      <GroupInfoModal
        visible={isGroupInfoVisible}
        groupInfo={groupInfo}
        assets={groupSharedAssets}
        addableUsers={addableUsers}
        selectedAddableIds={selectedAddableIds}
        addableQuery={addableQuery}
        editName={editGroupName}
        editAvatar={editGroupAvatar}
        activeDialog={groupInfoDialog}
        isLoading={isLoadingGroupInfo}
        isLoadingAddableUsers={isLoadingAddableUsers}
        expandedSections={expandedGroupInfoSections}
        onClose={handleCloseGroupInfo}
        onOpenAddMembers={handleOpenAddMembersDialog}
        onOpenEditGroup={handleOpenEditGroupDialog}
        onOpenDeleteGroup={handleOpenDeleteGroupDialog}
        onCloseActionDialog={handleCloseGroupInfoDialog}
        onToggleSection={handleToggleGroupInfoSection}
        onChangeAddableQuery={setAddableQuery}
        onSearchAddableUsers={handleSearchAddableUsers}
        onToggleAddableUser={handleToggleAddableUser}
        onSubmitAddUsers={handleSubmitAddUsers}
        onChangeEditName={setEditGroupName}
        onPickAvatar={handlePickGroupAvatar}
        onSaveGroup={handleSaveGroup}
        onDeleteGroup={handleDeleteGroup}
        onClearHistory={handleClearGroupHistory}
        onLeaveGroup={handleLeaveGroup}
        onRemoveMember={handleRemoveGroupMember}
        copy={copy}
      />
      <Modal
        visible={Boolean(viewerMedia)}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseMedia}
      >
        <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
          {/* Header Row - positioned safely under status bar */}
          <View className="flex-row items-center justify-between px-4 py-3 z-10">
            {viewerMediaItems.length > 1 ? (
              <View className="rounded-full bg-white/20 px-4 py-2">
                <Text className="text-sm font-semibold text-white">
                  {viewerMediaIndex + 1}/{viewerMediaItems.length}
                </Text>
              </View>
            ) : (
              <View />
            )}
            <TouchableOpacity
              className="h-11 w-11 items-center justify-center rounded-full bg-black/60"
              activeOpacity={0.8}
              onPress={handleCloseMedia}
            >
              <X size={23} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Media Slider (Horizontal FlatList) for swiping */}
          <View className="flex-1">
            <FlatList
              ref={mediaListRef}
              data={viewerMediaItems}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `${item.uri}-${index}`}
              getItemLayout={(data, index) => {
                const screenWidth = Dimensions.get('window').width;
                return {
                  length: screenWidth,
                  offset: screenWidth * index,
                  index,
                };
              }}
              onMomentumScrollEnd={(event) => {
                const slideSize = event.nativeEvent.layoutMeasurement.width;
                if (slideSize <= 0) return;
                const offset = event.nativeEvent.contentOffset.x;
                const index = Math.round(offset / slideSize);
                if (index >= 0 && index < viewerMediaItems.length && index !== viewerMediaIndex) {
                  setViewerMediaIndex(index);
                }
              }}
              renderItem={({ item }) => {
                const screenWidth = Dimensions.get('window').width;
                return (
                  <View style={{ width: screenWidth, flex: 1 }}>
                    {item.type === 'image' ? (
                      <SwipeToCloseContainer onClose={handleCloseMedia}>
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                          <Image
                            source={{ uri: item.uri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                          />
                        </View>
                      </SwipeToCloseContainer>
                    ) : item.type === 'video' ? (
                      <ChatVideoViewer uri={item.uri} onClose={handleCloseMedia} />
                    ) : null}
                  </View>
                );
              }}
            />
          </View>

          {/* Navigation Chevrons */}
          {viewerMediaIndex > 0 && (
            <TouchableOpacity
              className="absolute left-4 top-1/2 h-14 w-14 items-center justify-center rounded-full bg-white/20 -translate-y-1/2 z-10"
              activeOpacity={0.8}
              onPress={() => setViewerMediaIndex(i => i - 1)}
            >
              <ChevronLeft size={28} color="#fff" />
            </TouchableOpacity>
          )}
          {viewerMediaIndex < viewerMediaItems.length - 1 && (
            <TouchableOpacity
              className="absolute right-4 top-1/2 h-14 w-14 items-center justify-center rounded-full bg-white/20 -translate-y-1/2 z-10"
              activeOpacity={0.8}
              onPress={() => setViewerMediaIndex(i => i + 1)}
            >
              <ChevronRight size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </Modal>

      {/* Custom Option Message Modal (Action Sheet) */}
      <Modal
        visible={Boolean(selectedOptionMessage)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedOptionMessage(undefined)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedOptionMessage(undefined)}
        >
          <View style={styles.modalContainer} className="bg-white/95 rounded-t-3xl border border-gray-100 shadow-2xl">
            <View className="items-center py-2.5">
              <View className="h-1.5 w-12 rounded-full bg-gray-300" />
            </View>
            <View className="px-5 pb-8 pt-3">
              <Text className="text-center text-sm font-semibold text-gray-500 mb-6">
                Tùy chọn tin nhắn
              </Text>

              <TouchableOpacity
                className="flex-row items-center rounded-xl bg-gray-50 px-4 py-4 mb-3 active:bg-gray-100"
                onPress={handleSelectOptionReply}
              >
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                  <CornerUpLeft size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-800">Trả lời</Text>
                  <Text className="text-xs text-gray-500">Trích dẫn tin nhắn này</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center rounded-xl bg-gray-50 px-4 py-4 mb-5 active:bg-gray-100"
                onPress={handleSelectOptionCopy}
              >
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <Copy size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-800">Sao chép</Text>
                  <Text className="text-xs text-gray-500">Sao chép nội dung tin nhắn</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="items-center justify-center rounded-full bg-gray-200/80 py-3.5 active:bg-gray-300"
                onPress={() => setSelectedOptionMessage(undefined)}
              >
                <Text className="text-base font-bold text-gray-600">Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inlineLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  mediaCaptionBubble: {
    maxWidth: IMAGE_GALLERY_WIDTH,
  },
  messageSkeletonAvatar: {
    width: 32,
    height: 32,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  messageSkeletonBubble: {
    maxWidth: '78%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  messageSkeletonBubbleReceived: {
    borderBottomLeftRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  messageSkeletonBubbleSent: {
    borderBottomRightRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  messageSkeletonBubbleSmall: {
    width: 176,
  },
  messageSkeletonBubbleMedium: {
    width: 188,
  },
  messageSkeletonBubbleLarge: {
    width: 224,
  },
  messageSkeletonBubbleXLarge: {
    width: 252,
  },
  messageSkeletonContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  messageSkeletonLine: {
    width: '100%',
    height: 12,
    borderRadius: 999,
  },
  messageSkeletonLineGap: {
    marginTop: 8,
  },
  messageSkeletonLineReceived: {
    backgroundColor: '#E2E8F0',
  },
  messageSkeletonLineSent: {
    backgroundColor: '#DBEAFE',
  },
  messageSkeletonLineShort: {
    width: '68%',
  },
  messageSkeletonRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  messageSkeletonRowReceived: {
    justifyContent: 'flex-start',
  },
  messageSkeletonRowSent: {
    justifyContent: 'flex-end',
  },  imageGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IMAGE_GALLERY_GAP,
    width: IMAGE_GALLERY_WIDTH,
    overflow: 'hidden',
    borderRadius: 16,
  },
  imageGalleryBody: {
    maxWidth: IMAGE_GALLERY_WIDTH,
  },
  imageGalleryImage: {
    height: '100%',
    width: '100%',
  },
  imageGalleryMore: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  imageGalleryTile: {
    height: IMAGE_GALLERY_TILE_SIZE,
    width: IMAGE_GALLERY_TILE_SIZE,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  videoPreviewBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
  },
  videoPreviewScrim: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  videoPreviewFill: {
    height: '100%',
    width: '100%',
  },
  videoPreviewLarge: {
    width: IMAGE_GALLERY_WIDTH,
    height: VIDEO_PREVIEW_HEIGHT,
    borderRadius: 18,
  },
  messageVideo: { height: '100%', width: '100%', backgroundColor: '#000' },
  viewerVideo: { width: '100%', height: '100%', backgroundColor: '#000' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
});

export default ChatScreen;
