# Refactor Progress

File này dùng để đánh dấu phần nào của hướng refactor mới đã có sample, đã có doc, và phần nào chưa làm.

## Current baseline after latest pull

- `[x]` Runtime hiện tại của Nuxt vẫn chạy chủ yếu từ:
  - `app/pages/*`
  - `app/components/*`
  - `app/composables/*`
- `[x]` `src/*` hiện là:
  - target structure
  - nơi chứa runtime mới đã migrate của `product`, `community`, `checkout`, `jobs`, `directory`, `events`, `funding`
  - nền để tiếp tục migrate các bounded context còn lại
- `[x]` Route thật vẫn map từ `app/pages/*`
- `[x]` `app/pages/*` vẫn là route entrypoint bắt buộc của Nuxt

## Docs

- `[x]` [refactor-guide.md](/d:/Duong/src/laragon/www/demo.vnseea/client/doc/refactor-guide.md)
- `[x]` [refactor-blueprint-ddd.md](/d:/Duong/src/laragon/www/demo.vnseea/client/doc/refactor-blueprint-ddd.md)
- `[x]` [product-editor-migration-status.md](/d:/Duong/src/laragon/www/demo.vnseea/client/doc/product-editor-migration-status.md)
- `[x]` [ui-parity-baseline.md](/d:/Duong/src/laragon/www/demo.vnseea/client/doc/ui-parity-baseline.md)
- `[x]` [ui-parity-checklist.md](/d:/Duong/src/laragon/www/demo.vnseea/client/doc/ui-parity-checklist.md)
- `[x]` [refactor-sample-product.md](/d:/Duong/src/laragon/www/demo.vnseea/client/doc/refactor-sample-product.md)
- `[x]` [refactor-sample-checkout.md](/d:/Duong/src/laragon/www/demo.vnseea/client/doc/refactor-sample-checkout.md)
- `[x]` [refactor-sample-community.md](/d:/Duong/src/laragon/www/demo.vnseea/client/doc/refactor-sample-community.md)

## UI parity recovery

- `[x]` chot baseline recovery theo Git history thay vi runtime hien tai
- `[x]` them tai lieu source of truth cho parity: `ui-parity-baseline.md`
- `[x]` them checklist bat buoc truoc khi sua presentation: `ui-parity-checklist.md`
- `[x]` them route manifest uu tien cho parity audit tai `src/shared-kernel/application/constants/ui-parity-routes.ts`
- `[ ]` chot commit baseline cuoi cung cho tung route uu tien
- `[ ]` audit desktop/mobile parity cho `welcome`, `register`, `home`, `@username`, `messages`, `products`, `groups`, `blogs`, `search`
- `[ ]` restore shared shell parity cho `navigation`, `foundation`, `forms`, `feed`, `lightbox`
- `[ ]` restore page composition parity theo thu tu shell-first

## Bounded contexts in `src/*`

- `[x]` `src/product`
  - `domain`
  - `application`
  - `infrastructure`
  - `presentation`
- `[x]` `src/checkout`
  - `domain`
  - `application`
  - `infrastructure`
  - `presentation`
- `[x]` `src/shared-kernel`
  - `presentation`
- `[x]` `src/community`
  - `domain`
  - `application`
  - `infrastructure`
  - `presentation`
- `[x]` `src/jobs`
  - `presentation`
- `[x]` `src/funding`
  - `domain`
  - `infrastructure`
  - `presentation`
- `[ ]` `src/auth`
- `[x]` `src/messages`
  - `domain`
  - `application`
  - `presentation`
- `[ ]` `src/orders`
- `[ ]` `src/wallet`
- `[ ]` `src/blogs`
- `[ ]` `src/search`
- `[x]` `src/events`
  - `domain`
  - `infrastructure`
  - `presentation`
- `[x]` `src/directory`
  - `domain`
  - `infrastructure`
  - `presentation`
- `[x]` `src/forum`
  - `domain`
  - `infrastructure`
  - `presentation`
- `[x]` `src/foundation`
  - `presentation`
- `[x]` `src/games`
  - `domain`
  - `infrastructure`
  - `presentation`
- `[ ]` `src/live`
- `[ ]` `src/profile`
- `[ ]` `src/settings`
- `[ ]` `src/watch`
- `[ ]` `src/withdrawal`

## Legacy inventory in `app/components/*`

- `[x]` Tổng số module legacy hiện có trong `app/components/*`: `35`
- `[x]` Inventory đã được đối chiếu với cấu trúc cũ trong IDE

### Legacy module list

