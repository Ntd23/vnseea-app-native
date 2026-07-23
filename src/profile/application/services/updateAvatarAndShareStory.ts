// Description: Orchestrates an avatar update and automatically shares the same image to Stories.
import type { ApiFile } from '../../../shared-kernel/domain/types/api.types';
import type { AuthUserProfile } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { ProfileMediaUpdateResult } from '../../domain/types/profileMedia.types';
import type {
  CreateStoryDraft,
  CreateStoryResult,
  StoryItem,
} from '../../../stories/domain/types/stories.types';

export type UpdateAvatarAndShareStoryResult = {
  avatarUpdated: boolean;
  storyCreated: boolean;
  profileMedia?: ProfileMediaUpdateResult;
  storyError?: unknown;
};

type Dependencies = {
  uploadAvatar: (file: ApiFile) => Promise<ProfileMediaUpdateResult | null>;
  createStory: (draft: CreateStoryDraft) => Promise<CreateStoryResult>;
  currentUserId?: string;
  currentUserProfile?: AuthUserProfile | null;
  emitStory: (story: StoryItem) => void;
  now?: () => number;
};

export function buildAvatarUploadFile(
  avatarUri: string,
  timestamp: number,
): ApiFile {
  return {
    uri: avatarUri,
    name: `avatar_${timestamp}.jpg`,
    type: 'image/jpeg',
  };
}

export function buildAvatarStoryDraft(file: ApiFile): CreateStoryDraft {
  return {
    media: {
      ...file,
      fileType: 'image',
    },
  };
}

function buildOptimisticAvatarStory({
  avatarUri,
  created,
  currentUserId,
  currentUserProfile,
  timestamp,
}: {
  avatarUri: string;
  created: CreateStoryResult;
  currentUserId?: string;
  currentUserProfile?: AuthUserProfile | null;
  timestamp: number;
}): StoryItem | null {
  if (!currentUserId) return null;

  const postedAt = Math.floor(timestamp / 1000);

  return {
    id: created.storyId ?? `local-avatar-story-${timestamp}`,
    publisher: {
      userId: currentUserId,
      username: currentUserProfile?.username ?? '',
      name: currentUserProfile?.name || currentUserProfile?.username || 'Bạn',
      avatarUrl: avatarUri,
      isVerified: false,
    },
    postedAt,
    expiresAt: postedAt + 60 * 60 * 24,
    thumbnailUrl: avatarUri,
    media: [
      {
        id: `local-avatar-media-${timestamp}`,
        type: 'image',
        url: avatarUri,
        storyId: created.storyId,
        postedAt,
      },
    ],
    isOwner: true,
    isViewed: false,
    hasUnseen: true,
    myReaction: null,
    reactionCount: 0,
  };
}

export async function updateAvatarAndShareStory(
  avatarUri: string,
  dependencies: Dependencies,
): Promise<UpdateAvatarAndShareStoryResult> {
  const timestamp = (dependencies.now ?? Date.now)();
  const avatarFile = buildAvatarUploadFile(avatarUri, timestamp);
  const profileMedia = await dependencies.uploadAvatar(avatarFile);

  if (!profileMedia) {
    return { avatarUpdated: false, storyCreated: false };
  }

  try {
    const created = await dependencies.createStory(
      buildAvatarStoryDraft(avatarFile),
    );
    const optimisticStory = buildOptimisticAvatarStory({
      avatarUri,
      created,
      currentUserId: dependencies.currentUserId,
      currentUserProfile: dependencies.currentUserProfile,
      timestamp,
    });

    if (optimisticStory) {
      dependencies.emitStory(optimisticStory);
    }

    return { avatarUpdated: true, storyCreated: true, profileMedia };
  } catch (storyError) {
    return {
      avatarUpdated: true,
      storyCreated: false,
      profileMedia,
      storyError,
    };
  }
}
