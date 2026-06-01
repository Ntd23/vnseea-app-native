English description: Test cases for the settings bounded context, including PHP phtml parity and Nuxt bridge checks.

# Test Case Settings

## Pham vi

- Owner: Dev 1
- Context: `client/src/settings`
- Routes:
  - `/setting`
  - `/setting/:page`
- Nuxt API:
  - `GET /_api/settings/me`
  - `POST /_api/settings/update`
- Backend source of truth:
  - `GET /api/v2/endpoints/get-current-user.php`
  - `POST /requests.php?f=update_general_settings`
  - `POST /requests.php?f=update_profile_setting`
  - `POST /requests.php?f=update_privacy_settings`
  - `POST /requests.php?f=update_email_settings`
  - `POST /requests.php?f=update_notifications_settings`
  - `POST /requests.php?f=update_socialinks_setting`
  - `POST /requests.php?f=update_user_password`
  - `POST /requests.php?f=update_two_factor`
  - `POST /requests.php?f=update_design_setting`

## Smoke Test

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `SETTINGS-SMOKE-001` | `[x]` | Desktop `1440x900`, route `/setting` | Settings index | Login roi vao `/setting` | Page render binh thuong, khong hien email/name gia. |
| `SETTINGS-SMOKE-002` | `[x]` | Desktop `1440x900`, route `/setting/general` | Settings subpage | Vao `/setting/general` | Active page dung theo route param. |
| `SETTINGS-SMOKE-003` | `[-]` | Mobile `390x844`, route `/setting/profile` | Hard reload | Hard reload `/setting/profile` | Khong loi Nuxt, khong hien HTML tho/unstyled. |`Lỗi tab settings-sidebar không ẩn khi chuyển sang mobile` |
| `SETTINGS-SMOKE-004` | `[x]` | Desktop `1440x900`, route `/setting/general` | General fields theo phtml | Mo tab general settings | Co username, phone, gender, e-mail, birthday, country, verification, wallet, nut save. |
| `SETTINGS-SMOKE-005` | `[x]` | Desktop `1440x900`, route `/setting/profile` | Profile fields theo phtml | Mo tab profile | Co first name, last name, website, about, working, working link, address, school, relationship, school completed. |
| `SETTINGS-SMOKE-006` | `[x]` | Desktop `1440x900`, route `/setting/privacy` | Privacy fields theo phtml | Mo tab privacy | Co day du message/follow/friend/post/last seen/activity/visit/birthday/status/location/data privacy. |
| `SETTINGS-SMOKE-007` | `[x]` | Desktop `1440x900`, route `/setting/socialLinks` | Social fields theo phtml | Mo tab social links | Co facebook, twitter, linkedin, instagram, youtube, vk. |

## UI API Test

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `SETTINGS-API-001` | `[x]` | Browser Network, route `/setting` | Lay current settings | Mo `GET /_api/settings/me` khi da login | Tra field user tu PHP session hien tai, co `session_hash` o PHP payload nhung khong hien tren UI. |
| `SETTINGS-API-002` | `[x]` | Postman/API hoac browser Network | Thieu session | Xoa cookie `user_id`, goi `GET /_api/settings/me` | Tra `401`, khong tra du lieu gia. |
| `SETTINGS-API-003` | `[x]` | Browser, route `/setting` | Stale backend session | Giu cookie `user_id` cu hoac sai, hard reload `/setting` | Middleware dua ve `/welcome`, khong render error page `/_api/settings/me Not authorized`. |
| `SETTINGS-API-004` | `[x]` | Desktop `1440x900`, route `/setting/general` | Save general | Doi `gender`, `birthday`, hoac `country`, bam save, reload | Gia tri sau reload lay lai tu backend. |
| `SETTINGS-API-005` | `[x]` | Desktop `1440x900`, route `/setting/general`, account admin/moderator | Admin field theo phtml | Login admin `admin/123456`, mo general | `Verification` va `Wallet` edit duoc va submit qua `requests.php?f=update_general_settings`. |
| `SETTINGS-API-006` | `[x]` | Desktop `1440x900`, route `/setting/general`, account user thuong | User field theo phtml | Login user thuong, mo general | `Verification` va `Wallet` hien data that nhung read-only. |
| `SETTINGS-API-007` | `[x]` | Desktop `1440x900`, route `/setting/profile` | Save profile | Doi `about` hoac `working`, bam save, reload | Gia tri moi duoc load lai tu backend. |
| `SETTINGS-API-008` | `[x]` | Desktop `1440x900`, route `/setting/privacy` | Save privacy | Doi `post_privacy`, bam save, reload | Gia tri moi duoc load lai tu backend. |
| `SETTINGS-API-009` | `[-]` | Desktop `1440x900`, route `/setting/emailNotifications` | Save email notification | Toggle mot email setting, bam save, reload | Gia tri moi duoc load lai tu backend. |
| `SETTINGS-API-010` | `[x]` | Desktop `1440x900`, route `/setting/notifications` | Save in-app notification | Toggle mot notification setting, bam save, reload | Gia tri moi duoc load lai tu backend. |
| `SETTINGS-API-011` | `[x]` | Desktop `1440x900`, route `/setting/socialLinks` | Save social links | Doi `facebook` hoac `vk`, bam save, reload | Gia tri moi duoc load lai tu backend. |
| `SETTINGS-API-012` | `[x]` | Desktop `1440x900`, route `/setting/password` | Save password | Nhap current password, new password, confirm password | Backend PHP tra success hoac loi validate that. |

