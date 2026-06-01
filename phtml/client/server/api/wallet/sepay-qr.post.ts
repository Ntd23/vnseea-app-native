// English description: Creates a SePay top-up order through the PHP SePay handler.

import { createError, readBody } from "h3"
import { createWalletSepayQr } from "./_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const amount = Number(body.amount ?? 0) || 0

  if (amount <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Amount is required.",
    })
  }

  return await createWalletSepayQr(event, {
    amount,
    method: "sepay",
  })
})
