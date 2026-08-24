// Description: Provides chat message and group chat state for the Messages presentation layer.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type {
  ChatItem,
  GroupAddableUser,
  GroupChatInfo,
  GroupSharedAssets,
  GroupSharedMedia,
  GroupSharedLink,
  MessageAttachment,
  MessageItem,
  PinnedMessageItem,
  SendMessageOptions,
} from '../../domain/types/messages.types';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import {
  getWebTypingState,
  updateWebTypingState,
} from '../../infrastructure/realtime/liveKitCallRealtime';
import {
  emitMessageTyping as emitChatTyping,
  emitMessageTypingDone as emitChatTypingDone,
  isMessageRealtimeConnected,
  onMessageTyping as onChatTyping,
  subscribeToMessageInvalidations,
  subscribeToMessageRealtimeConnection,
} from '../../infrastructure/realtime/messageRealtimeRuntime';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { setUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { describeMessageTextContent } from '../preview/messageContentDescriptor';
import {
  applyOptimisticMessageReaction,
  areMessageReactionSummariesEqual,
  createEmptyMessageReactionSummary,
} from '../../domain/reactions/messageReactions';
import type { ReactionType } from '../../../shared-kernel/domain/reactions/reactionCatalog';
import {
  CHAT_FALLBACK_POLL_DELAYS_MS,
  getBoundedFallbackPollDelay,
} from '../polling/messageFallbackPolling';
import { preserveOptimisticVideoThumbnail } from '../media/messageVideoMedia';

const PAGE_SIZE = 30;
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
    left.senderName === right.senderName &&
    left.senderAvatar === right.senderAvatar &&
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
    left.sharedPost?.isLive === right.sharedPost?.isLive &&
    left.storyReply?.storyId === right.storyReply?.storyId &&
    left.storyReply?.available === right.storyReply?.available &&
    left.storyReply?.thumbnailUrl === right.storyReply?.thumbnailUrl &&
    left.replyTo?.messageId === right.replyTo?.messageId &&
    left.replyTo?.senderId === right.replyTo?.senderId &&
    left.replyTo?.senderName === right.replyTo?.senderName &&
    left.replyTo?.text === right.replyTo?.text &&
    left.replyTo?.contentKind === right.replyTo?.contentKind &&
    left.replyTo?.media === right.replyTo?.media &&
    left.replyTo?.thumbnail === right.replyTo?.thumbnail &&
    left.replyTo?.sharedPost?.postId === right.replyTo?.sharedPost?.postId &&
    left.replyTo?.sharedPost?.isLive === right.replyTo?.sharedPost?.isLive &&
    left.replyTo?.storyReply?.storyId === right.replyTo?.storyReply?.storyId &&
    left.replyTo?.storyReply?.available ===
      right.replyTo?.storyReply?.available &&
    left.replyTo?.link?.url === right.replyTo?.link?.url &&
    left.replyTo?.location?.latitude === right.replyTo?.location?.latitude &&
    left.replyTo?.location?.longitude === right.replyTo?.location?.longitude &&
    areCallEventsEqual(left.replyTo?.callEvent, right.replyTo?.callEvent) &&
    left.systemEvent?.type === right.systemEvent?.type &&
    left.systemEvent?.actorId === right.systemEvent?.actorId &&
    left.systemEvent?.actorName === right.systemEvent?.actorName &&
    left.systemEvent?.targetMessageId ===
      right.systemEvent?.targetMessageId &&
    left.systemEvent?.targetUserId === right.systemEvent?.targetUserId &&
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
        messages.set(message.id, {
          ...message,
          mediaGroupId: message.mediaGroupId ?? current.mediaGroupId,
        });
      }
    }
  }

  return [...messages.values()].sort((left, right) => {
    const timeDifference = left.time - right.time;
    if (timeDifference !== 0) return timeDifference;

    return Number(left.id) - Number(right.id);
  });
}

