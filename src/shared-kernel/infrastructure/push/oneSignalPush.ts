// Description: Registers OneSignal push subscriptions with the WoWonder API.
import { Platform } from 'react-native';
import {
  LogLevel,
  OneSignal,
  type NotificationWillDisplayEvent,
  type PushSubscriptionChangedState,
  type UserChangedState,
} from 'react-native-onesignal';
import { apiRoutes } from '../../application/constants/route-registry';
import { apiBridge } from '../api/apiBridge';
import { apiConfig } from '../config/env';
import { syncMessageNotificationIdentity } from '../notifications/messageNotificationIdentity';
import { sessionStorage } from '../storage/sessionStorage';
import { foregroundPushEvents } from './foregroundPushEvents';

const PUSH_DEBUG_PREFIX = '[VNSEEA_PUSH_DEBUG]';
const MESSAGE_PUSH_KINDS = new Set([
  'message',
  'chat',
  'chat_message',
  'new_message',
]);

let initialized = false;
let lastSyncedKey = '';
let syncInFlight: Promise<void> | null = null;

function maskPushIdentifier(value?: string | null) {
  if (!value) {
    return {
      present: false,
      length: 0,
      suffix: '',
    };
  }

  return {
    present: true,
    length: value.length,
    suffix: value.slice(-8),
  };
}

function pushDebugError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}

function logPushDebug(event: string, data: Record<string, unknown> = {}) {
  try {
    console.log(
      PUSH_DEBUG_PREFIX,
      JSON.stringify({
        event,
        at: new Date().toISOString(),
        platform: Platform.OS,
        ...data,
      }),
    );
  } catch (error) {
    console.log(PUSH_DEBUG_PREFIX, event, pushDebugError(error));
  }
}

function isPushConfigured() {
  return apiConfig.oneSignalAppId.trim().length > 0;
}

function buildDevicePayload(pushId: string) {
  if (Platform.OS === 'ios') {
    return {
      fetch: 'count_new_messages',
      ios_n_device_id: pushId,
      ios_m_device_id: pushId,
    };
  }

  return {
    fetch: 'count_new_messages',
    android_n_device_id: pushId,
    android_m_device_id: pushId,
  };
}

async function readCurrentPushState(stage: string) {
  const [pushId, pushToken, optedIn, permissionGranted] = await Promise.all([
    OneSignal.User.pushSubscription.getIdAsync(),
    OneSignal.User.pushSubscription.getTokenAsync(),
    OneSignal.User.pushSubscription.getOptedInAsync(),
    OneSignal.Notifications.getPermissionAsync(),
  ]);
  const userId = sessionStorage.getSession()?.userId;

  logPushDebug('push_subscription_state', {
    stage,
    userIdPresent: Boolean(userId),
    userId,
    pushId: maskPushIdentifier(pushId),
    pushToken: maskPushIdentifier(pushToken),
    optedIn,
    permissionGranted,
  });

  return pushId;
}

async function syncPushSubscription(pushId?: string | null) {
  const userId = sessionStorage.getSession()?.userId;
  if (!userId) {
    logPushDebug('push_sync_skipped', {
      reason: 'missing_user',
      pushId: maskPushIdentifier(pushId),
    });
    return;
  }
  if (!pushId) {
    logPushDebug('push_sync_skipped', {
      reason: 'missing_subscription',
      userId,
    });
    return;
  }

  const syncKey = `${Platform.OS}:${userId}:${pushId}`;
  if (lastSyncedKey === syncKey) {
    logPushDebug('push_sync_skipped', {
      reason: 'already_synced',
      userId,
      pushId: maskPushIdentifier(pushId),
    });
    return;
  }
  if (syncInFlight) {
    logPushDebug('push_sync_wait_existing', {
      userId,
      pushId: maskPushIdentifier(pushId),
    });
    await syncInFlight;
    if (lastSyncedKey === syncKey) {
      logPushDebug('push_sync_skipped', {
        reason: 'synced_by_existing_request',
        userId,
        pushId: maskPushIdentifier(pushId),
      });
      return;
    }
  }

  logPushDebug('push_sync_request', {
    userId,
    pushId: maskPushIdentifier(pushId),
    targetFields:
      Platform.OS === 'ios'
        ? ['ios_n_device_id', 'ios_m_device_id']
        : ['android_n_device_id', 'android_m_device_id'],
  });

  syncInFlight = apiBridge
    .post(apiRoutes.feed.generalData, buildDevicePayload(pushId))
    .then(() => {
      lastSyncedKey = syncKey;
      logPushDebug('push_sync_success', {
        userId,
        pushId: maskPushIdentifier(pushId),
      });
    })
    .catch(error => {
      logPushDebug('push_sync_error', {
        userId,
        pushId: maskPushIdentifier(pushId),
        error: pushDebugError(error),
      });
      console.warn('[OneSignal] Could not sync push subscription', error);
    })
    .finally(() => {
      syncInFlight = null;
    });

  await syncInFlight;
}

