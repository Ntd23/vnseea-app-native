<!-- Description: Plan for letting Page members reply to user messages as the Page (Page Inbox) across backend, app and web. -->

# Hộp thư Page — trả lời tin nhắn với tư cách Page

Ngày: 2026-10-09 · Trạng thái: **Bản nháp, chờ chốt các quyết định ở mục 6**

Kế hoạch này động tới hai repo:
- **Backend + web:** `demo.vnseea` (PHP WoWonder ở thư mục gốc, web Nuxt ở `client/`, socket Node.js ở `nodejs/`). Đây là backend thật.
- **App:** `vnseea-app-native`. Thư mục `phtml/` trong repo app **chỉ là bản mirror**, không sửa ở đó.

Mọi đường dẫn PHP bên dưới đều tính từ gốc repo `demo.vnseea`.

---

## 1. Mục tiêu

Mục tiêu là làm theo mô hình mà Facebook, LinkedIn và Zalo OA đang dùng: **người dùng nhắn tin với Page, các thành viên có quyền trả lời dưới danh nghĩa Page.**

- Khách chỉ thấy **tên và ảnh của Page**, không thấy ai trong đội ngũ đã trả lời.
- Chủ Page và admin có quyền **Tin nhắn** cùng xem và cùng trả lời một **hộp thư chung** của Page.
- Nội bộ đội ngũ thấy được **"Trả lời bởi X"** ở từng tin.
- Page **không được tự nhắn trước**, chỉ được trả lời các hội thoại do khách mở.

**Ngoài phạm vi giai đoạn 1:** giao hội thoại cho từng người, nhãn, ghi chú nội bộ, trả lời tự động. Các phần này để sang giai đoạn 3.

---

## 2. Hiện trạng (đã kiểm tra trên `demo.vnseea`)

| Thành phần | Cách đang hoạt động | Vấn đề |
|---|---|---|
| Lưu tin nhắn | Bảng `Wo_Messages` có `from_id`, `to_id`, `page_id`. "Phía Page" chính là **tài khoản cá nhân của chủ Page**: tin của khách có `to_id = chủ`, tin trả lời có `from_id = chủ` (`api/v2/endpoints/page_chat.php:64`). | Không có khái niệm "gửi với tư cách Page", không biết ai thực sự đã trả lời. |
| Danh sách hội thoại | `Wo_UsersChat` có 2 dòng (chủ ↔ khách) kèm `page_id`, được tạo trong `Wo_CreateUserChat` (`assets/includes/functions_one.php:6243`). | Chỉ chủ Page có hội thoại. |
| Quyền xem | `Wo_GetPageMessages`: ai không phải chủ thì chỉ thấy tin giữa mình và chủ (`assets/includes/functions_one.php:5399`). | **Admin Page không xem được hộp thư.** |
| Quyền admin | Bảng `Wo_PageAdmins` có các quyền `general, info, social, avatar, design, admins, analytics, delete_page` (`api/v2/endpoints/update_privileges.php:5`). | **Chưa có quyền tin nhắn.** |
| Push | `VNSEEA_MessagePushRecipients` chỉ gửi cho `to_id` (`assets/includes/vnseea_push_delivery.php:756`). | Admin không nhận thông báo. |
| Socket | `nodejs/controllers/PageMessageController.js:29`: nếu người gửi là chủ thì gửi cho khách, ngược lại gửi cho chủ. | Chỉ chủ nhận realtime. |
| Web Nuxt | Hộp thư web có hiện thread Page (`client/server/api/messages/_shared.ts:1545`) và gọi `page_chat`. | Không có hộp thư Page, không có giao diện phân quyền. |
| App | Chat loại `page` đã có trong `src/messages`. | Trang Page **không có nút "Nhắn tin"** (`PageDetailScreen.tsx`), không có hộp thư Page, quyền admin không có mục tin nhắn. |

---

## 3. Thiết kế

### 3.1. Quyết định cốt lõi: giữ nguyên "phía Page = `user_id` của chủ", chỉ thêm cột ghi người gửi thật

Khi admin trả lời, tin được lưu với **`from_id = chủ Page`**, và thêm cột **`sent_by_user_id = admin`** để ghi lại người thực sự gửi.

Lý do chọn cách này: toàn bộ hệ thống đang lấy `user_id` của chủ làm danh tính phía Page, gồm truy vấn của web, socket, push, `Wo_UsersChat` và các bản app cũ đang chạy. Giữ nguyên quy ước đó thì:
- Khách thấy tin admin trả lời **ngay lập tức** trên web, trên app cũ và app mới, không cần sửa phía khách.
- Không phải di chuyển dữ liệu tin nhắn cũ.
- Chỉ cần **thêm** cột và endpoint mới, không sửa hành vi của các hàm WoWonder dùng chung. Điều này đúng với quy tắc `php-bridge-safety`.

