import { createMMKV } from 'react-native-mmkv';
import type { PushNotificationOpenPayload } from '../../../shared-kernel/infrastructure/push/pushNotificationOpenEvents';

const OPEN_KEY = 'push.navigation.pending-open';
const RECEIPTS_KEY = 'push.navigation.pending-read-receipts';
const MAX_AGE_MS = 24 * 60 * 60 * 1_000;
const storage = createMMKV({ id: 'vnseea-push-navigation' });

const ALLOWED_DATA_KEYS = new Set([
  'push_kind',
  'payload_kind',
  'notification_type',
  'event_type',
  'type',
  'type2',
  'notification_id',
  'notif_id',
  'recipient_id',
  'recipient_user_id',
  'notifier_id',
  'message_id',
  'message_type',
  'post_id',
  'postId',
  'comment_id',
  'reply_id',
  'focus_comments',
  'story_id',
  'user_id',
  'sender_id',
  'sender_name',
  'sender_avatar',
  'group_id',
  'group_name',
  'group_chat_id',
  'page_id',
  'page_name',
  'product_id',
  'order_id',
  'order_hash_id',
  'hash_id',
  'event_id',
  'thread_id',
  'blog_id',
  'job_id',
  'fund_id',
  'funding_id',
  'conversation_type',
  'conversation_id',
  'name',
  'avatar',
  'url',
  'full_link',
  'ajax_url',
  'type_text',
  'text',
  'description',
]);

function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.slice(0, maxLength) : undefined;
}

function sanitizeRoutingFields(data: Record<string, unknown>) {
  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      ALLOWED_DATA_KEYS.has(key) &&
      (typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean')
    ) {
      sanitized[key] =
        typeof value === 'string' ? value.slice(0, 2_048) : value;
    }
  }
  return sanitized;
}

function sanitizeAdditionalData(data: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = sanitizeRoutingFields(data);
  for (const nestedKey of ['notification_data', 'data'] as const) {
    const nested = data[nestedKey];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      sanitized[nestedKey] = sanitizeRoutingFields(
        nested as Record<string, unknown>,
      );
    }
  }
  return sanitized;
}

function sanitizeOpen(
  payload: PushNotificationOpenPayload,
): PushNotificationOpenPayload {
  return {
    notificationId: String(payload.notificationId).slice(0, 191),
    title: sanitizeText(payload.title, 256),
    body: sanitizeText(payload.body, 1_024),
    launchUrl: sanitizeText(payload.launchUrl, 2_048),
    additionalData: sanitizeAdditionalData(payload.additionalData),
    openedAt: Number.isFinite(payload.openedAt) ? payload.openedAt : Date.now(),
  };
}

type PendingReadReceipt = {
  notificationId: string;
  recipientUserId: string;
};

function readReceipts(): PendingReadReceipt[] {
  const raw = storage.getString(RECEIPTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map(value => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
              return null;
            }
            const record = value as Record<string, unknown>;
            const notificationId = String(
              record.notificationId ?? '',
            ).trim();
            const recipientUserId = String(
              record.recipientUserId ?? '',
            ).trim();
            return notificationId && recipientUserId
              ? { notificationId, recipientUserId }
              : null;
          })
          .filter(
            (value): value is PendingReadReceipt => value !== null,
          )
          .filter(
            (value, index, values) =>
              values.findIndex(
                candidate =>
                  candidate.notificationId === value.notificationId &&
                  candidate.recipientUserId === value.recipientUserId,
              ) === index,
          )
      : [];
  } catch {
    return [];
  }
}

export const pushNavigationStorage = {
  saveOpen(payload: PushNotificationOpenPayload) {
    storage.set(OPEN_KEY, JSON.stringify(sanitizeOpen(payload)));
  },

  getOpen(now = Date.now()) {
    const raw = storage.getString(OPEN_KEY);
    if (!raw) return null;
    try {
      const payload = JSON.parse(raw) as PushNotificationOpenPayload;
      if (
        !Number.isFinite(payload.openedAt) ||
        now - payload.openedAt > MAX_AGE_MS
      ) {
        storage.remove(OPEN_KEY);
        return null;
      }
      return sanitizeOpen(payload);
    } catch {
      storage.remove(OPEN_KEY);
      return null;
    }
  },

  clearOpen(notificationId?: string) {
    if (notificationId) {
      const current = this.getOpen();
      if (current?.notificationId !== notificationId) return;
    }
    storage.remove(OPEN_KEY);
  },

  addReadReceipt(notificationId: string, recipientUserId: string) {
    const normalized = notificationId.trim();
    const normalizedRecipient = recipientUserId.trim();
    if (!normalized || !normalizedRecipient) return;
    storage.set(
      RECEIPTS_KEY,
      JSON.stringify([
        ...readReceipts(),
        {
          notificationId: normalized,
          recipientUserId: normalizedRecipient,
        },
      ]),
    );
  },

  getReadReceipts(recipientUserId: string) {
    const normalizedRecipient = recipientUserId.trim();
    return readReceipts()
      .filter(receipt => receipt.recipientUserId === normalizedRecipient)
      .map(receipt => receipt.notificationId);
  },

  completeReadReceipt(notificationId: string, recipientUserId: string) {
    const remaining = readReceipts().filter(
      receipt =>
        receipt.notificationId !== notificationId ||
        receipt.recipientUserId !== recipientUserId,
    );
    if (remaining.length === 0) {
      storage.remove(RECEIPTS_KEY);
    } else {
      storage.set(RECEIPTS_KEY, JSON.stringify(remaining));
    }
  },

  clear() {
    storage.remove(OPEN_KEY);
    storage.remove(RECEIPTS_KEY);
  },
};
