# Context Refactor Checklist

- Confirm the context has a clear owner and scope.
- Confirm route wrappers stay in `app/pages/*` and remain thin.
- Confirm real runtime moved into `src/<context>/*`.
- Confirm presentation, application, domain, and infrastructure responsibilities are separated as far as the current step requires.
- Confirm no new cross-context internal imports were introduced.
- Confirm shared-kernel was not used as a dumping ground.
- Confirm legacy files were removed only after the new runtime was active.
- Confirm the refactor preserved SSR, SEO, and the current UI runtime.
