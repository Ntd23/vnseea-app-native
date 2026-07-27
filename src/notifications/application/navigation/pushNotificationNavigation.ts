// Description: Routes OneSignal notification clicks after root navigation is ready.

import { ROUTES } from '../../../navigation/constants/routes';
import { navigationRef } from '../../../navigation/navigationRef';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import {
  pushNotificationOpenEvents,
  type PushNotificationOpenPayload,
} from '../../../shared-kernel/infrastructure/push/pushNotificationOpenEvents';
import { mapNotificationRecord } from '../../infrastructure/repositories/ApiNotificationsRepository';
import type { NotificationsItem } from '../../domain/types/notifications.types';
import { navigateToNotification } from './navigateToNotification';

let initialized = false;
let pendingPayload: PushNotificationOpenPayload | null = null;
let navigationInFlight: Promise<void> | null = null;
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

function navigateToFeedFallback() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate(ROUTES.MAIN_TABS, {
    screen: ROUTES.FEED,
  });
}

export function flushPendingPushNotificationNavigation() {
  if (navigationInFlight || !pendingPayload) return navigationInFlight;
  if (!sessionStorage.getAccessToken() || !navigationRef.isReady()) {
    return null;
  }

  const payload = pendingPayload;
  const key = payloadKey(payload);
  pendingPayload = null;

  if (key && key === lastHandledKey) return null;

  navigationInFlight = navigateToNotification(
    mapPushNotificationOpenPayload(payload),
    navigationRef,
  )
    .then(() => {
      lastHandledKey = key;
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
  const key = payloadKey(payload);
  if (key && key === lastHandledKey) return;

  pendingPayload = payload;
  flushPendingPushNotificationNavigation();
}

export function initializePushNotificationNavigation() {
  if (initialized) return;
  initialized = true;
  pushNotificationOpenEvents.subscribe(handlePushNotificationOpen);
}
