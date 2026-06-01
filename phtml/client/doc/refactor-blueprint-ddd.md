# Client Refactor Blueprint

Mục tiêu của tài liệu này là đưa `client` từ cấu trúc hiện tại sang hướng:
- dễ scale
- dễ maintain
- clean hơn

Tài liệu này theo hướng **DDD chuẩn cho frontend**, với các nguyên tắc bắt buộc:
- bounded context rõ ràng
- ubiquitous language theo từng domain
- domain model tách khỏi UI/framework
- application layer riêng
- repository contract tách khỏi repository implementation
- anti-corruption giữa các context
- route/page chỉ là adapter của Nuxt vào application/presentation

## Mục tiêu kiến trúc

Sau refactor, code cần đạt các điều kiện sau:

- mỗi bounded context có biên rõ ràng
- page route file thật mỏng
- business rule không nằm rải trong `.vue`
- data source không trộn với UI
- shared code có kỷ luật
- dễ tách task theo module
- an toàn cho `SEO`, `SSR`, `UI/UX`

## Cấu trúc target

```txt
client/
├─ app/
│  ├─ app.vue
│  ├─ assets/
│  ├─ layouts/
│  ├─ middleware/
│  ├─ pages/
│  ├─ plugins/
│  └─ utils/
│
├─ src/
│  ├─ shared-kernel/
│  │  ├─ domain/
│  │  ├─ application/
│  │  ├─ infrastructure/
│  │  └─ presentation/
│  │
│  ├─ auth/
│  ├─ blogs/
│  ├─ checkout/
│  ├─ community/
│  ├─ directory/
│  ├─ events/
│  ├─ feed/
│  ├─ forum/
│  ├─ funding/
│  ├─ games/
│  ├─ go-pro/
│  ├─ jobs/
│  ├─ live/
│  ├─ messages/
│  ├─ orders/
│  ├─ product/
│  ├─ profile/
│  ├─ search/
│  ├─ settings/
│  ├─ wallet/
│  ├─ watch/
│  └─ withdrawal/
│
├─ i18n/
├─ public/
├─ doc/
├─ nuxt.config.ts
└─ package.json
```

## Cấu trúc bên trong mỗi bounded context

Ví dụ chuẩn cho một bounded context:

```txt
src/product/
├─ domain/
│  ├─ aggregates/
│  ├─ entities/
│  ├─ value-objects/
│  ├─ services/
│  ├─ repositories/
│  ├─ events/
│  ├─ specifications/
│  ├─ factories/
│  ├─ types/
│  └─ index.ts
│
├─ application/
│  ├─ use-cases/
│  ├─ services/
│  ├─ stores/
│  ├─ composables/
│  ├─ dto/
│  ├─ mappers/
│  └─ index.ts
│
├─ infrastructure/
│  ├─ api/
│  ├─ repositories/
│  ├─ mocks/
│  ├─ persistence/
│  ├─ mappers/
│  ├─ acl/
│  └─ index.ts
│
└─ presentation/
   ├─ components/
   ├─ sections/
   ├─ pages/
   └─ index.ts
```

## Ý nghĩa từng layer

### `domain`

Chứa:
- aggregate root
- entity
- value object
- repository contract
- domain event nếu cần
- business rule thuần
- type nghiệp vụ
- domain helper thuần

Không chứa:
- Vue
- Nuxt
- localStorage
- API call
- UI component
- Pinia
- composable Vue

### `application`

Chứa:
- use case
- application service
- orchestration logic
- store làm nhiệm vụ application state adapter
- composable điều phối feature ở mức application

Ví dụ:
- `useProductEditor`
- `useCheckoutFlow`
- `useFundingFilters`

### `infrastructure`

Chứa:
- API client / gateway
- repository implementation
- mock repository implementation
- storage adapter
- anti-corruption adapter
- mapper từ API/mock sang domain shape

Ví dụ:
- `product.repository.ts`
- `productDraft.storage.ts`
- `product.mock.ts`

### `presentation`

Chứa:
- page component
- section component
- UI component của feature

Chỉ nên lo:
- render
- event binding
- state từ application layer

Không nên tự chứa business rule lớn.

