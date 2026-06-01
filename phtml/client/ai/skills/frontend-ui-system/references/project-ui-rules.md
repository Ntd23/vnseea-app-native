# Project UI Rules

Use this file as the project-specific UI baseline for frontend work.

## Source of Truth

- Primary style guide: `client/doc/ui_style_guide.md`
- Feature and route inventory: `client/doc/page_feature_audit.md`
- Current migration state: `client/doc/refactor-progress.md`

## Core Principles

- Keep the existing design language coherent across all pages.
- Reuse shared patterns from navigation, auth, feed, messages, profile, and product.
- Preserve responsive behavior by default.
- Treat unstyled reload behavior on the custom domain as an asset or proxy problem first, not a signal to restyle the page.
- Prefer the installed Nuxt UI stack before inventing parallel helpers or presentation utilities.

## Installed Nuxt Frontend Stack

Prefer these existing packages when they fit the task:

- `@nuxt/ui`
- `@nuxt/icon`
- `@nuxt/image`
- `@nuxt/fonts`
- `@nuxtjs/i18n`
- `@vueuse/nuxt`
- `@pinia/nuxt`

Only bypass them when the existing project pattern clearly requires a custom wrapper or the module does not solve the actual problem cleanly.

## Tokens and Visual Direction

- Use the existing blue brand accent and soft card surfaces from the style guide.
- Use soft borders instead of black borders.
- Use restrained shadows.
- Avoid `font-black`, overly wide tracking, and unnecessary uppercase text.
- Keep cards, inputs, and primary buttons rounded consistently.

## Allowed Edits

- Layout grids
- Spacing and wrappers
- Typography tuning
- Shared card and form treatments
- Icon treatment, hover states, and active states
- Route-level page composition fixes

## Avoid

- Rebuilding a page with a new visual language
- Styling each context independently
- Fixing domain-specific proxy problems with page-only hacks
- Moving business logic into presentation to make the page "work"
