# Description: Guide for wiring React Native bounded contexts to the shared WoWonder API bridge.

# API Context Guide

## Shared Flow

Use one flow for every context:

```txt
Screen -> ViewModel -> Repository interface -> API repository -> apiBridge -> apiClient -> WoWonder API
```

Do not call API directly from screens.

## Shared Configuration

Runtime API config is read only from:

```txt
src/shared-kernel/infrastructure/config/env.ts
```

Local env values live in `.env`:

```env
API_BASE_URL=https://vnseea.vn/api
WEB_BASE_URL=https://vnseea.vn
SERVER_KEY=...
REQUEST_TIMEOUT_MS=15000
```

Rules:

- Do not hardcode API URLs, server keys, or timeouts inside contexts.
- Do not commit `.env`.
- Keep `.env.example` with placeholder values only.
- After changing `.env`, rebuild Android. Metro reload is not enough because `react-native-config` is native-backed.

## Shared API Client

Use:

```txt
src/shared-kernel/infrastructure/api/apiBridge.ts
```

Helpers:

```ts
apiBridge.get<TResponse>(url, params);
apiBridge.post<TResponse>(url, payload);
apiBridge.multipart<TResponse>(url, payload);
```

The shared client already handles:

- `API_BASE_URL`
- `server_key`
- `access_token`
- URL normalization from `/api/auth` to `/auth`
- API envelope/error normalization through `apiResponse.ts`
- URL-encoded POST payloads for PHP `$_POST`

Do not manually add `server_key`, `access_token`, base URL, or request headers in context repositories.

## Foundation Mappers

Use `foundation` for shared raw API value resolution and summary mapping:

```txt
src/foundation
```

Foundation owns:

- primitive normalizers: id, string, number, boolean
- URL normalizers that convert relative media paths into full URLs
- pagination payload helpers
- reusable summary mappers:
  - user
  - page
  - group
  - post
  - media

Foundation does not own:

- API clients
- session storage
- screen state
- React Native UI components
- feature-specific business rules

When a context needs shared mapping, prefer:

```ts
import { resolveSummaryMappers } from '../../foundation';
```

If a mapper is only used by one context, keep it inside that context first. Move it into `foundation` only after at least two contexts need the same shape.

## Routes

Declare API paths in:

```txt
src/shared-kernel/application/constants/route-registry.ts
```

Example:

```ts
export const apiRoutes = {
  events: {
    list: '/api/get-events',
    create: '/api/create-event',
  },
} as const;
```

Context repositories import from `apiRoutes`.

## Auth Session

Auth token storage lives in:

```txt
src/shared-kernel/infrastructure/storage/sessionStorage.ts
```

After login/register, auth saves:

- `accessToken`
- `userId`
- `userPlatform`

Authenticated API calls automatically receive:

```txt
?access_token=<stored-token>
```

Do not read or write auth token directly in feature screens.

## Context Structure

Use this structure for each context:

```txt
src/<context>/
  domain/
    repositories/<Context>Repository.ts
    types/<context>.types.ts
  application/
    view-models/use<Context>ViewModel.ts
  infrastructure/
    repositories/Api<Context>Repository.ts
  presentation/
    screens/<Context>Screen.tsx
  TEST_CASE.md
```

## Implementation Order

1. Check backend endpoint in `phtml/api/v2/endpoints/*` or `phtml/api-v2.php`.
2. Add or reuse endpoint path in `apiRoutes`.
3. Define domain types in `domain/types`.
4. Define repository interface in `domain/repositories`.
5. Implement API repository in `infrastructure/repositories`.
6. Add ViewModel state: `data`, `isLoading`, `error`.
7. Connect screen to ViewModel.
8. Add or update `TEST_CASE.md`.
9. Run verification commands.

## Repository Example

```ts
// Description: Implements the events repository using the shared backend API.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { EventsRepository } from '../../domain/repositories/EventsRepository';
import type { EventItem } from '../../domain/types/events.types';

type EventsResponse = {
  api_status: number | string;
  events?: Array<Record<string, unknown>>;
};

function mapEvent(raw: Record<string, unknown>): EventItem {
  return {
    id: String(raw.id ?? raw.event_id ?? ''),
    title: typeof raw.name === 'string' ? raw.name : '',
  };
}

export function createEventsRepository(): EventsRepository {
  return {
    async getEvents() {
      const response = await apiBridge.post<EventsResponse>(
        apiRoutes.events.list,
      );

      return (response.events ?? []).map(mapEvent);
    },
  };
}
```

## ViewModel Example

```ts
// Description: Coordinates events screen state with the events repository.
import { useCallback, useEffect, useState } from 'react';
import { createEventsRepository } from '../../infrastructure/repositories/ApiEventsRepository';
import type { EventItem } from '../../domain/types/events.types';

const repository = createEventsRepository();

export function useEventsViewModel() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setEvents(await repository.getEvents());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { events, isLoading, error, reload: load };
}
```

## Screen Rules

Screens should only:

