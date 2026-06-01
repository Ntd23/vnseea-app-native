English description: API connection roadmap for Nuxt bounded contexts, including backend endpoint candidates and do/don't task markers.

# API Context Connection Roadmap

Source references:

- Backend API documentation: `https://demo.wowonder.com/api/v2/Documentation.html`
- Project route registry: `client/src/shared-kernel/application/constants/route-registry.ts`
- Backend API skill: `client/ai/skills/backend-api-reference/`
- Frontend API skill: `client/ai/skills/frontend-api-integration/`

## Context Assignment Marker Convention

- `[ ] do` means the context is not done yet and can be assigned for implementation.
- `[x] done` means the context/task has been implemented at the current expected scope.
- `[~] partial` means the context has some API/UI bridge work, but the coverage is incomplete.
- `[ ] don't` means do not assign or implement that scope yet because it is blocked, duplicated, or intentionally out of scope.

Use these markers in this roadmap for task assignment. Do not use them inside `TEST_CASE.md`; testcase files should only describe how to verify behavior.

## Global Implementation Rules

| Type | Marker | Rule |
| --- | --- | --- |
| Do | `[ ] do` | Add or update Nuxt `server/api/*` bridge routes for frontend data access. |
| Do | `[ ] do` | Keep frontend flow as `presentation -> view-model/application -> repository -> /_api/* -> backend`. |
| Do | `[ ] do` | Reuse `backend-api-client.ts`, `backend-api-response.ts`, `nuxt-api-client.ts`, and `route-registry.ts`. |
| Do | `[ ] do` | Normalize backend payloads before presentation components consume them. |
| Don't | `[ ] don't` | Do not call raw PHP/backend URLs directly from `.vue` components. |
| Don't | `[ ] don't` | Do not add mock fallback when a backend API fails unless the user explicitly asks. |
| Don't | `[ ] don't` | Do not change PHP behavior unless the required backend route does not exist or local behavior is incorrect. |
| Don't | `[ ] don't` | Do not use vendor-specific naming in active Nuxt code; use neutral `backend*` naming. |

## Priority Order

1. Auth/session and navigation bootstrap.
2. Feed/post/comment shared data.
3. Messages and chat widget.
4. Profile and community.
5. Product, checkout, orders, wallet.
6. Search, notifications, discovery.
7. Content modules: blogs, events, jobs, funding, forum, games, movies, live.

## Three-Developer Assignment

| Developer | Owned contexts | Shared-file rule |
| --- | --- | --- |
| Dev 1 | `auth`, `navigation`, `shared-kernel`, `forms`, `foundation`, `search`, `settings` | Owns route registry, auth route policy, HTTP clients, shell navigation, and middleware. |
| Dev 2 | `feed`, `profile`, `messages`, `community`, `pages`, `explore`, `popular`, `saved`, `reels`, `watch`, `photos`, `lightbox`, `memories`, `poke` | Must not edit Dev 1 shared files directly. |
| Dev 3 | `product`, `checkout`, `orders`, `wallet`, `withdrawal`, `blogs`, `events`, `jobs`, `funding`, `games`, `go-pro`, `forum`, `directory`, `live`, `movies` | Must not edit Dev 1 shared files directly. |

Detailed conflict boundaries live in `client/doc/dev-ownership-plan.md`.

## Context Backlog

