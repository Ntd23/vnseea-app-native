<!-- Description: Guides contributors to refactor the saved posts context to the intended Nuxt MVVM and DDD structure. -->

## Mục tiêu

Tài liệu này hướng dẫn cách sửa phần `saved` trong frontend Nuxt để đúng hơn với kiến trúc đang dùng của project:

- `app/pages/*` chỉ là route wrapper mỏng
- `src/saved/presentation/*` chỉ render UI
- `src/saved/application/*` giữ orchestration, async state, view-model
- `src/saved/domain/*` giữ type, contract, rule nghiệp vụ của saved
- `src/saved/infrastructure/*` gọi `/_api/*` qua repository hoặc adapter của saved

Phạm vi của tài liệu này gồm route:

- `/saved-posts`

## Kết luận nhanh

Phần `saved` đã có context riêng:

- `client/src/saved/presentation/pages/SavedPostsPage.vue`
- `client/src/saved/application/view-models/useSavedPostsPageVM.ts`
- `client/src/saved/TEST_CASE.md`

Nhưng chưa chuẩn hoàn toàn vì:

- `SavedPostsPage.vue` tự gọi `await fetchSavedPosts()`
- `SavedPostsPage.vue` tự set `useSeoMeta()`, trong khi route wrapper cũng set head
- `useSavedPostsPageVM.ts` import trực tiếp `feed/infrastructure/repositories/ApiFeedRepository`
- `saved/presentation` import trực tiếp `feed/presentation/components/PostCard.vue`
- còn file saved card/data mapper có dấu hiệu legacy hoặc chưa thống nhất runtime

## Hiện trạng cần sửa

### 1. `SavedPostsPage.vue` tự điều phối fetch

File:

- `client/src/saved/presentation/pages/SavedPostsPage.vue`

Vấn đề:

- page gọi `useSavedPostsPageVM()`
- sau đó tự gọi `await fetchSavedPosts()`
- như vậy presentation đang quyết định lifecycle load dữ liệu

Kết luận:

- fetch lifecycle nên nằm trong VM hoặc application composable
- presentation chỉ nên render `loading`, `errorMessage`, `posts` và gọi handler khi user tương tác

### 2. `SavedPostsPage.vue` tự giữ SEO

Files:

- `client/src/saved/presentation/pages/SavedPostsPage.vue`
- `client/app/pages/saved-posts.vue`

Vấn đề:

- route wrapper đang set title bằng `useHead()`
- presentation page lại gọi `useSeoMeta()`
- route-level metadata bị chia ở hai nơi

Kết luận:

- SEO nên nằm ở route wrapper
- presentation page không nên set route-level SEO

### 3. `saved` phụ thuộc trực tiếp vào internals của `feed`

Files:

- `client/src/saved/presentation/pages/SavedPostsPage.vue`
- `client/src/saved/application/view-models/useSavedPostsPageVM.ts`
- `client/src/saved/presentation/components/PostCard.vue`

Vấn đề:

- saved presentation import `../../../feed/presentation/components/PostCard.vue`
- saved VM import `../../../feed/infrastructure/repositories/ApiFeedRepository`
- context `saved` đang phụ thuộc sâu vào cả presentation và infrastructure của `feed`

Kết luận:

- đây là điểm lệch boundary lớn nhất
- nếu saved muốn dùng post data từ feed API, nên có repository/adapter riêng trong `saved/infrastructure`
- nếu saved muốn render feed post UI, nên dùng public component/API rõ ràng hoặc shared component đã được quyết định

### 4. File legacy chưa rõ vai trò

Files:

- `client/src/saved/application/composables/useSavedPostsData.ts`
- `client/src/saved/presentation/components/PostCard.vue`

Vấn đề:

- runtime chính hiện tại trong `SavedPostsPage.vue` render trực tiếp `FeedPostCard`
- mapper và saved `PostCard.vue` có thể không còn được dùng

Kết luận:

- cần quyết định giữ hay xóa
- nếu giữ, phải đưa runtime về dùng chúng một cách rõ ràng
- nếu không giữ, xóa sau khi search xác nhận không còn import

## Mục tiêu sau khi sửa

