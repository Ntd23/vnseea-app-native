// Description: Coordinates profile screen state with the profile repository.
import { useCallback, useState } from 'react';
import type {
  ProfileData,
  ProfileLoadInput,
} from '../../domain/types/profile.types';
import { createProfileRepository } from '../../infrastructure/repositories/ApiProfileRepository';

const repository = createProfileRepository();

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

  return {
    profileData,
    profile: profileData?.profile,
    followers: profileData?.followers ?? [],
    following: profileData?.following ?? [],
    isLoading,
    error,
    loadProfile,
  };
}
