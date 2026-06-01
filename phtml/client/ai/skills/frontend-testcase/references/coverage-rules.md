English description: Coverage rules for frontend context testcase documents in this Nuxt project.

# Coverage Rules

## Required For Every Context

- Smoke route render on `127.0.0.1:3000`.
- Smoke route render on the Laragon custom domain when proxy behavior matters.
- Hard reload behavior.
- Client navigation behavior.
- Loading, empty, and backend-error states.
- Mobile and desktop layout checks.
- Mock-data audit if the context previously used mock composables or repositories.

## Auth Context

- Login success redirects through backend cookie/session flow and ends at `/home`.
- Logout clears PHP-backed session and ends at `/welcome`.
- Guest routes reject authenticated users server-side and client-side.
- Protected routes reject guests before private UI is usable.
- Register, forgot password, reset password, account confirmation, and SMS confirmation cover backend success and backend error payloads.
- Current user bootstrap returns real user identity and role, not hardcoded menu data.

## API Integration Contexts

- UI calls frontend `/_api/*` routes only.
- Nuxt `server/api/*` bridges to backend PHP.
- Repository contracts remain stable.
- View-model maps loading, success, empty, and error states explicitly.
- Backend payload shape is normalized before presentation components consume it.

## Routing Contexts

- Route names and paths come from `route-registry.ts` where the repo already centralizes them.
- Route middleware names follow the project convention:
  - `guest`
  - `authenticated.global`
  - `guest-only`
- Dynamic routes cover valid, missing, and malformed params.

## UI Contexts

- Check against `client/doc/ui_style_guide.md`.
- Icons follow the global icon rule before marking UI as passed.
- Components do not show fake user data, fake wallet balances, or mock role labels in production flows.
- Responsive checks must include header, sidebar, mobile drawer, cards, forms, and modals when present.

## SEO And Public Pages

- Public pages include title, description, canonical, and Open Graph expectations.
- Private pages should not be treated as indexable SEO surfaces by default.
- Locale behavior must be checked when route content is user-visible in more than one language.
