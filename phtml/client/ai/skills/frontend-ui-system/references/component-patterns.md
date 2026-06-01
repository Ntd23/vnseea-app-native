# Component Patterns

Use these patterns when the task touches shared UI.

## Navigation

- Shared header, sidebar, and widget components should use the same icon shell and active-state treatment.
- Inactive icons should feel soft and neutral.
- Active states may use the brand blue accent.
- Navigation labels should stay readable and avoid aggressive uppercase styling.

## Auth Shells

- Auth pages should share the same split-shell rhythm and form control system.
- Keep the left hero and right form panel aligned with the established auth flow.
- Avoid duplicating shell wrappers at both layout and page level.

## Forms

- Labels should sit close to inputs.
- Inputs should share radius, border color, placeholder tone, and vertical spacing.
- Primary submit buttons should remain visually dominant.
- Loading, error, and helper states should be close to the field or action they affect.

## Feed and Content Cards

- Post cards, comment cards, widget cards, and preview cards should share soft border and shadow behavior.
- Keep media presentation stable before tweaking copy or metadata placement.
- Prefer updating shared presentation components before patching page-level wrappers.

## Shared Repair Order

When many pages drift at once, fix in this order:

1. navigation
2. foundation styles
3. auth shells and forms
4. feed and comment surfaces
5. page-specific composition
