# Orders API Layer

Frontend orders code now goes through Nuxt business routes instead of hitting `market.php` directly.

Current structure:

- `src/orders/infrastructure/repositories/ApiOrderRepository.ts`
- `src/orders/infrastructure/repositories/MockOrderRepository.ts`
- `src/shared-kernel/infrastructure/http/nuxt-api-client.ts`
- `server/api/orders/*`
- `server/api/customer-orders/*`
- `server/utils/backend-api-client.ts`

Business-shaped frontend endpoints:

- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders/:id/received`
- `GET /api/customer-orders/:id`
- `POST /api/customer-orders/:id/status`
