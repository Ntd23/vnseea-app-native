// English description: Returns backend-backed directory destinations for the directory route.

import { fetchDirectoryCatalog } from "./_shared"

export default defineEventHandler(async (event) => {
  return await fetchDirectoryCatalog(event)
})
