// English description: Returns a single page detail record resolved from the PHP backend by slug.

import { getRouterParam } from "h3"
import { resolvePageRecordBySlug } from "../_shared"

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "")

  return await resolvePageRecordBySlug(event, slug)
})
