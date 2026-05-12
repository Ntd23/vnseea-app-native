Description: Screen-by-screen UI ownership plan for building VnseeaRn screens with DDD and MVVM boundaries.

# VnseeaRn Screen UI Plan

## Purpose

This plan keeps UI work practical while preserving the project DDD structure.
A screen can display data from many domains, but it must have exactly one owning domain.

Use this document before asking Lovable/MCP or another agent to generate a screen.
The reference screenshot decides the visual design; this plan decides the DDD owner, file placement, and ViewModel boundary.

## Current Phase

The app is in UI-only phase.

- Build screens in `src/{domain}/presentation/screens/*`.
- Build screen-local components in `src/{domain}/presentation/components/*`.
- Put orchestration and mock/static data in `src/{domain}/application/view-models/*`.
- Do not make real API calls from `infrastructure/`.
- Do not put state orchestration directly inside screen components.

## Ownership Rule

For each screen:

- Owning domain: the domain responsible for the user intent of the screen.
- Dependent domains: domains whose data appears on the screen.
- ViewModel: owned by the owning domain and returns the final UI shape.
- Shared components: only move to `shared-kernel` or `foundation` after at least two domains need the same component.

Example:

| Screen | Owning domain | Dependent domains | ViewModel |
| --- | --- | --- | --- |
| Withdrawal | `withdrawal` | `wallet`, `profile` | `src/withdrawal/application/view-models/useWithdrawalViewModel.ts` |

The Withdrawal screen may show wallet balance and profile verification, but the screen still belongs to `withdrawal`.

## Implementation Workflow

1. Choose one screen from the matrix.
2. Confirm the owning domain.
3. Add or verify the reference screenshot for that screen.
4. Create or update the owning ViewModel with mock data.
5. Build the screen UI from the ViewModel and match the screenshot.
6. Extract only repeated screen-local sections into domain components.
7. Register the route in `src/navigation/constants/routes.ts`.
8. Register the screen in `src/navigation/AppNavigator.tsx`.
9. Run lint or TypeScript checks when available.

## Reference Screenshot Workflow

Store app sample screenshots in:

```txt
docs/reference-screens/
```

Use stable kebab-case names:

```txt
docs/reference-screens/auth-login.png
docs/reference-screens/feed-home.png
docs/reference-screens/profile.png
docs/reference-screens/wallet.png
docs/reference-screens/withdrawal.png
```

When implementing a screen from a screenshot:

- Treat the screenshot as the visual source of truth.
- Match layout, spacing, hierarchy, color, icon placement, card shape, and scroll behavior.
- Keep Vietnamese UI copy unless the screenshot shows a fixed product label.
- Convert screenshot-only sample data into mock data in the owning ViewModel.
- Do not infer API shape from the screenshot.
- Do not create cross-domain imports only because the screenshot shows mixed domain data.
- If the screenshot conflicts with project tokens, keep the screenshot visual intent but use the nearest token class.

## Visual Fidelity Checklist

Use this checklist after building a screen from a reference screenshot:

- [ ] Header height and safe area match the screenshot.
- [ ] Background and surface colors match the screenshot intent.
- [ ] Primary, secondary, and caption text hierarchy is preserved.
- [ ] Main actions and secondary actions are in the same relative positions.
- [ ] Cards, dividers, list rows, and empty space match the screenshot rhythm.
- [ ] Icons use the closest `lucide-react-native` or approved icon source.
- [ ] Long Vietnamese text wraps without clipping.
- [ ] Content scrolls when the screenshot implies more content than one viewport.
- [ ] Loading, empty, and error states keep the same visual language.
- [ ] The ViewModel shape matches the UI sections instead of backend entities.

## Lovable/MCP Prompt Contract

When generating UI externally, use this input shape:

```txt
Build only the React Native UI for this screen from this reference screenshot: {referenceScreenshot}.
Do not create API calls.
Use NativeWind className strings and existing token classes.
UI text must be Vietnamese.
The owning domain is: {domain}.
The screen file path is: src/{domain}/presentation/screens/{Name}Screen.tsx.
The ViewModel file path is: src/{domain}/application/view-models/use{Name}ViewModel.ts.
The screen can display data from these dependent domains: {dependentDomains}.
Return UI that consumes a ViewModel shape instead of owning business state in the screen.
Match the screenshot layout, spacing, hierarchy, colors, and visible states as closely as possible.
```

