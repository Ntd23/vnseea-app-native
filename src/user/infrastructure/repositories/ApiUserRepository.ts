// Description: Implements the user repository through the shared API bridge.
import type {
  ApiEnvelope,
  RawApiRecord,
} from '../../../shared-kernel/domain/types/api.types';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { createAsyncResourceCache } from '../../../shared-kernel/application/utils/asyncResourceCache';
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
import { isGoogleNearbyCategoryType } from '../../application/utils/mapSearchCategory';

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
  durationWithoutTrafficSeconds?: number | string;
  duration_without_traffic_seconds?: number | string;
  durationInTrafficSeconds?: number | string;
  duration_in_traffic_seconds?: number | string;
  trafficDelaySeconds?: number | string;
  traffic_delay_seconds?: number | string;
  trafficLevel?: string;
  traffic_level?: string;
  trafficLabel?: string;
  traffic_label?: string;
  trafficAvailable?: boolean | number | string;
  traffic_available?: boolean | number | string;
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

const NEARBY_DISCOVERY_CACHE_TTL_MS = 45 * 1000;
const PLACE_PREDICTION_CACHE_TTL_MS = 60 * 1000;
const PLACE_DETAILS_CACHE_TTL_MS = 10 * 60 * 1000;
const PAGE_PIN_STATUS_CACHE_TTL_MS = 10 * 60 * 1000;
const ROUTE_CACHE_TTL_MS = 12 * 1000;
const DIRECT_GOOGLE_TIMEOUT_MS = 1700;
const DIRECT_GOOGLE_DETAILS_TIMEOUT_MS = 1800;
const MAP_SEARCH_RESPONSE_BUDGET_MS = 1800;
const GOOGLE_MAPS_ANDROID_PACKAGE = 'com.vnseea.android';
const PAGE_PIN_WARM_LIMIT = 4;
const PAGE_PIN_WARM_CONCURRENCY = 2;
const PAGE_PIN_WARM_DELAY_MS = 800;

const nearbyUsersCache = createAsyncResourceCache<UserProfile[]>({
  ttlMs: 20 * 1000,
  maxEntries: 24,
});
const nearbyPlacesCache = createAsyncResourceCache<NearbyPlace[]>({
  ttlMs: NEARBY_DISCOVERY_CACHE_TTL_MS,
  maxEntries: 24,
});
const nearbyPagesCache = createAsyncResourceCache<NearbyPlace[]>({
  ttlMs: NEARBY_DISCOVERY_CACHE_TTL_MS,
  maxEntries: 40,
});
const placePredictionsCache = createAsyncResourceCache<MapPlacePrediction[]>({
  ttlMs: PLACE_PREDICTION_CACHE_TTL_MS,
  maxEntries: 80,
});
const placeDetailsCache = createAsyncResourceCache<NearbyPlace | null>({
  ttlMs: PLACE_DETAILS_CACHE_TTL_MS,
  maxEntries: 160,
});
const pagePinStatusCache = createAsyncResourceCache<string | null>({
  ttlMs: PAGE_PIN_STATUS_CACHE_TTL_MS,
  maxEntries: 200,
});
const routeResponseCache = createAsyncResourceCache<RouteResponse>({
  ttlMs: ROUTE_CACHE_TTL_MS,
  maxEntries: 48,
});

function normalizeCacheText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('vi')
    .replace(/\s+/g, ' ');
}

function isValidGeoCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function googleRequestHeaders(): Record<string, string> {
  const certificate = String(apiConfig.googleMapsAndroidCertSha1 || '')
    .replace(/[^0-9a-f]/gi, '')
    .toUpperCase();

  if (!certificate) return { Accept: 'application/json' };

  // Google accepts Android-restricted web-service keys when both identity
  // headers are present. The certificate is compiled from .env so release
  // builds can use their own signing certificate without changing source.
  return {
    Accept: 'application/json',
    'X-Android-Package': GOOGLE_MAPS_ANDROID_PACKAGE,
    'X-Android-Cert': certificate,
  };
}