- `[x]` `auth`
- `[x]` `blogs`
- `[x]` `checkout`
- `[x]` `community`
- `[x]` `directory`
- `[x]` `events`
- `[x]` `explore`
- `[x]` `feed`
- `[x]` `forms`
- `[x]` `forum`
- `[x]` `foundation`
- `[x]` `funding`
- `[x]` `games`
- `[x]` `go-pro`
- `[x]` `jobs`
- `[x]` `lightbox`
- `[x]` `live`
- `[x]` `memories`
- `[x]` `messages`
- `[x]` `movies`
- `[x]` `navigation`
- `[x]` `orders`
- `[x]` `pages`
- `[x]` `photos`
- `[x]` `poke`
- `[x]` `popular`
- `[x]` `product`
- `[x]` `profile`
- `[x]` `reels`
- `[x]` `saved`
- `[x]` `search`
- `[x]` `settings`
- `[x]` `wallet`
- `[x]` `watch`
- `[x]` `withdrawal`

## Remaining app component modules

### Primary bounded contexts / business modules

- `[ ]` `auth`
- `[ ]` `blogs`
- `[ ]` `checkout`
- `[~]` `community`
- `[~]` `directory`
- `[~]` `events`
- `[~]` `forum`
- `[~]` `funding`
- `[x]` `games`
- `[~]` `jobs`
- `[ ]` `live`
- `[~]` `messages`
- `[ ]` `orders`
- `[~]` `product`
- `[ ]` `profile`
- `[ ]` `search`
- `[ ]` `settings`
- `[ ]` `wallet`
- `[ ]` `watch`
- `[ ]` `withdrawal`

### Secondary / content / support modules

- `[ ]` `explore`
- `[ ]` `feed`
- `[~]` `forms`
- `[x]` `foundation`
- `[x]` `go-pro`
- `[ ]` `lightbox`
- `[ ]` `memories`
- `[ ]` `movies`
- `[~]` `navigation`
- `[ ]` `pages`
- `[ ]` `photos`
- `[ ]` `poke`
- `[ ]` `popular`
- `[ ]` `reels`
- `[ ]` `saved`

## Runtime refactor

- `[~]` move route wrappers thật từ `app/pages/*` sang pattern `app/pages/* -> src/*/presentation/pages/*`
- `[~]` move page-level runtime thật khỏi `app/components/pages/*`
- `[~]` thay import runtime cũ bằng `src/*` structure mới

### Current runtime understanding

- `app/pages/*` = Nuxt route entry
- `app/components/pages/*` = page runtime cũ hoặc lớp chuyển tiếp còn sót lại ở các context chưa dọn xong
- `src/*/presentation/pages/*` = page runtime mục tiêu sau refactor
- `src/*/presentation/components/*` = UI thật theo bounded context

## Product migration status

- `[x]` `products` runtime đã nằm ở `src/product/presentation/pages/ProductsPage.vue`
- `[x]` `my-products` runtime đã nằm ở `src/product/presentation/pages/MyProductsPage.vue`
- `[x]` `new-product` runtime đã nằm ở `src/product/presentation/pages/NewProductPage.vue`
- `[x]` `edit-product` runtime đã nằm ở `src/product/presentation/pages/EditProductPage.vue`
- `[x]` `app/pages/products.vue`, `my-products.vue`, `new-product.vue`, `edit-product/[id].vue` đã import thẳng `src/product/presentation/pages/*`
- `[x]` đã xóa `app/components/pages/ProductsPage.vue`, `MyProductsPage.vue`, `NewProductPage.vue`, `EditProductPage.vue`
- `[x]` child components của flow product đã có implementation thật trong `src/product/presentation/components/*`
- `[x]` `app/components/product/*` cho `HeroBanner`, `EditorFields`, `CreateMediaField`, `EditMediaManager`, `PreviewCard`, `ChecklistCard`, `TipsCard` đã được xóa khỏi legacy tree sau khi runtime chuyển hẳn sang `src/product/presentation/components/*`
- `[x]` `SubmitBar` đã được move sang `src/shared-kernel/presentation/components/forms/SubmitBar.vue`
- `[x]` `useProductEditorDraft` đã được move sang `src/product/application/composables/useProductEditorDraft.ts`
- `[x]` `useProductEditorMeta` đã được move sang `src/product/application/composables/useProductEditorMeta.ts`
- `[x]` `createProductMockImage` đã được move sang `src/product/infrastructure/mocks/productMockMedia.ts`
- `[x]` `app/composables/useProductEditorDraft.ts` hiện chỉ còn re-export wrapper
- `[x]` `app/composables/useProductEditorMeta.ts` hiện chỉ còn re-export wrapper
- `[x]` `app/composables/useProductMockMedia.ts` hiện chỉ còn re-export wrapper
- `[x]` chuẩn hóa tiếp business rules của `product` sang domain/application sâu hơn
- `[x]` toàn bộ page runtime của `product` đã chuyển ownership sang `src/product/presentation/pages/*`
- `[x]` `ProductsPage.vue` đã chuyển phần search/filter/sort/mock listing sang `src/product/application/*`, `src/product/domain/*`, `src/product/infrastructure/*`
- `[x]` `MyProductsPage.vue` đã chuyển overview summary sang `src/product/application/composables/useMyProductsOverview.ts`
- `[x]` `EditProductPage.vue` đã chuyển mock editable product sang `src/product/infrastructure/mocks/productEditor.mock.ts`
- `[x]` dọn legacy child components của `product` trong `app/components/product/*` vì không còn runtime dependency