| Context | Status | Frontend routes/features | Nuxt API to add/update | Backend endpoint candidates | Do | Don't | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `auth` | `[~] partial` | `/welcome`, `/register`, `/forgot-password`, reset/confirm routes, `/logout` | `auth/*` | `/api/auth`, `/api/create-account`, `/api/set-browser-cookie`, `/api/delete-access-token`, `/api/send-reset-password-email`, local `get-current-user.php` | `[ ] do` finish SMS/reset/account-confirm coverage and remove remaining mock fallback | `[ ] don't` create frontend-only auth session | PHP cookie is source of truth. |
| `navigation` | `[~] partial` | header, user menu, mobile menu, badges | `auth/me`, `navigation/general`, `navigation/search` | `/api/get-general-data`, `/api/search`, `/api/get-user-data` | `[x] done` load current user and top-level counts; `[ ] do` verify role mapping for user/admin/moderator; `[ ] do` connect dropdown lists/chat data later | `[ ] don't` show mock user, mock wallet, mock role; `[ ] don't` show Admin area to moderator unless PHP rule changes | Dev 1 owns shared shell. |
| `feed` | `[ ] not started` | `/home`, publisher, post list | `feed/posts`, `feed/post-actions`, `feed/publisher` | `/get_news_feed`, `/api/get-post-data`, `/api/post-actions`, local `posts.php`, local `new_post.php` | `[ ] do` connect timeline posts, pagination, create post, react/save/comment entry points | `[ ] don't` use HTML feed as final JSON contract without wrapper normalization | Verify local PHP endpoints because public doc only documents part of feed. |
| `forms` | `[x] done` | shared fields and validators | none or shared adapters | N/A | `[x] done` keep submit state generic and API-neutral | `[ ] don't` add backend calls inside generic form components | Shared UI only. |
| `foundation` | `[x] done` | tokens, cards, empty/loading states | none | N/A | `[x] done` keep loading/error components reusable for API states | `[ ] don't` add API logic here | No domain API. |
| `messages` | `[ ] not started` | `/messages`, chat widget, floating chat | `messages/conversations`, `messages/:id`, `messages/send`, `messages/delete`, `messages/typing` | `/api/send-message`, `/api/delete-conversation`, `/api/set-chat-typing-status`, `/api/change-chat-color`, local `get_chats.php`, local `get_user_messages.php` | `[ ] do` connect conversation list, message history, send text/file, typing, delete conversation | `[ ] don't` fake chat messages or online status | Needs local endpoint verification beyond public doc. |
| `profile` | `[~] partial` | `/@username`, profile header, tabs | `profile/:username`, `profile/update`, `profile/follow`, `profile/block` | `/api/get-user-data`, `/api/update-user-data`, `/api/follow-user`, `/api/block-user`, `/api/get-user-albums` | `[ ] do` map user fields, tabs, follow/block, avatar/cover update | `[ ] don't` hardcode profile owner or relationship state | Existing profile bridge should be audited before extending. |
| `community` | `[ ] not started` | `/groups`, `/pages`, `/g/:name`, `/p/:name`, create/settings | `community/groups`, `community/pages`, `community/group/:id`, `community/page/:id` | `/api/get-community`, `/api/get-group-data`, `/api/get-page-data`, `/api/join-group`, `/api/like-page`, `/api/create-group`, `/api/create-page`, `/api/update-group-data`, `/api/update-page-data` | `[ ] do` connect list/detail/create/settings and join/like actions | `[ ] don't` merge group and page payloads without explicit mapper | Split group/page mappers. |
| `pages` | `[ ] not started` | page-specific bounded context if separate from `community` | `pages/*` | `/api/get-page-data`, `/api/create-page`, `/api/update-page-data`, `/api/like-page` | `[ ] do` keep page business logic here if separated from community | `[ ] don't` duplicate same API bridge in both contexts | Choose one ownership boundary before implementation. |
| `product` | `[ ] not started` | `/products`, `/my-products`, `/new-product`, `/edit-product/:id` | `products`, `products/:id`, `products/create`, `products/update`, `products/delete` | `/api/get-products`, `/api/create-product`, local `edit-product.php`, local `market.php`, `/api/post-actions` | `[ ] do` connect list/filter/create/edit/delete with upload support | `[ ] don't` submit files through JSON-only helper | File upload requires multipart bridge. |
| `checkout` | `[x] done` | `/checkout` | `checkout/snapshot`, `checkout/address`, `checkout/submit` | local `address.php`, `checkout.php`, payment PHP routes | `[ ] do` replace placeholder bridge with backend checkout/payment behavior | `[ ] don't` assume public API doc covers checkout fully | Existing Nuxt routes exist but need real backend audit. |
| `orders` | `[x] done` | `/orders`, `/order/:id`, `/customer_order/:id` | `orders/*`, `customer-orders/*` | local `market.php` | `[ ] do` connect buyer/seller order state and status actions | `[ ] don't` invent order statuses not returned by backend | Existing routes exist; verify payloads. |
| `wallet` | `[ ] not started` | `/wallet` | `wallet/summary`, `wallet/transactions`, `wallet/topup`, `wallet/transfer` | local `wallet.php`, payment PHP routes | `[ ] do` connect balance and transaction history | `[ ] don't` show fake wallet amount in menu or page | Needs backend local audit. |
| `withdrawal` | `[ ] not started` | `/withdrawal` | `withdrawal/summary`, `withdrawal/request`, `withdrawal/history` | local withdrawal/payment endpoints | `[ ] do` connect request form and history | `[ ] don't` submit withdrawal without server-side validation | Needs role/config checks. |
| `settings` | `[~] partial` | `/setting`, `/setting/:page` | `settings/me`, `settings/update`, `settings/delete-account`, `settings/blocked-users` | `/api/update-user-data`, `/api/get-blocked-users`, `/api/delete-user` | `[x] done` bootstrap current user fields; `[ ] do` connect page-specific save flows | `[ ] don't` store settings only client-side | Very large context; split by settings page. |
| `blogs` | `[ ] not started` | `/blogs`, `/create-blog`, `/read-blog/:slug` | `blogs`, `blogs/:id`, `blogs/create` | `/api/get-articles`, local `blogs.php`, local `get-blog-by-id.php` | `[ ] do` connect list/detail/create and comments/reactions if present | `[ ] don't` treat raw HTML as trusted without sanitization decision | Verify local blog endpoints. |
| `search` | `[~] partial` | `/search`, header search | `search` | `/api/search` | `[x] done` connect users/pages/groups search; `[ ] do` add post search when feed endpoint is ready | `[ ] don't` duplicate separate search implementations for header/page | Shared search service should feed both. |
| `events` | `[ ] not started` | `/events`, `/events/create-event`, `/events/:id` | `events`, `events/:id`, `events/create`, `events/actions` | `/api/get-events`, `/api/create-event`, `/api/go-to-event`, `/api/interest-event`, local event detail endpoint | `[ ] do` connect list/create/detail and going/interested actions | `[ ] don't` mark detail complete until event-by-id behavior is verified | Public doc covers list/actions/create. |
| `funding` | `[ ] not started` | `/funding`, `/create_funding`, `/show_fund/:id` | `funding/*` | local `funding.php`, wallet/payment routes | `[ ] do` audit local PHP and wrap as JSON | `[ ] don't` infer crowdfunding API from public doc | Not covered by public API doc. |
| `jobs` | `[ ] not started` | `/jobs` | `jobs`, `jobs/apply`, `jobs/create` | local `job.php` | `[ ] do` connect list/filter/apply/create if enabled | `[ ] don't` build LinkedIn-mode-only paths without config check | Site mode may control availability. |
| `games` | `[ ] not started` | `/games` | `games` | local `games.php` | `[ ] do` connect game list and play links | `[ ] don't` add score/save API unless backend has it | Likely simple list first. |
| `go-pro` | `[ ] not started` | `/go-pro` | `pro/packages`, `pro/subscribe` | local pro/payment routes | `[ ] do` connect packages and payment entry | `[ ] don't` hardcode plan prices | Prices/config from backend. |
| `forum` | `[ ] not started` | `/forum` | `forum/*` | local forum endpoints/PHP routes | `[ ] do` audit local forum routes before API design | `[ ] don't` invent thread schema | Public API doc does not cover forum. |
| `directory` | `[ ] not started` | `/directory` | `directory/*` | `/api/search`, `/api/get-community`, `/api/get-products`, `/api/get-events`, local directory routes | `[ ] do` compose from existing APIs where possible | `[ ] don't` create one giant directory endpoint unless backend requires it | Directory is aggregator. |
| `live` | `[ ] not started` | `/live` | `live/*` | local `live.php`, call/livekit PHP routes | `[ ] do` audit streaming provider and token flow | `[ ] don't` expose provider secrets to client | Security-sensitive. |
| `poke` | `[ ] not started` | `/poke` | `poke/*` | local `poke.php` | `[ ] do` connect list and poke-back action | `[ ] don't` fake poke counts | Local PHP only. |
| `photos` | `[ ] not started` | `/photos`, profile photos | `photos/*` | `/api/get-user-data`, `/api/get-user-albums`, feed/post media endpoints | `[ ] do` connect albums/photo list through profile/feed data | `[ ] don't` duplicate lightbox data model | Coordinate with `lightbox`. |
| `watch` | `[ ] not started` | `/watch` | `watch/videos`, `watch/:id` | local `posts.php` filters, `/api/get-post-data` | `[ ] do` connect video feed and post detail/actions | `[ ] don't` use movies API for user videos unless backend confirms | Movies and watch are different. |
| `reels` | `[ ] not started` | `/reels` | `reels` | local `posts.php` with reel filter, `/api/post-actions` | `[ ] do` connect reel feed and actions | `[ ] don't` treat reels as movies | Needs local filter params. |
| `popular` | `[ ] not started` | `/popular` | `popular/posts` | local `posts.php`, local most-liked/most-watched endpoints | `[ ] do` verify exact local endpoint for popular posts | `[ ] don't` use static sample posts | |
| `saved` | `[ ] not started` | `/saved-posts` | `saved/posts`, `saved/toggle` | local `posts.php` saved filter, `/api/post-actions` | `[ ] do` connect saved list and unsave | `[ ] don't` create separate saved store before API mapping | |
| `movies` | `[ ] not started` | `/movies` | `movies`, `movies/:id` | `/api/get-movies` | `[ ] do` connect list/filter/detail from documented movie API | `[ ] don't` mix with watch videos | |
| `memories` | `[ ] not started` | `/memories` | `memories` | local memories/posts PHP behavior | `[ ] do` audit local endpoint before bridge | `[ ] don't` fake date-based memories | |
| `explore` | `[ ] not started` | `/explore`, `/hashtag/:tag`, discovery | `explore/*`, `hashtags/:tag` | `/api/get-general-data`, `/api/get-user-suggestions`, local `fetch-recommended.php`, local `posts.php` hashtag filters | `[ ] do` connect recommendations, hashtags, trending | `[ ] don't` hardcode trending tags/users | |
| `lightbox` | `[ ] not started` | image modal, share modal | `lightbox/post`, `lightbox/comments`, `lightbox/share` | `/api/get-post-data`, `/api/post-actions`, comments local endpoint, local `new_post.php` | `[ ] do` share post/comment/action API with feed | `[ ] don't` fork post/comment behavior | Shared component context. |

