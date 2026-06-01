English description: Manual QA checklist for the backend-backed funding context.

# TEST CASE - Funding

## FUNDING-001 - Hard reload `/funding`
- Mở `/funding` bằng reload trình duyệt.
- Kỳ vọng trang hiển thị header Funding, tab danh sách, danh sách chiến dịch từ `/_api/funding`.
- Không hiển thị hero, stat, sidebar hoặc dữ liệu mock.

## FUNDING-002 - Tab Browse/My funding
- Bấm tab danh sách chính và tab chiến dịch của tôi.
- Kỳ vọng URL đổi `?tab=mine` khi xem của tôi, dữ liệu gọi lại backend thật.

## FUNDING-003 - Card campaign
- Kiểm tra ảnh, tiêu đề, người tạo, mô tả, số tiền đã gây quỹ và mục tiêu.
- Kỳ vọng số tiền dùng currency backend, không nối chuỗi cứng.

## FUNDING-004 - Load more
- Khi backend trả đủ số lượng trang đầu, bấm `Xem thêm`.
- Kỳ vọng append dữ liệu mới sau danh sách hiện tại, không reset tab.

## FUNDING-005 - Donate
- Bấm ủng hộ, nhập số tiền hợp lệ và gửi.
- Kỳ vọng gọi `POST /_api/funding/donate`, reload lại catalog sau khi thành công.

## FUNDING-006 - Detail `/show_fund/[id]`
- Mở một campaign từ danh sách.
- Kỳ vọng route gọi `/_api/funding/[id]`, hiển thị đúng ảnh, mô tả, số tiền và progress từ backend.

## FUNDING-007 - Create `/create_funding`
- Mở form tạo funding, nhập title, amount, description và upload ảnh.
- Kỳ vọng gọi `POST /_api/funding/create`, backend tạo campaign thật và điều hướng về `/funding?tab=mine`.

## FUNDING-008 - Empty state
- Dùng tài khoản không có chiến dịch ở tab của tôi.
- Kỳ vọng empty state chuẩn, không có campaign giả.

## FUNDING-009 - Responsive
- Kiểm tra desktop và mobile.
- Kỳ vọng card xếp 2 cột trên desktop, 1 cột trên mobile, tab kéo ngang không vỡ.
