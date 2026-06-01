// English description: Starts a backend wallet top-up redirect flow for enabled redirect payment methods.

import { createError, getQuery } from "h3"
import { createWalletTopupLink } from "./_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const amount = typeof query.amount === "string" ? Number(query.amount) || 0 : 0
  const method = typeof query.method === "string" ? query.method : ""

  if (method !== "paypal") {
    throw createError({
      statusCode: 400,
      statusMessage: "This top-up method is not supported by the bridge.",
    })
  }

  if (amount <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Amount is required.",
    })
  }

  return await createWalletTopupLink(event, { amount, method })
})