function coordinateCachePart(value: unknown, precision = 3) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? numericValue.toFixed(precision)
    : '';
}

function currentSessionCacheKey() {
  return (
    sessionStorage.getSession()?.userId ||
    sessionStorage.getAccessToken()?.slice(-12) ||
    'guest'
  );
}

function nearbyUsersCacheKey(input?: NearbyUsersInput) {
  return [
    currentSessionCacheKey(),
    input?.limit ?? '',
    input?.offset ?? '',
    input?.gender ?? '',
    normalizeCacheText(input?.keyword),
    input?.status ?? '',
    input?.distance ?? '',
    input?.relationship ?? '',
    coordinateCachePart(input?.lat),
    coordinateCachePart(input?.lng),
  ].join('|');
}

function nearbyPlacesCacheKey(input?: NearbyPlacesInput) {
  return [
    currentSessionCacheKey(),
    input?.limit ?? '',
    input?.offset ?? '',
    normalizeCacheText(input?.keyword),
    input?.distance ?? '',
  ].join('|');
}

function nearbyPagesCacheKey(input?: NearbyPagesInput) {
  const payload = toNearbyPagesQuery(input);
  return [
    currentSessionCacheKey(),
    normalizeCacheText(payload.query),
    input?.distance ?? '',
    input?.limit ?? '',
    coordinateCachePart(input?.lat),
    coordinateCachePart(input?.lng),
    input?.fast ? 'fast' : 'full',
  ].join('|');
}

function placePredictionCacheKey(input: {
  query: string;
  category?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  fast?: boolean;
}) {
  return [
    normalizeCacheText(input.query),
    normalizeCacheText(input.category),
    coordinateCachePart(input.lat),
    coordinateCachePart(input.lng),
    input.radius ?? '',
    input.fast ? 'fast' : 'full',
  ].join('|');
}

function routeCacheKey(input: {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  mode?: string;
}) {
  return [
    coordinateCachePart(input.originLat, 5),
    coordinateCachePart(input.originLng, 5),
    coordinateCachePart(input.destinationLat, 5),
    coordinateCachePart(input.destinationLng, 5),
    input.mode ?? 'walking',
  ].join('|');
}

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
  if (!pageId) return null;

  return pagePinStatusCache.getOrLoad(pageId, async () => {
    const response = await apiBridge
      .post<PageDetailsResponse>(apiRoutes.pages.getById, { page_id: pageId })
      .catch(() => undefined);
    return readMapPinStatus(response?.page_data) ?? null;
  });
}

function applyMapPinStatus(page: NearbyPlace, mapPinStatus?: string | null) {
  if (!mapPinStatus) return page;

  const isApproved = mapPinStatus.trim().toLowerCase() === 'approved';
  return {
    ...page,
    mapPinStatus,
    mapPinApproved: isApproved,
    isPinned: isApproved,
  };
}

function applyCachedNearbyPageMapPinStatus(pages: NearbyPlace[]) {
  return pages.map(page => {
    if (!page.pageId || page.mapPinStatus) return page;
    return applyMapPinStatus(page, pagePinStatusCache.get(page.pageId));
  });
}

async function warmNearbyPageMapPinStatuses(pages: NearbyPlace[]) {
  const candidates = pages
    .filter(
      page =>
        Boolean(page.pageId) &&
        !page.mapPinStatus &&
        pagePinStatusCache.get(page.pageId as string) === undefined,
    )
    .slice(0, PAGE_PIN_WARM_LIMIT);

  for (
    let index = 0;
    index < candidates.length;
    index += PAGE_PIN_WARM_CONCURRENCY
  ) {
    const batch = candidates.slice(index, index + PAGE_PIN_WARM_CONCURRENCY);
    await Promise.all(
      batch.map(page => fetchPageMapPinStatus(page.pageId as string)),
    );
  }
}

