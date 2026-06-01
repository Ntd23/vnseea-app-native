English description: Test cases for the saved bounded context, covering the saved-posts route backed by the real feed saved bridge without fallback cards.

# Test Case Saved

## Phạm vi

- Context: `client/src/saved`
- Routes:
  - `/saved-posts`
- Điểm vào chính:
  - `presentation/pages/SavedPostsPage.vue`
  - `feed/infrastructure/repositories/ApiFeedRepository.ts`
  - `server/api/feed/saved.get.ts`
- Ngoài phạm vi:
  - Logic save/unsave được kích hoạt từ context khác

## Môi trường

- Nuxt direct: `http://127.0.0.1:3000`
- Laragon proxy: `http://demo.vnseea.test:8080`
- Nguồn session backend: PHP browser cookies
- API bridge:
  - `/_api/feed/saved`

## Smoke

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `SAVED-SMOKE-001` | `[ ]` | Hard reload trang saved posts | `/saved-posts` | Trang render được, không lỗi Nuxt, không trắng trang, không lệch layout. |
| `SAVED-SMOKE-002` | `[ ]` | Điều hướng client sang saved posts | `/home -> /saved-posts` | Route đổi đúng, không còn hero hoặc feed filter cũ bám lại trên màn hình. |

## Truy cập route

| ID | Status | Case | Điều kiện | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `SAVED-ROUTE-001` | `[ ]` | Mở trực tiếp route saved posts | User đã đăng nhập | `/saved-posts` mở qua authenticated flow và giữ đúng heading saved. |
| `SAVED-ROUTE-002` | `[ ]` | Back/forward navigation | Sau khi đã xem các route feed khác | Khi quay lại, danh sách saved render sạch, không lặp card hoặc giữ empty state sai. |

## API và dữ liệu

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `SAVED-API-001` | `[ ]` | Response thành công | `/_api/feed/saved` | UI render saved posts thật qua `FeedPostCard`; không còn custom fallback card hoặc mock data cục bộ. |
| `SAVED-API-002` | `[ ]` | Response rỗng | `/_api/feed/saved` | Empty state nằm đúng trong vùng content chính, không tự chèn placeholder post. |
| `SAVED-API-003` | `[ ]` | Response lỗi | `/_api/feed/saved` | Có warning alert và không văng sang trang lỗi Nuxt chưa xử lý. |
| `SAVED-API-004` | `[ ]` | Parity dữ liệu feed | `/_api/feed/saved` | Saved post giữ đúng media, author, reactions, comments và action state từ normalized feed mapper. |

## UI và UX

| ID | Status | Case | Viewport | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `SAVED-UI-001` | `[ ]` | Layout desktop | `>= 1024px` | Bố cục là heading -> saved post list. Không còn hero/stat/removal toolbar của UI cũ. |
| `SAVED-UI-002` | `[ ]` | Layout mobile | `390x844` | Card stack dọc đúng, không overflow, empty state vẫn dễ đọc. |
| `SAVED-UX-001` | `[ ]` | Trạng thái loading | Slow API | Loading surface hiện trước khi card render và không flash danh sách cũ của lần truy cập trước. |

## Lệnh kiểm tra

```powershell
cd client
npm run build
```

## Ghi chú

- Dùng DevTools Network để xác nhận trang chỉ gọi `/_api/feed/saved`.
- Nếu trang vẫn còn custom remove-all control hoặc UI card không phải `FeedPostCard`, đánh fail `SAVED-UI-001` vì route này đã được đưa về content-first shell theo PHP.
