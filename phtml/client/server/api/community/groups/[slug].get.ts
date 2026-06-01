// English description: Returns a single group detail record resolved from the PHP backend by slug.

import { getRouterParam } from "h3"
import { resolveGroupRecordBySlug } from "../_shared"

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "")

  return await resolveGroupRecordBySlug(event, slug)
})

