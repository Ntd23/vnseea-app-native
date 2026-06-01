# Routing Rules

Use this file for route design decisions in this project.

## Core Route Model

- Nuxt file-based routing is the default.
- `app/pages/*` owns public URL mapping.
- Real page implementation lives in `src/<context>/presentation/pages/*`.

## Wrapper Responsibilities

Route wrappers may:

- choose layout
- normalize params
- normalize query
- apply route-level metadata
- render the actual presentation page

Route wrappers should not:

- own business logic
- own backend HTTP logic
- become large feature components

## Prefer Existing Nuxt Capabilities

Use the installed Nuxt stack before writing custom routing helpers:

- Nuxt file-based routing
- route middleware
- Nitro server middleware
- `@nuxtjs/i18n` when locale-aware routing matters
- `@nuxtjs/seo` for route-level SEO metadata