## Screen Matrix

Status values:

- `todo`: not started.
- `draft`: UI exists but needs polish or route registration.
- `ready`: UI-only implementation is ready.
- `blocked`: waiting for product, backend, or design decision.

| Phase | Screen | Reference | Owning domain | Dependent domains | Route key | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MVP | Login | `docs/reference-screens/auth-login.png` | `auth` | `profile` | `LOGIN` | `draft` | Existing screen under `auth/presentation/screens`. |
| MVP | Register | `docs/reference-screens/auth-register.png` | `auth` | `profile` | `REGISTER` | `draft` | Existing screen under `auth/presentation/screens`. |
| MVP | Forgot Password | `docs/reference-screens/auth-forgot-password.png` | `auth` | none | `FORGOT_PASSWORD` | `draft` | Existing screen under `auth/presentation/screens`. |
| MVP | Feed Home | `docs/reference-screens/feed-home.png` | `feed` | `profile`, `stories`, `pages`, `community` | `FEED` | `todo` | Main social timeline. |
| MVP | Post Detail | `docs/reference-screens/post-detail.png` | `feed` | `profile`, `comments`, `reactions` | `POST_DETAIL` | `todo` | Keep comments UI local until a comments domain exists. |
| MVP | Create Post | `docs/reference-screens/create-post.png` | `feed` | `profile`, `photos`, `community`, `pages` | `CREATE_POST` | `todo` | Composer screen. |
| MVP | Messages Inbox | `docs/reference-screens/messages.png` | `messages` | `profile` | `MESSAGES` | `todo` | Conversation list. |
| MVP | Chat Thread | `docs/reference-screens/chat-thread.png` | `messages` | `profile` | `CHAT_THREAD` | `todo` | Direct message detail. |
| MVP | Notifications | `docs/reference-screens/notifications.png` | `notifications` | `profile`, `feed`, `pages`, `community` | `NOTIFICATIONS` | `todo` | Notification list and filters. |
| MVP | Profile | `docs/reference-screens/profile.png` | `profile` | `feed`, `photos`, `friends` | `PROFILE` | `todo` | User profile overview. |
| MVP | Edit Profile | `docs/reference-screens/edit-profile.png` | `profile` | `settings` | `EDIT_PROFILE` | `todo` | Personal info and avatar. |
| MVP | Settings | `docs/reference-screens/settings.png` | `settings` | `auth`, `profile`, `notifications` | `SETTINGS` | `draft` | Existing screen under `settings/presentation/screens`. |
| MVP | Search | `docs/reference-screens/search.png` | `search` | `profile`, `feed`, `pages`, `community`, `product` | `SEARCH` | `todo` | Global search. |
| MVP | Stories | `docs/reference-screens/stories.png` | `stories` | `profile`, `feed` | `STORIES` | `todo` | Story viewer/list. |
| MVP | Community List | `docs/reference-screens/community.png` | `community` | `profile`, `feed` | `COMMUNITY` | `todo` | Groups/community discovery. |
| MVP | Page List | `docs/reference-screens/pages.png` | `pages` | `profile`, `feed` | `PAGES` | `todo` | Brand/page directory. |
| Phase 2 | Explore | `docs/reference-screens/explore.png` | `explore` | `feed`, `photos`, `reels`, `blogs`, `events` | `EXPLORE` | `todo` | Discovery hub. |
| Phase 2 | Photos | `docs/reference-screens/photos.png` | `photos` | `profile`, `feed` | `PHOTOS` | `todo` | Gallery. |
| Phase 2 | Reels | `docs/reference-screens/reels.png` | `reels` | `profile`, `feed` | `REELS` | `todo` | Short video feed. |
| Phase 2 | Blogs | `docs/reference-screens/blogs.png` | `blogs` | `profile`, `pages` | `BLOGS` | `todo` | Article list. |
| Phase 2 | Blog Detail | `docs/reference-screens/blog-detail.png` | `blogs` | `profile`, `pages` | `BLOG_DETAIL` | `todo` | Article reading screen. |
| Phase 2 | Events | `docs/reference-screens/events.png` | `events` | `profile`, `pages`, `community` | `EVENTS` | `todo` | Event list. |
| Phase 2 | Live | `docs/reference-screens/live.png` | `live` | `profile`, `feed` | `LIVE` | `todo` | Live stream list. |
| Phase 2 | Movies | `docs/reference-screens/movies.png` | `movies` | `profile` | `MOVIES` | `todo` | Movie browsing. |
| Phase 2 | Games | `docs/reference-screens/games.png` | `games` | `profile` | `GAMES` | `todo` | Game center. |
| Phase 2 | Popular | `docs/reference-screens/popular.png` | `popular` | `feed`, `profile`, `pages` | `POPULAR` | `todo` | Trending content. |
| Phase 2 | Memories | `docs/reference-screens/memories.png` | `memories` | `profile`, `feed`, `photos` | `MEMORIES` | `todo` | Past content. |
| Phase 2 | Saved | `docs/reference-screens/saved.png` | `saved` | `feed`, `blogs`, `product`, `events` | `SAVED` | `todo` | Saved items. |
| Phase 2 | Poke | `docs/reference-screens/poke.png` | `poke` | `profile` | `POKE` | `todo` | Social poke screen. |
| Phase 3 | Product Catalog | `docs/reference-screens/products.png` | `product` | `market`, `profile` | `PRODUCTS` | `todo` | Product list/detail entry. |
| Phase 3 | Orders | `docs/reference-screens/orders.png` | `orders` | `product`, `checkout`, `profile` | `ORDERS` | `todo` | Order history. |
| Phase 3 | Checkout | `docs/reference-screens/checkout.png` | `checkout` | `product`, `orders`, `wallet`, `profile` | `CHECKOUT` | `todo` | Purchase flow. |
| Phase 3 | Market | `docs/reference-screens/market.png` | `market` | `product`, `profile` | `MARKET` | `todo` | Marketplace home. |
| Phase 3 | Funding | `docs/reference-screens/funding.png` | `funding` | `wallet`, `profile` | `FUNDING` | `todo` | Funding/campaign flow. |
| Phase 3 | Wallet | `docs/reference-screens/wallet.png` | `wallet` | `profile`, `orders`, `withdrawal` | `WALLET` | `todo` | Balance and transactions. |
| Phase 3 | Withdrawal | `docs/reference-screens/withdrawal.png` | `withdrawal` | `wallet`, `profile` | `WITHDRAWAL` | `todo` | Withdraw funds. |
| Phase 3 | Go Pro | `docs/reference-screens/go-pro.png` | `go-pro` | `checkout`, `wallet`, `profile` | `GO_PRO` | `todo` | Subscription upsell. |
| Phase 3 | Jobs | `docs/reference-screens/jobs.png` | `jobs` | `profile`, `pages` | `JOBS` | `todo` | Job board. |
| Phase 3 | Forum | `docs/reference-screens/forum.png` | `forum` | `profile`, `community` | `FORUM` | `todo` | Discussion forum. |
| Phase 3 | Directory | `docs/reference-screens/directory.png` | `directory` | `profile`, `pages`, `jobs` | `DIRECTORY` | `todo` | Directory listing. |

## Screen Build Checklist

For every screen:

- [ ] English description line at the top of any new Markdown doc.
- [ ] Reference screenshot exists or the missing screenshot is called out.
- [ ] Screen file is inside the owning domain.
- [ ] ViewModel owns mock/static UI data.
- [ ] Screen consumes ViewModel instead of hardcoding all state inline.
- [ ] Touchable elements have `activeOpacity`.
- [ ] Small icon buttons have `hitSlop`.
- [ ] Main screen uses `SafeAreaView` from `react-native-safe-area-context`.
- [ ] NativeWind and token classes are used instead of `StyleSheet.create`.
- [ ] UI text is Vietnamese.
- [ ] Route key is added to `src/navigation/constants/routes.ts`.
- [ ] Screen is registered in `src/navigation/AppNavigator.tsx`.

## Next Recommended Order

1. Stabilize existing auth screens and remove/ignore legacy `src/screens/*`.
2. Build MVP shell screens: Feed, Profile, Messages, Notifications, Search.
3. Build Phase 3 money flow screens together: Wallet, Withdrawal, Orders, Checkout, Go Pro.
4. Build discovery/content surfaces: Explore, Reels, Photos, Blogs, Events.
5. Build remaining utility domains.
