// Description: Defines repository operations for marketplace products.
import type {
  CreateProductInput,
  CreateProductResponse,
  AddToCartResponse,
  GetProductsInput,
  ProductCategory,
  ProductItem,
  ProductsResponse,
} from '../types/product.types';

export interface ProductRepository {
  getProducts(input?: GetProductsInput): Promise<ProductsResponse>;
  getMyProducts(): Promise<{ products: ProductItem[] }>;
  addToCart(productId: number, qty?: number): Promise<AddToCartResponse>;
  getCartCount(): Promise<number>;
  createProduct(input: CreateProductInput): Promise<CreateProductResponse>;
  updateProduct(input: CreateProductInput): Promise<CreateProductResponse>;
  getCategories(): Promise<{ categories: ProductCategory[] }>;
}
