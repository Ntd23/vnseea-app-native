// Description: Provides chat message and group chat state for the Messages presentation layer.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChatItem,
  GroupAddableUser,
  GroupChatInfo,
  GroupSharedAssets,
  GroupSharedMedia,
  GroupSharedLink,
  MessageAttachment,
  MessageItem,
} from '../../domain/types/messages.types';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import {
  emitChatTyping,
  emitChatTypingDone,
  getWebTypingState,
  onChatTyping,
  updateWebTypingState,
} from '../../infrastructure/realtime/liveKitCallRealtime';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { setUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { parseSharedPostMessage } from '../shared-posts/sharedPostMessage';
import {
  applyOptimisticMessageReaction,
  areMessageReactionSummariesEqual,
  createEmptyMessageReactionSummary,
} from '../../domain/reactions/messageReactions';
import type { ReactionType } from '../../../shared-kernel/domain/reactions/reactionCatalog';

const PAGE_SIZE = 30;
const POLL_INTERVAL_MS = 7000; // Poll every 7 seconds to reduce network/CPU load
const TYPING_EMIT_THROTTLE_MS = 1200;
const TYPING_IDLE_DONE_MS = 1800;
const TYPING_REMOTE_IDLE_MS = 2600;
const WEB_GROUP_TYPING_STATUS_SYNC_MS = 2000;
const URL_REGEX = /https?:\/\/[^\s)>]+/gi;
const repository = createMessagesRepository();

function areCallEventsEqual(
  left: MessageItem['callEvent'],
  right: MessageItem['callEvent'],
) {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    left.callId === right.callId &&
    left.callType === right.callType &&
    left.status === right.status &&
    left.duration === right.duration &&
    left.initiatorId === right.initiatorId &&
    left.receiverId === right.receiverId &&
    left.statusBy === right.statusBy &&
    left.isInitiator === right.isInitiator &&
    left.isReceiver === right.isReceiver &&
    left.isGroupCall === right.isGroupCall &&
    left.groupId === right.groupId &&
    left.action === right.action
  );
}

function areMessagesEqual(left: MessageItem, right: MessageItem) {
  return (
    left.id === right.id &&
    left.conversationId === right.conversationId &&
    left.fromId === right.fromId &&
    left.toId === right.toId &&
    left.message === right.message &&
    left.media === right.media &&
    left.mediaType === right.mediaType &&
    left.thumbnail === right.thumbnail &&
    left.time === right.time &&
    left.isSentByMe === right.isSentByMe &&
    left.seen === right.seen &&
    left.deliveryState === right.deliveryState &&
    left.sharedPost?.postId === right.sharedPost?.postId &&
    left.sharedPost?.url === right.sharedPost?.url &&
    left.sharedPost?.note === right.sharedPost?.note &&
    areMessageReactionSummariesEqual(left.reactions, right.reactions) &&
    areCallEventsEqual(left.callEvent, right.callEvent)
  );
}

function areMessageArraysSame(left: MessageItem[], right: MessageItem[]) {
  if (left.length !== right.length) return false;
  return left.every((message, index) => message === right[index]);
}

function getGroupRoomId(chat: ChatItem) {
  const groupId = getRawGroupId(chat);
  return groupId ? `group${groupId}` : '';
}

function getRawGroupId(chat: ChatItem) {
  return chat.groupId || chat.chatId || chat.userId || chat.id.replace(/^group:/, '');
}

function getTypingRecipientId(chat: ChatItem) {
  return chat.chatType === 'group' ? getGroupRoomId(chat) : chat.userId;
}

function isTypingEventForChat(
  chat: ChatItem,
  recipientId: string,
  senderId: string,
  currentUserId: string,
) {
  if (!senderId || senderId === currentUserId) return false;

  if (chat.chatType === 'group') {
    const groupId =
      chat.groupId ||
      chat.chatId ||
      chat.userId ||
      chat.id.replace(/^group:/, '');
    return recipientId === `group${groupId}` || recipientId === groupId;
  }

  return senderId === chat.userId;
}

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
      const isSameMessage = areMessagesEqual(current, message);

      if (
        !isSameMessage &&
        (shouldReplaceCallingStatus ||
          shouldKeepDeliveredOverPending ||
          message.time >= current.time)
      ) {
        messages.set(message.id, message);
      }
    }
  }

  return [...messages.values()].sort((left, right) => {
    const timeDifference = left.time - right.time;
    if (timeDifference !== 0) return timeDifference;

    return Number(left.id) - Number(right.id);
  });
}

