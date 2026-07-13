// Description: Implements marketplace order reads through the shared API bridge.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { OrdersRepository } from '../../domain/repositories/OrdersRepository';
import type {
  OrdersItem,
  OrdersPage,
  OrderShippingAddress,
  OrderStatus,
} from '../../domain/types/orders.types';

type RawProductImage = {
  image?: unknown;
  image_org?: unknown;
};

type RawOrderProduct = {
  name?: unknown;
  images?: RawProductImage[];
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
  units?: unknown;
  address_id?: unknown;
  address?: {
    name?: unknown;
    phone?: unknown;
    address?: unknown;
    city?: unknown;
    state?: unknown;
    country?: unknown;
    zip?: unknown;
  };
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

function productImage(product?: RawOrderProduct) {
  const image = product?.images?.[0];
  return stringValue(image?.image) || stringValue(image?.image_org) || undefined;
}

function shippingAddress(order?: RawSubOrder): OrderShippingAddress | undefined {
  if (!order?.address) return undefined;

  return {
    name: stringValue(order.address.name),
    phone: stringValue(order.address.phone),
    address: stringValue(order.address.address),
    city: stringValue(order.address.city),
    state: stringValue(order.address.state),
    country: stringValue(order.address.country),
    zip: stringValue(order.address.zip),
  };
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
    const lineShop = stringValue(order.product?.user_data?.name) || stringValue(order.product?.user_data?.username) || 'Shop';
    const linePrice = numberValue(mode === 'seller' ? order.final_price : order.price);
    return {
      id: stringValue(order.id) || stringValue(order.hash_id) || `${code}-${index}`,
      product: stringValue(order.product?.name) || 'Sản phẩm marketplace',
      total: formatMoney(mode === 'seller' ? order.final_price : order.price),
      status: lineStatus,
      statusLabel: statusLabel(lineStatus),
      shop: lineShop,
      price: linePrice,
      image: productImage(order.product),
      quantity: Math.max(1, numberValue(order.units)),
    };
  });

  const buyerUserId = numberValue((firstOrder as any)?.user_id) || numberValue((firstOrder as any)?.buyer?.user_id) || numberValue((firstOrder as any)?.buyer?.id) || undefined;
  const buyerName = stringValue((firstOrder as any)?.buyer?.name) || stringValue((firstOrder as any)?.buyer?.username) || undefined;
  const buyerUsername = stringValue((firstOrder as any)?.buyer?.username) || undefined;
  const buyerAvatar = stringValue((firstOrder as any)?.buyer?.avatar) || undefined;

  return {
    id: stringValue(raw.id) || code,
    code: code ? `#${code}` : '#',
    shop: shopName(raw, mode),
    product: productTitle(raw),
    total: formatMoney(mode === 'seller' ? raw.final_price : raw.price),
    amount: numberValue(mode === 'seller' ? raw.final_price : raw.price),
    status,
    statusLabel: statusLabel(status),
    date: stringValue(raw.date) || stringValue(raw.time),
    lines,
    buyerUserId,
    buyerName,
    buyerUsername,
    buyerAvatar,
    addressId: stringValue(firstOrder?.address_id) || undefined,
    shippingAddress: shippingAddress(firstOrder),
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
    async changeOrderStatus(hashId, status) {
      await apiBridge.post(apiRoutes.products.market, {
        type: 'change_status',
        hash_id: hashId,
        status,
      });
    },
    async requestRefund(hashId, message) {
      const orderHash = hashId.replace(/^#/, '');
      await apiBridge.post(apiRoutes.products.market, {
        type: 'refund',
        hash_order: orderHash,
        order_hash: orderHash,
        message,
      });
    },
  };
}
