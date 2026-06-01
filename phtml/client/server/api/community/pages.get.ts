// English description: Returns community page directory data from the PHP backend for the requested mode.

import { getQuery } from "h3"
import { fetchCommunityPages, fetchSuggestedCommunityPages } from "./_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const mode = String(query.mode || "mine")

  if (mode === "suggested") {
    return await fetchSuggestedCommunityPages(event)
  }

  if (mode === "favorite") {
    return await fetchCommunityPages(event, "liked_pages")
  }

  return await fetchCommunityPages(event, "pages")
})
