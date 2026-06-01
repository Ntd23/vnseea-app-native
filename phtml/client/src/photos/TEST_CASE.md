English description: Test cases for the photos bounded context, covering the media-first photo grid and shared lightbox flow backed by the feed photos bridge.

# Test Case Photos

## Phạm vi

- Context: `client/src/photos`
- Routes:
  - `/photos`
- Điểm vào chính:
  - `presentation/pages/PhotosPage.vue`
  - `lightbox/presentation/components/LightboxModal.vue`
  - `feed/infrastructure/repositories/ApiFeedRepository.ts`
  - `server/api/feed/photos.get.ts`
- Ngoài phạm vi:
  - Feed post lightbox ngoài route `/photos`

## Môi trường

- Nuxt direct: `http://127.0.0.1:3000`
- Laragon proxy: `http://demo.vnseea.test:8080`
- Nguồn session backend: PHP browser cookies
- API bridge:
  - `/_api/feed/photos`

## Smoke

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `PHOTO-SMOKE-001` | `[ ]` | Hard reload route photos | `/photos` | Trang render được, không lỗi Nuxt, không trắng trang, không vỡ grid ảnh. |
| `PHOTO-SMOKE-002` | `[ ]` | Điều hướng client tới photos | `/home -> /photos` | Route đổi mượt, không còn hero stats, album strip, filter hoặc sidebar cũ. |

## Truy cập route

| ID | Status | Case | Điều kiện | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `PHOTO-ROUTE-001` | `[ ]` | Mở trực tiếp route photos | User đã đăng nhập | `/photos` mở qua authenticated flow và hiển thị grid ảnh. |
| `PHOTO-ROUTE-002` | `[ ]` | Back/forward navigation khi đang mở lightbox | Đã mở một ảnh | Khi quay lại, grid và lightbox state không gây lỗi route hoặc lỗi hydration. |

## API và dữ liệu

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `PHOTO-API-001` | `[ ]` | Response thành công | `/_api/feed/photos` | Grid dùng ảnh thật từ backend, không có stats/sidebar/album fake để lấp UI. |
| `PHOTO-API-002` | `[ ]` | Load more | `/_api/feed/photos?afterPostId=...` | Bấm `load more` append đúng ảnh mới, không lặp item cũ. |
| `PHOTO-API-003` | `[ ]` | Response rỗng | `/_api/feed/photos` | Empty state nằm trong vùng content chính, không còn layout gallery shell cũ. |
| `PHOTO-API-004` | `[ ]` | Response lỗi | `/_api/feed/photos` | Có warning alert và không văng sang trang lỗi Nuxt. |

## UI và UX

| ID | Status | Case | Viewport | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `PHOTO-UI-001` | `[ ]` | Layout desktop | `>= 1024px` | Bố cục là heading -> grid ảnh -> load more. Không còn hero stat, filter, sidebar, album cards. |
| `PHOTO-UI-002` | `[ ]` | Mở lightbox từ grid | `>= 1024px` | Click ảnh mở đúng item đã chọn, counter/index đúng theo thứ tự grid hiện tại. |
| `PHOTO-UI-003` | `[ ]` | Layout mobile | `390x844` | Grid 2 cột vẫn ổn định, không overflow, lightbox vẫn đọc được. |
| `PHOTO-UX-001` | `[ ]` | Trạng thái loading | Slow API | Loading shell hiện trước khi ảnh render, không flash dữ liệu cũ. |

## Lệnh kiểm tra

```powershell
cd client
npm run build
```

## Ghi chú

- Xác nhận route chỉ gọi `/_api/feed/photos`.
- Nếu còn xuất hiện quick links, creator ranking, hashtag sidebar, album strip hoặc stats cards, đánh fail `PHOTO-UI-001`.
