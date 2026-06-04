// Description: Renders a Messages chat conversation with media, voice notes, and LiveKit call actions.
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
} from 'react-native';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImagePlus,
  Mic,
  Phone,
  PhoneMissed,
  Play,
  Send,
  Square,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  launchImageLibrary,
  type Asset,
  type MediaType,
} from 'react-native-image-picker';
import VideoPlayer from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { useChatViewModel } from '../../application/view-models/useChatViewModel';
import type {
  MessageAttachment,
  MessageItem,
} from '../../domain/types/messages.types';
import { AudioPlayer } from '../../../shared-kernel/presentation/components/AudioPlayer';
import { AudioWaveform } from '../../../shared-kernel/presentation/components/AudioWaveform';
import { useAudioRecorder } from '../../../shared-kernel/application/hooks/useAudioRecorder';
import { formatAudioDuration } from '../../../shared-kernel/application/utils/audioFiles';

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

type ChatMessageListItem =
  | {
      kind: 'message';
      id: string;
      message: MessageItem;
    }
  | {
      kind: 'image-group';
      id: string;
      messages: MessageItem[];
    };

const MAX_MEDIA_ATTACHMENTS = 10;
const IMAGE_GROUP_WINDOW_SECONDS = 120;
const IMAGE_GALLERY_WIDTH = 268;
const IMAGE_GALLERY_GAP = 3;
const IMAGE_GALLERY_TILE_SIZE = (IMAGE_GALLERY_WIDTH - IMAGE_GALLERY_GAP) / 2;

function formatMessageTime(timestamp: number) {
  if (!timestamp) return '';

  return new Date(timestamp * 1000).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isImageMessage(message: MessageItem) {
  return Boolean(message.media && message.mediaType === 'image');
}

function buildMessageListItems(messages: MessageItem[]): ChatMessageListItem[] {
  const items: ChatMessageListItem[] = [];

  for (let index = 0; index < messages.length; ) {
    const message = messages[index];
    if (!isImageMessage(message)) {
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
        !isImageMessage(nextMessage) ||
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
            kind: 'image-group',
            id: `image-group-${group.map(item => item.id).join('-')}`,
            messages: group,
          }
        : { kind: 'message', id: message.id, message },
    );
    index = nextIndex;
  }

  return items;
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

  if (status === 'busy') {
    return isInitiator ? 'Người nhận đang bận' : 'Cuộc gọi nhỡ';
  }

  if (status === 'answered' || status === 'ended') {
    return callEvent.duration > 0
      ? `Đã trả lời · ${formatCallDuration(callEvent.duration)}`
      : 'Đã trả lời cuộc gọi';
  }

  return callEvent.duration > 0
    ? `Thời lượng · ${formatCallDuration(callEvent.duration)}`
    : 'Cuộc gọi';
}

