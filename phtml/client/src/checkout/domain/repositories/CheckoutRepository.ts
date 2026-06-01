import type { CheckoutSnapshot, ShippingAddress } from "../types/checkout.types"

export interface CheckoutRepository {
  getSnapshot(): Promise<CheckoutSnapshot>
  getAddresses(): Promise<ShippingAddress[]>
  saveShippingAddress(address: ShippingAddress): Promise<ShippingAddress>
  deleteAddress(addressId: string): Promise<void>
  updateCartItemQuantity(productId: string, quantity: number): Promise<void>
  removeCartItem(productId: string): Promise<void>
  submitOrder(snapshot: CheckoutSnapshot): Promise<{ success: boolean; orderId: string }>
}
