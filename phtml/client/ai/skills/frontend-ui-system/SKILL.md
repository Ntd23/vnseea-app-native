---
name: frontend-ui-system
description: Use when editing or creating frontend pages, layouts, components, or design tokens in this Nuxt project and the output must stay aligned with the shared visual system instead of drifting into one-off UI. Applies to page sync, layout cleanup, responsive adjustments, and component parity work across auth, feed, messages, profile, product, and other frontend contexts.
---

# Frontend UI System

Use this skill for frontend UI work in `client/`.

## Read Order

1. Read `references/project-ui-rules.md`.
2. Read `references/component-patterns.md` if the task touches shared UI such as navigation, cards, forms, feed, or auth shells.
3. Read `references/route-audit-seed.md` if the task is page-level and you need route priority or context hints.

## Workflow

1. Identify the bounded context in `src/<context>/presentation/*`.
2. Inspect the nearest existing page or component that already matches the intended style.
3. Preserve spacing, typography, border, radius, and button hierarchy from the existing system.
4. Change structure only when necessary; prefer class-level and wrapper-level fixes first.
5. Keep route wrappers in `app/pages/*` thin.
6. If the page is wrong only on the custom domain, stop and check asset delivery before redesigning the page.

## Rules

- Follow `client/doc/ui_style_guide.md`.
- Do not redesign unless the user explicitly asks for it.
- Prefer shared UI patterns over per-page inventions.
- Keep responsive behavior intact on mobile and desktop.
- Avoid using hacky loading overlays to mask proxy or asset issues.

## Helpful Files

- `client/doc/ui_style_guide.md`
- `client/doc/page_feature_audit.md`
- `client/doc/refactor-progress.md`
- `client/src/*/presentation/*`
- `client/app/layouts/*`

## Scripts and Assets

- Use `scripts/audit-ui-scope.ps1` to inspect a context quickly.
- Use `assets/page-review-checklist.md` as a lightweight review template when auditing a page or component set.
