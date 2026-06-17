# Description: Test cases for the product marketplace bounded context.

# Product Marketplace Test Cases

| ID | Status | Scenario | Expected result |
| --- | --- | --- | --- |
| `PRODUCT-MARKET-001` | `[ ]` | Open `Settings -> Cửa hàng` | Marketplace screen opens and loads products from `/api/get-products`. |
| `PRODUCT-MARKET-002` | `[ ]` | Pull down on the product list | The first product page reloads without duplicating items. |
| `PRODUCT-MARKET-003` | `[ ]` | Scroll to the end of the product list | The next page loads with `offset=<last product id>`. |
| `PRODUCT-MARKET-004` | `[ ]` | Enter a product keyword | The list reloads with `keyword=<search text>` after debounce. |
| `PRODUCT-MARKET-005` | `[ ]` | Tap the filter icon beside search | Filter panel opens with sort, category, distance slider, and reset controls. |
| `PRODUCT-MARKET-006` | `[ ]` | Apply sort/category/distance filters | The list reloads with matching marketplace filters and keeps all category chips visible. |
| `PRODUCT-MARKET-007` | `[ ]` | Tap a product card | Product details open inside the app. |
| `PRODUCT-MARKET-008` | `[ ]` | Tap `Sản phẩm của tôi` | My Products screen opens with product, purchased, orders, and marketplace tabs. |
| `PRODUCT-MARKET-009` | `[ ]` | Tap `Đăng bán` on My Products | The existing create-product wizard opens. |
| `PRODUCT-MARKET-010` | `[ ]` | Use My Products search/filter icon controls on every tab | Each tab shows search plus filter icon; filters open in a panel. |
| `PRODUCT-MARKET-011` | `[ ]` | Open Purchased or Orders tabs | Real `/api/market` data loads for `type=purchased` and `type=orders`; no mock rows appear. |
| `PRODUCT-MARKET-012` | `[ ]` | Use Purchased or Orders search/status controls | Orders filter by code/shop and status. |
| `PRODUCT-MARKET-013` | `[ ]` | Tap `Marketplace` tab on My Products | App navigates to `Gần đây` / nearby users route. |
| `PRODUCT-MARKET-014` | `[ ]` | Use distance slider without user location | A clear location-missing error is shown when the API cannot apply distance filtering. |
| `PRODUCT-MARKET-015` | `[ ]` | Force an API error or empty response | The screen shows an informative state with retry where applicable. |
| `PRODUCT-DETAIL-001` | `[ ]` | Open a product detail | Product images render above the product name and detail sections. |
| `PRODUCT-DETAIL-002` | `[ ]` | Inspect the bottom bar on a small phone | `Thêm vào giỏ` stays on one line and the action spacing remains balanced. |
| `PRODUCT-CHECKOUT-001` | `[ ]` | Tap `Thêm vào giỏ` | App calls `/api/market` with `type=add_cart`, then opens Checkout. |
| `PRODUCT-CHECKOUT-002` | `[ ]` | Checkout has no saved address | Address form appears and must be saved before payment. |
| `PRODUCT-CHECKOUT-003` | `[ ]` | Checkout has saved address | Address card and wallet payment step appear. |
| `PRODUCT-CHECKOUT-004` | `[ ]` | Increase or decrease quantity in order summary | App calls `/api/market` with `type=change_qty`, then refreshes totals and wallet eligibility. |
| `PRODUCT-CHECKOUT-005` | `[ ]` | Decrease quantity from `1` to `0` | App calls `/api/market` with `type=remove_cart`; the product disappears from the order summary. |
| `PRODUCT-CHECKOUT-006` | `[ ]` | Add a product already in cart from product detail | App increments existing cart quantity using `type=change_qty` instead of showing `product already in cart`. |
| `PRODUCT-CHECKOUT-007` | `[ ]` | Review order with converted backend total | Line item, subtotal, wallet, and total use the same converted currency display. |
| `PRODUCT-CHECKOUT-008` | `[ ]` | Open payment step with insufficient wallet | User sees an insufficient-wallet warning and only the `Nạp thêm vào ví` action. |
| `PRODUCT-CHECKOUT-009` | `[ ]` | Open payment step with enough wallet | User sees `Thanh toán bằng ví`; no deposit prompt is shown. |
| `PRODUCT-CHECKOUT-010` | `[ ]` | Tap wallet payment when eligible | Confirmation modal appears with item count, current wallet, and total amount. |
| `PRODUCT-CHECKOUT-011` | `[ ]` | Confirm purchase in modal | App calls `/api/market` with `type=buy` and selected `address_id`; backend deducts from `wallet`. |
| `PRODUCT-CHECKOUT-012` | `[ ]` | Open Marketplace with existing cart items | Header cart icon shows the current item count and opens Checkout when tapped. |

## Regression Commands

```powershell
npx tsc --noEmit
```
