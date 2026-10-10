// Description: Sends chat messages in the background per conversation and keeps their bubbles, progress and results outside the chat screen, so leaving a conversation and opening it again still shows what is being sent.
import type {
  ChatItem,
  MessageAttachment,
  MessageItem,
  MessageSendProgress,
  SendMessageOptions,
  SendMessageResponse,
} from '../../domain/types/messages.types';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { ChatMediaPreparationHandle } from '../media/chatMediaPreparation';
import { preserveOptimisticVideoThumbnail } from '../media/messageVideoMedia';
import { getPageConversationKey } from '../page-conversations/pageConversationChat';

/** Delivered messages kept per conversation until its screen reloads them. */
const DELIVERED_LIMIT = 30;

/** A message the chat screen handed over, with the bubble shown until it is sent. */
export interface OutgoingChatSend {
  tempId: string;
  message: string;
  attachment?: MessageAttachment;
  /** Background compression and upload started when the media was picked. */
  preparation?: ChatMediaPreparationHandle;
  options?: SendMessageOptions;
  optimisticMessage: MessageItem;
}

export interface ChatOutgoingSnapshot {
  /** Bubbles not delivered yet: still sending, or failed. */
  pending: MessageItem[];
  /** What the server stored for bubbles delivered from this device. */
  delivered: MessageItem[];
  /** The latest send that failed, so an open screen can say so once. */
  failure?: { tempId: string; message: string };
}

export interface ChatOutgoingQueueDependencies {
  send(
    chat: ChatItem,
    message: string,
    attachment?: MessageAttachment,
    options?: SendMessageOptions,
  ): Promise<SendMessageResponse>;
  /** The newest message, when the send response did not include it. */
  fetchLatest(chat: ChatItem): Promise<MessageItem[]>;
  /** Signed-in account, so another account never sees these bubbles. */
  ownerId(): string;
}

type Listener = (snapshot: ChatOutgoingSnapshot) => void;

interface ConversationState {
  pending: Map<string, MessageItem>;
  delivered: MessageItem[];
  failure?: ChatOutgoingSnapshot['failure'];
  activeRequests: number;
  textLane: Promise<unknown>;
  mediaLane: Promise<unknown>;
  albumTurns: Map<string, Promise<void>>;
  listeners: Set<Listener>;
  snapshot: ChatOutgoingSnapshot;
}

const EMPTY_SNAPSHOT: ChatOutgoingSnapshot = { pending: [], delivered: [] };

function conversationId(chat: ChatItem) {
  // Page threads share the Page id as `userId`, so key them per customer.
  if (chat.page) return getPageConversationKey(chat.page);
  return chat.chatType === 'group'
    ? `group:${chat.groupId || chat.chatId || chat.userId || chat.id.replace(/^group:/, '')}`
    : `user:${chat.userId || chat.id}`;
}

