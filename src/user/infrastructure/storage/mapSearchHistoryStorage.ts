// Description: Keeps each user's recent map searches and opened places on this device.
import { createMMKV } from 'react-native-mmkv';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type {
  MapPlacePrediction,
  MapSearchHistoryEntry,
  MapSearchHistoryInput,
  NearbyPlace,
} from '../../domain/types/user.types';
import { normalizeMapSearchText } from '../../application/utils/mapSearchRanking';

export const MAP_SEARCH_HISTORY_LIMIT = 20;
const MAX_QUERY_LENGTH = 160;

const storage = createMMKV({ id: 'vnseea-map-search-history' });

function getStorageKey() {
  const userId = sessionStorage.getSession()?.userId;
  return userId ? `recent:${userId}` : null;
}

// Keep only what is needed to reopen a place. Ratings, photos, reviews and
// distance go stale and would bloat storage.
function snapshotPage(page: NearbyPlace): NearbyPlace {
  return {
    id: page.id,
    pageId: page.pageId,
    kind: page.kind,
    source: page.source,
    placeId: page.placeId,
    name: page.name,
    username: page.username,
    avatarUrl: page.avatarUrl,
    url: page.url,
    category: page.category,
    location: page.location,
    isPinned: page.isPinned,
    coordinate: page.coordinate,
    types: page.types,
  };
}

function snapshotPrediction(prediction: MapPlacePrediction): MapPlacePrediction {
  return {
    source: 'google',
    placeId: prediction.placeId,
    description: prediction.description,
    mainText: prediction.mainText,
    secondaryText: prediction.secondaryText,
    types: prediction.types,
    lat: prediction.lat,
    lng: prediction.lng,
    icon: prediction.icon,
    iconBackgroundColor: prediction.iconBackgroundColor,
  };
}

function toEntry(
  input: MapSearchHistoryInput,
  savedAt: number,
): MapSearchHistoryEntry | null {
  if (input.kind === 'query') {
    const query = input.query.trim().replace(/\s+/g, ' ');
    const id = normalizeMapSearchText(query);
    if (!id || query.length > MAX_QUERY_LENGTH) return null;
    return { kind: 'query', id, query, savedAt };
  }

  if (input.kind === 'page') {
    if (!input.page.id || !input.page.name) return null;
    return {
      kind: 'page',
      id: input.page.id,
      page: snapshotPage(input.page),
      savedAt,
    };
  }

  const { prediction } = input;
  if (!prediction.placeId || !(prediction.mainText || prediction.description)) {
    return null;
  }
  return {
    kind: 'google',
    id: prediction.placeId,
    prediction: snapshotPrediction(prediction),
    savedAt,
  };
}

function isValidEntry(value: unknown): value is MapSearchHistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  if (typeof entry.id !== 'string' || !entry.id) return false;
  if (!Number.isFinite(Number(entry.savedAt))) return false;

  switch (entry.kind) {
    case 'query':
      return typeof entry.query === 'string' && entry.query.trim().length > 0;
    case 'page': {
      const page = entry.page as Record<string, unknown> | undefined;
      return Boolean(page && typeof page.id === 'string' && page.name);
    }
    case 'google': {
      const prediction = entry.prediction as Record<string, unknown> | undefined;
      return Boolean(
        prediction &&
          typeof prediction.placeId === 'string' &&
          (prediction.mainText || prediction.description),
      );
    }
    default:
      return false;
  }
}

function writeEntries(key: string, entries: MapSearchHistoryEntry[]) {
  try {
    storage.set(key, JSON.stringify(entries));
  } catch {
    // Search history is a convenience; a storage failure must not block search.
  }
}

export function mapSearchHistoryEntryKey(
  entry: Pick<MapSearchHistoryEntry, 'kind' | 'id'>,
) {
  return `${entry.kind}:${entry.id}`;
}

export function readMapSearchHistory(): MapSearchHistoryEntry[] {
  const key = getStorageKey();
  if (!key) return [];

  try {
    const raw = storage.getString(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry).slice(0, MAP_SEARCH_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

/** Moves the entry to the top of the history and returns the updated list. */
export function addMapSearchHistoryEntry(
  input: MapSearchHistoryInput,
): MapSearchHistoryEntry[] {
  const key = getStorageKey();
  if (!key) return [];

  const entry = toEntry(input, Date.now());
  const current = readMapSearchHistory();
  if (!entry) return current;

  const entryKey = mapSearchHistoryEntryKey(entry);
  const next = [
    entry,
    ...current.filter(item => mapSearchHistoryEntryKey(item) !== entryKey),
  ].slice(0, MAP_SEARCH_HISTORY_LIMIT);
  writeEntries(key, next);
  return next;
}

export function removeMapSearchHistoryEntry(
  target: Pick<MapSearchHistoryEntry, 'kind' | 'id'>,
): MapSearchHistoryEntry[] {
  const key = getStorageKey();
  if (!key) return [];

  const targetKey = mapSearchHistoryEntryKey(target);
  const next = readMapSearchHistory().filter(
    item => mapSearchHistoryEntryKey(item) !== targetKey,
  );
  writeEntries(key, next);
  return next;
}

export function clearMapSearchHistory(): MapSearchHistoryEntry[] {
  const key = getStorageKey();
  if (key) storage.remove(key);
  return [];
}
