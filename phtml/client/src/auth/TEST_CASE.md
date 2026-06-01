English description: Test cases for the auth bounded context, including backend PHP session ownership, Nuxt auth bridges, guest/protected route access, and current-user bootstrap.

# Test Case Auth

## Pham vi

- Owner: Dev 1
- Context: `client/src/auth`
- Nuxt server API: `client/server/api/auth/*`
- Route policy: `client/src/auth/application/constants/route-policy.ts`
- Nguyen tac: backend PHP la nguon xac thuc session/cookie, frontend chi goi `/_api/*`.

## Chuan bi

- Chay frontend: `cd client && npm run dev`.
- Test uu tien tren domain Laragon: `https://demo.vnseea.test:8443`.
- Mo DevTools:
  - tab `Network` de xem request `/_api/auth/*`
  - tab `Application > Cookies` de xem cookie `user_id`
- Truoc moi vong test doc lap, xoa cookie `user_id`.
- Can co it nhat:
  - 1 tai khoan active de test login
  - 1 tai khoan admin de test menu/admin gate
  - 1 tai khoan moderator de test role `admin = 2`
  - tai khoan 2FA/chua active neu muon test confirm flow day du

## Login

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `AUTH-LOGIN-001` | `[x]` | Desktop `1440x900` va Mobile `390x844`, route `/welcome` | Login dung | Vao `/welcome`, nhap tai khoan dung, bam login | Goi `POST /_api/auth/login`, backend tra `access_token`, trinh duyet submit `POST set-browser-cookie.php`, cuoi cung ve `/home`, co cookie `user_id`, token khong nam tren URL. |
| `AUTH-LOGIN-002` | `[x]` | Desktop `1440x900`, route `/welcome` | Login sai password | Vao `/welcome`, nhap password sai | UI hien loi backend, khong tao cookie `user_id`, khong redirect. |
| `AUTH-LOGIN-003` | `[x]` | Desktop `1440x900`, route `/welcome -> /confirm-login` | Login tai khoan 2FA | Dung account bat 2FA | Chuyen sang `/confirm-login?userId=...`, chua tao cookie `user_id`. |

## Test Bang Postman: PHP API -> Nuxt Bridge

Muc tieu cua Postman la test theo cap:

1. Goi PHP API goc de xem backend tra data gi.
2. Goi Nuxt `/_api/*` de xem bridge co nhan va map dung data khong.
3. So sanh raw field cua PHP voi normalized field cua Nuxt.

### Postman environment

| Key | Value |
| --- | --- |
| `backend_url` | `https://demo.vnseea.test:8443` |
| `nuxt_url` | `https://demo.vnseea.test:8443` |
| `backend_server_key` | Lay tu `NUXT_BACKEND_SERVER_KEY` trong `.env`, khong commit vao doc. |
| `access_token` | Token tra ve tu PHP `/api/auth` neu login thanh cong. |
| `content_type` | `application/json` |

Neu endpoint can session, copy cookie `user_id` tu browser sang Postman:

1. Login tren browser.
2. Mo DevTools `Application > Cookies`.
3. Copy cookie `user_id`.
4. Trong Postman tab `Cookies`, them cookie cho domain `demo.vnseea.test`.

### PHP Raw Requests

Dung `x-www-form-urlencoded` cho PHP API.

| ID | Man hinh | Method | URL | Body | Can so sanh |
| --- | --- | --- | --- | --- | --- |
| `AUTH-PHP-001` | Postman/API | `POST` | `{{backend_url}}/api/auth` | `server_key={{backend_server_key}}`, `username=admin`, `password=123456`, `timezone=Asia/Bangkok`, `device_type=windows` | `api_status`, `access_token`, `user_id`, `membership`, `errors.error_text`. |
| `AUTH-PHP-002` | Postman/API | `POST` | `{{backend_url}}/api/create-account` | `server_key`, `username`, `first_name`, `last_name`, `email`, `password`, `confirm_password`, `gender` | `api_status`, `access_token`, `user_id`, verify status hoac `errors.error_text`. |
| `AUTH-PHP-003` | Postman/API | `POST` | `{{backend_url}}/api/send-reset-password-email` | `server_key`, `email=<email>` | `api_status`, `message`, `errors.error_text`. |
| `AUTH-PHP-004` | Postman/API | `POST` | `{{backend_url}}/api/send-reset-password-sms` | `server_key`, `phone_num=<phone>` | `api_status`, `user_id`, `message`, `errors.error_text`. |
| `AUTH-PHP-005` | Postman/API | `GET` | `{{backend_url}}/api/v2/endpoints/get-current-user.php?session_id={{user_id}}` | Cookie `user_id` neu can | `api_status`, `user_data.user_id`, `user_data.name`, `user_data.admin`; `admin=0` user, `admin=1` admin, `admin=2` moderator. |

