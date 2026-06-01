# Jobs Context

Bounded context `jobs` hiện đã chuyển runtime chính sang `src/jobs/presentation/*`.

Đã làm:
- `app/components/pages/JobsPage.vue` -> `src/jobs/presentation/pages/JobsPage.vue`
- `app/components/jobs/*` -> `src/jobs/presentation/components/*`

Trạng thái hiện tại:
- `app/pages/jobs.vue` vẫn là route entry của Nuxt
- `app/pages/jobs.vue` đã import thẳng `src/jobs/presentation/pages/JobsPage.vue`
- legacy child components trong `app/components/jobs/*` đã được xóa vì không còn runtime dependency
- legacy page wrapper `app/components/pages/JobsPage.vue` cũng đã được xóa
