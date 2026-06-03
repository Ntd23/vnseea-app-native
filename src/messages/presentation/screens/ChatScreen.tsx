// Description: Redesigned Chat 1-1 screen with modern UI
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  UIManager,
} from 'react-native';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  MessageCircle,
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
import { useAudioRecorder } from '../../../shared-kernel/application/hooks/useAudioRecorder';
import { formatAudioDuration } from '../../../shared-kernel/application/utils/audioFiles';

type ChatScreenProps = NativeStackScreenProps<RootStackParamList, typeof ROUTES.CHAT>;

type ChatMediaViewerItem = {
  uri: string;
  type: 'image' | 'video';
};

type OpenChatMedia = (
  media: ChatMediaViewerItem,
  mediaItems?: ChatMediaViewerItem[],
) => void;

const MAX_MEDIA_ATTACHMENTS = 10;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Format time
function formatMessageTime(timestamp: number) {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format date separator
function formatDateSeparator(timestamp: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const messageDate = new Date(timestamp * 1000);
  messageDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  return messageDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
}

// Date Separator
function DateSeparator({ timestamp }: { timestamp: number }) {
  return (
    <View className="my-4 items-center">
      <View className="rounded-full bg-gray-200 px-4 py-1.5">
        <Text className="text-xs font-medium text-gray-600">{formatDateSeparator(timestamp)}</Text>
      </View>
    </View>
  );
}

// Typing Indicator (animated dots)
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

// Call Event Content
function CallEventContent({ message }: { message: MessageItem }) {
  const callEvent = message.callEvent!;
  const hasError = ['cancelled', 'declined', 'missed', 'no_answer', 'busy'].includes(callEvent.status);
  const Icon = hasError && callEvent.callType === 'audio' ? PhoneMissed : callEvent.callType === 'video' ? Video : Phone;
  const iconBg = message.isSentByMe ? 'bg-white/20' : hasError ? 'bg-red-100' : 'bg-blue-100';
  const iconColor = message.isSentByMe ? '#fff' : hasError ? '#DC2626' : '#0084FF';
  const textColor = message.isSentByMe ? 'text-white' : 'text-gray-900';
  const subTextColor = message.isSentByMe ? 'text-blue-100' : hasError ? 'text-red-600' : 'text-gray-500';
  const formatDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <View className="flex-row items-center">
      <View className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
        <Icon size={18} color={iconColor} />
      </View>
      <View>
        <Text className={`font-semibold ${textColor}`}>
          {callEvent.callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}
        </Text>
        <Text className={`text-xs ${subTextColor}`}>
          {callEvent.status === 'answered' || callEvent.status === 'ended'
            ? `Đã trả lời · ${formatDur(callEvent.duration)}`
            : callEvent.status === 'missed' ? 'Cuộc gọi nhỡ'
            : 'Đã hủy'}
        </Text>
      </View>
    </View>
  );
}

