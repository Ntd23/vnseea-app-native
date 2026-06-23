// Description: Exposes the public Settings context API and route screens.
export * from './domain/types/settings.types';
export { useSettingsViewModel } from './application/view-models/useSettingsViewModel';
export { useMyInfoViewModel } from './application/view-models/useMyInfoViewModel';
export { default as SettingsScreen } from './presentation/screens/SettingsScreen';
export { default as AdvertisingScreen } from './presentation/screens/AdvertisingScreen';
export { default as SettingsMessagesScreen } from './presentation/screens/SettingsMessagesScreen';
export { default as MyInfoScreen } from './presentation/screens/MyInfoScreen';
export { default as EditProfileScreen } from './presentation/screens/EditProfileScreen';
export { default as UserDashboardScreen } from './presentation/screens/UserDashboardScreen';
export { default as AddressScreen } from './presentation/screens/AddressScreen';
// Re-export CreateAdScreen from advertising module
export { default as CreateAdScreen } from '../advertising/presentation/screens/CreateAdScreen';
