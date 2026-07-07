# Debug OneSignal push iOS cho VNSEEA

Tài liệu này dùng để kiểm tra push notification thường trên iOS: tin nhắn chat và notification xã hội. PushKit/APNs VoIP cho cuộc gọi là luồng khác, nên việc cuộc gọi có push không chứng minh OneSignal/APNs thường đã đúng.

## 1. Lấy log runtime trên iPhone

Chạy trước khi mở app và login:

```bash
mkdir -p duong/push-log
idevicesyslog | grep VNSEEA_PUSH_DEBUG | tee "duong/push-log/ios-push-runtime-$(date +%Y%m%d-%H%M%S).log"
```

Khi app khởi động/login thành công, cần thấy các event:

- `push_initialize_start`
- `push_permission_request_result`
- `push_subscription_state`
- `push_sync_request`
- `push_sync_success`

Nếu không có `push_initialize_start`, bản build có thể chưa chạy code OneSignal hoặc env `ONESIGNAL_APP_ID` đang rỗng.

## 2. Xem log backend

Backend sẽ ghi log tại:

```text
phtml/xhr/logs/vnseea_push_debug.log
```

Khi có gửi push, cần thấy:

- `onesignal_send_attempt`
- `onesignal_send_response`

Các id trong log đã được mask bằng độ dài và 8 ký tự cuối để đối chiếu mà không lộ token thật.

## 3. Kiểm tra cấu hình app iOS

- Test bằng iPhone thật, không dùng simulator.
- Vào iOS Settings > VNSEEA > Notifications và bật Allow Notifications.
- Bundle ID đang dùng: `com.vnseea.vnseea`.
- Env app phải có `ONESIGNAL_APP_ID` đúng với app trong OneSignal Dashboard.
- Nếu runtime có `permissionGranted:false`, cần bật lại notification permission trong iOS Settings hoặc xóa app cài lại để xin quyền lại.
- Nếu runtime có `pushId.present:false` hoặc `pushToken.present:false`, lỗi nằm ở OneSignal SDK/APNs registration, chưa nên debug backend.

## 4. Kiểm tra OneSignal Dashboard

Vào OneSignal Dashboard:

```text
Settings > Push & In-App > Apple iOS
```

Cần kiểm tra:

- Đã upload APNs `.p8` key cho Apple iOS.
- Key ID đúng với key trên Apple Developer.
- Team ID đúng với Apple Developer Team.
- Bundle ID đúng: `com.vnseea.vnseea`.
- App ID của OneSignal khớp với `ONESIGNAL_APP_ID` trong app.
- REST API Key tương ứng được cấu hình đúng ở backend.

Tài liệu OneSignal tham khảo:

- https://documentation.onesignal.com/docs/en/react-native-sdk-setup
- https://documentation.onesignal.com/docs/en/ios-p8-token-based-connection-to-apns
- https://documentation.onesignal.com/docs/en/mobile-sdk-reference

## 5. Kiểm tra cấu hình backend

Trong config/admin backend cần bật:

- `push=1`
- `ios_push_messages=1`
- `ios_push_native=1`

Các key/id OneSignal iOS cần có:

- `ios_m_push_id`
- `ios_m_push_key`
- `ios_n_push_id`
- `ios_n_push_key`

Lưu ý:

- `ios_m_push_id` / `ios_m_push_key` dùng cho push tin nhắn chat.
- `ios_n_push_id` / `ios_n_push_key` dùng cho notification xã hội.
- Các cấu hình VoIP như `ios_voip_*` không thay thế cho OneSignal notification thường.

Nếu log backend có `app_id_present:0` hoặc `app_key_present:0`, backend đang thiếu cấu hình tương ứng.

## 6. Kiểm tra DB device id

Sau khi login trên iOS, user nhận push phải có:

- `ios_m_device_id`
- `ios_n_device_id`

Đối chiếu 8 ký tự cuối trong runtime log `push_subscription_state.pushId.suffix` với DB:

- Nếu runtime có push id nhưng DB rỗng: lỗi ở bước sync `get-general-data`.
- Nếu DB có id nhưng backend không gọi OneSignal: lỗi ở điều kiện tạo push.
- Nếu backend gọi OneSignal nhưng response báo lỗi: kiểm tra lỗi trong OneSignal Dashboard/config.

## 7. Test tin nhắn chat

Backend hiện chỉ gửi push chat khi người nhận được xem là offline/session rỗng. Vì vậy khi test:

1. Login user A trên máy gửi.
2. Login user B trên iPhone nhận, rồi đưa app B về background hoặc kill app.
3. Đảm bảo backend không còn session online của user B nếu logic `Wo_GetSessionDataFromUserID($to_id)` vẫn coi online thì push chat có thể không gửi.
4. User A gửi tin nhắn mới cho B.
5. Backend log cần có `onesignal_send_attempt` với `push_type: ios_messenger`.
6. Response tốt thường có `http_status:200`, `response_id_present:1`, `recipients > 0`.

Nếu không có `ios_messenger` attempt, cần kiểm tra điều kiện offline, mute, unread, hoặc cờ đã gửi push trước đó.

## 8. Test notification xã hội

Tạo một notification xã hội cho user B như like/comment/follow tùy luồng app. Backend log cần có:

- `push_type: ios_native`
- `send_to_count > 0`
- `response_id_present:1`

Nếu không có attempt:

- Kiểm tra `ios_push_native=1`.
- Kiểm tra user B có `ios_n_device_id`.
- Kiểm tra notification settings của user B có chặn loại notification đó không.

## 9. Cách đọc lỗi nhanh

| Dấu hiệu | Kết luận gần nhất |
| --- | --- |
| Không có `push_initialize_start` | App chưa chạy OneSignal init hoặc `ONESIGNAL_APP_ID` rỗng |
| `permissionGranted:false` | iOS permission đang bị tắt |
| `pushId.present:false` | OneSignal/APNs chưa tạo subscription |
| Có runtime push id nhưng không có `push_sync_success` | Sync device id về backend lỗi |
| DB thiếu `ios_m_device_id` hoặc `ios_n_device_id` | App chưa sync được OneSignal id |
| `onesignal_send_skipped` | Backend bỏ qua trước khi gọi OneSignal, xem `reason` |
| `app_id_present:0` hoặc `app_key_present:0` | Thiếu cấu hình OneSignal iOS ở backend |
| `http_status` không phải 200 | OneSignal API trả lỗi, xem `errors`/`response_preview` |
| `recipients:0` | Player id không nhận được push hoặc không thuộc app OneSignal đúng |
