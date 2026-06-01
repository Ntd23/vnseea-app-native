English description: Test cases for the search bounded context, including Nuxt search bridge behavior and user/page/group result rendering.

# Test Case Search

## Pham vi

- Owner: Dev 1
- Context: `client/src/search`
- Route: `/search`
- Nuxt API: `GET /_api/search?q=<keyword>`
- Backend bridge: backend search endpoint qua `server/api/search/index.get.ts`

## Smoke Test

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `SEARCH-SMOKE-001` | `[ ]` | Desktop `1440x900`, route `/search` | Search rong | Vao `/search` khong query | Hien empty state, khong can goi backend. |
| `SEARCH-SMOKE-002` | `[ ]` | Desktop `1440x900`, route `/search?q=admin` | Search keyword | Vao `/search?q=admin` | Goi `GET /_api/search?q=admin`, render users/pages/groups tu backend. |
| `SEARCH-SMOKE-003` | `[ ]` | Mobile `390x844`, route `/search?q=admin&type=users` | Reload URL co filter | Hard reload `/search?q=admin&type=users` | Query va tab/filter giu dung sau reload. |

## API

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `SEARCH-API-001` | `[ ]` | Postman/API, doi chieu UI `/search?q=admin` | Backend success | Mo truc tiep `/_api/search?q=admin` | JSON co `users`, `pages`, `groups`, `posts`. |
| `SEARCH-API-002` | `[ ]` | Postman/API | Thieu keyword | Mo `/_api/search` | Tra mang rong, khong loi 500. |
| `SEARCH-API-003` | `[ ]` | Desktop `1440x900`, route `/search?q=admin` | Backend loi | Lam backend config sai hoac tat backend | UI khong vang Nuxt error, hien thi trang thai loi/rong an toan. |

## Test Bang Postman: PHP API -> Nuxt Bridge

Postman environment:

| Key | Value |
| --- | --- |
| `backend_url` | `https://demo.vnseea.test:8443` |
| `nuxt_url` | `https://demo.vnseea.test:8443` |
| `backend_server_key` | Lay tu `NUXT_BACKEND_SERVER_KEY`. |

| ID | Man hinh | Layer | Method | URL | Body/Params | Ky vong |
| --- | --- | --- | --- | --- | --- | --- |
| `SEARCH-PHP-001` | Postman/API, doi chieu UI `/search?q=admin` | PHP | `POST` | `{{backend_url}}/api/search` | `server_key={{backend_server_key}}`, `search_key=admin`, `limit=35` | PHP tra `users`, `pages`, `groups` theo payload goc. |
| `SEARCH-NUXT-001` | Postman/API, doi chieu UI `/search?q=admin` | Nuxt | `GET` | `{{nuxt_url}}/_api/search?q=admin` | query `q=admin` | Nuxt map PHP users/pages/groups thanh objects co `id`, `kind`, `title`, `href`, `searchableText`. |
| `SEARCH-PHP-002` | Postman/API, doi chieu UI `/search?q=keyword_khong_ton_tai` | PHP | `POST` | `{{backend_url}}/api/search` | `server_key`, `search_key=keyword_khong_ton_tai`, `limit=35` | PHP tra mang rong hoac response success khong result. |
| `SEARCH-NUXT-002` | Postman/API, doi chieu UI `/search?q=keyword_khong_ton_tai` | Nuxt | `GET` | `{{nuxt_url}}/_api/search?q=keyword_khong_ton_tai` | query | Nuxt tra `{ users: [], pages: [], groups: [], posts: [] }` hoac mang rong an toan. |
| `SEARCH-NUXT-003` | Postman/API | Nuxt | `GET` | `{{nuxt_url}}/_api/search` | khong co `q` | Nuxt tra empty arrays va khong goi backend. |

## Trang thai coverage

- `[x] done` Users/pages/groups da map qua backend search API.
- `[~] partial` Posts dang de rong cho toi khi Dev 2 noi feed/post search endpoint.

## Lenh kiem tra

```powershell
cd client
npm run build
```
