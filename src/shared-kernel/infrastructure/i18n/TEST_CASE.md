# Description: Test cases for the i18n (internationalization) shared-kernel
# subsystem. Covers locale persistence, runtime switching, device-locale
# detection, and fallback behavior on unknown keys.

# i18n Test Cases

## Scope

- Context: `src/shared-kernel/infrastructure/i18n`
- Public surface:
  - `initI18n()` — called once from `App.tsx` before any UI mounts.
  - `changeLocale(locale)` — called from the Settings screen's language
    switcher.
  - `localeStorage` — MMKV-backed persistence (`vnseea-i18n-settings` id).
  - `useT(namespace?)`, `useLocale()` — convenience wrappers around
    `react-i18next`'s `useTranslation`.
- Supported locales: `vi` (default), `en`.
- Resource files:
  - `locales/vi.json` — Vietnamese strings.
  - `locales/en.json` — English strings.
- Out of scope: brand string translations (VNSEEA, WoWonder, Facebook,
  Google, etc.) — these stay verbatim in both locales.

## Environment

- React Native target: Android debug build on a physical device or emulator.
  `react-native-localize` is a native module — requires `cd android &&
  ./gradlew clean && cd .. && pnpm run android` after install to pick up
  the new native code (also `Pod install` on iOS).
- MMKV (`react-native-mmkv`) backs `localeStorage`. The id is
  `vnseea-i18n-settings`, key `app_locale`.
- First-launch locale: derived from `RNLocalize.findBestLanguageTag(['vi','en'])`
  when no persisted value exists; ultimately defaults to `vi`.

## Locale detection

| ID            | Status | Case                                 | Entry                                                                  | Expected                                                                                                  |
| ------------- | ------ | ------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `I18N-001` (a) | `[ ]`  | Locale persists across app restarts  | Settings -> toggle to English, fully kill the app, relaunch            | On relaunch the i18next instance boots with `lng: 'en'` (read from MMKV `app_locale`), the UI renders English. |
| `I18N-001` (b) | `[ ]`  | Settings switcher flips `t()` output | Settings -> tap the English option                                     | `changeLocale('en')` is called, MMKV `app_locale` becomes `'en'`, all `useTranslation()` consumers re-render with English copy (e.g. share sheet title becomes "Share post" instead of "Chia sẻ bài viết"). |
| `I18N-001` (c) | `[ ]`  | Fallback to `vi` on unknown key      | Inject a fake key like `t('does.not.exist')` in a temp component        | The returned string is the key itself (e.g. `'does.not.exist'`), and the rest of the visible text is rendered in `vi` because `fallbackLng: 'vi'` is set in `initI18n()`. |
| `I18N-002`    | `[ ]`  | First-launch locale from device      | Clear app data on a device whose system language is English, launch    | On first launch `RNLocalize.findBestLanguageTag(['vi','en'])` returns `en`, `localeStorage` writes `'en'`, the UI boots in English without the user opening Settings. |
| `I18N-003`    | `[ ]`  | First-launch fallback to `vi`        | Clear app data on a device whose system language is neither `vi` nor `en` (e.g. `fr-FR`), launch | `RNLocalize.findBestLanguageTag` returns `null`, the catch-all falls back to `'vi'`, the UI boots in Vietnamese. |
| `I18N-004`    | `[ ]`  | Switch back to `vi`                  | Settings -> switch from English to Vietnamese                          | `changeLocale('vi')` is called, MMKV `app_locale` becomes `'vi'`, share sheet title flips back to "Chia sẻ bài viết". |
| `I18N-005`    | `[ ]`  | MMKV storage isolated from legacy `languageStorage` | Inspect MMKV at app launch                                                | `vnseea-i18n-settings` contains `app_locale = 'vi' \| 'en'`. The legacy `vnseea-app-language` MMKV (used by 42+ files via `AppLanguage`) is untouched and continues to work alongside it. |
| `I18N-006`    | `[ ]`  | Brand strings preserved              | Open the share sheet in both `vi` and `en`                              | "VNSEEA" appears verbatim in both locales — never translated. |
| `I18N-007`    | `[ ]`  | Share sheet closes cleanly across locales | Open share sheet in `vi`, close, switch to `en`, open again          | Tab bar remains hidden while open and reappears on close in both locales. No stale Vietnamese copy leaks into the English render after switching mid-session. |