// English description: Returns the backend-backed wallet overview for the wallet route.

import { fetchWalletOverview } from "./_shared"

export default defineEventHandler(async (event) => {
  return await fetchWalletOverview(event)
})
