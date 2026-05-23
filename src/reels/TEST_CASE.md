# Description: Test cases for the reels bounded context — Create Reel Video feature.

# Reels Test Cases

## Scope

- Context: `src/reels`
- Routes:
  - `CreateReel`
  - `Reels` (tab — xem danh sách reels)
- Main entry points:
  - `src/reels/presentation/screens/CreateReelScreen.tsx`
  - `src/reels/application/view-models/useCreateReelViewModel.ts`
  - `src/reels/infrastructure/repositories/ApiReelsRepository.ts`
- Out of scope:
  - Video trimming / cropping
  - Video filters / effects

## Environment

- React Native target: Android debug build on physical device or emulator (arm64-v8a).
- Backend API: `https://demo.vnseea.vn/api`
- Backend session source: WoWonder `access_token` stored in MMKV.
- Auth requirement: authenticated (access_token required).

## Smoke

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `REEL-SMOKE-001` | `[ ]` | Screen renders | Home → "+" → "Create Reel Video" | `CreateReelScreen` hiện ra không crash, empty state với 2 button chọn video |
| `REEL-SMOKE-002` | `[ ]` | Back navigation | Back button trên `CreateReelScreen` | Quay về màn hình trước, không stale state |

## API And Data

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `REEL-API-001` | `[ ]` | Upload video thành công (sync) | Chọn video → "Đăng Reel Video" | Alert "Thành công", navigate back. `post_data.postFile` có URL |
| `REEL-API-002` | `[ ]` | Upload video (ffmpeg async) | Server bật ffmpeg_system=on | Alert "Đang xử lý" với message từ server → navigate back |
| `REEL-API-003` | `[ ]` | Post pending review | Admin bật post_approval | Alert "Chờ duyệt" |
| `REEL-API-004` | `[ ]` | Backend error (invalid video) | Upload file ảnh thay vì video | Error message inline: "Đã xảy ra lỗi..." |
| `REEL-API-005` | `[ ]` | Caption được gửi lên | Nhập caption → Đăng | `post_data.postText` khớp caption đã nhập |
| `REEL-API-006` | `[ ]` | postType=reel được tag | Upload thành công | `post_data.postType === "reel"` trong response |
| `REEL-API-007` | `[ ]` | Mention suggestions | Nhập `@gi` trong caption | Gọi `/api/search`, hiển thị user gợi ý và tap gợi ý chèn `@username` |
| `REEL-API-008` | `[ ]` | Hashtag suggestions | Nhập `#du` trong caption | Gọi `/api/hashtag-suggestions`, hiển thị hashtag gợi ý và tap gợi ý chèn `#tag` |
| `REEL-API-009` | `[ ]` | Default mention suggestions | Nhập đúng `@` trong caption | Gọi `/api/get-user-suggestions`, hiển thị user gợi ý mặc định |
| `REEL-API-010` | `[ ]` | Default hashtag suggestions | Nhập đúng `#` trong caption | Gọi `/api/hashtag-suggestions` không query, hiển thị hashtag trending |
| `REEL-API-011` | `[ ]` | Empty suggestions | Nhập `#zzzz-no-match` hoặc `@zzzz-no-match` | Hiển thị dòng "Chưa có gợi ý phù hợp" sau khi tìm xong |
| `REEL-API-012` | `[ ]` | Mention display name | Tap một mention suggestion | Caption hiển thị `@Tên người dùng`, khi submit backend vẫn nhận `@username` để parse mention |
| `REEL-API-013` | `[ ]` | Hashtag posts fallback | Nhập một hashtag có page/post như `#test` nhưng suggestion endpoint trả rỗng | App vẫn hiện gợi ý chính xác `#test` nhờ fallback `/api/posts` type `hashtag` |

