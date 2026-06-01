<!-- Description: Guides contributors to refactor the community groups context to the intended Nuxt MVVM and DDD structure. -->

## Mục tiêu

Tài liệu này hướng dẫn cách sửa phần `groups` trong frontend Nuxt để đúng hơn với kiến trúc đang dùng của project:

- `app/pages/*` chỉ là route wrapper mỏng
- `src/community/presentation/*` chỉ render UI
- `src/community/application/*` giữ orchestration, state màn hình, view-model
- `src/community/domain/*` giữ type, service, rule, helper nghiệp vụ
- `src/community/infrastructure/*` gọi `/_api/*` qua repository

Phạm vi của tài liệu này gồm các route:

- `/groups`
- `/suggested-groups`
- `/joined_groups`
- `/create-group`
- `/g/[name]`
- `/group-setting/[group]`

## Kết luận nhanh

Phần `groups` đã chuẩn hơn phần `pages` hiện tại.

Nó đã có:

- route listing là wrapper mỏng
- `GroupsPage.vue` consume `useCommunityGroupsPageVM`
- `CreateGroupPage.vue` consume `useCommunityCreateGroupPageVM`
- `GroupSettingPage.vue` consume `useCommunityGroupSettingPageVM`
- repository nằm ở `community/infrastructure`

Nhưng vẫn còn các điểm cần sửa:

- route wrapper `/g/[name]` đang tự tạo detail VM, trong khi page runtime cũng tạo VM
- route wrapper `/group-setting/[group]` đang tự fetch group detail, trong khi settings VM cũng fetch
- `GroupSettingPage.vue` còn import/destructure state không dùng
- `CreateGroupPage.vue` còn destructure state không dùng

## Hiện trạng cần sửa

### 1. `app/pages/g/[name].vue` tạo duplicate VM

File:

- `client/app/pages/g/[name].vue`

Vấn đề:

- route wrapper đang gọi `useCommunityGroupDetailPageVM()`
- page thật `client/src/community/presentation/pages/GroupDetailPage.vue` cũng gọi `useCommunityGroupDetailPageVM()`
- VM này gọi `useCommunityGroupDetail()` và giữ action state như join/invite

Kết luận:

- wrapper chưa đủ mỏng
- có nguy cơ fetch duplicate group detail và group posts
- action state ở wrapper là state thừa, không phục vụ route metadata một cách sạch sẽ

### 2. `app/pages/group-setting/[group].vue` fetch chồng chéo

File:

- `client/app/pages/group-setting/[group].vue`

Vấn đề:

- route wrapper đang gọi `useCommunityGroupDetail()`
- `GroupSettingPage.vue` gọi `useCommunityGroupSettingPageVM()`
- VM lại gọi `useCommunityGroupDetail()`

Kết luận:

- wrapper fetch group detail chỉ để lấy SEO title/description
- page runtime bên dưới fetch cùng dữ liệu lần nữa
- đây là pattern giống lỗi của `page-setting/[page].vue`

### 3. `GroupSettingPage.vue` còn state dư

File:

- `client/src/community/presentation/pages/GroupSettingPage.vue`

Vấn đề:

- import `CommunityGroupSettingsSidebar` nhưng không dùng
- destructure `selectedPrivacyDescription`, `settingsNavItems`, `isSaveDisabled`, `visibleMembers` nhưng template hiện không dùng đầy đủ
- template có submit button nhưng chưa dùng `isSaveDisabled`

Kết luận:

- page đã đúng hướng vì consume VM
- cần dọn state chết hoặc render lại đúng UI nếu các state đó vẫn có ý nghĩa sản phẩm

### 4. `CreateGroupPage.vue` còn state dư

File:

- `client/src/community/presentation/pages/CreateGroupPage.vue`

Vấn đề:

- destructure `draftRestored`
- destructure `highlights`
- template hiện không dùng hai giá trị này

Kết luận:

- không sai kiến trúc lớn
- nhưng nên dọn để presentation chỉ nhận state thật sự render

## Mục tiêu sau khi sửa

Sau khi refactor xong, phần `groups` nên đạt trạng thái sau:

- `app/pages/*` không chứa business logic
- route wrapper không gọi VM có action state
- route wrapper không fetch cùng dữ liệu mà page runtime đã fetch
- `presentation/pages/*` chỉ consume VM và render UI
- state màn hình nằm ở `application/view-models/*`
- repository chỉ nằm ở `infrastructure/repositories/*`
- route path dùng `appRoutes`
- API path dùng `apiRoutes`

## Cách sửa đề xuất

## Bước 1. Làm mỏng `app/pages/g/[name].vue`

Wrapper lý tưởng chỉ nên:

- import page thật từ `src/community/presentation/pages/GroupDetailPage.vue`
- set `definePageMeta`
- set canonical URL
- set SEO fallback ổn định
- render presentation page

Xóa khỏi wrapper:

- `useCommunityGroupDetailPageVM()`
- destructure `{ group, slug }`
- metadata phụ thuộc trực tiếp vào group detail runtime

Cách sửa ít rủi ro:

```ts
const route = useRoute()
const requestURL = useRequestURL()
const slug = computed(() => String(route.params.name || ""))

const canonicalUrl = computed(() =>
  new URL(appRoutes.groupDetail(slug.value), requestURL.origin).toString(),
)
```

Sau đó dùng fallback metadata:

```ts
useSeoMeta({
  title: () => `${t("pages.groupDetailPage.seoFallbackTitle")} | VNSEEA`,
  description: () => t("pages.groupDetailPage.seoFallbackDescription"),
  ogTitle: () => `${t("pages.groupDetailPage.seoFallbackTitle")} | VNSEEA`,
  ogDescription: () => t("pages.groupDetailPage.seoFallbackDescription"),
  ogUrl: () => canonicalUrl.value,
})
```

Nếu sau này bắt buộc cần SEO title từ group thật, hãy tách một application composable chỉ đọc SEO-safe summary và dùng chung cache key rõ ràng. Không dùng VM detail có join/invite state trong wrapper.

## Bước 2. Làm mỏng `app/pages/group-setting/[group].vue`

Wrapper nên bỏ:

- import `useCommunityGroupDetail`
- `const { group } = useCommunityGroupDetail(...)`
- SEO title/description phụ thuộc `group.value`

Wrapper chỉ cần noindex và canonical:

```ts
const route = useRoute()
const requestURL = useRequestURL()
const slug = computed(() => String(route.params.group || ""))

const canonicalUrl = computed(() =>
  new URL(appRoutes.groupSetting(slug.value), requestURL.origin).toString(),
)
```

SEO nên dùng bản ổn định:

```ts
useSeoMeta({
  title: () => `${t("community.settings.eyebrow")} | VNSEEA`,
  description: () => t("community.settings.desc"),
  ogTitle: () => `${t("community.settings.eyebrow")} | VNSEEA`,
  ogDescription: () => t("community.settings.desc"),
  ogUrl: () => canonicalUrl.value,
  robots: "noindex, nofollow",
})
```

Lý do:

- đây là trang settings, không cần index
- không đáng fetch group detail chỉ để đổi title động
- page thật đã có VM fetch và render nội dung

## Bước 3. Dọn `GroupSettingPage.vue`

File:

- `client/src/community/presentation/pages/GroupSettingPage.vue`

Việc cần làm:

- xóa import `CommunityGroupSettingsSidebar` nếu không render sidebar
- xóa destructure `selectedPrivacyDescription`, `settingsNavItems`, `visibleMembers` nếu không dùng
- dùng `isSaveDisabled` cho nút submit nếu rule này đã có trong VM

Nút save nên có:

```vue
<UButton
  type="submit"
  :loading="isBusy"
  :disabled="isSaveDisabled"
>
```

Nếu không muốn disable nút save, xóa `isSaveDisabled` khỏi VM return để tránh state chết.

## Bước 4. Dọn `CreateGroupPage.vue`

File:

- `client/src/community/presentation/pages/CreateGroupPage.vue`

Nếu không render restored/highlights thì đổi destructure thành:

```ts
const { draft, submitState, isSubmitDisabled, handleCreateGroup, appRoutes } = useCommunityCreateGroupPageVM()
```

Hoặc nếu muốn parity với create page:

- đưa `draftRestored` và `highlights` vào component header/form đúng pattern đang có
- không để VM trả state mà page không dùng

## Checklist review

Sau khi sửa, tự check các điểm sau:

- `client/app/pages/g/[name].vue` có còn gọi `useCommunityGroupDetailPageVM()` không
- `client/app/pages/group-setting/[group].vue` có còn gọi `useCommunityGroupDetail()` không
- `GroupDetailPage.vue` có là nơi duy nhất tạo detail VM cho runtime không
- `GroupSettingPage.vue` có còn import/destructure state không dùng không
- `CreateGroupPage.vue` có còn destructure state không dùng không
- route constants có dùng `appRoutes.groupDetail()` và `appRoutes.groupSetting()` không
- API route vẫn đi qua repository trong `community/infrastructure` không

## Dấu hiệu đạt chuẩn

Có thể xem là đạt chuẩn tương đối khi:

- route wrapper mỏng
- detail/settings chỉ fetch ở page runtime hoặc application composable dùng chung rõ ràng
- presentation page chỉ render state đã được VM chuẩn bị
- action state như join/invite/save không tồn tại trong route wrapper
- không còn import chết hoặc state chết trong page components

## Không nên làm

- không gọi backend trực tiếp từ `.vue`
- không đưa fetch logic ngược về `app/pages/*`
- không gọi VM có action state trong route wrapper chỉ để lấy SEO
- không duplicate cùng một API request ở wrapper và page runtime
- không thêm mock/fallback mới để che lỗi kiến trúc
- không hardcode route string nếu đã có trong `route-registry.ts`

## Route và API liên quan

UI route constants:

- `client/src/shared-kernel/application/constants/route-registry.ts`

Những route cần dùng:

- `appRoutes.groups`
- `appRoutes.suggestedGroups`
- `appRoutes.joinedGroups`
- `appRoutes.createGroup`
- `appRoutes.groupDetail(slug)`
- `appRoutes.groupSetting(slug)`

API route constants:

- `apiRoutes.community.groups`
- `apiRoutes.community.groupBySlug(slug)`
- `apiRoutes.community.groupPosts(slug)`
- `apiRoutes.community.groupJoin(slug)`

## Thứ tự sửa khuyến nghị

Nên sửa theo thứ tự này để ít vỡ nhất:

1. `app/pages/group-setting/[group].vue`
2. `app/pages/g/[name].vue`
3. `GroupSettingPage.vue`
4. `CreateGroupPage.vue`

## Kết luận ngắn

Phần `groups` hiện không sai hoàn toàn.

Nó đã có VM và repository đúng layer cho phần lớn màn hình. Điểm cần ưu tiên là làm mỏng route wrapper để tránh duplicate fetch/VM, sau đó dọn state không dùng trong presentation.
