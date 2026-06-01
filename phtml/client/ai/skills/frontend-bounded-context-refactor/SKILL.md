---
name: frontend-bounded-context-refactor
description: Use when refactoring frontend code in this Nuxt project into bounded contexts under `src/*`, including moving route runtime out of `app/*`, separating presentation, application, domain, and infrastructure responsibilities, introducing shared-kernel boundaries, and cleaning legacy cross-context coupling without breaking the current transition path.
---

# Frontend Bounded Context Refactor

Use this skill for structural frontend refactor work in `client/`.

## Read Order

1. Read `references/refactor-target.md`.
2. Read `references/boundary-rules.md`.
3. Read `references/migration-patterns.md`.

## Workflow

1. Identify the target context and its current runtime location.
2. Classify what currently lives in:
   - `app/pages/*`
   - `app/components/*`
   - `app/composables/*`
   - `src/<context>/*`
3. Move toward the target flow:
   - `app/pages/*` thin wrapper
   - `src/<context>/presentation/*`
   - `src/<context>/application/*`
   - `src/<context>/domain/*`
   - `src/<context>/infrastructure/*`
4. Keep the runtime working at every step.
5. Remove legacy code only after the new path is clearly in use.
6. Preserve SSR, SEO, and UI rules while refactoring.

## Rules

- `app/*` is delivery, not the main business runtime.
- Keep route wrappers thin.
- Do not move business logic into Vue pages during the refactor.
- Prefer bounded-context internals over new shared-kernel dumping.
- Use the installed Nuxt stack before introducing custom platform primitives.
- In transition phases, use composables in `application/*` when a full store or use-case split is not yet justified.

## Helpful Files

- `client/doc/refactor-guide.md`
- `client/doc/refactor-blueprint-ddd.md`
- `client/doc/refactor-sample-checkout.md`
- `client/doc/refactor-sample-community.md`
- `client/doc/api-ddd-mvvm-structure.md`

## Scripts and Assets

- Use `scripts/audit-context-structure.ps1` to inspect a context and its remaining legacy surface.
- Use `assets/context-refactor-checklist.md` when planning or reviewing a context migration.
