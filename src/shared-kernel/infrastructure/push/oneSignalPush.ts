// Description: Registers OneSignal push subscriptions with the WoWonder API.
import { Platform } from 'react-native';
import {
  LogLevel,
  OneSignal,
  type PushSubscriptionChangedState,
  type UserChangedState,
} from 'react-native-onesignal';
import { apiRoutes } from '../../application/constants/route-registry';
import { apiBridge } from '../api/apiBridge';
import { apiConfig } from '../config/env';
import { sessionStorage } from '../storage/sessionStorage';

const PUSH_DEBUG_PREFIX = '[VNSEEA_PUSH_DEBUG]';

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

export function initializePushNotifications() {
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
  OneSignal.Notifications.addEventListener('permissionChange', handlePermissionChange);

  const userId = sessionStorage.getSession()?.userId;
  if (userId) {
    OneSignal.login(userId);
    logPushDebug('push_user_login', {
      userId,
      source: 'initialize',
    });
    try {
      OneSignal.User.pushSubscription.optIn();
      logPushDebug('push_opt_in_complete', {
        source: 'initialize',
      });
    } catch (error) {
      logPushDebug('push_opt_in_error', {
        source: 'initialize',
        error: pushDebugError(error),
      });
    }
  }

  OneSignal.Notifications.requestPermission(false)
    .then(permissionGranted => {
      logPushDebug('push_permission_request_result', {
        permissionGranted,
      });
    })
    .catch(error => {
      logPushDebug('push_permission_request_error', {
        error: pushDebugError(error),
      });
      console.warn('[OneSignal] Could not request push permission', error);
    });
  syncCurrentSubscription().catch(error => {
    logPushDebug('push_sync_error', {
      source: 'initialize_current_subscription',
      error: pushDebugError(error),
    });
    console.warn('[OneSignal] Could not read push subscription', error);
  });
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
  try {
    OneSignal.User.pushSubscription.optIn();
    logPushDebug('push_opt_in_complete', {
      source: 'identify',
    });
  } catch (error) {
    logPushDebug('push_opt_in_error', {
      source: 'identify',
      error: pushDebugError(error),
    });
  }
  syncCurrentSubscription().catch(error => {
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
