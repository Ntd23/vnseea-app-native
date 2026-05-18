// Description: Exposes the public Settings context API and route screens.
export * from './domain/types/settings.types';
export * from './domain/repositories/SettingsRepository';
export { createSettingsRepository } from './infrastructure/repositories/ApiSettingsRepository';
export { useSettingsViewModel } from './application/view-models/useSettingsViewModel';
export { default as SettingsScreen } from './presentation/screens/SettingsScreen';
export { default as AdvertisingScreen } from './presentation/screens/AdvertisingScreen';
export { default as CreateAdScreen } from './presentation/screens/CreateAdScreen';
