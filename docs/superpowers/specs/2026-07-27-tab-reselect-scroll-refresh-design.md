# Tab Reselect Scroll And Refresh Design

## Goal

Make a repeated press on the current navigation item behave consistently:

- If the current list is below the top, animate back to the top.
- If the current list is already at the top, reload it with the same visible
  loading state as pull-to-refresh.

## Scope

### Android

- Apply to the active **Home** and **Photos** items in the Feed filter bar.
- Keep Map, Video, and Shop as navigation commands.
- Do not change the Android bottom bar.

### iOS

- Apply to the active Feed, Marketplace, and own Profile items in the native
  bottom bar.
- Do not change Reels or Nearby Map behavior.
- Do not apply Profile-tab refresh behavior to a stack profile for another
  user.

## Interaction Contract

The list is considered at the top when its normalized vertical offset is at
most `12` points.

1. Offset greater than `12`: call the list's animated scroll-to-top command.
   Do not start a reload in the same press.
2. Offset at most `12`: call the screen's canonical refresh command.
3. Ignore a refresh request while that screen is already refreshing.
4. Scrolling to the top also restores collapsed Feed or Marketplace chrome.

## Architecture

Add a pure shared decision helper:

```ts
type ReselectAction = 'scroll-to-top' | 'refresh';

function getReselectAction(
  contentOffsetY: number,
  topThreshold?: number,
): ReselectAction;
```

Each screen owns its list ref, current offset, refresh state, and side effects.
This keeps navigation unaware of screen internals.

- The existing iOS pager already emits React Navigation `tabPress`, including
  repeated presses on the selected tab. Feed, Marketplace, and Profile listen
  only on iOS while focused.
- Android Feed invokes the same Feed handler directly when the active Home or
  Photos source is pressed.
- Feed reuses `handleRefresh`.
- Marketplace reuses `vm.reload` and gains a `FlatList` ref.
- Profile gains a canonical refresh callback and RefreshControl so a tab
  refresh and a pull refresh share the same loading state.

## Error And Concurrency Behavior

- Existing repository/view-model error handling remains authoritative.
- A second press while refreshing does nothing.
- A scroll press does not cancel or start network work.
- Navigation presses to a different item keep their current behavior.

## Verification

- Unit-test threshold handling, including negative iOS bounce offsets.
- Source-contract tests cover Android active Home/Photos and iOS listeners.
- Test Profile refresh reloads both profile metadata and first-page posts.
- Run targeted Jest, TypeScript, ESLint, and `git diff --check`.
- Do not run full iOS or Android builds.