## Community migration status

- `[x]` `useCommunityGroupDetail` đã được move sang `src/community/application/composables/useCommunityGroupDetail.ts`
- `[x]` `useCommunityPageDetail` đã được move sang `src/community/application/composables/useCommunityPageDetail.ts`
- `[x]` `app/composables/useCommunityGroupDetail.ts` hiện chỉ còn re-export wrapper
- `[x]` `app/composables/useCommunityPageDetail.ts` hiện chỉ còn re-export wrapper
- `[x]` lookup data từ `types/community.ts` đã có adapter tạm trong `src/community/infrastructure/adapters/communityDirectory.adapter.ts`
- `[x]` rule format count đã được tách sang `src/community/domain/services/community-metrics.service.ts`
- `[x]` `GroupDetailPage` runtime đã nằm ở `src/community/presentation/pages/GroupDetailPage.vue`
- `[x]` `PageDetailPage` runtime đã nằm ở `src/community/presentation/pages/PageDetailPage.vue`
- `[x]` `GroupSettingPage` runtime đã nằm ở `src/community/presentation/pages/GroupSettingPage.vue`
- `[x]` `PageSettingPage` runtime đã nằm ở `src/community/presentation/pages/PageSettingPage.vue`
- `[x]` `GroupsPage` runtime đã nằm ở `src/community/presentation/pages/GroupsPage.vue`
- `[x]` `PagesDirectoryPage` runtime đã nằm ở `src/community/presentation/pages/PagesDirectoryPage.vue`
- `[x]` `CreateGroupPage` runtime đã nằm ở `src/community/presentation/pages/CreateGroupPage.vue`
- `[x]` `CreatePagePage` runtime đã nằm ở `src/community/presentation/pages/CreatePagePage.vue`
- `[x]` route files `groups`, `suggested-groups`, `joined_groups`, `pages`, `suggested-pages`, `liked-pages`, `create-group`, `create-page`, `g/[name]`, `p/[name]`, `group-setting/[group]`, `page-setting/[page]` đã import thẳng `src/community/presentation/pages/*`
- `[x]` đã xóa `app/components/pages/GroupDetailPage.vue`, `PageDetailPage.vue`, `GroupSettingPage.vue`, `PageSettingPage.vue`, `GroupsPage.vue`, `PagesDirectoryPage.vue`, `CreateGroupPage.vue`, `CreatePagePage.vue`
- `[x]` move runtime pages của `community` sang `src/community/presentation/pages/*`
- `[x]` move `app/components/community/*` sang `src/community/presentation/components/*`
- `[x]` đã xóa toàn bộ legacy `app/components/community/*` sau khi runtime chuyển sang `src/*`
- `[x]` `ExplorePage.vue` đã import thẳng `src/community/presentation/components/PageCard.vue`
- `[x]` tách `community` domain types ra `src/community/domain/types/community.types.ts`
- `[x]` tách option/tabs/route maps/community URL prefixes ra `src/community/domain/constants/community-options.ts`
- `[x]` tách helper thuần của `community` ra `src/community/domain/services/community-helpers.service.ts`
- `[x]` tách draft factory ra `src/community/application/factories/community-drafts.ts`
- `[x]` tách directory mock source ra `src/community/infrastructure/mocks/communityDirectory.mock.ts`
- `[x]` tách mock/social feed dependency chung khỏi `useMockSocialData` sang `src/community/infrastructure/mocks/communityFeed.mock.ts`
- `[x]` dọn toàn bộ legacy child components của `community` trong `app/components/community/*`

## Checkout migration status

- `[x]` `checkout` runtime đã nằm ở `src/checkout/presentation/pages/CheckoutPage.vue`
- `[x]` `app/components/pages/CheckoutPage.vue` chỉ còn là wrapper
- `[x]` `CheckoutLayout`, `CheckoutSummary`, `ShippingAddressFormUI` đã có implementation thật trong `src/checkout/presentation/components/*`
- `[x]` `app/components/checkout/*` hiện chỉ còn wrapper
- `[x]` `src/checkout/domain/types/checkout.types.ts` đã được mở rộng để chứa shape runtime hiện tại của checkout

## Jobs migration status

