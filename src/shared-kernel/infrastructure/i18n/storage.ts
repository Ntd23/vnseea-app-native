// Description: MMKV-backed locale persistence for the i18next instance.
// Falls back to the previous AppLanguage storage shape so existing
// Settings code that still reads `languageStorage` keeps working.
import { createMMKV } from 'react-native-mmkv';
import type { AppLanguage } from '../storage/languageStorage';

const LOCALE_KEY = 'app_locale';
const storage = createMMKV({ id: 'vnseea-i18n-settings' });

function isSupported(value: unknown): value is AppLanguage {
  return value === 'vi' || value === 'en';
}

export const localeStorage = {
  getLocale(): AppLanguage {
    const value = storage.getString(LOCALE_KEY);
    return isSupported(value) ? value : 'vi';
  },

  setLocale(locale: AppLanguage) {
    storage.set(LOCALE_KEY, locale);
  },
};