## Luật dependency

Luật bắt buộc:

- `presentation` được import từ:
  - `application`
  - `shared-kernel`

- `application` được import từ:
  - `domain`
  - `infrastructure`
  - `shared-kernel`

- `infrastructure` được import từ:
  - `domain`
  - `shared-kernel`

- `domain` không import ngược từ:
  - `presentation`
  - `application`
  - `infrastructure`

- bounded context A không import internals của bounded context B
- nếu A cần dữ liệu/khái niệm của B:
  - chỉ import qua public API của B
  - hoặc đi qua `acl/` adapter
  - không dùng type nội bộ của B trực tiếp trong domain của A

## Luật bounded context

Mỗi context phải có:
- ngôn ngữ riêng
- model riêng
- repository contract riêng
- use case riêng

Ví dụ:
- `product` không được dùng thẳng `CommunityDraft`
- `checkout` không được kéo trực tiếp type nội bộ của `wallet`
- `funding` không được phụ thuộc trực tiếp UI helper của `feed`

Nếu cần giao tiếp giữa context:
- dùng DTO ở application layer
- hoặc adapter ở `infrastructure/acl`

## Luật repository

Repository contract đặt ở `domain/repositories`.

Ví dụ:
- `ProductRepository` interface nằm trong `src/product/domain/repositories`
- implementation mock/API/localStorage nằm trong `src/product/infrastructure/repositories`

Domain và application không được phụ thuộc vào implementation cụ thể.

## Luật anti-corruption layer

Khi dữ liệu từ bên ngoài hoặc từ context khác đi vào context hiện tại:
- phải normalize
- phải map lại về model của context hiện tại
- không để raw API shape hoặc raw feature-B shape chảy thẳng vào domain feature-A

Nơi đặt adapter:
- `infrastructure/acl`
- hoặc `application/mappers` nếu chỉ là mapping use-case level

## Luật route files

`app/pages/*.vue` phải thật mỏng.

Mẫu chuẩn:

```vue
<template>
  <ProductPresentationProductsPage />
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Products | VNSEEA",
  description: "Marketplace products on VNSEEA",
})
</script>
```

Không để trong route file:
- mock data dài
- filter/sort logic lớn
- formatter nghiệp vụ
- business rule

## Luật shared-kernel

`shared-kernel` chỉ chứa thứ thật sự dùng chung giữa nhiều bounded context mà không làm mờ domain boundary.

Được phép vào `shared-kernel`:
- UI shell dùng toàn app
- generic composables
- generic utils
- HTTP client
- storage adapter
- i18n resolver/helper

Không được đẩy vào `shared-kernel` chỉ vì chưa biết để đâu.

Nếu chỉ `product` dùng, phải để trong `src/product`.

## Luật state

### Dùng local component state khi:
- state rất nhỏ
- chỉ sống trong một component
- không cần persist

### Dùng composable application khi:
- state thuộc một feature
- dùng qua vài component
- chưa cần global store

### Dùng Pinia khi:
- state shared qua nhiều page/component
- cần persistence/debug/devtools
- có nhiều action/use case đi kèm

Pinia phù hợp trước cho:
- auth UI/session state
- checkout/cart
- product filters/editor
- messages current conversation
- community settings draft

Lưu ý:
- Pinia không thay domain model
- Pinia chỉ là adapter/state container của application layer

## Luật SSR / SEO / UI

### SSR

- không đọc browser API trực tiếp trong setup nếu chưa guard client
- default state phải đủ shape
- không để template đọc object `undefined`
- local/session storage chỉ sync ở client

### SEO

- page public phải có `useSeoMeta`
- filter public nên cân nhắc sync với URL
- content public quan trọng không phụ thuộc hoàn toàn vào client-only state

### UI/UX

- mọi form/action quan trọng phải có state rõ:
  - idle
  - loading
  - success
  - error
- mobile-first
- keyboard/focus state rõ
- ưu tiên `@nuxt/ui` trước khi tự build primitive mới

## Mapping từ cấu trúc cũ sang mới

### `client/app/components/auth/*`

Chuyển vào:
- `src/auth/presentation/components/*`