Sau khi refactor xong, phần `saved` nên đạt trạng thái sau:

- `app/pages/saved-posts.vue` là route wrapper mỏng và giữ SEO
- `SavedPostsPage.vue` không tự gọi `useSeoMeta()`
- `SavedPostsPage.vue` không tự `await fetch...` để khởi động data
- `useSavedPostsPageVM.ts` tự expose state đã load qua `useAsyncData()` hoặc application composable
- `saved/application` không import `feed/infrastructure/*`
- `saved/presentation` không import sâu vào `feed/presentation/*` nếu chưa có public/shared boundary
- file legacy không còn dùng thì xóa

## Cách sửa đề xuất

## Bước 1. Chuyển fetch lifecycle vào `useSavedPostsPageVM.ts`

File:

- `client/src/saved/application/view-models/useSavedPostsPageVM.ts`

VM nên tự quản lý việc load dữ liệu bằng `useAsyncData()` hoặc một composable application ổn định.

Ví dụ hướng sửa:

```ts
const { data, status, error, refresh } = useAsyncData(
  "saved:posts",
  () => repository.getSavedPosts({ limit: 20 }),
  {
    default: () => ({ posts: [] }),
  },
)

const loading = computed(() => status.value === "pending")
const posts = computed(() => data.value.posts)
const errorMessage = computed(() =>
  error.value ? t("pages.savedPostsPage.emptyDescription") : "",
)
```

Sau đó return:

```ts
return {
  loading,
  errorMessage,
  posts,
  refresh,
}
```

## Bước 2. Làm mỏng `SavedPostsPage.vue`

File:

- `client/src/saved/presentation/pages/SavedPostsPage.vue`

Page chỉ nên consume VM:

```ts
const { loading, errorMessage, posts, refresh } = useSavedPostsPageVM()
```

Xóa khỏi page:

- `await fetchSavedPosts()`
- `useSeoMeta()`
- mọi orchestration không phải render UI

Nếu có nút retry, page có thể gọi `refresh()` vì đó là user action.

## Bước 3. Chuyển SEO về `app/pages/saved-posts.vue`

File:

- `client/app/pages/saved-posts.vue`

Wrapper nên giữ:

- layout
- canonical
- title
- description
- Open Graph metadata
- robots nếu route này là private/auth-only

Ví dụ:

```ts
const route = useRoute()
const requestURL = useRequestURL()
const canonicalUrl = computed(() =>
  new URL(route.fullPath || appRoutes.savedPosts, requestURL.origin).toString(),
)

useSeoMeta({
  title: () => t("pages.savedPostsPage.seoTitle"),
  description: () => t("pages.savedPostsPage.seoDescription"),
  ogTitle: () => t("pages.savedPostsPage.seoTitle"),
  ogDescription: () => t("pages.savedPostsPage.seoDescription"),
  ogUrl: () => canonicalUrl.value,
  robots: "noindex, nofollow",
})
```

## Bước 4. Tạo repository riêng cho `saved`

Không để `useSavedPostsPageVM.ts` phụ thuộc trực tiếp:

- `feed/infrastructure/repositories/ApiFeedRepository`

Nên tạo các file:

- `client/src/saved/domain/repositories/SavedRepository.ts`
- `client/src/saved/infrastructure/repositories/ApiSavedRepository.ts`

Ví dụ contract:

```ts
import type { FeedPostRecord } from "../../../feed/domain/types/feed.types"

export type SavedPostsResult = {
  posts: FeedPostRecord[]
}

export interface SavedRepository {
  getSavedPosts(params?: { limit?: number, offset?: number }): Promise<SavedPostsResult>
}
```

Ví dụ implementation:

```ts
export function createApiSavedRepository(): SavedRepository {
  return {
    async getSavedPosts(params) {
      return await callApi<SavedPostsResult>(apiRoutes.feed.saved, {
        query: params,
      })
    },
  }
}
```

Ghi chú:

- endpoint có thể vẫn là `apiRoutes.feed.saved`
- ownership của repository vẫn nằm ở `saved/infrastructure`
- nếu muốn sạch hơn nữa, tạo DTO riêng cho saved thay vì expose thẳng `FeedPostRecord`

