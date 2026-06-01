---
name: frontend-api-integration
description: Use when connecting a frontend bounded context in this Nuxt project to the backend API through the established DDD and MVVM layers. Applies to work on server/api routes, repository contracts and implementations, view-model wiring, backend payload mapping, mock-to-API transitions, and auth or business flows that must reuse the current PHP backend instead of bypassing it.
---

# Frontend API Integration

Use this skill for API wiring work in `client/`.

## Read Order

1. Read `references/api-architecture.md`.
2. Read `references/backend-bridge-rules.md`.
3. Read `references/examples-and-maps.md` for existing patterns and route examples.

## Workflow

1. Identify the bounded context in `src/<context>/*`.
2. Confirm whether the page already uses:
   - a mock repository
   - an API repository
   - a partial `server/api/*` bridge
3. Keep the flow:
   - `View -> ViewModel -> Repository -> server/api -> backend`
4. Add or update:
   - domain repository contract
   - API repository implementation
   - view-model or application use case
   - Nuxt `server/api/*` handler
   - mapper or response normalization if needed
5. Preserve backend PHP as the source of truth for auth and browser session behavior.
6. Prefer the installed Nuxt stack and the existing shared HTTP helpers before writing a parallel client.

## Rules

- Frontend calls `/_api/*`, not raw PHP endpoints.
- Use `server/api/*` as the only frontend-to-backend bridge.
- Reuse `route-registry.ts` for API paths where applicable.
- Reuse `backend-api-client.ts` and `backend-api-response.ts` for server-side backend calls.
- Prefer `@pinia/nuxt` only when state genuinely needs a shared store; otherwise keep page-local orchestration in the view-model.
- Do not call backend PHP directly from `.vue` pages or presentation components.

## Helpful Files

- `client/doc/api-ddd-mvvm-structure.md`
- `client/doc/auth-api-flow.md`
- `client/src/shared-kernel/application/constants/route-registry.ts`
- `client/server/utils/backend-api-client.ts`
- `client/server/utils/backend-api-response.ts`
- `client/server/api/*`

## Scripts and Assets

- Use `scripts/audit-api-context.ps1` to inspect a context quickly.
- Use `assets/api-change-checklist.md` when reviewing or handing off API bridge work.
