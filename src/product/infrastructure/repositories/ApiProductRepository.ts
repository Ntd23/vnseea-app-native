// Product API Repository (Infrastructure)
// WoWonder endpoints: /api/new-product (POST), /api/get-products (POST)
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { ProductRepository } from '../../domain/repositories/ProductRepository';
import type {
  CreateProductInput,
  CreateProductResponse,
  AddToCartResponse,
  ProductsResponse,
} from '../../domain/types/product.types';

type RawCartProduct = {
  id?: unknown;
  product_id?: unknown;
  units?: unknown;
};

type CartCheckoutResponse = {
  api_status: number | string;
  data?: RawCartProduct[];
};

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getCartProducts() {
  const response = await apiBridge.post<CartCheckoutResponse>(
    apiRoutes.products.market,
    { type: 'checkout' },
  );
  return response.data ?? [];
}

function isAlreadyInCartError(error: unknown) {
  return error instanceof Error &&
    error.message.toLowerCase().includes('already in cart');
}

async function increaseExistingCartQuantity(productId: number, qty: number) {
  const cartProducts = await getCartProducts();
  const cartProduct = cartProducts.find(product => {
    const id = numberValue(product.product_id) || numberValue(product.id);
    return id === productId;
  });
  const currentQuantity = Math.max(1, numberValue(cartProduct?.units) || 1);

  return apiBridge.post<AddToCartResponse>(apiRoutes.products.market, {
    type: 'change_qty',
    product_id: productId,
    qty: currentQuantity + qty,
  });
}

export function createProductRepository(): ProductRepository {
  return {
    async getProducts(input) {
      const response = await apiBridge.post<ProductsResponse>(
        apiRoutes.products.get,
        {
          limit: input?.limit ?? 35,
          user_id: input?.user_id,
          offset: input?.offset,
          category_id: input?.category_id,
          sub_id: input?.sub_id,
          keyword: input?.keyword,
          distance: input?.distance,
          order_by: input?.order_by,
          product_id: input?.product_id,
        },
      );
      return response;
    },

    async getMyProducts() {
      const response = await apiBridge.post<{
        api_status: number;
        products: ProductsResponse['products'];
      }>(apiRoutes.products.get, {});
      return { products: response.products };
    },

    async addToCart(productId, qty = 1) {
      try {
        return await apiBridge.post<AddToCartResponse>(
          apiRoutes.products.market,
          {
            type: 'add_cart',
            product_id: productId,
            qty,
          },
        );
      } catch (error) {
        if (isAlreadyInCartError(error)) {
          return increaseExistingCartQuantity(productId, qty);
        }
        throw error;
      }
    },

    async getCartCount() {
      const cartProducts = await getCartProducts();
      return cartProducts.reduce(
        (count, product) => count + Math.max(1, numberValue(product.units) || 1),
        0,
      );
    },

    async createProduct(input: CreateProductInput) {
      // Build FormData for multipart upload (images)
      const formData: Record<string, unknown> = {
        product_title: input.product_title,
        product_category: input.product_category,
        product_description: input.product_description,
        product_price: input.product_price,
        product_location: input.product_location,
        product_type: input.product_type ?? 0,
      };

      if (input.currency) {
        formData.currency = input.currency;
      }
      if (input.lat) {
        formData.lat = input.lat;
      }
      if (input.lng) {
        formData.lng = input.lng;
      }
      if (input.units !== undefined) {
        formData.units = input.units;
      }
      if (input.product_sub_category) {
        formData.product_sub_category = input.product_sub_category;
      }

      // Append images as file objects array
      // Each image object { uri, name, type } will be passed to FormData.append
      formData.images = input.images;

      const response = await apiBridge.multipart<CreateProductResponse>(
        apiRoutes.products.create,
        formData,
      );
      return response;
    },

    async getCategories() {
      // Fetch products with no filters to get categories from response
      const response = await apiBridge.post<ProductsResponse>(
        apiRoutes.products.get,
        { limit: 1 },
      );

      const categories = Object.entries(response.products_categories || {}).map(
        ([id, subs]) => ({
          id: parseInt(id, 10),
          lang_key: '',
          categories: subs,
        }),
      );

      return { categories };
    },
  };
}
