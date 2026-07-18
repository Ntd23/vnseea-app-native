// Description: Publishes foreground push receipts to notification UI consumers.

export type ForegroundPushPayload = {
  id: string;
  title?: string;
  body: string;
  additionalData?: Record<string, unknown>;
  receivedAt: number;
};

type ForegroundPushListener = (payload: ForegroundPushPayload) => void;

const listeners = new Set<ForegroundPushListener>();

export const foregroundPushEvents = {
  emit(payload: ForegroundPushPayload) {
    listeners.forEach(listener => listener(payload));
  },

  subscribe(listener: ForegroundPushListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