async function requestNearbyPages(input?: NearbyPagesInput) {
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
      fast: input?.fast ? 1 : undefined,
    },
    input?.keyword ? { timeout: MAP_SEARCH_RESPONSE_BUDGET_MS } : undefined,
  );

  const pages = (response.items ?? [])
    .map(record => mapNearbyPage(record, apiConfig.webBaseUrl))
    .filter(Boolean) as NearbyPlace[];

  return pages;
}

async function fetchNearbyPages(input?: NearbyPagesInput) {
  const pages = await nearbyPagesCache.getOrLoad(
    nearbyPagesCacheKey(input),
    () => requestNearbyPages(input),
  );
  const hydratedPages = applyCachedNearbyPageMapPinStatus(pages);

  // Map pins are supplementary metadata. Warm a small bounded set in the
  // background instead of blocking the first useful map render with N+1 calls.
  if (!input?.fast) {
    setTimeout(() => {
      warmNearbyPageMapPinStatuses(hydratedPages).catch(() => undefined);
    }, PAGE_PIN_WARM_DELAY_MS);
  }

  return hydratedPages;
}

function mapPlacePrediction(record: RawApiRecord): MapPlacePrediction | null {
  const placeId = String(record.place_id ?? '');
  const description = String(record.description ?? '');
  if (!placeId || !description) return null;

  const rawLat =
    record.lat !== undefined && record.lat !== null
      ? Number(record.lat)
      : NaN;
  const rawLng =
    record.lng !== undefined && record.lng !== null
      ? Number(record.lng)
      : NaN;
  const hasCoordinate = isValidGeoCoordinate(rawLat, rawLng);

  let types: string[] | undefined;
  if (Array.isArray(record.types)) {
    types = record.types.map(String);
  }
  const photoUrls = Array.isArray(record.photo_urls)
    ? record.photo_urls.map(String).filter(Boolean).slice(0, 3)
    : Array.isArray(record.photo_references) && apiConfig.googleMapsApiKey
      ? record.photo_references
          .map(String)
          .filter(Boolean)
          .slice(0, 3)
          .map(
            reference =>
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=720&photo_reference=${encodeURIComponent(
                reference,
              )}&key=${encodeURIComponent(apiConfig.googleMapsApiKey)}`,
          )
      : undefined;

  return {
    source: 'google',
    placeId,
    description,
    mainText: String(record.main_text || description),
    secondaryText: String(record.secondary_text || ''),
    types,
    lat: hasCoordinate ? rawLat : undefined,
    lng: hasCoordinate ? rawLng : undefined,
    distanceMeters: record.distance_meters !== undefined && record.distance_meters !== null ? Number(record.distance_meters) : undefined,
    icon: record.icon !== undefined && record.icon !== null ? String(record.icon) : undefined,
    iconBackgroundColor: record.icon_background_color !== undefined && record.icon_background_color !== null ? String(record.icon_background_color) : undefined,
    rating:
      record.rating !== undefined && record.rating !== null
        ? Number(record.rating)
        : undefined,
    ratingsTotal:
      record.user_ratings_total !== undefined &&
      record.user_ratings_total !== null
        ? Number(record.user_ratings_total)
        : undefined,
    openNow:
      typeof record.open_now === 'boolean' ? record.open_now : undefined,
    photoUrls,
  };
}

function distanceMetersBetween(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
) {
  const earthRadius = 6371000;
  const latFrom = (origin.latitude * Math.PI) / 180;
  const lngFrom = (origin.longitude * Math.PI) / 180;
  const latTo = (destination.latitude * Math.PI) / 180;
  const lngTo = (destination.longitude * Math.PI) / 180;
  const latDelta = latTo - latFrom;
  const lngDelta = lngTo - lngFrom;
  const angle =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin(latDelta / 2) ** 2 +
          Math.cos(latFrom) * Math.cos(latTo) * Math.sin(lngDelta / 2) ** 2,
      ),
    );

  return earthRadius * angle;
}

function mapGoogleNearbyPrediction(
  record: RawApiRecord,
  origin?: { latitude: number; longitude: number },
): MapPlacePrediction | null {
  const placeId = String(record.place_id ?? '');
  const name = String(record.name ?? '');
  const location = asRecord(asRecord(record.geometry)?.location);
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  if (!placeId || !name || !isValidGeoCoordinate(lat, lng)) {
    return null;
  }

  let types: string[] | undefined;
  if (Array.isArray(record.types)) {
    types = record.types.map(String);
  }

  const coordinate = { latitude: lat, longitude: lng };
  const openingHours = asRecord(record.opening_hours);
  const photoUrls = Array.isArray(record.photos)
    ? record.photos
        .map(photo => asRecord(photo)?.photo_reference)
        .filter(Boolean)
        .slice(0, 3)
        .map(
          reference =>
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=720&photo_reference=${encodeURIComponent(
              String(reference),
            )}&key=${encodeURIComponent(apiConfig.googleMapsApiKey)}`,
        )
    : [];

  return {
    source: 'google',
    placeId,
    description: String(record.vicinity || record.formatted_address || name),
    mainText: name,
    secondaryText: String(record.vicinity || record.formatted_address || ''),
    types,
    lat,
    lng,
    distanceMeters: origin
      ? distanceMetersBetween(origin, coordinate)
      : undefined,
    icon:
      record.icon !== undefined && record.icon !== null
        ? String(record.icon)
        : undefined,
    iconBackgroundColor:
      record.icon_background_color !== undefined &&
      record.icon_background_color !== null
        ? String(record.icon_background_color)
        : undefined,
    rating:
      record.rating !== undefined && record.rating !== null
        ? Number(record.rating)
        : undefined,
    ratingsTotal:
      record.user_ratings_total !== undefined &&
      record.user_ratings_total !== null
        ? Number(record.user_ratings_total)
        : undefined,
    openNow:
      typeof openingHours?.open_now === 'boolean'
        ? openingHours.open_now
        : undefined,
    photoUrls,
  };
}

