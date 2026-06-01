// English description: Returns normalized discover data for explore and hashtag-adjacent Nuxt routes.

import { fetchExplore } from "./_shared"

export default defineEventHandler(async (event) => await fetchExplore(event))
