# Refactor Sample: Product

Đây là mẫu refactor cụ thể đầu tiên.

Sample đã được scaffold tại:
- [client/src/product/README.md](/d:/Duong/src/laragon/www/demo.vnseea/client/src/product/README.md)
- [domain/types/product-editor.types.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/product/domain/types/product-editor.types.ts)
- [domain/repositories/ProductRepository.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/product/domain/repositories/ProductRepository.ts)
- [domain/specifications/product-editor.specification.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/product/domain/specifications/product-editor.specification.ts)
- [application/use-cases/create-product-draft.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/product/application/use-cases/create-product-draft.ts)
- [application/composables/useProductEditor.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/product/application/composables/useProductEditor.ts)
- [infrastructure/persistence/product-editor.storage.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/product/infrastructure/persistence/product-editor.storage.ts)
- [presentation/pages/NewProductPage.vue](/d:/Duong/src/laragon/www/demo.vnseea/client/src/product/presentation/pages/NewProductPage.vue)

## Ý nghĩa sample

Sample này chưa thay runtime hiện tại.

Nó chỉ để team thấy:
- file nào thuộc `domain`
- file nào thuộc `application`
- file nào thuộc `infrastructure`
- file nào thuộc `presentation`

## Mapping từ code cũ

Từ:
- `client/types/product-editor.ts`
- `client/app/composables/useProductEditorDraft.ts`
- `client/app/components/pages/NewProductPage.vue`

Sang:
- `src/product/domain/*`
- `src/product/application/*`
- `src/product/infrastructure/*`
- `src/product/presentation/*`

## Cách đọc sample

### `domain`

- `types/product-editor.types.ts`
  - shape nghiệp vụ của draft và record

- `repositories/ProductRepository.ts`
  - contract, không phụ thuộc implementation

- `specifications/product-editor.specification.ts`
  - validate và completion rule thuần

### `application`

- `use-cases/create-product-draft.ts`
  - tạo draft mới hoặc draft từ record

- `composables/useProductEditor.ts`
  - ViewModel cho màn editor
  - giữ `draft`, `status`, `validation`, `persistDraft`

### `infrastructure`

- `persistence/product-editor.storage.ts`
  - local storage adapter

### `presentation`

- `presentation/pages/NewProductPage.vue`
  - chỉ render state từ ViewModel
  - không chứa business rule validate

## Next step nếu áp vào runtime thật

1. tạo route wrapper mỏng trong `app/pages/new-product.vue`
2. move dần UI thật từ `app/components/pages/NewProductPage.vue` sang `src/product/presentation/pages/NewProductPage.vue`
3. move dần `app/components/product/*` sang `src/product/presentation/components/*`
4. thay `useProductEditorDraft.ts` cũ bằng application + infrastructure split
