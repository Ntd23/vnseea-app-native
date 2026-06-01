English description: Manual QA checklist for buyer and seller order API bridge parity.

# Test case cho Orders

## ORDER-001: Tải lại `/orders`

- Mở trực tiếp `/orders` bằng hard reload.
- Kỳ vọng gọi `/_api/orders`.
- Kỳ vọng danh sách lấy từ PHP `market` với `type=purchased`, không dùng `buyerOrders.mock`.

## ORDER-002: Lọc và tìm kiếm order

- Dùng filter trạng thái và ô tìm kiếm.
- Kỳ vọng chỉ lọc trên dữ liệu thật đã tải về.
- Kỳ vọng không xuất hiện tên sản phẩm mock.

## ORDER-003: Chi tiết buyer order

- Mở `/order/[id]` với order hash thật.
- Kỳ vọng gọi `/_api/orders/[id]`.
- Kỳ vọng hiển thị item, tổng tiền, trạng thái, tracking và địa chỉ từ backend.

## ORDER-004: Đánh dấu đã nhận

- Với đơn đang shipped, nhấn nhận hàng.
- Kỳ vọng gọi `/_api/orders/[id]/received`.
- Kỳ vọng backend nhận `market type=change_status`, `status=delivered`.

## ORDER-005: Chi tiết seller order

- Mở `/customer_order/[id]`.
- Kỳ vọng gọi `/_api/customer-orders/[id]`.
- Kỳ vọng nếu backend không trả order cho quyền hiện tại thì hiển thị not found/error thật, không fallback mock.

## ORDER-006: Cập nhật trạng thái seller order

- Với seller order thật, cập nhật trạng thái.
- Kỳ vọng gọi `/_api/customer-orders/[id]/status`.
- Kỳ vọng payload map về trạng thái PHP hợp lệ: accepted, shipped, delivered hoặc canceled.

## ORDER-007: Mobile và desktop

- Kiểm tra `/orders`, `/order/[id]`, `/customer_order/[id]` ở 390px, 768px, 1280px.
- Kỳ vọng card, timeline, summary không vỡ layout và không có dữ liệu giả.
