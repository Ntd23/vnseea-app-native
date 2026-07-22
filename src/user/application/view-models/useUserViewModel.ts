// Description: Coordinates user profile and discovery state with the user repository.
import { useCallback, useRef, useState } from 'react';
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
const MAP_SEARCH_FIRST_RESULT_DEADLINE_MS = 1850;

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
  const activeActionCountRef = useRef(0);
  const nearbyContentRequestIdRef = useRef(0);

  const runUserAction = useCallback(
    async <TResult>(action: () => Promise<TResult>) => {
      activeActionCountRef.current += 1;
      if (activeActionCountRef.current === 1) {
        setIsLoading(true);
      }
      setError(null);

      try {
        return await action();
      } catch (caughtError) {
        setError(toErrorMessage(caughtError));
        throw caughtError;
      } finally {
        activeActionCountRef.current = Math.max(
          0,
          activeActionCountRef.current - 1,
        );
        if (activeActionCountRef.current === 0) {
          setIsLoading(false);
        }
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
    (input?: NearbyUsersInput) => {
      const requestId = ++nearbyContentRequestIdRef.current;
      return runUserAction(async () => {
        const [users, places, pages] = await Promise.all([
          repository.getNearbyUsers(input),
          repository.getNearbyPlaces(input),
          repository.getNearbyPages(input).catch(() => []),
        ]);
        const discoveryPlaces = [...pages, ...places];

        if (requestId === nearbyContentRequestIdRef.current) {
          setNearbyUsers(users);
          setNearbyPlaces(discoveryPlaces);
        }

        return { places: discoveryPlaces, users };
      });
    },
    [runUserAction],
  );

  const loadNearbyPages = useCallback(
    (input?: { lat?: number; lng?: number; limit?: number }) => {
      const requestId = ++nearbyContentRequestIdRef.current;
      return runUserAction(async () => {
        const pages = await repository.getNearbyPages({
          distance: 3,
          limit: input?.limit ?? 30,
          lat: input?.lat,
          lng: input?.lng,
        });
        if (requestId === nearbyContentRequestIdRef.current) {
          setNearbyUsers([]);
          setNearbyPlaces(pages);
        }
        return pages;
      });
    },
    [runUserAction],
  );

  const searchNearbyPagesAndPlaces = useCallback(
    (input: {
      query: string;
      googleQuery?: string;
      lat?: number;
      lng?: number;
      limit?: number;
      radius?: number;
      fast?: boolean;
    }) => {
      const requestId = ++nearbyContentRequestIdRef.current;
      return runUserAction(async () => {
        if (input.query.trim().length < 3) {
          if (requestId === nearbyContentRequestIdRef.current) {
            setNearbyPlaces([]);
            setPlacePredictions([]);
          }
          return { pages: [], predictions: [] };
        }

        if (requestId === nearbyContentRequestIdRef.current) {
          setNearbyUsers([]);
          setPlacePredictions([]);
        }

        let pagesSnapshot: NearbyPlace[] = [];
        let predictionsSnapshot: MapPlacePrediction[] = [];
        let pagesError: unknown;
        let predictionsError: unknown;
        let pagesSettled = false;
        let predictionsSettled = false;
        let firstUsefulResolved = false;
        let resolveFirstUseful: () => void = () => undefined;
        const firstUsefulPromise = new Promise<void>(resolve => {
          resolveFirstUseful = resolve;
        });
        const resolveWhenUseful = () => {
          if (
            firstUsefulResolved ||
            (pagesSnapshot.length === 0 &&
              predictionsSnapshot.length === 0 &&
              !(pagesSettled && predictionsSettled))
          ) {
            return;
          }

          firstUsefulResolved = true;
          resolveFirstUseful();
        };

        const pagesPromise = repository
          .getNearbyPages({
            keyword: input.query,
            distance: 3,
            limit: input.limit ?? 20,
            lat: input.lat,
            lng: input.lng,
            fast: input.fast,
          })
          .then(pages => {
            pagesSnapshot = pages;
            if (requestId === nearbyContentRequestIdRef.current) {
              setNearbyPlaces(pages);
            }
            resolveWhenUseful();
            return pages;
          })
          .catch(caughtError => {
            pagesError = caughtError;
            return [];
          })
          .finally(() => {
            pagesSettled = true;
            resolveWhenUseful();
          });
        const predictionsPromise = repository
          .getPlacePredictions({
            query: input.query,
            category: input.googleQuery,
            lat: input.lat,
            lng: input.lng,
            radius: input.radius,
            fast: input.fast,
          })
          .then(predictions => {
            predictionsSnapshot = predictions;
            if (requestId === nearbyContentRequestIdRef.current) {
              setPlacePredictions(predictions);
            }
            resolveWhenUseful();
            return predictions;
          })
          .catch(caughtError => {
            predictionsError = caughtError;
            return [];
          })
          .finally(() => {
            predictionsSettled = true;
            resolveWhenUseful();
          });

        if (input.fast) {
          let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
          await Promise.race([
            firstUsefulPromise,
            new Promise<void>(resolve => {
              deadlineTimer = setTimeout(
                resolve,
                MAP_SEARCH_FIRST_RESULT_DEADLINE_MS,
              );
            }),
          ]);
          if (deadlineTimer) clearTimeout(deadlineTimer);

          return {
            pages: pagesSnapshot,
            predictions: predictionsSnapshot,
          };
        }

        await Promise.all([pagesPromise, predictionsPromise]);

        if (pagesError && predictionsError) {
          throw predictionsError ?? pagesError;
        }
        if (predictionsError && pagesSnapshot.length === 0) {
          throw predictionsError;
        }
        if (pagesError && predictionsSnapshot.length === 0) {
          throw pagesError;
        }

        return {
          pages: pagesSnapshot,
          predictions: predictionsSnapshot,
        };
      });
    },
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

  const getRoutes = useCallback(
    (input: MapRouteInput) => repository.getRoutes(input),
    [],
  );

  const clearNearbyDiscovery = useCallback(() => {
    nearbyContentRequestIdRef.current += 1;
    setNearbyUsers([]);
    setNearbyPlaces([]);
    setPlacePredictions([]);
  }, []);

  const clearPlacePredictions = useCallback(() => {
    nearbyContentRequestIdRef.current += 1;
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
    getRoutes,
    clearNearbyDiscovery,
    clearPlacePredictions,
    updateCurrentUser,
  };
}
