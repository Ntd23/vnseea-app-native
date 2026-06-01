English description: Documents the API-backed community bounded context and the current Nuxt migration boundaries.

# Community Context

Đây là bounded context `community` theo hướng:
- DDD ở cấp hệ thống
- MVVM ở tầng presentation/application

Phạm vi hiện tại của context này:
- group detail
- page detail
- group settings
- page settings
- groups directory
- pages directory
- create group
- create page

Mục tiêu của bước hiện tại:
- move runtime community khỏi `app/components/pages/*` sang `src/community/presentation/pages/*`
- tách `types / options / drafts / helpers` khỏi `types/community.ts`
- chỉ giữ lại các wrapper/phần legacy còn thật sự bị phụ thuộc để runtime hiện tại không vỡ

Mapping hiện tại:
- `app/composables/useCommunityGroupDetail.ts` -> `src/community/application/composables/useCommunityGroupDetail.ts`
- `app/composables/useCommunityPageDetail.ts` -> `src/community/application/composables/useCommunityPageDetail.ts`
- `types/community.ts` -> hiện chủ yếu còn phục vụ phần legacy `app/*`
- `src/community/domain/types/community.types.ts` -> community domain types
- `src/community/domain/constants/community-options.ts` -> option arrays, tabs, route maps, URL prefixes
- `src/community/domain/services/community-helpers.service.ts` -> helper/service thuần
- `src/community/application/factories/community-drafts.ts` -> draft factories

Nguyên tắc:
- `domain` giữ rule thuần như format count
- `application` giữ orchestration cho group/page detail
- `infrastructure` giữ repository và bridge đọc dữ liệu community từ backend
- `presentation` là runtime chính cho các page/community components đã migrate

Trạng thái chuyển tiếp:
- route files community trong `app/pages/*` hiện import thẳng `src/community/presentation/pages/*`
- legacy `app/components/community/*` đã được xóa hết
- `app/components/pages/ExplorePage.vue` đã import thẳng `src/community/presentation/components/PageCard.vue`
- legacy page wrappers của `community` trong `app/components/pages/*` đã được xóa
