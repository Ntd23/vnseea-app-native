# Runtime Debug Notes

Use this file when UX differs between direct Nuxt dev and the Laragon custom domain.

## Compare First

Always compare:

- `http://127.0.0.1:3000`
- the custom domain route served through nginx

If direct Nuxt dev is correct and the custom domain is not, suspect proxy or asset delivery before changing UI code.

## Check These Requests

- `/_nuxt/*.css`
- `/_nuxt/*.js`
- `/api/_nuxt_icon/*`
- `/@vite/*`
- `/@fs/*`
- `/@id/*`

## Common Symptoms

- Raw HTML before styles apply
- Icons missing only on the custom domain
- Redirect works but the wrong page flashes first
- Behavior differs after hard reload

## Nuxt Stack Checks

When debugging frontend runtime issues, remember that this project already ships with:

- `@nuxt/icon`
- `@nuxt/image`
- `@nuxt/ui`
- `@nuxtjs/i18n`
- `@nuxtjs/seo`
- `@vueuse/nuxt`

Before adding a custom workaround, verify whether the failure is really in app code or in how these installed Nuxt modules are being served through the proxy.
