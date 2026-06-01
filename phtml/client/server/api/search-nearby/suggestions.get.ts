// English description: Bridges nearby search suggestion requests to the PHP session-backed nearby source.

import { getQuery } from "h3"
import { fetchNearbySearchFromBackend } from "../../utils/nearby-search-bridge"
import type { NearbySearchResponse } from "../../../src/search-nearby/domain/types/search-nearby.types"

const readString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

export default defineEventHandler(async (event): Promise<NearbySearchResponse> => {
  const query = getQuery(event)
  const keyword = readString(query.q || query.query)

  if (keyword.length < 3) {
    return {
      status: "ready",
      origin: {
        address: "",
        lat: null,
        lng: null,
      },
      items: [],
    }
  }

  return await fetchNearbySearchFromBackend(event, {
    query: keyword,
    type: query.type,
    distance: query.distance,
    limit: query.limit,
    defaultLimit: 8,
    maxLimit: 8,
  })
})
