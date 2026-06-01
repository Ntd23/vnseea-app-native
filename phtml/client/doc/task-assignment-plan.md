# Task Assignment Plan For 3 Developers

Tài liệu này dùng để chia task refactor `client` cho `3` người theo cách giảm conflict tối đa.

Nguyên tắc chính:
- Chia theo `bounded context`, không chia theo file lẻ.
- Mỗi context chỉ có `1 owner` trong cùng một phase.
- Không sửa shared files ngoài scope nếu chưa được giao rõ.
- `1 PR = 1 context chính`.

## Current baseline

- Runtime chính vẫn đang đi qua:
  - `app/pages/*`
  - `app/components/*`
  - `app/composables/*`
- Context đã đi trước:
  - `product`
  - `community`
- Context có sample nhưng chưa migrate runtime thật:
  - `checkout`

## Team split

### Developer 1

- Primary scope:
  - `checkout`
  - `orders`
- Secondary scope sau khi xong primary:
  - `wallet`

### Developer 2

- Primary scope:
  - `messages`
  - `search`
- Secondary scope sau khi xong primary:
  - `blogs`

### Developer 3

- Primary scope:
  - `community` cleanup sâu
  - `product` cleanup sâu nếu cần
- Secondary scope sau khi xong primary:
  - `jobs`

## Full legacy module coverage

Mục này chốt ownership cho toàn bộ `35` module còn trong `app/components/*`.
Không có nghĩa là phải migrate tất cả ngay trong phase hiện tại, nhưng mỗi module đều đã có `owner` để tránh conflict khi phát sinh task.

### Developer 1: transaction, account, settings

- `[P1]` `checkout`
- `[P2]` `orders`
- `[P3]` `wallet`
- `[P3]` `withdrawal`
- `[P3]` `auth`
- `[P3]` `settings`
- `[P3]` `profile`

### Developer 2: messaging, discovery, content

- `[P1]` `messages`
- `[P2]` `search`
- `[P3]` `blogs`
- `[P3]` `explore`
- `[P3]` `feed`
- `[P3]` `popular`
- `[P3]` `saved`
- `[P3]` `reels`
- `[P3]` `watch`
- `[P3]` `photos`
- `[P3]` `lightbox`
- `[P3]` `movies`
- `[P3]` `memories`

### Developer 3: community, marketplace, platform support

- `[P1]` `community`
- `[P1]` `product`
- `[P2]` `jobs`
- `[P3]` `directory`
- `[P3]` `events`
- `[P3]` `forum`
- `[P3]` `foundation`
- `[P3]` `funding`
- `[P3]` `games`
- `[P3]` `go-pro`
- `[P3]` `live`
- `[P3]` `navigation`
- `[P3]` `pages`
- `[P3]` `poke`
- `[P3]` `forms`

### Coverage check

- Tổng số module đã được gán owner: `35/35`
- `P1` = đang làm ngay trong phase hiện tại
- `P2` = làm tiếp sau khi xong `P1`
- `P3` = đã có owner nhưng đang defer, chưa mở đồng thời nếu không có lý do rõ ràng

## Why this split

- `checkout + orders + wallet` gần nhau về flow giao dịch và state.
- `messages + search + blogs` ít đụng trực tiếp với payment/order.
- `community` và `product` đã có migration dở dang, nên để `1` người xử lý tiếp để tránh đụng phần đang chuyển tiếp.

## Ownership rules

### Developer 1 ownership

- Được sửa:
  - `client/src/checkout/**`
  - `client/app/components/checkout/**`
  - `client/app/components/pages/Checkout*.vue`
  - `client/app/pages/checkout.vue`
  - `client/src/orders/**`
  - `client/app/components/orders/**`
  - `client/app/components/pages/*Order*.vue`
  - `client/app/pages/orders.vue`
  - `client/app/pages/order/**`
  - `client/app/pages/customer_order/**`
  - `client/src/wallet/**`
  - `client/app/components/wallet/**`
  - `client/app/components/pages/Wallet*.vue`
  - `client/app/pages/wallet.vue`
  - `client/src/withdrawal/**`
  - `client/app/components/withdrawal/**`
  - `client/app/pages/withdrawal.vue`
  - `client/src/auth/**`
  - `client/app/components/auth/**`
  - `client/app/pages/sign-in.vue`
  - `client/app/pages/sign-up.vue`
  - `client/app/pages/forgot-password.vue`
  - `client/src/settings/**`
  - `client/app/components/settings/**`
  - `client/app/pages/settings.vue`
  - `client/src/profile/**`
  - `client/app/components/profile/**`
  - `client/app/pages/profile/**`
- Không được sửa nếu không có sync trước:
  - `client/src/shared-kernel/**`
  - `client/types/**`
  - `client/i18n/**`
  - `client/doc/refactor-progress.md`

### Developer 2 ownership

