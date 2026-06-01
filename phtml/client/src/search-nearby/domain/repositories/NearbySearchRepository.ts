// English description: Repository contract for nearby user and page search.

import type {
  NearbySearchQuery,
  NearbySearchResponse,
} from "../types/search-nearby.types"

export interface NearbySearchRepository {
  searchNearby(query: NearbySearchQuery): Promise<NearbySearchResponse>
  searchSuggestions(query: NearbySearchQuery): Promise<NearbySearchResponse>
}
