# Description: Test cases for the user bounded context API bridge and profile mapping.

# Test Case User

## Phạm Vi

- Context: `src/user`
- Entry point chính:
  - `src/user/domain/types/user.types.ts`
  - `src/user/application/mappers/userProfileMapper.ts`
  - `src/user/application/mappers/userPayloadMapper.ts`
  - `src/user/infrastructure/repositories/ApiUserRepository.ts`
  - `src/user/application/view-models/useUserViewModel.ts`
- Ngoài phạm vi:
  - Login/register/logout.
  - UI của profile/settings/search.
  - Follow/unfollow action.

## API Bridge

| ID             | Trạng thái | Trường hợp kiểm thử      | Entry               | Kết quả mong đợi                                                    |
| -------------- | ---------- | ------------------------ | ------------------- | ------------------------------------------------------------------- |
| `USER-API-001` | `[ ]`      | Lấy current user         | `getCurrentUser`    | Có token thì gọi `apiRoutes.auth.me` và trả `UserProfile`.          |
| `USER-API-002` | `[ ]`      | Chưa có token            | `getCurrentUser`    | Không gọi API và trả `null`.                                        |
| `USER-API-003` | `[ ]`      | Lấy profile theo user id | `getUserProfile`    | Gửi `user_id`, `fetch`; response được map sang `UserProfileResult`. |
| `USER-API-004` | `[ ]`      | Lấy gợi ý người dùng     | `getSuggestions`    | Response `suggestions` được map sang danh sách `UserProfile`.       |
| `USER-API-005` | `[ ]`      | Lấy người dùng gần đây   | `getNearbyUsers`    | Response `nearby_users` được map sang danh sách `UserProfile`.      |
| `USER-API-006` | `[ ]`      | Cập nhật current user    | `updateCurrentUser` | Payload dùng field WoWonder đúng và trả message nếu API có trả.     |

## Mapper

| ID             | Trạng thái | Trường hợp kiểm thử   | Entry                        | Kết quả mong đợi                                              |
| -------------- | ---------- | --------------------- | ---------------------------- | ------------------------------------------------------------- |
| `USER-MAP-001` | `[ ]`      | Map profile cơ bản    | `mapUserProfile`             | Id, username, name, avatar, cover, verified được map đúng.    |
| `USER-MAP-002` | `[ ]`      | Map trạng thái follow | `mapUserProfile`             | `is_following` map sang `none`, `following` hoặc `requested`. |
| `USER-MAP-003` | `[ ]`      | Map fetch profile     | `toUserProfileFetchValue`    | Boolean fetch options tạo chuỗi `user_data,followers,...`.    |
| `USER-MAP-004` | `[ ]`      | Map payload update    | `toUpdateCurrentUserPayload` | Field app như `phoneNumber` đổi sang `phone_number`.          |

## Lệnh Regression

```powershell
npx tsc --noEmit
npx jest --passWithNoTests
```

## Ghi Chú

- `user` là context nền cho profile/settings/search/feed dùng thông tin người dùng.
- Không gọi API trực tiếp từ screen; screen phải đi qua ViewModel hoặc repository contract.
