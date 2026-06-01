// English description: Returns the backend wallet receive QR image URL for the current user.

import { getQuery } from "h3"
import { getWalletReceiveQr } from "./_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const amount = typeof query.amount === "string" ? Number(query.amount) || null : null

  return await getWalletReceiveQr(event, amount)
})