Các page liên quan:
- `pages/RegisterPage.vue`
- `pages/WelcomePage.vue`
- `pages/ForgotPasswordPage.vue`

Chuyển vào:
- `src/auth/presentation/pages/*`

### `client/app/components/blogs/*`

Chuyển vào:
- `src/blogs/presentation/components/*`

`CreateBlogPage.vue`:
- page UI vào `src/blogs/presentation/pages/CreateBlogPage.vue`
- draft logic vào `src/blogs/application/*`
- mock/read data vào `src/blogs/infrastructure/*`

### `client/app/components/checkout/*`

Chuyển vào:
- `src/checkout/presentation/components/*`

Tách thêm:
- address form rules vào `src/checkout/domain/*`
- cart/checkout flow vào `src/checkout/application/*`
- local persistence/mock order vào `src/checkout/infrastructure/*`

### `client/app/components/community/*`

Chuyển vào:
- `src/community/presentation/components/*`

Từ [types/community.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/types/community.ts):
- types/interface -> `src/community/domain/types/*`
- create draft helpers -> `src/community/application/*`
- route map / constants -> `src/community/domain` hoặc `application`, tùy nghĩa
- mock directories/members -> `src/community/infrastructure/mocks/*`

### `client/app/components/directory/*`

Chuyển vào:
- `src/directory/presentation/components/*`

### `client/app/components/events/*`

Chuyển vào:
- `src/events/presentation/components/*`

### `client/app/components/feed/*`

Chuyển vào:
- `src/feed/presentation/components/*`

Nếu có feed state/filter/composer draft:
- `src/feed/application/*`

### `client/app/components/forms/*`

Không chuyển thẳng nguyên xi.

Phân loại:
- component nào generic thật -> `src/shared-kernel/presentation/components/forms/*`
- component nào chỉ thuộc một feature -> đưa về feature đó
- component nào trùng vai trò với `@nuxt/ui` -> bỏ dần

### `client/app/components/forum/*`

Chuyển vào:
- `src/forum/presentation/components/*`

### `client/app/components/foundation/*`

Chuyển vào:
- `src/shared-kernel/presentation/components/foundation/*`

### `client/app/components/funding/*`

Chuyển vào:
- `src/funding/presentation/components/*`

Tách thêm:
- campaign type/rule -> `src/funding/domain/*`
- filter/donate/create flow -> `src/funding/application/*`
- mock campaigns -> `src/funding/infrastructure/mocks/*`

### `client/app/components/games/*`

Chuyển vào:
- `src/games/presentation/components/*`

### `client/app/components/go-pro/*`

Chuyển vào:
- `src/go-pro/presentation/components/*`

### `client/app/components/jobs/*`

Chuyển vào:
- `src/jobs/presentation/components/*`

### `client/app/components/lightbox/*`

Nếu generic:
- `src/shared-kernel/presentation/components/media/*`

Nếu chỉ feed/media dùng:
- `src/feed/presentation/components/*`

### `client/app/components/live/*`

Chuyển vào:
- `src/live/presentation/components/*`

### `client/app/components/memories/*`

Chuyển vào:
- `src/memories/presentation/components/*`

### `client/app/components/messages/*`

Chuyển vào:
- `src/messages/presentation/components/*`

Rất nên thêm:
- `src/messages/application/stores/*`
- `src/messages/application/composables/*`

### `client/app/components/navigation/*`

Nếu generic app shell:
- `src/shared-kernel/presentation/components/navigation/*`

Nếu logic thuộc feed/home layout riêng:
- cân nhắc chia lại theo ngữ cảnh

### `client/app/components/orders/*`

Chuyển vào:
- `src/orders/presentation/components/*`

### `client/app/components/pages/*`

Không giữ như hiện tại lâu dài.

Tách theo feature:
- `NewProductPage.vue` -> `src/product/presentation/pages/NewProductPage.vue`
- `EditProductPage.vue` -> `src/product/presentation/pages/EditProductPage.vue`
- `CheckoutPage.vue` -> `src/checkout/presentation/pages/CheckoutPage.vue`
- `CreateBlogPage.vue` -> `src/blogs/presentation/pages/CreateBlogPage.vue`
- ...

### `client/app/components/poke/*`

