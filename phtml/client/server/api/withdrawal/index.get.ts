// English description: Returns backend-backed withdrawal overview data.

import { fetchWithdrawalOverview } from "./_shared"

export default defineEventHandler(async (event) => {
  return await fetchWithdrawalOverview(event)
})
