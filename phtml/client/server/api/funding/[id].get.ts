// English description: Returns a single backend-backed funding campaign by hashed id.

import { getRouterParam } from "h3"
import { fetchFundingDetail } from "./_shared"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") || ""

  return await fetchFundingDetail(event, id)
})
