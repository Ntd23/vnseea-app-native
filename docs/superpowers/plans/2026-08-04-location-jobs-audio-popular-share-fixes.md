# Location, Jobs, Audio, Popular Posts And Share Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct five user-facing failures in location access, job creation, iOS release recording, Popular Posts interactions, and Samsung Post Detail sharing.

**Architecture:** Preserve existing feature boundaries while moving shared behavior to canonical helpers and renderers. Use typed location failures, a tolerant canonical job API contract, an app-owned iOS recorder, standard Feed post models/cards for Popular Posts, and native Android navigation gestures around Post Detail.

**Tech Stack:** React Native 0.85, TypeScript, Jest, Swift/AVFoundation, PHP/WoWonder, React Navigation, RNGH.

## Global Constraints

- Modify `demo.vnseea` and App mirror `phtml` only for the job API.
- The other four fixes are App-only.
- Keep Android recording and iOS audio playback unchanged.
- Do not run full iOS or Android builds unless requested.
- Do not create commits in this implementation turn.

---

### Task 1: Typed Location Access Recovery

**Files:**
- Modify: `src/shared-kernel/application/utils/currentLocation.ts`
- Create: `src/shared-kernel/application/utils/locationAccessRecovery.ts`
- Test: `src/shared-kernel/application/utils/__tests__/currentLocation.test.ts`
- Test: `src/shared-kernel/application/utils/__tests__/locationAccessRecovery.test.ts`
- Modify location-consuming screens discovered by `rg getCurrentDeviceLocation`.

**Interfaces:**
- Produces `LocationAccessErrorCode`, `LocationAccessError`, and `presentLocationAccessRecovery(error)`.

- [ ] Write failing tests preserving `permission_denied`, `provider_unavailable`, timeout, and unavailable native error codes.
- [ ] Run the focused tests and confirm failures are caused by missing typed behavior.
- [ ] Implement typed error normalization and platform-specific Settings actions.
- [ ] Integrate the helper into Nearby, Marketplace, Page location, and Chat location flows without blocking manual search.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Stable Job Creation Contract

**Files:**
- Modify: `src/jobs/infrastructure/repositories/ApiJobsRepository.ts`
- Modify: `src/jobs/application/view-models/useCreateJobViewModel.ts`
- Modify: `src/jobs/presentation/screens/CreateJobScreen.tsx`
- Test: job repository and create-screen contract tests.
- Modify: `/Users/apple/Desktop/src_duong/demo.vnseea/api/v2/endpoints/job.php`
- Modify: `phtml/api/v2/endpoints/job.php`
- Test: backend PHP contract test for job creation.

**Interfaces:**
- Job creation accepts an optional image, stores selected `lat/lng`, and returns stable `job_id`, `post_id`, and canonical `data`.

- [ ] Write failing App tests for preserving API errors, mapping nested job responses, and sending selected coordinates.
- [ ] Write a failing backend contract test proving a page without a cover can create a job.
- [ ] Run focused App/backend tests and confirm expected failures.
- [ ] Make image optional with a deterministic fallback, validate upload failures, wrap job/post creation atomically, and normalize the response.
- [ ] Mirror the backend change into App `phtml`, update App mapping/form state, and remove duplicate page loading.
- [ ] Run PHP lint and focused App/backend tests.

### Task 3: Release-Safe iOS Voice Recorder

**Files:**
- Create: `ios/VNSEEA/VnseeaAudioRecorder.swift`
- Create: `ios/VNSEEA/VnseeaAudioRecorder.m`
- Modify: `ios/VNSEEA.xcodeproj/project.pbxproj`
- Create: `src/shared-kernel/infrastructure/audio/iosAudioRecorder.ts`
- Modify: `src/shared-kernel/application/hooks/useAudioRecorder.ts`
- Modify: `src/shared-kernel/application/utils/microphonePermission.ts`
- Test: recorder and source-contract tests.

**Interfaces:**
- Native module methods: `startRecording(): Promise<string>`, `stopRecording(): Promise<{uri:string,durationMs:number}>`, `cancelRecording(): Promise<void>`, and `requestPermission(): Promise<boolean>`.

- [ ] Write failing tests asserting iOS uses the native recorder while Android keeps Nitro Sound.
- [ ] Run focused tests and confirm the native module contract is missing.
- [ ] Implement a main-thread `AVAudioRecorder` AAC/M4A lifecycle with explicit permission, session activation/restoration, file validation, and stable error codes.
- [ ] Route both Chat and comment recording through the shared hook and expose actionable errors instead of swallowing native details.
- [ ] Run focused Jest tests and static Xcode project/source checks.

### Task 4: Canonical Popular Post Cards

**Files:**
- Modify: `src/popular/domain/types/popular.types.ts`
- Modify: `src/popular/infrastructure/repositories/ApiPopularRepository.ts`
- Modify: `src/popular/application/view-models/usePopularViewModel.ts`
- Rewrite: `src/popular/presentation/screens/PopularScreen.tsx`
- Test: Popular repository and screen source/render tests.

**Interfaces:**
- Popular repository returns canonical `FeedPost[]` through `mapFeedPost`.

- [ ] Write failing tests proving Popular Posts use canonical Feed mapping/cards and expose reaction, comment, share, menu, media, and profile handlers.
- [ ] Run tests and confirm the custom inert card fails them.
- [ ] Replace the duplicate card with the standard Feed card dispatch and existing Feed action sheets/navigation.
- [ ] Run focused Popular and Feed card regression tests.

### Task 5: Samsung Post Detail Share

**Files:**
- Modify: `src/feed/presentation/screens/PostDetailScreen.tsx`
- Test: `src/feed/presentation/screens/__tests__/postDetailShareAndroid.test.js`

**Interfaces:**
- Android uses native-stack/hardware Back without the full-screen custom swipe recognizer; iOS retains the custom edge gesture.

- [ ] Write a failing source/render regression test for Android gesture isolation and share-sheet blocking.
- [ ] Run it and confirm the current full-screen gesture setup fails.
- [ ] Restrict custom swipe-back to iOS, include share visibility in gesture blocking, and keep a stable share callback independent of post snapshots.
- [ ] Run the focused test.
- [ ] Launch the App on `R5GYA1X33ZY`, open a shareable Post Detail, tap Share, and confirm the sheet appears and closes repeatedly.

### Task 6: Verification

- [ ] Run all new targeted Jest suites in one process.
- [ ] Run `tsc --noEmit` and ESLint only for changed App files.
- [ ] Run PHP lint and backend contract tests for both job endpoint copies.
- [ ] Run `git diff --check` in both repositories and review unrelated changes.
- [ ] Report any verification not run, especially TestFlight-only validation.
