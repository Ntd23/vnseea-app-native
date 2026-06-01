// English description: Creates an empty checkout snapshot before the backend response is available.

import type { CheckoutSnapshot } from "../../domain/types/checkout.types"

export const createCheckoutSnapshot = (): CheckoutSnapshot => ({
  items: [],
  shippingAddress: null,
  walletBalance: 0,
  shippingFee: 0,
})
