# Flow Review Checklist

- Confirm the correct layer owns the behavior.
- Confirm SSR redirect does not allow a guest page to flash first.
- Confirm backend auth session remains the source of truth.
- Confirm loading, empty, and error states are explicit.
- Confirm the custom domain behavior matches direct Nuxt dev.
- Confirm the fix does not introduce UI masking hacks for proxy or asset issues.
