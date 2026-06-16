// Description: MMKV-backed storage for per-page CTA + Public Signals
// settings. Lives in the application layer (not infrastructure) so
// the ViewModel can import it without dragging in the rest of the
// pages infrastructure — keeps the dependency graph matching the
// DDD layering rule (application may import domain, not vice versa).
//
// Phase note: this is UI-only persistence. When the backend endpoint
// lands (see plan "Backend Recommendations"), we'll mirror writes
// through `apiBridge.post` and keep MMKV as a local cache so the UI
// can stay optimistic.

import { createMMKV } from 'react-native-mmkv';
import type { PageSettingsDraft } from '../../domain/types/pageSettings.types';

const STORAGE_ID = 'vnseea-page-settings';

const storage = createMMKV({ id: STORAGE_ID });

function makeKey(pageId: string): string {
  return `page:${pageId}`;
}

function isPageSettingsDraft(value: unknown): value is PageSettingsDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Record<string, unknown>;
  if (!draft.cta || typeof draft.cta !== 'object') return false;
  if (!draft.signals || typeof draft.signals !== 'object') return false;
  return typeof draft.updatedAt === 'number';
}

export const pageSettingsStorage = {
  get(pageId: string): PageSettingsDraft | null {
    if (!pageId) return null;
    const raw = storage.getString(makeKey(pageId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return isPageSettingsDraft(parsed) ? parsed : null;
    } catch {
      // Corrupt JSON — drop it so the next save starts clean.
      storage.remove(makeKey(pageId));
      return null;
    }
  },

  set(pageId: string, draft: PageSettingsDraft): void {
    if (!pageId) return;
    storage.set(makeKey(pageId), JSON.stringify(draft));
  },

  clear(pageId: string): void {
    if (!pageId) return;
    storage.remove(makeKey(pageId));
  },
};
