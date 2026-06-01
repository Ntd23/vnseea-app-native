// English description: Returns a marketplace product record for the editor from the PHP product list API.

import { getRouterParam } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { normalizeProductRecord } from "./_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const id = decodeURIComponent(String(getRouterParam(event, "id") ?? ""))
  const numericPostId = id.match(/^\d+/)?.[0] ?? ""
  const response = await client.post<{ api_status?: number | string; products?: Parameters<typeof normalizeProductRecord>[1][] }>("get-products", {
    limit: 250,
  })
  const product = (Array.isArray(response.products) ? response.products : [])
    .find(item => [
      item.id,
      item.post_id,
      item.seo_id,
    ].some(value => String(value ?? "") === id || (!!numericPostId && String(value ?? "") === numericPostId)))

  return product ? normalizeProductRecord(event, product) : null
})
