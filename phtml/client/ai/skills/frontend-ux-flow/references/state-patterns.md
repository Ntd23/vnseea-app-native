# State Patterns

Use these patterns for frontend UX consistency.

## Loading

- Show loading states near the action or region they block.
- Avoid full-page blockers unless the whole route truly cannot render without the data.
- Prefer deterministic loading states over optimistic fake completion.

## Empty

- Empty states should explain what is missing and what the user can do next.
- Keep empty-state copy calm and direct.

## Error

- Surface field-level validation close to the field.
- Surface submit-level failures close to the form action.
- Keep technical error details out of the main user-facing copy unless the task is explicitly a debug surface.

## Success

- Do not leave the user on a dead-end success state if a redirect or next step is expected.
- Redirects after successful auth or form completion should reflect the backend source of truth.
