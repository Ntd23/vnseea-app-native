// Description: Implements the user repository through the shared API bridge.
import type {
  ApiEnvelope,
  RawApiRecord,
} from '../../../shared-kernel/domain/types/api.types';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { mapGroupSummary } from '../../../foundation/application/mappers/groupSummaryMapper';
import { mapPageSummary } from '../../../foundation/application/mappers/pageSummaryMapper';
import { asRecord } from '../../../foundation/application/normalizers/resolveValue';
import type { UserRepository } from '../../domain/repositories/UserRepository';
import type {
  FriendsInput,
  FriendsResult,
  GetUserProfileInput,
  MapPlacePrediction,
  MapRoute,
  MapRoutePoint,
  MapRouteStep,
  NearbyPlace,
  NearbyPlaceKind,
  NearbyPagesInput,
  NearbyPlacesInput,
  NearbyUsersInput,
  UpdateCurrentUserInput,
  UserProfile,
  UserProfileResult,
  UserSuggestionsInput,
} from '../../domain/types/user.types';
import { mapUserProfile } from '../../application/mappers/userProfileMapper';
import {
  mapNearbyPage,
  mapNearbyPlace,
} from '../../application/mappers/nearbyPlaceMapper';
import {
  toNearbyPagesQuery,
  toNearbyPlacesPayload,
  toNearbyUsersPayload,
  toUpdateCurrentUserPayload,
  toUserProfileFetchValue,
  toUserSuggestionsPayload,
} from '../../application/mappers/userPayloadMapper';

type CurrentUserResponse = ApiEnvelope & {
  user_data?: RawApiRecord;
};

type UserProfileResponse = ApiEnvelope & {
  user_data?: RawApiRecord;
  followers?: RawApiRecord[];
  following?: RawApiRecord[];
  liked_pages?: RawApiRecord[];
  joined_groups?: RawApiRecord[];
  family?: Array<RawApiRecord | { user_data?: RawApiRecord }>;
};

type UserSuggestionsResponse = ApiEnvelope & {
  suggestions?: RawApiRecord[];
  contacts_suggestions?: RawApiRecord[];
};

type NearbyUsersResponse = ApiEnvelope & {
  nearby_users?: RawApiRecord[];
};

type NearbyPlacesResponse = ApiEnvelope & {
  data?: RawApiRecord[];
};

type NearbyPagesResponse = {
  api_status?: number | string;
  items?: RawApiRecord[];
};

type PageDetailsResponse = ApiEnvelope & {
  page_data?: RawApiRecord;
};

type PlaceAutocompleteResponse = ApiEnvelope & {
  predictions?: RawApiRecord[];
};

type PlaceDetailsResponse = ApiEnvelope & {
  place?: RawApiRecord;
};

type RawRoutePoint = { lat?: number | string; lng?: number | string };

type RawRouteStep = {
  instruction?: string;
  htmlInstruction?: string;
  html_instructions?: string;
  maneuver?: string;
  path?: RawRoutePoint[];
  distanceMeters?: number | string;
  durationSeconds?: number | string;
  startLocation?: RawRoutePoint;
  start_location?: RawRoutePoint;
  endLocation?: RawRoutePoint;
  end_location?: RawRoutePoint;
};

type RawRouteRecord = {
  id?: number | string;
  routeId?: number | string;
  summary?: string;
  path?: RawRoutePoint[];
  steps?: RawRouteStep[];
  distanceMeters?: number | string;
  durationSeconds?: number | string;
  provider?: string;
};

type RouteResponse = ApiEnvelope & {
  route?: RawRouteRecord;
  routes?: RawRouteRecord[];
};

type UpdateUserResponse = ApiEnvelope & {
  message?: string;
};

type FriendsResponse = ApiEnvelope & {
  data?: {
    following?: RawApiRecord[];
    followers?: RawApiRecord[];
  };
};

function hasUploadFile(payload: Record<string, unknown>) {
  return Boolean(payload.avatar || payload.cover);
}

function mapUserList(records: RawApiRecord[] | undefined): UserProfile[] {
  return (records ?? []).map(record =>
    mapUserProfile(record, apiConfig.webBaseUrl),
  );
}

function mapNearbyPlaces(
  records: RawApiRecord[] | undefined,
  kind: NearbyPlaceKind,
): NearbyPlace[] {
  return (records ?? [])
    .map(record => mapNearbyPlace(record, kind, apiConfig.webBaseUrl))
    .filter(Boolean) as NearbyPlace[];
}

