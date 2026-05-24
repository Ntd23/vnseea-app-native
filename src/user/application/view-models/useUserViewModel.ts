// Description: Coordinates user profile and discovery state with the user repository.
import { useCallback, useState } from 'react';
import type {
  GetUserProfileInput,
  NearbyUsersInput,
  UpdateCurrentUserInput,
  UserProfile,
  UserProfileResult,
  UserSuggestionsInput,
} from '../../domain/types/user.types';
import { createUserRepository } from '../../infrastructure/repositories/ApiUserRepository';

const repository = createUserRepository();

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

export function useUserViewModel() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [profileResult, setProfileResult] = useState<UserProfileResult | null>(
    null,
  );
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runUserAction = useCallback(
    async <TResult>(action: () => Promise<TResult>) => {
      setIsLoading(true);
      setError(null);

      try {
        return await action();
      } catch (caughtError) {
        setError(toErrorMessage(caughtError));
        throw caughtError;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const loadCurrentUser = useCallback(
    () =>
      runUserAction(async () => {
        const result = await repository.getCurrentUser();
        setCurrentUser(result);
        return result;
      }),
    [runUserAction],
  );

  const loadUserProfile = useCallback(
    (input: GetUserProfileInput) =>
      runUserAction(async () => {
        const result = await repository.getUserProfile(input);
        setProfileResult(result);
        return result;
      }),
    [runUserAction],
  );

  const loadSuggestions = useCallback(
    (input?: UserSuggestionsInput) =>
      runUserAction(async () => {
        const result = await repository.getSuggestions(input);
        setSuggestions(result);
        return result;
      }),
    [runUserAction],
  );

  const loadNearbyUsers = useCallback(
    (input?: NearbyUsersInput) =>
      runUserAction(async () => {
        const result = await repository.getNearbyUsers(input);
        setNearbyUsers(result);
        return result;
      }),
    [runUserAction],
  );

  const updateCurrentUser = useCallback(
    (input: UpdateCurrentUserInput) =>
      runUserAction(() => repository.updateCurrentUser(input)),
    [runUserAction],
  );

  return {
    currentUser,
    profileResult,
    suggestions,
    nearbyUsers,
    isLoading,
    error,
    loadCurrentUser,
    loadUserProfile,
    loadSuggestions,
    loadNearbyUsers,
    updateCurrentUser,
  };
}
