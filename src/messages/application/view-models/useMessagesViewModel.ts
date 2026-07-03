// Description: Handles message list, conversation state, labels, and bulk sending.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import { onUserOnlineStatus } from '../../infrastructure/realtime/liveKitCallRealtime';
import type {
  ChatItem,
  CreateGroupChatInput,
  GetChatsOptions,
  LabelRecipient,
  MessageAttachment,
  MessageItem,
  MessageLabel,
} from '../../domain/types/messages.types';
import { setUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';

const repository = createMessagesRepository();
const CHAT_SYNC_INTERVAL_MS = 3500;

function areLabelsEqual(
  left: MessageLabel[] | undefined,
  right: MessageLabel[] | undefined,
) {
  const leftLabels = left ?? [];
  const rightLabels = right ?? [];

  if (leftLabels.length !== rightLabels.length) return false;

  return leftLabels.every((label, index) => {
    const other = rightLabels[index];
    return (
      label.id === other?.id &&
      label.name === other?.name &&
      label.color === other?.color
    );
  });
}

function mergeChatItems(...chatLists: ChatItem[][]) {
  const chats = new Map<string, ChatItem>();

  for (const chat of chatLists.flat()) {
    const key =
      chat.chatType === 'user' ? `${chat.chatType}:${chat.userId}` : chat.id;
    const current = chats.get(key);

    if (!current) {
      chats.set(key, chat);
    } else if (chat.lastMessageTime >= current.lastMessageTime) {
      chats.set(key, {
        ...chat,
        isOnline: chat.isOnline,
      });
    } else {
      chats.set(key, {
        ...current,
        isOnline: chat.isOnline,
      });
    }
  }

  return [...chats.values()].sort((left, right) => {
    const timeDifference = right.lastMessageTime - left.lastMessageTime;
    if (timeDifference !== 0) return timeDifference;

    return right.unreadCount - left.unreadCount;
  });
}

function applyFollowingStatus(
  chats: ChatItem[],
  followingIds: Set<string>,
  followerIds: Set<string> = new Set(),
): ChatItem[] {
  return chats.map(chat => {
    const isFollowing =
      chat.chatType === 'user' ? followingIds.has(chat.userId) : false;
    const isFollower =
      chat.chatType === 'user' ? followerIds.has(chat.userId) : false;

    if (chat.isFollowing === isFollowing && chat.isFollower === isFollower) {
      return chat;
    }

    return {
      ...chat,
      isFollowing,
      isFollower,
    };
  });
}

function syncUnreadBadgeCount(chats: ChatItem[]) {
  setUnreadBadgeCounts({
    messageCount: chats.reduce((total, chat) => total + chat.unreadCount, 0),
  });
}

function mergeLabelRecipients(recipients: LabelRecipient[]) {
  const byUserId = new Map<string, LabelRecipient>();

  for (const recipient of recipients) {
    if (!recipient.userId) continue;
    const current = byUserId.get(recipient.userId);
    if (!current) {
      byUserId.set(recipient.userId, recipient);
      continue;
    }

    const labels = new Map(current.labels.map(label => [label.id, label]));
    for (const label of recipient.labels) {
      if (label.id) labels.set(label.id, label);
    }
    byUserId.set(recipient.userId, {
      ...current,
      name: current.name || recipient.name,
      username: current.username || recipient.username,
      avatar: current.avatar || recipient.avatar,
      labels: [...labels.values()],
    });
  }

  return [...byUserId.values()];
}

function applyLabelsToChats(
  chats: ChatItem[],
  labelRecipients: LabelRecipient[],
) {
  const labelsByUserId = new Map(
    labelRecipients.map(recipient => [recipient.userId, recipient.labels]),
  );

  return chats.map(chat => {
    if (chat.chatType !== 'user') {
      return areLabelsEqual(chat.labels, []) ? chat : { ...chat, labels: [] };
    }

    const labels = labelsByUserId.get(chat.userId) ?? [];
    if (areLabelsEqual(chat.labels, labels)) return chat;

    return {
      ...chat,
      labels,
    };
  });
}

export interface MessagesState {
  chats: ChatItem[];
  selectedChat: ChatItem | null;
  messages: MessageItem[];
  labels: MessageLabel[];
  labelRecipients: LabelRecipient[];
  broadcastLabelId: string;
  broadcastRecipients: LabelRecipient[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isLoadingLabels: boolean;
  isSending: boolean;
  isCreatingGroup: boolean;
  error: string | null;
}

type LoadChatsOptions = GetChatsOptions & {
  merge?: boolean;
};

export function useMessagesViewModel() {
  const [state, setState] = useState<MessagesState>({
    chats: [],
    selectedChat: null,
    messages: [],
    labels: [],
    labelRecipients: [],
    broadcastLabelId: '',
    broadcastRecipients: [],
    isLoadingChats: false,
    isLoadingMessages: false,
    isLoadingLabels: false,
    isSending: false,
    isCreatingGroup: false,
    error: null,
  });
  const isLoadingChatsRef = useRef(false);
  const isLoadingGroupChatsRef = useRef(false);
  const isSyncingLatestChatsRef = useRef(false);
  const isLoadingLabelsRef = useRef(false);
  const labelRecipientsRef = useRef<LabelRecipient[]>([]);
  const followingUserIdsRef = useRef<Set<string>>(new Set());
  const followerUserIdsRef = useRef<Set<string>>(new Set());

  // Load following and follower user IDs from API
  const loadFollowingUserIds = useCallback(async (forceRefresh = false) => {
    try {
      const [followingIds, followerIds] = await Promise.all([
        repository.getFollowingUserIds(forceRefresh),
        repository.getFollowerUserIds(forceRefresh),
      ]);
      followingUserIdsRef.current = followingIds;
      followerUserIdsRef.current = followerIds;
      // Re-stamp following and follower status on current chats
      setState(prev => ({
        ...prev,
        chats: applyFollowingStatus(prev.chats, followingIds, followerIds),
      }));
    } catch {
      // Silent: keep current state
    }
  }, []);

  // Load all chats
  const loadChats = useCallback(async (
    showSpinner = true,
    options: LoadChatsOptions = {},
  ) => {
    if (isLoadingChatsRef.current) return;

    isLoadingChatsRef.current = true;
    setState(prev => ({
      ...prev,
      isLoadingChats: showSpinner,
      error: null,
    }));

    try {
      const chats = await repository.getChats({
        includeDiscovery: options.includeDiscovery ?? true,
        latestOnly: options.latestOnly,
        forceRefresh: options.forceRefresh,
      });
      setState(prev => {
        const nextChats =
          options.merge || prev.chats.length > 0
            ? mergeChatItems(prev.chats, chats)
            : chats;

        return {
          ...prev,
          chats: applyFollowingStatus(
            applyLabelsToChats(nextChats, labelRecipientsRef.current),
            followingUserIdsRef.current,
            followerUserIdsRef.current,
          ),
          isLoadingChats: false,
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không tải được danh sách tin nhắn';
      setState(prev => ({ ...prev, error: errorMessage, isLoadingChats: false }));
    } finally {
      isLoadingChatsRef.current = false;
    }
  }, []);

  const syncLatestChats = useCallback(async () => {
    if (isSyncingLatestChatsRef.current) return;

    isSyncingLatestChatsRef.current = true;

    try {
      const latestChats = await repository.getChats({
        includeDiscovery: false,
        latestOnly: true,
      });

      setState(prev => {
        const chats = mergeChatItems(prev.chats, latestChats);

        return {
          ...prev,
          chats: applyFollowingStatus(
            applyLabelsToChats(chats, labelRecipientsRef.current),
            followingUserIdsRef.current,
            followerUserIdsRef.current,
          ),
        };
      });
    } catch {
      // Silent sync: keep the current list visible and let manual refresh show errors.
    } finally {
      isSyncingLatestChatsRef.current = false;
    }
  }, []);

  const loadGroupChats = useCallback(async (showSpinner = true) => {
    if (isLoadingGroupChatsRef.current) return;

    isLoadingGroupChatsRef.current = true;
    setState(prev => ({
      ...prev,
      isLoadingChats: showSpinner,
      error: null,
    }));

    try {
      const groupChats = await repository.getGroupChats();
      setState(prev => {
        const chats = mergeChatItems(prev.chats, groupChats);

        return {
          ...prev,
          chats: applyLabelsToChats(chats, labelRecipientsRef.current),
          isLoadingChats: false,
        };
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Không tải được danh sách nhóm chat';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoadingChats: false,
      }));
    } finally {
      isLoadingGroupChatsRef.current = false;
    }
  }, []);

  const createGroupChat = useCallback(
    async (input: CreateGroupChatInput) => {
      setState(prev => ({
        ...prev,
        isCreatingGroup: true,
        error: null,
      }));

      try {
        const chat = await repository.createGroupChat(input);
        const groupChats = await repository
          .getGroupChats()
          .catch(() => [chat]);
        setState(prev => {
          const chats = mergeChatItems(prev.chats, [chat], groupChats);

          return {
            ...prev,
            chats: applyLabelsToChats(chats, labelRecipientsRef.current),
            isCreatingGroup: false,
          };
        });
        return chat;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Không tạo được nhóm chat';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isCreatingGroup: false,
        }));
        return null;
      }
    },
    [],
  );

  const loadLabels = useCallback(async () => {
    if (isLoadingLabelsRef.current) return;

    isLoadingLabelsRef.current = true;
    setState(prev => ({
      ...prev,
      isLoadingLabels: true,
      error: null,
    }));

    try {
      const labels = await repository.listLabels();
      const recipientGroups = await Promise.all(
        labels.map(label =>
          repository.getUsersByLabel(label.id).catch(() => []),
        ),
      );
      const labelRecipients = mergeLabelRecipients(recipientGroups.flat());
      labelRecipientsRef.current = labelRecipients;

      setState(prev => ({
        ...prev,
        labels,
        labelRecipients,
        broadcastRecipients: prev.broadcastLabelId
          ? labelRecipients.filter(recipient =>
              recipient.labels.some(label => label.id === prev.broadcastLabelId),
            )
          : [],
        chats: applyLabelsToChats(prev.chats, labelRecipients),
        isLoadingLabels: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Khong tai duoc danh sach nhan';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoadingLabels: false,
      }));
    } finally {
      isLoadingLabelsRef.current = false;
    }
  }, []);

  const createLabel = useCallback(
    async (name: string, color: string) => {
      const normalizedName = name.trim();
      if (!normalizedName) return false;

      setState(prev => ({ ...prev, isLoadingLabels: true, error: null }));

      try {
        await repository.createLabel(normalizedName, color);
        await loadLabels();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Khong tao duoc nhan';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoadingLabels: false,
        }));
        return false;
      }
    },
    [loadLabels],
  );

  const deleteLabel = useCallback(
    async (labelId: string) => {
      if (!labelId) return false;

      setState(prev => ({ ...prev, isLoadingLabels: true, error: null }));

      try {
        await repository.deleteLabel(labelId);
        await loadLabels();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Khong xoa duoc nhan';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoadingLabels: false,
        }));
        return false;
      }
    },
    [loadLabels],
  );

  const attachLabel = useCallback(
    async (userId: string, labelId: string) => {
      if (!userId || !labelId) return false;

      setState(prev => ({ ...prev, isLoadingLabels: true, error: null }));

      try {
        await repository.attachLabel(userId, labelId);
        await loadLabels();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Khong gan duoc nhan';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoadingLabels: false,
        }));
        return false;
      }
    },
    [loadLabels],
  );

  const detachLabel = useCallback(
    async (userId: string, labelId: string) => {
      if (!userId || !labelId) return false;

      setState(prev => ({ ...prev, isLoadingLabels: true, error: null }));

      try {
        await repository.detachLabel(userId, labelId);
        await loadLabels();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Khong go duoc nhan';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoadingLabels: false,
        }));
        return false;
      }
    },
    [loadLabels],
  );

  const selectBroadcastLabel = useCallback(async (labelId: string) => {
    if (!labelId) {
      setState(prev => ({
        ...prev,
        broadcastLabelId: '',
        broadcastRecipients: [],
      }));
      return [];
    }

    setState(prev => ({
      ...prev,
      broadcastLabelId: labelId,
      isLoadingLabels: true,
      error: null,
    }));

    try {
      const recipients = await repository.getUsersByLabel(labelId);
      setState(prev => ({
        ...prev,
        broadcastRecipients: recipients,
        isLoadingLabels: false,
      }));
      return recipients;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Khong tai duoc nguoi nhan';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        broadcastRecipients: [],
        isLoadingLabels: false,
      }));
      return [];
    }
  }, []);

  // Load messages for a specific chat
  const loadMessages = useCallback(async (chat: ChatItem) => {
    setState(prev => ({
      ...prev,
      selectedChat: chat,
      isLoadingMessages: true,
      error: null,
    }));

    try {
      const result = await repository.getMessages(chat);
      setState(prev => ({
        ...prev,
        messages: result,
        isLoadingMessages: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không tải được tin nhắn';
      setState(prev => ({ ...prev, error: errorMessage, isLoadingMessages: false }));
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (message: string) => {
    if (!state.selectedChat || !message.trim()) return;

    setState(prev => ({ ...prev, isSending: true, error: null }));

    try {
      await repository.sendMessage(state.selectedChat, message.trim());

      // Reload messages to get the new one
      const result = await repository.getMessages(state.selectedChat);
      setState(prev => ({
        ...prev,
        messages: result,
        isSending: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không gửi được tin nhắn';
      setState(prev => ({ ...prev, error: errorMessage, isSending: false }));
    }
  }, [state.selectedChat]);

  const sendBulkMessages = useCallback(
    async (
      userIds: string[],
      message: string,
      attachments: MessageAttachment[] = [],
    ) => {
      const recipients = [...new Set(userIds.filter(Boolean))];
      const text = message.trim();

      if (recipients.length === 0 || (!text && attachments.length === 0)) {
        return false;
      }

      setState(prev => ({ ...prev, isSending: true, error: null }));

      try {
        for (const userId of recipients) {
          if (attachments.length === 0) {
            await repository.sendMessage(userId, text);
            continue;
          }

          for (const [index, attachment] of attachments.entries()) {
            await repository.sendMessage(
              userId,
              index === 0 ? text : '',
              attachment,
            );
          }
        }

        const chats = await repository.getChats({ includeDiscovery: false });
        setState(prev => {
          return {
            ...prev,
            chats: applyLabelsToChats(chats, labelRecipientsRef.current),
            isSending: false,
          };
        });
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Không gửi được tin nhắn';
        setState(prev => ({ ...prev, error: errorMessage, isSending: false }));
        return false;
      }
    },
    [],
  );

  // Clear selected chat
  const clearSelectedChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedChat: null,
      messages: [],
    }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial load
  useEffect(() => {
    loadChats(true, {
      includeDiscovery: false,
      latestOnly: true,
    })
      .then(() =>
        loadChats(false, {
          includeDiscovery: true,
          merge: true,
          forceRefresh: true,
        }),
      )
      .catch(() => undefined);
    loadLabels().catch(() => undefined);
    loadFollowingUserIds(true).catch(() => undefined);
  }, [loadChats, loadLabels, loadFollowingUserIds]);

  useEffect(() => {
    syncUnreadBadgeCount(state.chats);
  }, [state.chats]);

  useEffect(() => {
    return onUserOnlineStatus(event => {
      setState(prev => ({
        ...prev,
        chats: prev.chats.map(chat => {
          if (chat.chatType !== 'user' || chat.userId !== event.userId) {
            return chat;
          }

          return {
            ...chat,
            isOnline: event.isOnline,
          };
        }),
      }));
    });
  }, []);

  return {
    // State
    chats: state.chats,
    selectedChat: state.selectedChat,
    messages: state.messages,
    labels: state.labels,
    labelRecipients: state.labelRecipients,
    broadcastLabelId: state.broadcastLabelId,
    broadcastRecipients: state.broadcastRecipients,
    isLoadingChats: state.isLoadingChats,
    isLoadingMessages: state.isLoadingMessages,
    isLoadingLabels: state.isLoadingLabels,
    isSending: state.isSending,
    isCreatingGroup: state.isCreatingGroup,
    error: state.error,

    // Actions
    loadChats,
    syncLatestChats,
    chatSyncIntervalMs: CHAT_SYNC_INTERVAL_MS,
    loadLabels,
    loadFollowingUserIds,
    loadGroupChats,
    createGroupChat,
    createLabel,
    deleteLabel,
    attachLabel,
    detachLabel,
    selectBroadcastLabel,
    loadMessages,
    sendMessage,
    sendBulkMessages,
    clearSelectedChat,
    clearError,
  };
}