- `[x]` `jobs` runtime đã nằm ở `src/jobs/presentation/pages/JobsPage.vue`
- `[x]` `app/pages/jobs.vue` đã import thẳng `src/jobs/presentation/pages/JobsPage.vue`
- `[x]` đã xóa `app/components/pages/JobsPage.vue`
- `[x]` `app/components/jobs/*` đã move ownership sang `src/jobs/presentation/components/*`
- `[x]` `app/components/jobs/*` đã được xóa khỏi legacy tree sau khi runtime chuyển hẳn sang `src/jobs/presentation/components/*`
- `[x]` đã thêm `src/jobs/README.md` để chốt baseline cho context `jobs`

## Directory migration status

- `[x]` `directory` runtime đã nằm ở `src/directory/presentation/pages/DirectoryIndexPage.vue`
- `[x]` `app/pages/directory/index.vue` đã import thẳng `src/directory/presentation/pages/DirectoryIndexPage.vue`
- `[x]` `DirectoryCard`, `DirectoryFilters`, `DirectoryHero`, `DirectorySidebar` đã có implementation thật trong `src/directory/presentation/components/*`
- `[x]` `useMockDirectoryData.ts` đã được move sang `src/directory/infrastructure/mocks/directoryCatalog.ts`
- `[x]` `DirectoryCategoryKey`, `DirectoryCategory`, `DirectoryItem` đã được tách sang `src/directory/domain/types/directory.types.ts`
- `[x]` đã xóa `app/components/directory/*`
- `[x]` đã xóa `app/components/pages/DirectoryIndexPage.vue`
- `[x]` đã xóa `app/composables/useMockDirectoryData.ts`
- `[x]` đã thêm `src/directory/README.md`

## Events migration status

- `[x]` `events` runtime đã nằm ở `src/events/presentation/pages/EventsPage.vue`
- `[x]` `event detail` runtime đã nằm ở `src/events/presentation/pages/EventDetailPage.vue`
- `[x]` `create event` runtime đã nằm ở `src/events/presentation/pages/CreateEventPage.vue`
- `[x]` `app/pages/events/index.vue`, `[id].vue`, `create-event.vue` đã import thẳng `src/events/presentation/pages/*`
- `[x]` `CreateEventComposer`, `CreateEventHero`, `EventCard`, `EventDetailHero`, `EventDetailMain`, `EventDetailSidebar`, `EventsFilters`, `EventsHero`, `EventsSidebar` đã có implementation thật trong `src/events/presentation/components/*`
- `[x]` `useMockEventsData.ts` đã được move sang `src/events/infrastructure/mocks/eventsCatalog.ts`
- `[x]` `EventTabKey`, `EventRsvpState`, `EventCategoryKey`, `EventCityKey`, `EventSortKey`, `EventTab`, `EventCategory`, `EventCity`, `EventAttendee`, `MockEvent` đã được tách sang `src/events/domain/types/events.types.ts`
- `[x]` đã xóa `app/components/events/*`
- `[x]` đã xóa `app/components/pages/EventsPage.vue`, `EventDetailPage.vue`, `CreateEventPage.vue`
- `[x]` đã xóa `app/composables/useMockEventsData.ts`
- `[x]` đã thêm `src/events/README.md`

## Funding migration status

- `[x]` `funding` runtime đã nằm ở `src/funding/presentation/pages/FundingPage.vue`
- `[x]` `create funding` runtime đã nằm ở `src/funding/presentation/pages/CreateFundingPage.vue`
- `[x]` `show fund` runtime đã nằm ở `src/funding/presentation/pages/ShowFundPage.vue`
- `[x]` `app/pages/funding.vue`, `create_funding.vue`, `show_fund/[id].vue` đã import thẳng `src/funding/presentation/pages/*`
- `[x]` `CreateFundingForm`, `FundingCard`, `FundingDetailHero`, `FundingDetailMain`, `FundingDetailSidebar`, `FundingDonateModal`, `FundingFilters`, `FundingHero`, `FundingProgress`, `FundingSidebar` đã có implementation thật trong `src/funding/presentation/components/*`
- `[x]` `useMockFundingData.ts` đã được move sang `src/funding/infrastructure/mocks/fundingCatalog.ts`
- `[x]` `FundingCategoryKey`, `FundingStatusKey`, `FundingOption`, `FundingDonor`, `MockFundingCampaign`, `DonationPayload`, `FundingCreatePayload`, `FundingDonationPresentation` đã được tách sang `src/funding/domain/types/funding.types.ts`
- `[x]` đã xóa `app/components/funding/*`
- `[x]` đã xóa `app/components/pages/FundingPage.vue`, `CreateFundingPage.vue`, `ShowFundPage.vue`
- `[x]` đã xóa `app/composables/useMockFundingData.ts`
- `[x]` đã thêm `src/funding/README.md`

## Forum migration status

