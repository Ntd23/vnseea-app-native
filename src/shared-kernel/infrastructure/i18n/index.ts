// Description: Public exports for the i18n subsystem.
export { default as i18n, initI18n, changeLocale, SUPPORTED_LOCALES } from './i18n';
export type { Locale } from './i18n';
export { localeStorage } from './storage';
export { useT, useLocale } from './useT';