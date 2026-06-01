English description: Manual QA checklist for the backend-backed withdrawal route and request flow.

# TEST CASE - Withdrawal

## Phạm vi

Route chính: `/withdrawal`

API bridge bắt buộc:

- `GET /_api/withdrawal`
- `POST /_api/withdrawal/request`

## Trường hợp kiểm thử

| ID | Màn hình/API | Điều kiện | Bước kiểm thử | Kết quả mong đợi | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| WITHDRAW-001 | `/withdrawal` | Đã đăng nhập bằng cookie PHP hợp lệ | Hard reload trang | Trang hiển thị header, nút quay lại ví, balance block, form rút tiền, lịch sử thanh toán | [ ] |
| WITHDRAW-002 | `GET /_api/withdrawal` | Backend có cấu hình withdrawal | Gọi endpoint trong Network tab | Response có `balance`, `walletBalance`, `minimumAmount`, `methods`, `history`, không có dữ liệu mock | [ ] |
| WITHDRAW-003 | Cảnh báo dưới minimum | Balance nhỏ hơn `minimumAmount` | Mở trang | Hiển thị warning dưới mức rút tối thiểu và disable submit | [ ] |
| WITHDRAW-004 | Pending request | User đã có request pending | Mở trang | Hiển thị cảnh báo pending và không cho gửi thêm request | [ ] |
| WITHDRAW-005 | PayPal request success | Method PayPal bật, balance đủ | Chọn PayPal, nhập email hợp lệ, nhập amount, submit | Gọi `POST /_api/withdrawal/request`, backend trả success, history refresh | [ ] |
| WITHDRAW-006 | PayPal validation error | Method PayPal bật | Nhập email sai hoặc thiếu amount | Hiển thị lỗi từ backend/PHP handler | [ ] |
| WITHDRAW-007 | Bank request success | Bank withdrawal bật, balance đủ | Chọn bank, nhập IBAN/country/full name/swift/address/amount, submit | Backend tạo request payment với type bank | [ ] |
| WITHDRAW-008 | Bank validation error | Bank withdrawal bật | Bỏ trống một field bank bắt buộc, submit | Hiển thị lỗi validation từ backend | [ ] |
| WITHDRAW-009 | Custom method | Backend bật method khác PayPal/bank | Chọn method đó, nhập `Transfer To`, submit | Payload gửi đúng `transfer_to` qua `request_payment` | [ ] |
| WITHDRAW-010 | Payment history status | Có history pending/approved/declined | Mở trang | Badge trạng thái hiển thị đúng pending/approved/declined từ backend | [ ] |
| WITHDRAW-011 | Back to wallet | Đang ở `/withdrawal` | Bấm nút quay lại | Điều hướng về `/wallet` và có load indicator site-wide nếu shell đang hỗ trợ | [ ] |
| WITHDRAW-012 | Responsive desktop | Viewport >= 1280px | Mở trang | Form và lịch sử căn giữa, không có panel mock thừa | [ ] |
| WITHDRAW-013 | Responsive mobile | Viewport 390px | Mở trang và đổi method | Các field stack đúng, không overflow ngang | [ ] |

## Kiểm tra hồi quy

- [ ] `rg -n "useMockWithdrawalData|mock" client/src/withdrawal` không còn import runtime active.
- [ ] Không gọi PHP trực tiếp từ `.vue`; mọi request đi qua `/_api/withdrawal/*`.
- [ ] Không sửa `route-registry.ts`, `tokens.css`, `server/utils/**`.
