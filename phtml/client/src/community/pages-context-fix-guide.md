<!-- Description: Guides contributors to refactor the community pages context to the intended Nuxt MVVM and DDD structure. -->


## Mục tiêu

Tài liệu này hướng dẫn cách sửa phần `pages` trong frontend Nuxt để đúng hơn với kiến trúc đang dùng của project:

- `app/pages/*` chỉ là route wrapper mỏng
- `src/community/presentation/*` chỉ render UI
- `src/community/application/*` giữ orchestration, state màn hình, view-model
- `src/community/domain/*` giữ type, service, rule, helper nghiệp vụ
- `src/community/infrastructure/*` gọi `/_api/*` qua repository

Phạm vi của tài liệu này gồm các route:

- `/pages`
- `/suggested-pages`
- `/liked-pages`
- `/create-page`
- `/p/[name]`
- `/page-setting/[page]`

## Hiện trạng cần sửa

### 1. `PagesDirectoryPage.vue` chưa đúng MVVM

File:

- `client/src/community/presentation/pages/PagesDirectoryPage.vue`

Vấn đề:

- page đang tự `createApiCommunityRepository()`
- page đang tự `useAsyncData()`
- page đang tự `watchDebounced()` và sync query `q`
- page đang tự giữ logic search, count, tab state

Trong khi project đã có view-model:

- `client/src/community/application/view-models/useCommunityPagesDirectoryVM.ts`

Kết luận:

- `presentation` đang làm việc của `application`

### 2. `PageSettingPage.vue` còn lệch nặng hơn

File:

- `client/src/community/presentation/pages/PageSettingPage.vue`

Vấn đề:

- page đang tự `createApiCommunityRepository()`
- page đang tự gọi `useCommunityPageDetail()`
- page đang giữ `draft`, `saveState`, `useStorage`, `watchDebounced`
- page đang tự validate và tự đồng bộ preview

Trong khi project đã có view-model:

- `client/src/community/application/view-models/useCommunityPageSettingPageVM.ts`

Kết luận:

- `PageSettingPage.vue` cần bị làm mỏng lại, chỉ consume VM

### 3. `useCommunityPageDetailPageVM.ts` có bug

File:

- `client/src/community/application/view-models/useCommunityPageDetailPageVM.ts`

Vấn đề:

- VM tạo `username`
- nhưng cuối file lại `return slug`
- route wrapper `client/app/pages/p/[name].vue` đang destructure `{ page, slug }`

Kết luận:

- cần thống nhất: hoặc dùng `slug`, hoặc dùng `name`
- cách sạch nhất là expose một computed rõ nghĩa, ví dụ `pageSlug`

### 4. Route wrapper `page-setting/[page].vue` chưa đủ mỏng

File:

- `client/app/pages/page-setting/[page].vue`

Vấn đề:

- route wrapper đang tự gọi `useCommunityPageDetail()`
- như vậy route wrapper fetch dữ liệu, trong khi page runtime bên dưới cũng fetch tiếp

Kết luận:

- wrapper chỉ nên:
  - set layout
  - set SEO
  - render presentation page

Nếu cần dữ liệu SEO, nên lấy từ VM hoặc từ một composable application thống nhất, tránh fetch chồng chéo.

### 5. Repository còn để log debug

File:

- `client/src/community/infrastructure/repositories/ApiCommunityRepository.ts`

Vấn đề:

- còn `console.log`
- còn `console.error`

Kết luận:

- xóa log debug nếu không còn cần thiết

## Mục tiêu sau khi sửa

Sau khi refactor xong, phần `pages` nên đạt trạng thái sau:

- `app/pages/*` không chứa business logic
- `presentation/pages/*` không tự tạo repository
- `presentation/pages/*` không tự fetch data nếu đã có VM tương ứng
- query sync, draft restore, validation, submit state nằm ở `application/view-models/*`
- repository chỉ nằm ở `infrastructure/repositories/*`
- route path dùng `appRoutes`
- API path dùng `apiRoutes`

## Cách sửa đề xuất

## Bước 1. Sửa `PagesDirectoryPage.vue`

Thay vì giữ toàn bộ logic trong page, chỉ để lại:

- import component con
- import VM
- destructure state từ VM

Nên chuyển page về dạng:

```ts
const {
  mode,
  search,
  pending,
  visiblePages,
  tabItems,
  actionLabel,
  filterStatusLabel,
} = useCommunityPagesDirectoryVM(() => props.mode)
```

Sau đó xóa khỏi page:

- `createApiCommunityRepository()`
- `useAsyncData()`
- `useStorage()`
- `watchDebounced()`
- `router.replace({ query })`
- mọi computed phục vụ riêng cho orchestration

## Bước 2. Sửa `PageSettingPage.vue`

Page này nên tiêu thụ trực tiếp:

- `useCommunityPageSettingPageVM.ts`

Mọi state sau phải đi từ VM trả về:

- `page`
- `previewPage`
- `draft`
- `activeTab`
- `settingsNavItems`
- `statusAlert`
- `isBusy`
- `isSaveDisabled`
- `selectedCategoryLabel`
- `followerCountLabel`
- `likeCountLabel`
- `selectedCtaLabel`
- `enabledPolicies`
- `totalPolicies`
- `pagePath`
- `validateDraft`
- `handleSave`
- `handleSaveError`

Page không nên tự giữ lại:

- `repository`
- `useCommunityPageDetail()`
- `draftStorage`
- `syncDraftFromPage()`
- `normalizeDraft()`
- `isSameDraft()`
- `watchDebounced()`

Nếu UI cần thêm state mới, thêm nó ở VM trước, không nhét ngược vào page.

## Bước 3. Sửa bug ở `useCommunityPageDetailPageVM.ts`

Việc cần làm:

1. thống nhất tên param route
2. trả về đúng biến đang dùng trong route wrapper

Ví dụ sạch hơn:

```ts
const pageSlug = computed(() => String(route.params.name || ""))
```

và cuối file:

```ts
return {
  ...,
  pageSlug,
}
```

Sau đó route wrapper `client/app/pages/p/[name].vue` dùng:

```ts
const { page, pageSlug } = useCommunityPageDetailPageVM()
```

Không nên để tình trạng:

- tạo `username`
- nhưng return `slug`
- route wrapper đọc một tên khác

## Bước 4. Làm mỏng `app/pages/page-setting/[page].vue`

Wrapper lý tưởng chỉ nên:

- import page thật từ `src/community/presentation/pages/PageSettingPage.vue`
- set `definePageMeta`
- set canonical URL
- set SEO

Nếu cần SEO title từ page name:

- ưu tiên dùng VM hoặc composable application ổn định
- tránh tự fetch một luồng riêng ở wrapper nếu page bên dưới đã fetch cùng dữ liệu

Nếu chưa gom được ngay, tối thiểu phải bảo đảm:

- không duplicate fetch vô ích
- không tạo thêm state nghiệp vụ ở wrapper

## Bước 5. Dọn repository

File:

- `client/src/community/infrastructure/repositories/ApiCommunityRepository.ts`

Việc cần làm:

- xóa `console.log`
- xóa `console.error`
- giữ method gọn, chỉ map request/response

Repository không nên chứa:

- debug UI
- toast
- router
- query sync

## Checklist review

Sau khi sửa, tự check các điểm sau:

- `client/app/pages/pages.vue` có còn chỉ là wrapper mỏng không
- `client/app/pages/p/[name].vue` có còn gọi đúng VM không
- `client/app/pages/page-setting/[page].vue` có fetch chồng chéo không
- `PagesDirectoryPage.vue` có còn `createApiCommunityRepository()` không
- `PageSettingPage.vue` có còn `useStorage`, `watchDebounced`, `repository` không
- `useCommunityPageDetailPageVM.ts` có còn trả nhầm `slug` không
- `ApiCommunityRepository.ts` có còn log debug không

## Dấu hiệu đạt chuẩn

Có thể xem là đạt chuẩn tương đối khi:

- route wrapper mỏng
- presentation page chỉ render state đã được chuẩn bị
- state màn hình đi từ VM
- repository chỉ gọi API
- domain helper không chạm UI

## Không nên làm

- không gọi backend trực tiếp từ `.vue`
- không đưa logic fetch ngược về `app/pages/*`
- không duplicate cùng một state ở page và VM
- không thêm mock/fallback mới để che lỗi kiến trúc
- không hardcode route string nếu đã có trong `route-registry.ts`

## Route và API liên quan

UI route constants:

- `client/src/shared-kernel/application/constants/route-registry.ts`

Những route cần dùng:

- `appRoutes.pages`
- `appRoutes.suggestedPages`
- `appRoutes.likedPages`
- `appRoutes.createPage`
- `appRoutes.pageDetail(slug)`
- `appRoutes.pageSetting(slug)`

API route constants:

- `apiRoutes.community.pages`
- `apiRoutes.community.pageBySlug(slug)`
- `apiRoutes.community.pagePosts(slug)`
- `apiRoutes.community.pageFollow(slug)`

## Thứ tự sửa khuyến nghị

Nên sửa theo thứ tự này để ít vỡ nhất:

1. `useCommunityPageDetailPageVM.ts`
2. `PagesDirectoryPage.vue`
3. `PageSettingPage.vue`
4. `app/pages/page-setting/[page].vue`
5. dọn `ApiCommunityRepository.ts`

## Kết luận ngắn

Phần `pages` hiện không phải sai hoàn toàn.

Nó đã có:

- route đúng nơi
- repository đúng layer
- VM đã tồn tại cho phần lớn màn hình

Nhưng vẫn còn hai màn hình lớn chưa chịu dùng VM đúng cách:

- `PagesDirectoryPage.vue`
- `PageSettingPage.vue`

Đây là hai chỗ nên ưu tiên refactor trước nếu muốn nói phần `pages` đã chuẩn MVVM / DDD.
