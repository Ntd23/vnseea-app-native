English description: Test cases for the reels bounded context, covering the minimal fullscreen reels viewer backed by the shared video feed bridge.

# Test Case Reels

## Phạm vi

- Context: `client/src/reels`
- Routes:
  - `/reels`
- Điểm vào chính:
  - `presentation/pages/ReelsPage.vue`
  - `feed/infrastructure/repositories/ApiFeedRepository.ts`
  - `server/api/feed/videos.get.ts`
- Ngoài phạm vi:
  - Story viewer trong home feed
  - Lightbox media viewer của context khác

## Môi trường

- Nuxt direct: `http://127.0.0.1:3000`
- Laragon proxy: `http://demo.vnseea.test:8080`
- Nguồn session backend: PHP browser cookies
- API bridge:
  - `/_api/feed/videos`

## Smoke

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `REEL-SMOKE-001` | `[ ]` | Hard reload route reels | `/reels` | Trang render được, không lỗi Nuxt, không trắng màn hình, không vỡ viewer. |
| `REEL-SMOKE-002` | `[ ]` | Điều hướng client tới reels | `/home -> /reels` | Route đổi mượt, không còn shell feed cũ hoặc block dashboard thừa. |

## Truy cập route

| ID | Status | Case | Điều kiện | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `REEL-ROUTE-001` | `[ ]` | Mở trực tiếp route reels | User đã đăng nhập | `/reels` mở qua authenticated flow và vào thẳng viewer. |
| `REEL-ROUTE-002` | `[ ]` | Back/forward navigation | Sau khi đã đổi nhiều reel | Khi quay lại, viewer vẫn ổn định và không lặp item. |

## API và dữ liệu

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `REEL-API-001` | `[ ]` | Response thành công | `/_api/feed/videos` | Viewer dùng dữ liệu video thật từ backend, không có reel mock hoặc ảnh cover giả lặp lại cho mọi item. |
| `REEL-API-002` | `[ ]` | Chỉ lấy reel/video hợp lệ | `/_api/feed/videos` | Reel active hiển thị media video thật khi có; không fallback sai sang avatar hoặc placeholder nếu post có video. |
| `REEL-API-003` | `[ ]` | Response rỗng | `/_api/feed/videos` | Trang hiện empty/error shell tối giản, không hiện sidebar hoặc card dashboard cũ. |
| `REEL-API-004` | `[ ]` | Response lỗi | `/_api/feed/videos` | Có thông báo lỗi an toàn, không văng sang trang lỗi Nuxt chưa xử lý. |

## UI và UX

| ID | Status | Case | Viewport | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `REEL-UI-001` | `[ ]` | Layout desktop | `>= 1024px` | Viewer fullscreen/tối giản là nội dung chính, không còn panel thông tin lớn hoặc list dashboard bên phải. |
| `REEL-UI-002` | `[ ]` | Chuyển reel | `>= 1024px` | Nút prev/next đổi đúng reel active, progress bar/dot cập nhật đúng. |
| `REEL-UI-003` | `[ ]` | Swipe mobile | `390x844` | Vuốt lên/xuống đổi reel đúng chiều, viewer vẫn full-height và không overflow. |
| `REEL-UX-001` | `[ ]` | Trạng thái loading | Slow API | Loading shell hiện trước khi video về, không flash dữ liệu cũ. |

## Lệnh kiểm tra

```powershell
cd client
npm run build
```

## Ghi chú

- Xác nhận route chỉ gọi `/_api/feed/videos`.
- Nếu viewer hiển thị ảnh cover thay vì video trong khi payload có `mediaItems[0].type = video`, đánh fail `REEL-API-002`.
