# Auth API Flow

`auth` hiện là context mẫu đầu tiên theo flow:

`View -> ViewModel -> Repository -> /api/* -> backend PHP API`

## File map

### View

- [RegisterPage.vue](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/presentation/pages/RegisterPage.vue)
- [ForgotPasswordPage.vue](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/presentation/pages/ForgotPasswordPage.vue)

### ViewModel

- [useRegisterPageVM.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/application/view-models/useRegisterPageVM.ts)
- [useForgotPasswordPageVM.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/application/view-models/useForgotPasswordPageVM.ts)

### Domain

- [auth.types.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/domain/types/auth.types.ts)
- [AuthRepository.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/domain/repositories/AuthRepository.ts)

### Infrastructure

- [ApiAuthRepository.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/infrastructure/repositories/ApiAuthRepository.ts)
- [nuxt-api-client.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/shared-kernel/infrastructure/http/nuxt-api-client.ts)

### Nuxt server proxy

- [register.post.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/server/api/auth/register.post.ts)
- [forgot-password.post.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/server/api/auth/forgot-password.post.ts)
- [reset-password.post.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/server/api/auth/reset-password.post.ts)
- [backend-api-client.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/server/utils/backend-api-client.ts)
- [backend-api-response.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/server/utils/backend-api-response.ts)

## Register flow

1. User submit form ở `/register`.
2. [RegisterPage.vue](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/presentation/pages/RegisterPage.vue) gọi `handleSubmit()` từ [useRegisterPageVM.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/application/view-models/useRegisterPageVM.ts).
3. ViewModel gọi `repository.register(state)`.
4. [ApiAuthRepository.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/infrastructure/repositories/ApiAuthRepository.ts) gọi `POST /api/auth/register`.
5. [register.post.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/server/api/auth/register.post.ts) map payload của UI sang payload backend cho `create-account`.
6. [backend-api-client.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/server/utils/backend-api-client.ts) gọi endpoint PHP thật.
7. Server route normalize response backend thành `RegisterAccountResult`.
8. ViewModel cập nhật `submitState`, `submitMessage`, và bắn toast.

## Forgot-password flow

1. User submit form ở `/forgot-password`.
2. [ForgotPasswordPage.vue](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/presentation/pages/ForgotPasswordPage.vue) gọi `handleReset()` từ [useForgotPasswordPageVM.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/application/view-models/useForgotPasswordPageVM.ts).
3. ViewModel gọi `repository.requestPasswordReset({ identity })`.
4. [ApiAuthRepository.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/infrastructure/repositories/ApiAuthRepository.ts) gọi `POST /api/auth/forgot-password`.
5. [forgot-password.post.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/server/api/auth/forgot-password.post.ts) map payload sang `send-reset-password-email.php`.
6. Response được normalize rồi trả ngược lại cho ViewModel.
7. ViewModel cập nhật alert state ở page.

## Legacy mapping

- `POST /api/auth/register` -> `create-account.php`
- `POST /api/auth/forgot-password` -> `send-reset-password-email.php`
- `POST /api/auth/reset-password` -> `reset_password.php`

## Current limitation

- Bridge `register` hiện chỉ support `email`, chưa support `phone-only` registration.
- Bridge `forgot-password` hiện chỉ support `email-based reset`, chưa support đầy đủ SMS reset flow.
- Nếu PHP endpoint hoặc proxy lỗi `5xx`, [ApiAuthRepository.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/auth/infrastructure/repositories/ApiAuthRepository.ts) mới fallback sang mock repository.
- Nếu backend trả lỗi nghiệp vụ `4xx`, lỗi sẽ được giữ nguyên và đẩy lên UI, không fallback mock.
