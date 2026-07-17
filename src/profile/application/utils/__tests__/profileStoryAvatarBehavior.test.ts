import type {
  StoryItem,
  StoryMedia,
} from '../../../../stories/domain/types/stories.types';
import {
  mergeStoriesForProfile,
  resolveProfileAvatarViewDestination,
  shouldShowProfileStorySection,
} from '../profileStoryAvatarBehavior';

function createStory(
  id: string,
  userId: string,
  postedAt: number,
  media: StoryMedia[],
): StoryItem {
  return {
    id,
    publisher: {
      userId,
      username: `user_${userId}`,
      name: `User ${userId}`,
    },
    postedAt,
    expiresAt: postedAt + 24 * 60 * 60,
    media,
    isOwner: false,
    isViewed: false,
    hasUnseen: true,
    myReaction: null,
    reactionCount: 0,
  };
}

describe('profile story presentation', () => {
  it('never shows the story carousel on another user profile', () => {
    expect(
      shouldShowProfileStorySection({
        isOwnProfile: false,
        hasStory: true,
        isLoading: false,
      }),
    ).toBe(false);
    expect(
      shouldShowProfileStorySection({
        isOwnProfile: false,
        hasStory: false,
        isLoading: true,
      }),
    ).toBe(false);
  });

  it('keeps the story carousel available on the current user profile', () => {
    expect(
      shouldShowProfileStorySection({
        isOwnProfile: true,
        hasStory: true,
        isLoading: false,
      }),
    ).toBe(true);
    expect(
      shouldShowProfileStorySection({
        isOwnProfile: true,
        hasStory: false,
        isLoading: true,
      }),
    ).toBe(true);
  });

  it('merges all active story segments from the target user in time order', () => {
    const nowSeconds = 2_000_000;
    const first = createStory('story-1', '42', nowSeconds - 300, [
      {
        id: 'media-1',
        type: 'image',
        url: 'https://cdn.vnseea.vn/story-1.jpg',
      },
    ]);
    const second = createStory('story-2', '42', nowSeconds - 100, [
      {
        id: 'media-2',
        type: 'video',
        url: 'https://cdn.vnseea.vn/story-2.mp4',
      },
    ]);
    const otherUser = createStory('story-3', '99', nowSeconds - 50, [
      {
        id: 'media-3',
        type: 'image',
        url: 'https://cdn.vnseea.vn/other.jpg',
      },
    ]);

    const merged = mergeStoriesForProfile(
      [second, otherUser, first],
      '42',
      nowSeconds,
    );

    expect(merged?.id).toBe('story-2');
    expect(merged?.media).toEqual([
      expect.objectContaining({
        id: 'media-1',
        storyId: 'story-1',
        postedAt: nowSeconds - 300,
      }),
      expect.objectContaining({
        id: 'media-2',
        storyId: 'story-2',
        postedAt: nowSeconds - 100,
      }),
    ]);
  });
});

describe('profile avatar destination', () => {
  it('opens the avatar post for another user when the post id is available', () => {
    expect(
      resolveProfileAvatarViewDestination({
        isOwnProfile: false,
        avatarPostId: '321',
      }),
    ).toEqual({ kind: 'post-detail', postId: '321' });
  });

  it.each([undefined, '', '0'])('falls back to the image viewer for %p', avatarPostId => {
    expect(
      resolveProfileAvatarViewDestination({
        isOwnProfile: false,
        avatarPostId,
      }),
    ).toEqual({ kind: 'avatar-viewer' });
  });

  it('keeps the current user avatar viewer behavior', () => {
    expect(
      resolveProfileAvatarViewDestination({
        isOwnProfile: true,
        avatarPostId: '321',
      }),
    ).toEqual({ kind: 'avatar-viewer' });
  });
});
