# Description: Documents the shared foundation context for reusable domain primitives and mappers.

# Foundation

`foundation` contains cross-context primitives and pure mapping helpers that are reused by feature contexts.

## Owns

- shared domain primitives
- raw API value resolution
- media URL normalization
- pagination payload mapping
- user, page, group, post, and media summary mappers

## Does Not Own

- API clients
- session storage
- screen state
- React Native UI components
- feature-specific business rules

## Verification

Foundation pure helpers are covered by:

```txt
src/foundation/__tests__/foundation.test.ts
```

Use `shared-kernel` for runtime infrastructure such as env, API client, and auth session storage.
