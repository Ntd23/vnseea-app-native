English description: Test cases for the events bounded context, covering the backend-backed events directory, detail page, attendee lists, event post feed, and create-event flow.

# Test Case Events

## Phạm vi

- Context: `client/src/events`
- Routes:
  - `/events`
  - `/events/[id]`
  - `/events/create-event`
- Điểm vào chính:
  - `presentation/pages/EventsPage.vue`
  - `presentation/pages/EventDetailPage.vue`
  - `presentation/pages/CreateEventPage.vue`
  - `application/view-models/useEventsPageVM.ts`
  - `application/view-models/useEventDetailPageVM.ts`
  - `application/view-models/useCreateEventPageVM.ts`
  - `infrastructure/repositories/ApiEventsRepository.ts`
  - `server/api/events/*`
- Ngoài phạm vi:
  - Shared shell do Dev 1 sở hữu
  - PHP template cũ ngoài bridge `/_api/*`

## Môi trường

- Nuxt direct: `http://127.0.0.1:3000`
- Laragon proxy: `http://v2.vnseea.test:8080`
- Nguồn session backend: PHP browser cookies
- API bridge:
  - `/_api/events`
  - `/_api/events/[id]`
  - `/_api/events/[id]/posts`
  - `/_api/events/[id]/attendees?kind=going|interested`
  - `/_api/events/create`
  - `/_api/events/[id]/going`
  - `/_api/events/[id]/interested`

## Smoke

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `EVENT-SMOKE-001` | `[ ]` | Hard reload danh sách sự kiện | `/events` | Trang render được, không lỗi Nuxt, không còn card mock. |
| `EVENT-SMOKE-002` | `[ ]` | Chuyển tab danh sách sự kiện | `/events?tab=going`, `/events?tab=invited`, `/events?tab=interested`, `/events?tab=past`, `/events?tab=mine` | Tab active đổi đúng, dữ liệu theo từng bucket backend, không giữ nhầm dữ liệu tab trước. |
| `EVENT-SMOKE-003` | `[ ]` | Hard reload trang chi tiết sự kiện | `/events/[id]` | Hero, sidebar, attendee list và feed post render từ dữ liệu thật. |
| `EVENT-SMOKE-004` | `[ ]` | Hard reload form tạo sự kiện | `/events/create-event` | Form render đúng thứ tự field như phtml, không còn dữ liệu demo. |

## Truy cập route

| ID | Status | Case | Điều kiện | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `EVENT-ROUTE-001` | `[ ]` | Mở trực tiếp route danh sách | User đã đăng nhập | Route vào layout authenticated và hiển thị bucket mặc định `browse`. |
| `EVENT-ROUTE-002` | `[ ]` | Mở trực tiếp route detail hợp lệ | Có `id` sự kiện thật | `/events/[id]` hiển thị đúng cover, tiêu đề, ngày giờ, RSVP và post trong sự kiện. |
| `EVENT-ROUTE-003` | `[ ]` | Mở route detail không hợp lệ | `id` không tồn tại | Trang hiện empty/error state an toàn, không crash SSR. |
| `EVENT-ROUTE-004` | `[ ]` | Visitor chưa đăng nhập mở route event | Chưa có PHP session hợp lệ | Route bị chặn theo middleware authenticated hiện có, không lộ data riêng. |

## API và dữ liệu

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `EVENT-API-001` | `[ ]` | Bridge catalog sự kiện | `/_api/events` | Response có các bucket `browse`, `going`, `invited`, `interested`, `past`, `mine` từ backend `get-events`. |
| `EVENT-API-002` | `[ ]` | Bridge detail sự kiện | `/_api/events/[id]` | Response map đúng `cover`, `name`, `location`, `start/end`, `host`, `rsvpState`, `goingCount`, `interestedCount`. |
| `EVENT-API-003` | `[ ]` | Bridge attendee going | `/_api/events/[id]/attendees?kind=going` | Danh sách người đi lấy từ backend thật, không phải count hardcode. |
| `EVENT-API-004` | `[ ]` | Bridge attendee interested | `/_api/events/[id]/attendees?kind=interested` | Danh sách người quan tâm lấy từ backend thật. |
| `EVENT-API-005` | `[ ]` | Bridge feed post trong event | `/_api/events/[id]/posts` | Post list map qua `FeedPostCard`, chỉ hiện bài có `event_id` đúng với event đang mở. |
| `EVENT-API-006` | `[ ]` | Tạo RSVP going | `/_api/events/[id]/going` | Backend đổi trạng thái thật, count cập nhật lại sau refresh attendee list. |
| `EVENT-API-007` | `[ ]` | Tạo RSVP interested | `/_api/events/[id]/interested` | Backend đổi trạng thái thật, count cập nhật lại sau refresh attendee list. |
| `EVENT-API-008` | `[ ]` | Tạo sự kiện mới | `/_api/events/create` | Event mới được tạo thật ở backend, trả về event detail thật sau khi submit thành công. |
| `EVENT-API-009` | `[ ]` | Empty state post event | Event chưa có bài viết | `/_api/events/[id]/posts` trả mảng rỗng và UI hiện trạng thái rỗng đúng chỗ, không chèn fallback. |

## UI và UX

| ID | Status | Case | Viewport | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `EVENT-UI-001` | `[ ]` | Parity danh sách sự kiện | `>= 1024px` | Bố cục là heading -> tabs + CTA -> grid card sự kiện, không còn hero/stat block thừa. |
| `EVENT-UI-002` | `[ ]` | Card sự kiện | `>= 1024px` | Card hiển thị cover, date badge, location, title, host, count thật và action RSVP đúng với backend. |
| `EVENT-UI-003` | `[ ]` | Detail sự kiện | `>= 1024px` | Bố cục là cover hero -> action row -> cột trái nội dung/post -> cột phải info/attendee, bám phtml. |
| `EVENT-UI-004` | `[ ]` | Feed post trong detail | `>= 1024px` | Post render bằng `FeedPostCard`, click media/comment/reaction vẫn hoạt động như feed chung. |
| `EVENT-UI-005` | `[ ]` | Form tạo sự kiện | `>= 1024px` | Thứ tự field là tên -> địa điểm -> bắt đầu -> kết thúc -> mô tả -> ảnh bìa -> preview -> nút hành động. |
| `EVENT-UI-006` | `[ ]` | Mobile stacking | `390x844` | Tabs cuộn ngang được, card không vỡ, detail stack dọc đúng và form tạo sự kiện không overflow. |
| `EVENT-UX-001` | `[ ]` | Loading state | Slow API | Danh sách, detail và create route có skeleton/loading hợp lý, không lộ dữ liệu cũ sai context. |

## Lệnh kiểm tra

```powershell
cd client
npm run build
```

## Ghi chú

- Khi test `/_api/events/[id]/posts`, nên đối chiếu thêm với phtml `themes/wowonder/layout/events/content.phtml` để xác nhận event detail đã lấy feed theo `event_id`.
- Nếu RSVP bấm xong không đổi count, kiểm tra lại payload backend `go-to-event` hoặc `interest-event` trước khi sửa UI.
- Nếu form tạo sự kiện submit thành công nhưng ảnh bìa không lên, kiểm tra request multipart tới `/_api/events/create` và backend `create-event.php`.
