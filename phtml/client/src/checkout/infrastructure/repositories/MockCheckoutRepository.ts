import type { CheckoutRepository } from "../../domain/repositories/CheckoutRepository"
import type { CheckoutSnapshot, ShippingAddress } from "../../domain/types/checkout.types"
import { loadShippingAddress, saveShippingAddress } from "../persistence/checkout.storage"
import { checkoutSnapshotMock } from "../mocks/checkoutSnapshot.mock"

const cloneSnapshot = (snapshot: CheckoutSnapshot): CheckoutSnapshot =>
  JSON.parse(JSON.stringify(snapshot)) as CheckoutSnapshot

const defaultStorageKey = "checkout:saved-address"

export function createMockCheckoutRepository(
  storageKey = defaultStorageKey,
): CheckoutRepository {
  return {
    async getSnapshot() {
      const snapshot = cloneSnapshot(checkoutSnapshotMock)
      snapshot.shippingAddress = loadShippingAddress(storageKey)
      return snapshot
    },
    async saveShippingAddress(address: ShippingAddress) {
      const normalized = { ...address }
      saveShippingAddress(storageKey, normalized)
      return normalized
    },
    async getAddresses() {
      return []
    },
    async deleteAddress() {
      // noop
    },
    async updateCartItemQuantity() {
      // noop
    },
    async removeCartItem() {
      // noop
    },
    async submitOrder() {
      return {
        success: true,
        orderId: `CHK-${Date.now()}`,
      }
    },
  }
}
