// Description: Provides chat message and group chat state for the Messages presentation layer.
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ChatItem,
  GroupAddableUser,
  GroupChatInfo,
  GroupSharedAssets,
  MessageAttachment,
  MessageItem,
} from '../../domain/types/messages.types';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { setUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';

const PAGE_SIZE = 30;
const POLL_INTERVAL_MS = 7000; // Poll every 7 seconds to reduce network/CPU load
const repository = createMessagesRepository();

function mergeMessages(...messageLists: MessageItem[][]) {
  const messages = new Map<string, MessageItem>();

  for (const message of messageLists.flat()) {
    if (message.id) {
      const current = messages.get(message.id);
      if (!current) {
        messages.set(message.id, message);
        continue;
      }

      const currentStatus = current.callEvent?.status;
      const nextStatus = message.callEvent?.status;
      const shouldReplaceCallingStatus =
        currentStatus === 'calling' &&
        Boolean(nextStatus) &&
        nextStatus !== 'calling';
      const shouldKeepDeliveredOverPending =
        current.deliveryState !== undefined &&
        message.deliveryState === undefined;

      if (
        shouldReplaceCallingStatus ||
        shouldKeepDeliveredOverPending ||
        message.time >= current.time
      ) {
        messages.set(message.id, message);
      }
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
  const [groupInfo, setGroupInfo] = useState<GroupChatInfo | null>(null);
  const [groupSharedAssets, setGroupSharedAssets] =
    useState<GroupSharedAssets | null>(null);
  const [addableUsers, setAddableUsers] = useState<GroupAddableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGroupInfo, setIsLoadingGroupInfo] = useState(false);
  const [isLoadingAddableUsers, setIsLoadingAddableUsers] = useState(false);
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
      repository.getMessages(chat, options),
    [chat],
  );
  const sendMessageForChat = useCallback(
    (message: string, attachment?: MessageAttachment) =>
      repository.sendMessage(chat, message, attachment),
    [chat],
  );

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const page = await getMessagesForChat({
        limit: PAGE_SIZE,
      });
      setMessages(mergeMessages(page));
      setHasMore(page.length >= PAGE_SIZE);
      setIsTyping(false);
      setIsRecording(false);
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
  }, [chat]);

  const loadOlder = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore || messages.length === 0) {
      return;
    }

    const oldestMessage = messages[messages.length - 1];
    setIsLoadingMore(true);

    try {
      const page = await getMessagesForChat({
        limit: PAGE_SIZE,
        beforeMessageId: oldestMessage.id,
      });
      setMessages(current => mergeMessages(current, page));
      setHasMore(page.length >= PAGE_SIZE);
      setIsTyping(false);
      setIsRecording(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không tải thêm được tin nhắn',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [chat, hasMore, isLoading, isLoadingMore, messages]);

  const refreshLatest = useCallback(
    async (showSpinner = true) => {
      if (isLoading || isSending || isRefreshingRef.current) return;

      isRefreshingRef.current = true;
      if (showSpinner) setIsRefreshing(true);

      try {
        const page = await getMessagesForChat({
          limit: PAGE_SIZE,
        });
        setMessages(current => mergeMessages(current, page));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Không cập nhật được tin nhắn',
        );
      } finally {
        isRefreshingRef.current = false;
        if (showSpinner) setIsRefreshing(false);
      }
    },
    [chat, isLoading, isSending, messages],
  );

  const sendMessage = useCallback(
    async (text: string, attachment?: MessageAttachment) => {
      const message = text.trim();
      if (!message && !attachment) return false;

      const tempId = `pending-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
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
          sentMessages = await getMessagesForChat({
            limit: 1,
          });
        }

        setMessages(current =>
          mergeMessages(
            sentMessages,
            current.filter(item => item.id !== tempId),
          ),
        );
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Không gửi được tin nhắn',
        );
        setMessages(current =>
          current.map(item =>
            item.id === tempId ? { ...item, deliveryState: 'failed' } : item,
          ),
        );
        return false;
      } finally {
        setPendingSendCount(current => Math.max(0, current - 1));
      }
    },
    [chat, getMessagesForChat, sendMessageForChat],
  );

  const loadGroupInfo = useCallback(async () => {
    if (chat.chatType !== 'group') return null;
    const groupId = chat.groupId || chat.userId;

    setIsLoadingGroupInfo(true);
    setError(null);

    try {
      const [info, assets] = await Promise.all([
        repository.getGroupInfo(groupId),
        repository.getGroupSharedAssets(groupId).catch(() => null),
      ]);
      setGroupInfo(info);
      if (assets) setGroupSharedAssets(assets);
      return info;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không tải được thông tin nhóm',
      );
      return null;
    } finally {
      setIsLoadingGroupInfo(false);
    }
  }, [chat.chatType, chat.groupId, chat.userId]);

  const searchAddableUsers = useCallback(
    async (keyword: string) => {
      if (chat.chatType !== 'group') return [];

      setIsLoadingAddableUsers(true);
      try {
        const users = await repository.searchAddableUsers(
          chat.groupId || chat.userId,
          keyword,
        );
        setAddableUsers(users);
        return users;
      } finally {
        setIsLoadingAddableUsers(false);
      }
    },
    [chat.chatType, chat.groupId, chat.userId],
  );

  const addGroupUsers = useCallback(
    async (userIds: string[]) => {
      if (chat.chatType !== 'group' || userIds.length === 0) return false;

      await repository.addGroupUsers(chat.groupId || chat.userId, userIds);
      await loadGroupInfo();
      return true;
    },
    [chat.chatType, chat.groupId, chat.userId, loadGroupInfo],
  );

  const removeGroupUser = useCallback(
    async (userId: string) => {
      if (chat.chatType !== 'group') return false;

      await repository.removeGroupUser(chat.groupId || chat.userId, userId);
      await loadGroupInfo();
      return true;
    },
    [chat.chatType, chat.groupId, chat.userId, loadGroupInfo],
  );

  const clearGroupHistory = useCallback(async () => {
    if (chat.chatType !== 'group') return false;

    await repository.clearGroupHistory(chat.groupId || chat.userId);
    setMessages([]);
    setGroupSharedAssets({
      media: [],
      files: [],
      links: [],
    });
    return true;
  }, [chat.chatType, chat.groupId, chat.userId]);

  const leaveGroup = useCallback(async () => {
    if (chat.chatType !== 'group') return false;

    await repository.leaveGroup(chat.groupId || chat.userId);
    return true;
  }, [chat.chatType, chat.groupId, chat.userId]);

  const editGroup = useCallback(
    async (input: { name?: string; avatar?: MessageAttachment }) => {
      if (chat.chatType !== 'group') return null;

      const info = await repository.editGroup(
        chat.groupId || chat.userId,
        input,
      );
      setGroupInfo(info);
      return info;
    },
    [chat.chatType, chat.groupId, chat.userId],
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
    groupInfo,
    groupSharedAssets,
    addableUsers,
    isLoading,
    isLoadingGroupInfo,
    isLoadingAddableUsers,
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
    loadGroupInfo,
    searchAddableUsers,
    addGroupUsers,
    removeGroupUser,
    clearGroupHistory,
    leaveGroup,
    editGroup,
  };
}
