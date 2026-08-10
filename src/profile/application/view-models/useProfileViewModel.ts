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
  buildLegacyProfileMediaUploadPayload,
  buildProfileMediaUploadPayload,
  parseProfileMediaUpdateResponse,
  uploadProfileMediaWithContractFallback,
  uploadProfileMediaWithReconciliation,
  type RawProfileMediaResponse,
} from '../services/profileMediaUpdate';
import { profileMediaUpdatedEvents } from '../events/profileMediaUpdatedEvents';
import type {
  ProfileMediaKind,
  ProfileMediaSnapshot,
  ProfileMediaUpdateResult,
} from '../../domain/types/profileMedia.types';
import {
  getProfileClientCacheEntry,
  loadProfileDataWithClientCache,
  primeProfilePreviewCacheForViewer,
  setCompleteProfileClientCacheEntry,
  type ProfilePreviewSeed,
  updateProfileClientCacheEntry,
} from '../cache/profileClientCache';
import { isClientUiOptimizationEnabled } from '../../../shared/performance/clientUiPerformanceMetrics';

const repository = createProfileRepository();
const storiesRepository = createStoriesRepository();
const PROFILE_MEDIA_UPLOAD_TIMEOUT_MS = 60_000;

type ProfileViewModelLoadInput = ProfileLoadInput & { force?: boolean };

function getCachedProfileData(userId?: string, allowPartial = false) {
  const viewerId = sessionStorage.getSession()?.userId;
  const entry = getProfileClientCacheEntry(viewerId, userId);
  if (!entry || (!allowPartial && entry.completeness !== 'complete')) {
    return null;
  }

  return entry.data;
}

function setCachedProfileData(
  userId: string | undefined,
  data: ProfileData,
  complete = false,
  includesFriends = false,
) {
  const viewerId = sessionStorage.getSession()?.userId;
  if (complete) {
    setCompleteProfileClientCacheEntry(
      viewerId,
      userId,
      data,
      includesFriends,
    );
    return;
  }
  updateProfileClientCacheEntry(viewerId, userId, data);
}

export function primeProfilePreviewCache(seed: ProfilePreviewSeed) {
  if (!isClientUiOptimizationEnabled()) return;
  primeProfilePreviewCacheForViewer(
    sessionStorage.getSession()?.userId,
    seed,
  );
}

function buildCachedSessionProfileData(userId?: string): ProfileData | null {
  const sessionUserId = sessionStorage.getSession()?.userId;
  if (!sessionUserId || (userId && String(userId) !== String(sessionUserId))) {
    return null;
  }

  const cached = sessionStorage.getUserProfile();
  return {
    profile: {
      id: String(sessionUserId),
      name: cached?.name,
      username: cached?.username,
      avatarUrl: cached?.avatarUrl,
    },
    followers: [],
    following: [],
    likedPages: [],
    joinedGroups: [],
    family: [],
  };
}

function getInitialProfileData(userId?: string) {
  const sessionUserId = sessionStorage.getSession()?.userId;
  const requestedUserId = userId || sessionUserId;
  return (
    getCachedProfileData(
      requestedUserId,
      isClientUiOptimizationEnabled(),
    ) ??
    buildCachedSessionProfileData(requestedUserId)
  );
}

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
  return uploadProfileMediaWithContractFallback(kind, {
    uploadCanonical: async () => {
      const response = await apiBridge.multipart<RawProfileMediaResponse>(
        route,
        buildProfileMediaUploadPayload(kind, file),
        { timeout: PROFILE_MEDIA_UPLOAD_TIMEOUT_MS },
      );
      return parseProfileMediaUpdateResponse(response, kind);
    },
    uploadLegacy: async () => {
      console.warn(
        '[useProfileViewModel] Cover crop contract rejected; retrying with the compatible upload path.',
      );
      const response = await apiBridge.multipart<RawProfileMediaResponse>(
        route,
        buildLegacyProfileMediaUploadPayload(kind, file),
        { timeout: PROFILE_MEDIA_UPLOAD_TIMEOUT_MS },
      );
      return parseProfileMediaUpdateResponse(response, kind);
    },
  });
}