- `[x]` `forum` runtime đã nằm ở `src/forum/presentation/pages/ForumPage.vue`
- `[x]` `app/pages/forum/index.vue` đã import thẳng `src/forum/presentation/pages/ForumPage.vue`
- `[x]` `CreateThreadModal`, `ForumFilters`, `ForumHero`, `ForumStatsSidebar`, `ForumThreadCard`, `ForumThreadDetail` đã có implementation thật trong `src/forum/presentation/components/*`
- `[x]` `useMockForumData.ts` đã được move sang `src/forum/infrastructure/mocks/forumCatalog.ts`
- `[x]` `ForumSectionKey`, `ForumSection`, `ForumReply`, `ForumThread`, `ForumThreadPayload` đã được tách sang `src/forum/domain/types/forum.types.ts`
- `[x]` đã xóa `app/components/forum/*`
- `[x]` đã xóa `app/components/pages/ForumPage.vue`
- `[x]` đã xóa `app/composables/useMockForumData.ts`
- `[x]` đã thêm `src/forum/README.md`

## Foundation migration status

- `[x]` base shell components đã nằm ở `src/foundation/presentation/components/*`
- `[x]` `DrawerShell`, `DropdownShell`, `EmptyState`, `LoadingSkeleton`, `ModalShell`, `PageHeader`, `PageSection`, `ResponsiveContainer` đã có implementation thật trong `src/foundation/presentation/components/*`
- `[x]` các consumer còn dùng `FoundationEmptyState` / `FoundationModalShell` đã import explicit từ `src/foundation/presentation/components/*`
- `[x]` đã xóa `app/components/foundation/*`
- `[x]` đã thêm `src/foundation/README.md`

## Messages migration status

- `[x]` `messages` runtime đã nằm ở `src/messages/presentation/pages/MessagesPage.vue`
- `[x]` `app/pages/messages.vue` đã import thẳng `src/messages/presentation/pages/MessagesPage.vue`
- `[x]` `ChatBubble`, `ChatInput`, `ChatList`, `ChatListItem`, `ChatMessageList`, `ChatWindow`, `MessageEmojiPicker`, `MessageSidePanel` đã có implementation thật trong `src/messages/presentation/components/*`
- `[x]` inbox state mock đã được gom sang `src/messages/application/composables/useMessagesInbox.ts`
- `[x]` `MessageTabKey`, `MessageTab`, `MessageContact`, `MessageItem` đã được tách sang `src/messages/domain/types/messages.types.ts`
- `[x]` đã xóa `app/components/messages/*`
- `[x]` đã xóa `app/components/pages/MessagesPage.vue`
- `[x]` đã thêm `src/messages/README.md`

## Navigation / support compatibility status

- `[x]` fix warning `NavigationHeaderUserMenu` bằng cách đổi `UDropdown` sang `UDropdownMenu`
- `[x]` fix warning `NavigationChatWidget` bằng cách đổi `UFormGroup` sang `UFormField`
- `[x]` migrate hết `UFormGroup` legacy còn lại sang `UFormField` ở:
  - `app/components/live/GoLiveModal.vue`
  - `app/components/messages/ChatList.vue`
  - `app/components/search/FiltersPanel.vue`
  - `app/components/settings/SettingsField.vue`
  - `app/components/wallet/WalletSendForm.vue`
  - `app/components/wallet/WalletTopupForm.vue`
  - `app/components/withdrawal/WithdrawalRequestForm.vue`
- `[x]` hiện không còn `UFormGroup` trong source runtime của `client` ngoài chính file doc này

## Library alignment

- `[ ]` chuẩn hóa `@nuxt/ui` theo kiến trúc mới ở các context còn lại
- `[ ]` chuẩn hóa `VueUse` theo `application` hoặc `shared-kernel` ở các context còn lại
- `[ ]` đưa `Pinia` vào application layer đúng chỗ
- `[ ]` chuẩn hóa `NuxtImg` ở các page public quan trọng
- `[ ]` mở rộng `i18n` theo bounded context mới

## Architecture governance

- `[ ]` đồng bộ toàn bộ doc cũ sang terminology mới:
  - `bounded context`
  - `shared-kernel`
  - `application`
  - `infrastructure`
- `[ ]` tạo checklist phase 1
- `[ ]` tạo checklist phase 2
- `[ ]` tạo checklist migration per module

## Build status

