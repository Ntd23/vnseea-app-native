import { useSyncExternalStore } from 'react';
import type { NotificationsItem } from '../../../notifications/domain/types/notifications.types';
import {
  buildOrderNotificationBadgeSnapshot,
  collectOrderNotificationRecords,
  type OrderNotificationBadgeSnapshot,
  type OrderNotificationMode,
  type OrderNotificationRecord,
} from './orderNotificationBadges';

const listeners = new Set<() => void>();
const pendingReadIds = new Set<string>();
let ownerId: string | undefined;
let records: OrderNotificationRecord[] = [];
let snapshot = buildOrderNotificationBadgeSnapshot(records);

function emit() {
  snapshot = buildOrderNotificationBadgeSnapshot(records);
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setOrderNotificationBadgeOwner(nextOwnerId?: string) {
  if (ownerId === nextOwnerId) return;

  ownerId = nextOwnerId;
  records = [];
  pendingReadIds.clear();
  emit();
}

export function replaceOrderNotificationBadges(
  notifications: NotificationsItem[],
  nextOwnerId?: string,
) {
  if (ownerId !== nextOwnerId) {
    ownerId = nextOwnerId;
    pendingReadIds.clear();
  }

  records = collectOrderNotificationRecords(notifications).map(record =>
    pendingReadIds.has(record.id) ? { ...record, seen: true } : record,
  );
  emit();
}

export function beginMarkOrderNotificationModeRead(
  mode: OrderNotificationMode,
) {
  const targets = records.filter(record => record.mode === mode && !record.seen);
  if (targets.length === 0) return [];

  targets.forEach(record => pendingReadIds.add(record.id));
  const targetIds = new Set(targets.map(record => record.id));
  records = records.map(record =>
    targetIds.has(record.id) ? { ...record, seen: true } : record,
  );
  emit();
  return targets;
}

export function settleOrderNotificationModeRead(
  attemptedRecords: OrderNotificationRecord[],
  failedIds: Set<string>,
) {
  attemptedRecords.forEach(record => pendingReadIds.delete(record.id));
  if (failedIds.size === 0) return;

  const failedById = new Map(
    attemptedRecords
      .filter(record => failedIds.has(record.id))
      .map(record => [record.id, { ...record, seen: false }]),
  );
  const currentIds = new Set(records.map(record => record.id));

  records = records.map(record => failedById.get(record.id) ?? record);
  failedById.forEach((record, id) => {
    if (!currentIds.has(id)) records.push(record);
  });
  emit();
}

export function getOrderNotificationBadgeSnapshot() {
  return snapshot;
}

export function useOrderNotificationBadges(): OrderNotificationBadgeSnapshot {
  return useSyncExternalStore(
    subscribe,
    getOrderNotificationBadgeSnapshot,
    getOrderNotificationBadgeSnapshot,
  );
}
