English description: Test cases for foundation UI primitives used by API-connected pages.

# Test Case Foundation

## Pham vi

- Owner: Dev 1
- Context: `client/src/foundation`
- Day la context shared UI primitive, khong goi backend truc tiep.
- Kiem tra runtime bang browser that; neu component chua co consumer route thi ghi `n/a`, khong danh pass bang suy doan.

## Cases

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `FOUNDATION-001` | `[x]` | Desktop `1440x900`, Mobile `390x844`, route `/search` | Empty state | Tim keyword `foundation_empty_state_manual_check_999999` | Desktop pass; mobile pass, khong overflow ngang (`scrollWidth=390`, `clientWidth=390`). |
| `FOUNDATION-002` | `[x]` | Desktop `1440x900`, page co API | Loading skeleton | Pause request `/_api/search` bang Chrome DevTools Protocol | Pass: khi API pending, UI hien loading skeleton, khong hien no-results som. |
| `FOUNDATION-003` | `[x]` | Mobile `390x844`, routes `/jobs`, `/games` | Modal shell | Click nut mo modal, test `Esc` close va overflow | `/games` pass; `/jobs` mo `JobPostModal`, `Esc` dong modal job, khong overflow. |
| `FOUNDATION-004` | `[x]` | Desktop `1440x900`, Tablet `768x1024`, Mobile `390x844` | Responsive container | Test `/home`, `/search`, `/setting` | `/home`, `/setting`, `/search` pass; `/search` mobile khong overflow ngang. |
| `FOUNDATION-005` | `[~]` | Desktop `1440x900`, routes `/popular`, `/photos`, `/explore`, `/orders` | Empty state consumer khac | Mo cac page dang import `EmptyState.vue` | `/orders` empty state pass; `/popular`, `/photos`, `/explore` dang co data nen chua tao duoc empty state that. |
| `FOUNDATION-006` | `[n/a]` | Source/runtime audit | Component chua co consumer | Kiem tra consumer cua `DrawerShell`, `DropdownShell`, `LoadingSkeleton`, `PageHeader`, `PageSection`, `ResponsiveContainer` | Chua co route consumer ro rang de test runtime. |

## Ket Qua Test Tu Dong 2026-05-04

Moi truong:

- Frontend: `http://127.0.0.1:3000`.
- Browser: Google Chrome headless qua Chrome DevTools Protocol.
- Session: login backend bang account `admin`, set cookie `user_id` qua `set-browser-cookie.php`.
- Viewports: desktop `1440x900`, tablet `768x1024`, mobile `390x844`.

Ket qua:

| ID | Ket qua | Ghi chu |
| --- | --- | --- |
| `FOUNDATION-001` | Fail mot phan | `/search` desktop pass; `/search` mobile render empty state nhung co overflow ngang `445 > 390`. |
| `FOUNDATION-002` | Fail | Khi pause request `/_api/search`, page khong hien loading/skeleton; no-results empty state xuat hien ngay trong luc API pending. |
| `FOUNDATION-003` | Fail mot phan | `/games` modal mo/dong bang `Esc` duoc va khong overflow; `/jobs` click `Dang viec lam` khong mo modal. |
| `FOUNDATION-004` | Fail mot phan | `/home` pass 3 viewport; `/setting` pass 3 viewport; `/search` fail mobile overflow ngang `445 > 390`. |
| `FOUNDATION-005` | Partial | `/orders` empty state pass; `/popular`, `/photos`, `/explore` dang co data nen bi block. |
| `FOUNDATION-006` | N/A | `DrawerShell`, `DropdownShell`, `LoadingSkeleton`, `PageHeader`, `PageSection`, `ResponsiveContainer` chua co route consumer ro rang. |

## Ket Qua Retest Sau Fix 2026-05-04

Moi truong:

- Frontend: `http://127.0.0.1:3000`.
- Browser: Google Chrome headless qua Chrome DevTools Protocol.
- Session: login backend bang account `admin`, set cookie `user_id` bang access token dang nhap.
- Viewport chinh: mobile `390x844`.

Ket qua:

| ID | Ket qua | Ghi chu |
| --- | --- | --- |
| `FOUNDATION-001` | Pass | `/search?q=foundation_empty_state_manual_check_999999` hien no-results; `scrollWidth=390`, `clientWidth=390`; khong con key i18n `community.search.filters.*` render ra UI. |
| `FOUNDATION-002` | Pass | Khi pause `/_api/search`, DOM co `aria-busy="true"` va text `Dang tai ket qua tim kiem`; no-results khong xuat hien trong luc pending. |
| `FOUNDATION-003` | Pass | `/jobs` click `Dang viec lam` mo `JobPostModal`; `Esc` dong job modal; mobile khong overflow. |
| `FOUNDATION-004` | Pass | `/search` mobile retest khong overflow; cac route `/home` va `/setting` da pass tu vong test truoc. |

## Test Bang Postman: PHP API -> Nuxt Bridge

Context `foundation` khong co API rieng nen khong test Postman truc tiep. Dung Postman de tao/doi chieu cac trang thai data tu PHP API goc va Nuxt bridge, sau do kiem tra UI state.

| Trang thai can test | PHP raw endpoint | Nuxt bridge endpoint | Ky vong tren UI |
| --- | --- | --- | --- |
| Empty state | `POST {{backend_url}}/api/search` voi keyword khong ton tai | `GET {{nuxt_url}}/_api/search?q=keyword_khong_ton_tai` | UI hien empty state dung style. |
| Backend error | Goi PHP endpoint voi thieu/sai `server_key` de xem error shape | Goi Nuxt endpoint tuong ung | UI hien error state an toan, khong Nuxt error raw. |
| Loading state | Postman chi dung de doi chieu response | Dung Network throttling trong browser | Skeleton khong hien fake data. |

## Lenh kiem tra

```powershell
cd client
npm run build
```
