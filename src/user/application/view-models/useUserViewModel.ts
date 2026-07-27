// Description: Coordinates user profile and discovery state with the user repository.
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { filterDistanceScopedResults } from '../utils/mapSearchRadius';

const repository = createUserRepository();
const MAP_SEARCH_FIRST_RESULT_DEADLINE_MS = 1850;

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

function isAbortError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; name?: string };
  return (
    candidate.name === 'AbortError' ||
    candidate.name === 'CanceledError' ||
    candidate.code === 'ERR_CANCELED'
  );
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
  const [placePredictionsQuery, setPlacePredictionsQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMapSearchLoading, setIsMapSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeActionCountRef = useRef(0);
  const discoveryRequestIdRef = useRef(0);
  const mapSearchRequestIdRef = useRef(0);
  const mapSearchAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      mapSearchAbortControllerRef.current?.abort();
    },
    [],
  );

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
      const requestId = ++discoveryRequestIdRef.current;
      return runUserAction(async () => {
        const [users, places, pages] = await Promise.all([
          repository.getNearbyUsers(input),
          repository.getNearbyPlaces(input),
          repository.getNearbyPages(input).catch(() => []),
        ]);
        const discoveryPlaces = [...pages, ...places];

        if (requestId === discoveryRequestIdRef.current) {
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
      const requestId = ++discoveryRequestIdRef.current;
      return runUserAction(async () => {
        const pages = await repository.getNearbyPages({
          distance: 3,
          limit: input?.limit ?? 30,
          lat: input?.lat,
          lng: input?.lng,
        });
        if (requestId === discoveryRequestIdRef.current) {
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
      globalSearch?: boolean;
      waitForAllSources?: boolean;
      onPartialResults?: (result: {
        pages: NearbyPlace[];
        predictions: MapPlacePrediction[];
      }) => void;
    }) => {
      mapSearchAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      mapSearchAbortControllerRef.current = abortController;
      const requestId = ++mapSearchRequestIdRef.current;
      const trimmedQuery = input.query.trim();

      if (trimmedQuery.length < 2) {
        setIsMapSearchLoading(false);
        return Promise.resolve({ pages: [], predictions: [] });
      }

      // Search and discovery have independent request sequences, but both
      // publish into nearbyPlaces. Prevent an older discovery response from
      // replacing the active typeahead Page results.
      discoveryRequestIdRef.current += 1;
      setIsMapSearchLoading(true);
      setError(null);
      setNearbyUsers([]);

      return (async () => {
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
        const isLatestRequest = () =>
          requestId === mapSearchRequestIdRef.current &&
          !abortController.signal.aborted;
        const publishPartialResults = () => {
          if (!isLatestRequest() || !input.onPartialResults) return;
          try {
            input.onPartialResults({
              pages: pagesSnapshot,
              predictions: predictionsSnapshot,
            });
          } catch {
            // A screen update must never turn a successful source into a
            // failed network request.
          }
        };
        const pageDistanceKm =
          typeof input.radius === 'number' && Number.isFinite(input.radius)
            ? Math.max(0.001, input.radius / 1000)
            : 3;
        const scopedRadius =
          typeof input.lat === 'number' &&
          Number.isFinite(input.lat) &&
          typeof input.lng === 'number' &&
          Number.isFinite(input.lng)
            ? input.radius
            : undefined;

        const pagesPromise = repository
          .getNearbyPages({
            keyword: trimmedQuery,
            distance: pageDistanceKm,
            limit: input.limit ?? 20,
            lat: input.lat,
            lng: input.lng,
            fast: input.fast,
            globalSearch: input.globalSearch,
            signal: abortController.signal,
          })
          .then(pages => {
            pagesSnapshot = filterDistanceScopedResults(
              pages,
              scopedRadius,
              page => page.distanceMeters,
            );
            if (isLatestRequest()) {
              setNearbyPlaces(pagesSnapshot);
            }
            publishPartialResults();
            resolveWhenUseful();
            return pages;
          })
          .catch(caughtError => {
            if (!isAbortError(caughtError)) {
              pagesError = caughtError;
            }
            return [];
          })
          .finally(() => {
            pagesSettled = true;
            resolveWhenUseful();
          });
        const predictionsPromise = repository
          .getPlacePredictions({
            query: trimmedQuery,
            category: input.googleQuery,
            lat: input.lat,
            lng: input.lng,
            radius: input.radius,
            fast: input.fast,
            globalSearch: input.globalSearch,
            signal: abortController.signal,
          })
          .then(predictions => {
            predictionsSnapshot = filterDistanceScopedResults(
              predictions,
              scopedRadius,
              prediction => prediction.distanceMeters,
            );
            if (isLatestRequest()) {
              setPlacePredictions(predictionsSnapshot);
              setPlacePredictionsQuery(trimmedQuery);
            }
            publishPartialResults();
            resolveWhenUseful();
            return predictions;
          })
          .catch(caughtError => {
            if (!isAbortError(caughtError)) {
              predictionsError = caughtError;
            }
            return [];
          })
          .finally(() => {
            predictionsSettled = true;
            resolveWhenUseful();
          });

        const allSourcesSettled = Promise.all([
          pagesPromise,
          predictionsPromise,
        ]).then(() => {
          if (isLatestRequest()) {
            setIsMapSearchLoading(false);
            mapSearchAbortControllerRef.current = null;
            const searchError = predictionsError ?? pagesError;
            if (
              searchError &&
              pagesSnapshot.length === 0 &&
              predictionsSnapshot.length === 0
            ) {
              setError(toErrorMessage(searchError));
            }
          }
        });

        if (input.fast && !input.waitForAllSources) {
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

        await allSourcesSettled;

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
      })();
    },
    [],
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
    discoveryRequestIdRef.current += 1;
    mapSearchRequestIdRef.current += 1;
    mapSearchAbortControllerRef.current?.abort();
    mapSearchAbortControllerRef.current = null;
    setIsMapSearchLoading(false);
    setNearbyUsers([]);
    setNearbyPlaces([]);
    setPlacePredictions([]);
    setPlacePredictionsQuery('');
  }, []);

  const clearPlacePredictions = useCallback(() => {
    mapSearchRequestIdRef.current += 1;
    mapSearchAbortControllerRef.current?.abort();
    mapSearchAbortControllerRef.current = null;
    setIsMapSearchLoading(false);
    setPlacePredictions([]);
    setPlacePredictionsQuery('');
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
    placePredictionsQuery,
    isLoading,
    isMapSearchLoading,
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