- `[x]` build pass sau khi thêm sample `src/product`
- `[x]` build pass sau khi thêm sample `src/checkout`
- `[x]` build pass sau bước move child components của `new-product`
- `[x]` build pass sau bước wrapper `edit-product` và move `SubmitBar`
- `[x]` build pass sau bước move orchestration `product`
- `[x]` build pass sau bước move toàn bộ page runtime của `product`
- `[x]` build pass sau bước move runtime và presentation components của `community`
- `[x]` build pass sau bước tách `community` types/options/drafts/mock và move nốt `GroupsPage`, `PagesDirectoryPage`, `CreateGroupPage`, `CreatePagePage`
- `[x]` build pass sau bước tách `community` feed mock riêng
- `[x]` build pass sau batch Nuxt UI compatibility cleanup (`UDropdownMenu`, `UFormField`)
- `[x]` build pass sau bước chuyển runtime `checkout` sang `src/checkout/presentation/*`
- `[x]` build pass sau bước chuyển runtime `jobs` sang `src/jobs/presentation/*`
- `[x]` build pass sau bước chuyển runtime `directory` sang `src/directory/presentation/*`
- `[x]` build pass sau bước chuyển runtime `events` sang `src/events/presentation/*`
- `[x]` build pass sau bước chuyển runtime `funding` sang `src/funding/presentation/*`
- `[x]` build pass sau bước chuyển runtime `forum` sang `src/forum/presentation/*`
- `[x]` build pass sau bước chuyển runtime `messages` sang `src/messages/presentation/*`
- `[x]` build pass sau bước chuyển support module `foundation` sang `src/foundation/presentation/*`
- `[x]` build pass sau bước xóa legacy child components không còn dùng của `product`, `community`, `jobs`
- `[x]` build pass sau bước xóa wrapper page không còn cần thiết của `product`, `community`, `jobs`

## Runtime verification

- `[x]` đã verify bằng `npm run build`
- `[ ]` preview SSR local bằng `.output/server/index.mjs` hiện đang bị blocker cấp repo:
  - `SyntaxError: The requested module 'vue' does not provide an export named 'default'`
  - lỗi này xuất hiện ngay khi render route `/new-product`, trước khi có thể kết luận riêng từng page migrated bị hỏng
- `[ ]` cần một pass riêng để xử lý blocker SSR runtime này trước khi đánh dấu verify route-level hoàn tất

## Next recommended work

### Next step A: community cleanup

- `[x]` tách thêm domain types / option helpers khỏi `types/community.ts`
- `[x]` tách mock/social feed dependency chung khỏi runtime `community`

### Next step B: second runtime wrapper

- `[x]` chuyển `checkout` sang pattern `app/pages/* -> src/checkout/presentation/pages/*`

### Next step C: next high-value business contexts

- `[ ]` `messages`
- `[ ]` `orders`
- `[ ]` `wallet`
- `[ ]` `search`
- `[ ]` `blogs`
- `[x]` `funding`
- `[x]` `jobs`
- `[x]` `messages`

### Next step D: Nuxt UI compatibility cleanup

- `[x]` migrate các `UFormGroup` còn lại sang `UFormField`
- `[ ]` rà tiếp các component Nuxt UI legacy tương tự `UDropdown` để tránh warning runtime lặp lại

## Suggested order from now

1. xử lý blocker SSR preview/runtime cấp repo
2. runtime wrapper cho `checkout`
3. migrate thật `checkout`
4. chọn một context lớn trong `messages / orders / wallet / search`
## Games migration status

- `[x]` `games` runtime Ä‘Ã£ náº±m á»Ÿ `src/games/presentation/pages/GamesPage.vue`
- `[x]` `app/pages/games.vue` Ä‘Ã£ import tháº³ng `src/games/presentation/pages/GamesPage.vue`
- `[x]` `GameCard`, `GamePlayModal`, `GamesFilters`, `GamesHero`, `GamesSidebar` Ä‘Ã£ cÃ³ implementation tháº­t trong `src/games/presentation/components/*`
- `[x]` `useMockGamesData.ts` Ä‘Ã£ Ä‘Æ°á»£c move sang `src/games/infrastructure/mocks/gamesCatalog.ts`
- `[x]` `GameTabKey`, `GameCategoryKey`, `MockGame`, `GameSessionPayload`, `GameAchievement`, `GameLeaderboardEntry` Ä‘Ã£ Ä‘Æ°á»£c tÃ¡ch sang `src/games/domain/types/games.types.ts`
- `[x]` Ä‘Ã£ xÃ³a `app/components/games/*`
- `[x]` Ä‘Ã£ xÃ³a `app/components/pages/GamesPage.vue`
- `[x]` Ä‘Ã£ xÃ³a `app/composables/useMockGamesData.ts`
- `[x]` Ä‘Ã£ thÃªm `src/games/README.md`

## Go Pro migration status

