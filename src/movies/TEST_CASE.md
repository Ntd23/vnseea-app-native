# Description: Test cases for the movies bounded context (read + create).

# Movies Test Cases

## Scope

- Context: `src/movies`
- Routes:
  - `ROUTES.MOVIES` — list of movies (read)
  - `ROUTES.CREATE_MOVIE` — composer to publish a new movie (write)
- Main entry points:
  - `src/movies/presentation/screens/MoviesScreen.tsx`
  - `src/movies/presentation/screens/CreateMovieScreen.tsx`
  - `src/movies/application/view-models/useMoviesViewModel.ts`
  - `src/movies/application/view-models/useCreateMovieViewModel.ts`
  - `src/movies/infrastructure/repositories/ApiMoviesRepository.ts`
- Out of scope:
  - `phtml/api/v2/endpoints/create-movie.php` (backend; covered separately in Postman/curl)
  - Movie detail / watch screen (does not exist yet — TODO)
  - Movie comments are covered by the `movies_comments` endpoint, not by the composer

## Environment

- React Native target: Android debug build on physical device or emulator.
- Backend API: `https://vnseea.vn/api` (env `API_BASE_URL`).
- Backend session source: WoWonder `access_token` stored in MMKV (`sessionStorage`).
- Auth requirement: **authenticated** for `CREATE_MOVIE`; **optional** for `MOVIES`.
- Composer state: `USE_REAL_API = true` — `useCreateMovieViewModel.submit()` posts multipart to `/api/create-movie` via `apiBridge.multipart`.

## Smoke

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `MOVIES-SMOKE-001` | `[ ]` | Movies list renders | `ROUTES.MOVIES` | Screen renders without runtime error; category chips visible; grid or empty state shown. |
| `MOVIES-SMOKE-002` | `ROUTES.MOVIES -> ROUTES.CREATE_MOVIE` | Client navigation to composer | `MoviesScreen` header `+` button | `CreateMovieScreen` mounts with header "Tạo phim" / "Create movie", cover card, and 10 form fields. |
| `MOVIES-SMOKE-003` | `ROUTES.CREATE_MOVIE -> ROUTES.MOVIES` | Client navigation back from composer | `CreateMovieScreen` close button or `goBack` | Returns to `MoviesScreen`; previous list state preserved. |
| `MOVIES-SMOKE-004` | `[ ]` | Composer header `+` button visible | `ROUTES.MOVIES` | Round white button with brand-blue `Plus` icon is rendered in the top-right of `MoviesScreen`. |

## API and Data

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `MOVIES-API-001` | `[ ]` | List success response | `useMoviesViewModel.loadMovies` | UI renders real API data, not mock; `movies.length` reflects API response. |
| `MOVIES-API-002` | `[ ]` | List API error | Invalid token / network down | ErrorState shows Vietnamese error message; no unhandled promise rejection. |
| `MOVIES-API-003` | `[ ]` | List empty response | Empty API result | EmptyState shown with "Không tìm thấy phim" message and retry CTA. |
| `MOVIES-API-004` | `[ ]` | Create success response | `useCreateMovieViewModel.submit()` with valid form | Multipart POST to `/api/create-movie`; UI shows success toast "Đã đăng phim"; screen pops back to `MoviesScreen`. |
| `MOVIES-API-005` | `[ ]` | Create API error | Invalid payload / unauthenticated | Error banner shows server `error_text`; draft is kept; submit button is re-enabled. |
| `MOVIES-API-006` | `[ ]` | Create network error | Airplane mode | Error banner shows "Lỗi mạng. Vui lòng kiểm tra kết nối và thử lại."; draft is kept. |
| `MOVIES-API-007` | `[ ]` | Backend regression: cover upload | Successful create WITH cover image | New row in `Wo_Movies` table has `cover` filename set (not null). |
| `MOVIES-API-008` | `[ ]` | Backend regression: `user_id` set | Successful create | New row in `Wo_Movies` table has `user_id` equal to the authenticated user; not null. |

