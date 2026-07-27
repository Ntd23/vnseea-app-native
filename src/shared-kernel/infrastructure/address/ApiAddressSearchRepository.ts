// Description: Calls the dedicated address-only Google pipeline exposed by map_discovery.
import { apiRoutes } from '../../application/constants/route-registry';
import { parseMapCoordinate } from '../../application/utils/mapCoordinate';
import type {
  AddressLocationBias,
  AddressSearchInput,
  AddressSearchLanguage,
  AddressSuggestion,
  NearbyAddressSuggestion,
  ResolvedAddress,
  ReverseGeocodeResult,
} from '../../domain/types/addressSearch.types';
import { apiBridge } from '../api/apiBridge';
import { apiConfig } from '../config/env';
import { readLastMapLocation } from '../storage/mapLocationStorage';

type RawAddressSuggestion = {
  place_id?: unknown;
  placeId?: unknown;
  description?: unknown;
  main_text?: unknown;
  mainText?: unknown;
  secondary_text?: unknown;
  secondaryText?: unknown;
  source?: unknown;
  lat?: unknown;
  lng?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

type RawResolvedAddress = {
  place_id?: unknown;
  placeId?: unknown;
  name?: unknown;
  formatted_address?: unknown;
  formattedAddress?: unknown;
  address?: unknown;
  vicinity?: unknown;
  lat?: unknown;
  lng?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  city?: unknown;
  district?: unknown;
  ward?: unknown;
  country?: unknown;
  distance_meters?: unknown;
  distanceMeters?: unknown;
  geometry?: {
    location?: {
      lat?: unknown;
      lng?: unknown;
    };
  };
};

type AddressSuggestionsResponse = {
  api_status?: number | string;
  error_code?: unknown;
  errors?: { error_id?: unknown };
  predictions?: RawAddressSuggestion[];
  address?: RawResolvedAddress;
};

type AddressDetailsResponse = {
  api_status?: number | string;
  error_code?: unknown;
  errors?: { error_id?: unknown };
  place?: RawResolvedAddress;
  address?: RawResolvedAddress;
  nearby_places?: RawResolvedAddress[];
  nearbyPlaces?: RawResolvedAddress[];
};

type AddressDetailsInput = {
  language: AddressSearchLanguage;
  country: 'vn';
  sessionToken: string;
};

type ReverseGeocodeInput = AddressDetailsInput & AddressLocationBias;

const ADDRESS_BIAS_RADIUS_METERS = 50000;
const NEARBY_ADDRESS_RADIUS_METERS = 600;
const NEARBY_ADDRESS_LIMIT = 5;
const DIRECT_GOOGLE_NEARBY_TIMEOUT_MS = 2600;
const GOOGLE_MAPS_ANDROID_PACKAGE = 'com.vnseea.android';

function stringValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
}

function uniqueAddressParts(values: unknown[]) {
  const seen = new Set<string>();
  return values
    .map(stringValue)
    .filter(value => {
      if (!value) return false;
      const key = value.toLocaleLowerCase('vi');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function resolvedAddressLabel(raw: RawResolvedAddress) {
  const name = stringValue(raw.name);
  const address = stringValue(
    raw.formatted_address ??
      raw.formattedAddress ??
      raw.address ??
      raw.vicinity,
  );
  const areaAddress = uniqueAddressParts([
    raw.ward,
    raw.district,
    raw.city,
    raw.country,
  ]).join(', ');
  const baseAddress = address || areaAddress;

  if (!name) return baseAddress;
  if (!baseAddress) return name;

  const normalizedName = name.toLocaleLowerCase('vi');
  const normalizedAddress = baseAddress.toLocaleLowerCase('vi');
  if (
    normalizedAddress.includes(normalizedName) ||
    normalizedName.includes(normalizedAddress)
  ) {
    return baseAddress.length >= name.length ? baseAddress : name;
  }

  return `${name}, ${baseAddress}`;
}

function mapResolvedAddress(
  raw: RawResolvedAddress | undefined,
  fallbackCoordinate?: AddressLocationBias,
  fallbackPlaceId = '',
): ResolvedAddress | null {
  if (!raw) return null;
  const coordinate =
    parseMapCoordinate(
      raw.lat ?? raw.latitude,
      raw.lng ?? raw.longitude,
    ) ??
    parseMapCoordinate(
      fallbackCoordinate?.latitude,
      fallbackCoordinate?.longitude,
    );
  const formattedAddress = resolvedAddressLabel(raw);
  if (!coordinate || !formattedAddress) return null;

  return {
    placeId:
      stringValue(raw.place_id ?? raw.placeId) || fallbackPlaceId,
    formattedAddress,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    city: stringValue(raw.city) || undefined,
    district: stringValue(raw.district) || undefined,
    ward: stringValue(raw.ward) || undefined,
    country: stringValue(raw.country) || undefined,
  };
}

function distanceMetersBetween(
  origin: AddressLocationBias,
  destination: AddressLocationBias,
) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(
    destination.latitude - origin.latitude,
  );
  const longitudeDelta = toRadians(
    destination.longitude - origin.longitude,
  );
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(
    earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)),
  );
}

