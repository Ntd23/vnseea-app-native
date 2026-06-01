# Checkout API Boundary

Frontend checkout code no longer calls WoWonder PHP endpoints directly.

Current structure:

- `src/checkout/infrastructure/repositories/ApiCheckoutRepository.ts`
- `src/checkout/infrastructure/repositories/MockCheckoutRepository.ts`
- `src/shared-kernel/infrastructure/http/nuxt-api-client.ts`
- `server/api/checkout/*`
- `server/utils/backend-api-client.ts`

Business-shaped frontend endpoints:

- `GET /api/checkout/snapshot`
- `POST /api/checkout/address`
- `POST /api/checkout/submit`
