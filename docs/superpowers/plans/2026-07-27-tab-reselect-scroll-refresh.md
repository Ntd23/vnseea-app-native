# Tab Reselect Scroll And Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repeated presses on active Feed navigation items scroll to the top first and refresh only when already at the top.

**Architecture:** A pure helper decides between `scroll-to-top` and `refresh` using a 12-point threshold. Feed, Marketplace, and Profile retain ownership of their list refs and refresh operations; iOS consumes the existing `tabPress` event while Android Feed invokes the same handler from its active filter item.

**Tech Stack:** React Native, React Navigation, TypeScript, Jest, FlashList, FlatList.

## Global Constraints

- Android applies only to active Home and Photos in the Feed filter bar.
- iOS applies only to Feed, Marketplace, and own Profile bottom tabs.
- One press performs only one action.
- Repeated presses do not start duplicate refresh requests.
- Map, Reels, navigation, and Android bottom bar behavior remain unchanged.
- Do not run full iOS or Android builds.

---

### Task 1: Reselect Decision Contract

**Files:**
- Create: `src/navigation/tabReselectAction.ts`
- Create: `src/navigation/__tests__/tabReselectAction.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type TabReselectAction = 'scroll-to-top' | 'refresh';
  export const TAB_RESELECT_TOP_THRESHOLD = 12;
  export function getTabReselectAction(
    contentOffsetY: number,
    topThreshold?: number,
  ): TabReselectAction;
  ```

- [x] **Step 1: Write the failing unit test**

Assert that offsets `13` and `100` return `scroll-to-top`, while `12`, `0`,
and negative bounce offsets return `refresh`.

- [x] **Step 2: Verify RED**

```bash
./node_modules/.bin/jest \
  src/navigation/__tests__/tabReselectAction.test.ts \
  --runInBand
```

Expected: fail because `tabReselectAction.ts` does not exist.

- [x] **Step 3: Implement the pure helper**

Normalize non-finite offsets to zero and return exactly one action.

- [x] **Step 4: Verify GREEN**

Run the Task 1 Jest command and expect all assertions to pass.

---

### Task 2: Feed Reselect Behavior

**Files:**
- Modify: `src/feed/presentation/components/FeedFilterTabs.tsx`
- Modify: `src/feed/presentation/screens/FeedScreen.tsx`
- Create: `src/feed/presentation/screens/__tests__/feedTabReselect.test.js`

**Interfaces:**
- Consumes: `getTabReselectAction()`.
- Produces: one Feed handler reused by iOS `tabPress` and Android active
  Home/Photos presses.

- [x] **Step 1: Write the failing source-contract test**

Assert that Feed subscribes to iOS `tabPress`, checks the shared decision
helper, calls `handleRefresh` only at the top, and that `FeedFilterTabs`
provides the active source to the Android callback.

- [x] **Step 2: Verify RED**

Run only `feedTabReselect.test.js`; expect missing handler/listener assertions.

- [x] **Step 3: Implement Feed integration**

Track the existing `feedScrollYRef`, scroll the FlashList when below the
threshold, restore Feed chrome, and refresh only when at the top and not
already refreshing. Add an active-source press callback for Home and Photos.

- [x] **Step 4: Verify GREEN**

Run the Feed reselect test together with existing Feed filter/header tests.

---

### Task 3: Marketplace And Profile iOS Reselect

**Files:**
- Modify: `src/product/presentation/screens/MarketplaceScreen.tsx`
- Modify: `src/profile/presentation/screens/ProfileScreen.tsx`
- Create: `src/navigation/__tests__/iosTabReselectScreens.test.js`

**Interfaces:**
- Consumes: `getTabReselectAction()`.
- Marketplace uses `FlatList<ProductItem>` ref plus `vm.reload`.
- Profile uses `FlashList<ProfileListItem>` ref plus one canonical refresh
  callback shared by RefreshControl and tab reselect.

- [x] **Step 1: Write the failing screen contract test**

Assert that both screens listen to `tabPress` only on iOS, guard focus, use
the shared helper, and skip duplicate refresh. Assert Profile only handles its
own tab profile and exposes a RefreshControl.

- [x] **Step 2: Verify RED**

Run only `iosTabReselectScreens.test.js`; expect the new integration assertions
to fail.

- [x] **Step 3: Implement Marketplace integration**

Attach a list ref, reuse `latestScrollYRef`, restore the filter panel when
scrolling to top, and call `vm.reload` at the top.

- [x] **Step 4: Implement Profile integration**

Attach a list ref, add `isProfileRefreshing`, and reload profile metadata plus
the first page of posts in one callback. Preserve existing posts until the
refresh snapshot succeeds and expose that callback through RefreshControl.

- [x] **Step 5: Verify GREEN**

Run the Task 3 test and relevant existing Marketplace/Profile tests.

---

### Task 4: Final Verification

**Files:**
- Verify all files changed by Tasks 1-3.

- [x] **Step 1: Run targeted Jest**

```bash
./node_modules/.bin/jest \
  src/navigation/__tests__/tabReselectAction.test.ts \
  src/feed/presentation/screens/__tests__/feedTabReselect.test.js \
  src/navigation/__tests__/iosTabReselectScreens.test.js \
  --runInBand
```

- [x] **Step 2: Run static checks**

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint \
  src/navigation/tabReselectAction.ts \
  src/feed/presentation/components/FeedFilterTabs.tsx \
  src/feed/presentation/screens/FeedScreen.tsx \
  src/product/presentation/screens/MarketplaceScreen.tsx \
  src/profile/presentation/screens/ProfileScreen.tsx
git diff --check
```

- [x] **Step 3: Audit scope**

Confirm Map/Reels navigation is unchanged, Android bottom tabs are untouched,
and no full native build was run.
