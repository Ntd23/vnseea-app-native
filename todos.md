# Description: API bridge task backlog for the Vnseea React Native bounded contexts.

# API Bridge TODOs

## Ground Rules

- Do `api-foundation` first. All context tasks depend on the shared env/config/client layer.
- Keep each task inside its owning `src/<context>/**` folder whenever possible.
- Do not edit navigation files unless a task truly needs a new route.
- Do not edit `SettingsScreen` while API bridge tasks are running; shortcut routing is already wired.
- Do not call raw PHP endpoints from presentation screens. Use repository/application layers.
- Backend source is `phtml/api/v2/endpoints/*`.
- Most authenticated backend calls need `access_token`; POST payloads need `server_key`.
- Use `react-native-config` env values through `src/shared-kernel/infrastructure/config/env.ts`.

## Environment And Config

- [x] Install `react-native-config`.
- [x] Add Android dotenv Gradle hook in `android/app/build.gradle`.
- [x] Add `.env.example`.
- [x] Ignore local `.env` files.
- [x] Add typed `react-native-config.d.ts`.
- [x] Add `backendConfig`.
- [x] Remove direct `process.env` usage from shared API client.
- [x] Create real local `.env` from `.env.example`.
- [x] Set `API_BASE_URL` to the deployed API URL, for example `https://demo.vnseea.vn/api/v2`.
- [x] Set `WEB_BASE_URL` to the deployed web root, for example `https://demo.vnseea.vn`.
- [x] Set `SERVER_KEY` from the PHP backend config.
- [ ] Verify `POST <API_BASE_URL>/get-site-settings` with `server_key` from the device network.

## API Foundation

- [x] Add `BackendApiClient` helpers for GET, POST, and multipart upload.
- [x] Add auth token storage interface backed by MMKV.
- [x] Inject `access_token` into authenticated requests.
- [x] Inject `server_key` into POST and multipart requests.
- [x] Normalize backend errors where `api_status` is not a success status.
- [ ] Add pagination helper for `limit`, `offset`, `after_post_id`, or endpoint-specific cursors.
- [ ] Add response mapper helpers for common backend user, image, post, page, group, event shapes.
- [ ] Add API smoke test docs for Android physical device over LAN.

## Context Backlog

### 1. auth

- Endpoints: `auth`, `create-account`, `send-reset-password-email`, `delete-access-token`, `get-current-user`, `social-login`, `two-factor`, `active_account_sms`.
- Done: login, register, forgot password, logout, current user hydration contract, token persistence.
- Do not: duplicate token logic inside screens.
- Depends on: API Foundation.

### 2. feed

- Endpoints: `posts`, `new_post`, `get-post-data`, `post-actions`, `comments`, `get-reactions`, `hide_post`.
- Do: replace mock posts with backend feed, reactions, comments, create post entry point.
- Do not: add new navigation.
- Depends on: auth.

### 3. profile

- Endpoints: `get-user-data`, `update-user-data`, `reset_avatar`, `get-user-albums`, `get-user-stories`, `get-friends`.
- Do: hydrate profile header, stats, posts, photos summary.
- Do not: mutate global auth user without shared session update.
- Depends on: auth.

### 4. settings

- Endpoints: `get-site-settings`, `update-user-data`, `sessions`, `verification`, `update_two_factor`.
- Do: load settings/user preferences and account toggles.
- Do not: move feature shortcut routing here.
- Depends on: auth.

### 5. search

- Endpoints: `search`, `recent_search`, `search_for_posts`, `get-nearby-users`.
- Do: users/pages/groups/search results and filters.
- Do not: hardcode filter data in presentation after bridge.
- Depends on: auth.

### 6. notifications

- Endpoints: `notifications`, `stop_notify`.
- Do: map announcement/notification feed and mark-read actions.
- Do not: change bottom tab navigation.
- Depends on: auth.

### 7. messages

- Endpoints: `get_chats`, `get_user_messages`, `send-message`, `delete_message`, `delete-conversation`, `fav_message`, `forward_message`, `react_message`, `read_chats`, `pin_message`.
- Do: conversations, user messages, group tab, send flow, message actions.
- Do not: couple chat state to feed.
- Depends on: auth.

### 8. calls

- Endpoints: `agora`, `call.php`, `call_livekit.php`, `call_group_livekit.php`.
- Do: prepare call token/session API wrapper.
- Do not: implement native call UI until backend token path is verified.
- Depends on: auth, messages.

### 9. stories

- Endpoints: `get-stories`, `create-story`, `get_story_by_id`, `get_story_views`, `delete-story`, `react_story`.
- Do: story list, create story, story detail/views.
- Do not: store large media in JS memory unnecessarily.
- Depends on: auth, upload helper.

### 10. reels

- Endpoints: `posts`, `new_post`, `most_watched`, `listening`.
- Do: video/reel feed from backend video posts.
- Do not: hand-roll media cache.
- Depends on: auth, feed.

### 11. photos

- Endpoints: `get-user-albums`, `albums`, `get-user-data`, upload via post/media endpoints.
- Do: my photos, albums, create album, album image list.
- Do not: use tracked binary assets for remote data.
- Depends on: auth, upload helper.

### 12. videos

- Endpoints: `posts`, `most_watched`, `get-user-data`.
- Do: my videos list and empty/loading states.
- Do not: duplicate reels repository.
- Depends on: auth, media mapper.

### 13. blogs

- Endpoints: `blogs`, `get-articles`, `get-blog-by-id`, `create-blog`.
- Do: article list, category filter, detail, create blog later.
- Do not: merge blog data with feed post models.
- Depends on: auth optional.

### 14. boosted