## Backend Endpoint Gaps To Confirm Before Assigning

| Gap | Marker | Contexts affected | Action |
| --- | --- | --- | --- |
| Full JSON feed endpoint | `[ ] do` | `feed`, `watch`, `reels`, `popular`, `saved`, `profile`, `community` | Audit local `posts.php` and existing WoWonder endpoint behavior; wrap in Nuxt route. |
| Comments API shape | `[ ] do` | `feed`, `blogs`, `lightbox`, `watch`, `reels` | Verify local `comments.php` contract and normalize. |
| Checkout/order payloads | `[ ] do` | `checkout`, `orders`, `wallet`, `withdrawal` | Audit local market/payment PHP routes. |
| Jobs/funding/forum/live APIs | `[ ] do` | `jobs`, `funding`, `forum`, `live` | Verify whether local JSON endpoints exist before writing PHP. |
| Switch account | `[ ] don't` | `navigation`, `auth` | Do not implement until session strategy is explicitly decided. |

## Suggested Task Prompt Template

```text
Use backend-api-reference and frontend-api-integration.
Connect context <context-name> to backend API.
Scope:
- routes: <routes>
- Nuxt API routes to add/update: <routes>
- backend endpoint candidates: <backend endpoints>
Do:
- <allowed tasks>
Don't:
- <forbidden tasks>
Update TEST_CASE.md using frontend-testcase after implementation.
```
