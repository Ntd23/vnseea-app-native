// Description: Implements marketplace order reads through the shared API bridge.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { OrdersRepository } from '../../domain/repositories/OrdersRepository';
import type {
  OrdersItem,
  OrdersPage,
  OrderStatus,
} from '../../domain/types/orders.types';

type RawOrderProduct = {
  name?: unknown;
  user_data?: {
    name?: unknown;
    username?: unknown;
  };
};

type RawSubOrder = {
  id?: unknown;
  hash_id?: unknown;
  status?: unknown;
  price?: unknown;
  final_price?: unknown;
  product?: RawOrderProduct;
  buyer?: {
    name?: unknown;
    username?: unknown;
  };
};

type RawMarketOrder = {
  id?: unknown;
  order_hash_id?: unknown;
  price?: unknown;
  final_price?: unknown;
  time?: unknown;
  date?: unknown;
  data?: {
    name?: unknown;
  };
  orders?: RawSubOrder[];
};

type MarketOrdersResponse = {
  api_status: number | string;
  data?: RawMarketOrder[];
};

function stringValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusValue(value: unknown): OrderStatus {
  const normalized = stringValue(value).toLowerCase();
  if (
    normalized === 'placed' ||
    normalized === 'accepted' ||
    normalized === 'packed' ||
    normalized === 'shipped' ||
    normalized === 'delivered' ||
    normalized === 'canceled'
  ) {
    return normalized;
  }
  return 'unknown';
}

function statusLabel(status: OrderStatus) {
  if (status === 'placed') return 'Chờ xác nhận';
  if (status === 'accepted') return 'Đã xác nhận';
  if (status === 'packed') return 'Đã đóng gói';
  if (status === 'shipped') return 'Đang giao';
  if (status === 'delivered') return 'Đã giao';
  if (status === 'canceled') return 'Đã hủy';
  return 'Không rõ';
}

function formatMoney(value: unknown) {
  const amount = Math.round(numberValue(value));
  if (!amount) return '0 đ';
  return `${amount.toLocaleString('vi-VN')} đ`;
}

function productTitle(raw: RawMarketOrder) {
  const firstOrder = raw.orders?.[0];
  return (
    stringValue(raw.data?.name) ||
    stringValue(firstOrder?.product?.name) ||
    'Đơn hàng marketplace'
  );
}

function shopName(raw: RawMarketOrder, mode: 'purchased' | 'seller') {
  const firstOrder = raw.orders?.[0];
  if (mode === 'seller') {
    return (
      stringValue(firstOrder?.buyer?.name) ||
      stringValue(firstOrder?.buyer?.username) ||
      'Người mua'
    );
  }

  return (
    stringValue(firstOrder?.product?.user_data?.name) ||
    stringValue(firstOrder?.product?.user_data?.username) ||
    'Shop'
  );
}

function mapOrder(raw: RawMarketOrder, mode: 'purchased' | 'seller'): OrdersItem {
  const firstOrder = raw.orders?.[0];
  const status = statusValue(firstOrder?.status);
  const code = stringValue(raw.order_hash_id) || stringValue(firstOrder?.hash_id);
  const lines = (raw.orders ?? []).map((order, index) => {
    const lineStatus = statusValue(order.status);
    return {
      id: stringValue(order.id) || stringValue(order.hash_id) || `${code}-${index}`,
      product: stringValue(order.product?.name) || 'Sản phẩm marketplace',
      total: formatMoney(mode === 'seller' ? order.final_price : order.price),
      status: lineStatus,
      statusLabel: statusLabel(lineStatus),
    };
  });

  return {
    id: stringValue(raw.id) || code,
    code: code ? `#${code}` : '#',
    shop: shopName(raw, mode),
    product: productTitle(raw),
    total: formatMoney(mode === 'seller' ? raw.final_price : raw.price),
    status,
    statusLabel: statusLabel(status),
    date: stringValue(raw.date) || stringValue(raw.time),
    lines,
  };
}

async function getMarketOrders(
  type: 'purchased' | 'orders',
  input?: { limit?: number; offset?: number },
): Promise<OrdersPage> {
  const response = await apiBridge.post<MarketOrdersResponse>(
    apiRoutes.products.market,
    {
      type,
      limit: input?.limit ?? 20,
      offset: input?.offset,
    },
  );

  return {
    items: (response.data ?? []).map(raw =>
      mapOrder(raw, type === 'orders' ? 'seller' : 'purchased'),
    ),
  };
}

export function createOrdersRepository(): OrdersRepository {
  return {
    getPurchasedOrders(input) {
      return getMarketOrders('purchased', input);
    },
    getSellerOrders(input) {
      return getMarketOrders('orders', input);
    },
  };
}
