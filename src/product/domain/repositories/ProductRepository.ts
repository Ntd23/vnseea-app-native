// Product Repository Interface
import type {
  CreateProductInput,
  CreateProductResponse,
  GetProductsInput,
  ProductCategory,
  ProductItem,
  ProductsResponse,
} from '../types/product.types';

export interface ProductRepository {
  getProducts(input?: GetProductsInput): Promise<ProductsResponse>;
  getMyProducts(): Promise<{ products: ProductItem[] }>;
  createProduct(input: CreateProductInput): Promise<CreateProductResponse>;
  getCategories(): Promise<{ categories: ProductCategory[] }>;
}
