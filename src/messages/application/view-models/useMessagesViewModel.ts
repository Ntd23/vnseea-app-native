// Description: Handles message list, conversation state, labels, and bulk sending.
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import {
  onUserOnlineStatus,
  watchUserOnlineStatuses,
} from '../../infrastructure/realtime/liveKitCallRealtime';
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
import { mergeChatItems } from '../utils/messageChatMerge';
import {
  applyRelationshipChange as applyRelationshipChangeToChats,
  stampAuthoritativeRelationshipSnapshot,
  type MessageRelationshipChange,
} from '../utils/messageRelationshipState';
import {
  getMessagesStartupSnapshot,
  preloadMessagesStartupChats,
  setMessagesStartupSnapshot,
} from '../services/messagesStartupCache';

const repository = createMessagesRepository();
const CHAT_SYNC_INTERVAL_MS = 3500;

function reconcileDiscoverySnapshot(
  currentChats: ChatItem[],
  incomingChats: ChatItem[],
) {
  const incomingUserIds = new Set(
    incomingChats
      .filter(chat => chat.chatType === 'user')
      .map(chat => chat.userId),
  );
  return currentChats.filter(
    chat =>
      chat.hasConversationRecord !== false || incomingUserIds.has(chat.userId),
  );
}

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

  let changed = false;
  const nextChats = chats.map(chat => {
    if (chat.chatType !== 'user') {
      if (areLabelsEqual(chat.labels, [])) return chat;
      changed = true;
      return { ...chat, labels: [] };
    }

    const labels = labelsByUserId.get(chat.userId) ?? [];
    if (areLabelsEqual(chat.labels, labels)) return chat;

    changed = true;
    return {
      ...chat,
      labels,
    };
  });

  return changed ? nextChats : chats;
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
  const [state, setState] = useState<MessagesState>(() => {
    const startupChats = getMessagesStartupSnapshot();
    return {
      chats: startupChats,
      selectedChat: null,
      messages: [],
      labels: [],
      labelRecipients: [],
      broadcastLabelId: '',
      broadcastRecipients: [],
      isLoadingChats: startupChats.length === 0,
      isLoadingMessages: false,
      isLoadingLabels: false,
      isSending: false,
      isCreatingGroup: false,
      error: null,
    };
  });
  const isLoadingChatsRef = useRef(false);
  const isLoadingGroupChatsRef = useRef(false);
  const isSyncingLatestChatsRef = useRef(false);
  const isLoadingLabelsRef = useRef(false);
  const labelRecipientsRef = useRef<LabelRecipient[]>([]);
  const relationshipRevisionRef = useRef(
    getMessagesStartupSnapshot().reduce(
      (highestRevision, chat) =>
        Math.max(highestRevision, chat.relationshipStateRevision ?? 0),
      0,
    ),
  );

  // Load all chats
  const loadChats = useCallback(async (
    showSpinner = true,
    options: LoadChatsOptions = {},
  ) => {
    if (isLoadingChatsRef.current) return false;

    isLoadingChatsRef.current = true;
    setState(prev => ({
      ...prev,
      isLoadingChats: showSpinner,
      error: null,
    }));

    try {
      const isAuthoritativeRelationshipRefresh =
        Boolean(options.forceRefresh) &&
        (options.includeDiscovery ?? true);
      const requestRevision = isAuthoritativeRelationshipRefresh
        ? relationshipRevisionRef.current + 1
        : relationshipRevisionRef.current;
      if (isAuthoritativeRelationshipRefresh) {
        relationshipRevisionRef.current = requestRevision;
      }
      const chats = await repository.getChats({
        includeDiscovery: options.includeDiscovery ?? true,
        latestOnly: options.latestOnly,
        forceRefresh: options.forceRefresh,
      });
      if (
        isAuthoritativeRelationshipRefresh &&
        requestRevision !== relationshipRevisionRef.current
      ) {
        setState(prev => ({ ...prev, isLoadingChats: false }));
        return false;
      }
      setState(prev => {
        if (
          isAuthoritativeRelationshipRefresh &&
          requestRevision !== relationshipRevisionRef.current
        ) {
          return { ...prev, isLoadingChats: false };
        }
        const incomingChats = isAuthoritativeRelationshipRefresh
          ? stampAuthoritativeRelationshipSnapshot(chats, requestRevision)
          : chats;
        const currentChats = isAuthoritativeRelationshipRefresh
          ? reconcileDiscoverySnapshot(prev.chats, incomingChats)
          : prev.chats;
        const nextChats =
          options.merge || currentChats.length > 0
            ? mergeChatItems(currentChats, incomingChats)
            : incomingChats;

        const labeledChats = applyLabelsToChats(
          nextChats,
          labelRecipientsRef.current,
        );

        return {
          ...prev,
          chats: labeledChats,
          isLoadingChats: false,
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không tải được danh sách tin nhắn';
      setState(prev => ({ ...prev, error: errorMessage, isLoadingChats: false }));
      return false;
    } finally {
      isLoadingChatsRef.current = false;
    }
    return true;
  }, []);

  const applyRelationshipChange = useCallback(
    (change: Omit<MessageRelationshipChange, 'revision'>) => {
      const revision = relationshipRevisionRef.current + 1;
      relationshipRevisionRef.current = revision;
      setState(prev => ({
        ...prev,
        chats: applyRelationshipChangeToChats(prev.chats, {
          ...change,
          revision,
        }),
      }));
    },
    [],
  );

  const syncLatestChats = useCallback(async () => {
    if (isSyncingLatestChatsRef.current) return;

    isSyncingLatestChatsRef.current = true;

    try {
      const [latestChats, groupChats] = await Promise.all([
        repository.getChats({
          includeDiscovery: false,
          latestOnly: true,
        }),
        // A renamed group may sit outside the latest message page. Refresh the
        // group directory as well so realtime invalidations update its name.
        repository.getGroupChats().catch(() => []),
      ]);

      setState(prev => {
        const chats = mergeChatItems(prev.chats, latestChats, groupChats);

        return {
          ...prev,
          chats: applyLabelsToChats(chats, labelRecipientsRef.current),
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
        err instanceof Error ? err.message : 'Không tải được danh sách tin nhắn';
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
    async (name: string, color: string): Promise<string | null> => {
      const normalizedName = name.trim();
      if (!normalizedName) return null;

      setState(prev => ({ ...prev, isLoadingLabels: true, error: null }));

      try {
        const newLabel = await repository.createLabel(normalizedName, color);
        setState(prev => ({
          ...prev,
          labels: [
            newLabel,
            ...prev.labels.filter(label => label.id !== newLabel.id),
          ],
          isLoadingLabels: false,
        }));
        return newLabel.id;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Không tạo được thẻ';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoadingLabels: false,
        }));
        return null;
      }
    },
    [],
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
          err instanceof Error ? err.message : 'Không xóa được thẻ';
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
          err instanceof Error ? err.message : 'Không gắn được thẻ';
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
          err instanceof Error ? err.message : 'Không gỡ được thẻ';
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

  // Initial load: render the warmed conversation snapshot immediately, then
  // wait for the native navigation transition before parsing fresh network
  // payloads and loading secondary discovery/label data.
  useEffect(() => {
    let cancelled = false;
    let enrichmentTimer: ReturnType<typeof setTimeout> | null = null;
    const hasStartupChats = getMessagesStartupSnapshot().length > 0;
    const scheduleEnrichment = () => {
      if (cancelled) return;
      enrichmentTimer = setTimeout(() => {
        if (cancelled) return;
        loadChats(false, {
          includeDiscovery: true,
          merge: true,
        }).catch(() => undefined);
        loadLabels().catch(() => undefined);
      }, 120);
    };
    const task = InteractionManager.runAfterInteractions(() => {
      preloadMessagesStartupChats()
        .then(warmedChats => {
          if (cancelled) return;
          setState(prev => {
            if (
              prev.chats === warmedChats &&
              !prev.isLoadingChats &&
              prev.error === null
            ) {
              return prev;
            }

            return {
              ...prev,
              chats: mergeChatItems(prev.chats, warmedChats),
              isLoadingChats: false,
              error: null,
            };
          });
          scheduleEnrichment();
        })
        .catch(() => {
          loadChats(!hasStartupChats, {
            includeDiscovery: false,
            latestOnly: true,
          })
            .then(scheduleEnrichment)
            .catch(() => undefined);
        });
    });

    return () => {
      cancelled = true;
      task.cancel();
      if (enrichmentTimer) clearTimeout(enrichmentTimer);
    };
  }, [loadChats, loadLabels]);

  useEffect(() => {
    if (state.chats.length > 0) {
      setMessagesStartupSnapshot(state.chats);
    }
  }, [state.chats]);

  useEffect(() => {
    syncUnreadBadgeCount(state.chats);
  }, [state.chats]);

  useEffect(() => {
    watchUserOnlineStatuses(
      state.chats
        .filter(chat => chat.chatType === 'user')
        .map(chat => chat.userId)
        .filter(Boolean),
    );
    return () => watchUserOnlineStatuses([]);
  }, [state.chats]);

  useEffect(() => {
    return onUserOnlineStatus(event => {
      setState(prev => {
        let changed = false;
        const chats = prev.chats.map(chat => {
          if (chat.chatType !== 'user' || chat.userId !== event.userId) {
            return chat;
          }

          if (chat.isOnline === event.isOnline) {
            return chat;
          }

          changed = true;
          return {
            ...chat,
            isOnline: event.isOnline,
          };
        });

        return changed ? { ...prev, chats } : prev;
      });
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
    applyRelationshipChange,
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
