// Description: Renders a Messages chat conversation with media, voice notes, and LiveKit call actions.
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
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
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  PanResponder,
  Dimensions,
  FlatList,
  type ListRenderItem,
  type KeyboardEvent,
  type StyleProp,
  type TextStyle,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  ImagePlus,
  Info,
  Link2,
  MapPin,
  MessageCircle,
  Mic,
  Newspaper,
  Phone,
  PhoneMissed,
  Play,
  Send,
  ShoppingBag,
  Square,
  Video,
  X,
  CornerUpLeft,
  CornerUpRight,
  Copy,
  Pin,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import {
  launchImageLibrary,
  type MediaType,
} from 'react-native-image-picker';
import VideoPlayer from 'react-native-video';
import {
  SafeAreaView,
  useSafeAreaInsets,
  type Edge,
} from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { useChatViewModel } from '../../application/view-models/useChatViewModel';
import { useGroupLiveKitCallSession } from '../../application/view-models/useGroupLiveKitCallSession';
import { useLiveKitCallSession } from '../../application/view-models/useLiveKitCallSession';
import { SharedPostMessageCard } from '../components/SharedPostMessageCard';
import type { SharedPostOpenTarget } from '../../application/shared-posts/sharedPostMessage';
import { StoryReplyMessageCard } from '../components/StoryReplyMessageCard';
import { MessageLinkPreviewCard } from '../components/MessageLinkPreviewCard';
import { PinnedMessagesBanner } from '../components/PinnedMessagesBanner';
import {
  ChatMediaViewerModal,
  type ChatMediaViewerItem,
} from '../components/ChatMediaViewerModal';
import { DoubleTapTouchable } from '../components/DoubleTapTouchable';
import {
  MessageReactionBadge,
  MessageReactionPicker,
} from '../components/MessageReactions';
import type {
  MessageAttachment,
  MessageItem,
  MarketplaceMessageContext,
  MessageReplyReference,
  SendMessageOptions,
  MessageSystemEvent,
} from '../../domain/types/messages.types';
import type { ProductItem } from '../../../product/domain/types/product.types';
import type { PagesItem } from '../../../pages';
import { AudioPlayer } from '../../../shared-kernel/presentation/components/AudioPlayer';
import { AudioWaveform } from '../../../shared-kernel/presentation/components/AudioWaveform';
import { showSnackbar } from '../../../shared-kernel/presentation/components/Snackbar';
import { useAudioRecorder } from '../../../shared-kernel/application/hooks/useAudioRecorder';
import { formatAudioDuration } from '../../../shared-kernel/application/utils/audioFiles';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { ROOT_SAFE_AREA_EDGES } from '../../../shared-kernel/presentation/utils/safeAreaEdges';
import { KeyboardSafeView } from '../../../shared-kernel/presentation/components/KeyboardSafeView';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import {
  createCachedVideoPosterThumbnail,
  getCachedVideoPosterThumbnail,
} from '../../../shared-kernel/application/utils/videoThumbnails';
import { findConversationMessageListItemIndex } from '../utils/conversationMessageNavigation';
import {
  buildMapShareUrl,
  buildStaticMapPreviewUrl,
  parseMapShareUrl,
  type SharedMapLocation,
} from '../../../user/application/utils/mapShare';
import { getCurrentDeviceLocation } from '../../../shared-kernel/application/utils/currentLocation';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { ReactionType } from '../../../shared-kernel/domain/reactions/reactionCatalog';
import { areMessageReactionSummariesEqual } from '../../domain/reactions/messageReactions';
import { isValidMessageLocation } from '../../application/preview/messageContentDescriptor';
import {
  createMessageReplyReference,
  getMessageReplyPreviewText,
} from '../../application/replies/messageReply';
import {
  buildChatMessageListItems,
  type ChatMessageListItem,
} from '../../application/utils/messageMediaGrouping';

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

type OpenChatMedia = (
  media: ChatMediaViewerItem,
  mediaItems?: ChatMediaViewerItem[],
) => void;

const MAX_MEDIA_ATTACHMENTS = 10;
const IMAGE_GALLERY_WIDTH = Math.min(Dimensions.get('window').width - 92, 332);
const IMAGE_GALLERY_GAP = 3;
const IMAGE_GALLERY_TILE_SIZE = (IMAGE_GALLERY_WIDTH - IMAGE_GALLERY_GAP) / 2;
const MAP_SHARE_CARD_WIDTH = Math.min(
  Dimensions.get('window').width * 0.76,
  340,
);
const ORDER_REQUEST_CARD_WIDTH = Math.min(
  Dimensions.get('window').width - 88,
  320,
);
const CHAT_SAFE_AREA_EDGES: Edge[] =
  Platform.OS === 'ios' ? ['top', 'left', 'right'] : ROOT_SAFE_AREA_EDGES;
