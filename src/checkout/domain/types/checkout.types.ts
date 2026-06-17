// Description: Domain types for marketplace cart checkout and delivery address.

export interface CheckoutItem {
  id: string;
  productId: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
  total: number;
  currencySymbol: string;
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
  currencySymbol: string;
}

export interface WalletCheckoutBalance {
  wallet: number;
  currencySymbol: string;
}

export interface CheckoutResult {
  success: boolean;
  message: string;
}
