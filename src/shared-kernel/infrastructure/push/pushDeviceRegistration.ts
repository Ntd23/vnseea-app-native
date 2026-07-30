import { AppState, Platform } from 'react-native';
import { apiRoutes } from '../../application/constants/route-registry';
import { apiBridge } from '../api/apiBridge';
import { sessionStorage } from '../storage/sessionStorage';
import {
  pushInstallationStorage,
  type ApnsEnvironment,
  type CachedPushToken,
  type PendingPushInstallationRelease,
  type PushProvider,
} from './pushInstallationStorage';

type CachePushTokenInput = {
  provider: PushProvider;
  token: string;
  apnsEnvironment?: ApnsEnvironment;
};

type CachePushTokenOptions = {
  forceSync?: boolean;
};

const RETRY_DELAYS_MS = [2_000, 10_000, 60_000] as const;

let workQueue: Promise<void> = Promise.resolve();
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
let lifecycleInitialized = false;

function platformForToken(token: CachedPushToken) {
  return token.provider === 'apns_voip' || Platform.OS === 'ios'
    ? 'ios'
    : 'android';
}

function clearRetryTimer() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleRetry() {
  if (retryTimer) return;
  const delay =
    RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)];
  retryAttempt += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    retryPendingPushDeviceWork().catch(() => undefined);
  }, delay);
}

async function releasePendingInstallation(
  pending: PendingPushInstallationRelease,
) {
  await apiBridge.post(apiRoutes.push.devices, {
    action: 'release',
    installation_id: pending.installationId,
    device_secret: pending.deviceSecret,
  });
  pushInstallationStorage.completeRelease(pending);
}

async function deactivatePendingProviders(userId: string) {
  const providers =
    pushInstallationStorage.getPendingProviderDeactivations();
  if (providers.length === 0) return true;

  const identity = pushInstallationStorage.getOrCreateIdentity();
  let allSucceeded = true;
  for (const provider of providers) {
    try {
      await apiBridge.post(apiRoutes.push.devices, {
        action: 'deactivate',
        installation_id: identity.installationId,
        device_secret: identity.deviceSecret,
        provider,
      });
      pushInstallationStorage.completeProviderDeactivation(provider);
    } catch (error) {
      allSucceeded = false;
      console.warn(
        `[PushDevices] Could not deactivate ${provider} for user ${userId}`,
        error,
      );
    }
  }
  return allSucceeded;
}

async function registerUnsyncedTokens(userId: string) {
  const identity = pushInstallationStorage.getOrCreateIdentity();
  const tokens = pushInstallationStorage.getUnsyncedTokens(userId);
  let allSucceeded = true;

  for (const token of tokens) {
    try {
      await apiBridge.post(apiRoutes.push.devices, {
        action: 'register',
        installation_id: identity.installationId,
        device_secret: identity.deviceSecret,
        platform: platformForToken(token),
        provider: token.provider,
        token: token.token,
        ...(token.provider === 'apns_voip'
          ? { apns_environment: token.apnsEnvironment }
          : {}),
      });
      pushInstallationStorage.markTokenSynced(
        token.provider,
        token.token,
        userId,
      );
    } catch (error) {
      allSucceeded = false;
      console.warn(
        `[PushDevices] Could not register ${token.provider} for user ${userId}`,
        error,
      );
    }
  }
  return allSucceeded;
}

async function runPendingWork() {
  const pendingRelease = pushInstallationStorage.getPendingRelease();
  if (pendingRelease) {
    try {
      await releasePendingInstallation(pendingRelease);
    } catch (error) {
      console.warn('[PushDevices] Could not release installation', error);
      scheduleRetry();
      return;
    }
  }

  const userId = sessionStorage.getSession()?.userId?.trim();
  if (!userId) {
    retryAttempt = 0;
    clearRetryTimer();
    return;
  }

  const deactivated = await deactivatePendingProviders(userId);
  const registered = await registerUnsyncedTokens(userId);
  if (!deactivated || !registered) {
    scheduleRetry();
    return;
  }

  retryAttempt = 0;
  clearRetryTimer();
}

export function retryPendingPushDeviceWork() {
  workQueue = workQueue.then(runPendingWork, runPendingWork);
  return workQueue;
}

export async function cachePushToken(
  input: CachePushTokenInput,
  options: CachePushTokenOptions = {},
) {
  pushInstallationStorage.cacheToken(input);
  if (options.forceSync) {
    pushInstallationStorage.markProviderUnsynced(input.provider);
  }
  const userId = sessionStorage.getSession()?.userId?.trim();
  if (!userId) return;

  await retryPendingPushDeviceWork();
  const currentToken = pushInstallationStorage.getToken(input.provider);
  const isStillPending =
    currentToken?.token === input.token.trim() &&
    pushInstallationStorage
      .getUnsyncedTokens(userId)
      .some(token => token.provider === input.provider);
  if (isStillPending) {
    throw new Error('push_device_registration_pending');
  }
}

export function syncPushDevicesAfterAuthentication() {
  return retryPendingPushDeviceWork();
}

export function stageCurrentPushInstallationRelease() {
  return pushInstallationStorage.stageRelease();
}

export function completeCurrentPushInstallationRelease(
  pending: PendingPushInstallationRelease,
) {
  pushInstallationStorage.completeRelease(pending);
}

export async function deactivatePushProvider(provider: PushProvider) {
  if (!sessionStorage.getSession()?.userId) {
    pushInstallationStorage.discardProvider(provider);
    return;
  }
  pushInstallationStorage.stageProviderDeactivation(provider);
  await retryPendingPushDeviceWork();
}

export function currentApnsEnvironment(): ApnsEnvironment {
  return __DEV__ ? 'sandbox' : 'production';
}

export function initializePushDeviceRegistrationLifecycle() {
  if (lifecycleInitialized) return;
  lifecycleInitialized = true;

  retryPendingPushDeviceWork().catch(() => undefined);
  AppState.addEventListener('change', state => {
    if (state === 'active') {
      retryPendingPushDeviceWork().catch(() => undefined);
    }
  });
}

export function resetPushDeviceRegistrationForTests() {
  clearRetryTimer();
  retryAttempt = 0;
  workQueue = Promise.resolve();
  lifecycleInitialized = false;
}
