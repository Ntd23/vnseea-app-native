// Description: Buffers notification-open events until app navigation subscribes.

export type PushNotificationOpenPayload = {
  notificationId: string;
  title?: string;
  body?: string;
  launchUrl?: string;
  additionalData: Record<string, unknown>;
  openedAt: number;
};

type PushNotificationOpenListener = (
  payload: PushNotificationOpenPayload,
) => void;

const listeners = new Set<PushNotificationOpenListener>();
let bufferedPayload: PushNotificationOpenPayload | null = null;

export const pushNotificationOpenEvents = {
  emit(payload: PushNotificationOpenPayload) {
    if (listeners.size === 0) {
      bufferedPayload = payload;
      return;
    }

    listeners.forEach(listener => listener(payload));
  },

  subscribe(listener: PushNotificationOpenListener) {
    listeners.add(listener);

    if (bufferedPayload) {
      const payload = bufferedPayload;
      bufferedPayload = null;
      listener(payload);
    }

    return () => {
      listeners.delete(listener);
    };
  },
};