function readMapPinStatus(
  record: RawApiRecord | undefined,
): string | undefined {
  if (!record) return undefined;
  const rawStatus =
    record.map_pin_status ?? record.mapPinStatus ?? record.pin_status;
  if (typeof rawStatus === 'string') {
    return rawStatus.trim() || undefined;
  }
  if (typeof rawStatus === 'number' && Number.isFinite(rawStatus)) {
    return String(rawStatus);
  }
  return undefined;
}

async function fetchPageMapPinStatus(pageId: string) {
  if (!pageId) return undefined;
  const response = await apiBridge
    .post<PageDetailsResponse>(apiRoutes.pages.getById, { page_id: pageId })
    .catch(() => undefined);
  return readMapPinStatus(response?.page_data);
}

async function hydrateNearbyPageMapPinStatus(pages: NearbyPlace[]) {
  const hydratedPages = await Promise.all(
    pages.map(async page => {
      if (!page.pageId || page.mapPinStatus) {
        return page;
      }

      const mapPinStatus = await fetchPageMapPinStatus(page.pageId);
      if (!mapPinStatus) {
        return page;
      }

      const isApproved = mapPinStatus.trim().toLowerCase() === 'approved';
      return {
        ...page,
        mapPinStatus,
        mapPinApproved: isApproved,
        isPinned: isApproved,
      };
    }),
  );

  return hydratedPages;
}

async function fetchNearbyPages(input?: NearbyPagesInput) {
  const payload = toNearbyPagesQuery(input);
  const response = await apiBridge.post<NearbyPagesResponse>(
    apiRoutes.user.mapDiscovery,
    {
      type: 'page_suggestions',
      query: payload.query,
      distance: input?.distance,
      limit: input?.limit,
      origin_lat: input?.lat,
      origin_lng: input?.lng,
    },
  );

  const pages = (response.items ?? [])
    .map(record => mapNearbyPage(record, apiConfig.webBaseUrl))
    .filter(Boolean) as NearbyPlace[];

  return hydrateNearbyPageMapPinStatus(pages);
}

function mapPlacePrediction(record: RawApiRecord): MapPlacePrediction | null {
  const placeId = String(record.place_id ?? '');
  const description = String(record.description ?? '');
  if (!placeId || !description) return null;

  let types: string[] | undefined;
  if (Array.isArray(record.types)) {
    types = record.types.map(String);
  }

  return {
    source: 'google',
    placeId,
    description,
    mainText: String(record.main_text || description),
    secondaryText: String(record.secondary_text || ''),
    types,
    lat: record.lat !== undefined && record.lat !== null ? Number(record.lat) : undefined,
    lng: record.lng !== undefined && record.lng !== null ? Number(record.lng) : undefined,
    icon: record.icon !== undefined && record.icon !== null ? String(record.icon) : undefined,
    iconBackgroundColor: record.icon_background_color !== undefined && record.icon_background_color !== null ? String(record.icon_background_color) : undefined,
  };
}

function mapGooglePlace(record: RawApiRecord | undefined): NearbyPlace | null {
  if (!record) return null;
  const placeId = String(record.place_id ?? '');
  const name = String(record.name || record.address || '');
  const latitude = Number(record.lat);
  const longitude = Number(record.lng);
  if (
    !placeId ||
    !name ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    id: `google:${placeId}`,
    kind: 'page',
    source: 'google',
    placeId,
    name,
    location: String(record.address || ''),
    url: String(record.url || ''),
    coordinate: {
      latitude,
      longitude,
    },
    icon: record.icon !== undefined && record.icon !== null ? String(record.icon) : undefined,
    iconBackgroundColor: record.icon_background_color !== undefined && record.icon_background_color !== null ? String(record.icon_background_color) : undefined,
  };
}

function mapRoutePoint(point: RawRoutePoint | undefined) {
  if (!point) return undefined;
  const latitude = Number(point.lat);
  const longitude = Number(point.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined;
  }
  return { latitude, longitude };
}

