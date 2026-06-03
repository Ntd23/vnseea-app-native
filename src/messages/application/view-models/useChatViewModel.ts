import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ChatItem,
  MessageAttachment,
  MessageItem,
} from '../../domain/types/messages.types';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { setUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';

const PAGE_SIZE = 30;
const POLL_INTERVAL_MS = 3000; // Poll every 3 seconds for real-time feel
const repository = createMessagesRepository();

function mergeMessages(...messageLists: MessageItem[][]) {
  const messages = new Map<string, MessageItem>();

  for (const message of messageLists.flat()) {
    if (message.id) {
      messages.set(message.id, message);
    }
  }

  return [...messages.values()].sort((left, right) => {
    const timeDifference = right.time - left.time;
    if (timeDifference !== 0) return timeDifference;

    return Number(right.id) - Number(left.id);
  });
}

export function useChatViewModel(chat: ChatItem) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSendCount, setPendingSendCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const isRefreshingRef = useRef(false);
  const latestMessageIdRef = useRef<string | undefined>(undefined);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const isSending = pendingSendCount > 0;
  const getMessagesForChat = useCallback(
    (options?: Parameters<typeof repository.getMessages>[1]) =>
      chat.chatType === 'group'
        ? repository.getGroupMessages(chat.userId, options)
        : repository.getMessages(chat.userId, options),
    [chat.chatType, chat.userId],
  );
  const sendMessageForChat = useCallback(
    (message: string, attachment?: MessageAttachment) =>
      chat.chatType === 'group'
        ? repository.sendGroupMessage(chat.userId, message, attachment)
        : repository.sendMessage(chat.userId, message, attachment),
    [chat.chatType, chat.userId],
  );

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getMessagesForChat({
        limit: PAGE_SIZE,
      });
      setMessages(mergeMessages(result.messages));
      setHasMore(result.messages.length >= PAGE_SIZE);
      setIsTyping(Boolean(result.typing));
      setIsRecording(Boolean(result.is_recording));
      if (chat.chatType !== 'group') {
        repository
          .markAsSeen(chat.userId)
          .then(() => setUnreadBadgeCounts({ messageCount: 0 }))
          .catch(() => undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được tin nhắn');
    } finally {
      setIsLoading(false);
    }
  }, [chat.chatType, chat.userId, getMessagesForChat]);

  const loadOlder = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore || messages.length === 0) {
      return;
    }

    const oldestMessage = messages[messages.length - 1];
    setIsLoadingMore(true);

    try {
      const result = await getMessagesForChat({
        limit: PAGE_SIZE,
        beforeMessageId: oldestMessage.id,
      });
      setMessages(current => mergeMessages(current, result.messages));
      setHasMore(result.messages.length >= PAGE_SIZE);
      setIsTyping(Boolean(result.typing));
      setIsRecording(Boolean(result.is_recording));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải thêm được tin nhắn');
    } finally {
      setIsLoadingMore(false);
    }
  }, [getMessagesForChat, hasMore, isLoading, isLoadingMore, messages]);

  const refreshLatest = useCallback(async (showSpinner = true) => {
    if (isLoading || isSending || isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    if (showSpinner) setIsRefreshing(true);

    try {
      const result = await getMessagesForChat({
        limit: 10,
        afterMessageId: latestMessageIdRef.current,
      });

      setIsTyping(Boolean(result.typing));
      setIsRecording(Boolean(result.is_recording));

      if (result.messages.length > 0) {
        const knownIds = messageIdsRef.current;
        const newMessages = result.messages.filter(
          message => !knownIds.has(message.id),
        );

        if (newMessages.length > 0) {
          setMessages(current => mergeMessages(newMessages, current));

          if (
            chat.chatType !== 'group' &&
            newMessages.some(message => !message.isSentByMe)
          ) {
            repository
              .markAsSeen(chat.userId)
              .then(() => setUnreadBadgeCounts({ messageCount: 0 }))
              .catch(() => undefined);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cập nhật được tin nhắn');
    } finally {
      isRefreshingRef.current = false;
      if (showSpinner) setIsRefreshing(false);
    }
  }, [chat.chatType, chat.userId, getMessagesForChat, isLoading, isSending]);

  const sendMessage = useCallback(
    async (text: string, attachment?: MessageAttachment) => {
      const message = text.trim();
      if (!message && !attachment) return false;

      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimisticMessage: MessageItem = {
        id: tempId,
        conversationId: '',
        fromId: sessionStorage.getSession()?.userId ?? '',
        toId: chat.userId,
        message,
        media: attachment?.uri,
        mediaType: attachment?.mediaType,
        time: Math.floor(Date.now() / 1000),
        isSentByMe: true,
        seen: 0,
        deliveryState: 'sending',
      };

      setMessages(current => mergeMessages([optimisticMessage], current));
      setPendingSendCount(current => current + 1);
      setError(null);

      try {
        const response = await sendMessageForChat(message, attachment);
        let sentMessages = response.sentMessages ?? [];

        if (sentMessages.length === 0) {
          const result = await getMessagesForChat({
            limit: 1,
          });
          sentMessages = result.messages;
        }

        setMessages(current =>
          mergeMessages(
            sentMessages,
            current.filter(item => item.id !== tempId),
          ),
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không gửi được tin nhắn');
        setMessages(current =>
          current.map(item =>
            item.id === tempId
              ? { ...item, deliveryState: 'failed' }
              : item,
          ),
        );
        return false;
      } finally {
        setPendingSendCount(current => Math.max(0, current - 1));
      }
    },
    [chat.userId, getMessagesForChat, sendMessageForChat],
  );

  useEffect(() => {
    loadInitial().catch(() => undefined);
  }, [loadInitial]);

  useEffect(() => {
    latestMessageIdRef.current = messages[0]?.id;
    messageIdsRef.current = new Set(messages.map(message => message.id));
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshLatest(false).catch(() => undefined);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [refreshLatest]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    isRefreshing,
    isSending,
    isTyping,
    isRecording,
    hasMore,
    error,
    loadInitial,
    loadOlder,
    refreshLatest,
    sendMessage,
  };
}