function mapNearbyAddressSuggestion(
  raw: RawResolvedAddress,
  origin: AddressLocationBias,
): NearbyAddressSuggestion | null {
  const coordinate = parseMapCoordinate(
    raw.lat ?? raw.latitude ?? raw.geometry?.location?.lat,
    raw.lng ?? raw.longitude ?? raw.geometry?.location?.lng,
  );
  if (!coordinate) return null;

  const name = stringValue(raw.name);
  const formattedAddress = resolvedAddressLabel(raw);
  if (!name && !formattedAddress) return null;

  const rawDistance = Number(raw.distance_meters ?? raw.distanceMeters);
  return {
    placeId: stringValue(raw.place_id ?? raw.placeId),
    name: name || formattedAddress,
    formattedAddress: formattedAddress || name,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    distanceMeters: Number.isFinite(rawDistance)
      ? Math.max(0, Math.round(rawDistance))
      : distanceMetersBetween(origin, coordinate),
  };
}

function googleRequestHeaders(): Record<string, string> {
  const certificate = String(apiConfig.googleMapsAndroidCertSha1 || '')
    .replace(/[^0-9a-f]/gi, '')
    .toUpperCase();
  if (!certificate) return { Accept: 'application/json' };
  return {
    Accept: 'application/json',
    'X-Android-Package': GOOGLE_MAPS_ANDROID_PACKAGE,
    'X-Android-Cert': certificate,
  };
}

