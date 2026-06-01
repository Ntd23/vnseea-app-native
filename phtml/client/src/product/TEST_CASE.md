English description: Manual QA checklist for product marketplace, product creation, and product editing API parity.

# Test case cho Product

## Phạm vi

Kiểm tra các route `/products`, `/my-products`, `/new-product`, `/edit-product/[id]` theo phtml marketplace và backend PHP thật.

## PROD-001: Tải lại `/products`

- Mở trực tiếp `/products` bằng hard reload.
- Kỳ vọng có skeleton trong lúc chờ API.
- Kỳ vọng danh sách sản phẩm lấy từ `/_api/product`, không dùng dữ liệu mock.
- Kỳ vọng ảnh sản phẩm thật hiển thị nếu backend trả ảnh.

## PROD-002: Tìm kiếm sản phẩm

- Nhập từ khóa vào ô tìm kiếm.
- Kỳ vọng route gọi lại `/_api/product` với keyword và danh sách lọc đúng nội dung backend trả về.
- Kỳ vọng không có hero/stat giả hoặc text mock trong kết quả.

## PROD-003: Bộ lọc danh mục và khoảng cách

- Chọn danh mục, khoảng cách và bật/tắt nearby.
- Kỳ vọng danh sách cập nhật ổn định, empty state chỉ hiện khi không có kết quả thật.

## PROD-004: Thêm vào giỏ hàng

- Nhấn “Thêm vào giỏ” trên một sản phẩm thật.
- Kỳ vọng gọi `/_api/product/cart`.
- Kỳ vọng backend thêm sản phẩm vào cart, sau đó `/checkout` thấy sản phẩm trong giỏ.
- Kỳ vọng lỗi backend được hiển thị, không có fake success.

## PROD-005: `/my-products`

- Mở `/my-products`.
- Kỳ vọng không hiển thị số liệu mock.
- Kỳ vọng nếu chưa có API bridge đầy đủ thì phải hiển thị trạng thái thiếu dữ liệu thật, không render fake product.

## PROD-006: `/new-product`

- Mở `/new-product`.
- Kỳ vọng không còn thông báo “mock success”.
- Kỳ vọng submit dùng backend thật hoặc trả lỗi validation thật từ backend.
- Kỳ vọng payload bám phtml: title, category, description, price, location, currency, units, images.

## PROD-007: `/edit-product/[id]`

- Mở một product id thật.
- Kỳ vọng form lấy dữ liệu backend thật.
- Kỳ vọng lưu thay đổi gọi backend thật, không lấy mock editor.

## PROD-008: Mobile và desktop

- Kiểm tra `/products` ở 390px, 768px, 1280px.
- Kỳ vọng grid, filter, card và CTA không vỡ layout.
