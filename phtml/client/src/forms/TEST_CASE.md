English description: Test cases for shared form primitives and submit-state behavior.

# Test Case Forms

## Pham vi

- Owner: Dev 1
- Context: `client/src/forms`
- Day la context shared UI/form, khong goi backend truc tiep.

## Cases

| ID | Status | Man hinh | Case | Cach test | Ky vong |
| --- | --- | --- | --- | --- | --- |
| `FORMS-001` | `[ ]` | Desktop `1440x900` va Mobile `390x844`, routes `/welcome`, `/register`, `/setting` | Text input | Mo cac form auth/settings | Label, placeholder, disabled, error state render nhat quan. |
| `FORMS-002` | `[ ]` | Desktop `1440x900`, routes `/welcome`, `/register`, `/reset-password` | Password input | Test login/register/reset/settings password | Toggle mat hoat dong, khong log password ra console/network ngoai payload dung. |
| `FORMS-003` | `[ ]` | Desktop `1440x900`, routes `/register`, `/setting` | Select/radio/checkbox | Test register/settings | Value bind qua parent view-model, form component khong tu giu business state. |
| `FORMS-004` | `[ ]` | Desktop `1440x900`, route co upload nhu product/profile/settings | Uploader | Test page co upload nhu product/profile/settings | Component emit file ra ngoai, khong tu goi backend. |
| `FORMS-005` | `[ ]` | Desktop `1440x900`, form co submit bar | SubmitBar | Mo form dung submit bar | Khong con copy mock mac dinh; loading/disabled hien thi theo prop. |

## Test Bang Postman: PHP API -> Nuxt Bridge

Context `forms` khong co API rieng nen khong tao Postman request truc tiep cho forms. Neu can test form gui data dung chua, test theo cap PHP API goc va Nuxt bridge cua context dang dung form.

Khi can verify form payload, test qua context dang consume form:

| Form consumer | PHP raw endpoint | Nuxt bridge endpoint | Can so sanh |
| --- | --- | --- | --- |
| Login form | `POST {{backend_url}}/api/auth` | `POST {{nuxt_url}}/_api/auth/login` | Field `identity` map sang PHP `username`; response token map sang `accessToken`. |
| Register form | `POST {{backend_url}}/api/create-account` | `POST {{nuxt_url}}/_api/auth/register` | Form fields map sang `first_name`, `last_name`, `email`, `phone_num`. |
| Settings form | `POST {{backend_url}}/api/update-user-data` | `POST {{nuxt_url}}/_api/settings/update` | Nuxt chi forward field nam trong allowlist. |

## Lenh kiem tra

```powershell
cd client
npm run build
```
