English description: Test cases for the community bounded context, covering group and page directories, detail flows, creation forms, and settings routes backed by Nuxt API bridges.

# Test Case Community

## Phạm vi

- Context: `client/src/community`
- Routes:
  - `/groups`
  - `/suggested-groups`
  - `/joined_groups`
  - `/pages`
  - `/suggested-pages`
  - `/liked-pages`
  - `/g/[name]`
  - `/p/[name]`
  - `/create-group`
  - `/create-page`
  - `/group-setting/[group]`
  - `/page-setting/[page]`
- Điểm vào chính:
  - `presentation/pages/GroupsPage.vue`
  - `presentation/pages/PagesDirectoryPage.vue`
  - `presentation/pages/GroupDetailPage.vue`
  - `presentation/pages/PageDetailPage.vue`
  - `infrastructure/repositories/ApiCommunityRepository.ts`
  - `server/api/community/*`
- Ngoài phạm vi:
  - Shared shell do Dev 1 sở hữu
  - Hành vi raw PHP endpoint ngoài bridge `/_api/*` của Nuxt

## Môi trường

- Nuxt direct: `http://127.0.0.1:3000`
- Laragon proxy: `http://v2.vnseea.test:8080`
- Nguồn session backend: PHP browser cookies
- API bridge:
  - `/_api/community/groups?mode=mine|joined|suggested`
  - `/_api/community/pages?mode=mine|favorite|suggested`
  - `/_api/community/groups/[slug]`
  - `/_api/community/pages/[slug]`
  - `/_api/community/pages/[slug]/posts`
  - `/_api/community/groups/[slug]/join`
  - `/_api/community/pages/[slug]/follow`

## Smoke

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `COMM-SMOKE-001` | `[ ]` | Hard reload trang danh sách nhóm | `/groups` | Trang render được, không lỗi Nuxt, không lặp shell, không vỡ asset. |
| `COMM-SMOKE-002` | `[ ]` | Hard reload trang danh sách trang | `/pages` | Trang render theo kiểu list-first, không còn dashboard/marketing hero. |
| `COMM-SMOKE-003` | `[ ]` | Điều hướng client giữa các tab nhóm | `/groups -> /suggested-groups -> /joined_groups` | Tab active đổi đúng, dữ liệu tab trước không bị giữ lại sai sang tab sau. |
| `COMM-SMOKE-004` | `[ ]` | Điều hướng client giữa các tab trang | `/pages -> /suggested-pages -> /liked-pages` | Tab active đổi đúng, CTA tạo trang vẫn hiển thị đúng. |

## Truy cập route

| ID | Status | Case | Điều kiện | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `COMM-ROUTE-001` | `[ ]` | Mở trực tiếp các route directory | User đã đăng nhập | Tất cả route directory render qua flow authenticated và giữ đúng tab active. |
| `COMM-ROUTE-002` | `[ ]` | Mở trực tiếp các route detail | Có `group` và `page` slug hợp lệ | `/g/[name]` và `/p/[name]` tải đúng entity thật, không dùng dữ liệu demo/fallback. |
| `COMM-ROUTE-003` | `[ ]` | Mở trực tiếp route settings | Tài khoản owner | `/group-setting/[group]` và `/page-setting/[page]` render đúng pane settings, không rơi vào shell rỗng. |
| `COMM-ROUTE-004` | `[ ]` | Visitor mở route settings của owner | Tài khoản không phải owner | Visitor bị chặn hoặc redirect an toàn, không được dùng UI settings của owner. |

## API và dữ liệu

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `COMM-API-001` | `[ ]` | Bridge nhóm của tôi | `/_api/community/groups?mode=mine` | Response cấp dữ liệu thật cho `/groups`, không còn card mẫu hardcode. |
| `COMM-API-002` | `[ ]` | Bridge nhóm gợi ý | `/_api/community/groups?mode=suggested` | Response đi từ flow suggested/recommended thật của backend, không tái dùng dataset joined groups. |
| `COMM-API-003` | `[ ]` | Bridge nhóm đã tham gia | `/_api/community/groups?mode=joined` | Response chỉ hiện nhóm đã tham gia và action label đúng với mode này. |
| `COMM-API-004` | `[ ]` | Bridge trang của tôi | `/_api/community/pages?mode=mine` | Response cấp dữ liệu thật cho `/pages`, không còn fake count hoặc placeholder copy. |
| `COMM-API-005` | `[ ]` | Bridge trang gợi ý | `/_api/community/pages?mode=suggested` | Response đi từ flow suggested/recommended thật, không dùng lại dataset my pages. |
| `COMM-API-006` | `[ ]` | Bridge trang đã thích | `/_api/community/pages?mode=favorite` | Response map đúng liked pages, không dùng nhầm data của mine hoặc suggested. |
| `COMM-API-007` | `[ ]` | Bridge detail và bài viết của trang | `/_api/community/pages/[slug]` và `/_api/community/pages/[slug]/posts` | Header info và feed post là dữ liệu thật từ backend, đã normalize trước khi `FeedPostCard` render. |
| `COMM-API-008` | `[ ]` | Trạng thái rỗng từ backend | Bất kỳ directory route nào không có bản ghi | Empty state nằm đúng trong vùng content chính, không tự chèn item mock/fallback. |
| `COMM-API-009` | `[ ]` | Trạng thái lỗi backend | Giả lập request `/_api/community/*` lỗi | User thấy error/empty state an toàn, không văng sang trang lỗi Nuxt chưa xử lý. |

## UI và UX

| ID | Status | Case | Viewport | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `COMM-UI-001` | `[ ]` | Parity directory nhóm | `>= 1024px` | Bố cục là heading -> tabs/CTA -> list. Không còn search bar, stat hero, marketing block thừa. |
| `COMM-UI-002` | `[ ]` | Parity directory trang | `>= 1024px` | Bố cục là heading -> tabs/CTA -> list. Không còn search, keyword filter, dashboard badge của UI cũ. |
| `COMM-UI-003` | `[ ]` | Card nhóm và trang | `>= 1024px` | Card là list row gọn, dùng title/meta/action thật; không còn summary giả hay badge giả. |
| `COMM-UI-004` | `[ ]` | Shell trang detail | `>= 1024px` | `/g/[name]` và `/p/[name]` giữ đúng thứ tự PHP: cover/hero -> nav/action row -> content trái -> sidebar phải. |
| `COMM-UI-005` | `[ ]` | Form create và settings | `>= 1024px` | Thứ tự field đúng theo flow PHP, không chèn hero/dashboard thừa phía trên form. |
| `COMM-UI-006` | `[ ]` | Mobile stacking | `390x844` | Directory và detail stack dọc đúng, không overflow, tab vẫn bấm được, CTA vẫn thấy rõ. |
| `COMM-UX-001` | `[ ]` | Trạng thái loading | Slow API | Skeleton hiển thị đúng ở list/detail, không lộ dữ liệu cũ của tab trước. |

## Lệnh kiểm tra

```powershell
cd client
npm run build
```

## Ghi chú

- Test cả `127.0.0.1:3000` và `v2.vnseea.test:8080` khi kiểm tra reload và proxy.
- Với các tab suggested, mở DevTools Network để xác nhận request vẫn đi qua `/_api/community/*`, không gọi trực tiếp PHP endpoint.
- Nếu title, summary, action label hoặc count của card bị lặp chung chung trên nhiều record, đánh fail và lưu lại payload của response `/_api/community/*` tương ứng.
