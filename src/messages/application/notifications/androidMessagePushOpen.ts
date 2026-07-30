import {
  AppState,
  DeviceEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';
import { pushNotificationOpenEvents } from '../../../shared-kernel/infrastructure/push/pushNotificationOpenEvents';
import type { PushNotificationOpenPayload } from '../../../shared-kernel/infrastructure/push/pushNotificationOpenEvents';

const EVENT_NAME = 'vnseeaMessagePushOpen';
const MESSAGE_TYPES = new Set(['user', 'page', 'group']);

type NativeMessagePushModule = {
  consumePendingMessageOpen?: () => Promise<string | null>;
};

let initialized = false;
let consumeInFlight: Promise<void> | null = null;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
}

export function parseAndroidMessagePushOpen(
  raw: string | null | undefined,
): PushNotificationOpenPayload | null {
  if (!raw) return null;
  try {
    const parsed = asRecord(JSON.parse(raw));
    const additionalData = asRecord(parsed?.additionalData);
    if (!parsed || !additionalData) return null;

    const conversationType = readString(
      additionalData,
      'type',
    ).toLowerCase();
    const targetKey =
      conversationType === 'group'
        ? 'group_id'
        : conversationType === 'page'
        ? 'page_id'
        : 'user_id';
    if (
      !MESSAGE_TYPES.has(conversationType) ||
      !readString(additionalData, targetKey)
    ) {
      return null;
    }

    const notificationId = readString(parsed, 'notificationId');
    if (!notificationId) return null;
    const openedAt = Number(parsed.openedAt);
    return {
      notificationId,
      title: readString(parsed, 'title') || undefined,
      body: readString(parsed, 'body') || undefined,
      additionalData,
      openedAt: Number.isFinite(openedAt) ? openedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function nativeModule(): NativeMessagePushModule | null {
  if (Platform.OS !== 'android') return null;
  return (
    (NativeModules.VnseeaMessageNotification as
      | NativeMessagePushModule
      | undefined) ?? null
  );
}

export function flushPendingAndroidMessagePushOpen() {
  if (consumeInFlight) return consumeInFlight;
  const module = nativeModule();
  if (!module?.consumePendingMessageOpen) return null;

  consumeInFlight = module
    .consumePendingMessageOpen()
    .then(raw => {
      const payload = parseAndroidMessagePushOpen(raw);
      if (payload) {
        pushNotificationOpenEvents.emit(payload);
      }
    })
    .catch(error => {
      console.warn(
        '[MessagePushOpen] Could not consume native notification route',
        error,
      );
    })
    .finally(() => {
      consumeInFlight = null;
    });
  return consumeInFlight;
}

export function initializeAndroidMessagePushOpen() {
  if (initialized || Platform.OS !== 'android') return;
  initialized = true;
  DeviceEventEmitter.addListener(EVENT_NAME, () => {
    flushPendingAndroidMessagePushOpen();
  });
  AppState.addEventListener('change', state => {
    if (state === 'active') {
      flushPendingAndroidMessagePushOpen();
    }
  });
  flushPendingAndroidMessagePushOpen();
}
