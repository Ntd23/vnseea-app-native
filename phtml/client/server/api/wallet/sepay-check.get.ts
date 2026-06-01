// English description: Checks a SePay top-up order status through the PHP SePay handler.

import { createError, getQuery } from "h3"
import { checkWalletSepayTopup } from "./_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const orderCode = typeof query.orderCode === "string" ? query.orderCode.trim() : ""

  if (!orderCode) {
    throw createError({
      statusCode: 400,
      statusMessage: "Order code is required.",
    })
  }

  return await checkWalletSepayTopup(event, orderCode)
})
