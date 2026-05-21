# Description: Guide for wiring React Native bounded contexts to the shared WoWonder API bridge.

# API Context Guide

## Shared Flow

Use one flow for every context:

```txt
Screen -> ViewModel -> Repository interface -> API repository -> backendApi -> apiClient -> WoWonder API
```

Do not call API directly from screens.

## Shared Configuration

Runtime API config is read only from:

```txt
src/shared-kernel/infrastructure/config/env.ts
```

Local env values live in `.env`:

```env
API_BASE_URL=https://demo.vnseea.vn/api
WEB_BASE_URL=https://demo.vnseea.vn
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
src/shared-kernel/infrastructure/api/backendApi.ts
```

Helpers:

```ts
backendApi.get<TResponse>(url, params);
backendApi.post<TResponse>(url, payload);
backendApi.multipart<TResponse>(url, payload);
```

The shared client already handles:

- `API_BASE_URL`
- `server_key`
- `access_token`
- URL normalization from `/api/auth` to `/auth`
- backend error normalization
- URL-encoded POST payloads for PHP `$_POST`

Do not manually add `server_key`, `access_token`, base URL, or request headers in context repositories.

## Routes

Declare backend API paths in:

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
import { backendApi } from '../../../shared-kernel/infrastructure/api/backendApi';
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
      const response = await backendApi.post<EventsResponse>(
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

- Import `backendApi` or `apiClient`.
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
- API backend error
- empty state
- loading state
- auth/session dependency if needed
- regression commands
