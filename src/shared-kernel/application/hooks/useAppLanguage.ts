import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  languageStorage,
  type AppLanguage,
} from '../../infrastructure/storage/languageStorage';

export function useAppLanguage(): AppLanguage {
  const [language, setLanguage] = useState<AppLanguage>(() =>
    languageStorage.getLanguage(),
  );

  useFocusEffect(
    useCallback(() => {
      setLanguage(languageStorage.getLanguage());
    }, []),
  );

  return language;
}
