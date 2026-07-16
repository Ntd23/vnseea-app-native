# Android Feed Top Safe-Area Design

## Mục tiêu

Đặt toàn bộ Feed app bar Android bên dưới status bar hoặc camera cutout, giữ vùng status bar nền trắng và icon hệ thống tối. iOS không thay đổi.

## Nguyên nhân

Feed header Android là overlay `position: absolute`. Root `SafeAreaView` đang sở hữu top edge, nhưng padding của root không bảo vệ chắc chắn absolute overlay. Đồng thời `resolveFeedChromeTopInset()` cố tình trả `0` trên Android, nên bản thân header, chiều cao overlay và pull-to-refresh đều không nhận top inset.

## Thiết kế

- Header overlay là chủ sở hữu duy nhất của Android top inset.
- `resolveFeedChromeTopInset()` ưu tiên `useSafeAreaInsets().top`, sau đó `initialWindowMetrics.insets.top`; Android chỉ fallback bằng `StatusBar.currentHeight` khi initial metrics chưa có, còn giá trị `0` hợp lệ được giữ để tránh khoảng trống kép trên cửa sổ Android cũ chưa edge-to-edge. iOS tiếp tục fallback `47`.
- Android root `SafeAreaView` giữ left, right và bottom edges nhưng bỏ top edge để tránh cộng inset hai lần.
- `FeedHeader` chỉ dùng helper khi `FeedScreen` truyền `includeTopSafeArea`; mặc định prop này là `false` để các màn stack đã bọc `SafeAreaFeedHeader` không bị cộng inset hai lần.
- `FeedScreen` tiếp tục dùng cùng helper cho overlay height, list padding, refresh indicator và nút bài mới.
- `FeedHeaderCollapseFrame` giữ animation và cấu trúc absolute hiện tại.

## Kiểm thử

- Unit test helper trên Android với safe-area thật và fallback `StatusBar.currentHeight`.
- Unit test giữ iOS fallback hiện tại.
- Source-contract test xác nhận Android root không sở hữu top edge, overlay vẫn tính cả top inset và iOS branch không đổi.

## Ngoài phạm vi

- Không đổi màu hoặc kiểu status bar.
- Không sửa iOS Liquid Glass header, bottom tabs, Feed autoplay hoặc API.
- Không bọc Feed bằng `SafeAreaFeedHeader`.
