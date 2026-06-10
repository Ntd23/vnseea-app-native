// Description: Requests Android call-related permissions when the app starts.
import {
  Linking,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import type { Permission } from 'react-native';

let requestedInThisProcess = false;

type FullScreenIntentModule = {
  canUseFullScreenIntent?: () => Promise<boolean>;
  openFullScreenIntentSettings?: () => Promise<boolean>;
};

function androidApiLevel() {
  return typeof Platform.Version === 'number'
    ? Platform.Version
    : Number.parseInt(String(Platform.Version), 10) || 0;
}

async function requestRuntimePermissions() {
  if (Platform.OS !== 'android') return;

  const apiLevel = androidApiLevel();
  const permissions: Permission[] = [
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    PermissionsAndroid.PERMISSIONS.CAMERA,
  ];

  if (apiLevel >= 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  if (apiLevel >= 31) {
    permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
  }

  const missingPermissions: Permission[] = [];
  for (const permission of permissions) {
    const granted = await PermissionsAndroid.check(permission);
    if (!granted) {
      missingPermissions.push(permission);
    }
  }

  if (missingPermissions.length === 0) return;

  await PermissionsAndroid.requestMultiple(missingPermissions);
}

async function ensureFullScreenIntentPermission() {
  if (Platform.OS !== 'android' || androidApiLevel() < 34) return;

  const module = NativeModules.VnseeaCallIntent as
    | FullScreenIntentModule
    | undefined;
  if (!module?.canUseFullScreenIntent) return;

  const canUseFullScreenIntent = await module.canUseFullScreenIntent();
  if (canUseFullScreenIntent) return;

  await module.openFullScreenIntentSettings?.();
}

async function openNotificationSettingsIfBlocked() {
  if (Platform.OS !== 'android' || androidApiLevel() < 33) return;

  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  if (granted) return;

  await Linking.openSettings();
}

export async function requestCallStartupPermissions() {
  if (requestedInThisProcess || Platform.OS !== 'android') return;
  requestedInThisProcess = true;

  try {
    await requestRuntimePermissions();
    await ensureFullScreenIntentPermission();
    await openNotificationSettingsIfBlocked();
  } catch (error) {
    console.warn('[CallPermissions] Could not request startup permissions', error);
  }
}
