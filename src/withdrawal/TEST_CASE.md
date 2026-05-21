# Description: Test cases for the withdrawal bounded context and recent bottom-sheet regression fix.

# Withdrawal Test Cases

## Scope

- Context: `src/withdrawal`
- Routes:
  - `Withdrawal`
- Main entry points:
  - `src/withdrawal/presentation/screens/WithdrawalScreen.tsx`
  - `src/withdrawal/application/view-models/useWithdrawalViewModel.ts`
  - `src/withdrawal/infrastructure/repositories/ApiWithdrawalRepository.ts`
- Out of scope:
  - Real payout provider settlement.
  - Admin approval workflows outside the mobile app.

## Environment

- React Native target: Android debug build on physical device or emulator.
- Backend session source: WoWonder `access_token` stored in MMKV.
- Required precondition for authenticated API checks: user is logged in through the auth flow.

## Smoke

| ID             | Status | Case            | Entry                    | Expected                                                                     |
| -------------- | ------ | --------------- | ------------------------ | ---------------------------------------------------------------------------- |
| `WD-SMOKE-001` | `[ ]`  | Route opens     | Navigate to `Withdrawal` | Screen renders without runtime error.                                        |
| `WD-SMOKE-002` | `[ ]`  | Type regression | `WithdrawalScreen.tsx`   | `npx tsc --noEmit` passes; no `StyleSheet.absoluteFillObject` error remains. |

## Bottom Sheet

| ID             | Status | Case                   | Precondition                  | Expected                                                      |
| -------------- | ------ | ---------------------- | ----------------------------- | ------------------------------------------------------------- |
| `WD-SHEET-001` | `[ ]`  | Open picker sheet      | Withdrawal screen loaded      | Sheet animates from bottom with dim backdrop.                 |
| `WD-SHEET-002` | `[ ]`  | Close by backdrop      | Sheet is open                 | Tapping backdrop closes sheet without leaving overlay behind. |
| `WD-SHEET-003` | `[ ]`  | Close by hardware back | Android hardware back pressed | Sheet closes before leaving the screen.                       |
| `WD-SHEET-004` | `[ ]`  | Repeat open/close      | Open and close sheet 3 times  | No frozen overlay, clipped content, or JS error.              |

## API And Data

| ID           | Status | Case                           | Entry                                   | Expected                                                                 |
| ------------ | ------ | ------------------------------ | --------------------------------------- | ------------------------------------------------------------------------ |
| `WD-API-001` | `[ ]`  | Authenticated overview request | Withdrawal repository/view model        | Request includes stored `access_token` and `server_key`.                 |
| `WD-API-002` | `[ ]`  | Backend error                  | Invalid or expired token                | User sees safe error state; no unhandled promise rejection.              |
| `WD-API-003` | `[ ]`  | Empty withdrawal data          | Backend returns no previous withdrawals | Empty state remains usable and does not show mock balances as real data. |

## UI And UX

| ID          | Status | Case          | Viewport            | Expected                                                          |
| ----------- | ------ | ------------- | ------------------- | ----------------------------------------------------------------- |
| `WD-UI-001` | `[ ]`  | Mobile layout | Android phone       | Header, form fields, and actions fit without horizontal overflow. |
| `WD-UI-002` | `[ ]`  | Loading state | Slow API            | Loading state does not block navigation indefinitely.             |
| `WD-UI-003` | `[ ]`  | Error state   | Backend unavailable | Error message is readable and retry path remains accessible.      |

## Regression Commands

```powershell
npx tsc --noEmit
npx jest --passWithNoTests
```

## Notes

- This context currently includes a regression test for replacing `StyleSheet.absoluteFillObject` with `StyleSheet.absoluteFill`.
- Broader payout behavior should be tested after withdrawal API mapping is completed.
