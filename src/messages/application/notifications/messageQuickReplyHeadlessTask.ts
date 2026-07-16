// Description: Headless JS task that sends notification quick replies through the existing messages repository.
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';

type QuickReplyTaskPayload = {
  [key: string]: unknown;
  'vnseea.quick_reply_text'?: string;
  conversationType?: string;
  targetId?: string;
  senderName?: string;
  messagePreview?: string;
  notificationId?: number;
};

const messagesRepository = createMessagesRepository();

function toStringValue(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

export async function handleMessageQuickReplyHeadlessTask(
  payload: QuickReplyTaskPayload,
) {
  const replyText = toStringValue(payload['vnseea.quick_reply_text']);
  const conversationType = toStringValue(payload.conversationType).toLowerCase();
  const targetId = toStringValue(payload.targetId);
  const senderName = toStringValue(payload.senderName);
  const messagePreview = toStringValue(payload.messagePreview);

  if (!replyText || !targetId) {
    console.warn('[MessageQuickReply] Missing reply text or target id', {
      hasReplyText: Boolean(replyText),
      hasTargetId: Boolean(targetId),
      conversationType,
    });
    return;
  }

  try {
    if (conversationType === 'group') {
      await messagesRepository.sendGroupMessage(targetId, replyText);
    } else {
      await messagesRepository.sendMessage(targetId, replyText);
    }

    console.log('[MessageQuickReply] Reply sent from notification', {
      conversationType: conversationType || 'user',
      targetId,
      senderName,
      messagePreview,
    });
  } catch (error) {
    console.warn('[MessageQuickReply] Failed to send notification reply', error);
    throw error;
  }
}
