# Description: Documents the user bounded context and its API bridge ownership.

# User

`user` owns reusable API access and domain mapping for authenticated user data, public profile data, suggestions, nearby users, and profile updates.

## Owns

- current user loading
- user profile loading by `user_id`
- user suggestions
- nearby users
- profile update payload mapping
- raw user record mapping into `UserProfile`

## Does Not Own

- auth token persistence
- login/register/logout flows
- profile screen layout
- settings screen layout
- follow action business rules

Use `auth` for session creation and `community` for follow/friend/group actions.
