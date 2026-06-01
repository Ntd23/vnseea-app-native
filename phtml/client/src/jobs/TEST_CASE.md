English description: Test cases for the jobs bounded context, covering the backend-backed jobs directory, real filters, job application flow, and PHP-parity job creation flow.

# Test Case Jobs

## Phạm vi

- Context: `client/src/jobs`
- Route:
  - `/jobs`
- Điểm vào chính:
  - `app/pages/jobs.vue`
  - `presentation/pages/JobsPage.vue`
  - `application/view-models/useJobsPageVM.ts`
  - `infrastructure/repositories/ApiJobsRepository.ts`
  - `server/api/jobs/*`
- Ngoài phạm vi:
  - Shared shell do Dev 1 sở hữu
  - PHP template cũ ngoài bridge `/_api/*`

## Môi trường

- Nuxt direct: `http://127.0.0.1:3000`
- Laragon proxy: `http://demo.vnseea.test:8080`
- Nguồn session backend: PHP browser cookies
- API bridge:
  - `GET /_api/jobs`
  - `POST /_api/jobs/apply`
  - `POST /_api/jobs/create`
- Ghi chú parity: tạo job phải đi theo `themes/wowonder/layout/modals/create_hiring.phtml` và `xhr/job.php?f=job&s=create_job`; `page_id` là tùy chọn, không bắt buộc.

## Smoke

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `JOBS-SMOKE-001` | `[ ]` | Hard reload trang jobs | `/jobs` | Trang render được, không còn hero/sidebar/detail panel mock, không lỗi Nuxt. |
| `JOBS-SMOKE-002` | `[ ]` | Search theo từ khóa | `/jobs?q=marketing` | Danh sách đổi theo keyword backend thật, query sync đúng URL. |
| `JOBS-SMOKE-003` | `[ ]` | Lọc theo loại hình và danh mục | `/jobs?type=full_time&category=1` | Filter đi đúng `/_api/jobs`, card hiển thị data thật. |
| `JOBS-SMOKE-004` | `[ ]` | Mở modal ứng tuyển | click `Apply` trên một job chưa ứng tuyển | Modal hiện đúng field của phtml, không còn CV upload hay cover-letter mock. |
| `JOBS-SMOKE-005` | `[ ]` | Mở modal tạo việc làm | click `Post a job` | Modal hiện page selector, salary range, currency, image source, question 1-3 đúng payload PHP. |

## Truy cập route

| ID | Status | Case | Điều kiện | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `JOBS-ROUTE-001` | `[ ]` | Mở trực tiếp route jobs khi đã đăng nhập | User có PHP session | Trang vào được và load dữ liệu thật từ `/_api/jobs`. |
| `JOBS-ROUTE-002` | `[ ]` | Mở route jobs khi chưa đăng nhập | Không có PHP session | Route xử lý theo middleware/auth hiện có, không lộ dữ liệu riêng. |
| `JOBS-ROUTE-003` | `[ ]` | Giữ query filter sau reload | `/jobs?q=test&type=part_time` | Reload vẫn giữ đúng filter và danh sách tương ứng. |

## API và dữ liệu

