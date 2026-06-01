English description: Manual QA checklist for the backend-backed directory context.

# TEST CASE - Directory

## DIRECTORY-001 - Hard reload `/directory`
- Mở `/directory` bằng reload trình duyệt.
- Kỳ vọng gọi `/_api/directory` và lấy danh sách mục từ feature flag backend.

## DIRECTORY-002 - Enabled items
- Tắt/bật các module như pages, groups, games, forum, jobs, funding trong backend.
- Kỳ vọng directory chỉ hiện mục đang bật, không có item mock.

## DIRECTORY-003 - Section order
- So sánh với `themes/wowonder/layout/directory/content.phtml` và `left-sidebar.phtml`.
- Kỳ vọng header trước, sau đó danh sách destination.

## DIRECTORY-004 - Open item
- Bấm từng mục trong directory.
- Kỳ vọng mở đúng URL backend/Nuxt tương ứng, không có link giả.

## DIRECTORY-005 - Empty state
- Tắt directory system hoặc làm backend trả danh sách rỗng.
- Kỳ vọng empty state chuẩn, không fallback local.

## DIRECTORY-006 - Responsive
- Kiểm tra mobile và desktop.
- Kỳ vọng card destination xếp gọn, icon và text không tràn.
