# Product Domain
Port từ: `client/src/product/`

## Structure
- `domain/` — Types & Repository interfaces
- `application/` — Use Cases & ViewModels
- `infrastructure/` — API implementations
- `presentation/` — Screens & Components

## WoWonder Product API

### Endpoints
| Route | Method | Description |
|-------|--------|-------------|
| `new-product` | POST | Create new product |
| `get-products` | POST | Get products list |

### Create Product (`/api/new-product`)

**Required POST fields:**
- `product_title` (string) - Product name
- `product_category` (string) - Category ID
- `product_description` (string) - Full description
- `product_price` (string) - Price (must be > 0.00)
- `product_location` (string) - Location string
- `images[]` (multipart file array) - Product images (jpg, png, gif, jpeg)

**Optional fields:**
- `product_type` (int) - 0 = normal, 1 = sell
- `currency` (string) - Currency code (VND)
- `lat` / `lng` (string) - GPS coordinates
- `units` (int) - Available quantity
- `product_sub_category` (string) - Sub-category ID

**Success Response (200):**
```json
{
  "api_status": 200,
  "product_id": 123,
  "product_post_id": 456
}
```

**Error Response (400):**
```json
{
  "api_status": 400,
  "errors": {
    "error_id": 3,
    "error_text": "product_title (POST) is missing"
  }
}
```

### Get Products (`/api/get-products`)

**POST params:**
- `limit` (int) - Results per page (default 35)
- `user_id` (int) - Filter by seller
- `offset` (int) - Pagination offset
- `category_id` (int) - Category filter
- `sub_id` (int) - Sub-category filter
- `keyword` (string) - Search text
- `distance` (float) - Distance filter (km)
- `order_by` (string) - `price_low` | `price_high`

**Response (200):**
```json
{
  "api_status": 200,
  "products": [...],
  "products_categories": {...},
  "distance_filter_available": true
}
```

### Product Item Structure
```typescript
interface ProductItem {
  id: number;
  user_id: number;
  name: string;
  category: number;
  category_name: string;
  description: string;
  price: string;
  currency: string;
  currency_code: string;
  currency_symbol: string;
  location: string;
  images: ProductImage[];
  seller: { user_id, username, name, avatar };
  is_owner: boolean;
  can_contact_seller: boolean;
  can_add_to_cart: boolean;
}
```