// Message Bubble
function MessageBubble({
  message,
  avatar,
  onOpenMedia,
}: {
  message: MessageItem;
  avatar: string;
  onOpenMedia: OpenChatMedia;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const isMediaOnly = !message.callEvent && !message.message && (
    message.mediaType === 'image' || message.mediaType === 'video' || message.mediaType === 'audio');

  const bubbleBg = message.isSentByMe ? 'bg-[#0084FF]' : 'bg-[#F0F2F5]';
  const textColor = message.isSentByMe ? 'text-white' : 'text-gray-900';
  const subTextColor = message.isSentByMe ? 'text-blue-100' : 'text-gray-500';
  const borderRadius = isMediaOnly ? 'rounded-2xl' : message.isSentByMe ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md';

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        marginBottom: 6,
        paddingHorizontal: 12,
        justifyContent: message.isSentByMe ? 'flex-end' : 'flex-start',
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {!message.isSentByMe && (
        <Image source={{ uri: avatar }} className="mr-2 h-8 w-8 rounded-full" />
      )}
      <TouchableOpacity
        activeOpacity={0.9}
        className={`max-w-[75%] ${bubbleBg} ${borderRadius} px-3 py-2 ${message.deliveryState === 'sending' ? 'opacity-80' : ''}`}
      >
        {message.callEvent && <CallEventContent message={message} />}

        {message.mediaType === 'image' && (
          <TouchableOpacity onPress={() => onOpenMedia({ uri: message.media!, type: 'image' })}>
            <Image source={{ uri: message.media }} className="h-48 w-48 rounded-xl" resizeMode="cover" />
          </TouchableOpacity>
        )}

        {message.mediaType === 'video' && (
          <TouchableOpacity
            className="h-48 w-64 overflow-hidden rounded-xl bg-black"
            onPress={() => onOpenMedia({ uri: message.media!, type: 'video' })}
          >
            <VideoPlayer source={{ uri: message.media }} style={styles.messageVideo} resizeMode="cover" paused muted />
            <View className="absolute inset-0 items-center justify-center bg-black/30">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-black/50">
                <Play size={20} color="#fff" fill="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {message.mediaType === 'audio' && (
          <View className="w-64">
            <AudioPlayer uri={message.media!} compact accentColor={message.isSentByMe ? '#fff' : '#0084FF'} />
          </View>
        )}

        {!!message.message && (
          <Text className={`text-[15px] leading-5 ${textColor}`}>{message.message}</Text>
        )}

        <View className="mt-1 flex-row items-center justify-end">
          <Text className={`text-[10px] ${subTextColor}`}>
            {message.deliveryState === 'sending' ? 'Đang gửi...' : message.deliveryState === 'failed' ? 'Gửi thất bại' : formatMessageTime(message.time)}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Main Chat Screen
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
    isTyping,
    isRecording,
    hasMore,
  } = useChatViewModel(chat);

  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [viewerMediaItems, setViewerMediaItems] = useState<ChatMediaViewerItem[]>([]);
  const [viewerMediaIndex, setViewerMediaIndex] = useState(0);
  const [isViewerMuted, setIsViewerMuted] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const recorder = useAudioRecorder();
  const flatListRef = useRef<FlatList>(null);
  const sendAnim = useRef(new Animated.Value(1)).current;
  const previousLatestMessageIdRef = useRef<string | undefined>(undefined);

  const viewerMedia = viewerMediaItems[viewerMediaIndex];

  // Keyboard listeners
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', () => {
      setIsKeyboardVisible(true);
      // Only scroll if user was at bottom
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      setIsKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Group messages by date (reversed for inverted FlatList)
  const groupedData = useMemo(() => {
    const items: (MessageItem | { type: 'date'; time: number })[] = [];
    let lastDate = '';

    // Sort messages oldest first, newest last
    const sortedMessages = [...messages].sort((a, b) => a.time - b.time);

    sortedMessages.forEach(msg => {
      const msgDate = new Date(msg.time * 1000).toDateString();
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        items.push({ type: 'date', time: msg.time });
      }
      items.push(msg);
    });

    return items;
  }, [messages]);

  // Auto scroll to bottom when new messages arrive (only if at bottom or keyboard visible)
  useEffect(() => {
    if (messages.length > 0 && (isAtBottom || isKeyboardVisible)) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        setShowJumpToLatest(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isAtBottom, isKeyboardVisible]);

  useEffect(() => {
    const latestMessageId = messages[0]?.id;

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

  // Track scroll position
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottomNow = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    if (isAtBottom !== isAtBottomNow) {
      setIsAtBottom(isAtBottomNow);
    }

    if (contentOffset.y <= 80 && !isLoadingMore && hasMore) {
      loadOlder().catch(() => undefined);
    }
  }, [hasMore, isAtBottom, isLoadingMore, loadOlder]);

  const handleOpenMedia = useCallback<OpenChatMedia>((media, mediaItems = [media]) => {
    const items = mediaItems.length > 0 ? mediaItems : [media];
    const index = items.findIndex(item => item.uri === media.uri);
    setViewerMediaItems(items);
    setViewerMediaIndex(Math.max(0, index));
    setIsViewerMuted(false);
  }, []);

  const handleCloseMedia = useCallback(() => {
    setViewerMediaItems([]);
    setViewerMediaIndex(0);
  }, []);

  const handleSend = useCallback(async () => {
    if (!text.trim() && attachments.length === 0) return;

    // Animate send button
    Animated.sequence([
      Animated.timing(sendAnim, { toValue: 0.8, duration: 50, useNativeDriver: true }),
      Animated.spring(sendAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();

    const nextText = text;
    const nextAttachments = attachments;
    setText('');
    setAttachments([]);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (nextAttachments.length === 0) {
      await sendMessage(nextText);
    } else {
      for (const [index, attachment] of nextAttachments.entries()) {
        await sendMessage(index === 0 ? nextText : '', attachment);
      }
    }
  }, [attachments, sendMessage, text, sendAnim]);

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
      const isVideo = asset.type?.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(asset.fileName ?? '');
      const uri = Platform.OS === 'android' && !/^[a-z][a-z0-9+.-]*:\/\//i.test(asset.uri) ? `file://${asset.uri}` : asset.uri;
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
      Alert.alert('Lỗi', 'Không ghi âm được');
    }
  }, [recorder]);

  const canSend = text.trim().length > 0 || attachments.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View className="flex-row items-center border-b border-gray-200 px-3 py-2">
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" activeOpacity={0.7} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color="#050505" />
          </TouchableOpacity>
          <Image source={{ uri: chat.avatar }} className="ml-1 h-11 w-11 rounded-full" />
          <TouchableOpacity
            className="ml-3 flex-1"
            activeOpacity={0.7}
            onPress={() => {
              if (chat.chatType === 'user') {
                navigation.navigate(ROUTES.PROFILE, { userId: chat.userId });
              }
            }}
          >
            <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>{chat.name}</Text>
            <Text className="text-xs text-gray-500">
              {chat.chatType === 'group'
                ? 'Nhóm chat'
                : chat.isOnline
                  ? 'Đang hoạt động'
                  : 'Offline'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" activeOpacity={0.7}>
            <Phone size={22} color="#050505" />
          </TouchableOpacity>
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" activeOpacity={0.7}>
            <Video size={22} color="#050505" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0084FF" />
            <Text className="mt-3 text-sm text-gray-500">Đang tải tin nhắn...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={groupedData}
            keyExtractor={(item) => 'type' in item ? `date-${item.time}` : item.id}
            renderItem={({ item }) => {
              if ('type' in item) return <DateSeparator timestamp={item.time} />;
              return <MessageBubble message={item} avatar={chat.avatar} onOpenMedia={handleOpenMedia} />;
            }}
            contentContainerStyle={{ paddingVertical: 12, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={100}
            initialNumToRender={18}
            maxToRenderPerBatch={12}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            ListHeaderComponent={
              isLoadingMore ? (
                <ActivityIndicator className="my-2" size="small" color="#0084FF" />
              ) : null
            }
            ListFooterComponent={
              <View className="pb-2">
                {(isTyping || isRecording) && (
                  <TypingIndicator name={chat.name} avatar={chat.avatar} />
                )}
              </View>
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-6 py-20">
                <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-100">
                  <MessageCircle size={48} color="#9DA9BE" />
                </View>
                <Text className="text-lg font-semibold text-gray-900">Chào {chat.name}!</Text>
                <Text className="mt-2 text-center text-sm text-gray-500">Gửi tin nhắn để bắt đầu cuộc trò chuyện</Text>
              </View>
            }
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => refreshLatest().catch(() => undefined)} colors={['#0084FF']} tintColor="#0084FF" />}
          />
        )}

        {showJumpToLatest && (
          <TouchableOpacity
            className="absolute bottom-20 self-center rounded-full bg-blue-600 px-4 py-2 shadow-lg"
            activeOpacity={0.85}
            onPress={() => {
              setShowJumpToLatest(false);
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
          >
            <Text className="text-xs font-semibold text-white">Tin nháº¯n má»›i</Text>
          </TouchableOpacity>
        )}

        {/* Error */}
        {!!error && (
          <TouchableOpacity className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2" activeOpacity={0.8} onPress={() => loadInitial().catch(() => undefined)}>
            <Text className="text-center text-xs text-red-600">{error}</Text>
          </TouchableOpacity>
        )}

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <View className="border-t border-gray-200 bg-white px-3 pt-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
              {attachments.map((att, i) => (
                <View key={`${att.uri}-${i}`} className="h-20 w-20 overflow-hidden rounded-xl bg-gray-200">
                  {att.mediaType === 'image' && <Image source={{ uri: att.uri }} className="h-full w-full" resizeMode="cover" />}
                  {att.mediaType === 'video' && (
                    <>
                      <VideoPlayer source={{ uri: att.uri }} style={{ height: '100%', width: '100%' }} resizeMode="cover" paused muted />
                      <View className="absolute inset-0 items-center justify-center bg-black/30"><Play size={16} color="#fff" fill="#fff" /></View>
                    </>
                  )}
                  {att.mediaType === 'audio' && <View className="flex-1 items-center justify-center"><Mic size={20} color="#9DA9BE" /></View>}
                  <TouchableOpacity className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60" onPress={() => setAttachments(current => current.filter((_, idx) => idx !== i))}>
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Bar */}
        <View className="flex-row items-end border-t border-gray-200 bg-white px-3 py-2">
          <TouchableOpacity className="mr-2 h-10 w-10 items-center justify-center rounded-full" activeOpacity={0.7} onPress={() => handlePickMedia().catch(() => undefined)}>
            <ImagePlus size={22} color="#9DA9BE" />
          </TouchableOpacity>

          {recorder.isRecording ? (
            <View className="mr-2 h-10 flex-1 flex-row items-center rounded-full bg-red-50 px-4">
              <View className="mr-3 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              <Text className="mr-2 text-sm font-medium text-red-600">Đang ghi âm {formatAudioDuration(recorder.durationMs)}</Text>
              <TouchableOpacity onPress={() => recorder.cancelRecording()}>
                <X size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <TextInput
              className="mr-2 max-h-28 flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-[15px] text-gray-900"
              placeholder="Tin nhắn"
              placeholderTextColor="#9DA9BE"
              multiline
              value={text}
              onChangeText={setText}
            />
          )}

          <TouchableOpacity
            className={`mr-2 h-10 w-10 items-center justify-center rounded-full ${recorder.isRecording ? 'bg-red-100' : 'bg-[#0084FF]/10'}`}
            activeOpacity={0.7}
            onPress={() => handleToggleRecording().catch(() => undefined)}
          >
            {recorder.isRecording ? <Square size={14} color="#DC2626" fill="#DC2626" /> : <Mic size={20} color="#0084FF" />}
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: sendAnim }] }}>
            <TouchableOpacity
              className={`h-10 w-10 items-center justify-center rounded-full ${canSend ? 'bg-[#0084FF]' : 'bg-[#0084FF]/30'}`}
              activeOpacity={0.8}
              disabled={!canSend}
              onPress={() => handleSend().catch(() => undefined)}
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      {/* Media Viewer */}
      <Modal visible={viewerMediaItems.length > 0} animationType="fade" statusBarTranslucent onRequestClose={handleCloseMedia}>
        <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
          <TouchableOpacity className="absolute right-4 top-4 z-10 h-12 w-12 items-center justify-center rounded-full bg-white/20" activeOpacity={0.8} onPress={handleCloseMedia}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
          {viewerMediaItems.length > 1 && (
            <View className="absolute left-4 top-4 z-10 rounded-full bg-white/20 px-4 py-2">
              <Text className="text-sm font-semibold text-white">{viewerMediaIndex + 1}/{viewerMediaItems.length}</Text>
            </View>
          )}
          {viewerMedia?.type === 'image' ? (
            <Image source={{ uri: viewerMedia.uri }} className="h-full w-full" resizeMode="contain" />
          ) : viewerMedia?.type === 'video' ? (
            <>
              <VideoPlayer source={{ uri: viewerMedia.uri }} style={styles.viewerVideo} resizeMode="contain" controls paused={false} muted={isViewerMuted} />
              <TouchableOpacity className="absolute bottom-8 right-4 h-12 w-12 items-center justify-center rounded-full bg-white/20" activeOpacity={0.8} onPress={() => setIsViewerMuted(c => !c)}>
                {isViewerMuted ? <VolumeX size={22} color="#fff" /> : <Volume2 size={22} color="#fff" />}
              </TouchableOpacity>
            </>
          ) : null}
          {viewerMediaIndex > 0 && (
            <TouchableOpacity className="absolute left-4 top-1/2 h-14 w-14 items-center justify-center rounded-full bg-white/20 -translate-y-1/2" activeOpacity={0.8} onPress={() => setViewerMediaIndex(i => i - 1)}>
              <ChevronLeft size={28} color="#fff" />
            </TouchableOpacity>
          )}
          {viewerMediaIndex < viewerMediaItems.length - 1 && (
            <TouchableOpacity className="absolute right-4 top-1/2 h-14 w-14 items-center justify-center rounded-full bg-white/20 -translate-y-1/2" activeOpacity={0.8} onPress={() => setViewerMediaIndex(i => i + 1)}>
              <ChevronRight size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  messageVideo: { height: '100%', width: '100%', backgroundColor: '#000' },
  viewerVideo: { width: '100%', height: '100%', backgroundColor: '#000' },
});

export default ChatScreen;
