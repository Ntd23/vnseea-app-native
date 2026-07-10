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
  WalletCheckoutBalance,
} from '../../domain/types/checkout.types';

type RawProduct = {
  id?: unknown;
  product_id?: unknown;
  name?: unknown;
  price?: unknown;
  units?: unknown;
  currency_symbol?: unknown;
  currency_code?: unknown;
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

type BuyResponse = {
  api_status: number | string;
  message?: string;
  data?: string;
};

type CurrentUserResponse = {
  api_status: number | string;
  user_data?: {
    wallet?: unknown;
    points_config?: {
      display_currency_symbol?: unknown;
      currency_symbol?: unknown;
    };
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
  const sellerUserId = numberValue((raw as any).user_id) || numberValue((raw as any).seller?.user_id) || undefined;

  return {
    id: String(productId),
    productId,
    name: stringValue(raw.name) || 'Sản phẩm',
    image: stringValue(raw.images?.[0]?.image),
    price,
    quantity,
    total: price * quantity,
    currencySymbol:
      stringValue(raw.currency_symbol) || stringValue(raw.currency_code) || 'VNSEEA',
    sellerUserId,
  };
}

function normalizeSummaryCurrency(
  items: CheckoutItem[],
  convertedTotal: number,
) {
  const rawTotal = items.reduce((sum, item) => sum + item.total, 0);
  const shouldConvert = convertedTotal > 0 && rawTotal > 0;
  const ratio = shouldConvert ? convertedTotal / rawTotal : 1;
  const currencySymbol = shouldConvert ? 'VNSEEA' : items[0]?.currencySymbol || 'VNSEEA';

  return items.map(item => {
    const price = item.price * ratio;
    return {
      ...item,
      price,
      total: price * item.quantity,
      currencySymbol,
    };
  });
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
  const convertedTotal = numberValue(response.total);
  const items = normalizeSummaryCurrency(
    (response.data ?? []).map(mapCheckoutItem),
    convertedTotal,
  );
  const subtotal =
    convertedTotal || items.reduce((sum, item) => sum + item.total, 0);
  const currencySymbol = items[0]?.currencySymbol || 'VNSEEA';

  return {
    items,
    subtotal,
    shipping: 0,
    total: subtotal,
    currencySymbol,
  };
}

async function removeItem(productId: number): Promise<CheckoutSummary> {
  await apiBridge.post(apiRoutes.products.market, {
    type: 'remove_cart',
    product_id: productId,
  });
  return getSummary();
}

async function removeCartProduct(productId: number) {
  await apiBridge.post(apiRoutes.products.market, {
    type: 'remove_cart',
    product_id: productId,
  });
}

async function addCartProduct(productId: number, quantity: number) {
  await apiBridge.post(apiRoutes.products.market, {
    type: 'add_cart',
    product_id: productId,
    qty: Math.max(1, quantity),
  });
}

export function createCheckoutRepository(): CheckoutRepository {
  return {
    getSummary,

    async getWalletBalance(): Promise<WalletCheckoutBalance> {
      const response = await apiBridge.post<CurrentUserResponse>(
        apiRoutes.auth.me,
      );

      return {
        wallet: numberValue(response.user_data?.wallet),
        currencySymbol:
          stringValue(response.user_data?.points_config?.display_currency_symbol) ||
          stringValue(response.user_data?.points_config?.currency_symbol) ||
          'VNSEEA',
      };
    },

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

    async buy(
      addressId: string,
      selectedProductIds?: number[],
    ): Promise<CheckoutResult> {
      const selectedIds = new Set(
        (selectedProductIds ?? [])
          .map(id => Number(id))
          .filter(id => Number.isFinite(id) && id > 0),
      );
      const shouldBuySelectedOnly = selectedIds.size > 0;
      const currentSummary = shouldBuySelectedOnly ? await getSummary() : null;
      const itemsToRestore =
        currentSummary?.items.filter(item => !selectedIds.has(item.productId)) ?? [];

      if (shouldBuySelectedOnly && currentSummary) {
        const selectedItems = currentSummary.items.filter(item =>
          selectedIds.has(item.productId),
        );
        if (selectedItems.length === 0) {
          return {
            success: false,
            message: 'Vui lòng chọn ít nhất một sản phẩm để thanh toán.',
          };
        }

        await Promise.all(
          itemsToRestore.map(item => removeCartProduct(item.productId)),
        );
      }

      let response: BuyResponse;
      try {
        response = await apiBridge.post<BuyResponse>(
          apiRoutes.products.market,
          {
            type: 'buy',
            address_id: addressId,
          },
        );
      } finally {
        if (itemsToRestore.length > 0) {
          await Promise.allSettled(
            itemsToRestore.map(item =>
              addCartProduct(item.productId, item.quantity),
            ),
          );
        }
      }

      return {
        success: response.api_status === 200 || response.api_status === '200',
        message:
          response.message ||
          response.data ||
          'Đơn hàng đã được xử lý thành công.',
      };
    },
  };
}