export function useProfileViewModel(initialUserId?: string) {
  const [profileData, setProfileData] = useState<ProfileData | null>(() =>
    getInitialProfileData(initialUserId),
  );
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

          const next = {
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

          setCachedProfileData(userId, next);
          return next;
        });
      }),
    [],
  );

  useEffect(() => {
    const seeded = getInitialProfileData(initialUserId);

    setProfileData(previous => {
      if (
        seeded?.profile &&
        previous?.profile &&
        String(previous.profile.id) === String(seeded.profile?.id)
      ) {
        return previous;
      }

      if (seeded?.profile) return seeded;

      // Clear a previous user's profile immediately when navigating to a
      // different public profile without a cached snapshot. This prevents a
      // slow/error response from briefly rendering the previous person.
      if (
        initialUserId &&
        previous?.profile &&
        String(previous.profile.id) !== String(initialUserId)
      ) {
        return null;
      }

      return previous;
    });
  }, [initialUserId]);

  const loadProfile = useCallback(async (input?: ProfileViewModelLoadInput) => {
    const requestedUserId =
      input?.userId ?? sessionStorage.getSession()?.userId ?? undefined;
    const optimizationEnabled = isClientUiOptimizationEnabled();
    const cachedEntry = getProfileClientCacheEntry(
      sessionStorage.getSession()?.userId,
      requestedUserId,
    );
    const cached =
      cachedEntry &&
      (optimizationEnabled || cachedEntry.completeness === 'complete')
        ? cachedEntry.data
        : null;
    setError(null);
    if (cached) {
      setProfileData(previous =>
        !previous?.profile ||
        String(previous.profile.id) !== String(requestedUserId)
          ? cached
          : previous,
      );
    }
    if (
      optimizationEnabled &&
      !input?.force &&
      cachedEntry?.completeness === 'complete' &&
      (input?.includeFriends === false || cachedEntry.includesFriends)
    ) {
      return cachedEntry.data;
    }
    setIsLoading(true);

    try {
      const repositoryInput: ProfileLoadInput | undefined = input
        ? {
            userId: input.userId,
            includeFriends: input.includeFriends,
          }
        : undefined;
      const loadFromRepository = async () => {
        const result = await repository.loadProfile(repositoryInput);
        const cachedWithConnections = getCachedProfileData(
          requestedUserId,
          true,
        );
        return result
          ? {
              ...result,
              followers:
                input?.includeFriends === false && result.profile
                  ? cachedWithConnections?.profile &&
                    String(cachedWithConnections.profile.id) ===
                      String(result.profile.id)
                    ? cachedWithConnections.followers
                    : result.followers
                  : result.followers,
              following:
                input?.includeFriends === false && result.profile
                  ? cachedWithConnections?.profile &&
                    String(cachedWithConnections.profile.id) ===
                      String(result.profile.id)
                    ? cachedWithConnections.following
                    : result.following
                  : result.following,
            }
          : result;
      };
      const nextResult =
        optimizationEnabled && requestedUserId
          ? await loadProfileDataWithClientCache({
              viewerId: sessionStorage.getSession()?.userId,
              userId: requestedUserId,
              includeFriends: input?.includeFriends,
              force: input?.force,
              load: loadFromRepository,
            })
          : await loadFromRepository();
      setProfileData(nextResult);
      if (nextResult) {
        setCachedProfileData(
          requestedUserId,
          nextResult,
          true,
          input?.includeFriends !== false,
        );
      }

      const currentUserId = sessionStorage.getSession()?.userId;
      const loadedProfile = nextResult?.profile;
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

      return nextResult;
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadConnections = useCallback(
    async (userId: string, limit = 3) => {
      const result = await repository.loadConnections(userId, limit);

      setProfileData(previous => {
        if (
          !previous?.profile ||
          String(previous.profile.id) !== String(userId)
        ) {
          return previous;
        }

        const next = {
          ...previous,
          followers: result.followers,
          following: result.following,
        };
        setCachedProfileData(userId, next);
        return next;
      });

      return result;
    },
    [],
  );

  const toggleFollow = useCallback(async (userId: string) => {
    const nextState = await repository.toggleFollow(userId);

    const viewerId = sessionStorage.getSession()?.userId;
    const cachedEntry = getProfileClientCacheEntry(viewerId, userId);
    if (cachedEntry?.data.profile) {
      updateProfileClientCacheEntry(viewerId, userId, {
        ...cachedEntry.data,
        profile: {
          ...cachedEntry.data.profile,
          followingState: nextState,
          followedByCurrentUser: nextState === 'following',
          canFollow: true,
        },
      });
    }

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
    loadConnections,
    toggleFollow,
    pokeUser,
    updateAvatar,
    updateCover,
  };
}
