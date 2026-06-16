// Description: Types for the Page Settings bounded context — CTA and
// Public Signals. Mirrors the i18n + storage pattern used elsewhere
// (auth, notifications). The shape is intentionally narrow: a small
// CTA record and a small flags record, both serialisable to JSON so
// they can ride through MMKV unchanged.

/**
 * Where tapping the CTA button should send the user.
 *
 * The numeric values match WoWonder's `$wo['call_action']` map defined
 * in `phtml/assets/languages/extra/english.php` so that when the
 * backend integration lands we can map `ctaTarget -> call_action_type`
 * 1:1 without a translation table.
 */
export type PageCtaTarget = 'none' | 'message' | 'follow' | 'catalog' | 'book' | 'call';

export interface PageCtaSettings {
  ctaTarget: PageCtaTarget;
  ctaUrl: string;
  ctaPhone: string;
}

export interface PagePublicSignals {
  messageButtonEnabled: boolean;
  showFollowerCount: boolean;
  showLikeCount: boolean;
  showPublicWebsite: boolean;
  suggestRelatedFanpages: boolean;
}

export interface PageSettingsDraft {
  cta: PageCtaSettings;
  signals: PagePublicSignals;
  updatedAt: number;
}

export const CTA_TARGETS: ReadonlyArray<PageCtaTarget> = [
  'none',
  'message',
  'follow',
  'catalog',
  'book',
  'call',
];
