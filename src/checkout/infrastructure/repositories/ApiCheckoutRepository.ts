// Description: Implements marketplace checkout through WoWonder v2 endpoints.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { CheckoutRepository } from '../../domain/repositories/CheckoutRepository';
import type {
  CheckoutItem,
  CheckoutResult,
  CheckoutSummary,
  DeliveryAddress,
  DeliveryAddressInput,
} from '../../domain/types/checkout.types';
import { createCheckoutSummary } from '../../domain/checkoutMoney';

type RawProduct = {
  id?: unknown;
  product_id?: unknown;
  name?: unknown;
  price?: unknown;
  units?: unknown;
  currency?: unknown;
  currency_symbol?: unknown;
  currency_code?: unknown;
  user_id?: unknown;
  seller?: { user_id?: unknown };
  images?: Array<{ image?: unknown }>;
};

type CheckoutResponse = {
  api_status: number | string;
  data?: RawProduct[];
  total?: unknown;
};

type RawAddress = {
  id?: unknown;
  name?: unknown;
  phone?: unknown;
  country?: unknown;
  city?: unknown;
  zip?: unknown;
  address?: unknown;
};

type AddressResponse = {
  api_status: number | string;
  data?: RawAddress[] | RawAddress;
  message?: string;
};

type RequestOrderResponse = {
  api_status: number | string;
  message?: string;
  data?: {
    orders?: Array<{
      hash_id?: unknown;
      seller_id?: unknown;
      message_id?: unknown;
    }>;
    cart_count?: unknown;
  };
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

function mapAddress(raw: RawAddress): DeliveryAddress {
  return {
    id: stringValue(raw.id),
    name: stringValue(raw.name),
    phone: stringValue(raw.phone),
    country: stringValue(raw.country),
    city: stringValue(raw.city),
    zip: stringValue(raw.zip) || '10000',
    address: stringValue(raw.address),
  };
}

function mapCheckoutItem(raw: RawProduct): CheckoutItem {
  const quantity = Math.max(1, numberValue(raw.units) || 1);
  const price = numberValue(raw.price);
  const productId = numberValue(raw.product_id) || numberValue(raw.id);
  const sellerUserId =
    numberValue(raw.user_id) || numberValue(raw.seller?.user_id) || undefined;
  const rawCurrency = stringValue(raw.currency).trim();
  const currencyCode =
    stringValue(raw.currency_code).trim().toUpperCase() ||
    (/^\d+$/.test(rawCurrency) ? '' : rawCurrency.toUpperCase()) ||
    'VND';
  const currencySymbol =
    stringValue(raw.currency_symbol).trim() || currencyCode;

  return {
    id: String(productId),
    productId,
    name: stringValue(raw.name) || 'Sản phẩm',
    image: stringValue(raw.images?.[0]?.image),
    price,
    quantity,
    total: price * quantity,
    currencyCode,
    currencySymbol,
    sellerUserId,
  };
}

async function getAddresses() {
  const response = await apiBridge.post<AddressResponse>(apiRoutes.user.address, {
    type: 'get',
    limit: 50,
  });
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map(mapAddress);
}

async function getSummary(): Promise<CheckoutSummary> {
  const response = await apiBridge.post<CheckoutResponse>(
    apiRoutes.products.market,
    { type: 'checkout' },
  );
  return createCheckoutSummary((response.data ?? []).map(mapCheckoutItem));
}

async function removeItem(productId: number): Promise<CheckoutSummary> {
  await apiBridge.post(apiRoutes.products.market, {
    type: 'remove_cart',
    product_id: productId,
  });
  return getSummary();
}

export function createCheckoutRepository(): CheckoutRepository {
  return {
    getSummary,

    getAddresses,

    async saveAddress(input: DeliveryAddressInput): Promise<DeliveryAddress[]> {
      await apiBridge.post<AddressResponse>(apiRoutes.user.address, {
        type: input.id ? 'edit' : 'add',
        id: input.id,
        name: input.name,
        phone: input.phone,
        country: input.country,
        city: input.city,
        zip: String(input.zip || '').trim() || '10000',
        address: input.address,
      });
      return getAddresses();
    },

    async deleteAddress(addressId: string): Promise<DeliveryAddress[]> {
      await apiBridge.post<AddressResponse>(apiRoutes.user.address, {
        type: 'delete',
        id: addressId,
      });
      return getAddresses();
    },

    async changeQuantity(
      productId: number,
      quantity: number,
    ): Promise<CheckoutSummary> {
      if (quantity <= 0) {
        return removeItem(productId);
      }

      await apiBridge.post(apiRoutes.products.market, {
        type: 'change_qty',
        product_id: productId,
        qty: quantity,
      });
      return getSummary();
    },

    removeItem,

    async requestOrder(
      addressId: string,
      selectedProductIds: number[],
    ): Promise<CheckoutResult> {
      const productIds = Array.from(
        new Set(
          selectedProductIds
            .map(id => Number(id))
            .filter(id => Number.isFinite(id) && id > 0),
        ),
      );
      if (productIds.length === 0) {
        return {
          success: false,
          message: 'Vui lòng chọn ít nhất một sản phẩm để đặt mua.',
        };
      }
      const response = await apiBridge.post<RequestOrderResponse>(
        apiRoutes.products.market,
        {
          type: 'request_order',
          address_id: addressId,
          product_ids: JSON.stringify(productIds),
        },
      );

      return {
        success: response.api_status === 200 || response.api_status === '200',
        message:
          response.message ||
          'Yêu cầu mua đã được gửi tới người bán.',
        cartCount: numberValue(response.data?.cart_count),
        orders: (response.data?.orders ?? []).map(order => ({
          hashId: stringValue(order.hash_id),
          sellerUserId: stringValue(order.seller_id),
          messageId: stringValue(order.message_id),
        })),
      };
    },
  };
}