function CallEventContent({ message }: { message: MessageItem }) {
  const callEvent = message.callEvent!;
  const hasErrorStatus = [
    'cancelled',
    'declined',
    'missed',
    'no_answer',
    'busy',
  ].includes(callEvent.status);
  const Icon =
    hasErrorStatus && callEvent.callType === 'audio'
      ? PhoneMissed
      : callEvent.callType === 'video'
      ? Video
      : Phone;
  const iconColor = message.isSentByMe
    ? '#ffffff'
    : hasErrorStatus
    ? '#dc2626'
    : '#2563eb';

  return (
    <View className="flex-row items-center">
      <View
        className={`mr-2 h-10 w-10 items-center justify-center rounded-full ${
          message.isSentByMe
            ? 'bg-white/20'
            : hasErrorStatus
            ? 'bg-red-100'
            : 'bg-blue-100'
        }`}
      >
        <Icon size={19} color={iconColor} />
      </View>
      <View className="shrink">
        <Text
          className={`text-sm font-bold ${
            message.isSentByMe ? 'text-white' : 'text-gray-900'
          }`}
        >
          {callEvent.callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}
        </Text>
        <Text
          className={`mt-0.5 text-xs ${
            message.isSentByMe
              ? 'text-blue-100'
              : hasErrorStatus
              ? 'text-red-600'
              : 'text-gray-500'
          }`}
        >
          {getCallDetail(message)}
        </Text>
      </View>
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
        onPress={() => {
          onOpenMedia({ uri: message.media!, type: 'image' });
        }}
      >
        <Image
          source={{ uri: message.media }}
          className="mb-1 h-52 w-52 rounded-2xl"
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  if (message.mediaType === 'audio') {
    return (
      <View className="mb-1">
        <AudioPlayer
          uri={message.media}
          compact
          accentColor={message.isSentByMe ? '#1d4ed8' : '#2563eb'}
        />
      </View>
    );
  }

  if (message.mediaType === 'video') {
    return (
      <TouchableOpacity
        className="mb-1 h-52 w-64 overflow-hidden rounded-2xl bg-black"
        activeOpacity={0.9}
        onPress={() => {
          onOpenMedia({ uri: message.media!, type: 'video' });
        }}
      >
        <VideoPlayer
          source={{ uri: message.media }}
          style={styles.messageVideo}
          resizeMode="cover"
          paused
          muted
        />
        <View className="absolute inset-0 items-center justify-center bg-black/15">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-black/55">
            <Play size={23} color="#ffffff" fill="#ffffff" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      className="mb-1 flex-row items-center rounded-xl bg-black/10 px-3 py-2"
      activeOpacity={0.8}
      onPress={() => {
        Linking.openURL(message.media!).catch(() => undefined);
      }}
    >
      <FileText size={18} color={message.isSentByMe ? '#ffffff' : '#2563eb'} />
      <Text
        className={`ml-2 text-sm font-semibold ${
          message.isSentByMe ? 'text-white' : 'text-blue-600'
        }`}
      >
        Mở tệp đính kèm
      </Text>
    </TouchableOpacity>
  );
}

function ImageMessageGroup({
  messages,
  avatar,
  onOpenMedia,
}: {
  messages: MessageItem[];
  avatar: string;
  onOpenMedia: OpenChatMedia;
}) {
  const orderedMessages = [...messages].reverse();
  const visibleMessages = orderedMessages.slice(0, 4);
  const hiddenCount = Math.max(
    0,
    orderedMessages.length - visibleMessages.length,
  );
  const newestMessage = messages[0];
  const viewerItems = orderedMessages.map(message => ({
    uri: message.media!,
    type: 'image' as const,
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
              onPress={() => {
                onOpenMedia(
                  { uri: message.media!, type: 'image' },
                  viewerItems,
                );
              }}
              style={styles.imageGalleryTile}
            >
              <Image
                source={{ uri: message.media }}
                style={styles.imageGalleryImage}
                resizeMode="cover"
              />
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
          <Text className="mt-1 text-[15px] leading-5 text-gray-900">
            {captions.join('\n')}
          </Text>
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

function MessageBubble({
  message,
  avatar,
  onOpenMedia,
}: {
  message: MessageItem;
  avatar: string;
  onOpenMedia: OpenChatMedia;
}) {
  const isMediaOnly =
    !message.callEvent &&
    !message.message &&
    (message.mediaType === 'image' ||
      message.mediaType === 'video' ||
      message.mediaType === 'audio');

  return (
    <View
      className={`mb-2 flex-row px-3 ${
        message.isSentByMe ? 'justify-end' : 'justify-start'
      }`}
    >
      {!message.isSentByMe && (
        <Image
          source={{ uri: avatar }}
          className="mr-2 mt-1 h-7 w-7 rounded-full bg-gray-200"
        />
      )}
      <View
        className={`max-w-[78%] ${
          isMediaOnly
            ? ''
            : message.isSentByMe
            ? 'rounded-2xl rounded-br-md bg-blue-600 px-3 py-2'
            : 'rounded-2xl rounded-bl-md bg-gray-100 px-3 py-2'
        } ${message.deliveryState === 'sending' ? 'opacity-70' : ''}`}
      >
        {message.callEvent ? (
          <CallEventContent message={message} />
        ) : (
          <>
            <MessageMedia message={message} onOpenMedia={onOpenMedia} />
            {!!message.message && (
              <Text
                className={`text-[15px] leading-5 ${
                  message.isSentByMe ? 'text-white' : 'text-gray-900'
                }`}
              >
                {message.message}
              </Text>
            )}
          </>
        )}
        <Text
          className={`mt-1 text-right text-[10px] ${
            message.deliveryState === 'failed'
              ? isMediaOnly
                ? 'text-red-600'
                : 'text-red-100'
              : isMediaOnly
              ? 'text-gray-500'
              : message.isSentByMe
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
      </View>
    </View>
  );
}

function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { chat } = route.params;
  const {
    messages,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    loadInitial,
    loadOlder,
    refreshLatest,
    sendMessage,
  } = useChatViewModel(chat);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [viewerMediaItems, setViewerMediaItems] = useState<
    ChatMediaViewerItem[]
  >([]);
  const [viewerMediaIndex, setViewerMediaIndex] = useState(0);
  const [isViewerMuted, setIsViewerMuted] = useState(false);
  const recorder = useAudioRecorder();
  const messageItems = useMemo(
    () => buildMessageListItems(messages),
    [messages],
  );
  const viewerMedia = viewerMediaItems[viewerMediaIndex];

  const handleOpenMedia = useCallback<OpenChatMedia>(
    (media, mediaItems = [media]) => {
      const nextItems = mediaItems.length > 0 ? mediaItems : [media];
      const nextIndex = nextItems.findIndex(item => item.uri === media.uri);
      setIsViewerMuted(false);
      setViewerMediaItems(nextItems);
      setViewerMediaIndex(Math.max(0, nextIndex));
    },
    [],
  );

  const handleCloseMedia = useCallback(() => {
    setViewerMediaItems([]);
    setViewerMediaIndex(0);
    setIsViewerMuted(false);
  }, []);

  const handleSend = useCallback(async () => {
    if (!text.trim() && attachments.length === 0) return;

    const nextText = text;
    const nextAttachments = attachments;
    setText('');
    setAttachments([]);

    if (nextAttachments.length === 0) {
      await sendMessage(nextText);
      return;
    }

    for (const [index, attachment] of nextAttachments.entries()) {
      await sendMessage(index === 0 ? nextText : '', attachment);
    }
  }, [attachments, sendMessage, text]);

  const handlePickMedia = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'mixed' as MediaType,
      selectionLimit: MAX_MEDIA_ATTACHMENTS,
      quality: 0.8,
      includeBase64: false,
    });

    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert(
        'Không mở được thư viện',
        result.errorMessage ?? 'Không chọn được ảnh hoặc video.',
      );
      return;
    }

    const selectedAttachments = (result.assets ?? [])
      .map(assetToAttachment)
      .filter((attachment): attachment is MessageAttachment =>
        Boolean(attachment),
      );
    if (selectedAttachments.length > 0) {
      setAttachments(current =>
        [
          ...current.filter(item => item.mediaType !== 'audio'),
          ...selectedAttachments,
        ].slice(0, MAX_MEDIA_ATTACHMENTS),
      );
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
    } catch (caught) {
      Alert.alert(
        'Không ghi âm được',
        caught instanceof Error ? caught.message : 'Vui lòng thử lại.',
      );
    }
  }, [recorder]);

  const handleStartCall = useCallback(
    (callType: 'audio' | 'video') => {
      navigation.navigate(ROUTES.CALL_ROOM, {
        recipientId: chat.userId,
        callType,
        direction: 'outgoing',
        peer: {
          id: chat.userId,
          name: chat.name,
          avatar: chat.avatar,
          username: chat.username,
        },
      });
    },
    [chat.avatar, chat.name, chat.userId, chat.username, navigation],
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-row items-center border-b border-gray-100 px-3 py-2">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.75}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#1f2937" />
          </TouchableOpacity>
          <Image
            source={{ uri: chat.avatar }}
            className="ml-1 h-10 w-10 rounded-full bg-gray-200"
          />
          <View className="ml-3 flex-1">
            <Text
              className="text-base font-bold text-gray-900"
              numberOfLines={1}
            >
              {chat.name}
            </Text>
            <Text className="text-xs text-gray-500">
              {chat.isOnline ? 'Đang hoạt động' : `@${chat.username}`}
            </Text>
          </View>
          {chat.chatType === 'user' ? (
            <>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full"
                activeOpacity={0.75}
                onPress={() => handleStartCall('audio')}
              >
                <Phone size={21} color="#0000ff" />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full"
                activeOpacity={0.75}
                onPress={() => handleStartCall('video')}
              >
                <Video size={22} color="#0000ff" />
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="mt-3 text-sm text-gray-500">
              Đang tải tin nhắn...
            </Text>
          </View>
        ) : (
          <FlatList
            inverted
            data={messageItems}
            keyExtractor={item => item.id}
            renderItem={({ item }) =>
              item.kind === 'image-group' ? (
                <ImageMessageGroup
                  messages={item.messages}
                  avatar={chat.avatar}
                  onOpenMedia={handleOpenMedia}
                />
              ) : (
                <MessageBubble
                  message={item.message}
                  avatar={chat.avatar}
                  onOpenMedia={handleOpenMedia}
                />
              )
            }
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            onEndReached={() => {
              loadOlder().catch(() => undefined);
            }}
            onEndReachedThreshold={0.2}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator
                  className="my-3"
                  size="small"
                  color="#2563eb"
                />
              ) : null
            }
            ListEmptyComponent={
              <View className="items-center px-6 py-16">
                <Text className="text-center text-sm text-gray-500">
                  Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  refreshLatest().catch(() => undefined);
                }}
                colors={['#2563eb']}
                tintColor="#2563eb"
              />
            }
          />
        )}

        {!!error && (
          <TouchableOpacity
            className="mx-3 mb-2 rounded-lg bg-red-50 px-3 py-2"
            activeOpacity={0.8}
            onPress={() => {
              loadInitial().catch(() => undefined);
            }}
          >
            <Text className="text-center text-xs text-red-600">{error}</Text>
          </TouchableOpacity>
        )}

        {attachments.length > 0 && (
          <View className="border-t border-gray-100 bg-white px-3 pt-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attachmentPreviewList}
            >
              {attachments.map((attachment, index) => (
                <View
                  key={`${attachment.uri}-${index}`}
                  style={
                    attachment.mediaType === 'audio'
                      ? styles.audioAttachmentPreview
                      : styles.mediaAttachmentPreview
                  }
                >
                  {attachment.mediaType === 'image' ? (
                    <Image
                      source={{ uri: attachment.uri }}
                      style={styles.attachmentPreviewMedia}
                      resizeMode="cover"
                    />
                  ) : attachment.mediaType === 'video' ? (
                    <>
                      <VideoPlayer
                        source={{ uri: attachment.uri }}
                        style={styles.attachmentPreviewMedia}
                        resizeMode="cover"
                        paused
                        muted
                      />
                      <View className="absolute inset-0 items-center justify-center bg-black/15">
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-black/55">
                          <Play size={15} color="#ffffff" fill="#ffffff" />
                        </View>
                      </View>
                    </>
                  ) : (
                    <AudioPlayer uri={attachment.uri} compact />
                  )}
                  <TouchableOpacity
                    className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60"
                    activeOpacity={0.8}
                    onPress={() =>
                      setAttachments(current =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <X size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View className="flex-row items-end border-t border-gray-100 bg-white px-3 py-2">
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => {
              handlePickMedia().catch(() => undefined);
            }}
          >
            <ImagePlus size={21} color="#2563eb" />
          </TouchableOpacity>
          {recorder.isRecording ? (
            <View className="mr-2 h-10 flex-1 flex-row items-center rounded-2xl bg-red-50 px-3">
              <View className="mr-2 h-2.5 w-2.5 rounded-full bg-red-500" />
              <Text className="mr-2 text-xs font-semibold text-red-600">
                Đang ghi âm {formatAudioDuration(recorder.durationMs)}
              </Text>
              <View className="mr-2 h-5 flex-1">
                <AudioWaveform
                  animated
                  color="#DC2626"
                  inactiveColor="#FECACA"
                  height={18}
                  barCount={20}
                />
              </View>
              <TouchableOpacity onPress={() => recorder.cancelRecording()}>
                <X size={17} color="#dc2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <TextInput
              className="mr-2 max-h-28 flex-1 rounded-2xl bg-gray-100 px-4 py-2.5 text-[15px] text-gray-900"
              placeholder="Aa"
              placeholderTextColor="#9ca3af"
              multiline
              value={text}
              onChangeText={setText}
            />
          )}
          <TouchableOpacity
            className={`mr-2 h-10 w-10 items-center justify-center rounded-full ${
              recorder.isRecording ? 'bg-red-100' : 'bg-blue-50'
            }`}
            activeOpacity={0.8}
            onPress={() => {
              handleToggleRecording().catch(() => undefined);
            }}
          >
            {recorder.isRecording ? (
              <Square size={15} color="#dc2626" fill="#dc2626" />
            ) : (
              <Mic size={19} color="#2563eb" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className={`h-10 w-10 items-center justify-center rounded-full ${
              text.trim() || attachments.length > 0
                ? 'bg-blue-600'
                : 'bg-gray-300'
            }`}
            activeOpacity={0.8}
            disabled={
              recorder.isRecording || (!text.trim() && attachments.length === 0)
            }
            onPress={() => {
              handleSend().catch(() => undefined);
            }}
          >
            <Send size={17} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <Modal
        visible={Boolean(viewerMedia)}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseMedia}
      >
        <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
          <TouchableOpacity
            className="absolute right-4 top-4 z-10 h-11 w-11 items-center justify-center rounded-full bg-black/60"
            activeOpacity={0.8}
            onPress={handleCloseMedia}
          >
            <X size={23} color="#ffffff" />
          </TouchableOpacity>
          {viewerMediaItems.length > 1 ? (
            <View className="absolute left-4 top-4 z-10 rounded-full bg-black/60 px-4 py-2.5">
              <Text className="text-sm font-semibold text-white">
                {viewerMediaIndex + 1}/{viewerMediaItems.length}
              </Text>
            </View>
          ) : null}
          {viewerMedia?.type === 'image' ? (
            <Image
              source={{ uri: viewerMedia.uri }}
              className="h-full w-full"
              resizeMode="contain"
            />
          ) : viewerMedia?.type === 'video' ? (
            <>
              <VideoPlayer
                source={{ uri: viewerMedia.uri }}
                style={styles.viewerVideo}
                resizeMode="contain"
                controls
                paused={false}
                muted={isViewerMuted}
              />
              <TouchableOpacity
                className="absolute bottom-6 right-4 h-11 w-11 items-center justify-center rounded-full bg-black/60"
                activeOpacity={0.8}
                onPress={() => setIsViewerMuted(current => !current)}
              >
                {isViewerMuted ? (
                  <VolumeX size={22} color="#ffffff" />
                ) : (
                  <Volume2 size={22} color="#ffffff" />
                )}
              </TouchableOpacity>
            </>
          ) : null}
          {viewerMediaItems.length > 1 && viewerMediaIndex > 0 ? (
            <TouchableOpacity
              className="absolute left-4 top-1/2 h-12 w-12 items-center justify-center rounded-full bg-black/60"
              activeOpacity={0.8}
              onPress={() => setViewerMediaIndex(current => current - 1)}
            >
              <ChevronLeft size={28} color="#ffffff" />
            </TouchableOpacity>
          ) : null}
          {viewerMediaItems.length > 1 &&
          viewerMediaIndex < viewerMediaItems.length - 1 ? (
            <TouchableOpacity
              className="absolute right-4 top-1/2 h-12 w-12 items-center justify-center rounded-full bg-black/60"
              activeOpacity={0.8}
              onPress={() => setViewerMediaIndex(current => current + 1)}
            >
              <ChevronRight size={28} color="#ffffff" />
            </TouchableOpacity>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  messageList: {
    paddingVertical: 12,
  },
  messageVideo: {
    height: '100%',
    width: '100%',
    backgroundColor: '#000000',
  },
  imageGalleryBody: {
    width: IMAGE_GALLERY_WIDTH,
  },
  imageGallery: {
    width: IMAGE_GALLERY_WIDTH,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IMAGE_GALLERY_GAP,
    overflow: 'hidden',
    borderRadius: 16,
  },
  imageGalleryTile: {
    width: IMAGE_GALLERY_TILE_SIZE,
    height: IMAGE_GALLERY_TILE_SIZE,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
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
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  attachmentPreviewList: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
    paddingBottom: 2,
  },
  mediaAttachmentPreview: {
    height: 74,
    width: 74,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
  },
  audioAttachmentPreview: {
    width: 218,
    minHeight: 64,
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 14,
  },
  attachmentPreviewMedia: {
    height: '100%',
    width: '100%',
  },
  viewerVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
});

export default ChatScreen;
