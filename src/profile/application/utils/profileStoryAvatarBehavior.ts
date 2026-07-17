import type {
  StoryItem,
  StoryMedia,
} from '../../../stories/domain/types/stories.types';

const PROFILE_STORY_MAX_AGE_SECONDS = 24 * 60 * 60;

function isFreshProfileStory(story: StoryItem, nowSeconds: number) {
  const postedAt = story.postedAt ?? 0;
  if (postedAt <= 0) return false;
  if (nowSeconds - postedAt > PROFILE_STORY_MAX_AGE_SECONDS) return false;
  if (story.expiresAt > 0 && story.expiresAt <= nowSeconds) return false;
  return true;
}

export function mergeStoriesForProfile(
  stories: StoryItem[],
  targetUserId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): StoryItem | null {
  const userStories = stories
    .filter(story => String(story.publisher.userId) === String(targetUserId))
    .filter(story => isFreshProfileStory(story, nowSeconds))
    .sort((a, b) => (a.postedAt ?? 0) - (b.postedAt ?? 0));

  if (userStories.length === 0) {
    return null;
  }

  const latestStory = userStories[userStories.length - 1];
  const oldestStory = userStories[0];
  const media: StoryMedia[] = [];

  for (const story of userStories) {
    for (const item of story.media) {
      const segment: StoryMedia = {
        ...item,
        storyId: item.storyId ?? story.id,
        postedAt: item.postedAt ?? story.postedAt,
      };
      const exists = media.some(
        current =>
          current.url === segment.url &&
          (current.storyId ?? '') === (segment.storyId ?? ''),
      );
      if (!exists) {
        media.push(segment);
      }
    }
  }

  return {
    ...latestStory,
    thumbnailUrl: latestStory.thumbnailUrl ?? oldestStory.thumbnailUrl,
    media,
    isViewed: userStories.every(story => story.isViewed),
    hasUnseen: userStories.some(story => story.hasUnseen && !story.isViewed),
  };
}

export function shouldShowProfileStorySection(input: {
  isOwnProfile: boolean;
  hasStory: boolean;
  isLoading: boolean;
}) {
  return input.isOwnProfile && (input.hasStory || input.isLoading);
}

export type ProfileAvatarViewDestination =
  | { kind: 'post-detail'; postId: string }
  | { kind: 'avatar-viewer' };

export function resolveProfileAvatarViewDestination(input: {
  isOwnProfile: boolean;
  avatarPostId?: string;
}): ProfileAvatarViewDestination {
  const avatarPostId = input.avatarPostId?.trim();
  if (
    !input.isOwnProfile &&
    avatarPostId &&
    /^[1-9][0-9]*$/.test(avatarPostId)
  ) {
    return { kind: 'post-detail', postId: avatarPostId };
  }

  return { kind: 'avatar-viewer' };
}