`Wo_CreateUserChat` sẽ dùng `from_id` nếu được truyền vào (`functions_one.php:6252`). Vì vậy khi gọi `Wo_RegisterPageMessage` với `from_id = chủ`, hệ thống vẫn tạo đúng hội thoại giữa chủ và khách, không tạo nhầm hội thoại giữa admin và khách.

**Hệ quả chấp nhận được:** chủ Page dùng app cũ hoặc web sẽ thấy tin admin trả lời nằm bên phải, như thể chính mình gửi. Nhãn "Trả lời bởi X" chỉ có trong Hộp thư Page mới.

### 3.2. Dữ liệu (migration chỉ thêm, theo kiểu `database/migrations/20261001_message_media_groups.sql`)

File: `database/migrations/2026MMDD_page_inbox.sql`

1. `Wo_Messages`: thêm `sent_by_user_id INT UNSIGNED NULL`. Giá trị `NULL` nghĩa là người gửi chính là `from_id`. Cột nullable thêm vào cuối bảng là thao tác INSTANT trên MySQL 8 / MariaDB ≥ 10.3, không khoá bảng lớn.
2. `Wo_PageAdmins`: thêm `messages TINYINT(1) NOT NULL DEFAULT <xem quyết định Q1>`.
3. Kiểm tra index của `Wo_Messages` theo `page_id`. Nếu thiếu, thêm `(page_id, id)` để truy vấn danh sách hộp thư nhanh. Cần xem `SHOW INDEX` trên production trước.

### 3.3. Quyền truy cập

Thêm hàm riêng `VNSEEA_PageInboxCanAccess($page_id, $user_id)` trong file mới `assets/includes/vnseea_page_inbox.php`. Hàm trả về true khi người dùng là **chủ Page**, hoặc có dòng trong `Wo_PageAdmins` với `messages = 1`.

- **Không dùng lại `Wo_IsCanPageUpdate`.** Hàm đó tự cho qua admin/moderator của toàn site, nghĩa là ai quản trị site cũng đọc được tin nhắn riêng của mọi Page. Ngoài ra danh sách quyền trong hàm đó được viết cứng.
- Quyền được kiểm tra ở **mỗi request**, nên gỡ admin là người đó mất quyền ngay.

### 3.4. API mới cho mobile: `api/v2/endpoints/page_inbox.php`

| `type` | Đầu vào | Việc làm | Ghi chú |
|---|---|---|---|
| `my_pages` | — | Danh sách Page mà người dùng có quyền vào hộp thư (là chủ hoặc có quyền `messages`), kèm số hội thoại chưa đọc. | Dùng để hiện lối vào Hộp thư. |
| `list` | `page_id`, `offset`, `limit`, `search` | Danh sách hội thoại của Page, mỗi khách một dòng: tin cuối, thời gian, số chưa đọc. | Truy vấn `Wo_Messages` theo `page_id` và phía chủ, nhóm theo khách. |
| `fetch` | `page_id`, `user_id` (khách), `before`/`after`, `limit` | Lấy tin trong thread. Tin phía Page được đánh dấu `is_page_side = 1` và kèm `sent_by` (id, tên, avatar). | `sent_by` **chỉ** trả về ở endpoint này. |
| `send` | `page_id`, `user_id`, `text`/`file`/…, `message_hash_id`, `reply_id` | Gọi `Wo_RegisterPageMessage` với `from_id = chủ`, sau đó ghi `sent_by_user_id = người đang đăng nhập`, rồi đưa push vào hàng đợi. | **Chỉ cho gửi khi khách đã từng nhắn Page trước** (xem Q4). |
| `read` | `page_id`, `user_id` | Đánh dấu đã đọc các tin khách gửi cho phía Page. | |

**Bảo mật và riêng tư:**
- `page_chat.php` và các endpoint phía khách **không bao giờ** trả về `sent_by_user_id`.
- Chạy `php -l` cho mọi file PHP được sửa.
- Viết test hợp đồng `tests/page-inbox-contract.php`, theo kiểu `tests/page-comment-identity-contract.php`.

### 3.5. Các chỗ cần sửa nhỏ trong code dùng chung

