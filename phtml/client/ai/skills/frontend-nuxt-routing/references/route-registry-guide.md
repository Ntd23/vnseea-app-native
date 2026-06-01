# Route Registry Guide

This project already centralizes many route strings in:

- `client/src/shared-kernel/application/constants/route-registry.ts`

## Use It For

- navigation links
- route generation from cards, menus, sidebars, and CTAs
- frontend API route strings through `apiRoutes`

## Keep In Mind

- `appRoutes` is for user-facing routes
- `apiRoutes` is for frontend bridge endpoints

## Update Rules

- Add a new constant when a route is reused or appears in multiple places.
- Prefer updating the registry over scattering route literals across components.
- Keep segment encoding helpers centralized.