Chuyển vào:
- `src/poke/presentation/components/*`

### `client/app/components/product/*`

Chuyển vào:
- `src/product/presentation/components/*`

Các file hiện tại nên tách thêm:
- `types/product-editor.ts` -> `src/product/domain/types/*`
- `useProductEditorDraft.ts` -> `src/product/application/composables/*`
- `useProductEditorMeta.ts` -> tùy nội dung:
  - nếu business metadata -> `domain`
  - nếu UI option mapping -> `application`
- `useProductMockMedia.ts` -> `src/product/infrastructure/mocks/*`

### `client/app/components/profile/*`

Chuyển vào:
- `src/profile/presentation/components/*`

### `client/app/components/reels/*`

Chuyển vào:
- `src/reels/presentation/components/*`

### `client/app/components/saved/*`

Chuyển vào:
- `src/saved/presentation/components/*`

### `client/app/components/search/*`

Chuyển vào:
- `src/search/presentation/components/*`

Search/filter state:
- `src/search/application/*`

### `client/app/components/settings/*`

Chuyển vào:
- `src/settings/presentation/components/*`

### `client/app/components/wallet/*`

Chuyển vào:
- `src/wallet/presentation/components/*`

### `client/app/components/watch/*`

Chuyển vào:
- `src/watch/presentation/components/*`

### `client/app/components/withdrawal/*`

Chuyển vào:
- `src/withdrawal/presentation/components/*`

## Mapping `types/*`

Hiện:
- `types/checkout.ts`
- `types/community.ts`
- `types/orders.ts`
- `types/product-editor.ts`

Target:

- `types/checkout.ts` -> `src/checkout/domain/types/*`
- `types/community.ts` -> tách ra:
  - `src/community/domain/types/*`
  - `src/community/infrastructure/mocks/*`
  - `src/community/application/*`
- `types/orders.ts` -> `src/orders/domain/types/*`
- `types/product-editor.ts` -> `src/product/domain/types/*`

## Mapping `app/composables/*`

### Chuyển vào `shared-kernel`

- `useAppBreakpoints.ts` -> `src/shared-kernel/application/composables/useAppBreakpoints.ts`
- `useDebouncedSearch.ts` -> `src/shared-kernel/application/composables/useDebouncedSearch.ts`
- `useFormValidation.ts` -> `src/shared-kernel/application/composables/useFormValidation.ts`
- `useMaybeTranslatedText.ts` -> `src/shared-kernel/application/composables/useMaybeTranslatedText.ts`
- `usePersistedFilters.ts` -> `src/shared-kernel/application/composables/usePersistedFilters.ts`

### Chuyển vào feature tương ứng

- `useBuyerOrders.ts` -> `src/orders/application/*`
- `useSellerOrders.ts` -> `src/orders/application/*`
- `useOrderPresentation.ts` -> `src/orders/application/*` hoặc `presentation/*` tùy bản chất
- `useCommunityGroupDetail.ts` -> `src/community/application/*`
- `useCommunityPageDetail.ts` -> `src/community/application/*`
- `useProductEditorDraft.ts` -> `src/product/application/*`
- `useProductEditorMeta.ts` -> `src/product/application/*` hoặc `domain/*`
- `useProductMockMedia.ts` -> `src/product/infrastructure/mocks/*`

### `useMock*.ts`

Không nên để lâu dài ở root composables.

Mỗi file chuyển sang feature tương ứng, ví dụ:
- `useMockFundingData.ts` -> `src/funding/infrastructure/mocks/funding.mock.ts`
- `useMockJobsData.ts` -> `src/jobs/infrastructure/mocks/jobs.mock.ts`
- `useMockSearchData.ts` -> `src/search/infrastructure/mocks/search.mock.ts`

## Mẫu triển khai cho `product`

