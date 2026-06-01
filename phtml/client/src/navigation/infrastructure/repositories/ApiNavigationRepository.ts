// English description: Nuxt API backed implementation of the navigation header repository.

import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "../../../shared-kernel/infrastructure/http/nuxt-api-client"
import type { NavigationRepository } from "../../domain/repositories/NavigationRepository"
import type { HeaderRequestAction, HeaderRequestItem, HeaderRequestsSummary } from "../../domain/types/navigation-requests.types"
import type { HeaderSearchSuggestion } from "../../domain/types/navigation-search.types"
import type { NavigationGeneral } from "../../domain/types/navigation.types"

const navigationApiRoutes = {
  requests: "navigation/requests",
  requestAction: "navigation/requests/action",
} as const

export function createApiNavigationRepository(): NavigationRepository {
  const client = useNuxtApiClient()

  return {
    getGeneral: () => client.get<NavigationGeneral>(apiRoutes.navigation.general),
    getRequests: () => client.get<HeaderRequestsSummary>(navigationApiRoutes.requests),
    getSearchSuggestions: async (query, limit = 8) => {
      const response = await client.get<{ items: HeaderSearchSuggestion[] }>(apiRoutes.search.suggestions, {
        q: query,
        limit,
      })
      return response.items ?? []
    },
    updateRequest: async (item: HeaderRequestItem, action: HeaderRequestAction) => {
      await client.post<{ ok: true }>(navigationApiRoutes.requestAction, {
        id: item.id,
        kind: item.kind,
        action,
      })
    },
  }
}