async function syncCurrentSubscription() {
  if (!initialized || !isPushConfigured()) return;

  const pushId = await readCurrentPushState('sync_current');
  await syncPushSubscription(pushId);
}

function handleSubscriptionChange(event: PushSubscriptionChangedState) {
  logPushDebug('push_subscription_changed', {
    previousId: maskPushIdentifier(event.previous.id),
    currentId: maskPushIdentifier(event.current.id),
    previousToken: maskPushIdentifier(event.previous.token),
    currentToken: maskPushIdentifier(event.current.token),
    previousOptedIn: event.previous.optedIn,
    currentOptedIn: event.current.optedIn,
  });
  syncPushSubscription(event.current.id).catch(error => {
    logPushDebug('push_sync_error', {
      source: 'subscription_change',
      error: pushDebugError(error),
    });
    console.warn('[OneSignal] Could not handle subscription change', error);
  });
}

function handleUserChange(event: UserChangedState) {
  logPushDebug('push_user_state_changed', {
    externalId: maskPushIdentifier(event.current.externalId),
    oneSignalId: maskPushIdentifier(event.current.onesignalId),
  });
}

function handlePermissionChange(permissionGranted: boolean) {
  logPushDebug('push_permission_changed', {
    permissionGranted,
  });
}

async function optInPushIfAlreadyAuthorized(source: string) {
  const permissionGranted =
    await OneSignal.Notifications.getPermissionAsync();
  if (!permissionGranted) {
    logPushDebug('push_opt_in_skipped', {
      source,
      reason: 'permission_not_granted',
    });
    return false;
  }

  try {
    OneSignal.User.pushSubscription.optIn();
    logPushDebug('push_opt_in_complete', { source });
    return true;
  } catch (error) {
    logPushDebug('push_opt_in_error', {
      source,
      error: pushDebugError(error),
    });
    return false;
  }
}

