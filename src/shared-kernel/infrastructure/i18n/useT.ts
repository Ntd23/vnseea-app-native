// Description: Convenience wrapper around react-i18next's useTranslation
// so consumers can grab the translation function by namespace easily.
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

export function useT(namespace?: string): TFunction {
  const { t } = useTranslation(namespace);
  return t;
}

export function useLocale(): string {
  const { i18n } = useTranslation();
  return i18n.language;
}