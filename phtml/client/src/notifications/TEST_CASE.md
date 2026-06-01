English description: Manual QA checklist for backend-backed realtime notifications and header counters.

# TEST CASE - Notifications

## NOTI-001 - Reload không mất badge

- [ ] Đăng nhập và vào `/home`.
- [ ] Reload cứng trang.
- [ ] Kỳ vọng badge chuông, lời mời kết bạn, lời mời nhóm chat và tin nhắn lấy từ `/_api/navigation/general`, không bị về `0` sai dữ liệu.

## NOTI-002 - Dropdown notification hiển thị đủ type backend

- [ ] Tạo hoặc chuẩn bị các notification từ backend: like/reaction, comment/reply, share, mention, follow, story view, event, group/page, blog/forum, job, funding, wallet/bank, order/checkout, admin notification.
- [ ] Mở dropdown chuông.
- [ ] Kỳ vọng mỗi item dùng `type_text`, `url`, `icon`, `notifier`, `time_text` từ backend, không có text mock hoặc fallback giả.

## NOTI-003 - Mở bell không tự đánh dấu đã đọc

- [ ] Chuẩn bị ít nhất một notification chưa đọc.
- [ ] Mở dropdown chuông trong [HeaderBar.vue](../navigation/presentation/components/HeaderBar.vue).
- [ ] Kỳ vọng không gọi `/_api/notifications/read` và badge unread không giảm chỉ vì mở dropdown.
- [ ] Đóng rồi mở lại dropdown, notification chưa click vẫn còn trạng thái chưa đọc.

## NOTI-004 - Click từng notification mới đánh dấu đã đọc

- [ ] Chuẩn bị ít nhất một notification chưa đọc.
- [ ] Mở dropdown chuông và click trực tiếp vào một notification.
- [ ] Kỳ vọng gọi `/_api/notifications/read-one` với đúng `id`.
- [ ] Kỳ vọng chỉ notification vừa click được đánh dấu đã đọc, badge giảm đúng theo backend, sau đó điều hướng tới `url` của notification.
- [ ] Với notification dạng “admin phản ứng với bài đăng của bạn”, kỳ vọng click chuyển tới route bài viết `/post/{post_id}` hoặc URL bài viết mà backend trả về, không ở lại dropdown/header.

## NOTI-005 - Delete notification

- [ ] Mở dropdown chuông.
- [ ] Bấm xóa một notification.
- [ ] Kỳ vọng `/_api/notifications/delete` được gọi, item biến mất và badge giảm đúng nếu item đó chưa đọc.

## NOTI-006 - Realtime notification chung

- [ ] Mở user B trên web.
- [ ] Từ user A tạo hành động có gọi `Wo_RegisterNotification()` như comment, mention, donate funding, apply job hoặc send money.
- [ ] Kỳ vọng user B nhận socket event, Nuxt refetch `/_api/notifications` và `/_api/navigation/general`, badge/list cập nhật không cần reload.

## NOTI-007 - Friend request dropdown

- [ ] Từ user A gửi lời mời/follow request tới user B.
- [ ] Kỳ vọng header user B tăng badge request realtime.
- [ ] Mở dropdown request.
- [ ] Kỳ vọng list lấy từ `fetch=friend_requests`, hiển thị avatar, tên, username và nút accept/decline.
- [ ] Accept hoặc decline phải gọi `/_api/navigation/requests/action` và badge cập nhật.

## NOTI-008 - Group chat request count

- [ ] Tạo lời mời nhóm chat cho user B.
- [ ] Kỳ vọng header user B tăng badge request.
- [ ] Mở dropdown request.
- [ ] Kỳ vọng item nhóm chat hiển thị cùng list request và action accept/decline cập nhật count.

## NOTI-009 - Message badge realtime

- [ ] User A gửi tin nhắn cho user B khi user B đang mở web.
- [ ] Kỳ vọng badge message trên header user B cập nhật qua socket/polling.
- [ ] Bấm icon message phải đi tới `/messages`; không yêu cầu thread realtime trong pass này.

## NOTI-010 - Sound toggle

- [ ] Mở dropdown notification.
- [ ] Bấm nút âm thanh.
- [ ] Kỳ vọng gọi `/_api/notifications/sound`, backend cập nhật `notifications_sound`, UI đổi trạng thái bật/tắt âm.

## NOTI-011 - Marketplace/order notification realtime

- [ ] User A mua sản phẩm, thêm tracking, đổi trạng thái đơn hoặc gửi review.
- [ ] Kỳ vọng owner/buyer nhận realtime event, sau đó Nuxt refetch notification thật từ backend.
- [ ] Kỳ vọng dropdown hiển thị `new_orders`, `added_tracking`, `status_changed`, `new_review` bằng text/url/icon backend.

## NOTI-012 - Memory và video-ready notification

- [ ] Tạo điều kiện có memory trong ngày hoặc upload video cần xử lý ffmpeg.
- [ ] Kỳ vọng notification `memory` và `admin_notification/type2=ffmpeg` xuất hiện trong dropdown khi backend tạo.
- [ ] Nếu user đang mở web, badge cập nhật realtime hoặc bằng polling khi realtime service không chạy.

## NOTI-013 - Fallback khi realtime service tắt

- [ ] Tắt service `vnseea-realtime` hoặc bỏ `NUXT_PUBLIC_REALTIME_URL`.
- [ ] Reload trang.
- [ ] Kỳ vọng UI không crash, dropdown vẫn tải được danh sách và badge refresh bằng polling.

## NOTI-014 - Static boundary

- [ ] Chạy `rg -n "useNavigationGeneralStore|useNavigationRequestsStore" client/src/notifications -g "*.ts" -g "*.vue"`.
- [ ] Kỳ vọng notification context không import trực tiếp navigation store.
- [ ] Chạy `rg -n "useNuxtApiClient|\\$fetch|fetch\\(" client/src/navigation client/src/notifications -g "*.ts" -g "*.vue"`.
- [ ] Kỳ vọng chỉ `infrastructure/repositories/*` gọi Nuxt API client; component và store không gọi raw PHP endpoint.
