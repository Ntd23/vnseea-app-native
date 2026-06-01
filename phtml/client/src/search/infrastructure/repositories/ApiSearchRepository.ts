import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import type { ApiQuery } from "#shared-kernel/domain/types/api.types"
import type { SearchRepository } from "../../domain/repositories/SearchRepository"
import type { SearchBackendFilters, SearchResultsByType } from "../../domain/types/search.types"

export function createApiSearchRepository(): SearchRepository {
  const client = useNuxtApiClient()

  return {
    async search(
      keyword: string,
      filters: Partial<SearchBackendFilters> = {},
      limit = 35,
    ): Promise<SearchResultsByType> {
      const query = keyword.trim()

      const requestQuery: ApiQuery = {
        q: query,
        limit,
      }

      if (filters.type) requestQuery.type = filters.type
      if (filters.country) requestQuery.country = filters.country
      if (filters.filterbyage) requestQuery.filterbyage = filters.filterbyage
      if (filters.age_from) requestQuery.age_from = filters.age_from
      if (filters.age_to) requestQuery.age_to = filters.age_to
      if (filters.verified) requestQuery.verified = filters.verified
      if (filters.status) requestQuery.status = filters.status
      if (filters.gender) requestQuery.gender = filters.gender
      if (filters.image) requestQuery.image = filters.image

      return await client.get<SearchResultsByType>(apiRoutes.search.index, requestQuery)
    },
  }
}
