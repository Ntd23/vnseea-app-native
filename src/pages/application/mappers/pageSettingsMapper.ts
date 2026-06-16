// Description: Pure helpers for working with PageSettingsDraft —
// defaults, equality, and validation. Kept mapper-style (no React,
// no MMKV) so it can be unit-tested without a renderer and reused
// from anywhere in the bounded context.

import type {
  PageCtaSettings,
  PageCtaTarget,
  PagePublicSignals,
  PageSettingsDraft,
} from '../../domain/types/pageSettings.types';

export function defaultCta(): PageCtaSettings {
  return {
    ctaTarget: 'none',
    ctaUrl: '',
    ctaPhone: '',
  };
}

export function defaultSignals(): PagePublicSignals {
  return {
    messageButtonEnabled: true,
    showFollowerCount: true,
    showLikeCount: true,
    showPublicWebsite: true,
    suggestRelatedFanpages: false,
  };
}

export function defaultDraft(): PageSettingsDraft {
  return {
    cta: defaultCta(),
    signals: defaultSignals(),
    updatedAt: 0,
  };
}

const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export function isValidUrl(value: string): boolean {
  if (!value) return true; // empty is allowed — caller decides if required
  return URL_PATTERN.test(value.trim());
}

const PHONE_PATTERN = /^[0-9+()\-\s]{6,20}$/;

export function isValidPhone(value: string): boolean {
  if (!value) return true;
  return PHONE_PATTERN.test(value.trim());
}

export function ctaRequiresUrl(target: PageCtaTarget): boolean {
  return target === 'catalog' || target === 'book';
}

export function ctaRequiresPhone(target: PageCtaTarget): boolean {
  return target === 'call';
}

export function isCtaTarget(value: unknown): value is PageCtaTarget {
  return (
    value === 'none' ||
    value === 'message' ||
    value === 'follow' ||
    value === 'catalog' ||
    value === 'book' ||
    value === 'call'
  );
}

export function draftsEqual(a: PageSettingsDraft, b: PageSettingsDraft): boolean {
  if (a === b) return true;
  if (a.cta.ctaTarget !== b.cta.ctaTarget) return false;
  if (a.cta.ctaUrl !== b.cta.ctaUrl) return false;
  if (a.cta.ctaPhone !== b.cta.ctaPhone) return false;
  const sa = a.signals;
  const sb = b.signals;
  return (
    sa.messageButtonEnabled === sb.messageButtonEnabled &&
    sa.showFollowerCount === sb.showFollowerCount &&
    sa.showLikeCount === sb.showLikeCount &&
    sa.showPublicWebsite === sb.showPublicWebsite &&
    sa.suggestRelatedFanpages === sb.suggestRelatedFanpages
  );
}
