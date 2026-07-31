import type { StoryItem } from '../../../domain/types/stories.types';
import {
  dedupeStoryAds,
  injectStoryAdAfterIndex,
  selectNextStoryAd,
} from '../storyAdPlayback';

function makeStory(id: string, options: { adId?: string; isAd?: boolean } = {}) {
  const isAd = options.isAd ?? false;
  return {
    id,
    publisher: {
      userId: isAd ? `ad-user-${id}` : `user-${id}`,
      username: `publisher-${id}`,
      name: `Publisher ${id}`,
    },
    postedAt: 1_700_000_000,
    expiresAt: isAd ? 0 : 1_800_000_000,
    media: [
      {
        id: `media-${id}`,
        type: 'image',
        url: `https://cdn.example/${id}.jpg`,
        storyId: id,
        postedAt: 1_700_000_000,
      },
    ],
    isOwner: false,
    isViewed: false,
    hasUnseen: true,
    myReaction: null,
    reactionCount: 0,
    isAd,
    adId: options.adId,
  } satisfies StoryItem;
}

describe('story ad playback rotation', () => {
  const adA = makeStory('ad-story-a', { isAd: true, adId: 'a' });
  const adB = makeStory('ad-story-b', { isAd: true, adId: 'b' });
  const adC = makeStory('ad-story-c', { isAd: true, adId: 'c' });

  it('uses every unseen ad before starting the next cycle', () => {
    expect(selectNextStoryAd([adA, adB, adC], [])?.adId).toBe('a');
    expect(selectNextStoryAd([adA, adB, adC], ['a'])?.adId).toBe('b');
    expect(selectNextStoryAd([adA, adB, adC], ['a', 'b'])?.adId).toBe('c');
    expect(selectNextStoryAd([adA, adB, adC], ['a', 'b', 'c'])?.adId).toBe(
      'a',
    );
  });

  it('continues with the least-recently viewed ad after the cycle wraps', () => {
    expect(
      selectNextStoryAd([adA, adB, adC], ['b', 'c', 'a'])?.adId,
    ).toBe('b');
  });

  it('deduplicates candidates by ad id and falls back to story id', () => {
    const duplicateA = makeStory('duplicate-a', { isAd: true, adId: 'a' });
    const fallback = makeStory('fallback-ad', { isAd: true });

    expect(dedupeStoryAds([adA, duplicateA, fallback])).toEqual([
      adA,
      fallback,
    ]);
  });

  it('injects only the selected ad after the story the user opened', () => {
    const first = makeStory('first');
    const second = makeStory('second');
    const third = makeStory('third');

    expect(injectStoryAdAfterIndex([first, second, third], adA, 1)).toEqual([
      first,
      second,
      adA,
      third,
    ]);
  });
});
