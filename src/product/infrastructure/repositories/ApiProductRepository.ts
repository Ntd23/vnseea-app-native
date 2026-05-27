// Product API Repository (Infrastructure)
// WoWonder endpoints: /api/new-product (POST), /api/get-products (POST)
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { ProductRepository } from '../../domain/repositories/ProductRepository';
import type {
  CreateProductInput,
  CreateProductResponse,
  GetProductsInput,
  ProductsResponse,
} from '../../domain/types/product.types';

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
