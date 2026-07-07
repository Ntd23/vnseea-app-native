import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  languageStorage,
  type AppLanguage,
} from '../../infrastructure/storage/languageStorage';

export function useAppLanguage(): AppLanguage {
  const [language, setLanguage] = useState<AppLanguage>(() =>
    languageStorage.getLanguage(),
  );

  useEffect(() => {
    const syncLanguage = () => {
      setLanguage(languageStorage.getLanguage());
    };

    syncLanguage();
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        syncLanguage();
      }
    });

    return () => subscription.remove();
  }, []);

  return language;
}
