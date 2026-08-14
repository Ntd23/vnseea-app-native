import type { NearbyPagesInput } from '../../domain/types/user.types';

export type MapPageSearchRequest = {
  type: 'page_suggestions';
  query: string;
  distance?: string | number;
  limit?: number;
  origin_lat?: string | number;
  origin_lng?: string | number;
  fast?: 1;
  global_search?: 1;
};

export function buildMapPageSearchRequest(
  input: NearbyPagesInput = {},
): MapPageSearchRequest {
  return {
    type: 'page_suggestions',
    query: input.keyword?.trim() ?? '',
    distance: input.globalSearch ? undefined : input.distance,
    limit: input.limit,
    origin_lat: input.lat,
    origin_lng: input.lng,
    fast: input.fast ? 1 : undefined,
    global_search: input.globalSearch ? 1 : undefined,
  };
}
