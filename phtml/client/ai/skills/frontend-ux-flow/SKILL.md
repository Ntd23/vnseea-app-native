---
name: frontend-ux-flow
description: Use when editing or reviewing frontend user flows in this Nuxt project, including auth journeys, redirects, loading states, empty and error states, route access, page transitions, and SSR or client behavior that affects perceived UX across the site.
---

# Frontend UX Flow

Use this skill for frontend flow and behavior work in `client/`.

## Read Order

1. Read `references/flow-rules.md`.
2. Read `references/state-patterns.md` when the task touches loading, empty, success, or error states.
3. Read `references/runtime-debug-notes.md` when the issue appears only on the custom domain or only after reload.

## Workflow

1. Identify whether the problem belongs to:
   - route access
   - auth state
   - async state
   - SSR vs client behavior
   - proxy or asset delivery
2. Fix the issue at the correct layer first.
3. Reuse existing backend session behavior instead of creating frontend-only auth flow.
4. Keep route wrappers and presentation files focused on presentation.
5. Audit the experience on both direct Nuxt dev and the custom domain when reload or hydration is involved.

## Rules

- Backend PHP is the source of truth for browser auth session.
- `/_api/*` is the frontend API boundary.
- Server-side redirects should stop guest pages from rendering for authenticated users.
- Do not mask broken SSR or broken asset delivery with custom splash screens unless explicitly requested.

## Helpful Files

- `client/doc/auth-api-flow.md`
- `client/doc/page_feature_audit.md`
- `client/doc/api-ddd-mvvm-structure.md`
- `client/server/middleware/*`
- `client/app/middleware/*`

## Scripts and Assets

- Use `scripts/check-ux-surface.ps1` to inspect middleware, redirects, and common async patterns.
- Use `assets/flow-review-checklist.md` during audits.
