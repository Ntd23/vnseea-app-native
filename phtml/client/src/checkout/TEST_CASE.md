English description: Manual QA checklist for checkout API bridge and PHP marketplace order parity.

# Test case cho Checkout

## CHECKOUT-001: Tải lại `/checkout`

- Mở trực tiếp `/checkout` bằng hard reload.
- Kỳ vọng dữ liệu giỏ hàng lấy từ `/_api/checkout/snapshot`.
- Kỳ vọng snapshot gọi PHP `market` với `type=checkout`, không dùng `checkoutSnapshot.mock`.

## CHECKOUT-002: Giỏ hàng trống

- Đảm bảo user không có sản phẩm trong cart.
- Mở `/checkout`.
- Kỳ vọng empty state hiển thị đúng, không có item giả.

## CHECKOUT-003: Lưu địa chỉ giao hàng

- Điền đủ họ tên, điện thoại, quốc gia, thành phố, mã bưu chính, địa chỉ.
- Nhấn lưu.
- Kỳ vọng gọi `/_api/checkout/address`.
- Kỳ vọng backend lưu qua `address.php` với `type=add`.
- Kỳ vọng snapshot nhận lại address id thật để dùng khi đặt hàng.

## CHECKOUT-004: Ví không đủ số dư

- Đặt cart có tổng tiền lớn hơn wallet thật.
- Nhấn mua.
- Kỳ vọng hiển thị cảnh báo thiếu tiền, không tự cộng tiền mock vào ví.

## CHECKOUT-005: Đặt hàng thành công

- Chuẩn bị cart thật, address thật, wallet đủ số dư.
- Nhấn mua.
- Kỳ vọng gọi `/_api/checkout/submit`.
- Kỳ vọng backend nhận `market type=buy` với `address_id`.
- Kỳ vọng order xuất hiện trong `/orders`.

## CHECKOUT-006: Lỗi validation backend

- Thử mua khi thiếu address id hoặc cart trống.
- Kỳ vọng lỗi backend hiển thị, không fake success.

## CHECKOUT-007: Mobile và desktop

- Kiểm tra `/checkout` ở 390px, 768px, 1280px.
- Kỳ vọng form và summary xếp đúng thứ tự, không có text “mock UI”.
