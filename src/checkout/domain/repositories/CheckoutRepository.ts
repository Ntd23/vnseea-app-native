// Description: Repository contract for marketplace checkout.

import type {
  CheckoutResult,
  CheckoutSummary,
  DeliveryAddress,
  DeliveryAddressInput,
  WalletCheckoutBalance,
} from '../types/checkout.types';

export interface CheckoutRepository {
  getSummary(): Promise<CheckoutSummary>;
  getWalletBalance(): Promise<WalletCheckoutBalance>;
  getAddresses(): Promise<DeliveryAddress[]>;
  saveAddress(input: DeliveryAddressInput): Promise<DeliveryAddress[]>;
  changeQuantity(productId: number, quantity: number): Promise<CheckoutSummary>;
  removeItem(productId: number): Promise<CheckoutSummary>;
  buy(addressId: string, selectedProductIds?: number[]): Promise<CheckoutResult>;
}