- Được sửa:
  - `client/src/messages/**`
  - `client/app/components/messages/**`
  - `client/app/components/pages/Messages*.vue`
  - `client/app/pages/messages.vue`
  - `client/src/search/**`
  - `client/app/components/search/**`
  - `client/app/components/pages/Search*.vue`
  - `client/app/pages/search.vue`
  - `client/app/pages/hashtag/**`
  - `client/src/blogs/**`
  - `client/app/components/blogs/**`
  - `client/app/components/pages/Blogs*.vue`
  - `client/app/pages/blogs.vue`
  - `client/app/pages/create-blog.vue`
  - `client/app/pages/read-blog/**`
  - `client/src/explore/**`
  - `client/app/components/explore/**`
  - `client/app/pages/explore/**`
  - `client/src/feed/**`
  - `client/app/components/feed/**`
  - `client/app/pages/feed.vue`
  - `client/src/popular/**`
  - `client/app/components/popular/**`
  - `client/app/pages/popular.vue`
  - `client/src/saved/**`
  - `client/app/components/saved/**`
  - `client/app/pages/saved.vue`
  - `client/src/reels/**`
  - `client/app/components/reels/**`
  - `client/app/pages/reels.vue`
  - `client/src/watch/**`
  - `client/app/components/watch/**`
  - `client/app/pages/watch.vue`
  - `client/src/photos/**`
  - `client/app/components/photos/**`
  - `client/app/pages/photos.vue`
  - `client/src/lightbox/**`
  - `client/app/components/lightbox/**`
  - `client/src/movies/**`
  - `client/app/components/movies/**`
  - `client/app/pages/movies/**`
  - `client/src/memories/**`
  - `client/app/components/memories/**`
  - `client/app/pages/memories.vue`
- Không được sửa nếu không có sync trước:
  - `client/src/shared-kernel/**`
  - `client/types/**`
  - `client/i18n/**`
  - `client/doc/refactor-progress.md`

### Developer 3 ownership

- Được sửa:
  - `client/src/community/**`
  - `client/app/components/community/**`
  - `client/app/components/pages/Group*.vue`
  - `client/app/components/pages/Page*.vue`
  - `client/app/pages/groups.vue`
  - `client/app/pages/pages.vue`
  - `client/app/pages/create-group.vue`
  - `client/app/pages/create-page.vue`
  - `client/app/pages/group-setting/**`
  - `client/app/pages/page-setting/**`
  - `client/app/pages/g/**`
  - `client/app/pages/p/**`
  - `client/src/product/**`
  - `client/app/components/product/**`
  - `client/app/components/pages/*Product*.vue`
  - `client/app/pages/products.vue`
  - `client/app/pages/my-products.vue`
  - `client/app/pages/new-product.vue`
  - `client/app/pages/edit-product/**`
  - `client/src/jobs/**`
  - `client/app/components/jobs/**`
  - `client/app/components/pages/Jobs*.vue`
  - `client/app/pages/jobs.vue`
  - `client/src/directory/**`
  - `client/app/components/directory/**`
  - `client/app/pages/directory.vue`
  - `client/src/events/**`
  - `client/app/components/events/**`
  - `client/app/pages/events.vue`
  - `client/src/forum/**`
  - `client/app/components/forum/**`
  - `client/app/pages/forum/**`
  - `client/src/foundation/**`
  - `client/app/components/foundation/**`
  - `client/app/pages/foundation.vue`
  - `client/src/funding/**`
  - `client/app/components/funding/**`
  - `client/app/pages/fundings.vue`
  - `client/src/games/**`
  - `client/app/components/games/**`
  - `client/app/pages/games.vue`
  - `client/src/go-pro/**`
  - `client/app/components/go-pro/**`
  - `client/app/pages/go-pro.vue`
  - `client/src/live/**`
  - `client/app/components/live/**`
  - `client/app/pages/live.vue`
  - `client/src/navigation/**`
  - `client/app/components/navigation/**`
  - `client/src/pages/**`
  - `client/app/components/pages/**`
  - `client/src/poke/**`
  - `client/app/components/poke/**`
  - `client/app/pages/poke.vue`
  - `client/src/forms/**`
  - `client/app/components/forms/**`
- Có quyền cập nhật:
  - `client/doc/refactor-progress.md`
- Không được sửa nếu không có sync trước:
  - `client/src/shared-kernel/**`
  - `client/types/**`
  - `client/i18n/**`

## Shared files policy

Các file này không được nhiều người cùng sửa trong cùng phase:

- `client/src/shared-kernel/**`
- `client/types/**`
- `client/i18n/**`
- `client/nuxt.config.ts`
- `client/doc/refactor-progress.md`

Rule:
- `shared-kernel`: chỉ sửa qua PR riêng.
- `types/*`: chỉ sửa khi thật sự bắt buộc, và phải báo trước trong task.
- `i18n/*`: gom thành PR riêng hoặc chỉ `1` owner của phase chạm vào.
- `refactor-progress.md`: chỉ `Developer 3` cập nhật sau khi merge hoặc chốt cuối ngày.

## Recommended phases

### Phase 1

- Developer 1:
  - migrate `checkout` runtime thật
