---
name: frontend-testcase
description: Use when creating, updating, or auditing TEST_CASE.md files for bounded contexts in this Nuxt frontend project. Applies to manual QA cases, route and middleware checks, auth/session flows, API bridge verification, UI/UX regression coverage, SEO checks for public pages, and mock-to-real-data transition test plans under client/src/<context>.
---

# Frontend Testcase

Use this skill when a task asks for testcase docs, test plans, QA checklists, regression cases, or context-level verification under `client/src/*`.

## Read Order

1. Read `client/AGENTS.md`.
2. Read `references/coverage-rules.md`.
3. Read `references/testcase-template.md` before creating or rewriting a `TEST_CASE.md`.
4. Read context-specific docs only when relevant, for example `client/doc/auth-api-flow.md` for auth or `client/doc/api-ddd-mvvm-structure.md` for API wiring.

## Placement

- Put context test plans at `client/src/<context>/TEST_CASE.md`.
- Keep route wrappers in `client/app/pages/*` out of the testcase location unless the test is explicitly about delivery-layer routing.
- If a testcase covers shared infrastructure, put it under the nearest owning context first; use `client/src/shared-kernel/TEST_CASE.md` only for truly shared behavior.

## Workflow

1. Identify the bounded context and the user-facing routes it owns.
2. Inspect the route constants in `client/src/shared-kernel/application/constants/route-registry.ts`.
3. Inspect active view-models, repositories, server API handlers, stores, and middleware used by that context.
4. Create or update `TEST_CASE.md` using the reference template.
5. Prefer concrete manual cases with:
   - stable test ID
   - route or entry point
   - precondition
   - steps
   - expected result
   - status
6. Cover the real project flow before edge cases:
   - SSR and hard reload
   - direct URL entry
   - client navigation
   - API success and API failure
   - loading, empty, disabled, and error states
   - desktop and mobile layout
7. Mark mock-dependent behavior clearly as blocked or temporary; do not write it as accepted production behavior.

## Rules

- Do not invent routes, backend endpoints, or user roles; verify them from repo files.
- Frontend API cases must go through `/_api/*`, not raw PHP endpoints, unless testing the backend bridge itself.
- Auth/session cases must treat PHP backend cookies as the source of truth.
- UI cases must reference `client/doc/ui_style_guide.md` when visual parity is involved.
- SEO cases apply only to public/indexable pages unless the product explicitly requires otherwise.
- Keep testcase docs actionable enough that another agent can execute them without reading the whole conversation.

## Output Standard

- Start every new `TEST_CASE.md` with an English description line.
- Use checkboxes for status:
  - `[ ]` not run
  - `[x]` passed
  - `[~]` blocked or partial
- Use concise tables for large matrices and short sections for flows that need steps.
- Include a final `Regression Commands` or `Verification Commands` section only when commands are useful for that context.