function toPushData(value: object | undefined): Record<string, unknown> {
  if (!value || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readPushDataString(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
}

function isLiveKitPush(data: Record<string, unknown>) {
  const eventType = readPushDataString(data, 'event_type').toLowerCase();
  const provider = readPushDataString(data, 'provider').toLowerCase();

  return eventType.startsWith('livekit_') || provider === 'livekit';
}

function isAndroidNativeMessagePush(data: Record<string, unknown>) {
  if (Platform.OS !== 'android') return false;

  const type = readPushDataString(data, 'type').toLowerCase();
  const pushKind = (
    readPushDataString(data, 'push_kind') ||
    readPushDataString(data, 'payload_kind')
  ).toLowerCase();
  const notificationType = readPushDataString(
    data,
    'notification_type',
  ).toLowerCase();
  const hasConversationTarget =
    (type === 'group' && readPushDataString(data, 'group_id').length > 0) ||
    (type === 'page' && readPushDataString(data, 'page_id').length > 0) ||
    (type === 'user' && readPushDataString(data, 'user_id').length > 0);

  if (pushKind) {
    return MESSAGE_PUSH_KINDS.has(pushKind) && hasConversationTarget;
  }
  if (MESSAGE_PUSH_KINDS.has(notificationType)) {
    return hasConversationTarget;
  }
  if (readPushDataString(data, 'message_id')) {
    return hasConversationTarget;
  }

  if (type === 'group') {
    return readPushDataString(data, 'group_id').length > 0;
  }
  if (type === 'page') {
    return readPushDataString(data, 'page_id').length > 0;
  }

  return type === 'user' && readPushDataString(data, 'user_id').length > 0;
}

function handleForegroundWillDisplay(event: NotificationWillDisplayEvent) {
  const notification = event.getNotification();
  const additionalData = toPushData(notification.additionalData);

  logPushDebug('push_foreground_received', {
    notificationId: maskPushIdentifier(notification.notificationId),
    hasTitle: Boolean(notification.title?.trim()),
    hasBody: Boolean(notification.body?.trim()),
    eventType: readPushDataString(additionalData, 'event_type'),
    notificationType: readPushDataString(additionalData, 'type'),
  });

  // LiveKit pushes are intentionally owned by nativeCallService so foreground
  // calls keep their CallKit/full-screen behavior instead of becoming a banner.
  if (isLiveKitPush(additionalData)) {
    logPushDebug('push_foreground_delegated', { target: 'livekit' });
    return;
  }

  foregroundPushEvents.emit({
    id: notification.notificationId,
    title: notification.title,
    body: notification.body,
    additionalData,
    receivedAt: Date.now(),
  });

  // The Android service extension already posts message notifications with
  // MessagingStyle and inline reply. Let that native path display it once.
  if (isAndroidNativeMessagePush(additionalData)) {
    logPushDebug('push_foreground_delegated', {
      target: 'android_message_notification',
    });
    return;
  }

  if (!notification.title?.trim() && !notification.body?.trim()) {
    logPushDebug('push_foreground_display_skipped', {
      reason: 'missing_visible_content',
    });
    return;
  }

  // Make foreground presentation explicit. OneSignal v5 displays foreground
  // notifications by default, while preventDefault + display lets this app
  // guarantee one controlled display and keeps the behavior testable.
  event.preventDefault();
  try {
    notification.display();
    logPushDebug('push_foreground_displayed', {
      notificationId: maskPushIdentifier(notification.notificationId),
    });
  } catch (error) {
    logPushDebug('push_foreground_display_error', {
      error: pushDebugError(error),
    });
    console.warn(
      '[OneSignal] Could not display foreground notification',
      error,
    );
  }
}

export function initializePushNotifications() {
  syncMessageNotificationIdentity(sessionStorage.getUserProfile());

  if (initialized) {
    logPushDebug('push_initialize_skipped', {
      reason: 'already_initialized',
    });
    return;
  }

  if (!isPushConfigured()) {
    logPushDebug('push_initialize_skipped', {
      reason: 'missing_app_id',
    });
    if (__DEV__) {
      console.warn(
        '[OneSignal] ONESIGNAL_APP_ID is not configured; push notifications are disabled.',
      );
    }
    return;
  }

  initialized = true;

  logPushDebug('push_initialize_start', {
    appId: maskPushIdentifier(apiConfig.oneSignalAppId),
  });

  if (__DEV__) {
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
  }

  OneSignal.initialize(apiConfig.oneSignalAppId);
  OneSignal.User.pushSubscription.addEventListener(
    'change',
    handleSubscriptionChange,
  );
  OneSignal.User.addEventListener('change', handleUserChange);
  OneSignal.Notifications.addEventListener(
    'permissionChange',
    handlePermissionChange,
  );
  OneSignal.Notifications.addEventListener(
    'foregroundWillDisplay',
    handleForegroundWillDisplay,
  );

  const userId = sessionStorage.getSession()?.userId;
  if (userId) {
    OneSignal.login(userId);
    logPushDebug('push_user_login', {
      userId,
      source: 'initialize',
    });
  }

  optInPushIfAlreadyAuthorized('initialize')
    .then(() => syncCurrentSubscription())
    .catch(error => {
      logPushDebug('push_sync_error', {
        source: 'initialize_current_subscription',
        error: pushDebugError(error),
      });
      console.warn('[OneSignal] Could not read push subscription', error);
    });
}

export async function getPushNotificationPermissionStatus() {
  if (!initialized) initializePushNotifications();
  if (!initialized || !isPushConfigured()) return false;
  return OneSignal.Notifications.getPermissionAsync();
}

export async function requestPushNotificationPermission() {
  if (!initialized) initializePushNotifications();
  if (!initialized || !isPushConfigured()) return false;

  let permissionGranted =
    await OneSignal.Notifications.getPermissionAsync();
  if (!permissionGranted) {
    const canRequest =
      await OneSignal.Notifications.canRequestPermission();
    if (!canRequest) {
      logPushDebug('push_permission_request_skipped', {
        reason: 'system_prompt_unavailable',
      });
      return false;
    }

    permissionGranted =
      await OneSignal.Notifications.requestPermission(false);
    logPushDebug('push_permission_request_result', {
      permissionGranted,
      source: 'notification_settings',
    });
  }

  if (!permissionGranted) return false;
  await optInPushIfAlreadyAuthorized('notification_settings');
  await syncCurrentSubscription();
  return true;
}

export function identifyPushUser(userId: string) {
  if (!initialized) {
    initializePushNotifications();
  }

  if (!initialized || !isPushConfigured()) return;

  OneSignal.login(userId);
  logPushDebug('push_user_login', {
    userId,
    source: 'identify',
  });
  optInPushIfAlreadyAuthorized('identify')
    .then(() => syncCurrentSubscription())
    .catch(error => {
      logPushDebug('push_sync_error', {
        source: 'identify_current_subscription',
        error: pushDebugError(error),
      });
      console.warn('[OneSignal] Could not sync identified push user', error);
    });
}

export function logoutPushUser() {
  lastSyncedKey = '';
  if (!initialized || !isPushConfigured()) return;

  logPushDebug('push_logout');
  try {
    OneSignal.logout();
    logPushDebug('push_user_logout_complete');
  } catch (error) {
    logPushDebug('push_user_logout_error', {
      error: pushDebugError(error),
    });
  }

  try {
    OneSignal.User.pushSubscription.optOut();
    logPushDebug('push_opt_out_complete');
  } catch (error) {
    logPushDebug('push_opt_out_error', {
      error: pushDebugError(error),
    });
  }
}
