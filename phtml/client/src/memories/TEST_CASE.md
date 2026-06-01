English description: Test cases for the memories bounded context, covering the header, friendversary block, and memory post order backed by the memories feed bridge.

# Test Case Memories

## Phạm vi

- Context: `client/src/memories`
- Routes:
  - `/memories`
- Điểm vào chính:
  - `presentation/pages/MemoriesPage.vue`
  - `presentation/components/MemoryFeed.vue`
  - `feed/infrastructure/repositories/ApiFeedRepository.ts`
  - `server/api/feed/memories.get.ts`
- Ngoài phạm vi:
  - Memories logic ở backend PHP ngoài bridge `/_api/*`

## Môi trường

- Nuxt direct: `http://127.0.0.1:3000`
- Laragon proxy: `http://demo.vnseea.test:8080`
- Nguồn session backend: PHP browser cookies
- API bridge:
  - `/_api/feed/memories`

## Smoke

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `MEM-SMOKE-001` | `[ ]` | Hard reload route memories | `/memories` | Trang render được, không lỗi Nuxt, không vỡ section order. |
| `MEM-SMOKE-002` | `[ ]` | Điều hướng client tới memories | `/home -> /memories` | Route đổi mượt, không còn CTA/home feed hero thừa. |

## Truy cập route

| ID | Status | Case | Điều kiện | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `MEM-ROUTE-001` | `[ ]` | Mở trực tiếp route memories | User đã đăng nhập | `/memories` mở qua authenticated flow và tải đúng dữ liệu kỷ niệm. |
| `MEM-ROUTE-002` | `[ ]` | Back/forward navigation | Sau khi share/copy một memory | Khi quay lại, page vẫn ổn định và không nhân đôi item. |

## API và dữ liệu

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `MEM-API-001` | `[ ]` | Response thành công | `/_api/feed/memories` | Page render đúng `friends` và `posts` thật từ backend, không có friendversary mock hoặc copy cứng. |
| `MEM-API-002` | `[ ]` | Chỉ có friends hoặc chỉ có posts | `/_api/feed/memories` | Mỗi block hiển thị độc lập đúng thứ tự; thiếu một block không làm hỏng block còn lại. |
| `MEM-API-003` | `[ ]` | Response rỗng | `/_api/feed/memories` | Empty state xuất hiện khi cả `friends` và `posts` đều rỗng. |
| `MEM-API-004` | `[ ]` | Response lỗi | `/_api/feed/memories` | Có warning alert và không văng sang trang lỗi Nuxt. |

## UI và UX

| ID | Status | Case | Viewport | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `MEM-UI-001` | `[ ]` | Layout desktop | `>= 1024px` | Thứ tự là heading -> friendversary block -> memory posts block. Không còn CTA/home button hay stat card thừa. |
| `MEM-UI-002` | `[ ]` | Layout mobile | `390x844` | Các block stack dọc đúng thứ tự, không overflow. |
| `MEM-UX-001` | `[ ]` | Trạng thái loading | Slow API | Loading shell hiện trước khi dữ liệu về, không flash dữ liệu cũ. |

## Lệnh kiểm tra

```powershell
cd client
npm run build
```

## Ghi chú

- Xác nhận route chỉ gọi `/_api/feed/memories`.
- Nếu page vẫn hiện nút quay về bảng tin hoặc stat section riêng, đánh fail `MEM-UI-001`.
