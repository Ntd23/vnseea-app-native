---
name: frontend-seo-content
description: Use when adding or auditing SEO for frontend routes in this Nuxt project, including titles, meta descriptions, canonical URLs, robots behavior, Open Graph tags, sitemap expectations, and route-level content structure for public pages.
---

# Frontend SEO Content

Use this skill for SEO work in `client/`.

## Read Order

1. Read `references/public-route-seo.md`.
2. Read `references/nuxt-seo-patterns.md`.
3. Read `references/content-checklist.md` when the task includes public-page copy or discoverability concerns.

## Workflow

1. Confirm whether the route is public, mixed, or private.
2. Keep SEO decisions at the route wrapper or page-entry level.
3. Apply stable title, description, and canonical handling for public pages.
4. Keep private surfaces out of indexable SEO unless the user explicitly wants otherwise.
5. Audit sitemap and robots only when the route should be discoverable.

## Rules

- Do not scatter SEO logic across leaf components.
- Prefer `useSeoMeta` and `useHead` close to the route entry.
- Avoid indexing auth-only, settings, wallet, checkout, or account-private surfaces.
- Ensure SEO text matches real page intent and visible content.

## Helpful Files

- `client/nuxt.config.ts`
- `client/app/pages/*`
- `client/doc/page_feature_audit.md`
- `client/doc/ui_style_guide.md`

## Scripts and Assets

- Use `scripts/audit-seo-surface.ps1` to scan current SEO usage.
- Use `assets/seo-page-checklist.md` when preparing or reviewing a public route.
