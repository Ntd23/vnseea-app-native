# Directory Context

Bounded context `directory` hiện đã chuyển runtime chính sang `src/directory/presentation/*`.

Đã làm:
- `app/pages/directory/index.vue` -> `src/directory/presentation/pages/DirectoryIndexPage.vue`
- `app/components/directory/*` -> `src/directory/presentation/components/*`
- `app/composables/useMockDirectoryData.ts` -> `src/directory/infrastructure/mocks/directoryCatalog.ts`

Trạng thái hiện tại:
- `app/pages/directory/index.vue` vẫn là route entry của Nuxt
- route file đã import thẳng `src/directory/presentation/pages/DirectoryIndexPage.vue`
- legacy `app/components/directory/*`, `app/components/pages/DirectoryIndexPage.vue`, `app/composables/useMockDirectoryData.ts` đã được xóa
