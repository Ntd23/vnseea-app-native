English description: Test cases for the navigation bounded context, including current-user rendering, header counts, mobile menu, and the real chat widget behavior.

# Test Case Navigation

## Pham vi

- Owner: Dev 1
- Context: `client/src/navigation`
- Ap dung cho header, user menu, mobile menu, badge count, va chat widget dung data that.
- Nuxt API lien quan:
  - `GET /_api/auth/me`
  - `GET /_api/navigation/general`

## Smoke Test

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `NAV-SMOKE-001` | `[x]` | Desktop `1440x900`, route `/home` | Reload route da login | Login roi hard reload `/home` | Header render binh thuong, khong loi Nuxt, khong hien user mock. |
| `NAV-SMOKE-002` | `[x]` | Mobile `390x844`, route `/home` va `/messages` | Mobile menu | Bam avatar menu, mo/dong drawer | Drawer chi render 1 lan, label khong duplicate, khong loi hydration. |
| `NAV-SMOKE-003` | `[x]` | Desktop `1440x900`, route `/home` | Chat widget reload | Mo `/home` khi da login | Widget tai danh sach chat that, khong con contact/group local fake. |

## Current User Va Role Gate

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `NAV-USER-001` | `[x]` | Desktop `1440x900`, menu user tren header | User menu dung user that | Login tai khoan thuong, mo user menu | Ten/avatar lay tu `/_api/auth/me`, khong con `User`, `Mock User`, hoac so vi fake. |
| `NAV-USER-002` | `[x]` | Desktop `1440x900` va Mobile `390x844` | Admin thay Admin area | Login tai khoan admin, mo desktop/mobile menu | Co muc `Admin area`/`Khu vuc quan tri`, link di `/admin-cp`. |
| `NAV-USER-003` | `[x]` | Desktop `1440x900` va Mobile `390x844` | Moderator khong thay Admin area | Login tai khoan moderator (`admin = 2`), mo desktop/mobile menu | Hien role moderator neu backend tra, nhung khong render muc admin. |
| `NAV-USER-004` | `[x]` | Desktop `1440x900` va Mobile `390x844` | User thuong khong thay Admin area | Login tai khoan user (`admin = 0`) | Khong render muc admin. |
| `NAV-USER-005` | `[]` | Desktop `1440x900` va Mobile `390x844` | Bootstrap user loi | Tat backend hoac lam `/_api/auth/me` fail | Menu khong hien thi du lieu gia, khong hien admin/moderator sai quyen. |

## Header Counts

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `NAV-COUNT-001` | `[x]` | Desktop `1440x900`, route `/home` | Count tu backend | Mo Network khi reload `/home` | Co request `GET /_api/navigation/general`, response co message/notification/friend/group counts. |
| `NAV-COUNT-002` | `[x]` | Desktop `1440x900`, header right actions | Count bang 0 | Dung account khong co thong bao moi | Badge an, khong hien so hardcode nhu `1` hoac `3`. |
| `NAV-COUNT-003` | `[]` | Desktop `1440x900` va Mobile `390x844` | Backend count loi | Lam backend/proxy loi tam thoi | Header van dung duoc, count fallback ve 0. |

## Chat Widget

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `NAV-CHAT-001` | `[x]` | Desktop `1440x900`, route `/home` | Danh sach user/group that | Reload trang khi da login | Tab `Danh ba` va `Nhom` hien hoi thoai that tu `GET /_api/messages/conversations`, co preview/time/unread. |
| `NAV-CHAT-002` | `[x]` | Desktop `1440x900`, route `/home` | User online/offline | Dung account co mot vai user dang online va offline | Avatar user co dot trang thai, dong `Dang online`/lastseen thay doi theo payload backend. |
| `NAV-CHAT-003` | `[x]` | Desktop `1440x900`, route `/home` | Mini thread that | Click mot user hoac group trong widget | Mini overlay mo ra, tai thread that, gui text nhanh duoc, khong con sample messages. |
| `NAV-CHAT-004` | `[x]` | Desktop `1440x900`, route `/home` | Quick send | Mo tab `Gui tin`, chon nguoi nhan, nhap text hoac attach file roi gui | Tin nhan gui thanh cong qua bridge messages that, widget refresh inbox/thread. |
| `NAV-CHAT-005` | `[]` | Desktop `1440x900`, route `/home` | Search trong widget | Tim trong tab `Danh ba` va `Nhom` | Danh sach duoc loc theo ten, preview, status hoac thanh vien; khong lam vo widget. |
| `NAV-CHAT-006` | `[]` | Desktop `1440x900`, route `/home` | Mo group tu widget vao messages | Click mot group trong widget, bam mo full messages | Route di `/messages?tab=group&groupId=...`, thread group dung duoc chon ngay, khong roi ve user tab dau tien. |

## Test Bang Postman: PHP API -> Nuxt Bridge

Dung Postman de so sanh PHP payload voi Nuxt normalized payload. Can copy cookie `user_id` tu browser vao Postman.

Postman environment:

| Key | Value |
| --- | --- |
| `backend_url` | `https://demo.vnseea.test:8443` |
| `nuxt_url` | `https://demo.vnseea.test:8443` |
| `backend_server_key` | Lay tu `NUXT_BACKEND_SERVER_KEY`. |
| `user_id` | Gia tri cookie `user_id` sau khi login. |

| ID | Man hinh | Layer | Method | URL | Body/Cookie | Ky vong |
| --- | --- | --- | --- | --- | --- | --- |
| `NAV-PHP-001` | Postman/API, doi chieu user menu desktop/mobile | PHP | `GET` | `{{backend_url}}/api/v2/endpoints/get-current-user.php?session_id={{user_id}}` | Cookie `user_id` | PHP tra `user_data.name`, `user_data.avatar`, `user_data.admin`, `wallet`, `points`; `admin=0` user, `admin=1` admin, `admin=2` moderator. |
| `NAV-NUXT-001` | Postman/API, doi chieu user menu desktop/mobile | Nuxt | `GET` | `{{nuxt_url}}/_api/auth/me` | Cookie `user_id` | Nuxt map thanh `name`, `avatarUrl`, `role`, `isAdmin`, `isModerator`, `wallet`, `points`; khong con mock user. |
| `NAV-PHP-002` | Postman/API, doi chieu header desktop | PHP | `POST` | `  ` | `server_key`, `fetch=notifications,friend_requests,group_chat_requests,count_new_messages` | PHP tra `new_notifications_count`, `new_friend_requests_count`, `new_group_chat_requests_count`, `count_new_messages`. |
| `NAV-NUXT-002` | Postman/API, doi chieu header desktop | Nuxt | `GET` | `{{nuxt_url}}/_api/navigation/general` | Cookie `user_id` | Nuxt map thanh `notificationCount`, `friendRequestCount`, `groupChatRequestCount`, `messageCount`. |

## Lenh kiem tra

```powershell
cd client
npm run build
```
