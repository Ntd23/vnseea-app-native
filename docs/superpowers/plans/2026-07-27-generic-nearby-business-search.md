# Generic Nearby Business Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Nearby return businesses for arbitrary Vietnamese text while preserving the separate address-search pipeline.

**Architecture:** App Nearby requests always go through the backend business action with the raw query. The backend runs exact Text Search first and uses category/Nearby only as an optional fallback, while existing VNSEEA Page merging remains unchanged.

**Tech Stack:** React Native, TypeScript, Jest, PHP 7-compatible endpoint code, Google Places Web Service.

## Global Constraints

- Do not change the dedicated address actions.
- Do not add a finite dictionary as the primary search mechanism.
- Do not expose or depend on a Places Web Service key in the mobile search flow.
- Keep the existing abort, stale-response, Page merge, and map result behavior.
- Do not modify the unrelated iOS scheme worktree change.

---

### Task 1: Protect The Business Search Contract

**Files:**
- Create: `/Users/apple/Desktop/src_duong/demo.vnseea/tests/business-search-behavior.php`
- Modify: `src/user/presentation/screens/__tests__/mapDiscoveryPerformance.test.js`

**Interfaces:**
- Consumes: `Wo_ApiMapDiscoveryAutocomplete()` and the App `getPlacePredictions()` repository method.
- Produces: regression coverage for raw-query Text Search and backend-only App discovery.

- [x] **Step 1: Write failing tests**

```php
$queries = array('toc', 'banh sinh nhat', 'sua xe', 'cay xang');
// For each query, invoke Wo_ApiMapDiscoveryAutocomplete() with a mocked
// Google boundary and assert that place/textsearch/json receives the exact
// original query.
```

```js
expect(repositorySource).not.toContain(
  'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
);
expect(repositorySource).not.toContain('prefer_address:');
expect(repositorySource).toContain("search_mode: 'business'");
```

- [x] **Step 2: Verify the tests fail for the expected old behavior**

```bash
php tests/business-search-behavior.php
./node_modules/.bin/jest \
  src/user/presentation/screens/__tests__/mapDiscoveryPerformance.test.js \
  --runInBand
```

Expected: PHP fails because known categories replace raw text and App test
fails because direct Nearby/prefer-address code is still present.

### Task 2: Make Backend Business Search Generic

**Files:**
- Modify: `/Users/apple/Desktop/src_duong/demo.vnseea/api/v2/endpoints/map_discovery.php`
- Modify: `phtml/api/v2/endpoints/map_discovery.php`

**Interfaces:**
- Consumes: POST `query`, optional `category`, coordinates, radius, `fast`, and `global_search`.
- Produces: the existing `predictions` response with exact-query Google places.

- [x] **Step 1: Implement exact Text Search**

```php
$text_search_query = array(
    'query' => $input,
    'language' => $language,
    'region' => $country
);
```

Run Text Search for every business query. Add the validated category as an
optional `type` hint, but never replace `$input`.

- [x] **Step 2: Keep Nearby as a bounded fallback**

If Text Search returns no results and coordinates exist, call Nearby Search
with the raw query in `keyword` and optional validated `type`. Merge by
`place_id`.

- [x] **Step 3: Run backend tests**

```bash
php tests/business-search-behavior.php
MAP_DISCOVERY_ENDPOINT=../vnseea-app-native/phtml/api/v2/endpoints/map_discovery.php \
  php tests/business-search-behavior.php
php tests/address-search-contract.php
php tests/address-search-behavior.php
```

Expected: all pass for canonical and mirror endpoints.

### Task 3: Route App Nearby Search Through Backend

**Files:**
- Modify: `src/user/infrastructure/repositories/ApiUserRepository.ts`
- Modify: `src/user/presentation/screens/__tests__/mapDiscoveryPerformance.test.js`

**Interfaces:**
- Consumes: `MapPlacePredictionsInput`.
- Produces: unchanged `Promise<MapPlacePrediction[]>`.

- [x] **Step 1: Remove direct Places Web Service discovery**

Delete the direct Nearby request and use the existing authenticated
`map_discovery` request for all business predictions.

- [x] **Step 2: Send an explicit business contract**

```ts
{
  type: 'place_autocomplete',
  search_mode: 'business',
  query: trimmedQuery,
  category: input.category,
  origin_lat: input.lat,
  origin_lng: input.lng,
  radius: input.radius,
  fast: input.fast ? 1 : undefined,
  global_search: input.globalSearch ? 1 : undefined,
}
```

- [x] **Step 3: Run App tests**

```bash
./node_modules/.bin/jest \
  src/user/application/utils/__tests__/mapSearchCategory.test.ts \
  src/user/presentation/screens/__tests__/mapDiscoveryPerformance.test.js \
  src/user/presentation/screens/__tests__/nearbyMapSearchInteraction.test.js \
  --runInBand
```

Expected: all pass and no direct Places Web Service URL remains in Nearby.

### Task 4: Verify The Patch

**Files:**
- Verify all files changed by Tasks 1-3.

- [x] **Step 1: Run static checks**

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint \
  src/user/infrastructure/repositories/ApiUserRepository.ts \
  src/user/application/utils/mapSearchCategory.ts
php -l /Users/apple/Desktop/src_duong/demo.vnseea/api/v2/endpoints/map_discovery.php
php -l phtml/api/v2/endpoints/map_discovery.php
git diff --check
```

- [x] **Step 2: Inspect both repositories**

Confirm only the intended map-search files, tests, and documentation changed,
and preserve the unrelated iOS scheme modification.

### Task 5: Enforce Nearby Distance Scope

**Files:**
- Create: `src/user/application/utils/mapSearchRadius.ts`
- Create: `src/user/application/utils/__tests__/mapSearchRadius.test.ts`
- Modify: `src/user/presentation/screens/NearbyUsersScreen.tsx`
- Modify: `src/user/infrastructure/repositories/ApiUserRepository.ts`
- Modify: `/Users/apple/Desktop/src_duong/demo.vnseea/api/v2/endpoints/map_discovery.php`
- Modify: `phtml/api/v2/endpoints/map_discovery.php`
- Modify: `/Users/apple/Desktop/src_duong/demo.vnseea/tests/business-search-behavior.php`

**Interfaces:**
- Produces `MAP_TYPEAHEAD_SEARCH_RADIUS_METERS = 5000`.
- Produces `MAP_COMMITTED_SEARCH_RADIUS_METERS = 20000`.
- Produces `filterDistanceScopedResults()` for App-side compatibility filtering.

- [x] **Step 1: Add failing radius tests**

Assert that App constants are 5 km/20 km, near results remain, far results are
removed, and backend responses do not include coordinate-bearing places beyond
the requested radius.

- [x] **Step 2: Verify the tests fail**

Run the targeted Jest radius tests and backend behavior test. Expected: the
current 20 km/50 km constants and bias-only backend behavior fail.

- [x] **Step 3: Implement strict filtering**

Apply the requested radius to App Page/Google results and both backend copies.
Use a database bounding box for Page candidates before exact distance filtering.

- [x] **Step 4: Limit response size**

Return at most 12 Google places for fast typeahead and 20 for committed search.

- [x] **Step 5: Verify**

Run targeted Jest, TypeScript, ESLint, PHP lint/contract tests, and
`git diff --check` without running a full mobile build.
