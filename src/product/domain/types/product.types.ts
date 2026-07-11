// Description: Defines product domain models and API request/response contracts.

export interface ProductCategory {
  id: number;
  lang_key: string;
  categories: ProductSubCategory[];
}

export interface ProductSubCategory {
  id: number;
  lang_key: string;
}

export interface ProductImage {
  id: number;
  image: string;
  product_id: number;
}

export interface ProductItem {
  id: number;
  user_id: number;
  name: string;
  category: number;
  category_name: string;
  product_sub_category?: string;
  sub_category?: number;
  description: string;
  price: string;
  currency: string;
  currency_code: string;
  currency_symbol: string;
  location: string;
  lat?: string;
  lng?: string;
  type: number; // 0 = normal, 1 = sell
  units?: number;
  rating?: number | string;
  reviews_count?: number | string;
  active: number;
  post_id: number;
  time: string;
  images: ProductImage[];
  seller: {
    user_id: number;
    username: string;
    name: string;
    avatar: string;
  };
  is_owner: boolean;
  can_contact_seller: boolean;
  can_add_to_cart: boolean;
}

export interface ProductsResponse {
  api_status: number;
  products: ProductItem[];
  products_categories: Record<string, ProductSubCategory[]>;
  distance_filter_available: boolean | number;
  currencies?: Record<string, { text: string; symbol: string } | string>;
}

export interface CreateProductResponse {
  api_status: number;
  product_id?: number;
  product_post_id?: number;
  errors?: {
    error_id: number;
    error_text: string;
  };
}

export interface AddToCartResponse {
  api_status: number | string;
  type?: string;
  count?: number;
  message?: string;
}

export interface CreateProductInput {
  product_id?: number;
  product_title: string;
  product_category: string;
  product_description: string;
  product_price: string;
  product_location: string;
  images: { uri: string; name: string; type: string }[];
  product_type?: number; // 0 = normal, 1 = sell
  currency?: string;
  lat?: string;
  lng?: string;
  units?: number;
  product_sub_category?: string;
}

export interface GetProductsInput {
  limit?: number;
  user_id?: number;
  offset?: number;
  category_id?: number;
  sub_id?: number;
  keyword?: string;
  distance?: number;
  order_by?: 'price_low' | 'price_high';
  product_id?: number;
}
