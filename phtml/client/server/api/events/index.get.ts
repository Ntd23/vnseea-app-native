// English description: Returns the backend-backed event catalog grouped by listing tabs for the Nuxt events directory route.

import { fetchEventsCatalog } from "./_shared"

export default defineEventHandler(async (event) => {
  return await fetchEventsCatalog(event)
})
