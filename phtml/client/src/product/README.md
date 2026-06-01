# Product Sample Context

Đây là mẫu bounded context `product` theo hướng:
- DDD ở cấp hệ thống
- MVVM ở tầng presentation

Mục đích:
- làm mẫu tham chiếu và cũng là context đã được migrate runtime nhiều nhất
- runtime page chính của `product` hiện đã chuyển sang `src/product/presentation/pages/*`
- `app/pages/products.vue`, `my-products.vue`, `new-product.vue`, `edit-product/[id].vue` hiện import thẳng `src/product/presentation/pages/*`
- legacy child components trong `app/components/product/*` đã được xóa vì không còn runtime dependency
- legacy page wrappers trong `app/components/pages/*Product*.vue` cũng đã được xóa vì không còn cần

Mapping từ code hiện tại:
- `types/product-editor.ts` -> `domain/types/product-editor.types.ts`
- `app/composables/useProductEditorDraft.ts` -> `application/composables/useProductEditor.ts` + `infrastructure/persistence/product-editor.storage.ts`
- `app/components/product/*` -> `presentation/components/*` rồi đã được xóa khỏi legacy tree sau khi migrate
- `app/pages/new-product.vue` -> `presentation/pages/NewProductPage.vue`

Nguyên tắc:
- `domain` không import Vue/Nuxt
- `application` điều phối use case và state
- `infrastructure` lo persistence/repository implementation
- `presentation` chỉ render và gọi ViewModel