```txt
src/product/
├─ domain/
│  ├─ aggregates/
│  │  └─ ProductDraft.ts
│  ├─ types/
│  │  ├─ product-editor.types.ts
│  │  └─ product.types.ts
│  ├─ repositories/
│  │  └─ ProductRepository.ts
│  ├─ specifications/
│  │  └─ product-editor.specification.ts
│  ├─ services/
│  │  └─ product-pricing.service.ts
│  └─ index.ts
├─ application/
│  ├─ use-cases/
│  │  ├─ create-product-draft.ts
│  │  ├─ save-product-draft.ts
│  │  └─ submit-product.ts
│  ├─ composables/
│  │  ├─ useProductEditor.ts
│  │  ├─ useProductFilters.ts
│  │  └─ useProductEditorDraft.ts
│  ├─ stores/
│  │  └─ product.store.ts
│  ├─ dto/
│  │  └─ product.dto.ts
│  └─ index.ts
├─ infrastructure/
│  ├─ api/
│  │  └─ product.api.ts
│  ├─ repositories/
│  │  └─ ProductRepositoryHttp.ts
│  ├─ mocks/
│  │  ├─ product.mock.ts
│  │  └─ product-media.mock.ts
│  ├─ persistence/
│  │  └─ product-editor.storage.ts
│  ├─ acl/
│  │  └─ product.acl.ts
│  └─ index.ts
└─ presentation/
   ├─ components/
   │  ├─ HeroBanner.vue
   │  ├─ EditorFields.vue
   │  ├─ CreateMediaField.vue
   │  ├─ EditMediaManager.vue
   │  ├─ PreviewCard.vue
   │  ├─ ChecklistCard.vue
   │  └─ TipsCard.vue
   ├─ pages/
   │  ├─ NewProductPage.vue
   │  └─ EditProductPage.vue
   └─ index.ts
```

## Rollout theo phase

Không refactor big-bang. Làm theo phase.

### Phase 0

Mục tiêu:
- đóng băng nguyên tắc
- không tạo thêm debt theo kiểu cũ

Việc làm:
- chốt naming
- chốt dependency rule
- chốt target structure

### Phase 1

Mục tiêu:
- tách page-level logic ra khỏi route files

Việc làm:
- giữ `app/pages/*.vue` thật mỏng
- gom page components về feature tương ứng trong `src/*/presentation/pages`

### Phase 2

Mục tiêu:
- tách `types`, helper nghiệp vụ, mock data ra khỏi `.vue`

Ưu tiên:
- `product`
- `checkout`
- `community`

### Phase 3

Mục tiêu:
- tạo application layer rõ ràng

Việc làm:
- thêm composable/store theo feature
- ngừng để filter/draft/business flow trong page components

### Phase 4

Mục tiêu:
- tách infrastructure

Việc làm:
- move `useMock*.ts` về feature mock repositories
- chuẩn hóa persistence adapters

### Phase 5

Mục tiêu:
- tối ưu SSR/SEO/UI theo feature sau khi cấu trúc đã rõ

Việc làm:
- sync filter với URL
- replace `<img>` bằng `NuxtImg` khi hợp lý
- chuẩn hóa `useSeoMeta`
- thêm `Pinia` đúng chỗ

## Thứ tự module nên migrate

1. `product`
2. `checkout`
3. `community`
4. `funding`
5. `auth`
6. `messages`
7. `orders`
8. `wallet`
9. `blogs`
10. `jobs/search/directory`

Lý do:
- đây là các module có nhiều form/state/business rule nhất
- dễ thấy hiệu quả nhất khi tách layer

## Định nghĩa done cho một feature

Một feature được coi là refactor xong khi:

- route file mỏng
- component UI không chứa business rule lớn
- types không trộn mock data
- mock/API nằm trong infrastructure
- draft/filter/state chính nằm trong application layer
- dependency đi một chiều
- pass yêu cầu `SEO`, `SSR`, `UI/UX`

## Ghi chú thực dụng

- DDD chuẩn không có nghĩa là copy Java enterprise một cách máy móc
- nhưng nếu đã chọn DDD thì phải giữ:
  - context boundary thật
  - repository contract riêng
  - domain không phụ thuộc framework
  - anti-corruption khi qua context
- module nhỏ vẫn có thể giản lược số file, nhưng không được phá luật layer và dependency

Điều quan trọng nhất không phải số folder, mà là:
- boundary rõ
- ownership rõ
- dependency sạch
- page mỏng
- mock/data/business/UI không trộn hỗn loạn
