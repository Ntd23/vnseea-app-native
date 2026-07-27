# Generic Nearby Business Search Design

## Goal

Make Nearby map search return Google businesses for arbitrary Vietnamese
queries such as `toc`, `banh sinh nhat`, `sua xe`, and `cay xang`, without
requiring every phrase to be added to a category dictionary.

## Root Cause

The current fast-search path behaves differently depending on whether
`getGoogleCategorySearchQuery()` recognizes the query. Recognized phrases can
run a typed Nearby Search, while unrecognized phrases can fall back to Places
Autocomplete and skip exact Text Search. The App also calls the Places Web
Service directly with an Android build key, so results can differ between APKs.

## Design

- Nearby is always a business-discovery context. It never sends
  `prefer_address`.
- The backend searches the exact user query with Google Text Search for every
  query of at least two characters.
- A recognized category is only an optional type hint. It never replaces the
  original query and never gates whether Google search runs.
- If exact Text Search returns no places, a typed/keyword Nearby Search may be
  used as fallback when coordinates are available.
- Results from Google and VNSEEA Pages continue to be merged and deduplicated
  by their existing identities.
- App business discovery calls the backend. Direct Places Web Service calls
  from the mobile bundle are removed from this flow so build-machine API-key
  differences cannot change search behavior.
- The dedicated address actions remain unchanged and continue to use Places
  Autocomplete, Geocoding, and Place Details.

## Error And Performance Behavior

- Fast typeahead uses bounded backend Google timeouts and returns an empty
  Google list without blocking VNSEEA Page results when Google is unavailable.
- Submitted search uses the same exact-query contract with a longer request
  budget.
- Aborted/stale App requests cannot replace results for a newer query.

## Distance Scope

- Typeahead while the user is typing is limited to a hard radius of 5 km.
- A committed search is limited to a hard radius of 20 km.
- Google `location` and `radius` remain ranking hints, but the backend removes
  coordinate-bearing results outside the requested radius before responding.
- The App applies the same distance filter to Google places and VNSEEA Pages
  so an older backend response or cached result cannot widen the scope.
- Page queries use the requested radius as a database bounding box before
  hydrating rows, reducing work for broad terms such as `siêu thị`.
- Fast Google responses return at most 12 places; committed searches return at
  most 20.

## Verification

- Contract tests cover known and unknown categories.
- Behavior tests assert that exact text is sent for `toc`, `banh sinh nhat`,
  `sua xe`, and `cay xang`.
- Radius tests include near and far results and assert 5 km/20 km boundaries.
- Address tests verify that the dedicated address pipeline is unchanged.
- App tests verify that Nearby no longer sends `prefer_address` or directly
  calls the Places Web Service.
