// Description: Formats the delivery status line shown under outgoing chat messages.
import type {
  MessageItem,
  MessageSendProgress,
} from '../../domain/types/messages.types';

function toPercent(progress: number | undefined) {
  if (progress === undefined || !Number.isFinite(progress)) return undefined;
  return Math.round(Math.min(1, Math.max(0, progress)) * 100);
}

export function formatMessageSendingStatus(
  sendProgress: MessageSendProgress | undefined,
) {
  const percent = toPercent(sendProgress?.progress);
  if (sendProgress?.phase === 'preparing') {
    return percent === undefined ? 'Đang xử lý...' : `Đang xử lý ${percent}%`;
  }
  if (sendProgress?.phase === 'uploading' && percent !== undefined) {
    return `Đang gửi ${percent}%`;
  }
  return 'Đang gửi...';
}

/**
 * Combines the items of a media album into one status: delivered items count
 * as complete, and the album reports whichever phase is still running.
 */
export function getMediaGroupSendProgress(
  messages: MessageItem[],
): MessageSendProgress | undefined {
  const pending = messages.filter(message => message.deliveryState === 'sending');
  if (pending.length === 0) return undefined;

  const preparing = pending.some(
    message => message.sendProgress?.phase === 'preparing',
  );
  const uploading = pending.some(
    message => message.sendProgress?.phase === 'uploading',
  );
  if (!preparing && !uploading) return undefined;

  const completed = messages.length - pending.length;
  const inFlight = pending.reduce(
    (total, message) => total + (message.sendProgress?.progress ?? 0),
    0,
  );
  return {
    phase: preparing ? 'preparing' : 'uploading',
    progress: (completed + inFlight) / messages.length,
  };
}
