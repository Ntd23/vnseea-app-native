// English description: Checkout domain types shared by checkout view models, repositories, and API bridges.

export interface CheckoutLineItem {
  id: string
  name: string
  price: number
  quantity: number
  imageStyle?: string
  imageUrl?: string
  currency?: string
}

export interface ShippingAddress {
  id?: string
  fullName: string
  phone: string
  country: string
  city: string
  postalCode: string
  streetAddress: string
}

export interface ShippingAddressForm extends ShippingAddress {}

export interface SavedShippingAddress extends ShippingAddress {}

export interface CheckoutSnapshot {
  items: CheckoutLineItem[]
  shippingAddress: ShippingAddress | null
  walletBalance: number
  shippingFee: number
}
