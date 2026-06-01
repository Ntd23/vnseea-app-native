# Middleware And Redirects

Use this file when route access and SSR behavior are involved.

## Naming

- route middleware:
  - `guest`
  - `authenticated.global`
- server middleware:
  - `guest-only`

## Redirect Rules

- If an authenticated user must never see a guest page, prefer SSR redirect.
- If a route decision depends on browser-only state, use client-side middleware carefully and document why.
- Do not let pages visibly render first and then redirect unless the product explicitly accepts that tradeoff.

## Backend Session

- Use backend cookie or session truth for auth-related redirects.
- Do not build route access around a parallel frontend-only auth state unless the requirement changes.

## Debugging

If direct Nuxt dev behaves correctly but the custom domain does not, inspect proxy and asset delivery before rewriting route logic.
