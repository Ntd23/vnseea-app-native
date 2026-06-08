English description: Documents the native push requirements for offline LiveKit call notifications.

# Thông báo cuộc gọi khi app tắt

Cuộc gọi LiveKit không thể dựa vào polling hoặc JS listener khi app đã bị tắt/killed. Luồng đúng là:

- Android: backend gửi OneSignal/FCM high-priority data push có `provider=livekit`, `uuid`, `call_id`, `call_type`, `from_id`, `name`, `avatar`. Native push layer phải gọi CallKeep trước khi mở JS.
- iOS: backend phải gửi APNs VoIP PushKit push đến VoIP token của máy. `AppDelegate.swift` nhận PushKit payload và gọi CallKit/CallKeep ngay lập tức.
- JS chỉ xử lý tiếp sau khi bridge chạy: map `didLoadWithEvents`, answer/decline, mở `CALL_ROOM`, rồi join LiveKit.

Payload tối thiểu:

```json
{
  "provider": "livekit",
  "uuid": "callkeep-uuid",
  "call_id": "123",
  "call_type": "video",
  "from_id": "45",
  "name": "Nguyen Van A",
  "avatar": "https://..."
}
```

Ghi chú: OneSignal notification event trong React Native chỉ đủ cho foreground/background sau khi app đã được khởi động. iOS killed-call cần VoIP PushKit token và APNs VoIP sender ở backend.
