// Description: Coordinates profile screen state with the profile repository.
import { useCallback, useState } from 'react';
import type {
  ProfileData,
  ProfileLoadInput,
} from '../../domain/types/profile.types';
import { createProfileRepository } from '../../infrastructure/repositories/ApiProfileRepository';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { ApiFile } from '../../../shared-kernel/domain/types/api.types';

const repository = createProfileRepository();

// Avatar upload response type
type UpdateAvatarResponse = {
  api_status: number | string;
  message?: string;
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

export function useProfileViewModel() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (input?: ProfileLoadInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await repository.loadProfile(input);
      setProfileData(result);
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

  const updateAvatar = useCallback(async (avatarUri: string): Promise<boolean> => {
    try {
      const response = await apiBridge.multipart<UpdateAvatarResponse>(
        apiRoutes.user.update,
        {
          avatar: {
            uri: avatarUri,
            name: `avatar_${Date.now()}.jpg`,
            type: 'image/jpeg',
          },
        }
      );

      return response.api_status === 200;
    } catch (error) {
      console.error('[useProfileViewModel] updateAvatar error:', error);
      return false;
    }
  }, []);

  const updateCover = useCallback(async (cover: ApiFile): Promise<boolean> => {
    try {
      const response = await apiBridge.multipart<UpdateAvatarResponse>(
        apiRoutes.user.updateCover,
        {
          cover,
        }
      );

      return String(response.api_status) === '200';
    } catch (error) {
      console.error('[useProfileViewModel] updateCover error:', error);
      return false;
    }
  }, []);

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
