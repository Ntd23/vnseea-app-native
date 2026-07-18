// Description: Keeps Android's native MessagingStyle identity in sync with the active VNSEEA user.
import { NativeModules, Platform } from 'react-native';

type MessageNotificationIdentity = {
  name?: string;
  username?: string;
  avatarUrl?: string;
} | null;

type MessageNotificationNativeModule = {
  setCurrentUser?: (name: string, avatarUrl: string) => void;
  clearCurrentUser?: () => void;
};

function getNativeModule(): MessageNotificationNativeModule | null {
  if (Platform.OS !== 'android') return null;
  return (
    (NativeModules.VnseeaMessageNotification as
      | MessageNotificationNativeModule
      | undefined) ?? null
  );
}

export function syncMessageNotificationIdentity(
  profile: MessageNotificationIdentity,
) {
  const nativeModule = getNativeModule();
  if (!nativeModule?.setCurrentUser) return;

  nativeModule.setCurrentUser(
    profile?.name || profile?.username || '',
    profile?.avatarUrl || '',
  );
}

export function clearMessageNotificationIdentity() {
  getNativeModule()?.clearCurrentUser?.();
}
