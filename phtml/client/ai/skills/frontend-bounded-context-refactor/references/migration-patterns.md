# Migration Patterns

Use these patterns during transition work.

## Thin Route Pattern

Keep:

- route file in `app/pages/*`

Move real page implementation into:

- `src/<context>/presentation/pages/*`

## Transitional Application Pattern

When a full store or use-case split is too heavy for the current step:

- keep orchestration in `application/composables/*`
- make the composable act like the view-model
- move heavier business rules downward later

## Sample References

- Checkout sample:
  - `client/doc/refactor-sample-checkout.md`
- Community sample:
  - `client/doc/refactor-sample-community.md`

## Safe Cleanup Sequence

1. Add or confirm the new `src/<context>` runtime.
2. Point route wrappers or bridge composables to the new runtime.
3. Verify imports now resolve through the new path.
4. Remove legacy files only when nothing still imports them.

## Nuxt-Aware Refactor Rule

Preserve existing Nuxt-native capabilities during refactor:

- file-based routing
- route middleware
- Nitro server routes
- installed modules such as `@nuxt/ui`, `@nuxt/icon`, `@nuxtjs/i18n`, `@nuxtjs/seo`, `@pinia/nuxt`, and `@vueuse/nuxt`

Do not rebuild these as part of a structural refactor unless the user explicitly asks for it.