- `[x]` `go-pro` runtime Ä‘Ã£ náº±m á»Ÿ `src/go-pro/presentation/pages/GoProPage.vue`
- `[x]` `app/pages/go-pro.vue` Ä‘Ã£ import tháº³ng `src/go-pro/presentation/pages/GoProPage.vue`
- `[x]` `BillingToggle`, `CheckoutModal`, `ComparisonTable`, `GoProHero`, `GoProSidebar`, `PlanCard` Ä‘Ã£ cÃ³ implementation tháº­t trong `src/go-pro/presentation/components/*`
- `[x]` `useMockGoProData.ts` Ä‘Ã£ Ä‘Æ°á»£c move sang `src/go-pro/infrastructure/mocks/goProCatalog.ts`
- `[x]` `BillingCycle`, `ProPlan`, `ProCheckoutPayload`, `ProPaymentMethod`, `ProSubscriptionSummary`, `ProComparisonRow` Ä‘Ã£ Ä‘Æ°á»£c tÃ¡ch sang `src/go-pro/domain/types/go-pro.types.ts`
- `[x]` Ä‘Ã£ xÃ³a `app/components/go-pro/*`
- `[x]` Ä‘Ã£ xÃ³a `app/components/pages/GoProPage.vue`
- `[x]` Ä‘Ã£ xÃ³a `app/composables/useMockGoProData.ts`
- `[x]` Ä‘Ã£ thÃªm `src/go-pro/README.md`

## Live migration status

- `[x]` `live` runtime da nam o `src/live/presentation/pages/LivePage.vue`
- `[x]` `app/pages/live.vue` da import thang `src/live/presentation/pages/LivePage.vue`
- `[x]` `GoLiveModal`, `LiveChat`, `LiveHero`, `LivePlayer`, `LiveStreamList` da co implementation that trong `src/live/presentation/components/*`
- `[x]` `useMockLiveData.ts` da duoc move sang `src/live/infrastructure/mocks/liveCatalog.ts`
- `[x]` `GoLivePayload`, `MockLiveComment`, `MockLiveStream` da duoc tach sang `src/live/domain/types/live.types.ts`
- `[x]` da xoa `app/components/live/*`
- `[x]` da xoa `app/composables/useMockLiveData.ts`

## Poke migration status

- `[x]` `poke` runtime da nam o `src/poke/presentation/pages/PokePage.vue`
- `[x]` `app/pages/poke.vue` da import thang `src/poke/presentation/pages/PokePage.vue`
- `[x]` `RequestCard` da co implementation that trong `src/poke/presentation/components/*`
- `[x]` `useMockPokeData.ts` da duoc move sang `src/poke/infrastructure/mocks/pokeCatalog.ts`
- `[x]` `MockPokeRecord` da duoc tach sang `src/poke/domain/types/poke.types.ts`
- `[x]` da xoa `app/components/poke/*`
- `[x]` da xoa `app/composables/useMockPokeData.ts`

## Navigation migration status

- `[x]` `HeaderBar`, `HeaderIconNav`, `HeaderLogo`, `HeaderSearchInput`, `HeaderUserMenu`, `LeftSidebar`, `LocaleSwitcher`, `MobileMenu`, `RightSidebar`, `SidebarMenuItem`, `WidgetCard`, `ChatWidget` da nam o `src/navigation/presentation/components/*`
- `[x]` `app/layouts/default.vue` va `app/layouts/messages.vue` da import truc tiep `src/navigation/presentation/components/*`
- `[x]` `app/components/auth/AuthSplitShell.vue` da import `NavigationHeaderLogo` tu `src/navigation`
- `[x]` da xoa `app/components/navigation/*`

## Forms migration status

- `[x]` `CheckboxField`, `FormSection`, `MediaPreviewList`, `PasswordInput`, `RadioGroupField`, `SearchInput`, `SelectBox`, `TextareaAutoResize`, `TextInput`, `ToggleSwitch`, `Uploader` da nam o `src/forms/presentation/components/*`
- `[x]` cac consumer runtime cua `forms` da duoc doi sang import explicit tu `src/forms/*` hoac `src/shared-kernel/*`
- `[x]` duplicate `SubmitBar.vue` trong `src/forms` da duoc xoa; ownership cua submit bar nam o `src/shared-kernel/presentation/components/forms/SubmitBar.vue`
- `[x]` da xoa `app/components/forms/*`

## Generic pages migration status

- `[x]` cac route generic trong `app/pages/*` da import truc tiep page runtime moi tu `src/pages/presentation/pages/*`
- `[x]` da xoa toan bo legacy `app/components/pages/*`
- `[x]` duplicate wrappers `src/pages/presentation/pages/CheckoutPage.vue`, `LivePage.vue`, `PokePage.vue` da duoc xoa; cac route nay dung bounded context page that
- `[x]` da patch lai `ExplorePage`, `OrdersPage`, `OrderDetailPage`, `CustomerOrderPage` de su dung dung import path sau khi move

## Dev 3 scope status

