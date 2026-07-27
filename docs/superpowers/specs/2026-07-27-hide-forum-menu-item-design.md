# Hide Forum Menu Item Design

## Goal

Hide the Forum entry from the profile menu opened by the App Bar and from
Settings without removing Forum navigation support.

## Design

- Comment the Forum `MenuRow` in `HeaderProfileDrawer`.
- Comment the Forum entries in both Settings feature catalogs so legacy and
  current Settings layouts cannot surface the item.
- Keep `ROUTES.FORUM`, route registration, notification navigation, and
  existing press handlers intact. Existing deep links and forum notifications
  can therefore continue opening Forum.
- Remove icon imports only when they become unused after the visible entries
  are commented.

## Verification

- The App Bar profile menu does not display Forum in Vietnamese or English.
- Settings does not receive Forum from either feature catalog.
- Forum route registration and notification fallback remain unchanged.
- TypeScript, targeted tests, ESLint, and `git diff --check` pass.

