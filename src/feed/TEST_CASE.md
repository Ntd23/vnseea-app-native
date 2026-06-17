# Description: Test cases for the feed (timeline + share) bounded context.

# Feed Test Cases

## Scope

- Context: `src/feed`
- Routes:
  - `ROUTES.FEED` (Feed tab in main bottom navigator)
  - `ROUTES.POST_DETAIL`
  - `ROUTES.CREATE_POST`
- Main entry points:
  - `src/feed/presentation/screens/FeedScreen.tsx`
  - `src/feed/presentation/components/FeedShareBottomSheet.tsx`
  - `src/feed/application/view-models/useFeedViewModel.ts`
  - `src/feed/infrastructure/repositories/ApiFeedRepository.ts`
- Out of scope:
  - Post composer (`CreatePostScreen`) covered separately.
  - Reaction picker, polls, jobs, marketplace cards — not part of this case.

## Environment

- React Native target: Android debug build on a physical device or emulator.
- Backend API: `https://v2.vnseea.vn/api`
- Tab bar interaction is driven through `tabBarVisibility` (`src/navigation/tabBarVisibility.ts`)
  and observed by the `CustomTabBar` in `src/navigation/MainTabNavigator.tsx`.

## Smoke

| ID                  | Status | Case                 | Entry                | Expected                                                                          |
| ------------------- | ------ | -------------------- | -------------------- | --------------------------------------------------------------------------------- |
| `FEED-SMOKE-001`    | `[ ]`  | Screen renders       | `ROUTES.FEED`        | Feed renders posts without runtime error or broken layout.                        |
| `FEED-SMOKE-002`    | `[ ]`  | Tab navigation       | `EXPLORE -> FEED`    | Tab switch happens without stale state or console error.                          |
| `FEED-SMOKE-003`    | `[ ]`  | Re-mount safe        | `FEED`               | Re-entering the tab after another tab does not duplicate the load call.           |

## Share Bottom Sheet

| ID                    | Status | Case                                  | Entry                                                | Expected                                                                                                                                                                                                  |
| --------------------- | ------ | ------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FEED-SHARE-001` (a)  | `[ ]`  | Sheet opens via share button          | Tap the share icon on a post card (timeline / page / group) | `FeedShareBottomSheet` mounts at the bottom, slides up over ~280ms (Reanimated `Easing.out(cubic)`), grabber handle and dimmed backdrop (`rgba(0,0,0,0.36)`) are visible. The existing share destinations (timeline, page, group, message), Copy-link and More buttons are all present. |
| `FEED-SHARE-001` (b)  | `[ ]`  | Tab bar hidden while sheet is open    | Sheet open                                           | `tabBarVisibility.setVisible(false)` is called on mount; the bottom tab bar slides down off-screen (~200ms, translateY 120) and is not tappable. No tab icon is interactable while the sheet is open.            |
| `FEED-SHARE-001` (c)  | `[ ]`  | Sheet closes via backdrop and tab bar reappears | Tap the dimmed backdrop outside the sheet              | The sheet slides back down over ~280ms (Reanimated `Easing.in(cubic)`), the backdrop fades to transparent, `tabBarVisibility.setVisible(true)` is called, and the bottom tab bar slides back into view and is tappable again. Same behavior when closing via the X button. |
| `FEED-SHARE-002`      | `[ ]`  | Sheet survives navigation away        | Open sheet, switch tab                               | Tab bar is restored to visible (defensive `tabBarVisibility.setVisible(true)` on unmount). Reopening the tab does not leave the tab bar hidden.                                                            |
| `FEED-SHARE-003`      | `[ ]`  | Safe-area inset                       | Open sheet on a device with a bottom inset          | Sheet paddingBottom matches `Math.max(insets.bottom, 10)` so the Copy/More row is not clipped by the home indicator / nav bar.                                                                            |
| `FEED-SHARE-004`      | `[ ]`  | Copy link                             | Open sheet, tap "Sao chép liên kết"                  | Post id is copied via `useShareViewModel.copyToClipboard`, sheet closes on success, tab bar reappears. Errors surface in the inline red banner.                                                            |
| `FEED-SHARE-005`      | `[ ]`  | Share outside                         | Open sheet, tap "Thêm"                              | `useShareViewModel.sharePost` invokes the native share sheet with the post title/subject; on success the bottom sheet closes and tab bar reappears.                                                         |
| `FEED-SHARE-006`      | `[ ]`  | Internal share to timeline            | Open sheet, keep default "Chia sẻ lên dòng thời gian", tap "Chia sẻ ngay" | `onInternalShare` is called with `{ postId, destination: 'timeline', text, userId }`; on success the sheet closes, tab bar reappears, and `prependFeedPost` adds the returned post to the feed.            |
| `FEED-SHARE-007`      | `[ ]`  | Destination disabled state            | Open sheet, tap "Nhắn tin" (message)                 | The primary action button is disabled (`opacity-40`) and `share.messageUnavailable` is shown inline.                                                                                                       |