- Endpoints: `get_boost`, `get-promoted-post`, `boost_page`, `ads`.
- Do: boosted list, campaign stats, promoted post/page mapping.
- Do not: implement payment side effects in this context.
- Depends on: auth, wallet/checkout for paid actions.

### 15. events

- Endpoints: `events`, `get-events`, `get_event_by_id`, `create-event`, `go-to-event`, `interest-event`.
- Do: events list, event detail if needed, create event wizard submit.
- Do not: change bottom sheet routing.
- Depends on: auth.

### 16. community

- Endpoints: `groups`, `get-community`, `get-my-groups`, `get-group-data`, `get_group_members`, `create-group`, `update-group-data`, `join-group`, `delete_group`.
- Do: explore groups, group detail, create group, members.
- Do not: mix page APIs into group repositories.
- Depends on: auth.

### 17. pages

- Endpoints: `create-page`, `get-my-pages`, `get-page-data`, `update-page-data`, `delete_page`, `page_add`, `page_reviews`, `page_verification`.
- Do: create page submit and page data bridge.
- Do not: edit Settings grid.
- Depends on: auth, upload helper.

### 18. market

- Endpoints: `market`, `get-products`, `create-product`, `edit-product`.
- Do: product list, create product wizard submit, product images upload.
- Do not: implement checkout here.
- Depends on: auth, upload helper.

### 19. product

- Endpoints: `get-products`, `create-product`, `edit-product`, `comments`.
- Do: product detail/domain logic if separate from market.
- Do not: duplicate market list fetch.
- Depends on: market.

### 20. jobs

- Endpoints: `job`, `jobs-meta`.
- Do: jobs list, job detail, metadata filters.
- Do not: hardcode salary/location once metadata bridge exists.
- Depends on: auth optional.

### 21. movies

- Endpoints: `get-movies`, `movies_comments`, `most_watched`.
- Do: movie list, category filter, comments later.
- Do not: track movie poster assets.
- Depends on: auth optional.

### 22. funding

- Endpoints: `funding`, `wallet`, payment endpoints as needed.
- Do: campaign list, campaign detail, support action planning.
- Do not: process payments in presentation screens.
- Depends on: auth, wallet/checkout.

### 23. wallet

- Endpoints: `wallet`, `wallet-overview`, `wallet-recipient-search`, `withdrawal-overview`, `withdraw`, `bank`, `get_referrers`.
- Do: earnings, affiliates, points, wallet overview, transfer/search.
- Do not: split balance state across contexts.
- Depends on: auth.

### 24. withdrawal

- Endpoints: `withdrawal-overview`, `withdraw`, `bank`.
- Do: fix existing `StyleSheet.absoluteFillObject` type issue, then wire overview and submit.
- Do not: share bank payload code ad hoc; use wallet mapper.
- Depends on: wallet.

### 25. checkout

- Endpoints: `checkout`, `stripe`, `paypal-like gateway files`, `paystack`, `razorpay`, `coinpayments`, `sepay`, `aamarpay`, `cashfree`, `ngenius`, `paysera`, `yoomoney`.
- Do: centralize payment provider request/response mapping.
- Do not: put provider logic in funding/go-pro/product contexts.
- Depends on: auth, wallet.

### 26. orders

- Endpoints: `checkout`, `get-products`, `market`.
- Do: order history and purchase state if backend supports it.
- Do not: couple to product creation flow.
- Depends on: checkout, market.

### 27. go-pro

- Endpoints: `go-pro`, `upgrade`, `subscriptions`, `refund_pro`.
- Do: plans, subscription status, upgrade flow.
- Do not: duplicate checkout provider code.
- Depends on: auth, checkout.

### 28. games

- Endpoints: `games`.
- Do: games list and launch metadata.
- Do not: add game runtime logic until endpoint shape is mapped.
- Depends on: auth optional.

### 29. forum

- Endpoints: `forum`, `comments`, `vote_up`.
- Do: forum list/thread/comment bridge.
- Do not: reuse blog models for forum threads.
- Depends on: auth.

### 30. directory

- Endpoints: `directory`, `get-nearby-users`, `get-many-users-data`.
- Do: directory listing and filters.
- Do not: duplicate search repository.
- Depends on: auth optional.

### 31. live

- Endpoints: `live`, `broadcast`, `get_live_friends`.
- Do: live list and broadcast metadata.
- Do not: start native streaming work until token requirements are known.
- Depends on: auth.

### 32. memories

- Endpoints: `get_memories`.
- Do: memories list and empty states.
- Do not: duplicate feed fetch if endpoint returns posts.
- Depends on: auth.

### 33. offers

- Endpoints: `offer`.
- Do: offers list and offer detail if endpoint supports it.
- Do not: wire checkout unless offer purchase API is verified.
- Depends on: auth optional.

### 34. poke

- Endpoints: `poke`.
- Do: poke list/send action.
- Do not: mix with follow requests.
- Depends on: auth.

### 35. popular

- Endpoints: `most_liked`, `most_watched`, `popular` if present in legacy PHP.
- Do: trending posts/media aggregation.
- Do not: duplicate hashtag tab logic.
- Depends on: feed/media mappers.

### 36. foundation

- Endpoints: `get-general-data`, `get-site-settings`, `common_things`, `check_type`, `is-active`.
- Do: bootstrap data, feature flags, shared lookup lists.
- Do not: create UI screens here.
- Depends on: API Foundation.

## Conflict Plan

- First PR: env/config/API foundation only.
- Second PR: auth/session only.
- Then split read-only contexts by folder ownership.
- Leave create/write/payment flows until read-only mappings are stable.
- Only one task at a time should edit `src/shared-kernel/infrastructure/api/client.ts`.
- Only one task at a time should edit navigation files.