const PRODUCT_INQUIRY_QUICK_OPTIONS = [
  {
    id: 'availability',
    label: 'Sản phẩm còn hàng không ạ?',
    hint: 'Hỏi tình trạng còn hàng',
    message: 'Sản phẩm này còn hàng không ạ?',
    icon: ShoppingBag,
  },
  {
    id: 'price',
    label: 'Giá hiện tại là bao nhiêu ạ?',
    hint: 'Xác nhận giá bán',
    message: 'Giá hiện tại của sản phẩm là bao nhiêu ạ?',
    icon: Info,
  },
  {
    id: 'condition',
    label: 'Tình trạng sản phẩm thế nào?',
    hint: 'Hỏi độ mới và chất lượng',
    message: 'Tình trạng hiện tại của sản phẩm như thế nào ạ?',
    icon: MessageCircle,
  },
  {
    id: 'details',
    label: 'Cho mình xin thêm thông tin.',
    hint: 'Ảnh thực tế, bảo hành, giao hàng',
    message:
      'Bạn có thể cho mình xin thêm thông tin chi tiết về sản phẩm không ạ?',
    icon: FileText,
  },
] as const;

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
  linkColor = APP_COLORS.status.info,
  numberOfLines,
}: {
  text: string;
  className?: string;
  style?: StyleProp<TextStyle>;
  linkColor?: string;
  numberOfLines?: number;
}) {
  const segments = useMemo(() => splitLinkTextSegments(text), [text]);
  const navigation = useNavigation<any>();

  const handleOpenUrl = useCallback(
    (url: string) => {
      const mapLocation = parseMapShareUrl(url);
      if (mapLocation) {
        navigation.navigate(ROUTES.NEARBY_USERS, {
          initialLocation: mapLocation,
          autoRoute: true,
        });
        return;
      }

      Linking.openURL(url).catch(() => undefined);
    },
    [navigation],
  );

  return (
    <Text className={className} style={style} numberOfLines={numberOfLines}>
      {segments.map((segment, index) =>
        segment.url ? (
          <Text
            key={`${segment.url}-${index}`}
            style={[styles.inlineLink, { color: linkColor }]}
            onPress={() => handleOpenUrl(segment.url!)}
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

function getMessageLinkCaption(text: string) {
  return splitLinkTextSegments(text)
    .filter(segment => !segment.url)
    .map(segment => segment.text)
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

type ParsedMapShareMessage = {
  location: SharedMapLocation;
  caption: string;
  url: string;
};

const MAP_SHARE_PARSE_CACHE_LIMIT = 240;
const STATIC_MAP_PREFETCH_CACHE_LIMIT = 120;
const parsedMapShareMessageCache = new Map<
  string,
  ParsedMapShareMessage | null
>();
const prefetchedStaticMapPreviewUrls = new Set<string>();

function rememberParsedMapShareMessage(
  text: string,
  value: ParsedMapShareMessage | null,
) {
  parsedMapShareMessageCache.delete(text);
  parsedMapShareMessageCache.set(text, value);
  if (parsedMapShareMessageCache.size > MAP_SHARE_PARSE_CACHE_LIMIT) {
    const oldestKey = parsedMapShareMessageCache.keys().next().value;
    if (oldestKey !== undefined) {
      parsedMapShareMessageCache.delete(oldestKey);
    }
  }
  return value;
}

function prefetchStaticMapPreview(location: SharedMapLocation) {
  const previewUrl = buildStaticMapPreviewUrl(location);
  if (!previewUrl || prefetchedStaticMapPreviewUrls.has(previewUrl)) {
    return previewUrl;
  }

  prefetchedStaticMapPreviewUrls.add(previewUrl);
  if (prefetchedStaticMapPreviewUrls.size > STATIC_MAP_PREFETCH_CACHE_LIMIT) {
    const oldestUrl = prefetchedStaticMapPreviewUrls.values().next().value;
    if (oldestUrl !== undefined) {
      prefetchedStaticMapPreviewUrls.delete(oldestUrl);
    }
  }

  Image.prefetch(previewUrl)
    .then(success => {
      if (!success) prefetchedStaticMapPreviewUrls.delete(previewUrl);
    })
    .catch(() => prefetchedStaticMapPreviewUrls.delete(previewUrl));
  return previewUrl;
}

function formatMapCoordinates(location: SharedMapLocation) {
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
}

function isGeneratedMapShareLine(
  line: string,
  location: SharedMapLocation,
  url: string,
) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  const normalized = trimmed.toLowerCase();
  const coordinateText = formatMapCoordinates(location);
  const address = location.address || location.subtitle || '';
  return (
    trimmed.includes(url) ||
    trimmed.includes(location.title) ||
    (!!address && trimmed.includes(address)) ||
    trimmed.includes(coordinateText) ||
    normalized.startsWith('📍') ||
    normalized.startsWith('địa') ||
    normalized.startsWith('tọa') ||
    normalized.startsWith('mở') ||
    normalized.startsWith('dia') ||
    normalized.startsWith('toa') ||
    normalized.startsWith('mo ') ||
    normalized.startsWith('map') ||
    normalized.startsWith('open') ||
    normalized.startsWith('location') ||
    normalized.startsWith('address') ||
    normalized.startsWith('coordinates') ||
    normalized.startsWith('ä') ||
    normalized.startsWith('tá') ||
    normalized.startsWith('má')
  );
}

function parseSharedMapMessage(text: string): ParsedMapShareMessage | null {
  if (!text) return null;
  if (parsedMapShareMessageCache.has(text)) {
    return rememberParsedMapShareMessage(
      text,
      parsedMapShareMessageCache.get(text) ?? null,
    );
  }

  const segments = splitLinkTextSegments(text);
  let mapSegment: (typeof segments)[number] | undefined;
  let location: SharedMapLocation | null = null;
  for (const segment of segments) {
      if (!segment.url) continue;
      const parsedLocation = parseMapShareUrl(segment.url);
      if (
        !parsedLocation ||
        !isValidMessageLocation(
          parsedLocation.latitude,
          parsedLocation.longitude,
        )
      ) {
        continue;
      }
    mapSegment = segment;
    location = parsedLocation;
    break;
  }
  if (!mapSegment?.url || !location) {
    return rememberParsedMapShareMessage(text, null);
  }

  const caption = text
    .split(/\r?\n/)
    .map(line => line.replace(mapSegment.text, '').trim())
    .filter(line => !isGeneratedMapShareLine(line, location, mapSegment.url!))
    .join('\n')
    .trim();

  return rememberParsedMapShareMessage(text, {
    location,
    caption,
    url: mapSegment.url,
  });
}

const MapShareCard = React.memo(function MapShareCard({
  location,
  caption,
  isSentByMe = false,
  onLongPress,
  onRemove,
  composer = false,
}: {
  location: SharedMapLocation;
  caption?: string;
  isSentByMe?: boolean;
  onLongPress?: () => void;
  onRemove?: () => void;
  composer?: boolean;
}) {
  const navigation = useNavigation<any>();
  const mapShareStyles = styles as Record<string, any>;
  const coordinateText = formatMapCoordinates(location);
  const addressText = location.address || location.subtitle || '';
  const staticMapPreviewUrl = buildStaticMapPreviewUrl(location);
  const staticMapPreviewSource = useMemo(
    () =>
      staticMapPreviewUrl
        ? {
            uri: staticMapPreviewUrl,
            cache: 'force-cache' as const,
          }
        : undefined,
    [staticMapPreviewUrl],
  );

  const handleOpenMap = useCallback(() => {
    navigation.navigate(ROUTES.NEARBY_USERS, {
      initialLocation: location,
      autoRoute: !composer,
    });
  }, [composer, location, navigation]);

  if (!composer) {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleOpenMap}
        onLongPress={onLongPress}
        style={[
          mapShareStyles.mapShareLargeCard,
          isSentByMe ? mapShareStyles.mapShareLargeCardSent : null,
        ]}
      >
        <View style={mapShareStyles.mapShareLargeMap}>
          {staticMapPreviewSource ? (
            <Image
              source={staticMapPreviewSource}
              style={mapShareStyles.mapShareLargeMapNative}
              resizeMode="cover"
              resizeMethod="resize"
              fadeDuration={120}
              progressiveRenderingEnabled
            />
          ) : null}
          <View style={mapShareStyles.mapShareLargeMarkerShadow} />
          <View style={mapShareStyles.mapShareLargeMarker}>
            {location.imageUrl ? (
              <Image
                source={{ uri: location.imageUrl }}
                style={mapShareStyles.mapShareLargeMarkerAvatar}
                resizeMode="cover"
              />
            ) : (
              <MapPin size={22} color={APP_COLORS.status.info} />
            )}
          </View>
        </View>
        <View
          style={[
            mapShareStyles.mapShareLargeFooter,
            isSentByMe ? mapShareStyles.mapShareLargeFooterSent : null,
          ]}
        >
          <Text style={mapShareStyles.mapShareLargeTitle} numberOfLines={1}>
            {location.title || 'Vị trí của bạn'}
          </Text>
          {!!caption && (
            <Text style={mapShareStyles.mapShareLargeCaption} numberOfLines={2}>
              {caption}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleOpenMap}
      onLongPress={onLongPress}
      style={[
        styles.mapShareCard,
        composer ? styles.mapShareComposerCard : styles.mapShareMessageCard,
        isSentByMe && !composer ? styles.mapShareCardSent : null,
      ]}
    >
      <View style={styles.mapShareCardMainRow}>
        {location.imageUrl ? (
          <Image
            source={{ uri: location.imageUrl }}
            style={styles.mapShareCardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.mapShareCardFallback}>
            <MapPin size={24} color="#0F766E" />
          </View>
        )}
        <View style={styles.mapShareCardCopy}>
          <Text style={styles.mapShareCardEyebrow}>
            {composer ? 'Địa chỉ sẽ gửi' : 'Địa điểm'}
          </Text>
          <Text style={styles.mapShareCardTitle} numberOfLines={1}>
            {location.title || 'Địa điểm đã chọn'}
          </Text>
          <Text style={styles.mapShareCardCoordinate} numberOfLines={1}>
            Tọa độ: {coordinateText}
          </Text>
          {!!addressText && (
            <Text style={styles.mapShareCardAddress} numberOfLines={1}>
              {addressText}
            </Text>
          )}
        </View>
        {onRemove ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onRemove}
            style={styles.mapShareCardClose}
          >
            <X size={16} color="#475569" />
          </TouchableOpacity>
        ) : null}
      </View>
      {!!caption && (
        <Text style={styles.mapShareCardCaption} numberOfLines={3}>
          {caption}
        </Text>
      )}
    </TouchableOpacity>
  );
});

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

function PinnedMessageSystemRow({
  event,
  isMine,
  language,
  onOpenMessage,
}: {
  event: MessageSystemEvent;
  isMine: boolean;
  language: AppLanguage;
  onOpenMessage: (messageId: string) => void;
}) {
  const label =
    language === 'vi'
      ? `${isMine ? 'Bạn' : event.actorName} đã ghim một tin nhắn`
      : `${isMine ? 'You' : event.actorName} pinned a message`;
  return (
    <TouchableOpacity
      className="mx-8 my-2 min-h-8 flex-row items-center justify-center"
      activeOpacity={0.7}
      onPress={() => onOpenMessage(event.targetMessageId)}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Pin size={13} color="#64748B" fill="#64748B" />
      <Text className="ml-1.5 text-center text-xs font-medium text-slate-500">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function getChatListItemType(item: ChatMessageListItem) {
  if (item.kind === 'media-group') return 'media-group';

  const { message } = item;
  if (message.systemEvent) {
    return 'system-message-pinned';
  }
  if (message.replyTo) {
    return `reply-${message.replyTo.contentKind}`;
  }
  if (message.callEvent) {
    return `call-${message.callEvent.callType}-${message.callEvent.status}`;
  }
  if (message.storyReply) {
    return 'story-reply';
  }
  if (message.sharedPost) {
    return 'shared-post';
  }
  if (message.mediaType) {
    return `media-${message.mediaType}`;
  }
  if (message.message?.includes('TĂ´i muá»‘n há»i vá» sáº£n pháº©m:')) {
    return 'product-inquiry';
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
          {!row.sentByMe ? <View style={styles.messageSkeletonAvatar} /> : null}
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
            <View
              style={[
                styles.messageSkeletonTime,
                row.sentByMe
                  ? styles.messageSkeletonLineSent
                  : styles.messageSkeletonLineReceived,
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
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
  const iconBgClass = missedIncoming
    ? 'bg-red-500'
    : isSentByMe
    ? 'bg-brand'
    : 'bg-gray-400';

  return (
    <View
      className={`rounded-2xl p-3 border ${
        isSentByMe
          ? 'bg-brand-subtle border-brand-border'
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
          <Text
            className="text-[14px] font-semibold text-gray-950"
            numberOfLines={1}
          >
            {getCallCardTitle(callEvent)}
          </Text>
          <Text
            className="mt-0.5 text-[11.5px] text-gray-500"
            numberOfLines={1}
          >
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
        <Text className="text-[12px] font-bold text-gray-950">Gọi lại</Text>
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
  } catch {
    return null;
  }
}

function parseOrderInquiry(messageText: string) {
  if (!messageText) return null;
  const isOrderMsg =
    messageText.includes('Tôi muốn đặt mua sản phẩm:') ||
    messageText.includes('TĂ´i muá»‘n Ä‘áº·t mua') ||
    messageText.includes('muá»‘n Ä‘áº·t mua sáº£n pháº©m');
  if (!isOrderMsg) {
    return null;
  }

  try {
    // Robust regexes that handle both Mojibake and standard Vietnamese
    const nameMatch = messageText.match(/\*(.*?)\*/);
    const priceMatch = messageText.match(/(?:Giá|GiĂ¡|Gi\u00e1):\s*\*(.*?)\*/);
    const qtyMatch = messageText.match(
      /(?:Số lượng|Sá»‘ l\u01b0\u1ee3ng|l\u01b0\u1ee3ng):\s*\*(.*?)\*/,
    );
    const idMatch = messageText.match(/(?:ID):\s*\*(.*?)\*/);
    const imageMatch = messageText.match(/(?:Ảnh|áº¢nh|Anh):\s*(\S+)/);
    const nameBuyerMatch = messageText.match(
      /(?:Tên|TĂŞn|T\u00ean):\s*\*(.*?)\*/,
    );
    const phoneBuyerMatch = messageText.match(
      /(?:SĐT|SÄ\u0110T|SDT):\s*\*(.*?)\*/,
    );
    const addressBuyerMatch = messageText.match(
      /(?:Địa chỉ|Äá»‹a chá»‰|Dia chi):\s*\*(.*?)\*/,
    );

    if (!nameMatch) return null;

    return {
      name: nameMatch[1],
      price: priceMatch ? priceMatch[1] : '',
      quantity: qtyMatch ? qtyMatch[1] : '1',
      id: idMatch ? idMatch[1] : '',
      image: imageMatch ? imageMatch[1] : '',
      buyerName: nameBuyerMatch ? nameBuyerMatch[1] : '',
      buyerPhone: phoneBuyerMatch ? phoneBuyerMatch[1] : '',
      buyerAddress: addressBuyerMatch ? addressBuyerMatch[1] : '',
    };
  } catch (e) {
    console.warn('Error parsing order inquiry:', e);
    return null;
  }
}

type ProductInquiryContext = Extract<
  MarketplaceMessageContext,
  { type: 'product_inquiry' }
>;
type OrderRequestContext = Extract<
  MarketplaceMessageContext,
  { type: 'order_request' }
>;

function getProductInquiryContext(
  message: MessageItem,
): ProductInquiryContext | null {
  if (message.marketplaceContext?.type === 'product_inquiry') {
    return message.marketplaceContext;
  }

  const legacy = parseProductInquiry(message.message);
  if (!legacy) return null;
  return {
    type: 'product_inquiry',
    productId: legacy.id,
    name: legacy.name,
    price: legacy.price || undefined,
    location: legacy.location || undefined,
    image: legacy.image || undefined,
    note: legacy.userMessage || undefined,
  };
}

function getOrderRequestContext(
  message: MessageItem,
): OrderRequestContext | null {
  if (message.marketplaceContext?.type === 'order_request') {
    return message.marketplaceContext;
  }

  const legacy = parseOrderInquiry(message.message);
  if (!legacy) return null;
  return {
    type: 'order_request',
    orderHash: legacy.id || '---',
    buyerName: legacy.buyerName,
    buyerPhone: legacy.buyerPhone,
    buyerAddress: legacy.buyerAddress,
    items: [
      {
        productId: legacy.id || '',
        name: legacy.name,
        image: legacy.image || undefined,
        quantity: Math.max(1, Number(legacy.quantity) || 1),
        total: legacy.price,
      },
    ],
    total: legacy.price,
  };
}

function getMessageSnippet(message: MessageItem, chatName: string) {
  if (message.callEvent) {
    const title = getCallCardTitle(message.callEvent);
    const detail = getCallCardDetail(message);
    return detail ? `${title} · ${detail}` : title;
  }

  const productInquiry = getProductInquiryContext(message);
  if (productInquiry) {
    return `🛍️ Hỏi về sản phẩm: ${productInquiry.name}`;
  }

  return getMessageReplyPreviewText(
    createMessageReplyReference(message, message.senderName || chatName),
  );
}

function ReplyMessageBubble({
  reply,
  replyText,
  isSentByMe,
}: {
  reply: MessageReplyReference;
  replyText: string;
  isSentByMe: boolean;
}) {
  const previewText = getMessageReplyPreviewText(reply);
  const previewImage = reply.thumbnail || reply.media;
  const replyBg = isSentByMe ? 'bg-white/15' : 'bg-black/5';
  const senderColor = isSentByMe ? 'text-white' : 'text-brand';
  const originalMessageColor = isSentByMe
    ? 'text-brand-on-muted'
    : 'text-slate-500';
  const replyTextColor = isSentByMe ? 'text-white' : 'text-slate-900';

  return (
    <View className="flex-col min-w-[190px] max-w-[260px] mt-0.5">
      {/* Original message frame */}
      <View
        className={`flex-row rounded-lg overflow-hidden ${replyBg} items-stretch`}
        style={{ minHeight: 42 }}
      >
        <View className={isSentByMe ? 'w-1 bg-white/70' : 'w-1 bg-brand'} />

        {/* Content column */}
        <View className="flex-1 pl-2 py-1.5 justify-center">
          <Text
            className={`text-[12px] font-bold ${senderColor}`}
            numberOfLines={1}
          >
            {reply.senderName}
          </Text>
          <Text
            className={`text-[11px] mt-0.5 ${originalMessageColor}`}
            numberOfLines={1}
          >
            {previewText}
          </Text>
        </View>

        {!!previewImage && reply.contentKind === 'image' && (
          <View className="justify-center px-1.5 py-1">
            <Image
              source={{ uri: previewImage }}
              className="w-9 h-9 rounded bg-slate-200"
              resizeMode="cover"
            />
          </View>
        )}
        {reply.contentKind !== 'text' && reply.contentKind !== 'image' && (
          <View className="justify-center px-1.5 py-1">
            <View className="h-9 w-9 items-center justify-center rounded bg-violet-100">
              {reply.contentKind === 'video' ? (
                <Play size={17} color="#7C3AED" fill="#7C3AED" />
              ) : reply.contentKind === 'audio' ? (
                <Mic size={17} color="#7C3AED" />
              ) : reply.contentKind === 'shared_post' ? (
                <Newspaper size={17} color="#7C3AED" />
              ) : reply.contentKind === 'location' ? (
                <MapPin size={17} color="#7C3AED" />
              ) : reply.contentKind === 'link' ? (
                <Link2 size={17} color="#7C3AED" />
              ) : reply.contentKind === 'video_call' ? (
                <Video size={17} color="#7C3AED" />
              ) : reply.contentKind === 'audio_call' ? (
                <Phone size={17} color="#7C3AED" />
              ) : reply.contentKind === 'story' ? (
                <MessageCircle size={17} color="#7C3AED" />
              ) : reply.contentKind === 'product' ||
                reply.contentKind === 'order' ? (
                <ShoppingBag size={17} color="#7C3AED" />
              ) : reply.contentKind === 'sticker' ? (
                <MessageCircle size={17} color="#7C3AED" />
              ) : (
                <FileText size={17} color="#7C3AED" />
              )}
            </View>
          </View>
        )}
      </View>

      {!!replyText && (
        <LinkifiedText
          text={replyText}
          className={`text-[15px] leading-5 mt-1.5 ${replyTextColor}`}
          linkColor={isSentByMe ? '#FFFFFF' : APP_COLORS.status.info}
        />
      )}
    </View>
  );
}

function ProductInquiryBubble({
  product,
}: {
  product: ProductInquiryContext;
}) {
  const cardBg = 'bg-white';
  const cardBorder = 'border-slate-200';
  const nameColor = 'text-slate-800';
  const priceColor = 'text-brand';
  const navigation = useNavigation<any>();

  const handlePressProduct = () => {
    if (product.productId) {
      navigation.navigate(ROUTES.PRODUCT_DETAIL, {
        productId: Number(product.productId),
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
        <Text
          className={`text-[13px] font-semibold leading-4 ${nameColor}`}
          numberOfLines={2}
        >
          {product.name}
        </Text>
        <Text className={`text-[12px] font-bold mt-1.5 ${priceColor}`}>
          {product.price}
        </Text>
        {!!product.location && (
          <Text
            className="text-[9.5px] mt-1 text-slate-400 font-medium"
            numberOfLines={1}
          >
            📍 {product.location}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function OrderInquiryBubble({
  order,
}: {
  order: OrderRequestContext;
}) {
  const navigation = useNavigation<any>();

  const handlePressProduct = (productId: string) => {
    if (productId) {
      navigation.navigate(ROUTES.PRODUCT_DETAIL, {
        productId: Number(productId),
      });
    }
  };

  return (
    <View
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      style={{ width: ORDER_REQUEST_CARD_WIDTH }}
    >
      <View className="flex-row items-center bg-brand px-3.5 py-2.5">
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-[12px] font-extrabold uppercase text-white">
            Yêu cầu mua
          </Text>
          <Text
            className="mt-0.5 text-[11px] font-bold text-brand-on-muted"
            numberOfLines={1}
            ellipsizeMode="middle"
            accessibilityLabel={`Mã yêu cầu mua ${order.orderHash}`}
          >
            #{order.orderHash}
          </Text>
        </View>
        <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
          <ShoppingBag size={16} color="#FFFFFF" />
        </View>
      </View>

      <View className="border-b border-slate-100">
        {order.items.map((item, index) => (
          <TouchableOpacity
            key={`${item.productId}-${index}`}
            activeOpacity={item.productId ? 0.85 : 1}
            disabled={!item.productId}
            onPress={() => handlePressProduct(item.productId)}
            className={`flex-row p-3 ${
              index < order.items.length - 1 ? 'border-b border-slate-100' : ''
            }`}
          >
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                className="mr-3 h-14 w-14 rounded-lg bg-slate-100"
                resizeMode="cover"
              />
            ) : (
              <View className="mr-3 h-14 w-14 items-center justify-center rounded-lg bg-slate-100">
                <ShoppingBag size={20} color="#64748b" />
              </View>
            )}
            <View className="flex-1 justify-center">
              <Text
                className="text-[13px] font-bold leading-4 text-slate-800"
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <View className="mt-1 flex-row items-center">
                <Text
                  className="min-w-0 flex-1 text-[12px] font-extrabold text-brand"
                  numberOfLines={1}
                >
                  {item.total}
                </Text>
                <Text className="ml-2 shrink-0 text-[11px] font-medium text-slate-500">
                  x{item.quantity}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View className="bg-slate-50 p-3.5">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-[11px] font-bold uppercase text-slate-400">
            Thông tin nhận hàng
          </Text>
          <Text className="text-[12px] font-extrabold text-brand">
            {order.total}
          </Text>
        </View>

        <Text className="text-[12px] font-bold text-slate-800">
          {order.buyerName || 'Người nhận'}
        </Text>
        {!!order.buyerPhone && (
          <Text className="mt-1 text-[12px] text-slate-600">
            {order.buyerPhone}
          </Text>
        )}
        {!!order.buyerAddress && (
          <Text className="mt-1 text-[12px] leading-4 text-slate-600">
            {order.buyerAddress}
          </Text>
        )}
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  avatar,
  chatName,
  showAvatar = true,
  onOpenMedia,
  onReply,
  onLongPress,
  onRecallCall,
  onPressReply,
  onQuickRecord,
  onOpenSharedPost,
  onOpenSharedPage,
  onDoubleTap,
}: {
  message: MessageItem;
  avatar: string;
  chatName: string;
  showAvatar?: boolean;
  onOpenMedia: OpenChatMedia;
  onReply?: (message: MessageItem) => void;
  onLongPress?: (message: MessageItem) => void;
  onRecallCall?: (callType: 'audio' | 'video') => void;
  onPressReply?: (originalMessageId: string) => void;
  onQuickRecord?: () => void;
  onOpenSharedPost?: (target: SharedPostOpenTarget) => void;
  onOpenSharedPage?: (page: PagesItem) => void;
  onDoubleTap?: (message: MessageItem) => void;
}) {
  const isSentByMe = message.callEvent
    ? message.callEvent.isInitiator
    : message.isSentByMe;

  const isMediaOnly =
    !message.callEvent &&
    !message.message &&
    ['image', 'video', 'audio'].includes(message.mediaType ?? '');
  const hasMessageMedia =
    !message.callEvent &&
    Boolean(message.media) &&
    ['image', 'video', 'audio'].includes(message.mediaType ?? '');

  const orderInquiry = getOrderRequestContext(message);
  const productInquiry = getProductInquiryContext(message);
  const replyInfo = message.replyTo;
  const sharedPost = message.sharedPost;
  const storyReply = message.storyReply;
  const parsedMapShare =
    sharedPost ? null : parseSharedMapMessage(message.message);
  const mapShare = message.location
    ? {
        location: message.location,
        caption: parsedMapShare?.caption ?? '',
        url: parsedMapShare?.url ?? buildMapShareUrl(message.location),
      }
    : parsedMapShare;
  const linkCaption = message.link
    ? getMessageLinkCaption(message.message)
    : '';
  const visibleMessageText = storyReply
    ? ''
    : sharedPost
    ? ''
    : orderInquiry
    ? ''
    : productInquiry
    ? productInquiry.note || 'Sản phẩm này còn hàng không ạ?'
    : mapShare
    ? mapShare.caption
    : message.message;
  const messageTextClassName = `text-[15px] leading-5 ${
    isSentByMe && !replyInfo ? 'text-white' : 'text-gray-900'
  }`;
  const messageLinkColor = isSentByMe && !replyInfo
    ? '#ffffff'
    : APP_COLORS.status.info;
  const usesLightReplyBubble =
    Boolean(replyInfo) && !hasMessageMedia && !isMediaOnly;

  const translateX = useRef(new Animated.Value(0)).current;
  const replyIconOpacity = useRef(new Animated.Value(0)).current;
  const replySwipeMaxDistance = 60;
  const replySwipeTriggerDistance = 45;
  const ReplySwipeIcon = isSentByMe ? CornerUpRight : CornerUpLeft;
  const replyCueTranslateX = replyIconOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [isSentByMe ? -14 : 14, 0],
  });
  const replyCueScale = replyIconOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });
  const replyCueBackgroundColor = replyIconOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [APP_COLORS.brand.soft, APP_COLORS.brand.softPressed],
  });
  const replyCueBorderColor = replyIconOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [APP_COLORS.brand.border, APP_BRAND_COLOR],
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const isReplySwipe = isSentByMe ? dx > 10 : dx < -10;
        return isReplySwipe && Math.abs(dy) < 8;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const isReplySwipe = isSentByMe ? dx > 10 : dx < -10;
        return isReplySwipe && Math.abs(dy) < 8;
      },
      onPanResponderMove: (_, gestureState) => {
        const drag = gestureState.dx;
        if (isSentByMe) {
          if (drag > 0) {
            translateX.setValue(Math.min(drag, replySwipeMaxDistance));
            replyIconOpacity.setValue(
              Math.min(drag / replySwipeTriggerDistance, 1),
            );
          } else {
            translateX.setValue(Math.max(drag, -20));
            replyIconOpacity.setValue(0);
          }
        } else {
          if (drag < 0) {
            translateX.setValue(Math.max(drag, -replySwipeMaxDistance));
            replyIconOpacity.setValue(
              Math.min(Math.abs(drag) / replySwipeTriggerDistance, 1),
            );
          } else {
            translateX.setValue(Math.min(drag, 20));
            replyIconOpacity.setValue(0);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const drag = gestureState.dx;
        const shouldOpenReply = isSentByMe
          ? drag > replySwipeTriggerDistance
          : drag < -replySwipeTriggerDistance;
        if (shouldOpenReply && onReply) {
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
    }),
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
          ...(isSentByMe ? { left: 16 } : { right: 16 }),
          top: '25%',
          zIndex: 30,
          elevation: 20,
          flexDirection: isSentByMe ? 'row' : 'row-reverse',
          alignItems: 'center',
          borderRadius: 999,
          borderWidth: 1,
          borderColor: APP_COLORS.brand.border,
          backgroundColor: APP_COLORS.brand.onPrimary,
          paddingHorizontal: 7,
          paddingVertical: 5,
          shadowColor: APP_COLORS.brand.shadow,
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          transform: [
            {
              translateX: replyCueTranslateX,
            },
            {
              scale: replyCueScale,
            },
          ],
        }}
        pointerEvents="none"
      >
        <Animated.View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: replyCueBackgroundColor,
            borderWidth: 1,
            borderColor: replyCueBorderColor,
            shadowColor: APP_COLORS.brand.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.18,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <ReplySwipeIcon size={18} color={APP_BRAND_COLOR} />
        </Animated.View>
        <Animated.Text
          style={{
            marginHorizontal: 7,
            color: APP_BRAND_COLOR,
            fontSize: 11.5,
            fontWeight: '800',
            letterSpacing: 0.1,
          }}
        >
          Trả lời tin nhắn
        </Animated.Text>
      </Animated.View>

      {/* Sliding message row */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        className={`flex-row ${
          isSentByMe ? 'justify-end' : 'justify-start'
        } items-end`}
      >
        {!isSentByMe &&
          (showAvatar ? (
            <Image
              source={{ uri: avatar }}
              className="mr-2 mb-1 h-7 w-7 rounded-full bg-gray-200"
              fadeDuration={0}
              resizeMethod="resize"
            />
          ) : (
            <View className="w-7 mr-2" />
          ))}

        {isSentByMe && message.mediaType === 'audio' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onQuickRecord}
            className="h-8 w-8 rounded-full justify-center items-center bg-slate-100 border border-slate-200 mr-2 mb-1"
          >
            <Mic size={15} color="#475569" />
          </TouchableOpacity>
        )}

        <View
          className={`flex-col max-w-[78%] ${
            isSentByMe ? 'items-end' : 'items-start'
          }`}
        >
          {/* Shared Post Card (renders instead of the raw URL bubble) */}
          {storyReply ? (
            <View className={`mb-1 ${isSentByMe ? 'self-end' : 'self-start'}`}>
              <StoryReplyMessageCard
                reference={storyReply}
                replyText={message.message}
                isSentByMe={Boolean(isSentByMe)}
                conversationName={chatName}
                statusText={
                  message.deliveryState === 'sending'
                    ? 'Đang gửi...'
                    : message.deliveryState === 'failed'
                    ? 'Gửi thất bại'
                    : formatMessageTime(message.time)
                }
                statusIsError={message.deliveryState === 'failed'}
                onLongPress={() => onLongPress?.(message)}
                onDoubleTap={() => onDoubleTap?.(message)}
              />
            </View>
          ) : sharedPost ? (
            <View className={`mb-1 ${isSentByMe ? 'self-end' : 'self-start'}`}>
              <SharedPostMessageCard
                reference={sharedPost}
                onOpenPost={target => onOpenSharedPost?.(target)}
                onLongPress={() => onLongPress?.(message)}
                onDoubleTap={() => onDoubleTap?.(message)}
              />
              <Text
                className={`mt-1 text-[9.5px] ${
                  message.deliveryState === 'failed'
                    ? 'text-red-600'
                    : 'text-gray-400'
                } ${isSentByMe ? 'text-right' : 'text-left'}`}
              >
                {message.deliveryState === 'sending'
                  ? 'Đang gửi...'
                  : message.deliveryState === 'failed'
                  ? 'Gửi thất bại'
                  : formatMessageTime(message.time)}
              </Text>
            </View>
          ) : mapShare ? (
            <DoubleTapTouchable
              className={`mb-1 ${isSentByMe ? 'self-end' : 'self-start'}`}
              style={styles.mapShareMessageWrap}
              activeOpacity={0.96}
              onLongPress={() => onLongPress?.(message)}
              onDoubleTap={() => onDoubleTap?.(message)}
            >
              <MapShareCard
                location={mapShare.location}
                caption={mapShare.caption}
                isSentByMe={isSentByMe ?? false}
                onLongPress={() => onLongPress?.(message)}
              />
              <Text
                className={`text-[9.5px] mt-1 ${
                  isSentByMe
                    ? 'text-gray-400 text-right'
                    : 'text-gray-400 text-left'
                }`}
              >
                {formatMessageTime(message.time)}
              </Text>
            </DoubleTapTouchable>
          ) : message.link ? (
            <View className={`mb-1 ${isSentByMe ? 'self-end' : 'self-start'}`}>
              <MessageLinkPreviewCard
                reference={message.link}
                caption={linkCaption}
                isSentByMe={Boolean(isSentByMe)}
                onLongPress={() => onLongPress?.(message)}
                onDoubleTap={() => onDoubleTap?.(message)}
                onOpenPage={onOpenSharedPage}
              />
              <Text
                className={`mt-1 text-[9.5px] text-gray-400 ${
                  isSentByMe ? 'text-right' : 'text-left'
                }`}
              >
                {formatMessageTime(message.time)}
              </Text>
            </View>
          ) : orderInquiry ? (
            /* Order Inquiry Card (renders instead of the main text bubble) */
            <DoubleTapTouchable
              className={`mb-1 ${isSentByMe ? 'self-end' : 'self-start'}`}
              style={{ width: ORDER_REQUEST_CARD_WIDTH }}
              activeOpacity={0.96}
              onLongPress={() => onLongPress?.(message)}
              onDoubleTap={() => onDoubleTap?.(message)}
            >
              <OrderInquiryBubble
                order={orderInquiry}
              />
              <Text
                className={`text-[9.5px] mt-1 ${
                  isSentByMe
                    ? 'text-gray-400 text-right'
                    : 'text-gray-400 text-left'
                }`}
              >
                {formatMessageTime(message.time)}
              </Text>
            </DoubleTapTouchable>
          ) : (
            <>
              {/* Product Inquiry Card (outside bubble) */}
              {!!productInquiry && (
                <View className="mb-2 shadow-sm">
                  <ProductInquiryBubble
                    product={productInquiry}
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
                            ? 'rounded-2xl rounded-br-md bg-brand px-3 py-2'
                            : 'rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2'
                          : isSentByMe
                          ? 'rounded-2xl rounded-br-md bg-brand px-3 py-2'
                          : 'rounded-2xl rounded-bl-md bg-gray-100 px-3 py-2'
                      }`
                } ${message.deliveryState === 'sending' ? 'opacity-70' : ''}`}
              >
                <DoubleTapTouchable
                  activeOpacity={0.9}
                  onLongPress={() => onLongPress?.(message)}
                  onDoubleTap={() => onDoubleTap?.(message)}
                  delayLongPress={350}
                >
                  {message.callEvent ? (
                    <CallEventContent
                      message={message}
                      onRecall={onRecallCall}
                    />
                  ) : (
                    <>
                      <MessageMedia
                        message={message}
                        onOpenMedia={onOpenMedia}
                        onLongPress={() => onLongPress?.(message)}
                        onDoubleTap={() => onDoubleTap?.(message)}
                      />
                      {replyInfo ? (
                        hasMessageMedia ? (
                          <View
                            className={`mt-1 rounded-2xl px-3 py-2 ${
                              isSentByMe
                                ? 'rounded-br-md bg-brand'
                                : 'rounded-bl-md border border-gray-200 bg-white'
                            }`}
                            style={styles.mediaCaptionBubble}
                          >
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() =>
                                replyInfo.messageId &&
                                onPressReply?.(replyInfo.messageId)
                              }
                            >
                              <ReplyMessageBubble
                                reply={replyInfo}
                                replyText={visibleMessageText}
                                isSentByMe={Boolean(isSentByMe)}
                              />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() =>
                              replyInfo.messageId &&
                              onPressReply?.(replyInfo.messageId)
                            }
                          >
                            <ReplyMessageBubble
                              reply={replyInfo}
                              replyText={visibleMessageText}
                              isSentByMe={Boolean(isSentByMe)}
                            />
                          </TouchableOpacity>
                        )
                      ) : (
                        !!visibleMessageText &&
                        (hasMessageMedia ? (
                          <View
                            className={`mt-1 rounded-2xl px-3 py-2 ${
                              isSentByMe
                                ? 'rounded-br-md bg-brand'
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
                        ))
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
                          ? 'text-brand-on-muted'
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
                </DoubleTapTouchable>
              </View>
            </>
          )}
          <MessageReactionBadge
            summary={message.reactions}
            isSentByMe={Boolean(isSentByMe)}
          />
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
      prevProps.message.contentKind === nextProps.message.contentKind &&
      prevProps.message.link?.url === nextProps.message.link?.url &&
      prevProps.message.location?.latitude ===
        nextProps.message.location?.latitude &&
      prevProps.message.location?.longitude ===
        nextProps.message.location?.longitude &&
      prevProps.message.replyTo?.messageId ===
        nextProps.message.replyTo?.messageId &&
      prevProps.message.replyTo?.contentKind ===
        nextProps.message.replyTo?.contentKind &&
      prevProps.message.replyTo?.text === nextProps.message.replyTo?.text &&
      prevProps.message.replyTo?.media === nextProps.message.replyTo?.media &&
      prevProps.message.replyTo?.thumbnail ===
        nextProps.message.replyTo?.thumbnail &&
      prevProps.message.replyTo?.storyReply?.storyId ===
        nextProps.message.replyTo?.storyReply?.storyId &&
      prevProps.message.replyTo?.storyReply?.available ===
        nextProps.message.replyTo?.storyReply?.available &&
      prevProps.message.deliveryState === nextProps.message.deliveryState &&
      prevProps.message.seen === nextProps.message.seen &&
      prevProps.message.sharedPost?.postId ===
        nextProps.message.sharedPost?.postId &&
      prevProps.message.sharedPost?.url === nextProps.message.sharedPost?.url &&
      prevProps.message.sharedPost?.note ===
        nextProps.message.sharedPost?.note &&
      prevProps.message.storyReply?.storyId ===
        nextProps.message.storyReply?.storyId &&
      prevProps.message.storyReply?.available ===
        nextProps.message.storyReply?.available &&
      prevProps.message.storyReply?.thumbnailUrl ===
        nextProps.message.storyReply?.thumbnailUrl &&
      prevProps.message.storyReply?.caption ===
        nextProps.message.storyReply?.caption &&
      prevProps.chatName === nextProps.chatName &&
      areMessageReactionSummariesEqual(
        prevProps.message.reactions,
        nextProps.message.reactions,
      ) &&
      prevProps.avatar === nextProps.avatar &&
      prevProps.showAvatar === nextProps.showAvatar
    );
  },
);


function ChatImage({ uri }: { uri: string }) {
  const [dims, setDims] = useState<{ width: number; height: number } | null>(
    null,
  );

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
      },
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

function ChatVideoPreview({
  uri,
  thumbnail,
  cacheKey,
  compact = false,
}: {
  uri: string;
  thumbnail?: string;
  cacheKey?: string;
  compact?: boolean;
}) {
  const { width: viewportWidth, height: viewportHeight } =
    useWindowDimensions();
  const posterCacheKey = cacheKey || uri;
  const [generatedPosterUri, setGeneratedPosterUri] = useState(() => {
    if (thumbnail || !uri) return '';
    return getCachedVideoPosterThumbnail(uri, posterCacheKey)?.uri || '';
  });
  const [posterSize, setPosterSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (thumbnail || !uri) {
      setGeneratedPosterUri('');
      return;
    }

    const cachedPoster = getCachedVideoPosterThumbnail(
      uri,
      posterCacheKey,
    )?.uri;
    if (cachedPoster) {
      setGeneratedPosterUri(cachedPoster);
      return;
    }

    let cancelled = false;
    createCachedVideoPosterThumbnail(uri, posterCacheKey).then(poster => {
      if (cancelled || !poster?.uri) return;
      setGeneratedPosterUri(poster.uri);
    });

    return () => {
      cancelled = true;
    };
  }, [posterCacheKey, thumbnail, uri]);

  const posterUri = thumbnail || generatedPosterUri;
  const cachedPoster = !thumbnail
    ? getCachedVideoPosterThumbnail(uri, posterCacheKey)
    : undefined;

  useEffect(() => {
    if (cachedPoster?.width && cachedPoster.height) {
      setPosterSize({ width: cachedPoster.width, height: cachedPoster.height });
      return;
    }

    if (!posterUri) {
      setPosterSize(null);
      return;
    }

    let cancelled = false;
    Image.getSize(
      posterUri,
      (width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        setPosterSize({ width, height });
      },
      () => {
        if (!cancelled) setPosterSize(null);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [cachedPoster?.height, cachedPoster?.width, posterUri]);

  const videoFrameSize = useMemo(() => {
    if (compact) return undefined;

    const rawRatio =
      posterSize?.width && posterSize?.height
        ? posterSize.width / posterSize.height
        : 16 / 9;
    const ratio = Math.min(Math.max(rawRatio, 0.48), 2.35);
    const maxWidth = Math.min(Math.max(viewportWidth - 116, 210), 328);
    const maxHeight = Math.min(Math.max(viewportHeight * 0.32, 250), 380);

    let width = maxWidth;
    let height = width / ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }

    width = Math.max(176, Math.min(maxWidth, width));
    height = Math.max(112, Math.min(maxHeight, height));

    if (width / height > ratio) {
      width = height * ratio;
    } else {
      height = width / ratio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }, [
    compact,
    posterSize?.height,
    posterSize?.width,
    viewportHeight,
    viewportWidth,
  ]);

  return (
    <View
      style={[
        styles.videoPreviewShell,
        compact ? styles.videoPreviewFill : styles.videoPreviewLarge,
        !compact && videoFrameSize,
      ]}
    >
      <View style={styles.videoPreviewSurface}>
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={styles.videoPreviewBackdrop}
            resizeMode="cover"
            fadeDuration={140}
          />
        ) : (
          <View style={styles.videoPreviewBackdrop}>
            <Video size={compact ? 32 : 48} color="rgba(255,255,255,0.2)" />
          </View>
        )}
        <View style={styles.videoPreviewScrim} />
        <View
          className={`items-center justify-center rounded-full bg-white/95 shadow-md ${
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
      </View>
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
  onLongPress,
  onDoubleTap,
}: {
  message: MessageItem;
  onOpenMedia: OpenChatMedia;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
}) {
  if (!message.media) return null;

  if (message.mediaType === 'image') {
    return (
      <DoubleTapTouchable
        activeOpacity={0.9}
        delayLongPress={320}
        onSingleTap={() =>
          onOpenMedia({ uri: message.media!, type: 'image' })
        }
        onLongPress={onLongPress}
        onDoubleTap={onDoubleTap}
      >
        <ChatImage uri={message.media} />
      </DoubleTapTouchable>
    );
  }

  if (message.mediaType === 'video') {
    return (
      <DoubleTapTouchable
        activeOpacity={0.9}
        delayLongPress={320}
        onSingleTap={() =>
          onOpenMedia({ uri: message.media!, type: 'video' })
        }
        onLongPress={onLongPress}
        onDoubleTap={onDoubleTap}
      >
        <ChatVideoPreview
          uri={message.media}
          thumbnail={message.thumbnail}
          cacheKey={message.id}
        />
      </DoubleTapTouchable>
    );
  }

  if (message.mediaType === 'audio') {
    return (
      <View className="w-64">
        <AudioPlayer uri={message.media} compact accentColor={APP_BRAND_COLOR} />
      </View>
    );
  }

  return null;
}

function MediaMessageGroup({
  messages,
  avatar,
  onOpenMedia,
  onLongPress,
  onDoubleTap,
}: {
  messages: MessageItem[];
  avatar: string;
  onOpenMedia: OpenChatMedia;
  onLongPress?: (message: MessageItem) => void;
  onDoubleTap?: (message: MessageItem) => void;
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
    type:
      message.mediaType === 'video' ? ('video' as const) : ('image' as const),
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
            <DoubleTapTouchable
              key={message.id}
              activeOpacity={0.9}
              delayLongPress={320}
              onLongPress={() => onLongPress?.(message)}
              onDoubleTap={() => onDoubleTap?.(message)}
              onSingleTap={() => {
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
                  cacheKey={message.id}
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
              {message.reactions.total > 0 ? (
                <View style={styles.imageGalleryReactionBadge}>
                  <MessageReactionBadge
                    summary={message.reactions}
                    isSentByMe={message.isSentByMe}
                  />
                </View>
              ) : null}
            </DoubleTapTouchable>
          ))}
        </View>
        {captions.length > 0 ? (
          <View
            className={`mt-1 rounded-2xl px-3 py-2 ${
              newestMessage.isSentByMe
                ? 'rounded-br-md bg-brand'
                : 'rounded-bl-md border border-gray-200 bg-white'
            }`}
          >
            <LinkifiedText
              text={captions.join('\n')}
              className={`text-[15px] leading-5 ${
                newestMessage.isSentByMe ? 'text-white' : 'text-gray-900'
              }`}
              linkColor={
                newestMessage.isSentByMe
                  ? '#ffffff'
                  : APP_COLORS.status.info
              }
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

function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { chat } = route.params;
  const isScreenFocused = useIsFocused();
  const language = useAppLanguage();
  const copy = CHAT_COPY[language];
  const insets = useSafeAreaInsets();
  const {
    messages,
    groupInfo,
    isLoading,
    isLoadingMore,
    hasMore,
    isTyping,
    isRecording,
    pinnedMessages,
    isLoadingPinnedMessages,
    error,
    loadInitial,
    loadOlder,
    loadMessageContext,
    setMessagePinned,
    setMessageReaction,
    sendMessage,
    notifyTyping,
    stopTyping,
    loadGroupInfo,
  } = useChatViewModel(chat, isScreenFocused);

  const [text, setText] = useState('');
  const [replyingMessage, setReplyingMessage] = useState<
    MessageItem | undefined
  >(undefined);
  const [selectedOptionMessage, setSelectedOptionMessage] = useState<
    MessageItem | undefined
  >(undefined);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string>();
  const [attachedProduct, setAttachedProduct] = useState<
    ProductItem | undefined
  >(route.params?.product);
  const [sharedMapLocation, setSharedMapLocation] = useState<
    SharedMapLocation | undefined
  >(route.params?.sharedMapLocation);
  const [isPickingCurrentLocation, setIsPickingCurrentLocation] =
    useState(false);
  const isPickingCurrentLocationRef = useRef(false);

  useEffect(() => {
    if (route.params?.product) {
      setAttachedProduct(route.params.product);
    }
  }, [route.params?.product]);

  useEffect(() => {
    const nextLocation = route.params?.sharedMapLocation;
    if (!nextLocation) return;

    setSharedMapLocation(nextLocation);
    navigation.setParams({ sharedMapLocation: undefined });
  }, [navigation, route.params?.sharedMapLocation]);

  useEffect(() => {
    if (!sharedMapLocation) return;
    prefetchStaticMapPreview(sharedMapLocation);
  }, [sharedMapLocation]);

  const handleRemoveSharedMapLocation = useCallback(() => {
    setSharedMapLocation(undefined);
  }, []);

  useEffect(() => {
    const initialText = route.params?.initialText;
    if (!initialText) return;

    const mapShare = parseSharedMapMessage(initialText);
    if (mapShare) {
      setSharedMapLocation(mapShare.location);
      setText(current =>
        current.trim().length > 0 ? current : mapShare.caption,
      );
      if (mapShare.caption) {
        notifyTyping(mapShare.caption);
      }
      navigation.setParams({ initialText: undefined });
      return;
    }

    setText(current => (current.trim().length > 0 ? current : initialText));
    notifyTyping(initialText);
    navigation.setParams({ initialText: undefined });
  }, [navigation, notifyTyping, route.params?.initialText]);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [viewerMediaItems, setViewerMediaItems] = useState<
    ChatMediaViewerItem[]
  >([]);
  const [viewerMediaIndex, setViewerMediaIndex] = useState(0);
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
  const pinnedHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
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
    Boolean(text.trim()) ||
    attachments.length > 0 ||
    recorder.isRecording ||
    Boolean(attachedProduct) ||
    Boolean(sharedMapLocation);
  const audioAttachment = useMemo(
    () => attachments.find(attachment => attachment.mediaType === 'audio'),
    [attachments],
  );
  const visualAttachments = useMemo(
    () => attachments.filter(attachment => attachment.mediaType !== 'audio'),
    [attachments],
  );
  const messageItems = useMemo(
    () => buildChatMessageListItems(messages).reverse(),
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
  const scrollToLatest = useCallback((animated: boolean) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated });
    });
  }, []);

  const handleComposerFocus = useCallback(() => {
    setTimeout(() => scrollToLatest(true), Platform.OS === 'ios' ? 80 : 0);
  }, [scrollToLatest]);

  const handlePressReply = useCallback((originalMessageId: string) => {
    const index = findConversationMessageListItemIndex(
      messageItemsRef.current,
      originalMessageId,
    );
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

  const handleOpenPinnedMessage = useCallback(
    async (messageId: string) => {
      await loadMessageContext(messageId);
      setHighlightedMessageId(messageId);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => handlePressReply(messageId));
      });
      if (pinnedHighlightTimeoutRef.current) {
        clearTimeout(pinnedHighlightTimeoutRef.current);
      }
      pinnedHighlightTimeoutRef.current = setTimeout(() => {
        setHighlightedMessageId(current =>
          current === messageId ? undefined : current,
        );
        pinnedHighlightTimeoutRef.current = null;
      }, 1800);
    },
    [handlePressReply, loadMessageContext],
  );

  useEffect(
    () => () => {
      if (pinnedHighlightTimeoutRef.current) {
        clearTimeout(pinnedHighlightTimeoutRef.current);
      }
    },
    [],
  );

  const handleMessageScrollToIndexFailed = useCallback(
    ({
      index,
      averageItemLength,
    }: {
      index: number;
      averageItemLength: number;
    }) => {
      flatListRef.current?.scrollToOffset({
        offset: Math.max(0, averageItemLength * index),
        animated: false,
      });
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      }, 100);
    },
    [],
  );

  useEffect(() => {
    const highlightMessageId = route.params?.highlightMessageId;
    if (!highlightMessageId) return undefined;

    let cancelled = false;
    let highlightTimeout: ReturnType<typeof setTimeout> | undefined;
    loadMessageContext(highlightMessageId)
      .then(() => {
        if (cancelled) return;
        setHighlightedMessageId(highlightMessageId);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => handlePressReply(highlightMessageId));
        });
        navigation.setParams({ highlightMessageId: undefined });
        highlightTimeout = setTimeout(() => {
          if (!cancelled) setHighlightedMessageId(undefined);
        }, 1800);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (highlightTimeout) clearTimeout(highlightTimeout);
    };
  }, [
    handlePressReply,
    loadMessageContext,
    navigation,
    route.params?.highlightMessageId,
  ]);

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

  useEffect(() => {
    const handleKeyboardFrameChange = (event: KeyboardEvent) => {
      const windowHeight = Dimensions.get('window').height;
      const keyboardIsVisible =
        event.endCoordinates.height > 0 &&
        event.endCoordinates.screenY < windowHeight;
      setIsKeyboardVisible(keyboardIsVisible);
      if (keyboardIsVisible) {
        setTimeout(() => scrollToLatest(true), 80);
      }
    };

    if (Platform.OS === 'ios') {
      const frameSub = Keyboard.addListener(
        'keyboardWillChangeFrame',
        handleKeyboardFrameChange,
      );
      const hideSub = Keyboard.addListener('keyboardWillHide', () => {
        setIsKeyboardVisible(false);
      });
      return () => {
        frameSub.remove();
        hideSub.remove();
      };
    }

    const showSub = Keyboard.addListener(
      'keyboardDidShow',
      handleKeyboardFrameChange,
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
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

  const handleContentSizeChange = useCallback(
    (_width?: number, height?: number) => {
      if (messages.length === 0) return;
      const nextContentHeight =
        typeof height === 'number'
          ? height
          : scrollMetricsRef.current.contentHeight;
      scrollMetricsRef.current.contentHeight = nextContentHeight;
    },
    [messages.length],
  );

  const handleLoadOlder = useCallback(() => {
    if (
      messageItems.length === 0 ||
      isLoadingMore ||
      loadingOlderRef.current ||
      !hasMore
    ) {
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
    },
    [],
  );

  const handleCloseMedia = useCallback(() => {
    setViewerMediaItems([]);
    setViewerMediaIndex(0);
  }, []);

  const handleOpenSharedPost = useCallback(
    (target: SharedPostOpenTarget) => {
      if (
        target.kind === 'product' &&
        target.productId !== undefined &&
        target.productId > 0
      ) {
        navigation.navigate(ROUTES.PRODUCT_DETAIL, {
          productId: target.productId,
        });
        return;
      }

      if (target.kind === 'job' && target.jobId && target.job) {
        navigation.navigate(ROUTES.JOB_DETAIL, {
          jobId: target.jobId,
          job: target.job,
        });
        return;
      }

      navigation.navigate(ROUTES.POST_DETAIL, { postId: target.postId });
    },
    [navigation],
  );

  const handleOpenSharedPage = useCallback(
    (page: PagesItem) => {
      navigation.navigate(ROUTES.PAGE_DETAIL, { page });
    },
    [navigation],
  );

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

    if (
      !text.trim() &&
      pendingAttachments.length === 0 &&
      !attachedProduct &&
      !sharedMapLocation
    ) {
      return;
    }

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
    let productInquiry: SendMessageOptions['productInquiry'];
    if (attachedProduct) {
      const currencySymbol =
        attachedProduct.currency_symbol ||
        attachedProduct.currency_code ||
        attachedProduct.currency ||
        'VNSEEA';
      const formattedPrice = formatPrice(attachedProduct.price, currencySymbol);
      const imageUrl = attachedProduct.images?.[0]?.image || '';
      nextText = text.trim() || 'Mặt hàng này còn không bạn?';
      productInquiry = {
        productId: String(attachedProduct.id),
        note: nextText,
        name: attachedProduct.name,
        price: formattedPrice,
        image: imageUrl || undefined,
        location: attachedProduct.location || undefined,
      };

      setAttachedProduct(undefined);
    } else if (sharedMapLocation) {
      const mapUrl = buildMapShareUrl(sharedMapLocation);
      nextText = [nextText.trim(), mapUrl].filter(Boolean).join('\n');
      setSharedMapLocation(undefined);
    }

    const replyTo = replyingMessage
      ? createMessageReplyReference(
          replyingMessage,
          replyingMessage.isSentByMe
            ? 'Bạn'
            : replyingMessage.senderName || chat.name || 'Người dùng',
        )
      : undefined;
    if (replyingMessage) setReplyingMessage(undefined);

    const nextAttachments = pendingAttachments;
    const groupableAttachmentCount = nextAttachments.filter(
      attachment =>
        attachment.mediaType === 'image' || attachment.mediaType === 'video',
    ).length;
    const mediaGroupId =
      groupableAttachmentCount > 1
        ? `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        : undefined;
    setText('');
    stopTyping();
    setAttachments([]);

    if (nextAttachments.length === 0) {
      await sendMessage(nextText, undefined, {
        ...(replyTo ? { replyTo } : {}),
        ...(productInquiry ? { productInquiry } : {}),
      });
    } else {
      for (const [index, attachment] of nextAttachments.entries()) {
        const attachmentOptions: SendMessageOptions = {
          ...(index === 0 && replyTo ? { replyTo } : {}),
          ...(index === 0 && productInquiry ? { productInquiry } : {}),
          ...(mediaGroupId &&
          (attachment.mediaType === 'image' || attachment.mediaType === 'video')
            ? { mediaGroupId }
            : {}),
        };
        await sendMessage(
          index === 0 ? nextText : '',
          attachment,
          attachmentOptions,
        );
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
    sharedMapLocation,
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
      showSnackbar({ message: 'Đã sao chép tin nhắn', type: 'success' });
    } catch (e) {
      console.warn(e);
    } finally {
      setSelectedOptionMessage(undefined);
    }
  }, [selectedOptionMessage]);

  const handleSelectOptionPin = useCallback(async () => {
    if (!selectedOptionMessage) return;
    const pinnedMessage = pinnedMessages.find(
      message => message.id === selectedOptionMessage.id,
    );
    const isPinned = Boolean(pinnedMessage);
    if (pinnedMessage && !pinnedMessage.canUnpin) {
      showSnackbar({
        message: `${pinnedMessage.pinnedByName} đã ghim tin nhắn này. Chỉ người ghim mới có thể bỏ ghim.`,
        type: 'info',
      });
      setSelectedOptionMessage(undefined);
      return;
    }
    try {
      await setMessagePinned(selectedOptionMessage.id, !isPinned);
      showSnackbar({
        message: isPinned ? 'Đã bỏ ghim tin nhắn' : 'Đã ghim tin nhắn',
        type: 'success',
      });
    } catch (error) {
      Alert.alert(
        'Không thể ghim tin nhắn',
        error instanceof Error ? error.message : 'Vui lòng thử lại.',
      );
    } finally {
      setSelectedOptionMessage(undefined);
    }
  }, [pinnedMessages, selectedOptionMessage, setMessagePinned]);

  const handleMessageReaction = useCallback(
    async (message: MessageItem, reaction: ReactionType | null) => {
      setSelectedOptionMessage(undefined);
      try {
        await setMessageReaction(message.id, reaction);
      } catch (reactionError) {
        showSnackbar({
          message:
            reactionError instanceof Error
              ? reactionError.message
              : 'Không thể cập nhật cảm xúc.',
          type: 'error',
        });
      }
    },
    [setMessageReaction],
  );

  const handleDoubleTapMessage = useCallback(
    (message: MessageItem) => {
      const reaction =
        message.reactions.myReaction === 'like' ? null : 'like';
      handleMessageReaction(message, reaction).catch(() => undefined);
    },
    [handleMessageReaction],
  );

  const handleSendProductInquiryOption = useCallback(
    async (optionText: string) => {
      if (!attachedProduct) return;
      const currencySymbol =
        attachedProduct.currency_symbol ||
        attachedProduct.currency_code ||
        attachedProduct.currency ||
        'VNSEEA';
      const formattedPrice = formatPrice(attachedProduct.price, currencySymbol);
      const imageUrl = attachedProduct.images?.[0]?.image || '';
      setAttachedProduct(undefined);
      await sendMessage(optionText, undefined, {
        productInquiry: {
          productId: String(attachedProduct.id),
          note: optionText,
          name: attachedProduct.name,
          price: formattedPrice,
          image: imageUrl || undefined,
          location: attachedProduct.location || undefined,
        },
      });
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

  const handleShareCurrentLocation = useCallback(async () => {
    if (isPickingCurrentLocationRef.current) return;

    isPickingCurrentLocationRef.current = true;
    setIsPickingCurrentLocation(true);
    try {
      const location = await getCurrentDeviceLocation();
      const currentProfile = sessionStorage.getUserProfile();
      const nextMapLocation: SharedMapLocation = {
        title: 'Vị trí của bạn',
        subtitle: 'Vị trí hiện tại được chia sẻ',
        address: 'Vị trí hiện tại',
        latitude: location.latitude,
        longitude: location.longitude,
        imageUrl: currentProfile?.avatarUrl,
      };
      prefetchStaticMapPreview(nextMapLocation);
      setSharedMapLocation(nextMapLocation);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : 'Không lấy được vị trí hiện tại của bạn.';
      Alert.alert('Không thể chia sẻ vị trí', message);
    } finally {
      isPickingCurrentLocationRef.current = false;
      setIsPickingCurrentLocation(false);
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
          direction: 'outgoing' as const,
          groupName: chat.name,
          groupAvatar: chat.avatar,
        };
        startGroupCall(callParams);
        navigation.navigate(ROUTES.GROUP_CALL_ROOM, callParams);
        return;
      }

      const recipientId = chat.participantId || chat.userId;
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
          <View
            style={
              item.messages.some(message => message.id === highlightedMessageId)
                ? styles.highlightedMessage
                : undefined
            }
          >
            <MemoizedMediaMessageGroup
              messages={item.messages}
              avatar={chat.avatar}
              onOpenMedia={handleOpenMedia}
              onLongPress={setSelectedOptionMessage}
              onDoubleTap={handleDoubleTapMessage}
            />
          </View>
        );
      }

      if (item.message.systemEvent) {
        return (
          <PinnedMessageSystemRow
            event={item.message.systemEvent}
            isMine={item.message.isSentByMe}
            language={language}
            onOpenMessage={messageId => {
              handleOpenPinnedMessage(messageId).catch(error => {
                showSnackbar({
                  message:
                    error instanceof Error
                      ? error.message
                      : 'Không mở được tin nhắn đã ghim.',
                  type: 'error',
                });
              });
            }}
          />
        );
      }

      const showAvatar =
        item.kind === 'message' && !item.message.isSentByMe
          ? (() => {
              const currentIndex = messageItems.findIndex(
                x => x.id === item.id,
              );
              if (currentIndex <= 0) return true;
              const successor = messageItems[currentIndex - 1];
              if (!successor || successor.kind !== 'message') return true;
              return successor.message.isSentByMe;
            })()
          : false;

      return (
        <View
          style={
            item.message.id === highlightedMessageId
              ? styles.highlightedMessage
              : undefined
          }
        >
          <MemoizedMessageBubble
            message={item.message}
            avatar={chat.avatar}
            chatName={chat.name}
            showAvatar={showAvatar}
            onOpenMedia={handleOpenMedia}
            onReply={setReplyingMessage}
            onLongPress={setSelectedOptionMessage}
            onRecallCall={handleStartConversationCall}
            onPressReply={handlePressReply}
            onQuickRecord={handleQuickRecord}
            onOpenSharedPost={handleOpenSharedPost}
            onOpenSharedPage={handleOpenSharedPage}
            onDoubleTap={handleDoubleTapMessage}
          />
        </View>
      );
    },
    [
      chat.avatar,
      chat.name,
      highlightedMessageId,
      messageItems,
      handleOpenMedia,
      handleStartConversationCall,
      handlePressReply,
      handleQuickRecord,
      handleOpenSharedPost,
      handleOpenSharedPage,
      handleDoubleTapMessage,
      handleOpenPinnedMessage,
      language,
    ],
  );

  const conversationPartnerId = useMemo(() => {
    if (chat.chatType !== 'user') return '';
    return chat.participantId || chat.userId || '';
  }, [chat.chatType, chat.participantId, chat.userId]);

  const handleOpenConversationInfo = useCallback(() => {
    if (chat.chatType === 'group') {
      navigation.navigate(ROUTES.GROUP_INFO, { chat });
      return;
    }
    if (chat.chatType === 'user' && conversationPartnerId) {
      navigation.navigate(ROUTES.CONVERSATION_DETAILS, { chat });
    }
  }, [chat, conversationPartnerId, navigation]);

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
  }, [
    chat.chatType,
    chat.name,
    chat.username,
    groupInfo?.memberCount,
    language,
  ]);

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

    if (chat.chatType === 'group') {
      return [
        {
          key: 'video',
          icon: <Video size={22} color={APP_BRAND_COLOR} />,
          onPress: () => handleStartConversationCall('video'),
        },
        {
          key: 'info',
          icon: <Info size={21} color={APP_BRAND_COLOR} />,
          onPress: handleOpenConversationInfo,
        },
      ];
    }

    return [
      {
        key: 'audio',
        icon: <Phone size={21} color={APP_BRAND_COLOR} />,
        onPress: () => handleStartConversationCall('audio'),
      },
      {
        key: 'video',
        icon: <Video size={22} color={APP_BRAND_COLOR} />,
        onPress: () => handleStartConversationCall('video'),
      },
    ];
  }, [chat.chatType, handleOpenConversationInfo, handleStartConversationCall]);

  const selectedPinnedMessage = selectedOptionMessage
    ? pinnedMessages.find(message => message.id === selectedOptionMessage.id)
    : undefined;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={CHAT_SAFE_AREA_EDGES}>
      <KeyboardSafeView
        style={styles.keyboardBoundary}
        behavior="padding"
        resetOnAndroidKeyboardHide
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="flex-row items-center border-b border-gray-200 px-3 py-2">
          {Platform.OS !== 'ios' && (
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={22} color="#050505" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="flex-1 flex-row items-center"
            activeOpacity={0.7}
            onPress={handleOpenConversationInfo}
          >
            <Image
              source={{ uri: chat.avatar }}
              className="h-11 w-11 rounded-full"
            />
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
          </TouchableOpacity>
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

        <PinnedMessagesBanner
          pinnedMessages={pinnedMessages}
          partnerName={chat.name}
          isLoading={isLoadingPinnedMessages}
          onOpenMessage={messageId => {
            handleOpenPinnedMessage(messageId).catch(error => {
              showSnackbar({
                message:
                  error instanceof Error
                    ? error.message
                    : 'Không mở được tin nhắn đã ghim.',
                type: 'error',
              });
            });
          }}
        />

        {/* Messages */}
        {isLoading ? (
          <ChatMessagesSkeleton />
        ) : (
          <FlatList<ChatMessageListItem>
            key={chat.id}
            ref={flatListRef}
            data={messageItems}
            keyExtractor={item => `${getChatListItemType(item)}:${item.id}`}
            renderItem={renderMessageItem}
            contentContainerStyle={messageListContentStyle}
            inverted
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            onScroll={handleScroll}
            onContentSizeChange={handleContentSizeChange}
            scrollEventThrottle={16}
            removeClippedSubviews={true}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
            onEndReached={handleLoadOlder}
            onEndReachedThreshold={2.0}
            onScrollToIndexFailed={handleMessageScrollToIndexFailed}
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
                  color={APP_BRAND_COLOR}
                />
              ) : !hasMore ? (
                <View className="items-center justify-center py-10 px-4">
                  <View className="relative">
                    <Image
                      source={{ uri: chat.avatar }}
                      className="h-24 w-24 rounded-full border-4 border-brand-on-muted shadow-md"
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
            <ChevronDown size={25} color={APP_BRAND_COLOR} strokeWidth={2.6} />
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
                accentColor={APP_BRAND_COLOR}
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
                  <Text
                    className="text-sm font-bold text-slate-800"
                    numberOfLines={1}
                  >
                    {attachedProduct.name}
                  </Text>
                  <Text
                    className="text-xs font-semibold text-brand mt-0.5"
                    numberOfLines={1}
                  >
                    {formatPrice(
                      attachedProduct.price,
                      attachedProduct.currency_symbol ||
                        attachedProduct.currency_code ||
                        attachedProduct.currency ||
                        'VNSEEA',
                    )}
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

            {/* Quick Product Inquiry Options */}
            <View style={styles.productInquiryPanel}>
              <View className="mb-2 flex-row items-center justify-between">
                <View className="min-w-0 flex-1">
                  <Text className="text-[13px] font-extrabold text-slate-900">
                    Câu hỏi nhanh
                  </Text>
                  <Text className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    Chọn một nội dung phù hợp để gửi cho người bán
                  </Text>
                </View>
              </View>
              <View style={styles.productInquiryOptionGrid}>
                {PRODUCT_INQUIRY_QUICK_OPTIONS.map(option => {
                  const OptionIcon = option.icon;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() =>
                        handleSendProductInquiryOption(option.message)
                      }
                      style={styles.productInquiryOptionCard}
                      activeOpacity={0.82}
                    >
                      <View style={styles.productInquiryOptionIcon}>
                        <OptionIcon size={15} color={APP_BRAND_COLOR} />
                      </View>
                      <View style={styles.productInquiryOptionCopy}>
                        <Text
                          style={styles.productInquiryOptionTitle}
                          numberOfLines={2}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={styles.productInquiryOptionHint}
                          numberOfLines={1}
                        >
                          {option.hint}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {sharedMapLocation ? (
          <View style={styles.mapShareComposerWrap}>
            <MapShareCard
              location={sharedMapLocation}
              composer
              onRemove={handleRemoveSharedMapLocation}
            />
          </View>
        ) : null}

        {/* Reply Preview Bar */}
        {replyingMessage ? (
          <View className="flex-row items-center justify-between border-t border-gray-100 bg-white px-4 py-2">
            <View className="min-w-0 flex-1 flex-row items-center">
              <View className="mr-2.5 h-11 w-0.5 rounded-full bg-brand" />
              <View className="min-w-0 flex-1 justify-center">
                <Text
                  className="text-[12px] font-bold text-gray-900"
                  numberOfLines={1}
                >
                  {replyingMessage.isSentByMe
                    ? 'Bạn'
                    : chat.name || 'Người dùng'}
                </Text>
                <Text
                  className="mt-0.5 text-[12px] leading-4 text-gray-500"
                  numberOfLines={1}
                >
                  {getMessageSnippet(replyingMessage, chat.name)}
                </Text>
              </View>
              {/* Optional Right image thumbnail in preview bar */}
              {replyingMessage.media &&
                replyingMessage.mediaType === 'image' && (
                  <Image
                    source={{ uri: replyingMessage.media }}
                    className="ml-2 h-10 w-10 rounded-md bg-slate-200"
                    resizeMode="cover"
                  />
                )}
              {replyingMessage.media &&
              replyingMessage.mediaType === 'video' ? (
                <View className="ml-2 h-10 w-10 items-center justify-center rounded-md bg-slate-900">
                  <Play size={14} color="#ffffff" fill="#ffffff" />
                </View>
              ) : null}
              {replyingMessage.media &&
              replyingMessage.mediaType === 'audio' ? (
                <View className="ml-2 h-10 w-10 items-center justify-center rounded-md bg-violet-100">
                  <Mic size={16} color="#7C3AED" />
                </View>
              ) : null}
              {replyingMessage.callEvent ? (
                <View className="ml-2 h-10 w-10 items-center justify-center rounded-md bg-info-soft">
                  {replyingMessage.callEvent.callType === 'video' ? (
                    <Video size={16} color={APP_COLORS.status.info} />
                  ) : (
                    <Phone size={16} color={APP_COLORS.status.info} />
                  )}
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

          <TouchableOpacity
            className={`mr-2 h-10 w-10 items-center justify-center rounded-full ${
              isPickingCurrentLocation ? 'bg-info-soft' : ''
            }`}
            activeOpacity={0.7}
            disabled={isPickingCurrentLocation}
            onPress={() => handleShareCurrentLocation().catch(() => undefined)}
          >
            {isPickingCurrentLocation ? (
              <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
            ) : (
              <MapPin size={21} color="#9DA9BE" />
            )}
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
              onFocus={handleComposerFocus}
            />
          )}

          <TouchableOpacity
            className={`mr-2 h-10 w-10 items-center justify-center rounded-full ${
              recorder.isRecording ? 'bg-red-100' : 'bg-brand/10'
            }`}
            activeOpacity={0.7}
            onPress={() => handleToggleRecording().catch(() => undefined)}
          >
            {recorder.isRecording ? (
              <Square size={14} color="#DC2626" fill="#DC2626" />
            ) : (
              <Mic size={20} color={APP_BRAND_COLOR} />
            )}
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: sendAnim }] }}>
            <TouchableOpacity
              className={`h-10 w-10 items-center justify-center rounded-full ${
                canSend ? 'bg-brand' : 'bg-brand/30'
              }`}
              activeOpacity={0.8}
              disabled={!canSend}
              onPress={() => handleSend().catch(() => undefined)}
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardSafeView>
      <ChatMediaViewerModal
        items={viewerMediaItems}
        index={viewerMediaIndex}
        onIndexChange={setViewerMediaIndex}
        onClose={handleCloseMedia}
      />

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
          <View
            style={styles.modalContainer}
            className="bg-white/95 rounded-t-3xl border border-gray-100 shadow-2xl"
          >
            <View className="items-center py-2.5">
              <View className="h-1.5 w-12 rounded-full bg-gray-300" />
            </View>
            <View className="px-5 pb-8 pt-3">
              <Text className="text-center text-sm font-semibold text-gray-500 mb-6">
                Tùy chọn tin nhắn
              </Text>

              {selectedOptionMessage ? (
                <MessageReactionPicker
                  currentReaction={
                    selectedOptionMessage.reactions.myReaction
                  }
                  onSelect={reaction =>
                    handleMessageReaction(selectedOptionMessage, reaction)
                  }
                />
              ) : null}

              <TouchableOpacity
                className="flex-row items-center rounded-xl bg-gray-50 px-4 py-4 mb-3 active:bg-gray-100"
                onPress={handleSelectOptionReply}
              >
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-brand-subtle">
                  <CornerUpLeft size={20} color={APP_BRAND_COLOR} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-800">
                    Trả lời
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Trích dẫn tin nhắn này
                  </Text>
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
                  <Text className="text-base font-semibold text-gray-800">
                    Sao chép
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Sao chép nội dung tin nhắn
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className={`mb-5 flex-row items-center rounded-xl bg-gray-50 px-4 py-4 active:bg-gray-100 ${
                  selectedPinnedMessage && !selectedPinnedMessage.canUnpin
                    ? 'opacity-60'
                    : ''
                }`}
                onPress={handleSelectOptionPin}
              >
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                  <Pin size={20} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-800">
                    {selectedPinnedMessage
                      ? selectedPinnedMessage.canUnpin
                        ? 'Bỏ ghim tin nhắn'
                        : `Đã được ${selectedPinnedMessage.pinnedByName} ghim`
                      : 'Ghim tin nhắn'}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {selectedPinnedMessage && !selectedPinnedMessage.canUnpin
                      ? 'Bạn không có quyền bỏ ghim tin nhắn này'
                      : 'Hiển thị ngay bên dưới header cuộc trò chuyện'}
                  </Text>
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
  keyboardBoundary: {
    flex: 1,
  },
  highlightedMessage: {
        backgroundColor: APP_COLORS.brand.soft,
    borderRadius: 16,
  },
  inlineLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  mediaCaptionBubble: {
    maxWidth: IMAGE_GALLERY_WIDTH,
  },
  messageSkeletonAvatar: {
    width: 28,
    height: 28,
    marginRight: 8,
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  messageSkeletonBubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  messageSkeletonBubbleReceived: {
    borderBottomLeftRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  messageSkeletonBubbleSent: {
    borderBottomRightRadius: 4,
    backgroundColor: APP_COLORS.brand.soft,
  },
  messageSkeletonBubbleSmall: {
    width: '42%',
  },
  messageSkeletonBubbleMedium: {
    width: '55%',
  },
  messageSkeletonBubbleLarge: {
    width: '66%',
  },
  messageSkeletonBubbleXLarge: {
    width: '78%',
  },
  messageSkeletonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
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
    backgroundColor: APP_COLORS.brand.softPressed,
  },
  messageSkeletonLineShort: {
    width: '68%',
  },
  messageSkeletonTime: {
    width: 30,
    height: 6,
    marginTop: 7,
    alignSelf: 'flex-end',
    borderRadius: 999,
    opacity: 0.72,
  },
  messageSkeletonRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  messageSkeletonRowReceived: {
    justifyContent: 'flex-start',
  },
  messageSkeletonRowSent: {
    justifyContent: 'flex-end',
  },
  imageGallery: {
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
  imageGalleryReactionBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
  },
  imageGalleryTile: {
    height: IMAGE_GALLERY_TILE_SIZE,
    width: IMAGE_GALLERY_TILE_SIZE,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  productInquiryPanel: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 2,
  },
  productInquiryOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productInquiryOptionCard: {
    width: '48.4%',
    minHeight: 70,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.brand.border,
    backgroundColor: APP_COLORS.brand.soft,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  productInquiryOptionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.brand.softPressed,
  },
  productInquiryOptionCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
  },
  productInquiryOptionTitle: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '800',
    lineHeight: 17,
  },
  productInquiryOptionHint: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '700',
  },
  mapShareLargeCard: {
    width: MAP_SHARE_CARD_WIDTH,
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CFE8F3',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  mapShareLargeCardSent: {
    borderColor: '#B8E6F7',
  },
  mapShareLargeMap: {
    height: 148,
    overflow: 'hidden',
    backgroundColor: '#EAF4FB',
  },
  mapShareLargeMapNative: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#EAF4FB',
  },
  mapShareLargeMarkerShadow: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 52,
    height: 52,
    marginLeft: -26,
    marginTop: -24,
    borderRadius: 26,
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
    transform: [{ translateY: 6 }],
  },
  mapShareLargeMarker: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 56,
    height: 56,
    marginLeft: -28,
    marginTop: -34,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#EFF6FF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  mapShareLargeMarkerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  mapShareLargeFooter: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#DDF5FF',
  },
  mapShareLargeFooterSent: {
    backgroundColor: '#CDEEFF',
  },
  mapShareLargeTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  mapShareLargeCaption: {
    marginTop: 2,
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  mapShareComposerWrap: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 10,
  },
  mapShareMessageWrap: {
    maxWidth: MAP_SHARE_CARD_WIDTH,
  },
  mapShareCard: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C7F1E8',
    backgroundColor: '#F8FFFC',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 12,
    elevation: 3,
  },
  mapShareComposerCard: {
    width: '100%',
  },
  mapShareMessageCard: {
    width: MAP_SHARE_CARD_WIDTH,
  },
  mapShareCardSent: {
    borderColor: '#B9EDE4',
    backgroundColor: '#ECFEF8',
  },
  mapShareCardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  mapShareCardImage: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#DDEFEA',
  },
  mapShareCardFallback: {
    width: 58,
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D9F8EF',
  },
  mapShareCardCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  mapShareCardEyebrow: {
    color: '#0F766E',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  mapShareCardTitle: {
    marginTop: 2,
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '900',
  },
  mapShareCardCoordinate: {
    marginTop: 3,
    color: APP_COLORS.status.info,
    fontSize: 12,
    fontWeight: '800',
  },
  mapShareCardAddress: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '700',
  },
  mapShareCardCaption: {
    borderTopWidth: 1,
    borderTopColor: '#CCFBF1',
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 8,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  mapShareCardClose: {
    width: 30,
    height: 30,
    marginLeft: 8,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  videoPreviewShell: {
    borderRadius: 18,
    backgroundColor: '#020617',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  videoPreviewSurface: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    backgroundColor: '#020617',
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
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  videoPreviewFill: {
    height: '100%',
    width: '100%',
  },
  videoPreviewLarge: {
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
