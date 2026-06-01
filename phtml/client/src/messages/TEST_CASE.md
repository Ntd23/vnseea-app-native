<!-- Description: Manual QA coverage for the backend-backed messages context, including user chat, multi-send, group chat, typing, recording, and create-group parity with the PHP modal. -->

# Test Case Messages

## Phạm vi

- Context: `client/src/messages`
- Route chính: `/messages`
- Baseline PHP:
  - `themes/wowonder/layout/messages/content.phtml`
  - `xhr/messages.php`
  - `xhr/chat.php`
- API bridge đang dùng:
  - `GET /_api/messages/conversations`
  - `GET /_api/messages/thread`
  - `POST /_api/messages/send`
  - `POST /_api/messages/multi`
  - `POST /_api/messages/record/upload`
  - `POST /_api/messages/typing`
  - `POST /_api/messages/read`
  - `POST /_api/messages/delete`
  - `GET /_api/messages/group/details`
  - `GET /_api/messages/group/candidates`
  - `POST /_api/messages/group/members`
  - `GET /_api/messages/group/participants`
  - `POST /_api/messages/group/create`

## Chuẩn bị

- Đăng nhập bằng session PHP hợp lệ.
- Có ít nhất:
  - 1 hội thoại 1:1
  - 1 group chat
  - 2 user để test typing và realtime
- Chuẩn bị:
  - 1 file hợp lệ để gửi
  - quyền microphone để test record
  - 1 ảnh JPG hoặc PNG để test avatar nhóm
- Viewport:
  - desktop `1440x900`
  - mobile `390x844`

## Test cases

