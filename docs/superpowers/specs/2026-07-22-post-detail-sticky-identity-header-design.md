# Post Detail Sticky Identity Header Design

## Mục tiêu

Thay thanh điều hướng riêng của `PostDetailScreen` bằng phần nhận diện tác giả của post card, cố định ngay dưới top safe-area trong khi nội dung bài viết và bình luận cuộn bên dưới.

## Thiết kế

- Top safe-area và header dùng cùng một surface trắng; status bar dùng icon tối.
- Header cố định hiển thị avatar, tên tác giả, thời gian đăng, quyền riêng tư và nút ba chấm.
- Bấm avatar/tên mở profile. Nút ba chấm dùng `PostMenuActionSheet` và quyền `permissions.canDelete` giống Feed.
- Không hiển thị nút quay lại khi bài viết tồn tại; giữ edge-swipe hiện tại và Android system back.
- Trạng thái bài không tồn tại hoặc không có quyền xem vẫn có nút quay lại.
- Bài chữ/ảnh, video, thăm dò và sản phẩm dùng cùng header cố định. Card trong danh sách chỉ render phần nội dung, media, thống kê và action để không lặp header.
- Loading dùng skeleton ở vị trí header để tránh nhảy bố cục.

## Cấu trúc

- Export `PostIdentityHeader` và metadata helpers dùng chung từ Feed.
- Thêm tùy chọn `showIdentityHeader` mặc định `true` cho bốn card hiện có.
- `PostDetailScreen` render `PostIdentityHeader` ngoài `ReelCommentsSheet`, truyền `showIdentityHeader={false}` vào card trong list header.
- Menu thao tác gọi repository qua `usePostDetailViewModel`; xóa hoặc ẩn thành công quay về màn trước.

## Kiểm thử

- Source-contract test xác nhận header cố định nằm ngoài list, card body không lặp header và top safe-area cùng surface.
- Test đủ bốn card hỗ trợ ẩn header nhưng mặc định Feed vẫn hiển thị.
- Test menu dùng quyền xóa canonical và giữ swipe-back.
- Chạy Jest mục tiêu, TypeScript, ESLint phạm vi thay đổi và `git diff --check`.
