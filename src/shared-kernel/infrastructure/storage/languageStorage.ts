// Description: Stores the selected application language and notifies mounted screens when it changes.
import { createMMKV } from 'react-native-mmkv';

export type AppLanguage = 'vi' | 'en';
type LanguageListener = (language: AppLanguage) => void;

const LANGUAGE_KEY = 'app_language';
const DEFAULT_LANGUAGE: AppLanguage = 'vi';

const storage = createMMKV({ id: 'vnseea-language-settings' });
const listeners = new Set<LanguageListener>();

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'vi' || value === 'en';
}

export const languageStorage = {
  getLanguage(): AppLanguage {
    const value = storage.getString(LANGUAGE_KEY);
    return isAppLanguage(value) ? value : DEFAULT_LANGUAGE;
  },

  setLanguage(language: AppLanguage) {
    const previousLanguage = this.getLanguage();
    storage.set(LANGUAGE_KEY, language);
    if (previousLanguage !== language) {
      listeners.forEach(listener => listener(language));
    }
  },

  subscribe(listener: LanguageListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
