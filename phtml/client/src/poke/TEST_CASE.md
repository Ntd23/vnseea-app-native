English description: Test cases for the poke bounded context, covering the backend-backed poke request list and action flow in PHP order.

# Test Case Poke

## Phạm vi

- Context: `client/src/poke`
- Routes:
  - `/poke`
- Điểm vào chính:
  - `presentation/pages/PokePage.vue`
  - `presentation/components/RequestCard.vue`
  - `feed/infrastructure/repositories/ApiFeedRepository.ts`
  - `server/api/feed/poke.get.ts`
  - `server/api/feed/poke.post.ts`
- Ngoài phạm vi:
  - Message page sau khi poke

## Môi trường

- Nuxt direct: `http://127.0.0.1:3000`
- Laragon proxy: `http://v2.vnseea.test:8080`
- Nguồn session backend: PHP browser cookies
- API bridge:
  - `/_api/feed/poke`

## Smoke

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `POKE-SMOKE-001` | `[ ]` | Hard reload route poke | `/poke` | Trang render được, không lỗi Nuxt, không trắng trang, không vỡ list card. |
| `POKE-SMOKE-002` | `[ ]` | Điều hướng client tới poke | `/home -> /poke` | Route đổi mượt, không còn hero/pending strip/dashboard cũ. |

## Truy cập route

| ID | Status | Case | Điều kiện | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `POKE-ROUTE-001` | `[ ]` | Mở trực tiếp route poke | User đã đăng nhập | `/poke` mở qua authenticated flow và hiển thị danh sách poke thật. |
| `POKE-ROUTE-002` | `[ ]` | Back/forward navigation | Sau khi poke back hoặc remove một item | Page vẫn ổn định và không hiện lại item đã bị remove nếu state đã cập nhật. |

## API và dữ liệu

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `POKE-API-001` | `[ ]` | Response thành công của danh sách | `GET /_api/feed/poke` | UI render danh sách poke thật, không có card mock hoặc số pending hardcode. |
| `POKE-API-002` | `[ ]` | Poke back | `POST /_api/feed/poke` với action `create` | Bấm poke back gọi API thành công và item chuyển đúng trạng thái `pokedBack`. |
| `POKE-API-003` | `[ ]` | Remove poke | `POST /_api/feed/poke` với action `remove` | Item bị xóa khỏi list sau khi API thành công. |
| `POKE-API-004` | `[ ]` | Response rỗng | `GET /_api/feed/poke` | Empty state nằm trong vùng content chính, không còn strip hoặc card thống kê thừa. |
| `POKE-API-005` | `[ ]` | Response lỗi | `GET/POST /_api/feed/poke` | Có warning alert và không văng sang trang lỗi Nuxt. |

## UI và UX

| ID | Status | Case | Viewport | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `POKE-UI-001` | `[ ]` | Layout desktop | `>= 1024px` | Bố cục là heading -> list card hoặc empty state. Không còn pending strip, CTA messages, hero description. |
| `POKE-UI-002` | `[ ]` | Layout mobile | `390x844` | Card stack dọc đúng, không overflow, action button vẫn bấm được. |
| `POKE-UX-001` | `[ ]` | Trạng thái loading | Slow API | Loading shell hiện trước khi list render, không flash dữ liệu cũ. |

## Lệnh kiểm tra

```powershell
cd client
npm run build
```

## Ghi chú

- Xác nhận route dùng `GET /_api/feed/poke` và action dùng `POST /_api/feed/poke`.
- Nếu page vẫn còn pending strip hoặc nút mở messages trên đầu, đánh fail `POKE-UI-001`.
