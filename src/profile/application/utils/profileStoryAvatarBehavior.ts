import type {
  StoryItem,
  StoryMedia,
} from '../../../stories/domain/types/stories.types';
import { filterActiveStories } from '../../../stories/domain/policies/storyExpiration';

export function mergeStoriesForProfile(
  stories: StoryItem[],
  targetUserId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): StoryItem | null {
  const userStories = filterActiveStories(stories, nowSeconds)
    .filter(story => String(story.publisher.userId) === String(targetUserId))
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
