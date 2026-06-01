English description: Test cases for the profile bounded context, covering backend data, owner versus visitor states, tab rendering, and PHP-order UI parity.

# Profile Test Cases

## Phạm Vi

- Context: `client/src/profile`
- Route chính: `/@username`
- Route wrapper: `client/app/pages/@[username].vue`
- Page runtime: `client/src/profile/presentation/pages/ProfilePage.vue`
- View-model: `client/src/profile/application/composables/useProfileVM.ts`
- Repository: `client/src/profile/infrastructure/repositories/ApiProfileRepository.ts`
- API bridge: `/_api/profile/[username]` -> `client/server/api/profile/[username].get.ts`
- Backend endpoint: `get-user-data-username`

## Ngoài Phạm Vi

- Không test shared shell/header/mobile menu vì thuộc Dev 1.
- Không test edit profile/settings form chi tiết vì action button hiện chỉ điều hướng/CTA UI.
- Không test shared edit cover/avatar upload flow vì pass này chỉ hiển thị owner controls theo PHP order.

## Môi Trường

- Nuxt direct: `http://127.0.0.1:3000`
- Laragon proxy: custom domain đang trỏ qua Laragon/Nginx
- Session source: PHP backend cookie/session
- Viewport bắt buộc: Desktop `1440x900`, Tablet `1024x768`, Mobile `390x844`
- Test data: một user owner đang đăng nhập và một user khác để xem visitor state.

## Smoke

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `PROFILE-SMOKE-001` | `[ ]` | Hard reload owner profile | `/@<current_username>` | Page render không Nuxt error, không raw HTML flash, avatar/cover dùng asset backend hoặc gradient khi backend không có cover. |
| `PROFILE-SMOKE-002` | `[ ]` | Hard reload visitor profile | `/@<other_username>` | Hero, tabs, stats render từ backend user thật; không hiện owner-only camera/publisher. |
| `PROFILE-SMOKE-003` | `[ ]` | Client navigation | `/home` -> click/open `/@username` | Route đổi mượt, `useProfileVM` fetch lại đúng username, tab reset về `timeline`. |
| `PROFILE-SMOKE-004` | `[ ]` | Laragon proxy render | Custom domain `/@username` | Ảnh cover/avatar không lỗi `403`, CSS/JS không mất style, không hydration mismatch. |

## Route Access Và SEO

| ID | Status | Case | Precondition | Expected |
| --- | --- | --- | --- | --- |
| `PROFILE-ROUTE-001` | `[ ]` | Direct URL access khi logged in | Có PHP session hợp lệ | `/@username` vào thẳng được, không redirect sai sang auth/welcome. |
| `PROFILE-ROUTE-002` | `[ ]` | Direct URL access khi guest | Không có PHP session | Nếu backend cho public profile thì page render public state; nếu backend bắt auth thì hiển thị error/empty an toàn, không leak private owner UI. |
| `PROFILE-ROUTE-003` | `[ ]` | Malformed username | `/@%20` hoặc username rỗng qua navigation | Không crash; route wrapper vẫn giữ Nuxt ổn định và API không bị gọi với username rỗng ngoài kiểm soát. |
| `PROFILE-SEO-001` | `[ ]` | SEO meta | `/@username` | Title có dạng `<username> \| VNSEEA`; description ổn định, không dùng mock profile text. |

