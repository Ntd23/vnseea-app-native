import type { MapPlacePredictionsInput } from '../../domain/types/user.types';

export type MapBusinessSearchRequest = {
  type: 'place_autocomplete';
  search_mode: 'business';
  query: string;
  category?: string;
  origin_lat?: number;
  origin_lng?: number;
  radius?: number;
  fast?: 1;
  global_search?: 1;
};

export function buildMapBusinessSearchRequest(
  input: MapPlacePredictionsInput,
): MapBusinessSearchRequest {
  return {
    type: 'place_autocomplete',
    search_mode: 'business',
    query: input.query.trim(),
    category: input.category,
    origin_lat: input.lat,
    origin_lng: input.lng,
    radius: input.radius,
    fast: input.fast ? 1 : undefined,
    global_search: input.globalSearch ? 1 : undefined,
  };
}

