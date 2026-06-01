# Route Change Checklist

- Confirm the route belongs in `app/pages/*`.
- Confirm the wrapper is thin.
- Confirm the real page stays in `src/<context>/presentation/pages/*`.
- Confirm shared route strings were updated in the registry when appropriate.
- Confirm middleware naming follows project convention.
- Confirm SSR redirect behavior is handled at the correct layer.
- Confirm route-level SEO is near the route entry, not buried in child components.
