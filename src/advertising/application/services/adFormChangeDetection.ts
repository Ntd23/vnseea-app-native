// Description: Compares editable ad drafts without treating formatting-only differences as changes.

export type ComparableAdDraft = {
  name: string;
  website: string;
  headline: string;
  description: string;
  audienceList: string;
  gender: string;
  bidding: string;
  appears: string;
  budget: string;
  media?: string;
  location: string;
  startDate: string;
  endDate: string;
};

function normalizeText(value: string | undefined) {
  return String(value ?? '').trim();
}

function normalizeAudience(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .sort()
    .join(',');
}

function normalizeBudget(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '0';

  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? String(numeric) : trimmed;
}

export function hasAdDraftChanges(
  initial: ComparableAdDraft,
  current: ComparableAdDraft,
) {
  return (
    normalizeText(initial.name) !== normalizeText(current.name) ||
    normalizeText(initial.website) !== normalizeText(current.website) ||
    normalizeText(initial.headline) !== normalizeText(current.headline) ||
    normalizeText(initial.description) !== normalizeText(current.description) ||
    normalizeAudience(initial.audienceList) !==
      normalizeAudience(current.audienceList) ||
    normalizeText(initial.gender) !== normalizeText(current.gender) ||
    normalizeText(initial.bidding) !== normalizeText(current.bidding) ||
    normalizeText(initial.appears) !== normalizeText(current.appears) ||
    normalizeBudget(initial.budget) !== normalizeBudget(current.budget) ||
    normalizeText(initial.media) !== normalizeText(current.media) ||
    normalizeText(initial.location) !== normalizeText(current.location) ||
    normalizeText(initial.startDate) !== normalizeText(current.startDate) ||
    normalizeText(initial.endDate) !== normalizeText(current.endDate)
  );
}
