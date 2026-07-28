import {
  hasAdDraftChanges,
  type ComparableAdDraft,
} from '../adFormChangeDetection';

const existingDraft: ComparableAdDraft = {
  name: 'Mini school',
  website: 'https://example.com/legacy link',
  headline: 'Mini school campaign',
  description: 'Existing campaign',
  audienceList: '233, 1',
  gender: 'all',
  bidding: 'clicks',
  appears: 'post',
  budget: '100.00',
  media: 'https://cdn.example/ad.jpg',
  location: 'Vietnam',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
};

describe('hasAdDraftChanges', () => {
  it('treats an untouched legacy campaign as unchanged', () => {
    expect(hasAdDraftChanges(existingDraft, { ...existingDraft })).toBe(false);
  });

  it('ignores formatting-only differences that produce the same payload', () => {
    expect(
      hasAdDraftChanges(existingDraft, {
        ...existingDraft,
        name: ' Mini school ',
        audienceList: '1,233',
        budget: '100',
      }),
    ).toBe(false);
  });

  it('detects a real field or media change', () => {
    expect(
      hasAdDraftChanges(existingDraft, {
        ...existingDraft,
        website: 'https://example.com/new-link',
      }),
    ).toBe(true);

    expect(
      hasAdDraftChanges(existingDraft, {
        ...existingDraft,
        media: 'file:///storage/emulated/0/new-ad.jpg',
      }),
    ).toBe(true);
  });
});
