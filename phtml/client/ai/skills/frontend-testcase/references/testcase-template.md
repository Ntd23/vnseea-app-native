English description: Template for context-level frontend TEST_CASE.md files in this Nuxt project.

# <Context> Test Cases

English description: Test cases for the `<context>` bounded context.

## Scope

- Context: `client/src/<context>`
- Routes:
  - `<route>`
- Main entry points:
  - `<page/component/view-model/repository>`
- Out of scope:
  - `<explicit exclusions>`

## Environment

- Nuxt direct: `http://127.0.0.1:3000`
- Laragon proxy: `<custom-domain>`
- Backend session source: PHP browser cookies
- API bridge: `/_api/*`

## Smoke

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `<CTX>-SMOKE-001` | `[ ]` | Hard reload route | `<route>` | Page renders without Nuxt error, raw HTML flash, or broken assets. |
| `<CTX>-SMOKE-002` | `[ ]` | Client navigation | `<from> -> <to>` | Route changes without stale state or console error. |

## Route Access

| ID | Status | Case | Precondition | Expected |
| --- | --- | --- | --- | --- |
| `<CTX>-ROUTE-001` | `[ ]` | Direct URL access | `<logged in/out>` | Correct middleware behavior and final route. |
| `<CTX>-ROUTE-002` | `[ ]` | Back/forward navigation | `<state>` | No protected or guest page leak. |

## API And Data

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `<CTX>-API-001` | `[ ]` | Success response | `/_api/<path>` | UI renders real backend data, not mock data. |
| `<CTX>-API-002` | `[ ]` | Backend error | `/_api/<path>` | User sees safe error state; no unhandled Nuxt error. |
| `<CTX>-API-003` | `[ ]` | Empty response | `/_api/<path>` | Empty state follows UI guide. |

## UI And UX

| ID | Status | Case | Viewport | Expected |
| --- | --- | --- | --- | --- |
| `<CTX>-UI-001` | `[ ]` | Desktop layout | `>= 1024px` | Layout, spacing, cards, and menus match project UI rules. |
| `<CTX>-UI-002` | `[ ]` | Mobile layout | `< 768px` | No overflow, clipped menu, or broken tap target. |
| `<CTX>-UX-001` | `[ ]` | Loading state | slow API | No raw/unstyled UI or fake data. |

## Regression Commands

```powershell
cd client
npm run build
```

## Notes

- `<Add known backend requirements, accounts, or blocked cases here.>`
