# Client Refactor Guide

Đây là **file duy nhất nên dùng làm tài liệu hướng dẫn refactor chính** cho `client`.

Các file khác chỉ là tài liệu tham chiếu chi tiết:
- [refactor-blueprint-ddd.md](/d:/Duong/src/laragon/www/demo.vnseea/client/doc/refactor-blueprint-ddd.md): blueprint kiến trúc mục tiêu
- [product-editor-migration-status.md](/d:/Duong/src/laragon/www/demo.vnseea/client/doc/product-editor-migration-status.md): inventory module và backlog migration

## Mục tiêu

Refactor `client` để đạt:
- scalable
- maintainable
- clean
- SSR-safe
- SEO-friendly
- UI/UX nhất quán

## Kiến trúc chọn dùng

### Tổng thể

- **DDD** cho kiến trúc hệ thống
- chia theo **bounded context**
- tách rõ:
  - `domain`
  - `application`
  - `infrastructure`
  - `presentation`

### Tầng UI

- **MVVM** cho page/component
- `View` = Vue component
- `ViewModel` = composable hoặc Pinia store ở application layer
- `Model` = domain model / DTO / use case data

### Không dùng làm kiến trúc chính

- không dùng `MVP` cho toàn bộ repo

## Folder structure mục tiêu

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
└─ doc/
```

## Trạng thái chuyển tiếp cần hiểu đúng

Trong giai đoạn refactor:

- `app/pages/*` vẫn là route entry thật của Nuxt
- `app/components/*` vẫn có thể còn là runtime hiện tại của nhiều màn
- `src/*` là target structure mới theo DDD

Refactor sẽ diễn ra theo hướng:

```txt
URL
-> app/pages/*
-> src/<bounded-context>/presentation/pages/*
-> src/<bounded-context>/presentation/components/*
-> src/<bounded-context>/application/*
-> src/<bounded-context>/domain/*
-> src/<bounded-context>/infrastructure/*
```

Tức là:
- không bỏ `app/pages/*`
- mà biến `app/pages/*` thành wrapper mỏng
- rồi dần dần thay runtime cũ trong `app/components/pages/*` bằng page mới trong `src/*`

## Structure bên trong mỗi bounded context

```txt
src/product/
├─ domain/
├─ application/
├─ infrastructure/
└─ presentation/
```

### `domain`

Chứa:
- entities
- aggregates
- value objects
- repository contracts
- business rules
- domain services

Không chứa:
- Vue
- Nuxt
- API
- localStorage
- UI

### `application`

Chứa:
- use cases
- orchestration
- stores
- composables feature-level
- DTO / mapper use-case level

### `infrastructure`

Chứa:
- API implementation
- mock repositories
- storage adapters
- anti-corruption adapters
- mapper từ external data sang domain model

### `presentation`

Chứa:
- pages
- sections
- feature components

## Luật bắt buộc

### 1. Thin routes

`app/pages/*.vue` phải mỏng.

Chỉ nên làm:
- nhận route params
- set `useSeoMeta`
- render page component của context

Không để ở route file:
- mock data dài
- filter/sort logic lớn
- business rules
- data mapping phức tạp

### 2. Dependency một chiều

- `presentation` -> `application`, `shared-kernel`
- `application` -> `domain`, `infrastructure`, `shared-kernel`
- `infrastructure` -> `domain`, `shared-kernel`
- `domain` không import ngược bất kỳ layer nào khác

### 3. Context boundary

- context A không import internals của context B
- nếu cần giao tiếp:
  - đi qua public API
  - hoặc ACL adapter
  - hoặc DTO ở application layer

### 4. Shared-kernel kỷ luật

Chỉ cho thứ thật sự dùng chung:
- generic UI shell
- generic composables
- generic infra helpers
- shared i18n helpers

Không đẩy business logic của một context vào `shared-kernel`.

### 5. SSR-safe

- không đọc `window`, `document`, `localStorage`, `navigator`, `File` trực tiếp trong SSR path
- state mặc định phải đủ shape
- không render prop `undefined` cho component đang kỳ vọng array/object/string ổn định
- storage/browser sync chỉ chạy ở client

### 6. SEO-safe

- page public phải có `useSeoMeta`
- canonical phải rõ
- listing filter nên sync URL khi hợp lý
- content công khai không phụ thuộc hoàn toàn vào client-only render
- ưu tiên `NuxtImg` / `NuxtPicture` cho media public quan trọng

### 7. UI/UX-safe

- form/action phải có state rõ:
  - `idle`
  - `loading`
  - `success`
  - `error`
  - `disabled`
- mobile-first
- keyboard/focus rõ
- ưu tiên `@nuxt/ui` trước khi tự build primitive mới

## Do / Don't

### Do

- Do tách route file thành wrapper mỏng và chuyển page thật vào `src/<bounded-context>/presentation/pages`
- Do đặt business rule vào `domain`
- Do đặt orchestration, filter flow, submit flow, draft flow vào `application`
- Do đặt mock/API/storage vào `infrastructure`
- Do dùng `Pinia` như application state adapter, không dùng như domain model
- Do dùng `VueUse` cho:
  - persisted draft/filter
  - debounced search
  - responsive behavior
  - browser interaction
- Do dùng `@nuxt/ui` cho form, feedback, modal, drawer, dropdown
- Do normalize dữ liệu external trước khi đẩy vào domain/application
- Do để public page có `useSeoMeta()` rõ ràng
- Do thêm canonical và xử lý query URL có chủ đích cho listing/filter page
- Do giữ default state đủ shape để SSR/hydration ổn định

### Don’t

- Don’t để mock data dài trong `.vue`
- Don’t để file `types/*.ts` kiêm luôn mock data, formatter, route map, business rule
- Don’t để page component tự xử lý tất cả filter/sort/submit/business flow
- Don’t import lung tung giữa các bounded context
- Don’t đẩy bừa code vào `shared-kernel`
- Don’t dùng browser API trực tiếp trong SSR path
- Don’t tạo thêm UI primitive custom nếu `@nuxt/ui` đã có cái tương đương
- Don’t dùng `Pinia` cho mọi state nhỏ cục bộ
- Don’t hardcode thêm text mới ở page public khi i18n đã có trong project
- Don’t coi composable `useMockXxxData.ts` là nơi ở lâu dài của business logic

## Dùng thư viện thế nào

### `@nuxt/ui`

Dùng cho:
- form
- modal
- drawer
- dropdown
- feedback
- card/list primitives

### `@vueuse/nuxt`

Dùng cho:
- persisted draft/filter
- debounced search/filter
- responsive behavior
- browser interaction

Không dùng bừa chỉ vì “có nhiều composable”.

### `@pinia/nuxt`

Dùng khi:
- state shared qua nhiều component/page
- cần orchestration/use-case rõ
- cần persistence/devtools/debug

### `@nuxt/image`

Dùng cho:
- media public
- card/list/detail image
- image cần tối ưu tải và SEO

### `@nuxtjs/i18n`

Mọi text mới ở page public hoặc flow chính phải đi theo i18n, không hardcode tràn lan thêm nữa.

## Thứ tự refactor

### Phase 0

Khóa nguyên tắc:
- không thêm debt theo kiểu cũ
- mọi code mới phải bám target architecture

### Phase 1

Làm mỏng route files:
- move page composition về `src/*/presentation/pages`

### Phase 2

Tách business/data ra khỏi `.vue`:
- move types
- move helper nghiệp vụ
- move mock data

### Phase 3

Tạo application layer:
- composables feature-level
- stores
- use cases

### Phase 4

Tạo infrastructure layer:
- repositories
- API/mock/storage adapters
- ACL

### Phase 5

Tối ưu lại:
- SEO
- SSR
- UI/UX
- i18n
- Nuxt Image

## Mẫu refactor

Mục đích phần này là cho team thấy pattern đích cần viết ra trông như thế nào.

### Mẫu 1: Thin route

Trước:

```vue
<script setup lang="ts">
// mock data, filter logic, seo, query parsing, submit flow đều nằm ở đây
</script>
```

Sau:

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

### Mẫu 2: Tách một page form-heavy

Ví dụ `new product`

```txt
src/product/
├─ domain/
│  ├─ aggregates/
│  │  └─ ProductDraft.ts
│  ├─ repositories/
│  │  └─ ProductRepository.ts
│  ├─ services/
│  │  └─ product-pricing.service.ts
│  └─ specifications/
│     └─ product-editor.specification.ts
├─ application/
│  ├─ composables/
│  │  └─ useProductEditor.ts
│  ├─ stores/
│  │  └─ productEditor.store.ts
│  └─ use-cases/
│     ├─ saveProductDraft.ts
│     └─ submitProduct.ts
├─ infrastructure/
│  ├─ persistence/
│  │  └─ product-editor.storage.ts
│  ├─ repositories/
│  │  └─ ProductRepositoryHttp.ts
│  └─ mocks/
│     └─ product.mock.ts
└─ presentation/
   ├─ components/
   │  ├─ ProductEditorFields.vue
   │  ├─ ProductMediaManager.vue
   │  └─ ProductPreviewCard.vue
   └─ pages/
      └─ NewProductPage.vue