## Bước 5. Sửa boundary UI giữa `saved` và `feed`

Hiện tại `SavedPostsPage.vue` import trực tiếp:

- `client/src/feed/presentation/components/PostCard.vue`

Chọn một hướng rõ ràng:

1. Nếu `FeedPostCard` là component reusable toàn app, đưa nó qua shared/public UI boundary.
2. Nếu `FeedPostCard` thuộc riêng context feed, tạo `SavedPostCard` trong `saved/presentation/components` và map dữ liệu qua DTO của saved.
3. Nếu tạm thời vẫn dùng feed component, ghi rõ đây là transition debt trong guide/test case và không mở rộng thêm dependency mới.

Không nên để `saved` vừa import `feed/presentation` vừa import `feed/infrastructure`.

## Bước 6. Dọn legacy

Files cần kiểm tra:

- `client/src/saved/application/composables/useSavedPostsData.ts`
- `client/src/saved/presentation/components/PostCard.vue`

Nếu không còn import:

- xóa file
- cập nhật `client/src/saved/TEST_CASE.md` nếu test case còn nhắc behavior cũ

Nếu vẫn cần:

- đưa `SavedPostsPage.vue` về dùng `SavedPostCard`
- đảm bảo remove/unsave action có handler thật
- không render control chưa hoạt động

## Checklist review

Sau khi sửa, tự check các điểm sau:

- `client/app/pages/saved-posts.vue` có giữ SEO đầy đủ không
- `SavedPostsPage.vue` có còn `useSeoMeta()` không
- `SavedPostsPage.vue` có còn `await fetchSavedPosts()` không
- `useSavedPostsPageVM.ts` có còn import `feed/infrastructure/repositories/ApiFeedRepository` không
- có `SavedRepository` hoặc adapter riêng trong `src/saved` chưa
- `saved/presentation` có còn import trực tiếp `feed/presentation` không
- file `useSavedPostsData.ts` và `saved/presentation/components/PostCard.vue` còn được dùng thật không

## Dấu hiệu đạt chuẩn

Có thể xem là đạt chuẩn tương đối khi:

- route wrapper mỏng và giữ route metadata
- presentation page chỉ render state từ VM
- VM tự load saved posts qua repository của saved
- saved không phụ thuộc sâu vào infrastructure của feed
- UI dependency sang feed nếu còn tồn tại phải là public/shared boundary có chủ đích
- không còn file legacy không dùng

## Không nên làm

- không gọi raw PHP endpoint từ `.vue`
- không đưa fetch logic vào `app/pages/saved-posts.vue`
- không để presentation page tự khởi động data bằng `await fetch...`
- không import trực tiếp `feed/infrastructure/*` từ `saved/application/*`
- không import component presentation của context khác nếu chưa có public/shared decision
- không thêm mock/fallback mới để che lỗi boundary

## Route và API liên quan

UI route constants:

- `client/src/shared-kernel/application/constants/route-registry.ts`

Route cần dùng:

- `appRoutes.savedPosts`

API route hiện đang dùng:

- `apiRoutes.feed.saved`

Repository target nên nằm ở:

- `client/src/saved/infrastructure/repositories/ApiSavedRepository.ts`

## Thứ tự sửa khuyến nghị

Nên sửa theo thứ tự này để ít vỡ nhất:

1. tạo `SavedRepository` và `ApiSavedRepository`
2. sửa `useSavedPostsPageVM.ts`
3. sửa `SavedPostsPage.vue`
4. sửa `app/pages/saved-posts.vue`
5. quyết định boundary UI với `FeedPostCard`
6. dọn file legacy và cập nhật `TEST_CASE.md`

## Kết luận ngắn

Phần `saved` đã được tách thành context riêng, nhưng vẫn chưa sạch về boundary.

Ưu tiên lớn nhất là đưa repository ownership về `src/saved/infrastructure`, để VM tự load dữ liệu, và chuyển SEO về route wrapper. Sau đó mới xử lý việc còn dùng `FeedPostCard` trực tiếp hay tách thành UI public/shared.