async function loadDirectNearbyAddressSuggestions(
  input: ReverseGeocodeInput,
): Promise<NearbyAddressSuggestion[]> {
  if (!apiConfig.googleMapsApiKey) return [];

  const params = new URLSearchParams({
    location: `${input.latitude.toFixed(7)},${input.longitude.toFixed(7)}`,
    radius: String(NEARBY_ADDRESS_RADIUS_METERS),
    language: input.language,
    key: apiConfig.googleMapsApiKey,
  });
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DIRECT_GOOGLE_NEARBY_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`,
      {
        signal: controller.signal,
        headers: googleRequestHeaders(),
      },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as {
      status?: string;
      results?: RawResolvedAddress[];
    };
    if (data.status !== 'OK') return [];

    const seen = new Set<string>();
    return (data.results || [])
      .map(raw => mapNearbyAddressSuggestion(raw, input))
      .filter((value): value is NearbyAddressSuggestion => value !== null)
      .sort(
        (left, right) =>
          (left.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
          (right.distanceMeters ?? Number.MAX_SAFE_INTEGER),
      )
      .filter(item => {
        const key =
          item.placeId ||
          `${item.formattedAddress.toLocaleLowerCase('vi')}:${item.latitude.toFixed(5)}:${item.longitude.toFixed(5)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, NEARBY_ADDRESS_LIMIT);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function isSuccess(status: number | string | undefined) {
  return Number(status) === 200;
}

function assertSuccess(
  response: {
    api_status?: number | string;
    error_code?: unknown;
    errors?: { error_id?: unknown };
  },
) {
  if (isSuccess(response.api_status)) return;
  throw new Error(
    stringValue(response.error_code ?? response.errors?.error_id) ||
      'address_not_found',
  );
}

function mapSuggestion(
  raw: RawAddressSuggestion,
  fallbackSource: AddressSuggestion['source'],
): AddressSuggestion | null {
  const description = stringValue(raw.description);
  const placeId = stringValue(raw.place_id ?? raw.placeId);
  if (!description || !placeId) return null;

  const coordinate = parseMapCoordinate(
    raw.lat ?? raw.latitude,
    raw.lng ?? raw.longitude,
  );
  const rawSource = stringValue(raw.source);

  return {
    placeId,
    description,
    mainText:
      stringValue(raw.main_text ?? raw.mainText) || description,
    secondaryText: stringValue(raw.secondary_text ?? raw.secondaryText),
    source: rawSource === 'geocode' ? 'geocode' : fallbackSource,
    latitude: coordinate?.latitude,
    longitude: coordinate?.longitude,
  };
}

function mapAddressAsSuggestion(
  raw: RawResolvedAddress,
): AddressSuggestion | null {
  const description = stringValue(
    raw.formatted_address ?? raw.formattedAddress ?? raw.address,
  );
  const placeId = stringValue(raw.place_id ?? raw.placeId);
  if (!description || !placeId) return null;
  const coordinate = parseMapCoordinate(
    raw.lat ?? raw.latitude,
    raw.lng ?? raw.longitude,
  );
  const [mainText, ...secondaryParts] = description
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  return {
    placeId,
    description,
    mainText: mainText || description,
    secondaryText: secondaryParts.join(', '),
    source: 'geocode',
    latitude: coordinate?.latitude,
    longitude: coordinate?.longitude,
  };
}

function suggestionPayload(input: AddressSearchInput) {
  const payload: Record<string, string | number> = {
    query: input.query.trim(),
    language: input.language,
    country: input.country,
    sessiontoken: input.sessionToken,
  };
  const bias = resolveAddressLocationBias(input.locationBias);
  if (bias) {
    payload.origin_lat = bias.latitude;
    payload.origin_lng = bias.longitude;
    payload.radius = ADDRESS_BIAS_RADIUS_METERS;
  }
  return payload;
}

export function createAddressSessionToken() {
  const random = Math.random().toString(36).slice(2, 14);
  return `address_${Date.now().toString(36)}_${random}`;
}

export function resolveAddressLocationBias(
  explicit?: AddressLocationBias,
): AddressLocationBias | undefined {
  const explicitCoordinate = parseMapCoordinate(
    explicit?.latitude,
    explicit?.longitude,
  );
  if (explicitCoordinate) return explicitCoordinate;

  const persisted = readLastMapLocation();
  const persistedCoordinate = parseMapCoordinate(
    persisted?.latitude,
    persisted?.longitude,
  );
  return persistedCoordinate ?? undefined;
}

export function createAddressSearchRepository() {
  const loadSuggestions = async (
    type: 'address_autocomplete' | 'address_geocode',
    input: AddressSearchInput,
  ) => {
    const response = await apiBridge.post<AddressSuggestionsResponse>(
      apiRoutes.user.mapDiscovery,
      {
        type,
        ...suggestionPayload(input),
      },
    );
    assertSuccess(response);
    const fallbackSource =
      type === 'address_geocode' ? 'geocode' : 'autocomplete';
    const suggestions = (response.predictions || [])
      .map(raw => mapSuggestion(raw, fallbackSource))
      .filter((value): value is AddressSuggestion => value !== null);
    if (suggestions.length > 0 || !response.address) return suggestions;
    const geocoded = mapAddressAsSuggestion(response.address);
    return geocoded ? [geocoded] : [];
  };

  return {
    searchAddresses(input: AddressSearchInput) {
      return loadSuggestions('address_autocomplete', input);
    },

    geocodeAddress(input: AddressSearchInput) {
      return loadSuggestions('address_geocode', input);
    },

    async resolveAddressSuggestion(
      suggestion: AddressSuggestion,
      input: AddressDetailsInput,
    ): Promise<ResolvedAddress> {
      const response = await apiBridge.post<AddressDetailsResponse>(
        apiRoutes.user.mapDiscovery,
        {
          type: 'address_details',
          place_id: suggestion.placeId,
          language: input.language,
          country: input.country,
          sessiontoken: input.sessionToken,
        },
      );
      assertSuccess(response);
      const place = response.place ?? response.address;
      const coordinate = parseMapCoordinate(
        place?.lat ?? place?.latitude,
        place?.lng ?? place?.longitude,
      );
      if (!place || !coordinate) {
        throw new Error('address_not_found');
      }

      return (
        mapResolvedAddress(place, coordinate, suggestion.placeId) || {
          placeId: suggestion.placeId,
          formattedAddress: suggestion.description,
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        }
      );
    },

    async reverseGeocodeCoordinate(
      input: ReverseGeocodeInput,
    ): Promise<ReverseGeocodeResult> {
      let primaryError: unknown;
      let directNearbyPromise: Promise<NearbyAddressSuggestion[]> | null = null;
      const loadDirectNearby = () => {
        directNearbyPromise ??= loadDirectNearbyAddressSuggestions(input);
        return directNearbyPromise;
      };
      const resolveNearbySuggestions = async (
        rawSuggestions?: RawResolvedAddress[],
      ) => {
        const backendSuggestions = (rawSuggestions || [])
          .map(raw => mapNearbyAddressSuggestion(raw, input))
          .filter(
            (value): value is NearbyAddressSuggestion => value !== null,
          )
          .sort(
            (left, right) =>
              (left.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
              (right.distanceMeters ?? Number.MAX_SAFE_INTEGER),
          )
          .slice(0, NEARBY_ADDRESS_LIMIT);
        return backendSuggestions.length > 0
          ? backendSuggestions
          : loadDirectNearby();
      };

      try {
        const response = await apiBridge.post<AddressDetailsResponse>(
          apiRoutes.user.mapDiscovery,
          {
            type: 'reverse_geocode',
            lat: input.latitude,
            lng: input.longitude,
            language: input.language,
            country: input.country,
          },
        );
        assertSuccess(response);
        const resolved = mapResolvedAddress(
          response.place ?? response.address,
          input,
        );
        const nearbySuggestions = await resolveNearbySuggestions(
          response.nearby_places ?? response.nearbyPlaces,
        );
        if (resolved) {
          return { ...resolved, nearbySuggestions };
        }
        const nearest = nearbySuggestions[0];
        if (nearest) {
          return {
            placeId: nearest.placeId,
            formattedAddress: nearest.formattedAddress,
            latitude: nearest.latitude,
            longitude: nearest.longitude,
            nearbySuggestions,
          };
        }
        primaryError = new Error('address_not_found');
      } catch (error) {
        primaryError = error;
      }

      // Some deployed map_discovery versions return the canonical payload
      // under `address`, while older versions only expose `place`. If neither
      // contains a usable label, retry through the dedicated address geocoder
      // so current-location selection still gets a human-readable address.
      try {
        const coordinateQuery = `${input.latitude.toFixed(7)},${input.longitude.toFixed(7)}`;
        const suggestions = await loadSuggestions('address_geocode', {
          query: coordinateQuery,
          language: input.language,
          country: input.country,
          locationBias: input,
          sessionToken: input.sessionToken,
        });
        const fallback = suggestions[0];
        if (fallback?.description) {
          const nearbySuggestions = await loadDirectNearby();
          return {
            placeId: fallback.placeId,
            formattedAddress: fallback.description,
            latitude: fallback.latitude ?? input.latitude,
            longitude: fallback.longitude ?? input.longitude,
            nearbySuggestions,
          };
        }
      } catch {
        // Preserve the primary reverse-geocode error below.
      }

      const nearbySuggestions = await loadDirectNearby();
      const nearest = nearbySuggestions[0];
      if (nearest) {
        return {
          placeId: nearest.placeId,
          formattedAddress: nearest.formattedAddress,
          latitude: nearest.latitude,
          longitude: nearest.longitude,
          nearbySuggestions,
        };
      }

      throw primaryError instanceof Error
        ? primaryError
        : new Error('address_not_found');
    },
  };
}

export type AddressSearchRepository = ReturnType<
  typeof createAddressSearchRepository
>;
