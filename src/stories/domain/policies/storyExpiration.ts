import type { StoryItem } from '../types/stories.types';

export const STORY_MAX_AGE_SECONDS = 24 * 60 * 60;

export function isStoryTimestampWithin24Hours(
  postedAt: number | null | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (
    typeof postedAt !== 'number' ||
    !Number.isFinite(postedAt) ||
    postedAt <= 0
  ) {
    return false;
  }

  return nowSeconds - postedAt <= STORY_MAX_AGE_SECONDS;
}

export function isStoryActiveWithin24Hours(
  story: StoryItem,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (!isStoryTimestampWithin24Hours(story.postedAt, nowSeconds)) {
    return false;
  }

  return !(story.expiresAt > 0 && story.expiresAt <= nowSeconds);
}

export function getStoryActiveUntil(story: StoryItem) {
  if (story.isAd) return Number.POSITIVE_INFINITY;

  const ageLimit = story.postedAt + STORY_MAX_AGE_SECONDS;
  let activeUntil = story.expiresAt > 0
    ? Math.min(ageLimit, story.expiresAt)
    : ageLimit;

  for (const segment of story.media) {
    const segmentPostedAt = segment.postedAt ?? story.postedAt;
    if (segmentPostedAt > 0) {
      activeUntil = Math.min(
        activeUntil,
        segmentPostedAt + STORY_MAX_AGE_SECONDS,
      );
    }
  }

  return activeUntil;
}

export function filterActiveStories(
  stories: StoryItem[],
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const activeStories: StoryItem[] = [];

  for (const story of stories) {
    if (story.isAd) {
      if (story.media.length > 0) activeStories.push(story);
      continue;
    }

    if (!isStoryActiveWithin24Hours(story, nowSeconds)) continue;

    const activeMedia = story.media.filter(segment =>
      isStoryTimestampWithin24Hours(
        segment.postedAt ?? story.postedAt,
        nowSeconds,
      ),
    );
    if (activeMedia.length === 0) continue;

    activeStories.push(
      activeMedia.length === story.media.length
        ? story
        : { ...story, media: activeMedia },
    );
  }

  return activeStories;
}
