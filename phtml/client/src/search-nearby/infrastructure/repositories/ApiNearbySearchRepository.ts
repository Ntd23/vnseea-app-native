// English description: Nuxt API backed repository for nearby user and page discovery.

import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import type { ApiQuery } from "#shared-kernel/domain/types/api.types"
import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import type { NearbySearchRepository } from "../../domain/repositories/NearbySearchRepository"
import type {
  NearbySearchQuery,
  NearbySearchResponse,
} from "../../domain/types/search-nearby.types"

export function createApiNearbySearchRepository(): NearbySearchRepository {
  const client = useNuxtApiClient()

  const toRequestQuery = (query: NearbySearchQuery): ApiQuery => ({
    q: query.q.trim(),
    type: query.type,
    distance: query.distanceKm,
    limit: query.limit,
  })

  return {
    async searchNearby(query: NearbySearchQuery) {
      return await client.get<NearbySearchResponse>(apiRoutes.searchNearby.index, toRequestQuery(query))
    },

    async searchSuggestions(query: NearbySearchQuery) {
      return await client.get<NearbySearchResponse>(apiRoutes.searchNearby.suggestions, toRequestQuery(query))
    },
  }
}
