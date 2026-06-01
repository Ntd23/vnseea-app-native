// English description: Returns the authenticated user's LiveKit host studio bootstrap payload for the /live route.

import { fetchLiveBootstrap } from "./_shared"

export default defineEventHandler(async (event) => {
  return await fetchLiveBootstrap(event)
})
