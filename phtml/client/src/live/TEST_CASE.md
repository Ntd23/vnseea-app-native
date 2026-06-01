English description: Manual QA coverage for the backend-backed LiveKit host studio route at /live.

# Live TEST CASE

## Phạm vi

- Context: `client/src/live`
- Route chính: `/live`
- Nguồn dữ liệu: `/_api/live/*` bridge -> `xhr/live.php`
- Provider: LiveKit host studio

## Ma trận kiểm thử

- [ ] `LIVE-001` - Hard reload `/live`
  - Tiền điều kiện: User đã đăng nhập hợp lệ.
  - Bước thực hiện:
    1. Truy cập trực tiếp `/live`.
    2. Hard reload trình duyệt.
  - Kết quả mong đợi:
    1. Route không render catalog mock cũ.
    2. UI hiển thị studio 3 cột: setup trái, stage giữa, activity phải.
    3. Request đi qua `/_api/live/bootstrap`.

- [ ] `LIVE-002` - User chưa đăng nhập vào `/live`
  - Tiền điều kiện: Xóa cookie phiên đăng nhập.
  - Bước thực hiện:
    1. Mở trực tiếp `/live`.
  - Kết quả mong đợi:
    1. Route redirect về `/welcome`.
    2. Không có runtime crash ở frontend.

- [ ] `LIVE-003` - `live_video` hoặc `can_use_live` bị tắt
  - Tiền điều kiện: Backend tắt config live hoặc tắt quyền `can_use_live`.
  - Bước thực hiện:
    1. Mở `/live`.
  - Kết quả mong đợi:
    1. Studio không tự bắt đầu live.
    2. Hiển thị alert bị chặn tương ứng.
    3. Nút phát trực tiếp bị disable.

- [ ] `LIVE-004` - LiveKit backend chưa sẵn sàng
  - Tiền điều kiện: Thiếu `livekit_host`, `livekit_api_key`, hoặc `livekit_api_secret`.
  - Bước thực hiện:
    1. Mở `/live`.
  - Kết quả mong đợi:
    1. Bootstrap trả trạng thái bị chặn.
    2. UI hiển thị alert `LiveKit backend chưa sẵn sàng`.

- [ ] `LIVE-005` - User đang có live đang chạy
  - Tiền điều kiện: Tạo một live active khác của cùng user trong backend.
  - Bước thực hiện:
    1. Mở `/live`.
  - Kết quả mong đợi:
    1. Bootstrap trả `blockedReason = live_already_running`.
    2. UI hiển thị cảnh báo đúng.

- [ ] `LIVE-006` - Bootstrap thành công
  - Tiền điều kiện: LiveKit cấu hình đúng, user được phép live.
  - Bước thực hiện:
    1. Mở `/live`.
    2. Kiểm tra network `/_api/live/bootstrap`.
  - Kết quả mong đợi:
    1. Response có `streamName`, `roomName`, `wsUrl`, `token`.
    2. Host info hiển thị đúng avatar, tên, note.

- [ ] `LIVE-007` - Enumerate camera và microphone
  - Tiền điều kiện: Máy có camera/microphone.
  - Bước thực hiện:
    1. Cho phép quyền camera và microphone.
    2. Bấm `Kết nối camera`.
  - Kết quả mong đợi:
    1. Danh sách camera và microphone được nạp vào select.
    2. Preview local xuất hiện ở stage giữa.

- [ ] `LIVE-008` - Từ chối quyền camera hoặc microphone
  - Tiền điều kiện: Chặn quyền camera hoặc microphone trong trình duyệt.
  - Bước thực hiện:
    1. Mở `/live`.
    2. Bấm `Kết nối camera`.
  - Kết quả mong đợi:
    1. UI hiển thị lỗi preview rõ ràng.
    2. Không bị crash route.

- [ ] `LIVE-009` - Tạo live thành công
  - Tiền điều kiện: Preview local đã sẵn sàng.
  - Bước thực hiện:
    1. Nhập tiêu đề, mô tả, quyền riêng tư.
    2. Bấm `Phát trực tiếp`.
  - Kết quả mong đợi:
    1. Gọi `/_api/live/create`.
    2. Sau đó join LiveKit room host thành công.
    3. UI chuyển sang trạng thái `Đang phát`.
    4. Có `postId` và `postUrl`.

