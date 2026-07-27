// Description: Coordinates profile screen state with the profile repository.
import { useCallback, useEffect, useState } from 'react';
import type {
  ProfileData,
  ProfileLoadInput,
} from '../../domain/types/profile.types';
import { createProfileRepository } from '../../infrastructure/repositories/ApiProfileRepository';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { ApiFile } from '../../../shared-kernel/domain/types/api.types';
import { createStoriesRepository } from '../../../stories/infrastructure/repositories/ApiStoriesRepository';
import { storyCreatedEvents } from '../../../stories/application/events/storyCreatedEvents';
import { updateAvatarAndShareStory } from '../services/updateAvatarAndShareStory';
import {
  buildProfileMediaUploadPayload,
  parseProfileMediaUpdateResponse,
  uploadProfileMediaWithReconciliation,
  type RawProfileMediaResponse,
} from '../services/profileMediaUpdate';
import { profileMediaUpdatedEvents } from '../events/profileMediaUpdatedEvents';
import type {
  ProfileMediaKind,
  ProfileMediaSnapshot,
  ProfileMediaUpdateResult,
} from '../../domain/types/profileMedia.types';

const repository = createProfileRepository();
const storiesRepository = createStoriesRepository();
const PROFILE_MEDIA_UPLOAD_TIMEOUT_MS = 60_000;

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

function logProfileMediaUpdateError(
  kind: ProfileMediaKind,
  error: unknown,
) {
  const candidate = error as {
    message?: string;
    response?: {
      status?: number;
      data?: unknown;
    };
  };

  console.warn(`[useProfileViewModel] update ${kind} rejected:`, {
    message: candidate?.message ?? String(error),
    status: candidate?.response?.status,
    response: candidate?.response?.data,
  });
}

function profileDataToMediaSnapshot(
  profileData: ProfileData | null,
): ProfileMediaSnapshot | null {
  const profile = profileData?.profile;
  if (!profile) return null;

  return {
    avatarUrl: profile.avatarUrl,
    coverUrl: profile.coverUrl,
    avatarPostId: profile.avatarPostId,
    coverPostId: profile.coverPostId,
  };
}

async function uploadCanonicalProfileMedia(
  kind: ProfileMediaKind,
  file: ApiFile,
) {
  const route =
    kind === 'avatar' ? apiRoutes.user.update : apiRoutes.user.updateCover;
  const response = await apiBridge.multipart<RawProfileMediaResponse>(
    route,
    buildProfileMediaUploadPayload(kind, file),
    { timeout: PROFILE_MEDIA_UPLOAD_TIMEOUT_MS },
  );
  return parseProfileMediaUpdateResponse(response, kind);
}

export function useProfileViewModel() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      profileMediaUpdatedEvents.subscribe(({ userId, media }) => {
        setProfileData(previous => {
          if (
            !previous?.profile ||
            String(previous.profile.id) !== String(userId)
          ) {
            return previous;
          }

          return {
            ...previous,
            profile: {
              ...previous.profile,
              ...(media.kind === 'avatar'
                ? {
                    avatarUrl: media.url,
                    avatarPostId: media.postId,
                  }
                : {
                    coverUrl: media.url,
                    coverPostId: media.postId,
                  }),
            },
          };
        });
      }),
    [],
  );

  const loadProfile = useCallback(async (input?: ProfileLoadInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await repository.loadProfile(input);
      setProfileData(result);

      const currentUserId = sessionStorage.getSession()?.userId;
      const loadedProfile = result?.profile;
      if (
        currentUserId &&
        loadedProfile &&
        String(loadedProfile.id) === String(currentUserId)
      ) {
        sessionStorage.setUserProfile({
          name: loadedProfile.name,
          username: loadedProfile.username,
          avatarUrl: loadedProfile.avatarUrl,
        });
      }

      return result;
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleFollow = useCallback(async (userId: string) => {
    const nextState = await repository.toggleFollow(userId);

    setProfileData(prev => {
      if (!prev?.profile || String(prev.profile.id) !== String(userId)) {
        return prev;
      }

      return {
        ...prev,
        profile: {
          ...prev.profile,
          followingState: nextState,
          followedByCurrentUser: nextState === 'following',
          canFollow: true,
        },
      };
    });

    return nextState;
  }, []);

  const pokeUser = useCallback(async (userId: string) => {
    await repository.pokeUser(userId);
  }, []);

  const loadOwnProfileMediaSnapshot = useCallback(async () => {
    const loaded = await repository.loadProfile();
    return profileDataToMediaSnapshot(loaded);
  }, []);

  const publishProfileMediaUpdate = useCallback(
    (media: ProfileMediaUpdateResult) => {
      const userId = sessionStorage.getSession()?.userId;
      if (!userId) return;

      if (media.kind === 'avatar') {
        const cachedProfile = sessionStorage.getUserProfile() ?? {};
        sessionStorage.setUserProfile({
          ...cachedProfile,
          avatarUrl: media.url,
        });
      }

      profileMediaUpdatedEvents.emit({ userId, media });
    },
    [],
  );

  const updateAvatar = useCallback(
    async (avatarUri: string): Promise<ProfileMediaUpdateResult | null> => {
      try {
        const session = sessionStorage.getSession();
        const cachedProfile = sessionStorage.getUserProfile();
        const beforeSnapshot = profileDataToMediaSnapshot(profileData);
        const result = await updateAvatarAndShareStory(avatarUri, {
          uploadAvatar: avatar =>
            uploadProfileMediaWithReconciliation('avatar', avatar, {
              upload: file => uploadCanonicalProfileMedia('avatar', file),
              loadSnapshot: loadOwnProfileMediaSnapshot,
              beforeSnapshot,
            }),
          createStory: draft => storiesRepository.createStory(draft),
          currentUserId: session?.userId,
          currentUserProfile: cachedProfile,
          emitStory: story => storyCreatedEvents.emit(story),
          waitForStory: false,
          onStoryError: storyError => {
            console.warn(
              '[useProfileViewModel] avatar updated but Story creation failed:',
              storyError,
            );
          },
        });

        if (result.profileMedia) {
          publishProfileMediaUpdate(result.profileMedia);
        }

        return result.profileMedia ?? null;
      } catch (caughtError) {
        logProfileMediaUpdateError('avatar', caughtError);
        return null;
      }
    },
    [
      loadOwnProfileMediaSnapshot,
      profileData,
      publishProfileMediaUpdate,
    ],
  );

  const updateCover = useCallback(
    async (cover: ApiFile): Promise<ProfileMediaUpdateResult | null> => {
      try {
        const result = await uploadProfileMediaWithReconciliation(
          'cover',
          cover,
          {
            upload: file => uploadCanonicalProfileMedia('cover', file),
            loadSnapshot: loadOwnProfileMediaSnapshot,
            beforeSnapshot: profileDataToMediaSnapshot(profileData),
          },
        );
        publishProfileMediaUpdate(result);
        return result;
      } catch (caughtError) {
        logProfileMediaUpdateError('cover', caughtError);
        return null;
      }
    },
    [loadOwnProfileMediaSnapshot, profileData, publishProfileMediaUpdate],
  );

  return {
    profileData,
    profile: profileData?.profile,
    followers: profileData?.followers ?? [],
    following: profileData?.following ?? [],
    isLoading,
    error,
    loadProfile,
    toggleFollow,
    pokeUser,
    updateAvatar,
    updateCover,
  };
}
