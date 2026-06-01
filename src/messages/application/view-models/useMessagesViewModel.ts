// Messages ViewModel - Handles message list and conversation state
import { useCallback, useEffect, useRef, useState } from 'react';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import type { ChatItem, MessageItem } from '../../domain/types/messages.types';

const repository = createMessagesRepository();

export interface MessagesState {
  chats: ChatItem[];
  selectedChat: ChatItem | null;
  messages: MessageItem[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  error: string | null;
}

export function useMessagesViewModel() {
  const [state, setState] = useState<MessagesState>({
    chats: [],
    selectedChat: null,
    messages: [],
    isLoadingChats: false,
    isLoadingMessages: false,
    isSending: false,
    error: null,
  });
  const isLoadingChatsRef = useRef(false);

  // Load all chats
  const loadChats = useCallback(async (showSpinner = true) => {
    if (isLoadingChatsRef.current) return;

    isLoadingChatsRef.current = true;
    setState(prev => ({
      ...prev,
      isLoadingChats: showSpinner,
      error: null,
    }));

    try {
      const chats = await repository.getChats();
      setState(prev => ({ ...prev, chats, isLoadingChats: false }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không tải được danh sách tin nhắn';
      setState(prev => ({ ...prev, error: errorMessage, isLoadingChats: false }));
    } finally {
      isLoadingChatsRef.current = false;
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
      const messages = await repository.getMessages(chat.userId);
      setState(prev => ({ ...prev, messages, isLoadingMessages: false }));
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
      await repository.sendMessage(state.selectedChat.userId, message.trim());

      // Reload messages to get the new one
      const messages = await repository.getMessages(state.selectedChat.userId);
      setState(prev => ({
        ...prev,
        messages,
        isSending: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không gửi được tin nhắn';
      setState(prev => ({ ...prev, error: errorMessage, isSending: false }));
    }
  }, [state.selectedChat]);

  const sendBulkMessages = useCallback(
    async (userIds: string[], message: string) => {
      const recipients = [...new Set(userIds.filter(Boolean))];
      const text = message.trim();

      if (recipients.length === 0 || !text) return false;

      setState(prev => ({ ...prev, isSending: true, error: null }));

      try {
        for (const userId of recipients) {
          await repository.sendMessage(userId, text);
        }

        const chats = await repository.getChats();
        setState(prev => ({
          ...prev,
          chats,
          isSending: false,
        }));
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
    loadChats().catch(() => undefined);
  }, [loadChats]);

  return {
    // State
    chats: state.chats,
    selectedChat: state.selectedChat,
    messages: state.messages,
    isLoadingChats: state.isLoadingChats,
    isLoadingMessages: state.isLoadingMessages,
    isSending: state.isSending,
    error: state.error,

    // Actions
    loadChats,
    loadMessages,
    sendMessage,
    sendBulkMessages,
    clearSelectedChat,
    clearError,
  };
}
