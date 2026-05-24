# Description: Test cases for the shared foundation context and reusable raw API mappers.

# Test Case Foundation

## Phạm Vi

- Context: `src/foundation`
- Entry point chính:
  - `src/foundation/domain/types/foundation.types.ts`
  - `src/foundation/application/normalizers/resolveValue.ts`
  - `src/foundation/application/normalizers/url.ts`
  - `src/foundation/application/pagination/pagination.ts`
  - `src/foundation/application/mappers/*`
  - `src/foundation/infrastructure/mappers/resolveSummaryMappers.ts`
- Ngoài phạm vi:
  - Thực thi API request.
  - Render screen.
  - Rule mapping riêng của từng feature.

## Smoke Test

| ID                | Trạng thái | Trường hợp kiểm thử                | Entry                     | Kết quả mong đợi                                                   |
| ----------------- | ---------- | ---------------------------------- | ------------------------- | ------------------------------------------------------------------ |
| `FOUND-SMOKE-001` | `[x]`      | Export của foundation compile được | `src/foundation/index.ts` | Toàn bộ type/helper export compile, không lỗi circular dependency. |
| `FOUND-SMOKE-002` | `[x]`      | Không phụ thuộc presentation       | `src/foundation/**`       | Foundation không import React Native screen hoặc component.        |

## Normalizer

| ID               | Trạng thái | Trường hợp kiểm thử     | Entry             | Kết quả mong đợi                                                            |
| ---------------- | ---------- | ----------------------- | ----------------- | --------------------------------------------------------------------------- |
| `FOUND-NORM-001` | `[x]`      | Chuẩn hóa entity id     | `asEntityId`      | Id dạng number/string được đổi thành string; giá trị rỗng trả `undefined`.  |
| `FOUND-NORM-002` | `[x]`      | Chuẩn hóa boolean       | `asBoolean`       | `1`, `"1"`, `true` thành `true`; `0`, `"0"`, `false` thành `false`.         |
| `FOUND-NORM-003` | `[x]`      | Chuẩn hóa URL tương đối | `normalizeRawUrl` | Media path tương đối được nối với `WEB_BASE_URL`; URL tuyệt đối giữ nguyên. |

## Mapper

| ID              | Trạng thái | Trường hợp kiểm thử | Entry             | Kết quả mong đợi                                                         |
| --------------- | ---------- | ------------------- | ----------------- | ------------------------------------------------------------------------ |
| `FOUND-MAP-001` | `[x]`      | Map user summary    | `mapUserSummary`  | Raw user field map sang `UserSummary`, không hardcode display fallback.  |
| `FOUND-MAP-002` | `[x]`      | Map page summary    | `mapPageSummary`  | Raw page field map sang `PageSummary` và normalize avatar/cover URL.     |
| `FOUND-MAP-003` | `[x]`      | Map group summary   | `mapGroupSummary` | Raw group field map sang `GroupSummary` và normalize avatar/cover URL.   |
| `FOUND-MAP-004` | `[x]`      | Map media asset     | `mapMediaAsset`   | Kind image/video/file được suy ra từ MIME type hoặc file extension.      |
| `FOUND-MAP-005` | `[x]`      | Map post summary    | `mapPostSummary`  | Post id, author, text, media và created time được map từ raw API record. |

## Pagination

| ID               | Trạng thái | Trường hợp kiểm thử    | Entry                   | Kết quả mong đợi                                                       |
| ---------------- | ---------- | ---------------------- | ----------------------- | ---------------------------------------------------------------------- |
| `FOUND-PAGE-001` | `[x]`      | Map payload phân trang | `toPaginationPayload`   | `afterPostId` được map sang API field `after_post_id`.                 |
| `FOUND-PAGE-002` | `[x]`      | Metadata phân trang    | `createPaginatedResult` | `nextOffset` và `hasMore` được tính từ `limit`/`offset` và item count. |

## Lệnh Regression

```powershell
npx tsc --noEmit
npx jest --passWithNoTests
```

## Ghi Chú

- Nếu behavior mapper chỉ dùng cho một context, giữ nó trong context đó trước.
- Chỉ chuyển mapper vào foundation khi có ít nhất hai context cần cùng một shape.
