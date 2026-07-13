// Description: Domain types for marketplace purchased orders and seller orders.

export type OrderStatus =
  | 'all'
  | 'placed'
  | 'accepted'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'canceled'
  | 'unknown';

export interface OrdersItem {
  id: string;
  code: string;
  shop: string;
  product: string;
  total: string;
  amount?: number;
  status: OrderStatus;
  statusLabel: string;
  date: string;
  lines: OrderLineItem[];
  buyerUserId?: number;
  buyerName?: string;
  buyerUsername?: string;
  buyerAvatar?: string;
  addressId?: string;
  shippingAddress?: OrderShippingAddress;
  refundRequested?: boolean;
}

export interface OrdersPage {
  items: OrdersItem[];
}

export interface OrderLineItem {
  id: string;
  product: string;
  total: string;
  status: OrderStatus;
  statusLabel: string;
  shop?: string;
  price?: number;
  image?: string;
  quantity?: number;
}

export interface OrderShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}