| ID | Status | Case | Entry | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `JOBS-API-001` | `[ ]` | Catalog jobs | `/_api/jobs` | Response có `items`, `categories`, `types`, `ownedPages`, `currentUser`, `hasMore`, `nextAfterId`, không còn mock data từ i18n. |
| `JOBS-API-002` | `[ ]` | Search keyword | `/_api/jobs?q=designer` | Backend lọc theo `job.php type=search` và trả job thật. |
| `JOBS-API-003` | `[ ]` | Filter category | `/_api/jobs?category=1` | Chỉ trả job thuộc category tương ứng của backend. |
| `JOBS-API-004` | `[ ]` | Filter type | `/_api/jobs?type=contract` | Chỉ trả job đúng `job_type`. |
| `JOBS-API-005` | `[ ]` | Filter distance khi user có tọa độ | `/_api/jobs?distance=25` | Kết quả đổi theo khoảng cách thật từ backend. |
| `JOBS-API-006` | `[ ]` | Distance disabled khi user không có tọa độ | Tài khoản chưa có `lat/lng` | UI báo trạng thái phù hợp, không giả filter hoạt động. |
| `JOBS-API-007` | `[ ]` | Load more | click `Show more` | Request tiếp theo dùng `afterId`, append card mới, không lặp item cũ. |
| `JOBS-API-008` | `[ ]` | Empty state | filter ra 0 kết quả | UI hiển thị empty state đúng chỗ, không chèn fallback listing. |
| `JOBS-API-009` | `[ ]` | Apply job thành công | `POST /_api/jobs/apply` | Backend trả success thật, job chuyển sang trạng thái `already applied`, count tăng lên trên UI. |
| `JOBS-API-010` | `[ ]` | Apply job lỗi validation | thiếu `email` hoặc thiếu answer | Bridge trả lỗi backend, modal giữ nguyên và hiển thị lỗi. |
| `JOBS-API-011` | `[ ]` | Apply job với câu hỏi free text | job có `free_text_question` | Submit thành công khi answer có giá trị. |
| `JOBS-API-012` | `[ ]` | Apply job với câu hỏi yes/no | job có `yes_no_question` | Submit đúng payload `yes/no`, backend nhận thành công. |
| `JOBS-API-013` | `[ ]` | Apply job với multiple choice | job có `multiple_choice_question` | Submit đúng answer option thật, backend nhận thành công. |
| `JOBS-API-014` | `[ ]` | Create job với page cover | `POST /_api/jobs/create` với `imageType=cover` | Job mới được tạo thật, reload `/jobs` thấy item mới nếu hợp filter. |
| `JOBS-API-015` | `[ ]` | Create job với upload | `POST /_api/jobs/create` với `imageType=upload` + file ảnh | Backend upload ảnh thật, job mới có ảnh upload. |
| `JOBS-API-016` | `[ ]` | Create job lỗi thiếu field | thiếu `pageId`, `title`, `category`... | Bridge trả lỗi, modal không đóng, không fake success. |

## UI và UX

| ID | Status | Case | Viewport | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `JOBS-UI-001` | `[ ]` | Parity desktop | `>= 1024px` | Bố cục là header nhỏ -> filter bar -> grid job -> load more, bám `themes/wowonder/layout/jobs/content.phtml`. |
| `JOBS-UI-002` | `[ ]` | Card job | `>= 1024px` | Card hiển thị ảnh, title, category, type, location, salary, apply button; không còn stat, badge, save button, detail CTA thừa. |
| `JOBS-UI-003` | `[ ]` | Empty state | `>= 1024px` | Empty state nằm ngay vùng listing, không có fallback text hardcode ngoài i18n. |
| `JOBS-UI-004` | `[ ]` | Mobile stacking | `390x844` | Search và select stack dọc, grid xuống 1 cột, modal không overflow. |
| `JOBS-UI-005` | `[ ]` | Create button disabled | User không có page sở hữu | CTA vẫn thấy trên `/jobs`, nhưng modal/create state giải thích đúng lý do và không submit giả. |
| `JOBS-UX-001` | `[ ]` | Loading state | Slow API | Listing có skeleton hợp lý, không lộ data cũ sai filter. |
| `JOBS-UX-002` | `[ ]` | Không còn runtime mock | `/jobs` | Không còn hero mock, sidebar mock, detail panel mock, local-only create/apply success, hay text nói về mock flow. |

## So sánh với phtml

| ID | Status | Case | Nguồn đối chiếu | Kỳ vọng |
| --- | --- | --- | --- | --- |
| `JOBS-PHTML-001` | `[ ]` | Thứ tự section | `themes/wowonder/layout/jobs/content.phtml` | Header nhỏ và filter row xuất hiện trước listing, không có dashboard section lạ. |
| `JOBS-PHTML-002` | `[ ]` | Apply modal | `themes/wowonder/layout/modals/apply_job.phtml` | Field, experience block và question block đúng thứ tự của PHP. |
| `JOBS-PHTML-003` | `[ ]` | Create payload | `xhr/job.php` và `api/v2/endpoints/job.php` | Tên field Nuxt bridge map đúng backend thật, không còn field frontend-only. |

## Lệnh kiểm tra

```powershell
cd client
npm run build
```

## Ghi chú

- Nếu `distance` không hoạt động, kiểm tra trước dữ liệu `lat/lng` của tài khoản trong backend PHP.
- Nếu `create job` trả lỗi dù form hợp lệ, kiểm tra account có page sở hữu thật và backend `can_use_jobs` đang bật.
- Nếu `apply job` báo đã ứng tuyển, xác nhận lại `job.apply` từ `api/v2/endpoints/job.php type=search` trước khi sửa UI.
