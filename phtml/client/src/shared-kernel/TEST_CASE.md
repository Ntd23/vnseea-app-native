English description: Test cases for shared-kernel routing, HTTP helpers, backend URL utilities, and cross-context constants.

# Test Case Shared Kernel

## Pham vi

- Owner: Dev 1
- Context: `client/src/shared-kernel`
- File chinh:
  - `application/constants/route-registry.ts`
  - `infrastructure/http/nuxt-api-client.ts`
  - `application/utils/backend-web-url.ts`

## Route Registry

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `SK-ROUTE-001` | `[ ]` | Code review, menus tren `/home` desktop/mobile | App route constants | Search code khi them menu/link moi | Route dung `appRoutes` neu route da co trong registry. |
| `SK-ROUTE-002` | `[ ]` | Code review, Postman/API | Nuxt API route constants | Kiem tra repositories moi | Repository goi `apiRoutes`, khong hardcode rai rac. |
| `SK-ROUTE-003` | `[ ]` | Code review, `server/api/*` | Backend endpoint constants | Kiem tra `server/api/*` | Server API dung `backendRoutes.api.*` thay vi string endpoint lap lai. |

## HTTP Client

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `SK-HTTP-001` | `[ ]` | Desktop `1440x900`, SSR route `/home` | SSR forwarding | Goi API tu SSR page da login | Cookie browser duoc forward bang `useRequestFetch()`. |
| `SK-HTTP-002` | `[ ]` | Browser Network, client navigation `/home -> /search` | Client request | Goi API tu client navigation | Request dung `credentials: include`. |
| `SK-HTTP-003` | `[ ]` | Desktop user menu va Mobile drawer | Backend web URL | Click link backend nhu `/admin-cp` | Link di dung backend web base, khong bi hieu nham la Nuxt route noi bo. |

## Test Bang Postman: PHP API -> Nuxt Bridge

Shared-kernel khong co endpoint rieng. Test gian tiep bang cach so sanh PHP raw API voi Nuxt endpoints dang dung shared helpers.

| ID | Man hinh | Layer | Method | URL | Muc dich | Ky vong |
| --- | --- | --- | --- | --- | --- | --- |
| `SK-PM-001` | Postman/API | PHP | `POST` | `{{backend_url}}/api/search` | Kiem tra backend endpoint goc | Co `server_key`, tra raw search payload. |
| `SK-PM-002` | Postman/API | Nuxt | `GET` | `{{nuxt_url}}/_api/search?q=admin` | Kiem tra `apiRoutes` va `useNuxtApiClient` path hoat dong | Tra JSON search normalized, khong 404 route. |
| `SK-PM-003` | Postman/API | PHP | `POST` | `{{backend_url}}/api/get-user-data` | Kiem tra backend session/user payload | Tra raw `user_data`. |
| `SK-PM-004` | Postman/API | Nuxt | `GET` | `{{nuxt_url}}/_api/settings/me` | Kiem tra cookie forwarding/session API | Co cookie thi tra normalized user, khong cookie thi `401`. |

## Lenh kiem tra

```powershell
cd client
npm run build
```
