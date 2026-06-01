// English description: Submits a withdrawal request through the existing PHP browser-session handler.

import { createError, readBody } from "h3"
import { submitWithdrawalRequest } from "./_shared"
import type { WithdrawalRequestDraft } from "../../../src/withdrawal/domain/types/withdrawal.types"

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const payload: WithdrawalRequestDraft = {
    method: typeof body.method === "string" ? body.method : "",
    amount: Number(body.amount ?? 0) || 0,
    paypalEmail: typeof body.paypalEmail === "string" ? body.paypalEmail : "",
    iban: typeof body.iban === "string" ? body.iban : "",
    country: typeof body.country === "string" ? body.country : "",
    fullName: typeof body.fullName === "string" ? body.fullName : "",
    swiftCode: typeof body.swiftCode === "string" ? body.swiftCode : "",
    address: typeof body.address === "string" ? body.address : "",
    transferTo: typeof body.transferTo === "string" ? body.transferTo : "",
  }

  if (!payload.method || payload.amount <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Withdrawal method and amount are required.",
    })
  }

  return await submitWithdrawalRequest(event, payload)
})
