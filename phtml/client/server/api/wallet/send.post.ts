// English description: Sends wallet funds through the existing PHP browser-session wallet handler.

import { createError, readBody } from "h3"
import { sendWalletMoney } from "./_shared"
import type { WalletSendDraft } from "../../../src/wallet/domain/types/wallet.types"

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const payload: WalletSendDraft = {
    recipientUserId: Number(body.recipientUserId ?? 0) || 0,
    amount: Number(body.amount ?? 0) || 0,
    note: typeof body.note === "string" ? body.note.trim() : "",
  }

  if (!payload.recipientUserId || payload.amount <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Recipient and amount are required.",
    })
  }

  return await sendWalletMoney(event, payload)
})
