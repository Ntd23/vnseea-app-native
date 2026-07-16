// Description: Sends post-share messages through a bounded recipient queue.

import type { ChatItem } from '../../../messages/domain/types/messages.types';

export const MAX_MESSAGE_SHARE_RECIPIENTS = 10;
export const MESSAGE_SHARE_CONCURRENCY = 3;

export type MessageRecipientStatus = 'idle' | 'sending' | 'sent' | 'failed';

export type MessageRecipientStatuses = Record<string, MessageRecipientStatus>;

export interface MessageRecipientShareResult {
  recipientId: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface MessageShareRecipient {
  key: string;
  kind: 'user' | 'group';
  targetId: string;
}

export function getMessageShareRecipient(
  chat: ChatItem,
): MessageShareRecipient | null {
  if (chat.chatType === 'user') {
    const targetId = String(chat.participantId || chat.userId || '').trim();
    return targetId
      ? { key: `user:${targetId}`, kind: 'user', targetId }
      : null;
  }

  if (chat.chatType === 'group') {
    const targetId = String(chat.groupId || chat.chatId || chat.userId || '').trim();
    return targetId
      ? { key: `group:${targetId}`, kind: 'group', targetId }
      : null;
  }

  return null;
}

export function getMessageShareChats(
  chats: ChatItem[],
  currentUserId?: string | null,
) {
  const normalizedCurrentUserId = String(currentUserId || '').trim();
  const chatsByRecipientKey = new Map<string, ChatItem>();

  for (const chat of chats) {
    const recipient = getMessageShareRecipient(chat);
    if (!recipient) continue;
    if (chat.chatType === 'user' && chat.hasConversationRecord === false) continue;
    if (
      recipient.kind === 'user' &&
      recipient.targetId === normalizedCurrentUserId
    ) {
      continue;
    }

    const current = chatsByRecipientKey.get(recipient.key);
    if (!current || chat.lastMessageTime > current.lastMessageTime) {
      chatsByRecipientKey.set(recipient.key, chat);
    }
  }

  return [...chatsByRecipientKey.values()].sort(
    (left, right) => right.lastMessageTime - left.lastMessageTime,
  );
}

export function normalizeMessageRecipientIds(recipientIds: string[]) {
  const normalized = new Set<string>();

  for (const rawRecipientId of recipientIds) {
    const recipientId = String(rawRecipientId || '').trim();
    if (!recipientId) continue;
    normalized.add(recipientId);
    if (normalized.size >= MAX_MESSAGE_SHARE_RECIPIENTS) break;
  }

  return [...normalized];
}

export function getMessageRecipientIdsToSend(
  selectedRecipientIds: string[],
  statuses: MessageRecipientStatuses,
) {
  return normalizeMessageRecipientIds(selectedRecipientIds).filter(
    recipientId =>
      statuses[recipientId] !== 'sent' && statuses[recipientId] !== 'sending',
  );
}

export async function sendPostShareToMessageRecipients({
  recipientIds,
  send,
  onStatusChange,
  concurrency = MESSAGE_SHARE_CONCURRENCY,
}: {
  recipientIds: string[];
  send: (recipientId: string) => Promise<unknown>;
  onStatusChange?: (
    recipientId: string,
    status: MessageRecipientStatus,
    error?: string,
  ) => void;
  concurrency?: number;
}): Promise<MessageRecipientShareResult[]> {
  const normalizedRecipientIds = normalizeMessageRecipientIds(recipientIds);
  if (normalizedRecipientIds.length === 0) return [];

  const workerCount = Math.max(
    1,
    Math.min(
      Math.floor(concurrency) || 1,
      MESSAGE_SHARE_CONCURRENCY,
      normalizedRecipientIds.length,
    ),
  );
  const results = new Array<MessageRecipientShareResult>(
    normalizedRecipientIds.length,
  );
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < normalizedRecipientIds.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const recipientId = normalizedRecipientIds[currentIndex];
      onStatusChange?.(recipientId, 'sending');

      try {
        await send(recipientId);
        results[currentIndex] = { recipientId, status: 'sent' };
        onStatusChange?.(recipientId, 'sent');
      } catch (caught) {
        const error =
          caught instanceof Error ? caught.message : 'Unable to send share';
        results[currentIndex] = { recipientId, status: 'failed', error };
        onStatusChange?.(recipientId, 'failed', error);
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
}
