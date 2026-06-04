// Messages ViewModel - Handles message list and conversation state
import { useCallback, useEffect, useRef, useState } from 'react';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import type {
  ChatItem,
  CreateGroupChatInput,
  GetChatsOptions,
  MessageAttachment,
  MessageItem,
} from '../../domain/types/messages.types';
import { setUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';

const repository = createMessagesRepository();
const CHAT_SYNC_INTERVAL_MS = 2500;

function mergeChatItems(...chatLists: ChatItem[][]) {
  const chats = new Map<string, ChatItem>();

  for (const chat of chatLists.flat()) {
    const key =
      chat.chatType === 'user' ? `${chat.chatType}:${chat.userId}` : chat.id;
    const current = chats.get(key);

    if (!current || chat.lastMessageTime >= current.lastMessageTime) {
      chats.set(key, chat);
    }
  }

  return [...chats.values()].sort((left, right) => {
    const timeDifference = right.lastMessageTime - left.lastMessageTime;
    if (timeDifference !== 0) return timeDifference;

    return right.unreadCount - left.unreadCount;
  });
}

function syncUnreadBadgeCount(chats: ChatItem[]) {
  setUnreadBadgeCounts({
    messageCount: chats.reduce((total, chat) => total + chat.unreadCount, 0),
  });
}

export interface MessagesState {
  chats: ChatItem[];
  selectedChat: ChatItem | null;
  messages: MessageItem[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
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
    isLoadingChats: false,
    isLoadingMessages: false,
    isSending: false,
    isCreatingGroup: false,
    error: null,
  });
  const isLoadingChatsRef = useRef(false);
  const isLoadingGroupChatsRef = useRef(false);
  const isSyncingLatestChatsRef = useRef(false);

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
        includeDiscovery: options.includeDiscovery ?? showSpinner,
        latestOnly: options.latestOnly,
      });
      setState(prev => {
        const nextChats =
          options.merge || prev.chats.length > 0
            ? mergeChatItems(prev.chats, chats)
            : chats;
        syncUnreadBadgeCount(nextChats);

        return {
          ...prev,
          chats: nextChats,
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
        syncUnreadBadgeCount(chats);

        return {
          ...prev,
          chats,
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
        syncUnreadBadgeCount(chats);

        return {
          ...prev,
          chats,
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
          syncUnreadBadgeCount(chats);

          return {
            ...prev,
            chats,
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

  // Load messages for a specific chat
  const loadMessages = useCallback(async (chat: ChatItem) => {
    setState(prev => ({
      ...prev,
      selectedChat: chat,
      isLoadingMessages: true,
      error: null,
    }));

    try {
      const result =
        chat.chatType === 'group'
          ? await repository.getGroupMessages(chat.userId)
          : await repository.getMessages(chat.userId);
      setState(prev => ({
        ...prev,
        messages: result.messages,
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
      if (state.selectedChat.chatType === 'group') {
        await repository.sendGroupMessage(
          state.selectedChat.userId,
          message.trim(),
        );
      } else {
        await repository.sendMessage(state.selectedChat.userId, message.trim());
      }

      // Reload messages to get the new one
      const result =
        state.selectedChat.chatType === 'group'
          ? await repository.getGroupMessages(state.selectedChat.userId)
          : await repository.getMessages(state.selectedChat.userId);
      setState(prev => ({
        ...prev,
        messages: result.messages,
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
          syncUnreadBadgeCount(chats);

          return {
            ...prev,
            chats,
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
        }),
      )
      .catch(() => undefined);
  }, [loadChats]);

  return {
    // State
    chats: state.chats,
    selectedChat: state.selectedChat,
    messages: state.messages,
    isLoadingChats: state.isLoadingChats,
    isLoadingMessages: state.isLoadingMessages,
    isSending: state.isSending,
    isCreatingGroup: state.isCreatingGroup,
    error: state.error,

    // Actions
    loadChats,
    syncLatestChats,
    chatSyncIntervalMs: CHAT_SYNC_INTERVAL_MS,
    loadGroupChats,
    createGroupChat,
    loadMessages,
    sendMessage,
    sendBulkMessages,
    clearSelectedChat,
    clearError,
  };
}
