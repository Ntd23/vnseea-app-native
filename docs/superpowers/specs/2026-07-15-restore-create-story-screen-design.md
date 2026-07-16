# Khôi phục giao diện tạo Story

## Mục tiêu

Khôi phục nguyên bản giao diện `CreateStoryScreen` ngay trước commit
`c01db415d53c2790945356730197a54d938cff16`, đồng thời không hoàn tác các
thay đổi Ví, Auth, Blog hoặc backend nằm chung trong commit đó.

## Phạm vi

- Chỉ thay đổi `src/stories/presentation/screens/CreateStoryScreen.tsx`.
- Nguồn khôi phục là snapshot `c01db415^` (`075a4d40`), có nội dung Story
  tương đương commit `e099648b`.
- Giữ nguyên `useCreateStoryViewModel`, repository, API tạo Story,
  `storyCreatedEvents` và toast thông báo thành công.
- Không thay đổi màn xem Story, danh sách Story hoặc backend.

## Giao diện được khôi phục

- Header gồm nút đóng, tiêu đề "Tạo tin" và nút "Đăng".
- Trạng thái chưa chọn media có hai lựa chọn riêng cho ảnh và video.
- Trạng thái đã chọn media hiển thị preview lớn với `resizeMode="contain"`.
- Ô tiêu đề và mô tả chỉ xuất hiện sau khi chọn media.
- Giữ banner thông tin Story tồn tại trong 24 giờ và top safe-area.
- Nút đăng bị vô hiệu hóa khi dữ liệu chưa hợp lệ và hiển thị loading khi upload.

## Cách thực hiện

Khôi phục riêng file từ Git snapshot thay vì revert toàn bộ commit. Sau khi
khôi phục, bổ sung source-contract test để khóa các đặc điểm giao diện cũ và
ngăn một merge sau này vô tình đưa form "Tạo trạng thái mới" trở lại.

## Kiểm tra

- Test xác nhận có hai picker ảnh/video riêng.
- Test xác nhận header dùng "Tạo tin" và nút "Đăng".
- Test xác nhận preview dùng `contain`, không dùng form upload hỗn hợp hiện tại.
- Chạy Jest liên quan Story, TypeScript, ESLint file thay đổi và
  `git diff --check`.

## Ngoài phạm vi

- Không thay đổi schema/API Story.
- Không chỉnh thiết kế màn xem Story.
- Không đụng file Xcode project đang có thay đổi cục bộ.
