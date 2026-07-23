import type { StoryItem } from '../../types/stories.types';
import {
  filterActiveStories,
  getStoryActiveUntil,
  isStoryActiveWithin24Hours,
  STORY_MAX_AGE_SECONDS,
} from '../storyExpiration';

const NOW = 2_000_000;

function story(
  id: string,
  postedAt: number,
  options: {
    expiresAt?: number;
    mediaPostedAt?: number[];
  } = {},
): StoryItem {
  return {
    id,
    publisher: {
      userId: `user-${id}`,
      username: `user-${id}`,
      name: `User ${id}`,
    },
    postedAt,
    expiresAt: options.expiresAt ?? 0,
    media: (options.mediaPostedAt ?? [postedAt]).map((timestamp, index) => ({
      id: `${id}-media-${index}`,
      type: 'image',
      url: `https://example.com/${id}-${index}.jpg`,
      postedAt: timestamp,
    })),
    isOwner: false,
    isViewed: false,
    hasUnseen: true,
    myReaction: null,
    reactionCount: 0,
  };
}

describe('story 24-hour visibility policy', () => {
  it('keeps a story up to the 24-hour boundary', () => {
    expect(
      isStoryActiveWithin24Hours(
        story('boundary', NOW - STORY_MAX_AGE_SECONDS),
        NOW,
      ),
    ).toBe(true);
  });

  it('removes stories older than 24 hours or explicitly expired', () => {
    expect(
      isStoryActiveWithin24Hours(
        story('old', NOW - STORY_MAX_AGE_SECONDS - 1),
        NOW,
      ),
    ).toBe(false);
    expect(
      isStoryActiveWithin24Hours(
        story('expired', NOW - 60, { expiresAt: NOW }),
        NOW,
      ),
    ).toBe(false);
  });

  it('removes expired segments from an otherwise active publisher bubble', () => {
    const active = filterActiveStories(
      [
        story('mixed', NOW - 60, {
          mediaPostedAt: [NOW - STORY_MAX_AGE_SECONDS - 1, NOW - 30],
        }),
      ],
      NOW,
    );

    expect(active).toHaveLength(1);
    expect(active[0].media.map(item => item.id)).toEqual(['mixed-media-1']);
  });

  it('schedules the next cleanup from the oldest active segment', () => {
    const mixedStory = story('timer', NOW - 30, {
      mediaPostedAt: [NOW - 300, NOW - 20],
    });

    expect(getStoryActiveUntil(mixedStory)).toBe(
      NOW - 300 + STORY_MAX_AGE_SECONDS,
    );
  });
});
