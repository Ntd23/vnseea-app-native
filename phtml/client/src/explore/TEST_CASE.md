English description: Test cases for the explore bounded context, covering the media-first explore route and hashtag result route backed by feed API bridges.

# Test Case Explore

## Phạm vi

- Context: `client/src/explore`
- Routes:
  - `/explore`
  - `/hashtag/[tag]`
- Điểm vào chính:
  - `presentation/pages/ExplorePage.vue`
  - `presentation/pages/HashtagPage.vue`
  - `feed/infrastructure/repositories/ApiFeedRepository.ts`
  - `server/api/feed/explore.get.ts`
  - `server/api/feed/hashtag/[tag].get.ts`
- Ngoài phạm vi:
  - Hành vi của home feed
  - SEO của các bề mặt private ngoài 2 route này

## Môi trường

- Nuxt direct: `http://127.0.0.1:3000`
- Laragon proxy: `http://v2.vnseea.test:8080`
- Nguồn session backend: PHP browser cookies
- API bridge:
  - `/_api/feed/explore`
  - `/_api/feed/hashtag/[tag]`

## Smoke

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `EXP-SMOKE-001` | `[ ]` | Hard reload trang explore | `/explore` | Trang render được, không lỗi Nuxt, không trắng trang, không lặp layout block. |
| `EXP-SMOKE-002` | `[ ]` | Hard reload route hashtag | `/hashtag/test` | Trang render đúng heading hashtag và list bài viết, không bị hydration mismatch. |
| `EXP-SMOKE-003` | `[ ]` | Điều hướng client giữa explore và hashtag | `/explore -> /hashtag/test` | Route đổi mượt, tile cũ không bị giữ lại sai sau khi chuyển trang. |

## Truy cập route

| ID | Status | Case | Điều kiện | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `EXP-ROUTE-001` | `[ ]` | Mở trực tiếp route explore | User đã đăng nhập | `/explore` mở bình thường qua authenticated flow. |
| `EXP-ROUTE-002` | `[ ]` | Mở trực tiếp route hashtag hợp lệ | Hashtag có tồn tại | `/hashtag/[tag]` hiển thị kết quả đúng cho tag đó, không biến thành discovery feed chung. |
| `EXP-ROUTE-003` | `[ ]` | Mở trực tiếp route hashtag không có dữ liệu | Hashtag không tồn tại | Trang ổn định và hiện empty state đúng, không crash. |

## API và dữ liệu

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `EXP-API-001` | `[ ]` | Response thành công của explore | `/_api/feed/explore` | UI render media post thật từ backend; không còn summary card, fake people, fake page suggestion. |
| `EXP-API-002` | `[ ]` | Response rỗng của explore | `/_api/feed/explore` | Empty state thay thế grid ngay trong vùng content chính. |
| `EXP-API-003` | `[ ]` | Response lỗi của explore | `/_api/feed/explore` | Có warning alert và không văng sang trang lỗi Nuxt chưa xử lý. |
| `EXP-API-004` | `[ ]` | Response thành công của hashtag | `/_api/feed/hashtag/[tag]` | `FeedPostCard` render bài viết thật đã normalize cho tag được chọn; không còn related-tags block fallback. |
| `EXP-API-005` | `[ ]` | Response rỗng của hashtag | `/_api/feed/hashtag/[tag]` | Empty state hiển thị đúng tên hashtag hiện tại và không chèn thêm post mock. |
| `EXP-API-006` | `[ ]` | Đổi param hashtag | Điều hướng từ `/hashtag/tag-a` sang `/hashtag/tag-b` | Có request mới cho tag thứ hai và kết quả cũ không bị giữ lại. |

## UI và UX

| ID | Status | Case | Viewport | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `EXP-UI-001` | `[ ]` | Layout desktop của explore | `>= 1024px` | Bố cục content-first: heading -> media grid. Không còn stats, user list, dashboard section thừa. |
| `EXP-UI-002` | `[ ]` | Nội dung tile explore | `>= 1024px` | Mỗi tile hiện đúng media, author, time từ backend. Tile video phải có treatment video, không dùng ảnh placeholder sai. |
| `EXP-UI-003` | `[ ]` | Layout desktop của hashtag | `>= 1024px` | Bố cục là heading -> post list. Không còn chip related-tag hoặc stat block của UI cũ. |
| `EXP-UI-004` | `[ ]` | Layout mobile | `390x844` | Grid và post list stack đúng, không overflow, không cắt media. |
| `EXP-UX-001` | `[ ]` | Trạng thái loading | Slow API | Loading surface hiện trước khi dữ liệu về và không flash nội dung cũ của route trước. |

## Lệnh kiểm tra

```powershell
cd client
npm run build
```

## Ghi chú

- Dùng DevTools Network để xác nhận cả 2 route đều gọi `/_api/feed/*`, không gọi trực tiếp PHP.
- Nếu `/explore` xuất hiện lại block user/page/hashtag summary cũ, đánh fail vì phần đó đã bị loại bỏ để theo parity.