- Render state from ViewModel.
- Trigger ViewModel actions.
- Show loading, empty, and error states.
- Navigate using route constants.

Screens should not:

- Import `apiBridge` or `apiClient`.
- Know `server_key`.
- Know `access_token`.
- Map raw backend payloads.

## Verification Commands

Run after each context:

```powershell
npx tsc --noEmit
npx jest --passWithNoTests
```

Run CSS interop check if UI/token files changed:

```powershell
node -e "const fs=require('fs'); const p=require('react-native-css-interop/dist/css-to-rn'); const css=fs.readFileSync('assets/styles/tokens.css','utf8'); const fn=p.cssToReactNativeRuntime||p.default||p; Promise.resolve(fn(css,{grouping:['^group(/.*)?'],inlineRem:14})).then(()=>console.log('css interop parse ok')).catch(e=>{console.error(e); process.exit(1);});"
```

## Android Runtime Checks

When `.env` changes:

```powershell
cd android
.\gradlew clean
cd ..
adb reverse tcp:8081 tcp:8081
pnpm android
```

When only JS/TS changes:

```powershell
pnpm start -- --reset-cache
```

Then reload app from the React Native dev menu.

## Test Case Requirement

Every context connected to API should have:

```txt
src/<context>/TEST_CASE.md
```

Include:

- route or screen smoke cases
- API success
- API error
- empty state
- loading state
- auth/session dependency if needed
- regression commands

## Test Case Workflow

Create or update the test case file in the same context folder:

```txt
src/<context>/TEST_CASE.md
```

Rules:

- Start the file with an English description line.
- Keep test cases executable by another developer without reading implementation history.
- Use stable IDs with the context prefix.
- Mark status with:
  - `[ ]` not run
  - `[x]` passed
  - `[~]` blocked or partial
- Do not mark mock behavior as production-passed.
- Mention backend requirements such as auth token, server key, or specific test account.
- Add regression commands at the bottom.

ID convention:

```txt
<CTX>-SMOKE-001
<CTX>-API-001
<CTX>-UI-001
<CTX>-UX-001
<CTX>-REG-001
```

Examples:

```txt
AUTH-LOGIN-001
FEED-API-001
PROFILE-UI-001
MESSAGES-REG-001
```

## Test Case Template

Copy this when creating a new context test file:

```md
# Description: Test cases for the <context> bounded context.

# <Context> Test Cases

## Scope

- Context: `src/<context>`
- Routes:
  - `<RouteName>`
- Main entry points:
  - `src/<context>/presentation/screens/<Screen>.tsx`
  - `src/<context>/application/view-models/use<Context>ViewModel.ts`
  - `src/<context>/infrastructure/repositories/Api<Context>Repository.ts`
- Out of scope:
  - `<explicit exclusions>`

## Environment

- React Native target: Android debug build on physical device or emulator.
- Backend API: `https://vnseea.vn/api`
- Backend session source: WoWonder `access_token` stored in MMKV.
- Auth requirement: `<guest/authenticated/optional>`

## Smoke

| ID                | Status | Case              | Entry            | Expected                                               |
| ----------------- | ------ | ----------------- | ---------------- | ------------------------------------------------------ |
| `<CTX>-SMOKE-001` | `[ ]`  | Screen renders    | `<RouteName>`    | Screen renders without runtime error or broken layout. |
| `<CTX>-SMOKE-002` | `[ ]`  | Client navigation | `<from> -> <to>` | Route changes without stale state or console error.    |

## API And Data

| ID              | Status | Case             | Entry                            | Expected                                                        |
| --------------- | ------ | ---------------- | -------------------------------- | --------------------------------------------------------------- |
| `<CTX>-API-001` | `[ ]`  | Success response | `<repository/view-model action>` | UI renders real API data, not mock data.                        |
| `<CTX>-API-002` | `[ ]`  | API error        | `<invalid payload/token>`        | User sees readable error state; no unhandled promise rejection. |
| `<CTX>-API-003` | `[ ]`  | Empty response   | `<empty API result>`             | Empty state is clear and usable.                                |

## UI And UX

| ID             | Status | Case          | Viewport      | Expected                                                 |
| -------------- | ------ | ------------- | ------------- | -------------------------------------------------------- |
| `<CTX>-UI-001` | `[ ]`  | Mobile layout | Android phone | No clipped text, overflow, or broken tap target.         |
| `<CTX>-UX-001` | `[ ]`  | Loading state | Slow API      | Loading state appears and action is not submitted twice. |
| `<CTX>-UX-002` | `[ ]`  | Retry path    | API error     | User can retry or navigate away safely.                  |

## Regression Commands

\`\`\`powershell
npx tsc --noEmit
npx jest --passWithNoTests
\`\`\`

## Notes

- `<API endpoint notes>`
- `<known blocked cases>`
```

## When To Update Test Cases

Update `TEST_CASE.md` when:

- A context switches from mock data to backend API.
- A route or screen entry point changes.
- A new backend endpoint is added.
- A loading, empty, or error state changes.
- A bug is fixed and should not regress.
- A context starts depending on auth/session behavior.
