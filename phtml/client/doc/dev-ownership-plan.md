English description: Three-developer ownership plan for API connection work with conflict boundaries and shared-file rules.

# Dev Ownership Plan

## Goal

Split API connection work by bounded context so three developers can work in parallel without editing the same files.

## Shared Ownership Rules

| Area | Owner | Rule |
| --- | --- | --- |
| `client/src/shared-kernel/**` | Dev 1 | Other devs request route/API constants through Dev 1 or a small dedicated PR. |
| `client/src/shared-kernel/application/constants/route-registry.ts` | Dev 1 | Do not edit directly from Dev 2/Dev 3 feature branches. |
| `client/src/auth/application/constants/route-policy.ts` | Dev 1 | Auth policy changes must stay centralized. |
| `client/server/utils/**` | Dev 1 | Backend/Nuxt API client changes must be coordinated before merge. |
| `client/src/navigation/**` | Dev 1 | Header, mobile menu, user menu, badges, and search entry are shared shell. |
| `client/app/middleware/**` and `client/server/middleware/**` | Dev 1 | Route access and SSR auth redirects are shared infrastructure. |
| `client/app/assets/css/**` | Dev 1 | No UI redesign or token edits from feature API branches. |

## Developer 1: Core / Session / Navigation

Owned contexts:

- `auth`
- `navigation`
- `shared-kernel`
- `forms`
- `foundation`
- `search`
- `settings`

Allowed write areas:

- `client/src/auth/**`
- `client/src/navigation/**`
- `client/src/shared-kernel/**`
- `client/src/forms/**`
- `client/src/foundation/**`
- `client/src/search/**`
- `client/src/settings/**`
- `client/server/api/auth/**`
- `client/server/api/navigation/**`
- `client/server/api/search/**`
- `client/server/api/settings/**`
- `client/app/middleware/**`
- `client/server/middleware/**`
- `client/doc/*ownership*`
- `client/doc/api-context-connection-roadmap.md`

Do:

- Own current-user bootstrap and route access.
- Own header/menu/search shell API data.
- Own shared route/API constants.
- Own generic form/foundation API state components.
- Keep `TEST_CASE.md` updated for owned contexts.

Don't:

- Do not implement feed/post/comment/product/order APIs.
- Do not change page-specific UI in Dev 2/Dev 3 contexts.

## Developer 2: Social / Community / Feed

Owned contexts:

- `feed`
- `profile`
- `messages`
- `community`
- `pages`
- `explore`
- `popular`
- `saved`
- `reels`
- `watch`
- `photos`
- `lightbox`
- `memories`
- `poke`

Allowed write areas:

- `client/src/<owned-context>/**`
- `client/server/api/<owned-context>/**`
- `client/src/<owned-context>/TEST_CASE.md`

Don't:

- Do not edit `route-registry.ts` directly.
- Do not edit auth/session middleware.
- Do not edit header/mobile menu shared shell.
- Do not edit shared HTTP clients.

## Developer 3: Commerce / Content / Utility

Owned contexts:

- `product`
- `checkout`
- `orders`
- `wallet`
- `withdrawal`
- `blogs`
- `events`
- `jobs`
- `funding`
- `games`
- `go-pro`
- `forum`
- `directory`
- `live`
- `movies`

Allowed write areas:

- `client/src/<owned-context>/**`
- `client/server/api/<owned-context>/**`
- `client/src/<owned-context>/TEST_CASE.md`

Don't:

- Do not edit `route-registry.ts` directly.
- Do not edit auth/session middleware.
- Do not edit header/mobile menu shared shell.
- Do not edit shared HTTP clients.

## Merge Order

1. Merge Dev 1 core/session/shared route changes first.
2. Dev 2 and Dev 3 rebase onto Dev 1.
3. Merge Dev 2 social APIs.
4. Merge Dev 3 commerce/content APIs.
5. Resolve route constant requests through Dev 1 follow-up PRs if needed.
