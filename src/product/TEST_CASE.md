# Product Marketplace Test Cases

| ID | Status | Scenario | Expected result |
| --- | --- | --- | --- |
| `PRODUCT-MARKET-001` | `[ ]` | Open `Settings -> Cửa hàng` | Marketplace screen opens and loads products from `/api/get-products`. |
| `PRODUCT-MARKET-002` | `[ ]` | Pull down on the product list | The first product page reloads without duplicating items. |
| `PRODUCT-MARKET-003` | `[ ]` | Scroll to the end of the product list | The next page loads with `offset=<last product id>`. |
| `PRODUCT-MARKET-004` | `[ ]` | Enter a product keyword | The list reloads with `keyword=<search text>` after debounce. |
| `PRODUCT-MARKET-005` | `[ ]` | Select `Giá thấp` or `Giá cao` | The list reloads with the matching `order_by` value. |
| `PRODUCT-MARKET-006` | `[ ]` | Tap a product card | Product details open inside the app. |
| `PRODUCT-MARKET-007` | `[ ]` | Tap `Đăng bán` | The existing create-product wizard opens. |
| `PRODUCT-MARKET-008` | `[ ]` | Force an API error or empty response | The screen shows an informative state with retry or create action. |
