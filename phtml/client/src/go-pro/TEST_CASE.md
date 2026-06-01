English description: Manual QA checklist for the backend-backed go-pro context.

# TEST CASE - Go Pro

## GOPRO-001 - Hard reload `/go-pro`
- Mở `/go-pro` bằng reload trình duyệt.
- Kỳ vọng gọi `/_api/go-pro` và hiển thị các gói Pro đang bật trong backend.

## GOPRO-002 - Package list
- So sánh danh sách gói với admin/PHP `go-pro/content.phtml`.
- Kỳ vọng chỉ hiện gói có `status = 1`, không có plan mock.

## GOPRO-003 - Current plan
- Dùng tài khoản đang Pro.
- Kỳ vọng gói hiện tại có badge và nút bị khóa.

## GOPRO-004 - Upgrade
- Bấm thanh toán ở gói khác.
- Kỳ vọng gọi `POST /_api/go-pro/upgrade` với `type` thật của backend.

## GOPRO-005 - Currency
- Kiểm tra giá gói.
- Kỳ vọng format qua helper tiền tệ dùng chung, không nối cứng symbol và amount.

## GOPRO-006 - Empty/error state
- Tắt toàn bộ gói Pro trong backend.
- Kỳ vọng empty state hiển thị, không fallback sang gói giả.

## GOPRO-007 - Responsive
- Kiểm tra desktop và mobile.
- Kỳ vọng bảng/gói tự xếp lại, không có sidebar hoặc billing mock.
