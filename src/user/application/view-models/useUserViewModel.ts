// Description: Coordinates user profile and discovery state with the user repository.
import { useCallback, useState } from 'react';
import type {
  GetUserProfileInput,
  MapPlacePrediction,
  MapRouteInput,
  NearbyPlace,
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
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [placePredictions, setPlacePredictions] = useState<
    MapPlacePrediction[]
  >([]);
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

  const loadNearbyDiscovery = useCallback(
    (input?: NearbyUsersInput) =>
      runUserAction(async () => {
        const [users, places, pages] = await Promise.all([
          repository.getNearbyUsers(input),
          repository.getNearbyPlaces(input),
          repository.getNearbyPages(input).catch(() => []),
        ]);
        const discoveryPlaces = [...pages, ...places];

        setNearbyUsers(users);
        setNearbyPlaces(discoveryPlaces);

        return { places: discoveryPlaces, users };
      }),
    [runUserAction],
  );

  const loadNearbyPages = useCallback(
    (input?: { lat?: number; lng?: number; limit?: number }) =>
      runUserAction(async () => {
        const pages = await repository.getNearbyPages({
          distance: 1,
          limit: input?.limit ?? 30,
          lat: input?.lat,
          lng: input?.lng,
        });
        setNearbyUsers([]);
        setNearbyPlaces(pages);
        setPlacePredictions([]);
        return pages;
      }),
    [runUserAction],
  );

  const searchNearbyPagesAndPlaces = useCallback(
    (input: { query: string; lat?: number; lng?: number; limit?: number }) =>
      runUserAction(async () => {
        if (input.query.trim().length < 3) {
          setNearbyPlaces([]);
          setPlacePredictions([]);
          return { pages: [], predictions: [] };
        }

        const [pagesResult, predictionsResult] = await Promise.allSettled([
          repository.getNearbyPages({
            keyword: input.query,
            distance: 50,
            limit: input.limit ?? 20,
            lat: input.lat,
            lng: input.lng,
          }),
          repository.getPlacePredictions(input),
        ]);
        const pages =
          pagesResult.status === 'fulfilled' ? pagesResult.value : [];
        const predictions =
          predictionsResult.status === 'fulfilled'
            ? predictionsResult.value
            : [];

        if (
          pagesResult.status === 'rejected' &&
          predictionsResult.status === 'rejected'
        ) {
          throw predictionsResult.reason ?? pagesResult.reason;
        }
        if (predictionsResult.status === 'rejected' && pages.length === 0) {
          throw predictionsResult.reason;
        }
        if (pagesResult.status === 'rejected' && predictions.length === 0) {
          throw pagesResult.reason;
        }

        setNearbyUsers([]);
        setNearbyPlaces(pages);
        setPlacePredictions(predictions);

        return { pages, predictions };
      }),
    [runUserAction],
  );

  const getPlaceDetails = useCallback(
    (placeId: string) => repository.getPlaceDetails(placeId),
    [],
  );

  const getRoute = useCallback(
    (input: MapRouteInput) => repository.getRoute(input),
    [],
  );

  const clearNearbyDiscovery = useCallback(() => {
    setNearbyUsers([]);
    setNearbyPlaces([]);
    setPlacePredictions([]);
  }, []);

  const clearPlacePredictions = useCallback(() => {
    setPlacePredictions([]);
  }, []);

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
    nearbyPlaces,
    placePredictions,
    isLoading,
    error,
    loadCurrentUser,
    loadUserProfile,
    loadSuggestions,
    loadNearbyUsers,
    loadNearbyDiscovery,
    loadNearbyPages,
    searchNearbyPagesAndPlaces,
    getPlaceDetails,
    getRoute,
    clearNearbyDiscovery,
    clearPlacePredictions,
    updateCurrentUser,
  };
}
