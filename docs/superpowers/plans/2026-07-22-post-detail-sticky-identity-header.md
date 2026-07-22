# Post Detail Sticky Identity Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the post identity block the fixed Post Detail header while post content and comments scroll beneath it.

**Architecture:** Reuse one exported identity header and let existing post cards suppress only their inline header. Post Detail owns top safe-area and menu actions; Feed/Profile/Page retain default card behavior.

**Tech Stack:** React Native 0.85, React Navigation native stack, react-native-safe-area-context, Jest, TypeScript.

## Global Constraints

- Apply to text/photo, video, poll and product posts.
- Keep the fixed header below top safe-area with matching white background.
- Preserve iOS edge swipe and Android system back.
- Keep a visible back action only for unavailable posts.
- Do not run full platform builds unless requested.

---

### Task 1: Lock the layout contract

**Files:**

- Create: `src/feed/presentation/screens/__tests__/postDetailStickyHeader.test.js`
- Modify: `src/feed/presentation/screens/__tests__/postCommentsUseDetailScreen.test.js`

- [ ] Assert Post Detail renders `PostIdentityHeader` outside inline comments.
- [ ] Assert all four cards receive `showIdentityHeader={false}` only in Post Detail.
- [ ] Assert the old `PostHeader` navigation bar is absent for a loaded post.
- [ ] Assert safe-area/header share a background and unavailable state retains back.
- [ ] Run Jest and confirm the new assertions fail.

### Task 2: Extract the shared identity header

**Files:**

- Modify: `src/feed/presentation/components/PostCards.tsx`
- Modify: `src/feed/presentation/components/PollPostCard.tsx`
- Modify: `src/product/presentation/components/ProductPostCard.tsx`

- [ ] Export `PostIdentityHeader` with avatar, publisher, time, privacy and menu callbacks.
- [ ] Add `showIdentityHeader?: boolean` defaulting to `true` to each card.
- [ ] Hide only the inline identity block when false; preserve all body/media/actions.
- [ ] Run targeted card tests.

### Task 3: Rebuild Post Detail chrome

**Files:**

- Modify: `src/feed/presentation/screens/PostDetailScreen.tsx`
- Modify: `src/feed/application/view-models/usePostDetailViewModel.ts`

- [ ] Remove the loaded-state navigation header.
- [ ] Render the fixed identity header under an explicit matching top safe-area.
- [ ] Pass `showIdentityHeader={false}` to text/video/poll/product cards.
- [ ] Connect save, hide, report and delete to `PostMenuActionSheet` using canonical permissions.
- [ ] Keep error-state back action and existing swipe-back gesture.
- [ ] Run targeted Jest and confirm green.

### Task 4: Verify regressions

**Files:** Verify all files above.

- [ ] Run targeted Jest suites.
- [ ] Run `./node_modules/.bin/tsc --noEmit`.
- [ ] Run ESLint on changed source/tests and separate existing baseline failures.
- [ ] Run `git diff --check`.
