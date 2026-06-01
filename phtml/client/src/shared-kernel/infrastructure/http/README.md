# Shared HTTP Kernel

Use this layer for all network access shared across bounded contexts.

Rules:

- Pages and components do not call `$fetch` directly.
- Application `ViewModel` / use-cases depend on repository interfaces.
- Frontend infrastructure repositories use `useNuxtApiClient()` to talk to Nuxt business routes under `/api/*`.
- Nuxt `server/api/*` handlers use `server/utils/backend-api-client.ts` to talk to backend PHP endpoints.

Base URL:

- `runtimeConfig.public.apiBase`
- default: `/api`
- env: `NUXT_PUBLIC_API_BASE`

Route registry:

- app and API paths are centralized in
  [route-registry.ts](../application/constants/route-registry.ts)
