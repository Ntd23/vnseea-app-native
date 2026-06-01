# Flow Rules

Use this file for project-specific UX flow decisions.

## Layering

- Route access control belongs in middleware, not inside page templates.
- Server-side redirects should be preferred for SSR route access where possible.
- Async UI states should stay close to the action or page they affect.

## Auth

- Backend PHP owns the browser session.
- Nuxt should bridge to backend behavior instead of inventing a separate frontend session model.
- Guest pages should not visibly render for authenticated users.

## Routing

- Use clear middleware names such as `guest`, `authenticated.global`, and `guest-only`.
- Keep route wrappers in `app/pages/*` thin and deterministic.

## Failure Analysis

When a page flashes, reloads badly, or redirects incorrectly, classify the failure:

1. server redirect problem
2. route middleware problem
3. async loading-state problem
4. proxy or asset delivery problem
5. component bug

Fix the highest layer that truly owns the behavior.
