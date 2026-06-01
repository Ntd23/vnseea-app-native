// English description: Returns the normalized home feed payload with stories and announcement for the Nuxt feed route.

import { fetchFeedHome } from "./_shared"

export default defineEventHandler(async (event) => await fetchFeedHome(event))
