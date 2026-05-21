# Description: Test cases for the shared-kernel API foundation and cross-context utilities.

# Shared Kernel Test Cases

## Scope

- Context: `src/shared-kernel`
- Main entry points:
  - `src/shared-kernel/infrastructure/config/env.ts`
  - `src/shared-kernel/infrastructure/api/client.ts`
  - `src/shared-kernel/infrastructure/api/backendApi.ts`
  - `src/shared-kernel/infrastructure/storage/sessionStorage.ts`
- Out of scope:
  - Feature-specific response mapping inside bounded contexts.
  - Native release signing and store distribution.

## Environment

- React Native target: Android debug build on physical device or emulator.
- Metro: `pnpm start -- --reset-cache`.
- Backend API: `API_BASE_URL=https://demo.vnseea.vn/api`.
- Backend web root: `WEB_BASE_URL=https://demo.vnseea.vn`.
- Backend session source: WoWonder `access_token` stored in MMKV.
- Required env keys: `API_BASE_URL`, `WEB_BASE_URL`, `SERVER_KEY`, `REQUEST_TIMEOUT_MS`.

## Smoke

| ID             | Status | Case                                    | Entry                         | Expected                                                               |
| -------------- | ------ | --------------------------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `SK-SMOKE-001` | `[ ]`  | App starts with required env            | `env.ts` during app bootstrap | App starts without missing environment variable error.                 |
| `SK-SMOKE-002` | `[ ]`  | Metro ignores native build scratch dirs | `metro.config.js`             | Gradle can build while Metro is running without `.cxx` watch `ENOENT`. |
| `SK-SMOKE-003` | `[ ]`  | CSS token parse remains valid           | `assets/styles/tokens.css`    | CSS interop parser finishes without crash.                             |

## API And Data

| ID           | Status | Case                        | Entry                                                  | Expected                                                                                      |
| ------------ | ------ | --------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `SK-API-001` | `[ ]`  | POST URL normalization      | `backendApi.post('/api/auth')`                         | Final request targets `https://demo.vnseea.vn/api/auth`, not `/api/api/auth`.                 |
| `SK-API-002` | `[ ]`  | Server key injection        | `apiClient` request interceptor                        | Non-GET requests include `server_key` from `.env`; no hardcoded key in tracked files.         |
| `SK-API-003` | `[ ]`  | Access token injection      | `sessionStorage.setSession` then authenticated request | Request query includes `access_token=<stored token>`.                                         |
| `SK-API-004` | `[ ]`  | URL-encoded POST payload    | Login request                                          | Backend receives fields through PHP `$_POST` and returns JSON, not generic transport failure. |
| `SK-API-005` | `[ ]`  | Multipart payload           | `backendApi.multipart`                                 | Upload requests keep `FormData` and append `server_key`.                                      |
| `SK-API-006` | `[ ]`  | Backend error normalization | Backend returns `api_status` outside `200`/`220`       | Throws `BackendApiError` with backend message, status, and error id when present.             |

## Storage

| ID             | Status | Case                                | Entry                         | Expected                                                         |
| -------------- | ------ | ----------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `SK-STORE-001` | `[ ]`  | Save auth session                   | `sessionStorage.setSession`   | Access token, user id, and platform persist in MMKV.             |
| `SK-STORE-002` | `[ ]`  | Read auth session after app restart | `sessionStorage.getSession`   | Same token data is available after JS reload/native app restart. |
| `SK-STORE-003` | `[ ]`  | Clear auth session                  | `sessionStorage.clearSession` | Stored access token and related keys are removed.                |

## Regression Commands

```powershell
npx tsc --noEmit
npx jest --passWithNoTests
node -e "const fs=require('fs'); const p=require('react-native-css-interop/dist/css-to-rn'); const css=fs.readFileSync('assets/styles/tokens.css','utf8'); const fn=p.cssToReactNativeRuntime||p.default||p; Promise.resolve(fn(css,{grouping:['^group(/.*)?'],inlineRem:14})).then(()=>console.log('css interop parse ok')).catch(e=>{console.error(e); process.exit(1);});"
```

## Notes

- `react-native-config` env changes require Android rebuild, not only Metro reload.
- `SERVER_KEY` must stay only in local `.env`; `.env.example` must keep a placeholder.