```

### Mẫu 3: View / ViewModel / Model

Trong Vue/Nuxt:

```txt
View
- NewProductPage.vue
- ProductEditorFields.vue

ViewModel
- useProductEditor.ts
- productEditor.store.ts

Model
- ProductDraft aggregate
- ProductRepository contract
- ProductEditorSpecification
```

### Mẫu 4: Repository contract và implementation

Contract ở `domain`:

```ts
export interface ProductRepository {
  create(input: CreateProductInput): Promise<ProductRecord>
  update(id: string, input: UpdateProductInput): Promise<ProductRecord>
  getById(id: string): Promise<ProductRecord | null>
}
```

Implementation ở `infrastructure`:

```ts
export class ProductRepositoryHttp implements ProductRepository {
  async create(input: CreateProductInput) {
    // call API
  }
}
```

Điểm cần giữ:
- application layer chỉ biết `ProductRepository`
- không biết đang dùng HTTP, mock hay local storage

### Mẫu 5: ACL giữa hai context

Nếu `checkout` cần dùng dữ liệu từ `product`:

Sai:

```ts
import type { ProductDraftInternalThing } from "@/src/product/domain/internal"
```

Đúng:

```txt
src/checkout/infrastructure/acl/product.acl.ts
```

ACL sẽ map dữ liệu cần thiết từ `product` sang model mà `checkout` hiểu.

### Mẫu 6: Khi nào đưa vào shared-kernel

Đưa vào `shared-kernel`:
- `useDebouncedSearch`
- `usePersistedFilters`
- `ModalShell`
- `DrawerShell`
- `resolveI18nMessage`

Không đưa vào `shared-kernel`:
- `useProductEditorDraft`
- `community privacy option mapper`
- `funding donation summary`
- `job application draft`

### Mẫu 7: Refactor một file `types` đang bị trộn vai trò

Nếu một file như `types/community.ts` đang chứa:
- types
- constants
- mock data
- formatter
- route helper
- draft factory

Thì target phải tách như sau:

```txt
src/community/domain/types/
src/community/domain/services/
src/community/application/factories/
src/community/infrastructure/mocks/
src/community/application/mappers/
```

### Mẫu 8: Search/filter page đúng chuẩn

Với các page như `products`, `jobs`, `directory`, `funding`, `search`:

- `presentation`:
  - render input/select/button/card
- `application`:
  - giữ state filter
  - debounce
  - sync query
  - reset filter
- `infrastructure`:
  - mock/API fetch
- `domain`:
  - normalize value
  - validate filter options nếu cần

### Mẫu 9: Done output mong muốn

Một task refactor tốt nên để lại:
- route file mỏng hơn
- ít logic hơn trong `.vue`
- thêm ít nhất một composable/store application-level nếu flow đủ lớn
- mock/API không còn nằm lẫn trong page
- không tăng SSR risk
- không làm xấu SEO
- không làm mất i18n hiện có

## Thứ tự module ưu tiên

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

## Done criteria cho một module

Một bounded context được coi là refactor xong khi:
- route file mỏng
- UI không chứa business rule lớn
- domain tách khỏi framework
- repository contract và implementation tách riêng
- application layer sở hữu flow chính
- infrastructure chứa mock/API/storage
- dependency đúng chiều
- pass yêu cầu SEO/SSR/UI-UX

## Cách dùng tài liệu

Nếu team chỉ được chọn **1 file** để bám khi refactor, hãy dùng file này:
- [refactor-guide.md](/d:/Duong/src/laragon/www/demo.vnseea/client/doc/refactor-guide.md)

Khi cần chi tiết hơn:
- xem blueprint: [refactor-blueprint-ddd.md](/d:/Duong/src/laragon/www/demo.vnseea/client/doc/refactor-blueprint-ddd.md)
- xem inventory và backlog module: [product-editor-migration-status.md](/d:/Duong/src/laragon/www/demo.vnseea/client/doc/product-editor-migration-status.md)
