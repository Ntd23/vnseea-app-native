# Android Feed Top Safe-Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect the Android Feed header from the status bar and camera cutout without changing iOS or double-applying the inset.

**Architecture:** Make the absolute Feed header overlay the sole owner of the Android top inset. The shared inset resolver supplies safe-area and platform fallback values; the Feed root stops applying Android top padding.

**Tech Stack:** React Native 0.85, react-native-safe-area-context, Jest, TypeScript.

## Global Constraints

- Keep the Android status bar white with dark system icons.
- Do not change iOS Feed header behavior.
- Do not wrap Feed with `SafeAreaFeedHeader`.
- Preserve collapse animation, pull-to-refresh and list scroll-root behavior.

---

### Task 1: Lock Android inset behavior with tests

**Files:**
- Create: `src/feed/presentation/components/__tests__/feedHeaderInsets.test.ts`
- Modify: `src/feed/presentation/components/__tests__/feedHeader.test.js`

**Interfaces:**
- Consumes: `resolveFeedChromeTopInset(safeAreaTop, initialSafeAreaTop)`.
- Produces: regression coverage for Android safe-area/fallback and Feed root ownership.

- [ ] **Step 1: Write failing helper tests**

Mock `Platform.OS` and `StatusBar.currentHeight`, then assert Android returns a positive safe-area top, respects an explicit initial inset `0`, or uses the status-bar fallback only when initial metrics are absent. iOS retains fallback `47`.

- [ ] **Step 2: Update source-contract assertions**

Require Android root edges to be `['left', 'right', 'bottom']`, require overlay height to include `topInset`, and preserve the iOS overlay branch.

- [ ] **Step 3: Run tests and confirm failure**

Run:

```bash
./node_modules/.bin/jest \
  src/feed/presentation/components/__tests__/feedHeaderInsets.test.ts \
  src/feed/presentation/components/__tests__/feedHeader.test.js \
  --runInBand
```

Expected: Android inset and root-edge assertions fail against the current implementation.

### Task 2: Transfer Android top inset ownership to the header

**Files:**
- Modify: `src/feed/presentation/components/feedHeaderInsets.ts`
- Modify: `src/feed/presentation/screens/FeedScreen.tsx`

**Interfaces:**
- Consumes: safe-area top, initial window top and `StatusBar.currentHeight`.
- Produces: one normalized top inset shared by header, overlay, list and refresh control.

- [ ] **Step 1: Implement platform fallback**

Use iOS fallback `47`; use Android `StatusBar.currentHeight ?? 0` only when initial metrics are unavailable. Always prefer positive safe-area metrics and preserve an explicit Android initial inset `0`.

- [ ] **Step 2: Remove Android top edge from Feed root**

Change Android `FEED_ROOT_SAFE_AREA_EDGES` to `['left', 'right', 'bottom']`. Add optional `FeedHeader` prop `includeTopSafeArea=false` and enable it only in the Android Feed overlay; stack screens keep using `SafeAreaFeedHeader` with the default to avoid double insets. Keep iOS `['left', 'right']` unchanged.

- [ ] **Step 3: Run targeted tests**

Run the Task 1 Jest command. Expected: PASS.

### Task 3: Verify regressions

**Files:**
- Verify all files from Tasks 1-2.

- [ ] **Step 1: Run TypeScript**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 2: Run ESLint**

```bash
./node_modules/.bin/eslint \
  src/feed/presentation/components/feedHeaderInsets.ts \
  src/feed/presentation/screens/FeedScreen.tsx \
  src/feed/presentation/components/__tests__/feedHeaderInsets.test.ts \
  src/feed/presentation/components/__tests__/feedHeader.test.js
```

- [ ] **Step 3: Validate whitespace**

```bash
git diff --check
```

- [ ] **Step 4: Device acceptance**

On an Android edge-to-edge device, confirm header content starts below the status bar/cutout, status bar remains white with dark icons, Feed posts and pull-to-refresh begin below the full overlay, and no extra blank top gap appears.
