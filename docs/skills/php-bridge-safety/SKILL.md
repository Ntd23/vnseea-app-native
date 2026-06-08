<!-- Description: Defines safe rules for React Native API bridge work without changing web-facing PHP behavior. -->

# PHP Bridge Safety

Use this skill before editing API bridge code that touches the bundled `phtml` backend.

## Rule

Do not change existing PHP functions, XHR handlers, or web-facing behavior that the web app already uses unless the user explicitly asks for a web behavior change.

## Safe Approach

- Prefer React Native fixes in `src/*` when the bug is caused by client state, navigation, polling, timers, or UI.
- If mobile needs backend behavior, add a separate v2 endpoint action or a separate helper function dedicated to mobile bridge behavior.
- Keep existing web functions backward-compatible. New helpers may call existing functions, but must not alter their return shape or side effects.
- Do not repurpose existing database fields used by web flows unless the new behavior is proven compatible with web.
- If a timestamp, status, or payload differs between web and mobile, add a mobile-specific response field in the v2 endpoint instead of changing shared table semantics.

## Required Checks

- Before editing PHP, identify whether the file is used by web routes, XHR, admin, or shared includes.
- For any PHP bridge change, run `php -l` on the edited file.
- Explain whether the change is isolated to mobile v2 bridge behavior or can affect web.
- If isolation is not clear, stop and ask before editing PHP.

## Preferred Files

- Mobile bridge endpoint: `phtml/api/v2/endpoints/<context>.php`
- Mobile-only helper: add a new `Wo_Api...` function inside the v2 endpoint or a new dedicated include file.
- React Native client fix: `src/<context>/...`

## Avoid

- Editing shared WoWonder functions in `phtml/assets/includes/functions_*.php` for mobile-only issues.
- Editing `phtml/requests.php` or `phtml/xhr/*` unless adding a new isolated route/action.
- Changing existing call lifecycle fields such as `time`, `active`, `status`, or `declined` in a way that changes web behavior.
