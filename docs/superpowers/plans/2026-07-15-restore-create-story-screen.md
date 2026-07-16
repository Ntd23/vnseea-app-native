# Restore Create Story Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the Create Story screen exactly to its UI immediately before commit `c01db415`, with a regression test preventing the generic mixed-upload form from returning.

**Architecture:** Restore only `CreateStoryScreen.tsx` from Git snapshot `c01db415^`, leaving the current Story ViewModel, repository, events, and backend untouched. Add a source-contract Jest test that verifies the historical Story-specific UI and rejects the accidentally introduced status-form markers.

**Tech Stack:** React Native, TypeScript, Jest, react-native-image-picker, react-native-video, react-native-safe-area-context.

## Global Constraints

- Only restore `src/stories/presentation/screens/CreateStoryScreen.tsx` from `c01db415^`.
- Do not revert the wallet, auth, blog, or backend files from commit `c01db415`.
- Keep top safe-area, Story ViewModel submission, optimistic Story event, and success toast.
- Do not modify `ios/VNSEEA.xcodeproj/project.pbxproj`.

---

### Task 1: Restore the Story-specific composer

**Files:**
- Modify: `src/stories/presentation/screens/CreateStoryScreen.tsx`
- Create: `src/stories/presentation/screens/__tests__/createStoryScreenRestoration.test.js`

**Interfaces:**
- Consumes: Existing `useCreateStoryViewModel`, `storyCreatedEvents`, `showToast`, `launchImageLibrary`, and root navigation.
- Produces: The historical Create Story UI with separate photo/video selection and unchanged submission behavior.

- [ ] **Step 1: Write the failing regression test**

```js
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');
const source = fs.readFileSync(
  path.join(root, 'src/stories/presentation/screens/CreateStoryScreen.tsx'),
  'utf8',
);

describe('Create Story screen restoration', () => {
  it('keeps the Story-specific header and separate media pickers', () => {
    expect(source).toContain("headerTitle: 'Tạo tin'");
    expect(source).toContain("publishButton: 'Đăng'");
    expect(source).toContain('const handlePickImage = useCallback');
    expect(source).toContain("mediaType: 'photo' as MediaType");
    expect(source).toContain('const handlePickVideo = useCallback');
    expect(source).toContain("mediaType: 'video' as MediaType");
    expect(source).not.toContain("mediaType: 'mixed' as MediaType");
  });

  it('uses the large contain preview and removes the generic status form', () => {
    expect(source).toContain('height: 440');
    expect(source).toMatch(/resizeMode="contain"/);
    expect(source).toContain('disabled={!vm.canSubmit}');
    expect(source).toContain('<SafeAreaView');
    expect(source).toContain("edges={['top']}");
    expect(source).not.toContain("headerTitle: 'Tạo trạng thái mới'");
    expect(source).not.toContain('mediaPlaceholder');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
./node_modules/.bin/jest src/stories/presentation/screens/__tests__/createStoryScreenRestoration.test.js --runInBand
```

Expected: FAIL because the current file contains `Tạo trạng thái mới`, uses a mixed picker, and lacks the historical header/picker assertions.

- [ ] **Step 3: Restore the exact historical screen snapshot**

Restore only this file from `c01db415^`:

```bash
git restore --source=c01db415^ -- src/stories/presentation/screens/CreateStoryScreen.tsx
```

Confirm the restored file still imports and calls `showToast`, emits `storyCreatedEvents`, uses `SafeAreaView edges={['top']}`, and has no changes outside the two task files.

- [ ] **Step 4: Run focused and repository verification**

Run each command separately:

```bash
./node_modules/.bin/jest src/stories/presentation/screens/__tests__/createStoryScreenRestoration.test.js src/stories/presentation/screens/__tests__/storyViewerSafeArea.test.js --runInBand
```

```bash
./node_modules/.bin/tsc --noEmit
```

```bash
./node_modules/.bin/eslint src/stories/presentation/screens/CreateStoryScreen.tsx src/stories/presentation/screens/__tests__/createStoryScreenRestoration.test.js
```

```bash
git diff --check
```

Expected: Jest and TypeScript pass; ESLint has no errors; `git diff --check` returns no output.

- [ ] **Step 5: Review scope**

Run:

```bash
git status --short
```

```bash
git diff -- src/stories/presentation/screens/CreateStoryScreen.tsx src/stories/presentation/screens/__tests__/createStoryScreenRestoration.test.js
```

Expected: The implementation scope contains only the restored Story screen and its new regression test; the pre-existing Xcode project modification remains unrelated and unstaged.
