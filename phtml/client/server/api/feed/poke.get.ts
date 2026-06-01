// English description: Returns normalized poke requests for the Nuxt poke route.

import { fetchPokes } from "./_shared"

export default defineEventHandler(async (event) => await fetchPokes(event))