### Nuxt Bridge Requests

| ID | Man hinh | Method | URL | Body JSON | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `AUTH-NUXT-001` | Postman/API, doi chieu voi UI `/welcome` | `POST` | `{{nuxt_url}}/_api/auth/login` | `{ "identity": "admin", "password": "123456", "timezone": "Asia/Bangkok" }` | PHP `access_token` map thanh Nuxt `accessToken`; PHP `user_id` map thanh `userId`; loi PHP map thanh JSON error, khong HTML. |
| `AUTH-NUXT-002` | Postman/API, doi chieu voi UI `/register` | `POST` | `{{nuxt_url}}/_api/auth/register` | `{ "username": "test_user_001", "firstName": "Test", "lastName": "User", "email": "test_user_001@example.com", "password": "123456", "confirmPassword": "123456", "gender": "male" }` | PHP register response map thanh `status`, `message`, `accessToken`, `userId`. |
| `AUTH-NUXT-003` | Postman/API, doi chieu voi UI `/forgot-password` | `POST` | `{{nuxt_url}}/_api/auth/forgot-password` | `{ "identity": "admin@example.com" }` | PHP email/SMS response map thanh `channel`, `message`, `userId` neu SMS. |
| `AUTH-NUXT-004` | Postman/API, doi chieu voi UI `/confirm-login` | `POST` | `{{nuxt_url}}/_api/auth/confirm-login` | `{ "userId": 1, "code": "123456", "timezone": "Asia/Bangkok" }` | PHP token response map thanh `accessToken`; code sai map thanh JSON error. |
| `AUTH-NUXT-005` | Postman/API, doi chieu voi UI `/confirm-account` | `POST` | `{{nuxt_url}}/_api/auth/confirm-account` | `{ "userId": 1, "code": "123456", "timezone": "Asia/Bangkok" }` | PHP active account response map thanh `accessToken`, `userId`. |
| `AUTH-NUXT-006` | Postman/API, doi chieu voi UI `/confirm-reset-sms` | `POST` | `{{nuxt_url}}/_api/auth/confirm-reset-sms` | `{ "userId": 1, "code": "123456" }` | PHP `reset_code` va `email` map thanh Nuxt `resetCode`, `email`. |
| `AUTH-NUXT-007` | Postman/API, doi chieu voi UI `/reset-password` | `POST` | `{{nuxt_url}}/_api/auth/reset-password` | `{ "email": "admin@example.com", "code": "RESET_CODE", "newPassword": "123456" }` | PHP success message map thanh Nuxt `message`. |

### Mapping Can Check

| PHP field | Nuxt field |
| --- | --- |
| `access_token` | `accessToken` |
| `user_id` | `userId` |
| `user_platform` | `userPlatform` |
| `membership` | `membershipRequired` |
| `errors.error_text` | `message` / `statusMessage` |
| `admin = 0` | `role = "user"`, `isAdmin = false`, `isModerator = false` |
| `admin = 1` | `role = "admin"`, `isAdmin = true`, `isModerator = false` |
| `admin = 2` | `role = "moderator"`, `isAdmin = false`, `isModerator = true` |

Luu y: Postman login chi test API bridge. Viec set browser cookie van phai test tren browser vi `set-browser-cookie.php` la browser session flow.

### Register backend email error

Neu PHP `/api/create-account` tra:

```json
{
  "api_status": "400",
  "errors": {
    "error_id": 11,
    "error_text": "Error found while sending the verification email, please try again later."
  }
}
```

Ket luan:

