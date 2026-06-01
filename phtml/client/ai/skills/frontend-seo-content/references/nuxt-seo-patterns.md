# Nuxt SEO Patterns

Use these patterns for route-level SEO in this project.

## Preferred Placement

- Route wrapper in `app/pages/*` when the route shape or canonical is route-specific.
- Top-level presentation page when the metadata depends on already-normalized page data.

## Preferred APIs

- `useSeoMeta`
- `useHead`
- `@nuxtjs/seo` features already installed in this project

## Avoid

- SEO logic inside small reusable child components
- conflicting titles from multiple nested components
- indexable metadata on private flows by default
- custom SEO plumbing that duplicates `@nuxtjs/seo` behavior without a strong reason

## Practical Sequence

1. determine route visibility
2. determine canonical
3. set title
4. set description
5. set OG metadata if the route is public