1. **`api/v2/endpoints/update_privileges.php`:** chỉ cập nhật `messages` **khi request có gửi field này** (`isset($_POST['messages'])`). Lý do: endpoint hiện tại đặt mọi quyền không gửi lên về 0. Nếu thêm `messages` vào mặc định, những client cũ không biết field này sẽ vô tình tắt quyền tin nhắn mỗi lần lưu quyền khác.
2. **`api/v2/endpoints/get_page_admins.php`:** trả thêm field `messages`.
3. **`assets/includes/vnseea_push_delivery.php` → `VNSEEA_MessagePushRecipients`:** nếu tin có `page_id` và người nhận là chủ Page, gửi thêm cho các admin có `messages = 1`, trừ người gửi. Tiêu đề push ghi tên Page, ví dụ *"Tin nhắn mới cho {Tên Page}"*. Khi admin mở push, app sẽ vào Hộp thư Page, không vào chat cá nhân.
4. **Socket (`nodejs/controllers/PageMessageController.js`):** để sang giai đoạn 2. Giai đoạn 1, app dùng polling khi đang mở Hộp thư Page, giống cơ chế `src/messages/application/polling`.

### 3.6. App (`vnseea-app-native`)

1. **Nút "Nhắn tin" trên trang Page** (`src/pages/presentation/screens/PageDetailScreen.tsx`): chỉ hiện với người không phải chủ hoặc admin. Bấm vào sẽ mở chat loại `page` đã có sẵn, với người nhận là chủ Page. Chủ và admin có quyền thì thấy nút **"Hộp thư"** thay thế.
2. **Domain mới `src/page-inbox/`** (hoặc `src/pages/.../inbox`, theo quy ước DDD + MVVM):
   - `domain/`: các type `PageInboxConversation`, `PageInboxMessage` (có `sentBy`), interface repository.
   - `infrastructure/ApiPageInboxRepository.ts`: gọi `page_inbox` qua `apiBridge`. Thêm route `pageInbox` vào `src/shared-kernel/application/constants/route-registry.ts`.
   - `application/`: `usePageInboxListViewModel`, `usePageInboxThreadViewModel`, có polling và gửi lạc quan (giống chat hiện có).
   - `presentation/`:
     - `PageInboxListScreen`: chọn Page nếu quản lý nhiều Page, sau đó hiện danh sách hội thoại.
     - `PageInboxThreadScreen`: bong bóng phía Page nằm bên phải, mang avatar Page và nhãn nhỏ "Trả lời bởi X".
   - Nên dùng lại tối đa component trong `src/messages/presentation`, như bong bóng tin, ô nhập và media.
3. **Lối vào:** trong menu hoặc trang Page của mình, hiện "Hộp thư Page", kèm badge chưa đọc lấy từ `my_pages`.
4. **Quyền admin:** thêm `messages` vào `PagePrivileges` (`src/pages/domain/types/pages.types.ts:89`) và vào `updatePagePrivileges` (`ApiPagesRepository.ts:1044`). Thêm công tắc **"Tin nhắn"** trong màn hình phân quyền admin Page.
5. **Push:** xử lý loại push Page Inbox trong `src/notifications/application/navigation/pushNotificationNavigation.ts` và `src/messages/application/notifications/androidMessagePushOpen.ts` để mở đúng thread.
6. **i18n:** thêm chuỗi tiếng Việt và tiếng Anh theo `pagesCopy.ts`.
7. **Test:** viết Jest cho mapper, view-model, và test bố cục theo kiểu `src/pages/presentation/screens/__tests__`.

### 3.7. Web (`demo.vnseea/client`)

- **Giai đoạn 1:** không làm giao diện mới. Chỉ cần kiểm tra tương thích: khách trên web vẫn thấy tin admin trả lời dưới tên Page, chủ Page trên web vẫn thấy thread như cũ.
- **Giai đoạn 2:** làm Hộp thư Page trên web, dùng chung endpoint `page_inbox` qua `server/api/*` (theo `client/AGENTS.md`), kèm công tắc quyền "Tin nhắn".

---

## 4. Các giai đoạn và công việc

Kích thước: **S** ≈ ≤ 1 ngày, **M** ≈ 2–3 ngày, **L** ≈ 4–5 ngày. Đây là ước lượng thô.

### Giai đoạn 1 — MVP trên app