- `[x]` hoan tat: `community`, `product` runtime ownership, `jobs`, `directory`, `events`, `funding`, `forum`, `foundation`, `games`, `go-pro`, `live`, `navigation`, `pages`, `poke`, `forms`
- `[ ]` con lai trong scope `Dev 3`:
  - cleanup sau refactor cho `product` neu can tach domain/application sau hon
  - cleanup sau refactor cho `community` neu muon dua tiep mock/dependency chung ve dung context hon
  - review lai `task-assignment-plan.md` neu doi owner cua cac scope da xong
- `[~]` estimated completion cho scope `Dev 3`: khoang `88%`

## Build status update

- `[x]` build pass sau batch migrate `live`, `navigation`, `forms`, `pages`, `poke`
- `[x]` build pass sau khi xoa legacy runtime cua 5 module tren

## Product deep cleanup status

- `[x]` `product` runtime da dung `src/product/*`
- `[x]` type editor da duoc chot ve `src/product/domain/types/product-editor.types.ts`
- `[x]` da xoa `client/types/product-editor.ts`
- `[x]` build pass sau cleanup sau cung

## Dev 1 migration status

- `[x]` `checkout`
- `[x]` `orders`
- `[x]` `wallet`
- `[x]` `withdrawal`
- `[x]` `auth`
- `[x]` `settings`
- `[x]` `profile`

## Dev 1 legacy cleanup status

- `[x]` da xoa `app/components/checkout/*`
- `[x]` da xoa `app/components/orders/*`
- `[x]` da xoa `app/components/wallet/*`
- `[x]` da xoa `app/components/withdrawal/*`
- `[x]` da xoa `app/components/auth/*`
- `[x]` da xoa `app/components/settings/*`
- `[x]` da xoa `app/components/profile/*`
- `[x]` da xoa `app/composables/useBuyerOrders.ts`
- `[x]` da xoa `app/composables/useSellerOrders.ts`
- `[x]` da xoa `app/composables/useOrderPresentation.ts`
- `[x]` da xoa `app/composables/useMockWalletData.ts`
- `[x]` da xoa `app/composables/useMockWithdrawalData.ts`
- `[x]` da xoa `app/composables/useMockSettingsData.ts`
- `[x]` da xoa duplicate generic pages trong `src/pages/presentation/pages/*` cho `orders`, `wallet`, `withdrawal`, `settings`, `profile`, `auth`
- `[x]` da xoa `client/types/orders.ts`

## Ownership summary

- `[x]` scope `Dev 3` co the xem la da dong o muc runtime migration
- `[x]` scope `Dev 1` o nhom `checkout/orders/wallet/withdrawal/auth/settings/profile` da migrate xong va da don legacy
- `[x]` build pass sau khi xoa legacy cua `Dev 1`

## Dev 2 migration status

- `[x]` `blogs`
- `[x]` `explore`
- `[x]` `feed`
- `[x]` `popular`
- `[x]` `saved`
- `[x]` `reels`
- `[x]` `watch`
- `[x]` `photos`
- `[x]` `lightbox`
- `[x]` `movies`
- `[x]` `memories`
- `[x]` `search`

## Dev 2 legacy cleanup status

- `[x]` da xoa `app/components/blogs/*`
- `[x]` da xoa `app/components/explore/*`
- `[x]` da xoa `app/components/feed/*`
- `[x]` da xoa `app/components/popular/*`
- `[x]` da xoa `app/components/saved/*`
- `[x]` da xoa `app/components/reels/*`
- `[x]` da xoa `app/components/watch/*`
- `[x]` da xoa `app/components/photos/*`
- `[x]` da xoa `app/components/lightbox/*`
- `[x]` da xoa `app/components/movies/*`
- `[x]` da xoa `app/components/memories/*`
- `[x]` da xoa `app/components/search/*`
- `[x]` da xoa `app/composables/useMockExploreData.ts`
- `[x]` da xoa `app/composables/useMockHashtagData.ts`
- `[x]` da xoa `app/composables/useMockMemoriesData.ts`
- `[x]` da xoa `app/composables/useMockMoviesData.ts`
- `[x]` da xoa `app/composables/useMockPhotosData.ts`
- `[x]` da xoa `app/composables/useMockPopularData.ts`
- `[x]` da xoa `app/composables/useMockReadBlogData.ts`
- `[x]` da xoa `app/composables/useMockSavedPostsData.ts`
- `[x]` da xoa `app/composables/useMockSearchData.ts`
- `[x]` da xoa `app/composables/useMockWatchData.ts`
- `[x]` da xoa duplicate generic pages trong `src/pages/presentation/pages/*` cho nhom `Dev 2`
- `[x]` giu lai `app/composables/useMockSocialData.ts` vi van duoc `navigation`, `profile`, `poke` su dung

## Build status

- `[x]` `npm run build` pass sau khi migrate va xoa legacy cua `Dev 2`
