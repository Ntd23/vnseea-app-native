// Description: Exposes the public Settings context API and route screens.
export * from './domain/types/settings.types';
export * from './domain/repositories/SettingsRepository';
export { createSettingsRepository } from './infrastructure/repositories/ApiSettingsRepository';
export { useSettingsViewModel } from './application/view-models/useSettingsViewModel';
export { default as SettingsScreen } from './presentation/screens/SettingsScreen';
export { default as AdvertisingScreen } from './presentation/screens/AdvertisingScreen';
export { default as SettingsMessagesScreen } from './presentation/screens/SettingsMessagesScreen';
// Re-export CreateAdScreen from advertising module
export { default as CreateAdScreen } from '../advertising/presentation/screens/CreateAdScreen';
