// Description: Keeps the last accepted map fix so the map can open at a useful region immediately.
import { createMMKV } from 'react-native-mmkv';
import { sessionStorage } from './sessionStorage';

export type PersistedMapLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
};

const MAX_PERSISTED_LOCATION_AGE_MS = 24 * 60 * 60 * 1000;
const storage = createMMKV({ id: 'vnseea-map-location' });

function getStorageKey() {
  const userId = sessionStorage.getSession()?.userId;
  return userId ? `last_fix:${userId}` : null;
}

function isValidLocation(value: unknown): value is PersistedMapLocation {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);
  const timestamp = Number(record.timestamp);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    Number.isFinite(timestamp)
  );
}

export function readLastMapLocation(): PersistedMapLocation | null {
  const key = getStorageKey();
  if (!key) return null;

  try {
    const raw = storage.getString(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidLocation(parsed)) {
      storage.remove(key);
      return null;
    }

    if (Date.now() - parsed.timestamp > MAX_PERSISTED_LOCATION_AGE_MS) {
      storage.remove(key);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveLastMapLocation(location: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}) {
  const key = getStorageKey();
  if (!key) return;

  const value: PersistedMapLocation = {
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    accuracy: Number.isFinite(Number(location.accuracy))
      ? Number(location.accuracy)
      : undefined,
    timestamp: Number.isFinite(Number(location.timestamp))
      ? Number(location.timestamp)
      : Date.now(),
  };
  if (!isValidLocation(value)) return;

  try {
    storage.set(key, JSON.stringify(value));
  } catch {
    // A storage failure must never block map rendering or GPS updates.
  }
}

export function clearLastMapLocation() {
  const key = getStorageKey();
  if (key) storage.remove(key);
}