function mapRouteStep(step: RawRouteStep): MapRouteStep | null {
  const startLocation = mapRoutePoint(step.startLocation ?? step.start_location);
  const endLocation = mapRoutePoint(step.endLocation ?? step.end_location);
  const path = (step.path ?? [])
    .map(mapRoutePoint)
    .filter(Boolean) as MapRoutePoint[];
  const distanceMeters = Number(step.distanceMeters ?? 0) || 0;
  const durationSeconds = Number(step.durationSeconds ?? 0) || 0;

  if (!startLocation && !endLocation && path.length === 0) {
    return null;
  }

  return {
    instruction: String(
      step.instruction ?? step.htmlInstruction ?? step.html_instructions ?? '',
    ).trim(),
    maneuver: String(step.maneuver ?? '').trim(),
    distanceMeters,
    durationSeconds,
    startLocation,
    endLocation,
    path,
  };
}

function mapRouteRecord(route: RouteResponse['route'], index = 0): MapRoute {
  if (!route) {
    throw new Error('Không tìm thấy đường đi.');
  }

  return {
    id: String(route.routeId ?? route.id ?? `route-${index + 1}`),
    summary: String(route.summary ?? ''),
    path: (route.path ?? [])
      .map(mapRoutePoint)
      .filter(Boolean) as MapRoute['path'],
    steps: (route.steps ?? [])
      .map(mapRouteStep)
      .filter(Boolean) as MapRouteStep[],
    distanceMeters: Number(route.distanceMeters ?? 0) || 0,
    durationSeconds: Number(route.durationSeconds ?? 0) || 0,
    provider: 'google',
  };
}

function mapRoute(response: RouteResponse): MapRoute {
  return mapRouteRecord(response.route, 0);
}

function mapRoutes(response: RouteResponse): MapRoute[] {
  const routes = Array.isArray(response.routes) ? response.routes : [];
  const mappedRoutes = routes
    .map((route, index) => mapRouteRecord(route, index))
    .filter(route => route.path.length > 1);

  if (mappedRoutes.length > 0) {
    return mappedRoutes;
  }

  const fallbackRoute = mapRoute(response);
  return fallbackRoute.path.length > 1 ? [fallbackRoute] : [];
}

function mapFamily(records: UserProfileResponse['family']): UserProfile[] {
  return (records ?? [])
    .map(record => {
      const directRecord = asRecord(record);
      const userRecord = asRecord(directRecord?.user_data) ?? directRecord;
      return userRecord
        ? mapUserProfile(userRecord, apiConfig.webBaseUrl)
        : null;
    })
    .filter(Boolean) as UserProfile[];
}

function mapUserProfileResponse(
  response: UserProfileResponse,
): UserProfileResult {
  return {
    profile: response.user_data
      ? mapUserProfile(response.user_data, apiConfig.webBaseUrl)
      : undefined,
    followers: mapUserList(response.followers),
    following: mapUserList(response.following),
    likedPages: (response.liked_pages ?? []).map(record =>
      mapPageSummary(record, apiConfig.webBaseUrl),
    ),
    joinedGroups: (response.joined_groups ?? []).map(record =>
      mapGroupSummary(record, apiConfig.webBaseUrl),
    ),
    family: mapFamily(response.family),
  };
}

