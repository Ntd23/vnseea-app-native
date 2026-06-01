# Route Audit Seed

Use this file to choose the right UI surface quickly.

## Priority Routes

- `/welcome`
- `/register`
- `/forgot-password`
- `/home`
- `/@:username`
- `/messages`
- `/products`
- `/checkout`
- `/orders`
- `/search`

## Shared Route Families

- Auth: `welcome`, `register`, `forgot-password`
- Feed: `home`, `popular`, `saved-posts`, `watch`, `reels`, `photos`, `movies`, `memories`
- Social identity: `@:username`, `groups`, `pages`, `g/[name]`, `p/[name]`
- Commerce: `products`, `checkout`, `orders`, `wallet`, `withdrawal`
- Discovery and content: `search`, `blogs`, `events`, `funding`, `jobs`, `directory`

## Context Hints

- `navigation`, `foundation`, `forms`, and `feed` are high-leverage UI contexts.
- Page wrappers live under `client/app/pages/*`.
- Real page UI usually lives under `client/src/<context>/presentation/pages/*`.

## Page Audit Hint

If you need missing features or expected behaviors, use:

- `client/doc/page_feature_audit.md`
