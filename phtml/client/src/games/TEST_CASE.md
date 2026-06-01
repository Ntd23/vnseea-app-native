English description: Manual QA checklist for the backend-backed games context.

# TEST CASE - Games

## GAMES-001 - Hard reload `/games`
- Mở `/games` bằng reload trình duyệt.
- Kỳ vọng trang gọi `/_api/games` và hiển thị game thật từ backend.
- Không hiển thị hero, leaderboard, saved toggle hoặc dữ liệu mock.

## GAMES-002 - Tab My/Latest/Popular
- Chuyển từng tab.
- Kỳ vọng `my` gọi game của tôi, `latest` gọi game mới, `popular` gọi game phổ biến.

## GAMES-003 - Search
- Nhập từ khóa vào ô tìm kiếm và gửi.
- Kỳ vọng URL có `q`, backend dùng API search game thật.

## GAMES-004 - Play game
- Bấm `Chơi ngay`.
- Kỳ vọng gọi `POST /_api/games/play`, sau đó mở URL game backend.

## GAMES-005 - Load more
- Khi danh sách đủ limit, bấm `Xem thêm`.
- Kỳ vọng append game thật, không thêm item giả.

## GAMES-006 - Empty state
- Tìm một từ khóa không có game.
- Kỳ vọng empty state hiển thị đúng, không fallback sang catalog mock.

## GAMES-007 - Responsive
- Kiểm tra mobile và desktop.
- Kỳ vọng card game dạng list/grid gọn như phtml, không có panel thừa.
