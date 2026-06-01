English description: Source and usage rules for the backend API documentation used by Nuxt integration agents.

# Backend API Documentation Source

Primary reference:

- `https://demo.wowonder.com/api/v2/Documentation.html`

Use the source as endpoint documentation only. Keep project code naming neutral as `backend API`, not vendor-specific.

## Important Source Rules

- Most authenticated API calls require `access_token` in the request URL query.
- API calls require the site `server_key` in POST data.
- The API is intended for the site owner building the app, not arbitrary public clients.
- Login uses `/api/auth` and returns `access_token`.
- Browser session bootstrap uses `/api/set-browser-cookie` with `access_token` in the POST body.
- Logout token deletion uses `/api/delete-access-token?access_token=...`.
- Error responses use:

```json
{
  "api_status": "400",
  "errors": {
    "error_id": 0,
    "error_text": "..."
  }
}
```

## Project-Specific Interpretation

- The browser frontend never calls these endpoints directly.
- Nuxt `server/api/*` owns access token, server key, cookie forwarding, and backend error normalization.
- Backend PHP remains source of truth for user session and permissions.
- If local backend behavior differs from the public documentation, prefer local backend behavior and document the difference.
