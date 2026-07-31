import type { StoryItem } from '../../domain/types/stories.types';

export function getStoryAdRotationId(story: StoryItem) {
  return String(story.adId || story.id).trim();
}

export function dedupeStoryAds(stories: StoryItem[]) {
  const byId = new Map<string, StoryItem>();

  for (const story of stories) {
    if (!story.isAd || story.media.length === 0) continue;
    const id = getStoryAdRotationId(story);
    if (!id || byId.has(id)) continue;
    byId.set(id, story);
  }

  return Array.from(byId.values());
}

/**
 * Unseen ads win first. Once the current inventory has all been seen, the
 * least-recently viewed ad starts the next cycle, avoiding an immediate repeat
 * whenever more than one ad is available.
 */
export function selectNextStoryAd(
  stories: StoryItem[],
  viewedAdIdsOldestFirst: string[],
) {
  const ads = dedupeStoryAds(stories);
  if (ads.length === 0) return null;

  const viewedPosition = new Map<string, number>();
  viewedAdIdsOldestFirst.forEach((id, index) => {
    const normalizedId = String(id).trim();
    if (normalizedId) viewedPosition.set(normalizedId, index);
  });

  const unseen = ads.find(ad => !viewedPosition.has(getStoryAdRotationId(ad)));
  if (unseen) return unseen;

  return [...ads].sort((left, right) => {
    const leftPosition =
      viewedPosition.get(getStoryAdRotationId(left)) ?? Number.MAX_SAFE_INTEGER;
    const rightPosition =
      viewedPosition.get(getStoryAdRotationId(right)) ?? Number.MAX_SAFE_INTEGER;
    return leftPosition - rightPosition;
  })[0];
}

/** Inserts one viewer-only ad directly after the story group the user opened. */
export function injectStoryAdAfterIndex(
  stories: StoryItem[],
  ad: StoryItem | null,
  storyIndex: number,
) {
  const organicStories = stories.filter(story => !story.isAd);
  if (!ad || organicStories.length === 0) return organicStories;

  const clampedIndex = Math.max(
    0,
    Math.min(Math.floor(storyIndex), organicStories.length - 1),
  );
  const insertAt = clampedIndex + 1;

  return [
    ...organicStories.slice(0, insertAt),
    ad,
    ...organicStories.slice(insertAt),
  ];
}