export function useChatViewModel(chat: ChatItem) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [groupInfo, setGroupInfo] = useState<GroupChatInfo | null>(null);
  const [groupSharedAssetsOverride, setGroupSharedAssetsOverride] =
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
  const remoteTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const localTypingDoneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastTypingEmitRef = useRef(0);
  const latestMessageIdRef = useRef<string | undefined>(undefined);
  const oldestMessageIdRef = useRef<string | undefined>(undefined);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const messagesRef = useRef<MessageItem[]>(messages);
  const pendingReactionMessageIdsRef = useRef<Set<string>>(new Set());
  const isLoadingRef = useRef(isLoading);
  const isLoadingMoreRef = useRef(isLoadingMore);
  const hasMoreRef = useRef(hasMore);
  const initialLoadPromiseRef = useRef<Promise<void>>(Promise.resolve());
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
  const typingRecipientId = getTypingRecipientId(chat);

  const stopTyping = useCallback(() => {
    if (!typingRecipientId) return;
    if (localTypingDoneTimeoutRef.current) {
      clearTimeout(localTypingDoneTimeoutRef.current);
      localTypingDoneTimeoutRef.current = null;
    }
    lastTypingEmitRef.current = 0;
    emitChatTypingDone(typingRecipientId);
    updateWebTypingState(typingRecipientId, false);
  }, [typingRecipientId]);

  const notifyTyping = useCallback(
    (nextText: string) => {
      if (!typingRecipientId) return;
      if (!nextText.trim()) {
        stopTyping();
        return;
      }

      const now = Date.now();
      if (now - lastTypingEmitRef.current >= TYPING_EMIT_THROTTLE_MS) {
        emitChatTyping(typingRecipientId);
        updateWebTypingState(typingRecipientId, true);
        lastTypingEmitRef.current = now;
      }

      if (localTypingDoneTimeoutRef.current) {
        clearTimeout(localTypingDoneTimeoutRef.current);
      }
      localTypingDoneTimeoutRef.current = setTimeout(() => {
        emitChatTypingDone(typingRecipientId);
        updateWebTypingState(typingRecipientId, false);
        localTypingDoneTimeoutRef.current = null;
        lastTypingEmitRef.current = 0;
      }, TYPING_IDLE_DONE_MS);
    },
    [stopTyping, typingRecipientId],
  );

  const loadInitial = useCallback(() => {
    const operation = (async () => {
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
        setError(
          err instanceof Error ? err.message : 'Không tải được tin nhắn',
        );
      } finally {
        setIsLoading(false);
      }
    })();
    initialLoadPromiseRef.current = operation;
    return operation;
  }, [chat.chatType, chat.userId, getMessagesForChat]);

  const loadOlder = useCallback(async () => {
    const oldestMessageId = oldestMessageIdRef.current;
    if (
      isLoadingRef.current ||
      isLoadingMoreRef.current ||
      !hasMoreRef.current ||
      !oldestMessageId
    ) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const page = await getMessagesForChat({
        limit: PAGE_SIZE,
        beforeMessageId: oldestMessageId,
      });
      setMessages(current => {
        const merged = mergeMessages(current, page);
        return areMessageArraysSame(current, merged) ? current : merged;
      });
      setHasMore(page.length >= PAGE_SIZE);
      setIsTyping(false);
      setIsRecording(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không tải thêm được tin nhắn',
      );
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [getMessagesForChat]);

  const refreshLatest = useCallback(
    async (showSpinner = true) => {
      if (isLoading || isSending || isRefreshingRef.current) return;

      isRefreshingRef.current = true;
      if (showSpinner) setIsRefreshing(true);

      try {
        const page = await getMessagesForChat({
          limit: PAGE_SIZE,
        });
        setMessages(current => {
          const currentById = new Map(
            current.map(message => [message.id, message]),
          );
          const pageWithPendingReactions = page.map(message => {
            if (!pendingReactionMessageIdsRef.current.has(message.id)) {
              return message;
            }
            const existing = currentById.get(message.id);
            return existing
              ? { ...message, reactions: existing.reactions }
              : message;
          });
          const merged = mergeMessages(current, pageWithPendingReactions);
          return areMessageArraysSame(current, merged) ? current : merged;
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Không cập nhật được tin nhắn',
        );
      } finally {
        isRefreshingRef.current = false;
        if (showSpinner) setIsRefreshing(false);
      }
    },
    [getMessagesForChat, isLoading, isSending],
  );

  const loadMessageContext = useCallback(
    async (messageId: string) => {
      if (!messageId) return;
      try {
        await initialLoadPromiseRef.current.catch(() => undefined);
        const [targetMessage, olderMessages] = await Promise.all([
          getMessagesForChat({
            limit: 1,
            messageId,
          }),
          getMessagesForChat({
            limit: PAGE_SIZE,
            beforeMessageId: messageId,
          }),
        ]);
        if (targetMessage.length === 0) {
          throw new Error('Không tìm thấy tin nhắn cần mở.');
        }
        setMessages(current =>
          mergeMessages(current, targetMessage, olderMessages),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Không tải được tin nhắn',
        );
        throw err;
      }
    },
    [getMessagesForChat],
  );

  const setMessagePinned = useCallback(
    async (messageId: string, pinned: boolean) => {
      if (chat.chatType !== 'user') {
        throw new Error('Cuộc trò chuyện chưa có mã hợp lệ.');
      }
      const conversation =
        chat.hasConversationRecord && chat.chatId
          ? chat
          : await repository.findUserConversation(
              chat.participantId || chat.userId,
            );
      if (!conversation?.chatId) {
        throw new Error('Cuộc trò chuyện chưa có mã hợp lệ.');
      }
      await repository.setMessagePinned(
        conversation.chatId,
        messageId,
        pinned,
      );
    },
    [chat],
  );

  const setMessageReaction = useCallback(
    async (messageId: string, reaction: ReactionType | null) => {
      if (!messageId || pendingReactionMessageIdsRef.current.has(messageId)) {
        return false;
      }

      const originalMessage = messagesRef.current.find(
        message => message.id === messageId,
      );
      if (!originalMessage || originalMessage.deliveryState === 'sending') {
        return false;
      }

      const previousReactions = originalMessage.reactions;
      const optimisticReactions = applyOptimisticMessageReaction(
        previousReactions,
        reaction,
      );
      pendingReactionMessageIdsRef.current.add(messageId);
      setMessages(current =>
        current.map(message =>
          message.id === messageId
            ? { ...message, reactions: optimisticReactions }
            : message,
        ),
      );
      setError(null);

      try {
        const reactions = await repository.setMessageReaction(
          messageId,
          reaction,
        );
        setMessages(current =>
          current.map(message =>
            message.id === messageId ? { ...message, reactions } : message,
          ),
        );
        return true;
      } catch (err) {
        setMessages(current =>
          current.map(message =>
            message.id === messageId
              ? { ...message, reactions: previousReactions }
              : message,
          ),
        );
        const message =
          err instanceof Error
            ? err.message
            : 'Không thể cập nhật cảm xúc.';
        setError(message);
        throw err;
      } finally {
        pendingReactionMessageIdsRef.current.delete(messageId);
      }
    },
    [],
  );

  const sendMessage = useCallback(
    async (text: string, attachment?: MessageAttachment) => {
      const message = text.trim();
      if (!message && !attachment) return false;
      stopTyping();

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
        sharedPost: parseSharedPostMessage(message, apiConfig.webBaseUrl),
        reactions: createEmptyMessageReactionSummary(),
        time: Math.floor(Date.now() / 1000),
        isSentByMe: true,
        seen: 0,
        deliveryState: 'sending',
      };

      setMessages(current => mergeMessages(current, [optimisticMessage]));
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
            current.filter(item => item.id !== tempId),
            sentMessages,
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
    [chat, getMessagesForChat, sendMessageForChat, stopTyping],
  );

  const loadGroupInfo = useCallback(async () => {
    if (chat.chatType !== 'group') return null;
    const groupId = getRawGroupId(chat);

    setIsLoadingGroupInfo(true);
    setError(null);

    try {
      const info = await repository.getGroupInfo(groupId);
      setGroupInfo(info);
      return info;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không tải được thông tin nhóm',
      );
      return null;
    } finally {
      setIsLoadingGroupInfo(false);
    }
  }, [chat]);

  const searchAddableUsers = useCallback(
    async (keyword: string) => {
      if (chat.chatType !== 'group') return [];

      setIsLoadingAddableUsers(true);
      try {
        const users = await repository.searchAddableUsers(getRawGroupId(chat), keyword);
        setAddableUsers(users);
        return users;
      } finally {
        setIsLoadingAddableUsers(false);
      }
    },
    [chat],
  );

  const addGroupUsers = useCallback(
    async (userIds: string[]) => {
      if (chat.chatType !== 'group' || userIds.length === 0) return false;

      await repository.addGroupUsers(getRawGroupId(chat), userIds);
      await loadGroupInfo();
      return true;
    },
    [chat, loadGroupInfo],
  );

  const removeGroupUser = useCallback(
    async (userId: string) => {
      if (chat.chatType !== 'group') return false;

      await repository.removeGroupUser(getRawGroupId(chat), userId);
      await loadGroupInfo();
      return true;
    },
    [chat, loadGroupInfo],
  );

  const clearGroupHistory = useCallback(async () => {
    if (chat.chatType !== 'group') return false;

    await repository.clearGroupHistory(getRawGroupId(chat));
    setMessages([]);
    setGroupSharedAssetsOverride({
      media: [],
      files: [],
      links: [],
    });
    return true;
  }, [chat]);

  const leaveGroup = useCallback(async () => {
    if (chat.chatType !== 'group') return false;

    await repository.leaveGroup(getRawGroupId(chat));
    return true;
  }, [chat]);

  const deleteGroup = useCallback(async () => {
    if (chat.chatType !== 'group') return false;

    await repository.deleteGroup(getRawGroupId(chat));
    return true;
  }, [chat]);

  const editGroup = useCallback(
    async (input: { name?: string; avatar?: MessageAttachment }) => {
      if (chat.chatType !== 'group') return null;

      const info = await repository.editGroup(getRawGroupId(chat), input);
      setGroupInfo(info);
      return info;
    },
    [chat],
  );

  useEffect(() => {
    loadInitial().catch(() => undefined);
  }, [loadInitial]);

  useEffect(() => {
    const currentUserId = sessionStorage.getSession()?.userId ?? '';
    const unsubscribe = onChatTyping(event => {
      if (
        !isTypingEventForChat(
          chat,
          event.recipientId,
          event.senderId,
          currentUserId,
        )
      ) {
        return;
      }

      if (remoteTypingTimeoutRef.current) {
        clearTimeout(remoteTypingTimeoutRef.current);
        remoteTypingTimeoutRef.current = null;
      }

      if (!event.isTyping) {
        setIsTyping(false);
        return;
      }

      setIsTyping(true);
      remoteTypingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        remoteTypingTimeoutRef.current = null;
      }, TYPING_REMOTE_IDLE_MS);
    });

    return () => {
      unsubscribe();
      if (remoteTypingTimeoutRef.current) {
        clearTimeout(remoteTypingTimeoutRef.current);
        remoteTypingTimeoutRef.current = null;
      }
      stopTyping();
    };
  }, [chat, stopTyping]);

  useEffect(() => {
    if (chat.chatType !== 'group' || !typingRecipientId) return undefined;

    let isMounted = true;
    const syncWebGroupTypingState = async () => {
      const status = await getWebTypingState(typingRecipientId).catch(
        () => null,
      );
      if (!isMounted || !status?.enabled || !status.typing) return;

      setIsTyping(true);
      if (remoteTypingTimeoutRef.current) {
        clearTimeout(remoteTypingTimeoutRef.current);
      }
      remoteTypingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        remoteTypingTimeoutRef.current = null;
      }, TYPING_REMOTE_IDLE_MS);
    };

    syncWebGroupTypingState().catch(() => undefined);
    const interval = setInterval(
      () => syncWebGroupTypingState().catch(() => undefined),
      WEB_GROUP_TYPING_STATUS_SYNC_MS,
    );

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [chat.chatType, typingRecipientId]);

  useEffect(() => {
    messagesRef.current = messages;
    latestMessageIdRef.current = messages[messages.length - 1]?.id;
    oldestMessageIdRef.current = messages[0]?.id;
    messageIdsRef.current = new Set(messages.map(message => message.id));
  }, [messages]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshLatest(false).catch(() => undefined);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [refreshLatest]);

  // Build shared assets from loaded messages
  const groupSharedAssetsFromMessages = useMemo<GroupSharedAssets>(() => {
    const media: GroupSharedMedia[] = [];
    const links: GroupSharedLink[] = [];
    for (const msg of messages) {
      if (msg.media) {
        if (msg.mediaType === 'image' || msg.mediaType === 'video') {
          media.push({
            id: msg.id,
            uri: msg.media,
            mediaType: msg.mediaType,
            time: msg.time,
          });
        }
      }
      if (msg.message) {
        const urls = msg.message.match(URL_REGEX);
        if (urls) {
          for (const url of urls) {
            links.push({
              id: `${msg.id}-${url}`,
              url,
              title: url,
              time: msg.time,
            });
          }
        }
      }
    }
    return { media, files: [], links };
  }, [messages]);

  const groupSharedAssets = groupSharedAssetsOverride ?? groupSharedAssetsFromMessages;

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
    loadMessageContext,
    setMessagePinned,
    setMessageReaction,
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
  };
}
