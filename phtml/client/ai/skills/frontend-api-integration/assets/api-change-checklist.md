# API Change Checklist

- Confirm the UI still calls `/_api/*`, not raw PHP endpoints.
- Confirm the page or component does not own backend payload mapping.
- Confirm the repository contract lives in `domain/repositories/*`.
- Confirm the API repository lives in `infrastructure/repositories/*`.
- Confirm the Nuxt bridge handler exists under `server/api/*`.
- Confirm backend session behavior is reused when auth is involved.
- Confirm route strings come from the shared registry where applicable.
