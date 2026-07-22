// Description: Repository contract for marketplace checkout.

import type {
  CheckoutResult,
  CheckoutSummary,
  DeliveryAddress,
  DeliveryAddressInput,
} from '../types/checkout.types';

export interface CheckoutRepository {
  getSummary(): Promise<CheckoutSummary>;
  getAddresses(): Promise<DeliveryAddress[]>;
  saveAddress(input: DeliveryAddressInput): Promise<DeliveryAddress[]>;
  changeQuantity(productId: number, quantity: number): Promise<CheckoutSummary>;
  removeItem(productId: number): Promise<CheckoutSummary>;
  requestOrder(addressId: string, selectedProductIds: number[]): Promise<CheckoutResult>;
}
