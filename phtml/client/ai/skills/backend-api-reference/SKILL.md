---
name: backend-api-reference
description: Use when mapping this Nuxt frontend project to the existing backend API documentation, choosing backend endpoints for a bounded context, planning server/api bridge work, or verifying payload requirements such as access_token, server_key, POST fields, file uploads, and backend error formats from the documented social backend API.
---

# Backend API Reference

Use this skill when a task needs backend API endpoint selection, payload mapping, or API backlog planning for `client/src/<context>`.

## Read Order

1. Read `client/AGENTS.md`.
2. Read `references/api-doc-source.md`.
3. Read `references/api-v2-endpoint-map.md` for endpoint candidates.
4. Read `client/src/shared-kernel/application/constants/route-registry.ts`.
5. Read context docs only when needed, for example `client/doc/auth-api-flow.md` or `client/doc/api-context-connection-roadmap.md`.

## Core Rules

- Frontend components and repositories must call Nuxt `/_api/*`, not raw backend endpoints.
- Nuxt `server/api/*` handlers are the bridge to backend PHP/API behavior.
- Use backend PHP browser cookies as the auth session source of truth.
- Use documented backend API requirements:
  - most authenticated calls require `access_token` in the query string
  - backend API calls require `server_key` in POST data
  - backend errors use `api_status: "400"` with an `errors` object
- Prefer existing backend behavior before adding or changing PHP endpoints.
- Keep vendor-specific naming out of active integration code; use neutral names such as `backendApiBase`, `backendRoutes`, and `BackendApiClient`.

## Workflow

1. Identify the bounded context and route surface.
2. Check whether a Nuxt `server/api/*` bridge already exists.
3. Select backend endpoint candidates from `api-v2-endpoint-map.md`.
4. Verify whether the endpoint exists locally under `api/v2/endpoints/*` or is a legacy PHP route.
5. Map payloads at the bridge layer, not inside presentation components.
6. Normalize backend response into domain/application types before UI consumption.
7. Document missing backend endpoints separately instead of hiding gaps with mock data.

## Handoff Standard

When producing an API task list, include:

- context
- frontend route or feature
- Nuxt `/_api/*` route to add/update
- backend endpoint candidate
- source-of-truth file or doc link
- `do` items
- `don't` items
- blocker or note

If the user asks for a task backlog, create or update `client/doc/api-context-connection-roadmap.md`.
