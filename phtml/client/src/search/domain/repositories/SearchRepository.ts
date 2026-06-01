import type { SearchBackendFilters, SearchResultsByType } from "../types/search.types"

export interface SearchRepository {
  search(keyword: string, filters?: Partial<SearchBackendFilters>, limit?: number): Promise<SearchResultsByType>
}