## API Và Data Thật

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `PROFILE-API-001` | `[ ]` | API success | `GET /_api/profile/<username>` | Response có `id`, `username`, `displayName`, `isOwner`, counts, `followers`, `following`, `timelinePosts`, `photos`, `videos`, `albums`, `likedPages`, `joinedGroups`; data đến từ backend thật. |
| `PROFILE-API-002` | `[ ]` | No mock fallback audit | `/@username` + Network tab | UI khớp response `/_api/profile/<username>`; không có tên/avatar/count hardcode nếu backend không trả. |
| `PROFILE-API-003` | `[ ]` | Owner detection | Owner profile | `isOwner=true`; hero hiện edit/settings actions, cover/avatar camera buttons, publisher chỉ ở timeline tab. |
| `PROFILE-API-004` | `[ ]` | Visitor detection | Other user profile | `isOwner=false`; hero hiện follow/message actions; không hiện publisher, cover/avatar camera buttons. |
| `PROFILE-API-005` | `[ ]` | Backend not found/null | Username không tồn tại | Page hiển thị `FoundationEmptyState`; không render fake user. |
| `PROFILE-API-006` | `[ ]` | Backend error | Chặn/fail `/_api/profile/<username>` | Không unhandled Nuxt error; loading kết thúc an toàn hoặc error state được xử lý theo UI hiện có. |
| `PROFILE-API-007` | `[ ]` | Timeline posts bridge | Network tab | API profile gọi backend `posts` với `type=get_user_posts`, `id=<profile_user_id>`; post card render cùng dữ liệu với response. |
| `PROFILE-API-008` | `[ ]` | Media bridge | Network tab | API profile gọi backend `get-user-albums` cho `photos` và `video`, gọi `albums` cho album list; không dùng mảng mock rỗng. |
| `PROFILE-API-009` | `[ ]` | Timeline load more | Click `Xem thêm` khi có thêm bài | Gọi `GET /_api/profile/<username>/posts?afterPostId=<last_id>` và append post thật vào timeline. |
| `PROFILE-API-010` | `[ ]` | About data audit | Network tab `/_api/profile/<username>` | About tab/sidebar chỉ render các field backend trả về: `working`, `school`, `address`, `website`, `email`, `phone`, `gender`, `birthday`, `relationship`; field rỗng phải ẩn, không fallback mock. |
| `PROFILE-API-011` | `[ ]` | Product preview | Profile có hơn 4 sản phẩm | Sidebar Products mặc định chỉ render 4 item đầu từ backend; click `Xem thêm` bung toàn bộ danh sách đã fetch. |

## Layout Và PHP Order

| ID | Status | Case | Viewport | Expected |
| --- | --- | --- | --- | --- |
| `PROFILE-UI-001` | `[ ]` | Hero order desktop | `1440x900` | Thứ tự đúng PHP: `cover -> avatar/name/stats/action cluster -> bottom tab nav -> tab body`. |
| `PROFILE-UI-002` | `[ ]` | Timeline owner body | `1440x900` | Timeline tab: publisher box, post stack/empty state, right sidebar intro/friends/photos. Không tự render completion nếu chưa có API completion thật. |
| `PROFILE-UI-003` | `[ ]` | Timeline visitor body | `1440x900` | Không có owner-only completion/publisher; layout hero và tabs giữ nguyên. |
| `PROFILE-UI-004` | `[ ]` | Mobile stacking | `390x844` | Cover/avatar/name/actions/tabs stack không overflow; tab nav ngay sau hero; timeline chỉ hiện publisher/post stack, không tự nhét About/Search/Following/Followers/Photos sidebar vào dưới timeline. |
| `PROFILE-UI-005` | `[ ]` | Tablet layout | `1024x768` | Hero không bị cắt action cluster; stats wrap ổn; sidebar không chen sai trước timeline body. |
| `PROFILE-UI-006` | `[ ]` | Asset handling | Desktop/mobile | Cover/avatar backend URL hiển thị đúng; khi không có cover thì gradient chỉ là visual placeholder, không thay thế dữ liệu user giả. |

## Tabs

