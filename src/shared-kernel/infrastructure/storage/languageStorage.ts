import { createMMKV } from 'react-native-mmkv';

export type AppLanguage = 'vi' | 'en';

const LANGUAGE_KEY = 'app_language';
const DEFAULT_LANGUAGE: AppLanguage = 'vi';

const storage = createMMKV({ id: 'vnseea-language-settings' });

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'vi' || value === 'en';
}

export const languageStorage = {
  getLanguage(): AppLanguage {
    const value = storage.getString(LANGUAGE_KEY);
    return isAppLanguage(value) ? value : DEFAULT_LANGUAGE;
  },

  setLanguage(language: AppLanguage) {
    storage.set(LANGUAGE_KEY, language);
  },
};
