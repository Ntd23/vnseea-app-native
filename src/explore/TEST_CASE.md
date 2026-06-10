# Description: Test cases for the explore (Hashtags) bounded context.

# Explore Test Cases

## Scope

- Context: `src/explore`
- Routes:
  - `ROUTES.EXPLORE` (Hashtags tab in main bottom navigator)
  - `ROUTES.SEARCH` (navigated to when a hashtag is tapped)
- Main entry points:
  - `src/explore/presentation/screens/ExploreScreen.tsx`
  - `src/explore/application/view-models/useExploreViewModel.ts`
  - `src/explore/infrastructure/repositories/ApiExploreRepository.ts`
  - `src/explore/presentation/components/HashtagCard.tsx`
  - `src/explore/presentation/components/HashtagTabs.tsx`
  - `src/explore/presentation/components/HashtagSkeleton.tsx`
  - `src/explore/presentation/components/StatPill.tsx`
- Out of scope:
  - Search screen pre-fill from `q` route param (the param is wired through
    `RootStackParamList` but the Search screen does not yet read it on mount
    — left as a follow-up so this change stays scoped)
  - Dedicated hashtag detail screen (not yet in `docs/screen-ui-plan.md`)
  - Pagination beyond the 20-item cap returned by the backend

## Environment

- React Native target: Android debug build on a physical device or emulator.
- Backend API: `https://v2.vnseea.vn/api`
- Backend endpoint exercised: `POST /api/hashtag-suggestions`
- Auth requirement: **none** — the endpoint is public.

## Smoke

| ID                 | Status | Case              | Entry            | Expected                                                                       |
| ------------------ | ------ | ----------------- | ---------------- | ------------------------------------------------------------------------------ |
| `EXPLORE-SMOKE-001`| `[ ]`  | Screen renders    | `ROUTES.EXPLORE` | Hashtags screen renders without runtime error or broken layout.                |
| `EXPLORE-SMOKE-002`| `[ ]`  | Tab navigation    | `FEED -> EXPLORE`| Tab switch happens without stale state or console error.                       |
| `EXPLORE-SMOKE-003`| `[ ]`  | Re-mount safe     | `EXPLORE`        | Re-entering the tab after visiting another does not duplicate the load call.  |

## API And Data

| ID               | Status | Case             | Entry                                  | Expected                                                                                  |
| ---------------- | ------ | ---------------- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `EXPLORE-API-001`| `[ ]`  | Success response | First mount, network OK                | At least one `TrendingHashtag` card renders with real data, not mock data.                |
| `EXPLORE-API-002`| `[ ]`  | API error        | Airplane mode or backend 5xx           | Inline red error banner appears with retry button. List still shows prior data if any.    |
| `EXPLORE-API-003`| `[ ]`  | Empty response   | Backend returns `hashtags: []`         | Empty state with "Chưa có hashtag nào" + retry button.                                    |
| `EXPLORE-API-004`| `[ ]`  | Pull-to-refresh  | Pull down on the list                  | `RefreshControl` spinner appears in brand color, list re-fetches, spinner disappears.    |
| `EXPLORE-API-005`| `[ ]`  | Tab sort: hot    | Tap "Đang hot"                         | List re-sorted by `useCount` descending. Original order is not lost when switching back. |
| `EXPLORE-API-006`| `[ ]`  | Tab sort: new    | Tap "Mới"                              | List sorted by `lastTrendTime` descending; items without a time sink to the bottom.      |

## UI And UX

| ID                | Status | Case                | Viewport      | Expected                                                                       |
| ----------------- | ------ | ------------------- | ------------- | ------------------------------------------------------------------------------ |
| `EXPLORE-UI-001`  | `[ ]`  | Mobile layout       | Android phone | No clipped text, overflow, or broken tap target.                               |
| `EXPLORE-UI-002`  | `[ ]`  | Stagger entrance    | Mount         | Cards fade + slide in with a 40ms-per-index stagger (first 8 cards).           |
| `EXPLORE-UI-003`  | `[ ]`  | Tab indicator       | Tap a tab     | Brand-blue indicator pill slides under the active tab in ~220ms.               |
| `EXPLORE-UI-004`  | `[ ]`  | Skeleton shimmer    | First load    | Four skeleton rows show a sliding highlight band on a 1.2s loop.               |
| `EXPLORE-UX-001`  | `[ ]`  | Loading vs refresh  | Various       | Initial load shows skeleton; pull-to-refresh shows spinner, not skeleton.      |
| `EXPLORE-UX-002`  | `[ ]`  | Retry path          | After error   | Tap "Thử lại" on the banner → spinner runs → either success or fresh error.   |
| `EXPLORE-UX-003`  | `[ ]`  | Hide tab bar        | Scroll down   | Bottom tab bar hides when scrolling down, shows when scrolling up.             |
| `EXPLORE-UX-004`  | `[ ]`  | Navigate to Search  | Tap a card    | App navigates to `ROUTES.SEARCH` with `q` param set to `#<tag>`.               |
| `EXPLORE-UX-005`  | `[ ]`  | Compact count       | Large useCount| Numbers > 999 render as "1.2K", "24K", "1.5M" — never blow up the right column.|

## Regression Commands

```powershell
npx tsc --noEmit
npx jest --passWithNoTests --testPathPattern=explore
```

## Notes

- Backend field `last_trend_time` is empty string in many installs; the
  repository coerces this to `null` and the UI hides the relative-time
  line entirely when the value is missing.
- The `new` tab degrades to the natural list order when no item has a
  `lastTrendTime` set, so a fresh install won't show an empty tab.
- `formatCompactCount` and `formatCountVi` are duplicated helpers in
  the screen + card; intentional for now because the screen formats
  totals (could be much larger) and the card formats per-hashtag
  counts. Consolidate into `foundation/` if a third caller appears.
- The `q` param on `ROUTES.SEARCH` is declared in `RootStackParamList`
  but the Search screen does not yet consume it. Wiring that up is a
  separate change so this PR stays scoped to the Explore context.