| `REEL-API-014` | `[ ]` | Fetch reel comments | Tap icon comment tren reel | Goi `POST /api/comments` voi `type=fetch_comments`, hien thi comment that trong bottom sheet |
| `REEL-API-015` | `[ ]` | Create reel comment | Nhap comment trong sheet -> gui | Goi `POST /api/comments` voi `type=create`, comment moi hien thi va so binh luan tang |
| `REEL-API-016` | `[ ]` | Empty reel comments | Mo sheet tren reel chua co comment | Hien thi "Chua co binh luan", khong crash |

## UI And UX

| ID | Status | Case | Viewport | Expected |
| --- | --- | --- | --- | --- |
| `REEL-UI-001` | `[ ]` | Mobile layout | Android phone | Không bị overflow, buttons đủ tap target, caption input không bị keyboard che |
| `REEL-UX-001` | `[ ]` | Nút "Đăng" bị disable khi chưa có video | Mở screen, chưa chọn video | Button "Đăng Reel Video" có opacity 50%, không tap được |
| `REEL-UX-002` | `[ ]` | Loading state khi đang upload | Tap "Đăng" | Button đổi thành spinner "Đang đăng...", không submit 2 lần |
| `REEL-UX-003` | `[ ]` | Chọn từ thư viện | Tap "Chọn từ thư viện" | Mở media picker, hiển thị chỉ video files |
| `REEL-UX-004` | `[ ]` | Quay video trực tiếp | Tap "Quay video trực tiếp" | Mở camera ở chế độ video, yêu cầu permission CAMERA + RECORD_AUDIO |
| `REEL-UX-005` | `[ ]` | Sau khi chọn video | Chọn 1 video | Empty state biến mất, hiển thị tên file + nút thay đổi |
| `REEL-UX-006` | `[ ]` | Retry sau lỗi | Upload fail → tap Đăng lại | Error cũ clear, thực hiện upload lại |

| `REEL-UX-009` | `[ ]` | Bottom sheet binh luan | Tap comment rail | Sheet truot tu duoi len, video tam pause, dong sheet khong reset vi tri reel |
| `REEL-UX-010` | `[ ]` | Keyboard comment | Focus input trong comment sheet | Input va nut gui van nhin thay, keyboard khong che CTA |

## Regression Commands

Additional regression cases for video preview stability:

| ID | Status | Case | Viewport | Expected |
| --- | --- | --- | --- | --- |
| `REEL-UX-007` | `[ ]` | Preview video local | Android phone | Chọn hoặc quay video hợp lệ sẽ hiện loader rồi nút play, preview không đen màn hình và app không văng. |
| `REEL-UX-008` | `[ ]` | Chặn video quá dài/nặng | Android phone | Video >60 giây hoặc >300MB hiển thị alert, không mount preview video gây OOM. |
| `REEL-UI-002` | `[ ]` | Tiêu đề form nhập thông tin | Android phone nhỏ | Nhãn mô tả và bộ đếm ký tự không bị cắt hoặc đè lên nhau. |

```powershell
npx tsc --noEmit
npx jest --passWithNoTests
```

## Notes

- Backend endpoint: `POST /api/new_post` (multipart/form-data) với `postType=reel`.
- Caption suggestions: mention dùng `POST /api/search`, hashtag dùng `POST /api/hashtag-suggestions`.
- Video formats accepted: mp4, m4v, webm, flv, mov, mpeg, mkv.
- Khi `ffmpeg_system=on` trên server: response không có `post_data`, chỉ có `{ status: 200, message: "Your video is in process" }` — app hiện alert "Đang xử lý".
- Permission CAMERA và RECORD_AUDIO phải được cấp trước khi `launchCamera`. Nếu bị từ chối, react-native-image-picker trả `errorCode: 'permission'` — chưa handle explicit permission dialog trong v1.
- `READ_MEDIA_VIDEO` (Android 13+) và `READ_EXTERNAL_STORAGE` (Android ≤12) trong `AndroidManifest.xml` cần rebuild native.
