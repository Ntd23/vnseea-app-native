// English description: Returns a single backend-backed event record for the Nuxt event detail route.

import { getRouterParam } from "h3"
import { fetchEventDetail } from "./_shared"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") || ""

  return await fetchEventDetail(event, id)
})
