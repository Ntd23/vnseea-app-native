# Hide Forum Menu Item Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide Forum from the App Bar profile menu and Settings while preserving all Forum navigation contracts.

**Architecture:** Disable only the two presentation catalogs that expose Forum. Keep route registration and notification navigation unchanged so existing links continue to work.

**Tech Stack:** React Native, TypeScript, Jest, ESLint.

## Global Constraints

- Comment presentation entries instead of deleting Forum functionality.
- Do not change Forum routes, screens, repositories, or backend behavior.
- Do not run full iOS or Android builds.

---

### Task 1: Hide Forum Presentation Entries

**Files:**
- Modify: `src/feed/presentation/components/HeaderProfileDrawer.tsx`
- Modify: `src/settings/application/view-models/useSettingsViewModel.ts`
- Test: `src/feed/presentation/components/__tests__/feedHeader.test.js`

**Interfaces:**
- Consumes: existing profile drawer and Settings feature catalogs.
- Produces: menus that omit Forum while `ROUTES.FORUM` remains registered.

- [x] **Step 1: Add a regression assertion**

Extend the existing header/menu test to verify the active App Bar drawer and
Settings catalogs no longer expose an active `forum` item, while route
registration still contains `ROUTES.FORUM`.

- [x] **Step 2: Run the test and verify RED**

```bash
./node_modules/.bin/jest \
  src/feed/presentation/components/__tests__/feedHeader.test.js \
  --runInBand
```

Expected: failure because Forum is still rendered in the App Bar menu and
present in Settings catalogs.

- [x] **Step 3: Comment the presentation entries**

Comment the Forum `MenuRow` and both Settings catalog entries. Keep route and
handler branches intact.

- [x] **Step 4: Verify GREEN and static checks**

```bash
./node_modules/.bin/jest \
  src/feed/presentation/components/__tests__/feedHeader.test.js \
  --runInBand -t "hides Forum"
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint \
  src/feed/presentation/components/HeaderProfileDrawer.tsx \
  src/settings/application/view-models/useSettingsViewModel.ts \
  src/feed/presentation/components/__tests__/feedHeader.test.js
git diff --check
```

Expected: test and TypeScript pass; ESLint has no new errors.

The complete `feedHeader.test.js` suite currently has an unrelated baseline
failure expecting `MessageScreen` to call `feedLogoEvents.emitScrollToTop()`.
The Forum regression is therefore run by its exact test name.