| ID | Route | Cách test | Kỳ vọng |
| --- | --- | --- | --- |
| `MSG-001` | `/messages` | Hard reload route trên desktop. | Layout split-view đúng: trái là search + tabs + list, phải là thread/composer. |
| `MSG-002` | `/messages` | Mở Network rồi reload. | Inbox đi qua `/_api/messages/conversations`, thread đi qua `/_api/messages/thread`, không gọi raw PHP từ presentation. |
| `MSG-003` | `/messages` | Chuyển 3 tab `Send multiple`, `Users`, `Groups`. | Cả 3 tab còn hoạt động, không mất flow multi hay group. |
| `MSG-004` | `/messages` | Tìm theo tên hoặc preview. | Danh sách bên trái lọc đúng theo query. |
| `MSG-005` | `/messages` | Chọn 1 user chat. | Thread thật được tải, composer hỗ trợ `text`, `file`, `record`. |
| `MSG-006` | `/messages` | Gửi `text-only` trong 1:1. | Gọi `/_api/messages/send`, message mới xuất hiện cuối thread, inbox preview được refresh. |
| `MSG-007` | `/messages` | Gửi `file-only` trong 1:1. | `/_api/messages/send` đi multipart đúng, bubble render file hoặc media đúng loại. |
| `MSG-008` | `/messages` | Ghi âm rồi gửi `record-only` trong 1:1. | Upload qua `/_api/messages/record/upload`, sau đó gửi qua `/_api/messages/send`, thread render audio player. |
| `MSG-009` | `/messages` | Nhập text rồi ghi âm, gửi `text+record`. | Flow thành công, không trộn `file + record`. |
| `MSG-010` | `/messages` | Chọn file rồi bắt đầu ghi âm. | File bị clear trước khi ghi âm. |
| `MSG-011` | `/messages` | Ghi âm xong rồi chọn file. | Record draft bị clear, composer chỉ giữ file. |
| `MSG-012` | `/messages` | User A mở thread với user B, A bắt đầu nhập. | User B thấy typing indicator dạng `...` trong thread và ở row tab `Users`. |
| `MSG-013` | `/messages` | User A dừng nhập, blur input, đổi thread hoặc gửi tin. | User B mất typing indicator. |
| `MSG-014` | `/messages?tab=group` | Mở group thread rồi nhập. | Group không hiện typing indicator. |
| `MSG-015` | `/messages?tab=multi` | Chọn nhiều user, gửi `text-only`. | Gọi `/_api/messages/multi`, feedback đúng theo response thật. |
| `MSG-016` | `/messages?tab=multi` | Chọn nhiều user, gửi `file-only`. | Multi-send thành công với file. |
| `MSG-017` | `/messages?tab=multi` | Chọn nhiều user, gửi `record-only`. | Upload record trước rồi `multi_send` thật. |
| `MSG-018` | `/messages?tab=group` | Mở info panel của group do bạn sở hữu. | Panel hiển thị member roster thật từ `/_api/messages/group/details`, không còn card hardcode. |
| `MSG-019` | `/messages?tab=group` | Tìm user trong ô mời ở info panel rồi bấm `Add`. | Gọi `/_api/messages/group/candidates` và `/_api/messages/group/members`, backend trả success, candidate biến khỏi list. |
| `MSG-020` | `/messages?tab=group` | Bấm `Kick` ở một thành viên. | Gọi `/_api/messages/group/members` với action remove, member list và count được refresh từ backend. |
| `MSG-021` | `/messages?tab=group` | Đăng nhập bằng account không phải owner rồi mở info panel group. | Không gọi `/_api/messages/group/candidates`, không hiện ô mời hay nút `Kick`. |
| `MSG-022` | `/messages` | Bấm nút tạo nhóm mới. | Mở modal riêng đúng shell phtml: có tên nhóm, ô search member, selected list, avatar upload. Không còn phụ thuộc recipient đang chọn ở tab multi. |
| `MSG-023` | `/messages` | Mở modal tạo nhóm nhưng chưa gõ ô search. | Không gọi `/_api/messages/group/participants`. |
| `MSG-024` | `/messages` | Trong modal tạo nhóm, nhập từ khóa tìm người. | Gọi `/_api/messages/group/participants`, candidate list hiển thị đúng từ `xhr/chat.php?s=get_parts`. |
| `MSG-025` | `/messages` | Bấm chọn 1 candidate trong modal tạo nhóm. | Candidate được thêm vào selected list, counter tăng, candidate biến khỏi danh sách search. |
| `MSG-026` | `/messages` | Bấm bỏ 1 member đã chọn trong modal tạo nhóm. | Member bị xóa khỏi selected list, counter giảm. |
| `MSG-027` | `/messages` | Tạo nhóm với tên dưới 4 ký tự. | Modal hiển thị đúng error text backend từ `xhr/chat.php?s=create_group`. |
| `MSG-028` | `/messages` | Tạo nhóm khi chưa chọn member nào. | Modal hiển thị lỗi bridge rằng cần ít nhất 1 thành viên. |
| `MSG-029` | `/messages` | Upload avatar sai loại trong modal tạo nhóm. | Modal hiển thị đúng error text backend, không đóng modal. |
| `MSG-030` | `/messages` | Tạo nhóm thành công với tên, member, avatar hợp lệ. | Gọi `/_api/messages/group/create`, modal đóng, form reset sạch, tab chuyển sang `Groups`, inbox refresh, thread group mới được mở ngay. |
| `MSG-031` | `/messages` | Bấm `Load more` trong thread có lịch sử dài. | Gọi thread với `beforeId`, message cũ prepend lên đầu mà không trùng ID. |
| `MSG-032` | `/messages` | Có tin nhắn mới từ user khác khi socket đang sống. | Inbox preview và active thread refresh mà không cần hard reload. |
| `MSG-033` | `/messages` | Tắt realtime service rồi gửi/nhận tin. | Message mới vẫn cập nhật bằng polling fallback; typing 1:1 không còn realtime. |
| `MSG-034` | `/messages` | Test trên mobile: chọn contact rồi quay lại. | Flow mobile vẫn là list -> thread -> back, không làm vỡ desktop layout. |
| `MSG-035` | `/messages` | Từ chối quyền microphone rồi bấm ghi âm. | Composer hiển thị lỗi quyền microphone rõ ràng, không crash. |

## Kiểm tra tĩnh

```powershell
cd client
rg -n "recipient_is_typing|remove_typing|upload_record|multi_send|send_message" src/messages server/api/messages
rg -n "group_chat\\s*\"?,?\\s*\\{\\s*type:\\s*\"create\"" src/messages server/api/messages
rg -n "group/participants|group/create" src/messages server/api/messages
```

Kỳ vọng:

- Runtime active không còn dùng selected recipients của tab multi để tạo group.
- Create-group flow active dùng `xhr/chat.php` bridge qua `/_api/messages/group/participants` và `/_api/messages/group/create`.
- Add/kick group hiện có không bị ảnh hưởng.
