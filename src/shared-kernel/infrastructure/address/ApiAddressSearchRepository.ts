// Description: Calls the dedicated address-only Google pipeline exposed by map_discovery.
import { apiRoutes } from '../../application/constants/route-registry';
import { parseMapCoordinate } from '../../application/utils/mapCoordinate';
import type {
  AddressLocationBias,
  AddressSearchInput,
  AddressSearchLanguage,
  AddressSuggestion,
  ResolvedAddress,
} from '../../domain/types/addressSearch.types';
import { apiBridge } from '../api/apiBridge';
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
  formatted_address?: unknown;
  formattedAddress?: unknown;
  address?: unknown;
  lat?: unknown;
  lng?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  city?: unknown;
  district?: unknown;
  ward?: unknown;
  country?: unknown;
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
};

type AddressDetailsInput = {
  language: AddressSearchLanguage;
  country: 'vn';
  sessionToken: string;
};

const ADDRESS_BIAS_RADIUS_METERS = 50000;

function stringValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
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

      return {
        placeId:
          stringValue(place.place_id ?? place.placeId) || suggestion.placeId,
        formattedAddress:
          stringValue(
            place.formatted_address ??
              place.formattedAddress ??
              place.address,
          ) || suggestion.description,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        city: stringValue(place.city) || undefined,
        district: stringValue(place.district) || undefined,
        ward: stringValue(place.ward) || undefined,
        country: stringValue(place.country) || undefined,
      };
    },
  };
}

export type AddressSearchRepository = ReturnType<
  typeof createAddressSearchRepository
>;
