# Description: Test cases for the funding bounded context.

# Funding Test Cases

## Scope

- Context: `src/funding`
- Routes:
  - `Funding`
  - `FundingDetail`
  - `CreateFunding`
- Main entry points:
  - `src/funding/presentation/screens/FundingScreen.tsx`
  - `src/funding/presentation/screens/FundingDetailScreen.tsx`
  - `src/funding/presentation/screens/CreateFundingScreen.tsx`
  - `src/funding/application/view-models/useFundingViewModel.ts`
  - `src/funding/application/view-models/useFundingDetailViewModel.ts`
  - `src/funding/application/view-models/useCreateFundingViewModel.ts`
  - `src/funding/infrastructure/repositories/ApiFundingRepository.ts`
- Out of scope:
  - Pay / wallet deduction logic on the donation flow (handled by `wallet`).
  - Notification side-effects (handled by `notifications`).

## Environment

- React Native target: Android debug build on physical device or emulator.
- Backend API: `https://vnseea.vn/api`
- Backend session source: WoWonder `access_token` stored in MMKV.
- Auth requirement: authenticated for create, edit, delete, pay; public for `getFundingList`.

## Smoke

| ID                  | Status | Case              | Entry                                | Expected                                                                       |
| ------------------- | ------ | ----------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| `FUND-SMOKE-001`    | `[ ]`  | List renders      | `Settings → Gây quỹ`                 | Screen renders the list (or empty state) without runtime error.                 |
| `FUND-SMOKE-002`    | `[ ]`  | Detail navigation | `FundingScreen → card`               | Navigates to `FundingDetail` with the correct `fundId` from `hashed_id`.       |
| `FUND-SMOKE-003`    | `[ ]`  | Create navigation | `FundingScreen → Tạo mới`            | Navigates to `CreateFunding`.                                                  |
| `FUND-SMOKE-004`    | `[ ]`  | Owner menu        | `FundingDetail` as campaign owner    | MoreVertical menu shows; non-owner does not see the menu.                      |
| `FUND-SMOKE-005`    | `[ ]`  | Donate modal      | `FundingDetail` as non-owner         | Donate button shows the donate modal; owner sees a static "you own this" row.  |

## API And Data

| ID               | Status | Case             | Entry                                                                  | Expected                                                              |
| ---------------- | ------ | ---------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `FUND-API-001`   | `[ ]`  | List success     | `repository.getFundingList({ limit: 20 })`                             | Returns an array of campaigns; `apiBridge.post` called with `type=funding`. |
| `FUND-API-002`   | `[ ]`  | Detail success   | `repository.getFundingById(hashedId)`                                  | Returns the campaign with `recent_donations` array when present.      |
| `FUND-API-003`   | `[ ]`  | List error       | `apiBridge.post` rejects (network off)                                 | `useFundingViewModel.error` is set; UI shows `ErrorState` with retry. |
| `FUND-API-004`   | `[ ]`  | Empty list       | Backend returns `data: []`                                             | UI shows `EmptyState` with "Chưa có chiến dịch gây quỹ".              |
| `FUND-API-005`   | `[ ]`  | Create multipart | `repository.createFunding({ title, description, amount, image })`     | Uses `apiBridge.multipart` with `type=create` and a file payload.      |
| `FUND-API-006`   | `[ ]`  | Donate success   | `repository.donate(campaignId, amount)`                                | Returns `api_status=200`; ViewModel reloads detail to refresh totals.  |
| `FUND-API-007`   | `[ ]`  | Delete success   | `repository.deleteFunding(id)`                                         | Returns `api_status=200`; Detail screen pops back on confirmation.     |

## UI And UX

| ID              | Status | Case            | Viewport      | Expected                                                                            |
| --------------- | ------ | --------------- | ------------- | ----------------------------------------------------------------------------------- |
| `FUND-UI-001`   | `[ ]`  | Mobile layout   | Android phone | No clipped text on campaign cards, donate modal, or detail hero.                    |
| `FUND-UI-002`   | `[ ]`  | Token usage     | All screens   | Uses `surface-card`, `btn-primary`, `text-display`, `progress-track`, `text-brand`. |
| `FUND-UX-001`   | `[ ]`  | Loading state   | Slow API      | List shows `ActivityIndicator`; detail shows centered spinner on first load.         |
| `FUND-UX-002`   | `[ ]`  | Pull to refresh | FundingScreen | Pulling down calls `reload` and updates list.                                       |
| `FUND-UX-003`   | `[ ]`  | Form validation | CreateScreen  | Empty title/description/amount/image blocks submit and shows inline error.          |
| `FUND-UX-004`   | `[ ]`  | Donate cancel   | DonateModal   | Tapping the dimmed background closes the modal without calling the API.             |
| `FUND-UX-005`   | `[ ]`  | Delete confirm  | FundingDetail | Tapping Delete asks for confirmation; only on confirm does the API call fire.        |

## Regression Commands

```powershell
npx tsc --noEmit
npx jest --passWithNoTests
```

## Notes

- Backend endpoint is shared across 7 `type` values; client must always set `type` explicitly when calling.
- `currency` and `currency_symbol` come from the backend `wo['config']`; the current ViewModel hard-codes `đ` until the list response is fully consumed.
- The create flow is mocked in `useCreateFundingViewModel` (UI-only phase). Wire `createFundingRepository().createFunding` once the feature is enabled.
