# Examples And Maps

Use these existing examples before inventing a new pattern.

## Context Examples

- `auth`
  - view-models in `src/auth/application/view-models/*`
  - bridge handlers in `server/api/auth/*`
- `checkout`
  - bridge handlers in `server/api/checkout/*`
- `orders`
  - bridge handlers in `server/api/orders/*`
  - customer order bridge handlers in `server/api/customer-orders/*`
- `profile`
  - bridge handler in `server/api/profile/[username].get.ts`

## Route Registry

Use:

- `appRoutes` for UI navigation
- `apiRoutes` for frontend API route strings

Current registry file:

- `client/src/shared-kernel/application/constants/route-registry.ts`

## Auth Flow Reference

Read:

- `client/doc/auth-api-flow.md`

This is the best concrete sample for:

- view-model orchestration
- repository interface and implementation split
- Nuxt bridge handlers
- backend response normalization
