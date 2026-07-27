# Checkout Manual Address Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Checkout accept a manually typed delivery address without requiring a Google suggestion.

**Architecture:** Add an optional manual-selection boundary to `AddressSearchContent`; Checkout opts into it and returns to its existing form with the trimmed text. All other consumers remain unchanged.

**Tech Stack:** React Native, TypeScript, Jest, react-test-renderer.

## Global Constraints

- Keep Google Autocomplete, Geocoding fallback, Details, and attribution unchanged.
- Do not require coordinates for a manually entered delivery address.
- Do not change backend contracts or other address forms.
- Do not run full iOS or Android builds.

---

### Task 1: Manual Address Selection

**Files:**
- Create: `src/shared-kernel/presentation/components/__tests__/addressSearchManualEntry.test.tsx`
- Modify: `src/shared-kernel/presentation/components/AddressSearchContent.tsx`
- Modify: `src/checkout/presentation/screens/CheckoutScreen.tsx`
- Modify: `src/checkout/presentation/screens/__tests__/checkoutAddressManagement.test.js`

**Interfaces:**
- Consumes: the current query owned by `AddressSearchContent`.
- Produces: `onUseTypedAddress?: (address: string) => void`.

- [x] **Step 1: Write the failing component test**

Render `AddressSearchContent` with a padded initial query and
`onUseTypedAddress`. Press `use-typed-address-button` and assert the callback
receives the trimmed query while Place Details is not called.

- [x] **Step 2: Verify RED**

```bash
./node_modules/.bin/jest \
  src/shared-kernel/presentation/components/__tests__/addressSearchManualEntry.test.tsx \
  --runInBand
```

Expected: fail because `onUseTypedAddress` and the button do not exist.

- [x] **Step 3: Implement the optional action**

Add the optional callback, localized copy, two-character visibility rule, exact
trimmed-address preview, accessibility label, and test ID.

- [x] **Step 4: Wire Checkout**

Store the trimmed address, dismiss the keyboard, and close the internal search
state. Do not invoke `handleResolvedAddress`.

- [x] **Step 5: Verify**

```bash
./node_modules/.bin/jest \
  src/shared-kernel/presentation/components/__tests__/addressSearchManualEntry.test.tsx \
  src/shared-kernel/presentation/components/__tests__/addressSearchContent.test.js \
  src/checkout/presentation/screens/__tests__/checkoutAddressManagement.test.js \
  --runInBand
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint \
  src/shared-kernel/presentation/components/AddressSearchContent.tsx \
  src/shared-kernel/presentation/components/__tests__/addressSearchManualEntry.test.tsx \
  src/checkout/presentation/screens/CheckoutScreen.tsx \
  src/checkout/presentation/screens/__tests__/checkoutAddressManagement.test.js
git diff --check
```

Expected: targeted tests and TypeScript pass; ESLint has no new errors.