export function useChatViewModel(chat: ChatItem, isScreenFocused = true) {
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
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessageItem[]>([]);
  const [isLoadingPinnedMessages, setIsLoadingPinnedMessages] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(
    isMessageRealtimeConnected(),
  );
  const isSending = pendingSendCount > 0;
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
  const isSendingRef = useRef(isSending);
  const isLoadingMoreRef = useRef(isLoadingMore);
  const hasMoreRef = useRef(hasMore);
  const initialLoadPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const getMessagesForChat = useCallback(
    (options?: Parameters<typeof repository.getMessages>[1]) =>
      repository.getMessages(chat, options),
    [chat],
  );
  const sendMessageForChat = useCallback(
    (
      message: string,
      attachment?: MessageAttachment,
      options?: SendMessageOptions,
    ) => repository.sendMessage(chat, message, attachment, options),
    [chat],
  );
  const typingRecipientId = getTypingRecipientId(chat);

  const loadPinnedMessages = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoadingPinnedMessages(true);
    try {
      const nextPinnedMessages = await repository.getPinnedMessages(chat);
      setPinnedMessages(nextPinnedMessages);
      return nextPinnedMessages;
    } finally {
      if (showLoading) setIsLoadingPinnedMessages(false);
    }
  }, [chat]);

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
      loadPinnedMessages().catch(() => undefined);
    })();
    initialLoadPromiseRef.current = operation;
    return operation;
  }, [chat.chatType, chat.userId, getMessagesForChat, loadPinnedMessages]);

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
      if (
        isLoadingRef.current ||
        isSendingRef.current ||
        isRefreshingRef.current
      ) {
        return false;
      }

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
      return true;
    },
    [getMessagesForChat],
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
      const previousPinnedMessages = pinnedMessages;
      const targetMessage = messagesRef.current.find(
        message => message.id === messageId,
      );

      setPinnedMessages(current => {
        if (!pinned) {
          return current.filter(message => message.id !== messageId);
        }
        if (!targetMessage) return current;
        const optimistic: PinnedMessageItem = {
          ...targetMessage,
          pinnedAt: Math.floor(Date.now() / 1000),
          pinnedByUserId: sessionStorage.getSession()?.userId ?? '',
          pinnedByName: 'Bạn',
          canUnpin: true,
        };
        return [optimistic, ...current.filter(item => item.id !== messageId)];
      });

      try {
        let targetChat = chat;
        if (
          chat.chatType === 'user' &&
          (!chat.hasConversationRecord || !chat.chatId)
        ) {
          const conversation = await repository.findUserConversation(
            chat.participantId || chat.userId,
          );
          if (!conversation?.chatId) {
            throw new Error('Cuộc trò chuyện chưa có mã hợp lệ.');
          }
          targetChat = conversation;
        }
        await repository.setMessagePinned(targetChat, messageId, pinned);
        await Promise.all([
          loadPinnedMessages(false),
          refreshLatest(false),
        ]);
      } catch (caught) {
        setPinnedMessages(previousPinnedMessages);
        throw caught;
      }
    },
    [chat, loadPinnedMessages, pinnedMessages, refreshLatest],
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
    async (
      text: string,
      attachment?: MessageAttachment,
      options?: SendMessageOptions,
    ) => {
      const message = text.trim();
      if (!message && !attachment) return false;
      stopTyping();

      const tempId = `pending-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const textDescriptor = describeMessageTextContent(
        message,
        apiConfig.webBaseUrl,
      );
      const marketplaceContext = options?.productInquiry
        ? {
            type: 'product_inquiry' as const,
            productId: options.productInquiry.productId,
            name: options.productInquiry.name || 'Sản phẩm',
            price: options.productInquiry.price,
            image: options.productInquiry.image,
            location: options.productInquiry.location,
            note: options.productInquiry.note || message || undefined,
          }
        : undefined;
      const optimisticMessage: MessageItem = {
        id: tempId,
        conversationId: '',
        fromId: sessionStorage.getSession()?.userId ?? '',
        toId: chat.userId,
        message,
        media: attachment?.uri,
        mediaType: attachment?.mediaType,
        thumbnail: attachment?.thumbnailUri,
        mediaGroupId: options?.mediaGroupId,
        sharedPost: textDescriptor.sharedPost,
        storyReply: options?.storyReply,
        contentKind:
          attachment?.mediaType ??
          (options?.storyReply
            ? 'story'
            : marketplaceContext
            ? 'product'
            : textDescriptor.kind),
        link: textDescriptor.link,
        location: textDescriptor.location,
        marketplaceContext,
        mentions: options?.mentions,
        replyTo: options?.replyTo,
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
        const response = await sendMessageForChat(
          message,
          attachment,
          options,
        );
        let sentMessages = response.sentMessages ?? [];

        if (sentMessages.length === 0) {
          sentMessages = await getMessagesForChat({
            limit: 1,
          });
        }

        if (options?.mediaGroupId) {
          sentMessages = sentMessages.map(item => ({
            ...item,
            mediaGroupId: options.mediaGroupId,
          }));
        }

        sentMessages = preserveOptimisticVideoThumbnail(
          sentMessages,
          optimisticMessage,
        );

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

    await repository.clearGroupHistory(chat);
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

  useEffect(
    () => subscribeToMessageRealtimeConnection(setIsRealtimeConnected),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let running = false;
    let dirty = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = async () => {
      if (running || cancelled) return;
      running = true;
      try {
        while (dirty && !cancelled) {
          dirty = false;
          const refreshed = await refreshLatest(false);
          if (!refreshed) {
            dirty = true;
            if (!retryTimer) {
              retryTimer = setTimeout(() => {
                retryTimer = null;
                flush().catch(() => undefined);
              }, 300);
            }
            return;
          }
          await loadPinnedMessages(false).catch(() => undefined);
          if (chat.chatType === 'group') {
            await loadGroupInfo().catch(() => undefined);
          }
        }
      } finally {
        running = false;
      }
    };

    const unsubscribe = subscribeToMessageInvalidations(() => {
      dirty = true;
      flush().catch(() => undefined);
    });
    return () => {
      cancelled = true;
      unsubscribe();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [chat.chatType, loadGroupInfo, loadPinnedMessages, refreshLatest]);

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
    if (
      chat.chatType !== 'group' ||
      !typingRecipientId ||
      isRealtimeConnected ||
      !isScreenFocused
    ) {
      return undefined;
    }

    let isMounted = true;
    let isSyncing = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
    };

    const scheduleNextSync = () => {
      if (!isMounted || AppState.currentState !== 'active') return;
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        syncWebGroupTypingState().catch(() => undefined);
      }, WEB_GROUP_TYPING_STATUS_SYNC_MS);
    };

    const syncWebGroupTypingState = async () => {
      if (
        !isMounted ||
        isSyncing ||
        AppState.currentState !== 'active'
      ) {
        return;
      }
      isSyncing = true;
      try {
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
      } finally {
        isSyncing = false;
        scheduleNextSync();
      }
    };

    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState !== 'active') {
          clearTimer();
          return;
        }
        syncWebGroupTypingState().catch(() => undefined);
      },
    );

    syncWebGroupTypingState().catch(() => undefined);

    return () => {
      isMounted = false;
      clearTimer();
      appStateSubscription.remove();
    };
  }, [
    chat.chatType,
    isRealtimeConnected,
    isScreenFocused,
    typingRecipientId,
  ]);

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
    isSendingRef.current = isSending;
  }, [isSending]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    if (isRealtimeConnected || !isScreenFocused) return undefined;

    let cancelled = false;
    let running = false;
    let completedPollCount = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
    };

    const scheduleNextPoll = () => {
      if (cancelled || AppState.currentState !== 'active') return;
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        poll().catch(() => undefined);
      }, getBoundedFallbackPollDelay(
        CHAT_FALLBACK_POLL_DELAYS_MS,
        completedPollCount,
      ));
    };

    const poll = async () => {
      if (cancelled || running || AppState.currentState !== 'active') return;
      running = true;
      try {
        const refreshed = await refreshLatest(false);
        if (refreshed && !cancelled) {
          await loadPinnedMessages(false).catch(() => undefined);
          completedPollCount += 1;
        }
      } finally {
        running = false;
        scheduleNextPoll();
      }
    };

    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState !== 'active') {
          clearTimer();
          return;
        }
        completedPollCount = 0;
        scheduleNextPoll();
      },
    );

    scheduleNextPoll();

    return () => {
      cancelled = true;
      clearTimer();
      appStateSubscription.remove();
    };
  }, [isRealtimeConnected, isScreenFocused, loadPinnedMessages, refreshLatest]);

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
    pinnedMessages,
    isLoadingPinnedMessages,
    hasMore,
    error,
    loadInitial,
    loadOlder,
    refreshLatest,
    loadMessageContext,
    loadPinnedMessages,
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
