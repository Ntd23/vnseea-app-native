// Description: Registers OneSignal push subscriptions with the WoWonder API.
import { Platform } from 'react-native';
import {
  LogLevel,
  OneSignal,
  type PushSubscriptionChangedState,
} from 'react-native-onesignal';
import { apiRoutes } from '../../application/constants/route-registry';
import { apiBridge } from '../api/apiBridge';
import { apiConfig } from '../config/env';
import { sessionStorage } from '../storage/sessionStorage';

let initialized = false;
let lastSyncedKey = '';
let syncInFlight: Promise<void> | null = null;

function buildDevicePayload(subscriptionId: string) {
  if (Platform.OS === 'ios') {
    return {
      fetch: 'count_new_messages',
      ios_n_device_id: subscriptionId,
      ios_m_device_id: subscriptionId,
    };
  }

  return {
    fetch: 'count_new_messages',
    android_n_device_id: subscriptionId,
    android_m_device_id: subscriptionId,
  };
}

async function syncPushSubscription(subscriptionId?: string | null) {
  const userId = sessionStorage.getSession()?.userId;
  if (!userId || !subscriptionId) return;

  const syncKey = `${Platform.OS}:${userId}:${subscriptionId}`;
  if (lastSyncedKey === syncKey) return;
  if (syncInFlight) {
    await syncInFlight;
    if (lastSyncedKey === syncKey) return;
  }

  syncInFlight = apiBridge
    .post(apiRoutes.feed.generalData, buildDevicePayload(subscriptionId))
    .then(() => {
      lastSyncedKey = syncKey;
    })
    .catch(error => {
      console.warn('[OneSignal] Could not sync push subscription', error);
    })
    .finally(() => {
      syncInFlight = null;
    });

  await syncInFlight;
}

async function syncCurrentSubscription() {
  const subscriptionId =
    await OneSignal.User.pushSubscription.getIdAsync();
  await syncPushSubscription(subscriptionId);
}

function handleSubscriptionChange(event: PushSubscriptionChangedState) {
  syncPushSubscription(event.current.id).catch(error => {
    console.warn('[OneSignal] Could not handle subscription change', error);
  });
}

export function initializePushNotifications() {
  if (initialized) return;
  initialized = true;

  if (__DEV__) {
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
  }

  OneSignal.initialize(apiConfig.oneSignalAppId);
  OneSignal.User.pushSubscription.addEventListener(
    'change',
    handleSubscriptionChange,
  );

  const userId = sessionStorage.getSession()?.userId;
  if (userId) {
    OneSignal.login(userId);
  }

  OneSignal.Notifications.requestPermission(false).catch(error => {
    console.warn('[OneSignal] Could not request push permission', error);
  });
  syncCurrentSubscription().catch(error => {
    console.warn('[OneSignal] Could not read push subscription', error);
  });
}

export function identifyPushUser(userId: string) {
  if (!initialized) {
    initializePushNotifications();
  }

  OneSignal.login(userId);
  syncCurrentSubscription().catch(error => {
    console.warn('[OneSignal] Could not sync identified push user', error);
  });
}

export function logoutPushUser() {
  lastSyncedKey = '';
  OneSignal.logout();
}
