// English description: Uploads a bank transfer receipt for wallet top-up through the PHP wallet receipt handler.

import { createError, readMultipartFormData } from "h3"
import { uploadWalletBankTransfer } from "./_shared"

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event) ?? []
  const values: Record<string, string> = {}
  let receiptFile: File | null = null

  for (const part of parts) {
    if (!part.name) {
      continue
    }

    if (part.filename) {
      if (part.name === "thumbnail") {
        receiptFile = new File(
          [part.data],
          part.filename,
          { type: part.type || "image/jpeg" },
        )
      }
      continue
    }

    values[part.name] = part.data.toString().trim()
  }

  const amount = Number(values.amount ?? 0) || 0

  if (amount <= 0 || !receiptFile) {
    throw createError({
      statusCode: 400,
      statusMessage: "Amount and receipt image are required.",
    })
  }

  return await uploadWalletBankTransfer(event, {
    amount,
    method: "bank_transfer",
    receiptFile,
  })
})
