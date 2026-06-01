// English description: Returns community group directory data from the PHP backend for the requested mode.

import { getQuery } from "h3"
import { fetchCommunityGroups, fetchSuggestedCommunityGroups } from "./_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const mode = String(query.mode || "mine")

  if (mode === "joined") {
    return await fetchCommunityGroups(event, "joined_groups")
  }

  if (mode === "suggested") {
    return await fetchSuggestedCommunityGroups(event)
  }

  return await fetchCommunityGroups(event, "my_groups")
})
