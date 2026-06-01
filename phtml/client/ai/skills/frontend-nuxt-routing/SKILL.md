---
name: frontend-nuxt-routing
description: Use when creating, auditing, or refactoring routing in this Nuxt project, including file-based routes, thin page wrappers, route registry updates, dynamic routes, middleware naming, SSR redirects, public versus private route behavior, and route-level metadata or canonical handling.
---

# Frontend Nuxt Routing

Use this skill for routing work in `client/`.

## Read Order

1. Read `references/routing-rules.md`.
2. Read `references/route-registry-guide.md`.
3. Read `references/middleware-and-redirects.md` if the task touches guest, auth, or SSR redirect behavior.

## Workflow

1. Determine whether the task belongs to:
   - file-based route creation
   - route wrapper cleanup
   - route registry update
   - middleware or redirect behavior
   - route-level SEO or canonical behavior
2. Keep route wrappers thin.
3. Prefer Nuxt file-based routing over custom config hacks.
4. Update centralized route constants when the repo already uses them.
5. Keep SSR redirect logic in middleware, not in random page components.

## Rules

- Public UI routes live in `app/pages/*`.
- Route wrappers should render the real page from `src/*/presentation/pages/*`.
- Prefer file-based routing over `pages:extend` or other config hacks unless Nuxt cannot express the route cleanly.
- Use route middleware names such as `guest` and `authenticated.global`.
- Use Nitro server middleware names such as `guest-only`.
- Reuse backend auth cookies for route access decisions when auth is involved.

## Helpful Files

- `client/src/shared-kernel/application/constants/route-registry.ts`
- `client/app/pages/*`
- `client/app/middleware/*`
- `client/server/middleware/*`
- `client/nuxt.config.ts`

## Scripts and Assets

- Use `scripts/audit-route-surface.ps1` to inspect current routes and middleware quickly.
- Use `assets/route-change-checklist.md` when reviewing route work.
