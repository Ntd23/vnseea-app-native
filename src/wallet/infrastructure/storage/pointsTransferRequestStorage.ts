import {createMMKV} from 'react-native-mmkv';

type Storage = {
  getString(key: string): string | undefined;
  set(key: string, value: string): unknown;
  remove(key: string): unknown;
};

export type PendingPointsTransfer = {
  senderId: number;
  recipientUserId: number;
  points: number;
  note: string;
  requestId: string;
};

const STORAGE_KEY = 'points-transfer:pending';

export function generatePointsTransferRequestId() {
  const timestamp = Date.now().toString(36);
  const random = `${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`.replace(/[^a-z0-9]/g, '');
  return `pt_${timestamp}_${random}`.slice(0, 80).padEnd(20, '0');
}

export function createPendingPointsTransferManager(
  storage: Storage,
  idFactory = generatePointsTransferRequestId,
) {
  const peek = (): PendingPointsTransfer | null => {
    const value = storage.getString(STORAGE_KEY);
    if (!value) return null;
    try {
      const parsed = JSON.parse(value) as PendingPointsTransfer;
      return parsed && typeof parsed.requestId === 'string' ? parsed : null;
    } catch {
      storage.remove(STORAGE_KEY);
      return null;
    }
  };

  return {
    peek,
    getOrCreate(input: Omit<PendingPointsTransfer, 'requestId'>) {
      const normalized = {...input, note: input.note.trim()};
      const existing = peek();
      if (
        existing &&
        existing.senderId === normalized.senderId &&
        existing.recipientUserId === normalized.recipientUserId &&
        existing.points === normalized.points &&
        existing.note === normalized.note
      ) {
        return existing.requestId;
      }
      const pending: PendingPointsTransfer = {
        ...normalized,
        requestId: idFactory(),
      };
      storage.set(STORAGE_KEY, JSON.stringify(pending));
      return pending.requestId;
    },
    clear(requestId?: string) {
      const existing = peek();
      if (!existing || (requestId && existing.requestId !== requestId)) return;
      storage.remove(STORAGE_KEY);
    },
  };
}

const storage = createMMKV({id: 'vnseea-points-transfer'});
export const pendingPointsTransferRequestStorage =
  createPendingPointsTransferManager(storage);
