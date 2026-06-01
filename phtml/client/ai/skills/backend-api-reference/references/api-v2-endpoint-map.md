English description: Condensed backend API v2 endpoint map for connecting Nuxt bounded contexts.

# API V2 Endpoint Map

This is a condensed map from the backend API documentation and local migration needs. Always verify local PHP files before implementation.

## Auth And Session

| Feature | Backend endpoint |
| --- | --- |
| Site settings | `/api/get-site-settings` |
| Login | `/api/auth` |
| Social login | `/api/social-login` |
| Register | `/api/create-account` |
| Browser session bootstrap | `/api/set-browser-cookie` with `access_token` in POST body |
| Delete access token | `/api/delete-access-token?access_token=...` |
| Password reset email | `/api/send-reset-password-email` |
| Current user data | `/api/get-user-data` or local `get-current-user.php` wrapper |
| Update user/settings | `/api/update-user-data` |
| Delete user | `/api/delete-user` |

## Feed, Posts, Stories

| Feature | Backend endpoint |
| --- | --- |
| HTML feed fallback | `/get_news_feed` |
| Post data | `/api/get-post-data` |
| Post edit/delete/comment/react/save | `/api/post-actions` |
| Create story | `/api/create-story` |
| Delete story | `/api/delete-story` |
| Get stories | `/api/get-stories` |
| Activities | `/api/get-activities` |

## Social Graph And Profile

| Feature | Backend endpoint |
| --- | --- |
| User data | `/api/get-user-data` |
| Many users | `/api/get-many-users-data` |
| User albums | `/api/get-user-albums` |
| Follow/unfollow | `/api/follow-user` |
| Follow request action | `/api/follow-request-action` |
| Block/unblock | `/api/block-user` |
| Nearby users | `/api/get-nearby-users` |
| Blocked users | `/api/get-blocked-users` |
| User suggestions | `/api/get-user-suggestions` |

## Community

| Feature | Backend endpoint |
| --- | --- |
| Group data | `/api/get-group-data` |
| Page data | `/api/get-page-data` |
| Join/leave group | `/api/join-group` |
| Like/unlike page | `/api/like-page` |
| Update group | `/api/update-group-data` |
| Update page | `/api/update-page-data` |
| Create group | `/api/create-group` |
| Create page | `/api/create-page` |
| Owned groups/pages | `/api/get-community` |

## Marketplace, Checkout, Orders

| Feature | Backend endpoint |
| --- | --- |
| Create product | `/api/create-product` |
| Product list/details | `/api/get-products` |
| Checkout/address/payment | local PHP marketplace/payment routes, verify locally |
| Orders | local `market.php` behavior, verify locally |

## Events, Blogs, Movies

| Feature | Backend endpoint |
| --- | --- |
| Events list | `/api/get-events` |
| Going/not going | `/api/go-to-event` |
| Interested/not interested | `/api/interest-event` |
| Create event | `/api/create-event` |
| Articles/blogs | `/api/get-articles` |
| Movies | `/api/get-movies` |

## Messages

| Feature | Backend endpoint |
| --- | --- |
| Send message | `/api/send-message` |
| Delete conversation | `/api/delete-conversation` |
| Typing status | `/api/set-chat-typing-status` |
| Change chat color | `/api/change-chat-color` |

## Search And Discovery

| Feature | Backend endpoint |
| --- | --- |
| Search users/pages/groups | `/api/search` |
| General data/counts/notifications | `/api/get-general-data` |

## Known Gaps To Verify Locally

- Full feed list may use local `posts.php`/`get_news_feed` behavior rather than only documented API.
- Checkout and orders require local PHP verification because public API documentation is not enough.
- Jobs, funding, forum, games, wallet, withdrawal, live, poke, and directory often rely on local PHP endpoints not fully covered by the public API doc.