## Form Fields Validation

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `MOVIES-FORM-001` | `[ ]` | Name < 3 chars | Submit with name "ab" | Inline error "Tên phim phải có ít nhất 3 ký tự"; submit blocked. |
| `MOVIES-FORM-002` | `[ ]` | Description < 32 chars | Submit with description "short" | Inline error "Mô tả phải có ít nhất 32 ký tự"; submit blocked. |
| `MOVIES-FORM-003` | `[ ]` | Missing genre | Submit without picking genre | Inline error "Vui lòng chọn thể loại"; submit blocked. |
| `MOVIES-FORM-004` | `[ ]` | Missing country | Submit without picking country | Inline error "Vui lòng chọn quốc gia"; submit blocked. |
| `MOVIES-FORM-005` | `[ ]` | Missing quality | Submit without picking quality | Inline error "Vui lòng chọn chất lượng"; submit blocked. |
| `MOVIES-FORM-006` | `[ ]` | Release year out of range | Release "1900" or "2099" | Inline error "Năm phát hành phải nằm trong khoảng 1960 - 2026"; submit blocked. |
| `MOVIES-FORM-007` | `[ ]` | Duration out of range | Duration "5" or "400" | Inline error "Thời lượng phải nằm trong khoảng 10 - 350 phút"; submit blocked. |
| `MOVIES-FORM-008` | `[ ]` | Rating out of range | Rating "0" or "11" | Inline error "Đánh giá phải nằm trong khoảng 1 - 10"; submit blocked. |
| `MOVIES-FORM-009` | `[ ]` | Source invalid URL | Source "abcxyz" | Inline error "URL không hợp lệ (chỉ hỗ trợ YouTube, Vimeo, hoặc URL trực tiếp)"; submit blocked. |
| `MOVIES-FORM-010` | `[ ]` | All fields valid | Submit valid form | Submit enabled (brand blue); loading spinner shown; success toast; navigate back. |

## Cover Picker

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `MOVIES-COVER-001` | `[ ]` | Pick cover success | Tap cover card, choose image | Cover image preview shown; selected indicator "Đã chọn ảnh bìa" visible. |
| `MOVIES-COVER-002` | `[ ]` | Pick cover oversize rejection | Image > 400×570 | Toast "Kích thước ảnh bìa không được quá 400×570" appears; cover is still set so the user sees the chosen image with the inline error. |
| `MOVIES-COVER-003` | `[ ]` | Replace cover | Tap "Thay ảnh bìa" | `launchImageLibrary` reopens; new image replaces previous. |
| `MOVIES-COVER-004` | `[ ]` | No cover picked | Submit without picking cover | Inline error "Vui lòng chọn ảnh bìa"; submit blocked. |

## Source Detection

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `MOVIES-SRC-001` | `[ ]` | YouTube URL detected | Source `https://www.youtube.com/watch?v=abc` | Helper text shows "Phát hiện: YouTube" with red `Play` icon. |
| `MOVIES-SRC-002` | `[ ]` | Vimeo URL detected | Source `https://vimeo.com/12345` | Helper text shows "Phát hiện: Vimeo" with blue `Link2` icon. |
| `MOVIES-SRC-003` | `[ ]` | Direct URL detected | Source `https://example.com/video.mp4` | Helper text shows "Phát hiện: URL trực tiếp" with brand `Image` icon. |
| `MOVIES-SRC-004` | `[ ]` | Source empty | Source = "" | Helper text shows "Hỗ trợ YouTube, Vimeo hoặc URL trực tiếp". |

## Submit Flow

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `MOVIES-SUBMIT-001` | `[ ]` | Idle -> Submitting transition | Tap submit with valid form | Submit button shows `ActivityIndicator`; button disabled; other fields locked visually. |
| `MOVIES-SUBMIT-002` | `[ ]` | Submitting -> Success | API returns 200 | Phase becomes success; success toast "Đã đăng phim"; ~350ms delay then `navigation.goBack()`. |
| `MOVIES-SUBMIT-003` | `[ ]` | Submitting -> Error (server) | API returns 400 with `error_text` | Error banner shows server message; submit button re-enabled; draft preserved. |
| `MOVIES-SUBMIT-004` | `[ ]` | Discard confirmation with draft | Tap close button with non-empty draft | `Alert` shows "Bỏ phim này?" with "Bỏ" / "Tiếp tục chỉnh sửa" actions. |
| `MOVIES-SUBMIT-005` | `[ ]` | Close without draft | Tap close with empty draft | Screen pops immediately; no alert. |