- Developer 2:
  - migrate `messages` runtime thật
- Developer 3:
  - cleanup sâu `community` khỏi `types/community.ts`
  - giữ ownership transition của `product`

### Phase 2

- Developer 1:
  - migrate `orders`
- Developer 2:
  - migrate `search`
- Developer 3:
  - migrate `jobs`
  - cleanup sâu `product` nếu còn shared/domain gap

### Phase 3

- Developer 1:
  - migrate `wallet`, `withdrawal`, `auth`, `settings`, `profile`
- Developer 2:
  - migrate `blogs`, `explore`, `feed`, `popular`, `saved`, `reels`, `watch`, `photos`, `lightbox`, `movies`, `memories`
- Developer 3:
  - migrate `directory`, `events`, `forum`, `foundation`, `funding`, `games`, `go-pro`, `live`
  - xử lý `navigation`, `forms`, `pages`, `poke` như platform/support modules

## Task template

Mỗi task nên viết theo format này:

### Title

`Migrate checkout runtime to src/checkout`

### Scope

- `client/src/checkout/**`
- `client/app/components/checkout/**`
- `client/app/components/pages/Checkout*.vue`
- `client/app/pages/checkout.vue`

### Out of scope

- `client/src/shared-kernel/**`
- `client/types/**`
- `client/i18n/**`
- file ngoài `checkout`

### Done when

- route vẫn chạy từ `app/pages/*`
- page runtime thật nằm ở `src/<context>/presentation/pages/*`
- `app/components/<context>/*` chỉ còn wrapper nếu đã move
- build pass bằng `npm run build`

## Merge policy

- Không mở PR đụng nhiều bounded context.
- Không trộn refactor kiến trúc với cleanup unrelated.
- Nếu cần sửa shared file:
  - tách commit riêng
  - ghi rõ lý do trong PR
- Merge order:
  1. PR không đụng shared
  2. PR có đụng shared nhỏ
  3. cuối cùng mới cập nhật `refactor-progress.md`


## Immediate assignment recommendation

### Developer 1

- Bắt đầu ngay:
  - `checkout`

### Developer 2

- Bắt đầu ngay:
  - `messages`

### Developer 3

- Bắt đầu ngay:
  - `community` cleanup sâu
  - ưu tiên tách bớt dependency khỏi `types/community.ts`

Sau khi 3 task này merge xong mới chuyển sang:
- `orders`
- `search`
- `product` cleanup hoặc `jobs`

## Deferred module notes

Các module dưới đây đã có owner nhưng chưa nên mở cùng lúc trong phase đầu, để tránh lan write scope quá rộng:

- Developer 1:
  - `auth`
  - `settings`
  - `profile`
  - `wallet`
  - `withdrawal`
- Developer 2:
  - `blogs`
  - `explore`
  - `feed`
  - `popular`
  - `saved`
  - `reels`
  - `watch`
  - `photos`
  - `lightbox`
  - `movies`
  - `memories`
- Developer 3:
  - `directory`
  - `events`
  - `forum`
  - `foundation`
  - `funding`
  - `games`
  - `go-pro`
  - `live`
  - `navigation`
  - `pages`
  - `poke`
  - `forms`

Riêng `navigation`, `forms`, `pages` là support modules:
- chỉ đụng khi context đang migrate thật sự cần
- ưu tiên PR riêng hoặc sync trước khi sửa

## Status update

- `Dev 3`:
  - done `product`, `community`, `jobs`, `directory`, `events`, `forum`, `foundation`, `funding`, `games`, `go-pro`, `live`, `navigation`, `pages`, `poke`, `forms`
  - `product` deep cleanup da xong
  - co the dong scope runtime migration

- `Dev 1`:
  - done `checkout`, `orders`, `wallet`, `withdrawal`, `auth`, `settings`, `profile`
  - legacy `app/components/*`, `app/composables/*`, duplicate `src/pages/*` cua nhom nay da duoc xoa

- remaining practical scopes sau cap nhat nay:
  - `Dev 2`: `search`, `blogs`, `explore`, `feed`, `popular`, `saved`, `reels`, `watch`, `photos`, `lightbox`, `movies`, `memories`
  - deeper domain cleanup chi mo khi thuc su can, khong con la blocker cho runtime migration

## Status update 2

- `Dev 2`:
  - done `search`, `blogs`, `explore`, `feed`, `popular`, `saved`, `reels`, `watch`, `photos`, `lightbox`, `movies`, `memories`
  - route runtime da chuyen sang `src/*/presentation/pages/*`
  - legacy `app/components/*`, `app/composables/useMock*.ts`, generic `src/pages/presentation/pages/*` cua nhom nay da duoc xoa
  - build pass sau cleanup sau cung

- remaining practical scopes sau cap nhat nay:
  - runtime migration cho `Dev 1`, `Dev 2`, `Dev 3` da co the xem la xong
  - phan con lai chu yeu la cleanup sau refactor, SSR preview manual, va domain cleanup sau hon theo uu tien
