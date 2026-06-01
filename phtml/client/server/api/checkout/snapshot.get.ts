// English description: Returns the real checkout snapshot from PHP market cart and user address APIs.

import { createBackendApiClient } from "../../utils/backend-api-client"
import { getBackendWalletBalance, normalizeCheckoutSnapshot } from "./_shared"
import type { CheckoutSnapshot } from "../../../src/checkout/domain/types/checkout.types"

export default defineEventHandler(async (event): Promise<CheckoutSnapshot> => {
  const client = createBackendApiClient(event)

  const [checkout, addresses, walletBalance] = await Promise.all([
    client.post("market", { type: "checkout" }) as Promise<Parameters<typeof normalizeCheckoutSnapshot>[1]>,
    client.post("address", { type: "get", limit: 1 }) as Promise<Parameters<typeof normalizeCheckoutSnapshot>[2]>,
    getBackendWalletBalance(event),
  ])

  return normalizeCheckoutSnapshot(event, checkout, addresses, walletBalance)
})