## i18n

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `MOVIES-I18N-001` | `[ ]` | Vietnamese copy (default) | Open composer with `AppLanguage = 'vi'` | All labels, errors, helper text, picker options in Vietnamese. |
| `MOVIES-I18N-002` | `[ ]` | English copy | Switch `AppLanguage` to `'en'` and re-open composer | All labels, errors, helper text, picker options in English. |
| `MOVIES-I18N-003` | `[ ]` | Genre/Quality/Country options localised | Compare vi vs en option labels | `action` -> "Hành động" / "Action"; `hd` -> "HD DVD" / "HD DVD"; `vietnam` -> "Việt Nam" / "Vietnam". |

## Cross-domain Isolation

| ID | Status | Case | Entry | Expected |
| --- | --- | --- | --- | --- |
| `MOVIES-ISO-001` | `[ ]` | No cross-domain imports | grep `src/movies/**` for imports from other domains | Files only import from `shared-kernel`, `foundation`, `navigation`, and internal `src/movies/*` paths. No imports from `feed`, `pages`, `community`, etc. |
| `MOVIES-ISO-002` | `[ ]` | Composer does not touch existing read flow | Open `MoviesScreen` after composer mounted | `useMoviesViewModel` continues to load `/api/get-movies` unchanged; `getMovies` repository method is unchanged. |

## UI and UX

| ID | Status | Case | Viewport | Expected |
| --- | --- | --- | --- | --- |
| `MOVIES-UI-001` | `[ ]` | Composer mobile layout | Android phone, portrait | Cover card, 10 fields, submit button all visible without horizontal scroll; no clipped text. |
| `MOVIES-UI-002` | `[ ]` | Keyboard avoidance | Open composer, focus description field | Keyboard opens; description field remains visible; submit button reachable. |
| `MOVIES-UI-003` | `[ ]` | Submit button feedback | Tap submit (disabled) | `activeOpacity` reduces opacity; no tap event fires. |
| `MOVIES-UI-004` | `[ ]` | Picker modal | Tap genre/country/quality field | Bottom-sheet style modal opens with options; selecting an option closes the modal and updates the field. |
| `MOVIES-UX-001` | `[ ]` | Loading state | API slow | `ActivityIndicator` in submit button; no double-submit possible. |
| `MOVIES-UX-002` | `[ ]` | Retry path | API error -> user retries | User can re-tap submit without re-entering all fields; draft preserved across errors. |

## Regression Commands

```powershell
npx tsc --noEmit
npx jest --passWithNoTests
```

## Backend curl sanity check

```bash
curl -X POST https://vnseea.vn/api/create-movie \
  -H "access_token: <TOKEN>" \
  -F "name=Test Movie" \
  -F "description=Đây là mô tả phim dài hơn 32 ký tự để pass validate" \
  -F "genre=action" \
  -F "country=vietnam" \
  -F "stars=Tom Cruise, Emily Blunt" \
  -F "producer=Christopher McQuarrie" \
  -F "release=2023" \
  -F "duration=120" \
  -F "quality=hd" \
  -F "rating=8" \
  -F "source=https://www.youtube.com/watch?v=abc" \
  -F "cover=@/path/to/poster.jpg"
```

Expected: `{api_status: 200, movie_id: <id>, url: "..."}`. Verify in DB:
`SELECT * FROM Wo_Movies WHERE id=<id>` shows the new row with `user_id` set,
`cover` populated if uploaded, and all 10 scalar fields persisted.

## Notes

- The composer file is in `src/movies/` because the `movies` domain already
  owns the read side. The composer is the natural extension.
- Backend endpoint `create-movie.php` follows `docs/skills/php-bridge-safety`:
  no web-facing code is changed. Only a new file under
  `phtml/api/v2/endpoints/` is added.
- `USE_REAL_API` constant in `useCreateMovieViewModel.ts` should remain
  `true` after backend is verified. If backend becomes unavailable, flip
  to `false` for offline UI development.
- Known backend risk: column name `time` vs `created_at` in `Wo_Movies` is
  not directly verifiable from the repo. If `INSERT` fails with unknown
  column, edit `phtml/api/v2/endpoints/create-movie.php` line ~140 to use
  `created_at` instead of `time`.
- Known blocked case: movie detail / watch screen does not exist yet. The
  `url` returned by the API is used as-is; the parent `MoviesScreen` does
  not navigate to a detail screen on tap (it just logs the press).
