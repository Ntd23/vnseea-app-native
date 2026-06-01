English description: Test cases for the popular bounded context, covering the ranked popular feed route backed by the normalized feed API bridge.

# Test Case Popular

## Phạm vi

- Context: `client/src/popular`
- Routes:
  - `/popular`
- Điểm vào chính:
  - `presentation/pages/PopularPage.vue`
  - `feed/infrastructure/repositories/ApiFeedRepository.ts`
  - `server/api/feed/popular.get.ts`
- Ngoài phạm vi:
  - Logic xếp hạng của home feed ngoài route popular

## Môi trường

- Nuxt direct: `http://127.0.0.1:3000`
- Laragon proxy: `http://demo.vnseea.test:8080`
- Nguồn session backend: PHP browser cookies
- API bridge:
  - `/_api/feed/popular`

## Smoke

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `POPULAR-SMOKE-001` | `[ ]` | Hard reload trang popular | `/popular` | Trang render được, không lỗi Nuxt và không vỡ shell. |
| `POPULAR-SMOKE-002` | `[ ]` | Điều hướng client từ home sang popular | `/home -> /popular` | Route đổi đúng, không còn sót filter hoặc sidebar widget của home feed. |

## Truy cập route

| ID | Status | Case | Điều kiện | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `POPULAR-ROUTE-001` | `[ ]` | Mở trực tiếp route popular | User đã đăng nhập | `/popular` mở qua authenticated flow và giữ đúng heading của trang. |
| `POPULAR-ROUTE-002` | `[ ]` | Back/forward navigation | Sau khi đã đi qua trang có nhiều post | Khi quay lại, ranked feed list hiển thị sạch, không lặp content block. |

## API và dữ liệu

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `POPULAR-API-001` | `[ ]` | Response thành công | `/_api/feed/popular` | UI render bài viết thật từ backend với `FeedPostCard` chuẩn hóa, không dùng payload rút gọn hoặc hardcode. |
| `POPULAR-API-002` | `[ ]` | Parity comment/media | `/_api/feed/popular` | Post giữ đúng mapping comment, reaction, media, source như các route feed khác vì dùng shared mapper. |
| `POPULAR-API-003` | `[ ]` | Response rỗng | `/_api/feed/popular` | Empty state hiện trong vùng content chính, không có ranked item giả. |
| `POPULAR-API-004` | `[ ]` | Response lỗi | `/_api/feed/popular` | Có warning alert và không văng sang trang lỗi Nuxt chưa xử lý. |

## UI và UX

| ID | Status | Case | Viewport | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `POPULAR-UI-001` | `[ ]` | Layout desktop | `>= 1024px` | Bố cục là heading -> ranked post list. Không còn summary card, filter, sidebar widget của UI cũ. |
| `POPULAR-UI-002` | `[ ]` | Hiển thị thứ hạng | `>= 1024px` | Mỗi item có rank rõ ràng, `FeedPostCard` phía dưới vẫn render đủ nội dung post. |
| `POPULAR-UI-003` | `[ ]` | Layout mobile | `390x844` | Ranked card stack gọn, không overflow ngang. |
| `POPULAR-UX-001` | `[ ]` | Trạng thái loading | Slow API | Loading surface hiện trước khi post về và không flash dữ liệu cũ của route trước. |

## Lệnh kiểm tra

```powershell
cd client
npm run build
```

## Ghi chú

- Dùng DevTools Network để xác nhận trang chỉ gọi `/_api/feed/popular`.
- Nếu một post ở popular thiếu media/comments/reactions trong khi cùng post đó ở feed khác có đủ, so sánh payload `/_api/feed/popular` trước và đánh fail `POPULAR-API-002`.
