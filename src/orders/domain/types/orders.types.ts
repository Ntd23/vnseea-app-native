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
  status: OrderStatus;
  statusLabel: string;
  date: string;
  lines: OrderLineItem[];
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
}
