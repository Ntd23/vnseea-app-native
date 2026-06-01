# API Architecture

Use this file as the project-specific API shape for frontend work.

## Canonical Flow

- `app/pages/*`
- `src/<context>/presentation/pages/*`
- `src/<context>/application/view-models/*` or application composables
- `src/<context>/domain/repositories/*`
- `src/<context>/infrastructure/repositories/*`
- `server/api/*`
- backend PHP API

## Boundaries

- Presentation does not call `$fetch` to backend PHP directly.
- Domain owns repository contracts and business-facing types.
- Infrastructure owns backend payload mapping and HTTP details.
- `server/api/*` is the Nuxt-side anti-corruption layer.

## Shared Modules To Reuse

- `src/shared-kernel/infrastructure/http/nuxt-api-client.ts`
- `server/utils/backend-api-client.ts`
- `server/utils/backend-api-response.ts`
- `src/shared-kernel/application/constants/route-registry.ts`

## Existing Context Examples

- `auth`
- `checkout`
- `orders`
- `profile`
