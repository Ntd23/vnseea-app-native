// Description: Domain types for marketplace cart checkout and delivery address.

export interface CheckoutItem {
  id: string;
  productId: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  total: number;
  currencyCode: string;
  currencySymbol: string;
  sellerUserId?: number;
}

export interface CheckoutCurrencyTotal {
  currencyCode: string;
  currencySymbol: string;
  amount: number;
}

export interface DeliveryAddress {
  id: string;
  name: string;
  phone: string;
  country: string;
  city: string;
  zip: string;
  address: string;
}

export interface DeliveryAddressInput {
  id?: string;
  name: string;
  phone: string;
  country: string;
  city: string;
  zip: string;
  address: string;
}

export interface CheckoutSummary {
  items: CheckoutItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currencyCode: string;
  currencySymbol: string;
  currencyTotals: CheckoutCurrencyTotal[];
}

export interface WalletCheckoutBalance {
  wallet: number;
  currencySymbol: string;
}

export interface CheckoutResult {
  success: boolean;
  message: string;
  cartCount?: number;
  orders?: Array<{
    hashId: string;
    sellerUserId: string;
    messageId: string;
  }>;
}
