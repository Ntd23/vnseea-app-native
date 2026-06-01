# Backend Bridge Rules

Use this file for backend bridge decisions.

## Source of Truth

- The PHP backend owns auth session and browser cookie behavior.
- Frontend should reuse backend session flows instead of creating a parallel session model.

## Endpoint Rules

- Frontend route: `/_api/...`
- Nuxt bridge: `client/server/api/*`
- Backend client: `client/server/utils/backend-api-client.ts`
- API response normalization: `client/server/utils/backend-api-response.ts`

## Payload Rules

- Keep backend-specific payload shaping inside `server/api/*` or infrastructure mappers.
- Keep frontend forms and page state typed around frontend needs first, then map toward backend shape.
- Normalize backend error responses before letting them surface to the page.

## Installed Nuxt Stack

Prefer the existing frontend stack when it helps:

- `@pinia/nuxt`
- `@vueuse/nuxt`
- `@nuxtjs/i18n`
- `@nuxtjs/seo`

Do not rebuild state, utility, or route-level behavior if an installed Nuxt package already fits the task.
