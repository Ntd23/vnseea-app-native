// English description: Returns backend-backed Pro package data for the go-pro route.

import { fetchGoProCatalog } from "./_shared"

export default defineEventHandler(async (event) => {
  return await fetchGoProCatalog(event)
})