export function createChatOutgoingQueue(dependencies: ChatOutgoingQueueDependencies) {
  const conversations = new Map<string, ConversationState>();

  const keyFor = (chat: ChatItem) => `${dependencies.ownerId()}|${conversationId(chat)}`;

  const conversationFor = (key: string) => {
    let conversation = conversations.get(key);
    if (!conversation) {
      conversation = {
        pending: new Map(),
        delivered: [],
        activeRequests: 0,
        textLane: Promise.resolve(),
        mediaLane: Promise.resolve(),
        albumTurns: new Map(),
        listeners: new Set(),
        snapshot: EMPTY_SNAPSHOT,
      };
      conversations.set(key, conversation);
    }
    return conversation;
  };

  const publish = (conversation: ConversationState) => {
    conversation.snapshot = {
      pending: [...conversation.pending.values()],
      delivered: conversation.delivered,
      failure: conversation.failure,
    };
    conversation.listeners.forEach(listener => listener(conversation.snapshot));
  };

  const updatePending = (
    conversation: ConversationState,
    tempId: string,
    update: (message: MessageItem) => MessageItem,
  ) => {
    const existing = conversation.pending.get(tempId);
    if (!existing) return;
    const next = update(existing);
    if (next === existing) return;
    conversation.pending.set(tempId, next);
    publish(conversation);
  };

  const progressReporter = (
    conversation: ConversationState,
    tempId: string,
    phase: MessageSendProgress['phase'],
  ) => {
    let lastStep = -1;
    return (progress: number) => {
      // At most one update per 2% so a fast upload does not flood the list.
      const step = Math.round(Math.min(1, Math.max(0, progress)) * 50);
      if (step === lastStep) return;
      lastStep = step;
      updatePending(conversation, tempId, message =>
        message.deliveryState === 'sending'
          ? { ...message, sendProgress: { phase, progress: step / 50 } }
          : message,
      );
    };
  };

  const prepare = async (conversation: ConversationState, send: OutgoingChatSend) => {
    if (!send.preparation) return send.attachment;
    let stopProgress: (() => void) | undefined;
    if (send.attachment?.mediaType === 'video') {
      const report = progressReporter(conversation, send.tempId, 'preparing');
      report(send.preparation.getProgress() ?? 0);
      stopProgress = send.preparation.subscribeProgress(report);
    }
    try {
      return await send.preparation.result;
    } finally {
      stopProgress?.();
    }
  };

  const deliver = async (
    chat: ChatItem,
    conversation: ConversationState,
    send: OutgoingChatSend,
    prepared: Promise<MessageAttachment | undefined>,
  ) => {
    const { tempId, message, options, optimisticMessage } = send;
    try {
      const attachment = await prepared;
      const preparedThumbnail = attachment?.thumbnailUri;
      if (preparedThumbnail && preparedThumbnail !== optimisticMessage.thumbnail) {
        updatePending(conversation, tempId, item => ({ ...item, thumbnail: preparedThumbnail }));
      }

      const reportUpload = attachment
        ? progressReporter(conversation, tempId, 'uploading')
        : undefined;
      reportUpload?.(0);
      conversation.activeRequests += 1;
      let response: SendMessageResponse;
      try {
        response = await dependencies.send(
          chat,
          message,
          attachment,
          reportUpload ? { ...options, onUploadProgress: reportUpload } : options,
        );
      } finally {
        conversation.activeRequests -= 1;
      }

      let sentMessages = response.sentMessages ?? [];
      if (sentMessages.length === 0) {
        sentMessages = await dependencies.fetchLatest(chat);
      }
      if (options?.mediaGroupId) {
        sentMessages = sentMessages.map(item => ({ ...item, mediaGroupId: options.mediaGroupId }));
      }
      sentMessages = preserveOptimisticVideoThumbnail(sentMessages, {
        ...optimisticMessage,
        thumbnail: preparedThumbnail ?? optimisticMessage.thumbnail,
      });

      conversation.pending.delete(tempId);
      conversation.delivered = [...conversation.delivered, ...sentMessages].slice(-DELIVERED_LIMIT);
      publish(conversation);
      return true;
    } catch (error) {
      const failedMessage = conversation.pending.get(tempId);
      if (failedMessage) {
        conversation.pending.set(tempId, {
          ...failedMessage,
          deliveryState: 'failed',
          sendProgress: undefined,
        });
      }
      conversation.failure = {
        tempId,
        message: error instanceof Error ? error.message : 'Không gửi được tin nhắn',
      };
      publish(conversation);
      return false;
    }
  };

  const schedule = (chat: ChatItem, conversation: ConversationState, send: OutgoingChatSend) => {
    // Text goes out at once; media goes out as soon as it is ready, so a long
    // video never holds up what is sent after it, and the server dates it when
    // it is actually sent. Items of one album keep their order. Each lane sends
    // one request at a time so the server stores them in that order.
    const prepared = prepare(conversation, send);
    const albumId = send.attachment ? send.options?.mediaGroupId : undefined;
    const earlierAlbumItem = (albumId && conversation.albumTurns.get(albumId)) || Promise.resolve();
    let delivery: Promise<boolean> = Promise.resolve(false);
    const turn = Promise.all([prepared.catch(() => undefined), earlierAlbumItem]).then(() => {
      const lane = send.attachment ? 'mediaLane' : 'textLane';
      delivery = conversation[lane].then(() => deliver(chat, conversation, send, prepared));
      conversation[lane] = delivery.catch(() => undefined);
    });
    if (albumId) {
      conversation.albumTurns.set(albumId, turn);
      turn.then(() => {
        if (conversation.albumTurns.get(albumId) === turn) conversation.albumTurns.delete(albumId);
      });
    }
    return turn.then(() => delivery);
  };

  return {
    /** Shows the bubbles at once and sends them in the background; resolves with each send's success. */
    enqueue(chat: ChatItem, sends: OutgoingChatSend[]): Promise<boolean[]> {
      if (sends.length === 0) return Promise.resolve([]);
      const conversation = conversationFor(keyFor(chat));
      sends.forEach(send => conversation.pending.set(send.tempId, send.optimisticMessage));
      publish(conversation);
      return Promise.all(sends.map(send => schedule(chat, conversation, send)));
    },

    getSnapshot(chat: ChatItem): ChatOutgoingSnapshot {
      return conversations.get(keyFor(chat))?.snapshot ?? EMPTY_SNAPSHOT;
    },

    subscribe(chat: ChatItem, listener: Listener) {
      const conversation = conversationFor(keyFor(chat));
      conversation.listeners.add(listener);
      return () => {
        conversation.listeners.delete(listener);
      };
    },

    /**
     * Whether a send request is on the wire. Reloading the thread meanwhile
     * could show the server's copy next to the bubble it replaces.
     */
    hasActiveRequest(chat: ChatItem) {
      return (conversations.get(keyFor(chat))?.activeRequests ?? 0) > 0;
    },

    clear() {
      conversations.clear();
    },
  };
}

export type ChatOutgoingQueue = ReturnType<typeof createChatOutgoingQueue>;

const repository = createMessagesRepository();

export const chatOutgoingQueue = createChatOutgoingQueue({
  send: (chat, message, attachment, options) =>
    repository.sendMessage(chat, message, attachment, options),
  fetchLatest: chat => repository.getMessages(chat, { limit: 1 }),
  ownerId: () => sessionStorage.getSession()?.userId?.trim() || 'guest',
});
