# Description: Documents the profile presentation context and its dependency on the user API context.

# Profile

`profile` owns profile screen orchestration and presentation-specific profile data needs.

## Owns

- profile screen state
- current-user profile loading for the logged-in user
- public profile loading by `userId`
- profile presentation labels and fallback UI states

## Does Not Own

- raw user API endpoint mapping
- auth token persistence
- follow/unfollow action rules
- settings profile card state

Use `user` for reusable user API/domain mapping and `community` for follow actions.