- Day la loi backend SMTP/email verification, khong phai loi Nuxt bridge.
- Nuxt `POST /_api/auth/register` phai map loi nay thanh JSON error co message dung `Error found while sending the verification email, please try again later.`
- Khong danh dau register success cho toi khi backend SMTP hoat dong hoac backend config khong yeu cau verify email.
- Neu can test mapping loi ngay, goi lai `POST {{nuxt_url}}/_api/auth/register` voi cung payload va kiem tra response Nuxt co status `400`, khong tra HTML, khong bi 500.

## Register

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `AUTH-REGISTER-001` | `[x]` | Desktop `1440x900` va Mobile `390x844`, route `/register` | Register du lieu hop le | Vao `/register`, nhap du field hop le | Goi `POST /_api/auth/register`, khong loi 404, khong goi raw PHP truc tiep tu browser. |
| `AUTH-REGISTER-002` | `[x]` | Desktop `1440x900`, route `/register` | Register trung username/email/phone | Nhap thong tin da ton tai | UI hien loi backend that, khong redirect sai. | `Checked :backend tra username dang day so nen k check duoc trung lap` |
| `AUTH-REGISTER-003` | `[x]` | Desktop `1440x900`, route `/register -> confirm` | Backend yeu cau verify | Dang ky account can verify email/SMS | Chuyen sang confirm route tuong ung, khong tu login truoc khi verify. | 

## Confirm Va Reset

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `AUTH-CONFIRM-LOGIN-001` | `[x]` | Desktop `1440x900`, | Confirm login qua link | Vao `/index.php?link1=activate&email=...&code=...`, chuyen qua route `/start-up` |
| `AUTH-CONFIRM-LOGIN-002` | `[ ]` | Desktop `1440x900`, route `/confirm-login` | Confirm login sai ma | Nhap ma sai | UI hien loi backend, khong redirect. |
| `AUTH-FORGOT-001` | `[x]` | Desktop `1440x900` va Mobile `390x844`, route `/forgot-password` | Forgot password bang email | Vao `/forgot-password`, nhap email ton tai | Goi `POST /_api/auth/forgot-password`, UI bao gui thanh cong hoac loi SMTP backend ro rang. |
| `AUTH-FORGOT-002` | `[ ]` | Desktop `1440x900`, route `/forgot-password -> /confirm-reset-sms` | Forgot password bang phone | Nhap so dien thoai ton tai | Chuyen sang `/confirm-reset-sms?userId=...` neu backend tra SMS flow. |
| `AUTH-RESET-001` | `[x]` | Desktop `1440x900`, route `/reset-password` | Reset password dung token | Vao `/reset-password?code=...&email=...`, nhap password moi | Goi `POST /_api/auth/reset-password`, backend doi password, ve `/welcome`. |

## Logout

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `AUTH-LOGOUT-001` | `[x]` | Desktop `1440x900` va Mobile `390x844`, user menu | Logout tu menu | Login xong, bam logout | Browser di qua endpoint logout backend, cookie `user_id` bi xoa, cuoi cung ve `/welcome`. |
| `AUTH-LOGOUT-002` | `[x]` | Browser URL bar, route `/home` va `/messages` | Khong vao duoc private sau logout | Sau logout nhap truc tiep `/home`, `/messages` | Bi dua ve `/welcome`, khong render private UI. |

## Route Guard

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `AUTH-GUARD-001` | `[ ]` | Browser URL bar, guest routes | Da login vao guest routes | Khi co cookie `user_id`, vao `/welcome`, `/register`, `/forgot-password`, `/confirm-login`, `/confirm-account`, `/confirm-reset-sms`, `/reset-password` | SSR/client deu dua ve `/home`, khong loe guest page. |
| `AUTH-GUARD-002` | `[ ]` | Browser URL bar, protected routes | Chua login vao protected routes | Xoa cookie `user_id`, vao `/`, `/home`, `/messages` | Bi dua ve `/welcome`. |

## Lenh kiem tra

```powershell
cd client
npm run build
```

## Ghi chu

- Neu `register` hoac `forgot-password` loi gui mail, kiem tra SMTP/backend PHP truoc khi ket luan loi frontend.
- Neu chi loi tren `127.0.0.1:3000` nhung dung tren custom domain, nghi ngo cookie/domain truoc.
- Khong duoc tao session auth rieng o frontend.
