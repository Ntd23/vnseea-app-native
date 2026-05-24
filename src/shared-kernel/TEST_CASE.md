# Description: Test cases for the shared-kernel API foundation and cross-context utilities.

# Test Case Shared Kernel

## Phạm Vi

- Context: `src/shared-kernel`
- Entry point chính:
  - `src/shared-kernel/infrastructure/config/env.ts`
  - `src/shared-kernel/application/api/apiResponse.ts`
  - `src/shared-kernel/infrastructure/api/client.ts`
  - `src/shared-kernel/infrastructure/api/apiBridge.ts`
  - `src/shared-kernel/infrastructure/storage/sessionStorage.ts`
- Ngoài phạm vi:
  - Mapping response riêng của từng bounded context.
  - Ký bản release native và phân phối lên store.

## Môi Trường

- Target React Native: Android debug build trên máy thật hoặc emulator.
- Metro: `pnpm start -- --reset-cache`.
- API: `API_BASE_URL=https://demo.vnseea.vn/api`.
- Web root: `WEB_BASE_URL=https://demo.vnseea.vn`.
- Session source: WoWonder `access_token` lưu trong MMKV.
- Env bắt buộc: `API_BASE_URL`, `WEB_BASE_URL`, `SERVER_KEY`, `REQUEST_TIMEOUT_MS`.

## Smoke Test

| ID             | Trạng thái | Trường hợp kiểm thử                   | Entry                      | Kết quả mong đợi                                               |
| -------------- | ---------- | ------------------------------------- | -------------------------- | -------------------------------------------------------------- |
| `SK-SMOKE-001` | `[ ]`      | App khởi động với env bắt buộc        | `env.ts` khi app bootstrap | App chạy, không báo thiếu biến môi trường.                     |
| `SK-SMOKE-002` | `[ ]`      | Metro bỏ qua thư mục build native tạm | `metro.config.js`          | Gradle build được khi Metro đang chạy, không lỗi watch `.cxx`. |
| `SK-SMOKE-003` | `[ ]`      | CSS token vẫn parse được              | `assets/styles/tokens.css` | CSS interop parser chạy xong, không crash.                     |

## API Và Dữ Liệu

| ID           | Trạng thái | Trường hợp kiểm thử           | Entry                                                | Kết quả mong đợi                                                                         |
| ------------ | ---------- | ----------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `SK-API-001` | `[ ]`      | Chuẩn hóa URL POST            | `apiBridge.post('/api/auth')`                        | Request cuối cùng trỏ tới `https://demo.vnseea.vn/api/auth`, không bị `/api/api/auth`.   |
| `SK-API-002` | `[ ]`      | Tự động gắn `server_key`      | Request interceptor của `apiClient`                  | Request không phải GET có `server_key` từ `.env`; không hardcode key trong file tracked. |
| `SK-API-003` | `[ ]`      | Tự động gắn `access_token`    | `sessionStorage.setSession` rồi gọi request cần auth | Query của request có `access_token=<stored token>`.                                      |
| `SK-API-004` | `[ ]`      | Payload POST dạng URL-encoded | Login request                                        | PHP nhận field qua `$_POST` và trả JSON, không lỗi transport chung chung.                |
| `SK-API-005` | `[ ]`      | Payload multipart             | `apiBridge.multipart`                                | Upload request giữ `FormData` và tự append `server_key`.                                 |
| `SK-API-006` | `[x]`      | Chuẩn hóa lỗi từ API          | API trả `api_status` ngoài `200`/`220`               | Throw `ApiBridgeError` có message, status và error id từ API nếu có.                     |

## Storage

| ID             | Trạng thái | Trường hợp kiểm thử             | Entry                         | Kết quả mong đợi                                             |
| -------------- | ---------- | ------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `SK-STORE-001` | `[ ]`      | Lưu auth session                | `sessionStorage.setSession`   | Access token, user id và platform được lưu trong MMKV.       |
| `SK-STORE-002` | `[ ]`      | Đọc session sau khi app restart | `sessionStorage.getSession`   | Token data cũ vẫn đọc được sau JS reload/native app restart. |
| `SK-STORE-003` | `[ ]`      | Xóa auth session                | `sessionStorage.clearSession` | Access token và các key liên quan bị xóa.                    |

## Lệnh Regression

```powershell
npx tsc --noEmit
npx jest --passWithNoTests
node -e "const fs=require('fs'); const p=require('react-native-css-interop/dist/css-to-rn'); const css=fs.readFileSync('assets/styles/tokens.css','utf8'); const fn=p.cssToReactNativeRuntime||p.default||p; Promise.resolve(fn(css,{grouping:['^group(/.*)?'],inlineRem:14})).then(()=>console.log('css interop parse ok')).catch(e=>{console.error(e); process.exit(1);});"
```

## Ghi Chú

- Đổi `.env` của `react-native-config` thì phải rebuild Android, Metro reload là chưa đủ.
- `SERVER_KEY` chỉ được nằm trong `.env` local; `.env.example` phải dùng placeholder.
