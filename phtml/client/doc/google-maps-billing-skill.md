English description: Local guidance for using Nuxt Scripts Google Maps with controlled billing and permissions.

# Google Maps Billing Skill

Use this note when adding Google Maps, Places, geocoding, or static map previews in the Nuxt frontend.

## Rules

- Prefer `@nuxt/scripts` Google Maps registry instead of adding another map loader.
- Keep the API key in `NUXT_PUBLIC_SCRIPTS_GOOGLE_MAPS_API_KEY` and configure `NUXT_SCRIPTS_PROXY_SECRET` for Nuxt Scripts proxy signing.
- Do not pass `api-key` directly to map components unless there is a deliberate reason, because Nuxt Scripts docs warn this exposes the key in client-side requests.
- Load interactive map or Places behavior only after user intent, such as focus, click, or map interaction.
- For address fields, request only the needed Place fields: formatted address, geometry, and place id.
- Debounce or gate user input; never call Places or geocoding on every render.
- Use static map placeholders or stored coordinates for previews when the user does not need an interactive map.
- Store normalized backend fields as `address`, `lat`, `lng`, and `place_id`/`page_place_id`; do not keep location only in UI state.

## Source Notes

- Nuxt Scripts Google Maps registry supports `apiKey`, `libraries`, `language`, `region`, and API version options.
- The registry enables proxy routes for static maps and geocoding, and the docs recommend proxy usage over passing an API key directly.
- The Google Maps script docs link Billing & Permissions from the Google Maps registry page; apply these local rules before adding any new Google Maps calls.
