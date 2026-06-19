# Description: Test cases for the stories bounded context (rail + viewer + dedicated grid list).

# Stories Test Cases

## Scope

- Context: `src/stories`
- Routes:
  - `ROUTES.CREATE_STORY`
  - `ROUTES.STORY_VIEWER`
  - `ROUTES.STORIES_LIST`
- Main entry points:
  - `src/stories/presentation/screens/CreateStoryScreen.tsx`
  - `src/stories/presentation/screens/StoryViewerScreen.tsx`
  - `src/stories/presentation/screens/StoriesListScreen.tsx`
  - `src/stories/presentation/components/StoryGridCell.tsx`
  - `src/stories/application/view-models/useStoriesViewModel.ts`
  - `src/stories/application/view-models/useStoriesListViewModel.ts`
  - `src/stories/application/i18n/storiesCopy.ts`
- Out of scope: notification wiring of story reactions (covered in `src/notifications`).

## Environment

- React Native target: Android debug build on a physical device or emulator.
- Backend API: `https://v2.vnseea.vn/api` (stories are not yet paginated by
  the backend, so the grid renders the full fetched list in one page).
- ViewModel returns mock data in the UI-only phase.
- All visible copy comes from `getStoriesCopy(language)` driven by
  `useAppLanguage()` — no `react-i18next` is used here.

## Smoke

| ID                    | Status | Case                  | Entry                                  | Expected                                                                                                                                       |
| --------------------- | ------ | --------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `STORIES-SMOKE-001`   | `[ ]`  | Viewer renders        | `ROUTES.STORY_VIEWER`                  | Full-screen story viewer opens with progress bars, header, and a media area.                                                                  |
| `STORIES-SMOKE-002`   | `[ ]`  | Composer renders      | `ROUTES.CREATE_STORY`                  | Create-story screen renders without runtime error.                                                                                              |
| `STORIES-SMOKE-003`   | `[ ]`  | Rail renders on feed  | `ROUTES.FEED`                          | Stories rail renders the latest publishers in a horizontal `ScrollView`.                                                                     |

## Stories List (grid)

| ID                       | Status | Case                                              | Entry                                                                | Expected                                                                                                                                                                                                                                                                       |
| ------------------------ | ------ | ------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `STORIES-LIST-001`       | `[ ]`  | Screen renders                                    | Tap "Xem tất cả" / "See all" on the feed rail                       | `StoriesListScreen` mounts with a top app bar (title + back), a 2-column grid of `StoryGridCell`s, and a flat-light background (`surface-base`).                                                                                                                              |
| `STORIES-LIST-002`       | `[ ]`  | Grid layout is 2 columns                          | `ROUTES.STORIES_LIST` (with mock data)                              | `FlatList numColumns={2}` renders every row with a horizontal gap of 12 and vertical gap of 12. Cell aspect ratio matches the design recipe (square cover, 18px radius).                                                                                                    |
| `STORIES-LIST-003`       | `[ ]`  | Cell tap opens viewer                             | Tap any cell                                                         | `navigation.navigate(ROUTES.STORY_VIEWER, { stories: pagedStories, initialUserIndex: row.index })` fires. The viewer's `initialUserIndex` matches the publisher of the tapped cell so segment progression continues from that publisher's first segment.                       |
| `STORIES-LIST-004`       | `[ ]`  | Pull-to-refresh reloads                           | Drag the grid down and release                                      | `RefreshControl` shows the brand-blue spinner, `useStoriesListViewModel.reload()` is awaited, and the spinner disappears. Existing cells stay visible (no skeleton flash) once the first load has already completed.                                                            |
| `STORIES-LIST-005`       | `[ ]`  | Back button returns to feed                       | Tap the back arrow in the header                                    | `navigation.goBack()` pops back to the previous screen (typically the Home feed). If there's nothing to pop, it falls back to `ROUTES.FEED`.                                                                                                                                  |
| `STORIES-LIST-006` (a)   | `[ ]`  | Empty state (vi)                                  | Open the screen with no stories (mock toggle)                       | `ListEmptyComponent` renders the `Sparkles` icon, `copy.emptyTitle` ("Chưa có tin nào"), `copy.emptyDescription` and a "Thử lại" CTA. No cells are rendered.                                                                                                                  |
| `STORIES-LIST-006` (b)   | `[ ]`  | Empty state (en)                                  | Switch language to `en` in Settings and reopen the screen            | Same layout but copy reads "No stories yet" + English description. No reload needed — `useAppLanguage` flips the copy in place.                                                                                                                                                |
| `STORIES-LIST-007`       | `[ ]`  | Language switch re-renders header                 | Open the screen in `vi`, switch to `en` in Settings, return         | Header title switches from "Tất cả tin" to "All stories" without an app restart. Empty state copy also flips.                                                                                                                                                                  |
| `STORIES-LIST-008` (a)   | `[ ]`  | Cell entrance animation (visual)                  | First open with mock data                                           | First 8 cells fade + scale in over ~280ms each, staggered by 40ms. Cells beyond the 8th render instantly to keep the entrance snappy.                                                                                                                                            |
| `STORIES-LIST-008` (b)   | `[ ]`  | Header entrance animation                         | First open                                                           | Header translates from `translateY: -40` to `0` and fades `0 -> 1` over 240ms with `Easing.out(cubic)`.                                                                                                                                                                          |
| `STORIES-LIST-009`       | `[ ]`  | No cross-domain imports                           | `src/stories/presentation/screens/StoriesListScreen.tsx` import list | Imports come only from `src/stories/*`, `src/shared-kernel/*`, `src/navigation/*`, plus platform / RN libraries. No imports from `src/feed`, `src/pages`, `src/community`, etc.                                                                                                  |
| `STORIES-LIST-010`       | `[ ]`  | Route registration                                | `src/navigation/constants/routes.ts` + `routeRegistry.tsx`          | `ROUTES.STORIES_LIST` is exported and the screen is listed in `createStackRoutes()`. Navigation types in `src/navigation/types.ts` declare it as `undefined` params.                                                                                                            |
| `STORIES-LIST-011`       | `[ ]`  | See-all affordance navigates                      | Tap "See all >" / "Xem tất cả >" on the feed rail                   | `StoriesRow.goToStoriesList` fires `navigation.navigate(ROUTES.STORIES_LIST)`. `FeedScreen` does not hard-code the route string.                                                                                                                                                  |

## Regression Commands

```powershell
npx tsc --noEmit
npx jest --passWithNoTests
```

## Notes

- The grid is built by flattening every `StoryItem`'s `media[]` into one row per segment (sorted by `segment.postedAt DESC`), so the freshest segment always sits in the top-left cell.
- `StoriesListViewModel.pagedStories` returns the unique publishers in the same order as the flattened rows, which keeps `initialUserIndex` stable when the viewer takes over.
- Brand blue (`#0000FF`) is used for the refresh spinner, avatar ring on `StoryGridCell`, and the empty-state CTA — no new design tokens were added.