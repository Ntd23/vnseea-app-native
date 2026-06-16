// Description: ViewModel for the Page Settings screen. Owns the
// CTA + Public Signals state, persists changes through MMKV, and
// exposes a small action surface (set CTA, toggle signal, save,
// reset). Kept as a plain React hook so it can be swapped behind a
// real repository once the backend endpoint ships — see plan
// "Backend Recommendations".

import { useCallback, useEffect, useMemo, useState } from 'react';
import { pageSettingsStorage } from '../settingsStorage/pageSettingsStorage';
import {
  ctaRequiresPhone,
  ctaRequiresUrl,
  defaultDraft,
  draftsEqual,
  isValidPhone,
  isValidUrl,
} from '../mappers/pageSettingsMapper';
import type {
  PageCtaSettings,
  PageCtaTarget,
  PagePublicSignals,
  PageSettingsDraft,
} from '../../domain/types/pageSettings.types';

export interface UsePageSettingsViewModel {
  draft: PageSettingsDraft;
  savedDraft: PageSettingsDraft;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  urlError: string | null;
  phoneError: string | null;

  setCtaTarget: (target: PageCtaTarget) => void;
  setCtaUrl: (url: string) => void;
  setCtaPhone: (phone: string) => void;
  toggleSignal: (key: keyof PagePublicSignals, value: boolean) => void;

  save: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

export function usePageSettingsViewModel(
  pageId: string,
  initialDraft?: PageSettingsDraft,
): UsePageSettingsViewModel {
  // Read whatever is already on disk so the form rehydrates on
  // remount. Falls back to a hard default if nothing is stored.
  const [savedDraft, setSavedDraft] = useState<PageSettingsDraft>(() => {
    if (initialDraft) return initialDraft;
    const stored = pageSettingsStorage.get(pageId);
    return stored ?? defaultDraft();
  });

  const [draft, setDraft] = useState<PageSettingsDraft>(savedDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-hydrate when pageId changes (e.g. navigating between two
  // different pages through the same screen instance).
  useEffect(() => {
    const stored = pageSettingsStorage.get(pageId);
    const next = stored ?? defaultDraft();
    setSavedDraft(next);
    setDraft(next);
    setError(null);
  }, [pageId]);

  // Validation runs on every render — cheap, and keeps the form
  // honest as the user types.
  const urlError = useMemo<string | null>(() => {
    if (!ctaRequiresUrl(draft.cta.ctaTarget)) return null;
    if (!draft.cta.ctaUrl.trim()) return 'urlRequired';
    if (!isValidUrl(draft.cta.ctaUrl)) return 'invalidUrl';
    return null;
  }, [draft.cta.ctaTarget, draft.cta.ctaUrl]);

  const phoneError = useMemo<string | null>(() => {
    if (!ctaRequiresPhone(draft.cta.ctaTarget)) return null;
    if (!draft.cta.ctaPhone.trim()) return 'phoneRequired';
    if (!isValidPhone(draft.cta.ctaPhone)) return 'invalidPhone';
    return null;
  }, [draft.cta.ctaTarget, draft.cta.ctaPhone]);

  const isDirty = !draftsEqual(draft, savedDraft);

  const setCtaTarget = useCallback((target: PageCtaTarget) => {
    setDraft(prev => {
      const cta: PageCtaSettings = {
        ...prev.cta,
        ctaTarget: target,
      };
      // When the user picks a different target, drop inputs that no
      // longer apply so we don't persist stale values (e.g. a phone
      // number after switching from "call" to "message").
      if (!ctaRequiresUrl(target)) cta.ctaUrl = '';
      if (!ctaRequiresPhone(target)) cta.ctaPhone = '';
      return { ...prev, cta };
    });
  }, []);

  const setCtaUrl = useCallback((url: string) => {
    setDraft(prev => ({
      ...prev,
      cta: { ...prev.cta, ctaUrl: url },
    }));
  }, []);

  const setCtaPhone = useCallback((phone: string) => {
    setDraft(prev => ({
      ...prev,
      cta: { ...prev.cta, ctaPhone: phone },
    }));
  }, []);

  const toggleSignal = useCallback(
    (key: keyof PagePublicSignals, value: boolean) => {
      setDraft(prev => ({
        ...prev,
        signals: { ...prev.signals, [key]: value },
      }));
    },
    [],
  );

  const save = useCallback(async () => {
    if (urlError || phoneError) {
      setError('saveError');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      // Simulate a small async tick so the UI can show the saving
      // indicator. Real persistence is synchronous (MMKV), but
      // keeping the contract async means we can swap in a network
      // call later without changing the caller.
      await Promise.resolve();
      const next: PageSettingsDraft = {
        ...draft,
        updatedAt: Date.now(),
      };
      pageSettingsStorage.set(pageId, next);
      setSavedDraft(next);
      setDraft(next);
    } catch {
      setError('saveError');
    } finally {
      setIsSaving(false);
    }
  }, [draft, pageId, urlError, phoneError]);

  const reset = useCallback(() => {
    setDraft(savedDraft);
    setError(null);
  }, [savedDraft]);

  const clearError = useCallback(() => setError(null), []);

  return {
    draft,
    savedDraft,
    isDirty,
    isSaving,
    error,
    urlError,
    phoneError,
    setCtaTarget,
    setCtaUrl,
    setCtaPhone,
    toggleSignal,
    save,
    reset,
    clearError,
  };
}
