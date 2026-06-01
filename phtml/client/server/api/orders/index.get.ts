// English description: Returns buyer orders from the PHP marketplace purchased endpoint.

import { getQuery } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { normalizePurchasedResponse } from "./_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const query = getQuery(event)

  const response = await client.post<Parameters<typeof normalizePurchasedResponse>[1]>("market", {
    type: "purchased",
    limit: 50,
    offset: query.offset,
  })

  return normalizePurchasedResponse(event, response)
})
