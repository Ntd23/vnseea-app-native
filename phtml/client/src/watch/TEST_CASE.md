English description: Test cases for the watch bounded context, covering the content-first video post list backed by the shared feed videos bridge.

# Test Case Watch

## Phạm vi

- Context: `client/src/watch`
- Routes:
  - `/watch`
- Điểm vào chính:
  - `presentation/pages/WatchPage.vue`
  - `feed/infrastructure/repositories/ApiFeedRepository.ts`
  - `server/api/feed/videos.get.ts`
- Ngoài phạm vi:
  - Reel viewer
  - Photo lightbox

## Môi trường

- Nuxt direct: `http://127.0.0.1:3000`
- Laragon proxy: `http://v2.vnseea.test:8080`
- Nguồn session backend: PHP browser cookies
- API bridge:
  - `/_api/feed/videos`

## Smoke

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `WATCH-SMOKE-001` | `[ ]` | Hard reload route watch | `/watch` | Trang render được, không lỗi Nuxt, không trắng trang, không vỡ card post. |
| `WATCH-SMOKE-002` | `[ ]` | Điều hướng client tới watch | `/home -> /watch` | Route đổi mượt, không còn filter/player/comments/related shell cũ. |

## Truy cập route

| ID | Status | Case | Điều kiện | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `WATCH-ROUTE-001` | `[ ]` | Mở trực tiếp route watch | User đã đăng nhập | `/watch` mở qua authenticated flow và hiển thị list video post. |
| `WATCH-ROUTE-002` | `[ ]` | Back/forward navigation | Sau khi load thêm post | Khi quay lại, list video vẫn ổn định, không lặp item. |

## API và dữ liệu

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `WATCH-API-001` | `[ ]` | Response thành công | `/_api/feed/videos` | UI render video post thật qua `FeedPostCard`, không có mock player/related video/comment cục bộ. |
| `WATCH-API-002` | `[ ]` | Load more | `/_api/feed/videos?afterPostId=...` | Bấm `load more` append đúng post mới, không nhân đôi item cũ. |
| `WATCH-API-003` | `[ ]` | Response rỗng | `/_api/feed/videos` | Empty state xuất hiện trong vùng content chính, không còn hero/filter shell cũ. |
| `WATCH-API-004` | `[ ]` | Response lỗi | `/_api/feed/videos` | Có warning alert và không văng sang trang lỗi Nuxt. |

## UI và UX

| ID | Status | Case | Viewport | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `WATCH-UI-001` | `[ ]` | Layout desktop | `>= 1024px` | Bố cục là heading -> list video post -> load more. Không còn player lớn, comments block, related sidebar. |
| `WATCH-UI-002` | `[ ]` | Layout mobile | `390x844` | List post stack dọc đúng, không overflow, nút load more vẫn bấm được. |
| `WATCH-UX-001` | `[ ]` | Trạng thái loading | Slow API | Loading shell hiện trước khi list render, không flash dữ liệu cũ. |

## Lệnh kiểm tra

```powershell
cd client
npm run build
```

## Ghi chú

- Route này dùng chung bridge `/_api/feed/videos` với reels, nên cần xác nhận payload thật bằng DevTools Network.
- Nếu trang vẫn còn component search/filter/category, đánh fail `WATCH-UI-001`.
