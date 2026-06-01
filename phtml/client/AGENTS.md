# Frontend Rules

This file governs all work inside `client/`.

## Architecture

- Treat `app/` as the Nuxt delivery layer only.
- Keep implementation in `src/<bounded-context>/*`.
- Preserve the flow:
  - `presentation -> application -> domain/infrastructure`
- Do not move business logic back into `app/pages`, `app/layouts`, or route wrappers.

## Routing

- Public UI routes live in `app/pages/*`.
- Route wrappers should stay thin:
  - choose layout
  - normalize params or query
  - apply route-level metadata when needed
  - render the real page from `src/*/presentation/pages/*`
- Use naming such as:
  - `guest`
  - `authenticated.global`
  - `guest-only`
- Prefer centralized route constants where the repo already uses them.

## API and Session Rules

- Frontend calls `/_api/*`, not raw PHP endpoints.
- `server/api/*` is the bridge between Nuxt and the PHP backend.
- Backend PHP is the source of truth for auth session and browser cookies.
- Do not invent a frontend-only auth session unless the user explicitly changes the requirement.
- Reuse existing PHP behavior before changing PHP code.

## Nuxt Package Rules

- Prefer the Nuxt libraries already installed in `package.json` before building custom replacements.
- Current frontend packages to favor:
  - `@nuxt/ui` for app-level UI primitives and composable UI patterns
  - `@nuxt/icon` for icons
  - `@nuxt/image` for image rendering and optimization
  - `@nuxtjs/i18n` for locale and message handling
  - `@nuxtjs/seo` for route-level SEO
  - `@pinia/nuxt` for stores when shared state is truly needed
  - `@vueuse/nuxt` for common reactive utilities
  - `@nuxt/fonts` for font loading
- Do not re-implement a capability with ad-hoc Vue code if an installed Nuxt module already covers it cleanly.
- If a built-in or installed Nuxt module is not being used, explain why before adding a custom solution.

## UI Rules

- Follow [doc/ui_style_guide.md](doc/ui_style_guide.md).
- Preserve the existing visual system unless the user explicitly asks for redesign.
- Avoid one-off page styling.
- Reuse established page shells, card styles, form styles, and navigation patterns.

## UX Rules

- Fix redirects at the correct layer first:
  - server-side redirect for SSR route access issues
  - route middleware for page access control
  - component loading states for local async states
- Do not hide broken rendering with custom boot overlays unless the user explicitly wants that workaround.
- If `127.0.0.1:3000` looks correct but the custom domain does not, suspect proxy or asset delivery before changing UI code.

## SEO Rules

- Public pages should define route-level SEO intentionally.
- Keep SEO logic near the route wrapper or page entry, not scattered across unrelated components.
- Prefer canonical URLs, stable titles, and clean Open Graph metadata for public pages.
- Do not add indexable SEO metadata to private or auth-only surfaces unless there is a clear product reason.

## Debugging Rules

- Compare behavior between:
  - `http://127.0.0.1:3000`
  - the Laragon custom domain
- Do not run `nuxt prepare`, `nuxi prepare`, or `nuxt build` while a Nuxt dev server is running for this project. Those commands regenerate `.nuxt` and can remove `.nuxt/dist/server/server.mjs`, breaking the active dev server until `pnpm dev` is restarted.
- For reload, hydration, or unstyled-page issues, inspect:
  - `/_nuxt/*.css`
  - `/_nuxt/*.js`
  - `/api/_nuxt_icon/*`
  - Vite dev endpoints such as `/@vite`, `/@fs`, and `/@id`

## Reference Docs

Read these as needed:

- [doc/ui_style_guide.md](doc/ui_style_guide.md)
- [doc/page_feature_audit.md](doc/page_feature_audit.md)
- [doc/api-ddd-mvvm-structure.md](doc/api-ddd-mvvm-structure.md)
- [doc/refactor-progress.md](doc/refactor-progress.md)
- [doc/auth-api-flow.md](doc/auth-api-flow.md)

## Repo-Local Skill Sources

Reusable frontend skill sources live in:

- `client/ai/skills/frontend-ui-system/`
- `client/ai/skills/frontend-ux-flow/`
- `client/ai/skills/frontend-seo-content/`
- `client/ai/skills/frontend-api-integration/`
- `client/ai/skills/frontend-nuxt-routing/`
- `client/ai/skills/frontend-bounded-context-refactor/`
- `client/ai/skills/frontend-testcase/`
- `client/ai/skills/backend-api-reference/`

These are versioned in the repo so new chats and other agents can reuse the same project guidance.

To install or refresh them for Codex skill auto-discovery, use:

- `client/ai/sync-codex-skills.ps1`
