# Description: Test cases for the auth bounded context and backend login session flow.

# Auth Test Cases

## Scope

- Context: `src/auth`
- Routes:
  - `Login`
  - `Register`
  - `ForgotPassword`
  - `MainTabs` after successful auth
- Main entry points:
  - `src/auth/presentation/screens/LoginScreen.tsx`
  - `src/auth/presentation/screens/RegisterScreen.tsx`
  - `src/auth/presentation/screens/ForgotPasswordScreen.tsx`
  - `src/auth/application/view-models/useAuthViewModel.ts`
  - `src/auth/infrastructure/repositories/ApiAuthRepository.ts`
- Out of scope:
  - Social login buttons.
  - Two-factor confirmation screen.
  - Account activation screen after email/SMS verification.

## Environment

- React Native target: Android debug build on physical device or emulator.
- Backend API: `https://v2.vnseea.vn/api`.
- Backend endpoints:
  - `POST /auth`
  - `POST /create-account`
  - `POST /send-reset-password-email`
  - `POST /delete-access-token`
  - `POST /get-current-user`
- Backend session source: WoWonder `access_token` stored in MMKV.

## Smoke

| ID               | Status | Case                       | Entry                     | Expected                                                                                                      |
| ---------------- | ------ | -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `AUTH-SMOKE-001` | `[ ]`  | Login screen render        | App launch route `Login`  | Logo, username field, password field, login button, social buttons, and register link render without overlap. |
| `AUTH-SMOKE-002` | `[ ]`  | Register navigation        | `Login -> Register`       | Register screen opens without stale login state.                                                              |
| `AUTH-SMOKE-003` | `[ ]`  | Forgot password navigation | `Login -> ForgotPassword` | Forgot password screen opens and back-to-login action returns to `Login`.                                     |

## Login

| ID               | Status | Case                           | Precondition                                      | Expected                                                                                   |
| ---------------- | ------ | ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `AUTH-LOGIN-001` | `[ ]`  | Empty username validation      | Password may be filled                            | Error box shows `Nhập email hoặc username.` and no backend call is required.               |
| `AUTH-LOGIN-002` | `[ ]`  | Empty password validation      | Username is filled                                | Error box shows `Nhập mật khẩu.` and no backend call is required.                          |
| `AUTH-LOGIN-003` | `[ ]`  | Wrong password backend error   | Valid username, wrong password                    | Error box shows backend message such as `Password is incorrect`; app stays on login.       |
| `AUTH-LOGIN-004` | `[ ]`  | Successful login               | Valid backend account                             | Backend returns `access_token`; session is saved in MMKV; navigation resets to `MainTabs`. |
| `AUTH-LOGIN-005` | `[ ]`  | Verification required response | Backend returns user id and message without token | User sees verification alert and app stays in auth flow.                                   |
| `AUTH-LOGIN-006` | `[ ]`  | Network transport failure      | Disable network or block domain                   | User sees detailed transport error containing request URL, not only clipped generic text.  |

## Register

| ID                  | Status | Case                                     | Precondition                                  | Expected                                                                 |
| ------------------- | ------ | ---------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| `AUTH-REGISTER-001` | `[ ]`  | Terms not accepted                       | Valid form values                             | Alert explains that terms must be accepted; no backend call is required. |
| `AUTH-REGISTER-002` | `[ ]`  | Backend validation error                 | Duplicate email or username                   | Backend message is shown inline and app stays on register.               |
| `AUTH-REGISTER-003` | `[ ]`  | Successful register with active account  | Valid new account, backend activation enabled | Session is saved and navigation resets to `MainTabs`.                    |
| `AUTH-REGISTER-004` | `[ ]`  | Register requires email/SMS verification | Backend returns `api_status: 220`             | Verification alert appears; no token is saved.                           |

## Forgot Password

| ID                | Status | Case                           | Precondition         | Expected                                                       |
| ----------------- | ------ | ------------------------------ | -------------------- | -------------------------------------------------------------- |
| `AUTH-FORGOT-001` | `[ ]`  | Empty email backend validation | Email field empty    | Backend validation message appears without unhandled error.    |
| `AUTH-FORGOT-002` | `[ ]`  | Unknown email                  | Email not registered | Backend message appears and screen remains usable.             |
| `AUTH-FORGOT-003` | `[ ]`  | Successful reset request       | Registered email     | Success message appears: `Email đặt lại mật khẩu đã được gửi.` |

## Session

| ID                 | Status | Case                   | Entry                                       | Expected                                                            |
| ------------------ | ------ | ---------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `AUTH-SESSION-001` | `[ ]`  | Token persists         | Login, close app, reopen                    | MMKV still has access token for authenticated API calls.            |
| `AUTH-SESSION-002` | `[ ]`  | Logout clears token    | `AuthRepository.logout`                     | Token is removed even if backend logout request fails.              |
| `AUTH-SESSION-003` | `[ ]`  | Current user bootstrap | `AuthRepository.getCurrentUser` after login | Backend user data maps to `AuthUser`; no mock identity is returned. |

## UI And UX

| ID            | Status | Case                      | Viewport      | Expected                                                                    |
| ------------- | ------ | ------------------------- | ------------- | --------------------------------------------------------------------------- |
| `AUTH-UI-001` | `[ ]`  | Mobile login error layout | Android phone | Error box is fully visible under the login button; no clipped text.         |
| `AUTH-UI-002` | `[ ]`  | Loading state             | Slow network  | Login/register/forgot buttons show spinner and are disabled during request. |
| `AUTH-UI-003` | `[ ]`  | Keyboard behavior         | Android phone | Keyboard does not hide the active input or submit button.                   |

## Regression Commands

```powershell
npx tsc --noEmit
npx jest --passWithNoTests
```

## Notes

- Rebuild Android after `.env` changes because `react-native-config` values are compiled into native build output.
- `API_BASE_URL` must be `https://v2.vnseea.vn/api`, not `https://v2.vnseea.vn/api/v2`.
