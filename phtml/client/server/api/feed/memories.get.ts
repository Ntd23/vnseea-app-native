// English description: Returns normalized memory posts and friendversary records for the memories route.

import { fetchMemories } from "./_shared"

export default defineEventHandler(async (event) => await fetchMemories(event))