function mergePlacePredictions(
  primary: MapPlacePrediction[],
  secondary: MapPlacePrediction[],
) {
  const seen = new Set<string>();
  const merged: MapPlacePrediction[] = [];

  [...primary, ...secondary].forEach(item => {
    if (seen.has(item.placeId)) return;
    seen.add(item.placeId);
    merged.push(item);
  });

  return merged;
}

async function getDirectGoogleNearbyPredictions(input: {
  query: string;
  category?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}) {
  const categoryType = normalizeCacheText(input.category);
  if (
    !apiConfig.googleMapsApiKey ||
    !isGoogleNearbyCategoryType(categoryType) ||
    typeof input.lat !== 'number' ||
    typeof input.lng !== 'number'
  ) {
    return [];
  }

  const headers = googleRequestHeaders();
  if (!headers['X-Android-Cert']) return [];

  const origin = { latitude: input.lat, longitude: input.lng };
  const params = new URLSearchParams({
    location: `${input.lat.toFixed(6)},${input.lng.toFixed(6)}`,
    radius: String(Math.min(Math.max(input.radius ?? 3000, 1), 3000)),
    type: categoryType,
    keyword: input.query.trim(),
    language: 'vi',
    key: apiConfig.googleMapsApiKey,
  });
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DIRECT_GOOGLE_TIMEOUT_MS,
  );

  try {
    const startedAt = Date.now();
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`,
      { signal: controller.signal, headers },
    );
    if (!response.ok) return [];

    const data = (await response.json()) as {
      status?: string;
      error_message?: string;
      results?: RawApiRecord[];
    };

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug('[mapDiscovery] direct nearby', {
        query: input.query,
        category: categoryType,
        status: data.status,
        count: data.results?.length ?? 0,
        elapsedMs: Date.now() - startedAt,
        errorMessage: data.error_message || undefined,
      });
    }

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return [];
    }

    return (data.results ?? [])
      .map(record => mapGoogleNearbyPrediction(record, origin))
      .filter(Boolean) as MapPlacePrediction[];
  } catch (error) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug('[mapDiscovery] direct nearby unavailable', String(error));
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function getDirectGooglePlaceDetails(placeId: string) {
  if (!apiConfig.googleMapsApiKey || !placeId) return null;

  const headers = googleRequestHeaders();
  if (!headers['X-Android-Cert']) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'place_id,name,formatted_address,geometry,types,icon',
    language: 'vi',
    key: apiConfig.googleMapsApiKey,
  });
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DIRECT_GOOGLE_DETAILS_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
      { signal: controller.signal, headers },
    );
    if (!response.ok) return null;

    const data = (await response.json()) as {
      status?: string;
      error_message?: string;
      result?: RawApiRecord;
    };
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug('[mapDiscovery] direct details', {
        placeId,
        status: data.status,
        errorMessage: data.error_message || undefined,
      });
    }
    if (data.status !== 'OK' || !data.result) return null;

    const geometry = asRecord(data.result.geometry);
    const location = asRecord(geometry?.location);
    return mapGooglePlace({
      ...data.result,
      address:
        data.result.formatted_address ||
        data.result.vicinity ||
        data.result.name,
      lat: location?.lat,
      lng: location?.lng,
    });
  } catch (error) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug('[mapDiscovery] direct details unavailable', String(error));
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function mapGooglePlace(record: RawApiRecord | undefined): NearbyPlace | null {
  if (!record) return null;
  const placeId = String(record.place_id ?? '');
  const name = String(record.name || record.address || '');
  const latitude = Number(record.lat);
  const longitude = Number(record.lng);
  if (!placeId || !name || !isValidGeoCoordinate(latitude, longitude)) {
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

function mapTrafficLevel(value: unknown): MapRoute['trafficLevel'] | undefined {
  if (value === 'clear' || value === 'normal' || value === 'heavy') {
    return value;
  }

  return undefined;
}

function mapBooleanFlag(value: unknown): boolean | undefined {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }

  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }

  return undefined;
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
    durationWithoutTrafficSeconds:
      Number(
        route.durationWithoutTrafficSeconds ??
          route.duration_without_traffic_seconds ??
          0,
      ) || undefined,
    durationInTrafficSeconds:
      Number(
        route.durationInTrafficSeconds ??
          route.duration_in_traffic_seconds ??
          0,
      ) || undefined,
    trafficDelaySeconds:
      Number(
        route.trafficDelaySeconds ??
          route.traffic_delay_seconds ??
          0,
      ) || undefined,
    trafficLevel: mapTrafficLevel(route.trafficLevel ?? route.traffic_level),
    trafficLabel:
      route.trafficLabel !== undefined && route.trafficLabel !== null
        ? String(route.trafficLabel)
        : route.traffic_label !== undefined && route.traffic_label !== null
          ? String(route.traffic_label)
          : undefined,
    trafficAvailable: mapBooleanFlag(
      route.trafficAvailable ?? route.traffic_available,
    ),
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

async function fetchRouteResponse(input: {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  mode?: 'walking' | 'driving' | 'motorcycle' | 'bicycling' | 'transit';
}) {
  return routeResponseCache.getOrLoad(routeCacheKey(input), () =>
    apiBridge.post<RouteResponse>(apiRoutes.user.mapDiscovery, {
      type: 'route',
      origin_lat: input.originLat,
      origin_lng: input.originLng,
      destination_lat: input.destinationLat,
      destination_lng: input.destinationLng,
      mode: input.mode ?? 'walking',
    }),
  );
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
      return nearbyUsersCache.getOrLoad(nearbyUsersCacheKey(input), async () => {
        const response = await apiBridge.post<NearbyUsersResponse>(
          apiRoutes.user.nearby,
          toNearbyUsersPayload(input),
        );

        return mapUserList(response.nearby_users);
      });
    },

    async getNearbyPlaces(input?: NearbyPlacesInput) {
      return nearbyPlacesCache.getOrLoad(nearbyPlacesCacheKey(input), async () => {
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
      });
    },

    async getNearbyPages(input?: NearbyPagesInput) {
      return fetchNearbyPages(input);
    },

    async getPlacePredictions(input) {
      const trimmedQuery = input.query.trim();
      if (trimmedQuery.length < 3) return [];
      const cacheKey = placePredictionCacheKey({
        ...input,
        query: trimmedQuery,
      });

      return placePredictionsCache.getOrLoad(
        cacheKey,
        async () => {
          type PredictionSourceResult = {
            source: 'backend' | 'direct';
            predictions: MapPlacePrediction[];
            error?: unknown;
          };

          const backendPromise: Promise<PredictionSourceResult> = apiBridge
            .post<PlaceAutocompleteResponse>(
              apiRoutes.user.mapDiscovery,
              {
                type: 'place_autocomplete',
                query: trimmedQuery,
                category: input.category,
                origin_lat: input.lat,
                origin_lng: input.lng,
                radius: input.radius,
                prefer_address: input.category ? undefined : 1,
                fast: input.fast ? 1 : undefined,
              },
              { timeout: MAP_SEARCH_RESPONSE_BUDGET_MS },
            )
            .then(response => ({
              source: 'backend' as const,
              predictions: (response.predictions ?? [])
                .map(mapPlacePrediction)
                .filter(Boolean) as MapPlacePrediction[],
            }))
            .catch(error => ({
              source: 'backend' as const,
              predictions: [],
              error,
            }));
          const directPromise: Promise<PredictionSourceResult> =
            getDirectGoogleNearbyPredictions({
              ...input,
              query: trimmedQuery,
            })
              .then(predictions => ({
                source: 'direct' as const,
                predictions,
              }))
              .catch(error => ({
                source: 'direct' as const,
                predictions: [],
                error,
              }));

          const firstResult = await Promise.race([
            backendPromise,
            directPromise,
          ]);
          const remainingPromise =
            firstResult.source === 'backend' ? directPromise : backendPromise;

          if (firstResult.predictions.length > 0) {
            remainingPromise.then(remainingResult => {
              if (remainingResult.predictions.length === 0) return;
              const directPredictions =
                firstResult.source === 'direct'
                  ? firstResult.predictions
                  : remainingResult.predictions;
              const backendPredictions =
                firstResult.source === 'backend'
                  ? firstResult.predictions
                  : remainingResult.predictions;
              const merged = mergePlacePredictions(
                directPredictions,
                backendPredictions,
              );
              setTimeout(() => placePredictionsCache.set(cacheKey, merged), 0);
            });
            return firstResult.predictions;
          }

          const remainingResult = await remainingPromise;
          if (remainingResult.predictions.length > 0) {
            return remainingResult.predictions;
          }

          if (firstResult.error && remainingResult.error) {
            throw firstResult.error;
          }

          return [];
        },
      );
    },

    async getPlaceDetails(placeId: string) {
      if (!placeId) return null;
      return placeDetailsCache.getOrLoad(placeId, async () => {
        const backendPromise = apiBridge
          .post<PlaceDetailsResponse>(apiRoutes.user.mapDiscovery, {
            type: 'place_details',
            place_id: placeId,
          })
          .then(response => mapGooglePlace(response.place))
          .catch(() => null);
        const directPromise = getDirectGooglePlaceDetails(placeId);
        const firstResult = await Promise.race([
          backendPromise,
          directPromise,
        ]);

        if (firstResult) {
          Promise.all([backendPromise, directPromise]).then(([backend, direct]) => {
            placeDetailsCache.set(placeId, backend || direct || firstResult);
          });
          return firstResult;
        }

        const [backend, direct] = await Promise.all([
          backendPromise,
          directPromise,
        ]);
        return backend || direct;
      });
    },

    async getRoute(input) {
      return mapRoute(await fetchRouteResponse(input));
    },

    async getRoutes(input) {
      return mapRoutes(await fetchRouteResponse(input));
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