- [ ] `LIVE-010` - Lưu đúng title, description, privacy vào post live
  - Tiền điều kiện: Tạo live mới.
  - Bước thực hiện:
    1. Điền title / description / privacy khác mặc định.
    2. Tạo live.
    3. Mở link bài viết live.
  - Kết quả mong đợi:
    1. Tiêu đề và mô tả hiển thị đúng ở bài viết.
    2. Privacy của post phản ánh giá trị đã chọn.

- [ ] `LIVE-011` - Heartbeat cập nhật activity và counters
  - Tiền điều kiện: Live đang chạy.
  - Bước thực hiện:
    1. Dùng user khác comment vào post live.
    2. Dùng user khác vào xem rồi rời buổi live.
  - Kết quả mong đợi:
    1. Gọi `/_api/live/heartbeat` định kỳ.
    2. Cột phải cập nhật comment mới.
    3. Event joined / left xuất hiện.
    4. Viewer count, reactions, shares, clips cập nhật theo backend.

- [ ] `LIVE-012` - Heartbeat báo offline
  - Tiền điều kiện: Live đang chạy.
  - Bước thực hiện:
    1. Kết thúc live từ backend hoặc từ tab khác.
    2. Chờ một chu kỳ heartbeat.
  - Kết quả mong đợi:
    1. `stillLive` chuyển sang `offline`.
    2. UI hiện trạng thái kết thúc.
    3. Preview room bị disconnect ở frontend.

- [ ] `LIVE-013` - Kết thúc live thành công
  - Tiền điều kiện: Live đang chạy.
  - Bước thực hiện:
    1. Bấm `Kết thúc video trực tiếp`.
  - Kết quả mong đợi:
    1. Gọi `/_api/live/end`.
    2. Room LiveKit bị disconnect.
    3. Studio quay lại setup state.
    4. Bootstrap được làm mới lại.

- [ ] `LIVE-014` - Upload thumbnail trước khi tạo live
  - Tiền điều kiện: Có file ảnh hợp lệ.
  - Bước thực hiện:
    1. Chọn thumbnail trước khi bấm `Phát trực tiếp`.
    2. Tạo live.
  - Kết quả mong đợi:
    1. Live vẫn tạo thành công.
    2. Thumbnail được gọi qua `/_api/live/thumbnail`.

- [ ] `LIVE-015` - Upload thumbnail sau khi live đã chạy
  - Tiền điều kiện: Live đang chạy.
  - Bước thực hiện:
    1. Chọn file thumbnail mới.
    2. Bấm `Cập nhật ảnh bìa`.
  - Kết quả mong đợi:
    1. Gọi `/_api/live/thumbnail`.
    2. Backend trả thành công.
    3. UI hiển thị trạng thái cập nhật thành công.

- [ ] `LIVE-016` - Upload thumbnail lỗi validation
  - Tiền điều kiện: Không chọn file hoặc file không hợp lệ.
  - Bước thực hiện:
    1. Gọi action upload thumbnail.
  - Kết quả mong đợi:
    1. Bridge trả lỗi rõ ràng.
    2. UI không bị hỏng layout.

- [ ] `LIVE-017` - Desktop layout parity
  - Tiền điều kiện: Màn hình desktop khoảng `1440x900`.
  - Bước thực hiện:
    1. Mở `/live`.
  - Kết quả mong đợi:
    1. Có bố cục 3 cột giống phtml.
    2. Stage nằm giữa, activity nằm bên phải.
    3. Sidebar setup giữ ở cột trái.

- [ ] `LIVE-018` - Mobile layout parity
  - Tiền điều kiện: Màn hình mobile khoảng `390x844`.
  - Bước thực hiện:
    1. Mở `/live`.
  - Kết quả mong đợi:
    1. Layout stack theo chiều dọc.
    2. Không vỡ stage preview.
    3. Nút action vẫn bấm được.

- [ ] `LIVE-019` - Không còn runtime mock active
  - Tiền điều kiện: Mã nguồn hiện tại đã refactor.
  - Bước thực hiện:
    1. Chạy kiểm tra tĩnh `rg "useMockLiveData|liveCatalog|MockLive" client/src/live client/app/pages/live.vue`.
  - Kết quả mong đợi:
    1. Route runtime `/live` không còn import mock catalog cũ.

## Verification Commands

```powershell
rg -n "useMockLiveData|liveCatalog|MockLive" client/src/live client/app/pages/live.vue
php -l xhr/live.php
```
