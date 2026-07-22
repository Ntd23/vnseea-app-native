// Description: Implements product API calls for create, edit, listing, cart, and categories.
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

function normalizeProductsResponse(response: ProductsResponse): ProductsResponse {
  return {
    ...response,
    products: Array.isArray(response.products) ? response.products : [],
    products_categories:
      response.products_categories && typeof response.products_categories === 'object'
        ? response.products_categories
        : {},
  };
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

function buildProductFormData(input: CreateProductInput) {
  const formData: Record<string, unknown> = {
    product_title: input.product_title,
    product_category: input.product_category,
    product_description: input.product_description,
    product_price: input.product_price,
    product_location: input.product_location,
    product_type: input.product_type ?? 0,
  };

  if (input.product_id !== undefined) {
    formData.product_id = input.product_id;
  }
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
  if (input.images.length > 0) {
    formData.images = input.images;
  }

  return formData;
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
      return normalizeProductsResponse(response);
    },

    async getMyProducts() {
      const response = await apiBridge.post<{
        api_status: number;
        products: ProductsResponse['products'];
      }>(apiRoutes.products.get, {});
      return { products: Array.isArray(response.products) ? response.products : [] };
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

    async ensureProductInCart(productId) {
      return apiBridge.post<AddToCartResponse>(apiRoutes.products.market, {
        type: 'ensure_cart',
        product_id: productId,
      });
    },

    async getCartCount() {
      const cartProducts = await getCartProducts();
      return cartProducts.reduce(
        (count, product) => count + Math.max(1, numberValue(product.units) || 1),
        0,
      );
    },

    async createProduct(input: CreateProductInput) {
      const response = await apiBridge.multipart<CreateProductResponse>(
        apiRoutes.products.create,
        buildProductFormData(input),
      );
      return response;
    },

    async updateProduct(input: CreateProductInput) {
      const response = await apiBridge.multipart<CreateProductResponse>(
        apiRoutes.products.update,
        buildProductFormData(input),
      );
      return response;
    },

    async deleteProduct(postId: number) {
      const response = await apiBridge.post<{
        api_status: number | string;
        action?: string;
      }>(apiRoutes.feed.postActions, {
        action: 'delete',
        post_id: postId,
      });

      if (String(response.action).toLowerCase() !== 'deleted') {
        throw new Error('Không thể xóa sản phẩm.');
      }
    },

    async getCategories() {
      // Fetch products with no filters to get categories from response
      const response = await apiBridge.post<ProductsResponse>(
        apiRoutes.products.get,
        { limit: 1 },
      );

      const normalized = normalizeProductsResponse(response);
      const categories = Object.entries(normalized.products_categories || {}).map(
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
