// English description: Repository contract for header navigation counters and request actions.

import type { HeaderRequestAction, HeaderRequestItem, HeaderRequestsSummary } from "../types/navigation-requests.types"
import type { HeaderSearchSuggestion } from "../types/navigation-search.types"
import type { NavigationGeneral } from "../types/navigation.types"

export interface NavigationRepository {
  getGeneral(): Promise<NavigationGeneral>
  getRequests(): Promise<HeaderRequestsSummary>
  getSearchSuggestions(query: string, limit?: number): Promise<HeaderSearchSuggestion[]>
  updateRequest(item: HeaderRequestItem, action: HeaderRequestAction): Promise<void>
}