| ID | Status | Case | Steps | Expected |
| --- | --- | --- | --- | --- |
| `PROFILE-TAB-001` | `[ ]` | Default tab | Mở `/@username` | Tab mặc định là `timeline`. |
| `PROFILE-TAB-002` | `[ ]` | About tab | Click `About` | Render sections từ backend fields thật: working/school/contact/basic nếu có; không bịa field thiếu. |
| `PROFILE-TAB-003` | `[ ]` | Friends tab | Click `Friends` | Theo PHP `connectivitySystem=1`, tab Friends hiển thị danh sách followers và số lượng lấy từ `details.followers_count`, không union với following. |
| `PROFILE-TAB-004` | `[ ]` | Photos/Videos/Albums tabs | Click từng tab | Render dữ liệu media/album thật từ API; chỉ hiện empty state khi backend trả danh sách rỗng. |
| `PROFILE-TAB-005` | `[ ]` | Username change reset | Từ `/@userA` client navigate sang `/@userB` | `activeTab` reset về `timeline`, data không stale từ user cũ. |
| `PROFILE-TAB-006` | `[ ]` | Mobile tab scroll hint | `390x844` | Tab nav có dấu hiệu kéo ngang ở cạnh phải, vẫn cuộn chạm được và không che active underline. |
| `PROFILE-TAB-007` | `[ ]` | Friends responsive cards | Mobile và desktop | Friends tab hiển thị card avatar vuông, tên và `@username` thật; không lộ raw meta/id dài làm vỡ layout. |

## Loading, Empty, Error

| ID | Status | Case | Setup | Expected |
| --- | --- | --- | --- | --- |
| `PROFILE-STATE-001` | `[ ]` | Loading skeleton | Throttle network/slow API | Skeleton render trong hero area; không flash mock user. |
| `PROFILE-STATE-002` | `[ ]` | Empty profile | API trả `null` | `FoundationEmptyState` xuất hiện, không render tabs/actions sai. |
| `PROFILE-STATE-003` | `[ ]` | Missing optional fields | User thiếu cover/avatar/bio/website/address | UI chỉ ẩn field thiếu hoặc hiện owner completion item; không bịa nội dung. |
| `PROFILE-STATE-004` | `[ ]` | Long names/meta | User name/headline dài | Text truncate/wrap hợp lý, không vỡ card trên desktop/mobile. |
| `PROFILE-STATE-005` | `[ ]` | Route loading indicator | Click link user/page/group/product trong `/@username` | Top loading indicator xuất hiện ngay khi route navigation bắt đầu, kể cả client navigation nhanh. |
| `PROFILE-STATE-006` | `[ ]` | Missing translation audit | `/@username` owner state | Không còn text dạng raw i18n key như `components.topbar.settingsNav.*` hoặc `pages.profilePage.editCover`. |

## Owner/Visitor Actions

| ID | Status | Case | Precondition | Expected |
| --- | --- | --- | --- | --- |
| `PROFILE-ACTION-001` | `[ ]` | Owner hero actions | Owner profile | Button `Edit profile`, `Settings` hiện đúng; camera buttons cover/avatar chỉ owner thấy. |
| `PROFILE-ACTION-002` | `[ ]` | Visitor hero actions | Visitor profile | Button `Follow`, `Message` hiện đúng; không hiện settings/camera/publisher. |
| `PROFILE-ACTION-003` | `[ ]` | Follow real action | Visitor profile | Click `Follow` gọi `POST /_api/profile/action` -> backend `follow-user`, sau đó refresh profile data. |
| `PROFILE-ACTION-004` | `[ ]` | Message navigation | Visitor profile | Click `Message` chuyển sang `/messages?user=<username>`; không gọi backend trực tiếp từ component. |

## Regression Commands

```powershell
cd client
cmd /c node_modules\.bin\tsc --noEmit -p tsconfig.json
npm run build
```

## Ghi Chú

- Khi test data thật, luôn so UI với response `/_api/profile/<username>` trong Network tab.
- Timeline, photos, videos, albums, liked pages, joined groups đã được bridge trong `/_api/profile/<username>`; nếu backend trả rỗng thì UI phải hiện empty state, không được tự bịa dữ liệu.
