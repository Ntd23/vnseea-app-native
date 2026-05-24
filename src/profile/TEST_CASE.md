# Description: Test cases for the profile presentation context and user-backed profile loading.

# Test Case Profile

## Phạm Vi

- Context: `src/profile`
- Entry point chính:
  - `src/profile/domain/types/profile.types.ts`
  - `src/profile/domain/repositories/ProfileRepository.ts`
  - `src/profile/infrastructure/repositories/ApiProfileRepository.ts`
  - `src/profile/application/view-models/useProfileViewModel.ts`
  - `src/profile/presentation/screens/ProfileScreen.tsx`
- Ngoài phạm vi:
  - Login/logout.
  - Follow/unfollow mutation.
  - Edit profile form.

## API Bridge

| ID                | Trạng thái | Trường hợp kiểm thử          | Entry         | Kết quả mong đợi                                                  |
| ----------------- | ---------- | ---------------------------- | ------------- | ----------------------------------------------------------------- |
| `PROFILE-API-001` | `[ ]`      | Mở profile không có `userId` | `loadProfile` | Gọi `userRepository.getCurrentUser()` và render profile hiện tại. |
| `PROFILE-API-002` | `[ ]`      | Mở profile có `userId`       | `loadProfile` | Gọi `userRepository.getUserProfile()` với `fetch=user_data`.      |
| `PROFILE-API-003` | `[ ]`      | API trả lỗi                  | ViewModel     | `error` có message đọc được; screen không crash.                  |

## UI

| ID               | Trạng thái | Trường hợp kiểm thử         | Entry           | Kết quả mong đợi                                          |
| ---------------- | ---------- | --------------------------- | --------------- | --------------------------------------------------------- |
| `PROFILE-UI-001` | `[ ]`      | Loading state               | `ProfileScreen` | Hiển thị trạng thái đang tải khi profile đang được load.  |
| `PROFILE-UI-002` | `[ ]`      | Empty unauthenticated state | `ProfileScreen` | Hiển thị thông báo chưa có dữ liệu profile.               |
| `PROFILE-UI-003` | `[ ]`      | Data state                  | `ProfileScreen` | Avatar, cover, name, username, details lấy từ API nếu có. |
| `PROFILE-UI-004` | `[ ]`      | Back/search actions         | `ProfileScreen` | Nút back quay lại; nút search mở màn Search.              |

## Lệnh Regression

```powershell
npx tsc --noEmit
npx jest --passWithNoTests
```
