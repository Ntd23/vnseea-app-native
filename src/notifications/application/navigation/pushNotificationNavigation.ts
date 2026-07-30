// Description: Routes OneSignal notification clicks after root navigation is ready.

import { AppState } from 'react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigationRef } from '../../../navigation/navigationRef';
import {
  getUnreadBadgeCountsSnapshot,
  setUnreadBadgeCounts,
} from '../../../shared-kernel/application/stores/unreadBadgeStore';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import {
  pushNotificationOpenEvents,
  type PushNotificationOpenPayload,
} from '../../../shared-kernel/infrastructure/push/pushNotificationOpenEvents';
import {
  createNotificationsRepository,
  mapNotificationRecord,
} from '../../infrastructure/repositories/ApiNotificationsRepository';
import type { NotificationsItem } from '../../domain/types/notifications.types';
import { navigateToNotification } from './navigateToNotification';
import { pushNavigationStorage } from './pushNavigationStorage';

let initialized = false;
let pendingPayload: PushNotificationOpenPayload | null = null;
let navigationInFlight: Promise<void> | null = null;
let readReceiptInFlight: Promise<void> | null = null;
let lastHandledKey = '';
const MESSAGE_PUSH_KINDS = new Set([
  'message',
  'chat',
  'chat_message',
  'new_message',
]);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }
  return '';
}

function normalizePushData(payload: PushNotificationOpenPayload) {
  const root = payload.additionalData;
  const nested = asRecord(root.notification_data ?? root.data);
  const data = { ...nested, ...root };
  const pushKind = readString(data, 'push_kind', 'payload_kind').toLowerCase();
  const notificationType = readString(data, 'notification_type').toLowerCase();
  const type = MESSAGE_PUSH_KINDS.has(pushKind)
    ? notificationType || pushKind
    : readString(data, 'type', 'notification_type', 'event_type');

  return {
    ...data,
    id:
      readString(data, 'notification_id', 'notif_id') ||
      payload.notificationId,
    notification_id:
      readString(data, 'notification_id', 'notif_id') || payload.notificationId,
    type,
    type_text:
      readString(data, 'type_text', 'text', 'description') || payload.body || '',
    url:
      readString(data, 'url', 'full_link', 'ajax_url') ||
      payload.launchUrl ||
      '',
    time: Math.floor(payload.openedAt / 1000),
    name: readString(data, 'name', 'sender_name') || payload.title || '',
    avatar: readString(data, 'avatar', 'sender_avatar', 'profile_picture'),
  };
}

export function mapPushNotificationOpenPayload(
  payload: PushNotificationOpenPayload,
): NotificationsItem {
  return mapNotificationRecord(normalizePushData(payload));
}

function payloadKey(payload: PushNotificationOpenPayload) {
  const data = normalizePushData(payload);
  return [
    payload.notificationId,
    readString(data, 'type'),
    readString(data, 'post_id', 'postId'),
    readString(data, 'url'),
  ].join(':');
}

function backendNotificationId(payload: PushNotificationOpenPayload) {
  const root = payload.additionalData;
  const nested = asRecord(root.notification_data ?? root.data);
  return readString({ ...nested, ...root }, 'notification_id', 'notif_id');
}

function pushRecipientUserId(payload: PushNotificationOpenPayload) {
  const root = payload.additionalData;
  const nested = asRecord(root.notification_data ?? root.data);
  return readString(
    { ...nested, ...root },
    'recipient_id',
    'recipient_user_id',
  );
}

function scopePayloadToCurrentUser(
  payload: PushNotificationOpenPayload,
): PushNotificationOpenPayload | null {
  if (pushRecipientUserId(payload)) return payload;
  const currentUserId = sessionStorage.getSession()?.userId?.trim();
  if (!currentUserId) return null;
  return {
    ...payload,
    additionalData: {
      ...payload.additionalData,
      recipient_id: currentUserId,
    },
  };
}

export function flushPendingPushNotificationReadReceipts() {
  const session = sessionStorage.getSession();
  const recipientUserId = session?.userId?.trim();
  if (
    readReceiptInFlight ||
    !session?.accessToken ||
    !recipientUserId
  ) {
    return readReceiptInFlight;
  }
  const notificationIds =
    pushNavigationStorage.getReadReceipts(recipientUserId);
  if (notificationIds.length === 0) return null;

  const repository = createNotificationsRepository();
  readReceiptInFlight = (async () => {
    for (const notificationId of notificationIds) {
      try {
        await repository.markAsSeen(notificationId);
        pushNavigationStorage.completeReadReceipt(
          notificationId,
          recipientUserId,
        );
        const current = getUnreadBadgeCountsSnapshot();
        setUnreadBadgeCounts({
          notificationCount: Math.max(0, current.notificationCount - 1),
        });
      } catch (error) {
        console.warn(
          '[PushNotificationNavigation] mark seen failed',
          error,
        );
      }
    }
  })().finally(() => {
    readReceiptInFlight = null;
  });

  return readReceiptInFlight;
}

function navigateToFeedFallback() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate(ROUTES.MAIN_TABS, {
    screen: ROUTES.FEED,
  });
}

export function flushPendingPushNotificationNavigation() {
  flushPendingPushNotificationReadReceipts();
  if (navigationInFlight || !pendingPayload) return navigationInFlight;
  const session = sessionStorage.getSession();
  const currentUserId = session?.userId?.trim();
  if (!session?.accessToken || !currentUserId || !navigationRef.isReady()) {
    return null;
  }

  const payload = pendingPayload;
  const recipientUserId = pushRecipientUserId(payload);
  if (!recipientUserId) {
    pendingPayload = null;
    pushNavigationStorage.clearOpen(payload.notificationId);
    return null;
  }
  if (recipientUserId !== currentUserId) {
    return null;
  }
  const key = payloadKey(payload);
  pendingPayload = null;

  if (key && key === lastHandledKey) {
    pushNavigationStorage.clearOpen(payload.notificationId);
    return null;
  }

  navigationInFlight = navigateToNotification(
    mapPushNotificationOpenPayload(payload),
    navigationRef,
  )
    .then(() => {
      lastHandledKey = key;
      pushNavigationStorage.clearOpen(payload.notificationId);
      const notificationId = backendNotificationId(payload);
      if (notificationId) {
        pushNavigationStorage.addReadReceipt(
          notificationId,
          recipientUserId,
        );
        flushPendingPushNotificationReadReceipts();
      }
    })
    .catch(error => {
      console.warn('[PushNotificationNavigation] navigation failed', error);
      navigateToFeedFallback();
    })
    .finally(() => {
      navigationInFlight = null;
      if (pendingPayload) flushPendingPushNotificationNavigation();
    });

  return navigationInFlight;
}

function handlePushNotificationOpen(payload: PushNotificationOpenPayload) {
  const scopedPayload = scopePayloadToCurrentUser(payload);
  if (!scopedPayload) return;
  const key = payloadKey(scopedPayload);
  if (key && key === lastHandledKey) return;

  pendingPayload = scopedPayload;
  pushNavigationStorage.saveOpen(scopedPayload);
  flushPendingPushNotificationNavigation();
}

export function initializePushNotificationNavigation() {
  if (initialized) return;
  initialized = true;
  pendingPayload = pushNavigationStorage.getOpen();
  pushNotificationOpenEvents.subscribe(handlePushNotificationOpen);
  AppState.addEventListener('change', state => {
    if (state === 'active') {
      flushPendingPushNotificationNavigation();
      flushPendingPushNotificationReadReceipts();
    }
  });
  flushPendingPushNotificationNavigation();
}