export function createUserRepository(): UserRepository {
  return {
    async getCurrentUser() {
      if (!sessionStorage.getAccessToken()) {
        return null;
      }

      const response = await apiBridge.post<CurrentUserResponse>(
        apiRoutes.auth.me,
      );

      if (!response.user_data) {
        return null;
      }

      return mapUserProfile(response.user_data, apiConfig.webBaseUrl);
    },

    async getUserProfile(input: GetUserProfileInput) {
      // If no userId provided, fetch current user's profile via get-current-user endpoint
      if (!input?.userId) {
        const currentUserResponse = await apiBridge.post<CurrentUserResponse>(
          apiRoutes.auth.me,
        );

        if (!currentUserResponse.user_data) {
          return {
            profile: undefined,
            followers: [],
            following: [],
            likedPages: [],
            joinedGroups: [],
            family: [],
          };
        }

        return {
          profile: mapUserProfile(
            currentUserResponse.user_data,
            apiConfig.webBaseUrl,
          ),
          followers: [],
          following: [],
          likedPages: [],
          joinedGroups: [],
          family: [],
        };
      }

      const response = await apiBridge.post<UserProfileResponse>(
        apiRoutes.user.get,
        {
          user_id: input.userId,
          fetch: toUserProfileFetchValue(input.fetch),
          send_notify: input.sendVisitNotification ? 1 : undefined,
        },
      );

      return mapUserProfileResponse(response);
    },

    async getSuggestions(input?: UserSuggestionsInput) {
      const response = await apiBridge.post<UserSuggestionsResponse>(
        apiRoutes.user.suggestions,
        toUserSuggestionsPayload(input),
      );

      return mapUserList(response.suggestions);
    },

    async getNearbyUsers(input?: NearbyUsersInput) {
      const response = await apiBridge.post<NearbyUsersResponse>(
        apiRoutes.user.nearby,
        toNearbyUsersPayload(input),
      );

      return mapUserList(response.nearby_users);
    },

    async getNearbyPlaces(input?: NearbyPlacesInput) {
      const payload = toNearbyPlacesPayload(input);
      const [shopsResponse, businessesResponse] = await Promise.all([
        apiBridge.post<NearbyPlacesResponse>(apiRoutes.user.nearbyPlaces, {
          ...payload,
          type: 'shops',
        }),
        apiBridge.post<NearbyPlacesResponse>(apiRoutes.user.nearbyPlaces, {
          ...payload,
          type: 'businesses',
        }),
      ]);

      return [
        ...mapNearbyPlaces(shopsResponse.data, 'shop'),
        ...mapNearbyPlaces(businessesResponse.data, 'business'),
      ];
    },

    async getNearbyPages(input?: NearbyPagesInput) {
      return fetchNearbyPages(input);
    },

    async getPlacePredictions(input) {
      if (input.query.trim().length < 3) return [];
      const response = await apiBridge.post<any>(
        apiRoutes.user.mapDiscovery,
        {
          type: 'place_autocomplete',
          query: input.query.trim(),
          origin_lat: input.lat,
          origin_lng: input.lng,
          radius: input.radius,
        },
      );

      console.warn('=== GOOGLE API DEBUG ===', {
        nearby_status: response.debug_nearby_status,
        nearby_error: response.debug_nearby_error,
        autocomplete_status: response.debug_autocomplete_status,
        autocomplete_error: response.debug_autocomplete_error,
        predictions_count: response.predictions?.length,
      });

      return (response.predictions ?? [])
        .map(mapPlacePrediction)
        .filter(Boolean) as MapPlacePrediction[];
    },

    async getPlaceDetails(placeId: string) {
      if (!placeId) return null;
      const response = await apiBridge.post<PlaceDetailsResponse>(
        apiRoutes.user.mapDiscovery,
        {
          type: 'place_details',
          place_id: placeId,
        },
      );

      return mapGooglePlace(response.place);
    },

    async getRoute(input) {
      const response = await apiBridge.post<RouteResponse>(
        apiRoutes.user.mapDiscovery,
        {
          type: 'route',
          origin_lat: input.originLat,
          origin_lng: input.originLng,
          destination_lat: input.destinationLat,
          destination_lng: input.destinationLng,
          mode: input.mode ?? 'walking',
        },
      );

      return mapRoute(response);
    },

    async getRoutes(input) {
      const response = await apiBridge.post<RouteResponse>(
        apiRoutes.user.mapDiscovery,
        {
          type: 'route',
          origin_lat: input.originLat,
          origin_lng: input.originLng,
          destination_lat: input.destinationLat,
          destination_lng: input.destinationLng,
          mode: input.mode ?? 'walking',
        },
      );

      return mapRoutes(response);
    },

    async getFriends(input: FriendsInput): Promise<FriendsResult> {
      // Build type param: "following" and/or "followers"
      const types = input.type ?? ['following', 'followers'];

      const response = await apiBridge.post<FriendsResponse>(
        apiRoutes.user.friends,
        {
          user_id: input.userId,
          type: types.join(','),
          limit: String(input.limit ?? 20),
          following_offset: input.followingOffset
            ? String(input.followingOffset)
            : undefined,
          followers_offset: input.followersOffset
            ? String(input.followersOffset)
            : undefined,
        },
      );

      const data = response.data ?? { following: [], followers: [] };

      return {
        following: mapUserList(data.following),
        followers: mapUserList(data.followers),
      };
    },

    async updateCurrentUser(input: UpdateCurrentUserInput) {
      const payload = toUpdateCurrentUserPayload(input);
      const response = hasUploadFile(payload)
        ? await apiBridge.multipart<UpdateUserResponse>(
            apiRoutes.user.update,
            payload,
          )
        : await apiBridge.post<UpdateUserResponse>(
            apiRoutes.user.update,
            payload,
          );

      return {
        message: response.message,
      };
    },
  };
}
