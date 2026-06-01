// English description: Returns normalized full search results for the main search page using backend users, pages, and groups.

import type { SearchApiResponse } from "./_shared"
import { emptySearchResponse, fetchBackendSearch } from "./_shared"

export default defineEventHandler(async (event): Promise<SearchApiResponse> => {
  const response = await fetchBackendSearch(event)

  return {
    ...emptySearchResponse(),
    users: response.users,
    pages: response.pages,
    groups: response.groups,
  }
})