| # | Repo | Việc | Cỡ | Phụ thuộc |
|---|---|---|---|---|
| B1 | backend | Migration: `sent_by_user_id`, `Wo_PageAdmins.messages`, kiểm tra index | S | Q1 |
| B2 | backend | `vnseea_page_inbox.php`: hàm kiểm quyền và truy vấn hộp thư | M | B1 |
| B3 | backend | Endpoint `page_inbox.php` (`my_pages`, `list`, `fetch`, `send`, `read`) | L | B2, Q4 |
| B4 | backend | `update_privileges` / `get_page_admins` hỗ trợ `messages` | S | B1 |
| B5 | backend | Push gửi thêm cho admin có quyền tin nhắn | M | B2 |
| B6 | backend | `tests/page-inbox-contract.php` + `php -l` | S | B3–B5 |
| A1 | app | Nút "Nhắn tin" và "Hộp thư" trên PageDetail | S | — |
| A2 | app | Domain `page-inbox`: repository và view-model | M | B3 |
| A3 | app | Màn hình danh sách và thread, nhãn "Trả lời bởi" | L | A2 |
| A4 | app | Công tắc quyền "Tin nhắn" | S | B4 |
| A5 | app | Mở push vào đúng thread Page Inbox | S | B5, A3 |
| A6 | app | Jest và i18n | S | A2–A5 |
| W1 | web | Kiểm tra tương thích (không sửa code) | S | B3 |
| M1 | app | Chép backend sang `phtml/` (chỉ khi được yêu cầu) | S | B* |

### Giai đoạn 2 — realtime và web
- Socket gửi thêm cho admin có quyền tin nhắn (`PageMessageController.js`), app chuyển từ polling sang socket.
- Hộp thư Page và công tắc quyền trên web Nuxt.
- Web hiện "Trả lời bởi X" cho chủ và admin.
- Cân nhắc gỡ hội thoại Page khỏi tab Tin nhắn cá nhân của chủ (xem Q2).

### Giai đoạn 3 — công cụ cho đội ngũ
- Bảng `Wo_PageConversations` (`page_id`, `user_id`, `assigned_to`, `status` mở/đã xong, `labels`, `note`).
- Giao hội thoại, lọc "Của tôi / Chưa giao / Đã xong".
- Trả lời tự động / tin nhắn vắng mặt, câu trả lời mẫu.
- Hiện "Thường trả lời trong X giờ" trên trang Page.

---

## 5. Kiểm thử và triển khai

**Ma trận kiểm thử** (mỗi vai trò thử trên app mới, app cũ và web):

| Vai trò | Kỳ vọng |
|---|---|
| Khách | Nhắn được cho Page, thấy mọi câu trả lời dưới tên và ảnh Page, **không** thấy tên người trả lời. |
| Chủ Page | Thấy toàn bộ hộp thư, trả lời được, thấy "Trả lời bởi X". |
| Admin có quyền `messages` | Như chủ Page. Nhận push. |
| Admin không có quyền `messages` | Không thấy Hộp thư, gọi API bị từ chối. |
| Admin vừa bị gỡ | Mất quyền ngay ở request tiếp theo. |
| Admin/moderator site (không phải admin Page) | Không đọc được hộp thư. |
| Page nhắn trước cho người chưa từng nhắn | Bị từ chối. |

**Thứ tự triển khai:**
1. Chạy migration (chỉ thêm cột, an toàn với code cũ).
2. Deploy backend. App cũ và web không bị ảnh hưởng.
3. Phát hành app mới (qua duyệt store).
4. Bật quyền tin nhắn cho admin theo quyết định Q1.

Nếu cần rollback, chỉ việc ẩn lối vào Hộp thư trong app. Các cột mới không ảnh hưởng gì đến code cũ.

---

## 6. Quyết định cần chốt trước khi bắt đầu

| # | Câu hỏi | Đề xuất |
|---|---|---|
| Q1 | Admin Page **đang có** có được tự động bật quyền Tin nhắn không? | **Không** (mặc định `0`). Chủ Page tự bật cho từng người, vì tin nhắn là dữ liệu riêng tư. |
| Q2 | Hội thoại Page có còn hiện trong tab Tin nhắn **cá nhân** của chủ Page không? | **Giữ ở giai đoạn 1** để tương thích với app cũ và web. Cân nhắc gỡ ở giai đoạn 2. |
| Q3 | Khách có được thấy tên người trả lời không? | **Không**, giống Meta và LinkedIn. |
| Q4 | Page có được nhắn trước cho người dùng không? Có giới hạn thời gian trả lời không? | **Không được nhắn trước.** Chưa áp dụng khung 24 giờ ở giai đoạn 1. |
| Q5 | Web có cần Hộp thư Page ngay ở giai đoạn 1 không? | **Không.** Giai đoạn 1 chỉ kiểm tra tương thích. |
| Q6 | Admin/moderator của site có được đọc hộp thư Page không? | **Không.** |
