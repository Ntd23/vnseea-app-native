# Email Verification App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the registration verification alert with a native six-digit email OTP flow that signs the user in and opens Feed after successful verification.

**Architecture:** Treat the registration response as the source of truth for the admin setting: an access token means registration is active, while `verification_required` means the account exists but must be activated. Add repository operations for confirm/resend, a typed native-stack route, and a focused verification screen; reuse the existing session mapping so verification success initializes push and realtime exactly like login.

**Tech Stack:** React Native, TypeScript, React Navigation native-stack, existing VNSEEA auth repository/API bridge, Jest source-contract and repository tests.

## Global Constraints

- OTP is exactly six numeric digits.
- Successful verification automatically signs in and resets navigation to `MAIN_TABS`.
- Resend is disabled for 60 seconds after entering the screen or successfully resending.
- Registration with email validation disabled keeps the current direct-to-Feed behavior.
- Do not add a package, Pod, database migration, or full native build.
- Do not modify or revert `ios/VNSEEA.xcodeproj/project.pbxproj`.

---

### Task 1: Auth Verification Contract

**Files:**
- Modify: `src/auth/domain/types/auth.types.ts`
- Modify: `src/auth/domain/repositories/AuthRepository.ts`
- Modify: `src/auth/infrastructure/repositories/ApiAuthRepository.ts`
- Modify: `src/shared-kernel/application/constants/route-registry.ts`
- Test: `src/auth/infrastructure/repositories/__tests__/ApiAuthRepository.verification.test.ts`

**Interfaces:**
- Consumes: backend `active_account_sms` and `resend-activation-code` endpoints.
- Produces: `confirmAccount(input)` and `resendAccountCode(userId)` repository methods returning canonical auth data.

- [ ] **Step 1: Write failing repository tests**

Assert confirmation sends `{ user_id, code, device_type, timezone }`, maps the returned token through the normal session path, and resend sends `{ user_id }` without creating a session.

- [ ] **Step 2: Run the repository test and verify RED**

```bash
./node_modules/.bin/jest src/auth/infrastructure/repositories/__tests__/ApiAuthRepository.verification.test.ts --runInBand
```

Expected: failure because the repository methods and resend route do not exist.

- [ ] **Step 3: Add the minimal domain and repository implementation**

```ts
export type ConfirmAccountInput = {
  userId: string;
  code: string;
  timezone?: string;
};

confirmAccount(input: ConfirmAccountInput): Promise<AuthResult>;
resendAccountCode(userId: string): Promise<void>;
```

Use `mapAuthResponse()` for confirmation so token persistence, push identity and call realtime connection stay centralized.

- [ ] **Step 4: Run the repository test and verify GREEN**

Run the command from Step 2 and expect all assertions to pass.

### Task 2: Typed Verification Route And Screen

**Files:**
- Create: `src/auth/presentation/screens/EmailVerificationScreen.tsx`
- Modify: `src/navigation/constants/routes.ts`
- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/routeRegistry.tsx`
- Modify: `src/auth/application/i18n/authCopy.ts`
- Test: `src/auth/presentation/screens/__tests__/emailVerificationScreen.test.js`

**Interfaces:**
- Consumes: `{ userId: string; email: string }` route params and repository verification operations.
- Produces: six-cell OTP UI, resend countdown and authenticated navigation reset.

- [ ] **Step 1: Write a failing source-contract test**

Assert the route is registered, the screen uses six numeric cells, sanitizes pasted input, calls `confirmAccount`, counts down from 60, calls `resendAccountCode`, uses safe-area/keyboard protection, and resets to `MAIN_TABS` after authentication.

- [ ] **Step 2: Run the screen test and verify RED**

```bash
./node_modules/.bin/jest src/auth/presentation/screens/__tests__/emailVerificationScreen.test.js --runInBand
```

Expected: failure because the route and screen do not exist.

- [ ] **Step 3: Implement the native-stack screen**

Use one hidden numeric `TextInput` as the input owner and render six visual cells from its value. Keep validation/API errors inline, preserve the code after a failed request, disable duplicate submits, and expose a 60-second resend countdown.

- [ ] **Step 4: Run the screen test and verify GREEN**

Run the command from Step 2 and expect all assertions to pass.

### Task 3: Registration Handoff

**Files:**
- Modify: `src/auth/presentation/screens/RegisterScreen.tsx`
- Modify: `src/auth/presentation/screens/__tests__/registrationContract.test.js`

**Interfaces:**
- Consumes: `AuthResult.status` and the submitted email.
- Produces: direct Feed navigation for active accounts and OTP navigation for inactive accounts.

- [ ] **Step 1: Add failing registration navigation assertions**

Assert the verification `Alert.alert` path is removed and `navigation.replace(ROUTES.EMAIL_VERIFICATION, { userId: result.userId, email: email.trim() })` is used instead.

- [ ] **Step 2: Run the registration test and verify RED**

```bash
./node_modules/.bin/jest src/auth/presentation/screens/__tests__/registrationContract.test.js --runInBand
```

- [ ] **Step 3: Implement the handoff**

Keep the authenticated branch unchanged. Replace only the verification-required alert with native-stack navigation to the new screen.

- [ ] **Step 4: Run the registration test and verify GREEN**

Run the command from Step 2 and expect all assertions to pass.

### Task 4: Mirror Compatibility And Verification

**Files:**
- Modify: `phtml/api/v2/endpoints/active_account_sms.php`
- Create: `phtml/api/v2/endpoints/resend-activation-code.php`
- Modify: `phtml/api/v2/endpoints/create-account.php`
- Test: `src/auth/presentation/screens/__tests__/registrationContract.test.js`

**Interfaces:**
- Consumes: the already deployed canonical implementation in `/Users/apple/Desktop/src_duong/demo.vnseea`.
- Produces: a deployment mirror that accepts six-digit email OTP and supports resend without changing the canonical contract.

- [ ] **Step 1: Add failing mirror contract assertions**

Assert create-account generates a six-digit activation code, confirmation validates the hashed email code for the requested inactive user, and resend rotates/sends a six-digit code.

- [ ] **Step 2: Run the contract test and verify RED**

Run the registration contract test and confirm it fails against the stale mirror.

- [ ] **Step 3: Synchronize only the relevant canonical backend files**

Preserve App-specific `platform_details` additions where present; do not overwrite unrelated backend changes.

- [ ] **Step 4: Run focused and static verification**

```bash
./node_modules/.bin/jest \
  src/auth/infrastructure/repositories/__tests__/ApiAuthRepository.verification.test.ts \
  src/auth/presentation/screens/__tests__/emailVerificationScreen.test.js \
  src/auth/presentation/screens/__tests__/registrationContract.test.js \
  --runInBand
./node_modules/.bin/tsc --noEmit
php -l phtml/api/v2/endpoints/create-account.php
php -l phtml/api/v2/endpoints/active_account_sms.php
php -l phtml/api/v2/endpoints/resend-activation-code.php
git diff --check
```

Expected: all focused tests and static checks pass. Existing unrelated ESLint errors must be reported separately rather than hidden.
