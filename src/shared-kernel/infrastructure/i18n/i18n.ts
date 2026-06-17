// Description: Configures the i18next instance and exposes helpers used by
// the rest of the app. The first-launch locale is derived from the
// device locale via react-native-localize, falling back to the existing
// MMKV-persisted choice, then 'vi' as the ultimate default.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import { localeStorage } from './storage';
import en from './locales/en.json';
import vi from './locales/vi.json';

export const SUPPORTED_LOCALES = ['vi', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

function pickDeviceLocale(): Locale {
  try {
    const best = RNLocalize.findBestLanguageTag(SUPPORTED_LOCALES as unknown as string[]);
    if (best && (best.languageTag === 'vi' || best.languageTag === 'en')) {
      return best.languageTag;
    }
    const locales = RNLocalize.getLocales?.() ?? [];
    for (const entry of locales) {
      const tag = entry.languageTag?.toLowerCase() ?? '';
      if (tag.startsWith('vi')) return 'vi';
      if (tag.startsWith('en')) return 'en';
    }
  } catch {
    // RNLocalize can fail on iOS simulator misconfiguration; fall through.
  }
  return 'vi';
}

let initialized = false;

export function initI18n() {
  if (initialized) return i18n;
  initialized = true;

  const stored = localeStorage.getLocale();
  const initial: Locale = stored ?? pickDeviceLocale();

  i18n
    .use(initReactI18next)
    .init({
      resources: {
        vi: { translation: vi },
        en: { translation: en },
      },
      lng: initial,
      fallbackLng: 'vi',
      compatibilityJSON: 'v4',
      interpolation: { escapeValue: false },
      returnNull: false,
    });

  return i18n;
}

export function changeLocale(locale: Locale) {
  localeStorage.setLocale(locale);
  void i18n.changeLanguage(locale);
}

export default i18n;