## Test Bang Postman: PHP API -> Nuxt Bridge

Can copy cookie `user_id` tu browser vao Postman de test settings endpoints.

Postman environment:

| Key | Value |
| --- | --- |
| `backend_url` | `https://v2.vnseea.test:8443` hoac `http://v2.vnseea.test:8080` |
| `nuxt_url` | `https://v2.vnseea.test:8443` hoac `http://v2.vnseea.test:8080` |
| `user_id` | Gia tri cookie `user_id` sau khi login. |
| `hash_id` | Lay tu response `GET {{backend_url}}/api/v2/endpoints/get-current-user.php?session_id={{user_id}}`. |

| ID | Man hinh | Layer | Method | URL | Body/Cookie | Ky vong |
| --- | --- | --- | --- | --- | --- | --- |
| `SETTINGS-PHP-001` | Postman/API, doi chieu UI `/setting` | PHP | `GET` | `{{backend_url}}/api/v2/endpoints/get-current-user.php?session_id={{user_id}}` | Cookie `user_id` | PHP tra `user_data` co `session_hash`, role `admin`, profile/privacy/notification/social fields. |
| `SETTINGS-NUXT-001` | Postman/API, doi chieu UI `/setting` | Nuxt | `GET` | `{{nuxt_url}}/_api/settings/me` | Cookie `user_id` | Nuxt map current settings user va khong dung mock. |
| `SETTINGS-PHP-002` | Postman/API, doi chieu UI `/setting/general` | PHP phtml handler | `POST` | `{{backend_url}}/requests.php?f=update_general_settings` | Form data `user_id`, `hash_id`, `username`, `email`, `phone_number`, `birthday`, `gender`, `country`, optional `verified`, `wallet` | PHP tra `status: 200` hoac `errors`. |
| `SETTINGS-NUXT-002` | Postman/API, doi chieu UI `/setting/general` | Nuxt | `POST` | `{{nuxt_url}}/_api/settings/update` | JSON `{ "section": "general", "username": "admin", "email": "admin@gmail.com", "gender": "male", "birthday": "1990-01-01", "country_id": "233" }`, cookie `user_id` | Nuxt tra `success: true`, `status`, `message` neu PHP update thanh cong. |
| `SETTINGS-NUXT-003` | Postman/API | Nuxt | `POST` | `{{nuxt_url}}/_api/settings/update` | JSON `{ "section": "general", "unsupported_key": "value" }` | Nuxt tra `422` truoc khi goi PHP vi field khong nam trong allowlist. |
| `SETTINGS-NUXT-004` | Postman/API, doi chieu UI `/setting/profile` | Nuxt | `POST` | `{{nuxt_url}}/_api/settings/update` | JSON `{ "section": "profile", "first_name": "Admin", "last_name": "User", "website": "", "about": "", "working": "", "working_link": "", "address": "", "school": "", "relationship": "0" }` | Forward sang `requests.php?f=update_profile_setting`. |
| `SETTINGS-NUXT-005` | Postman/API, doi chieu UI `/setting/privacy` | Nuxt | `POST` | `{{nuxt_url}}/_api/settings/update` | JSON `{ "section": "privacy", "post_privacy": "everyone", "message_privacy": "0", "follow_privacy": "0" }` | Forward sang `requests.php?f=update_privacy_settings`. |

## Trang thai coverage

- `[x] done` Settings bootstrap lay user/session_hash that tu PHP.
- `[x] done` General save qua phtml handler `update_general_settings`.
- `[x] done` Profile save qua phtml handler `update_profile_setting`.
- `[x] done` Privacy save qua phtml handler `update_privacy_settings`.
- `[x] done` Email notifications save qua phtml handler `update_email_settings`.
- `[x] done` In-app notifications save qua phtml handler `update_notifications_settings`.
- `[x] done` Social links save qua phtml handler `update_socialinks_setting`.
- `[x] done` Password save qua phtml handler `update_user_password`.
- `[x] done` Basic 2FA bridge qua phtml handler `update_two_factor`.
- `[x] done` Design status bridge qua phtml handler `update_design_setting`.
- `[x] done` Multipart avatar/cover upload bridge qua phtml handler `update_images_setting`.
- `[x] done` Multipart background/CSS upload bridge qua phtml handler `update_design_setting`.

## Lenh kiem tra

```powershell
cd client
cmd /c npx nuxi prepare
cmd /c npm run build
```
