// Description: Persists the user's preferred app theme so the choice
// survives an app restart. Three states: `light`, `dark`, and
// `system` (follow the OS color scheme). The same MMKV instance the
// rest of the auth/session stack uses keeps reads synchronous and
// avoids a flash of the wrong theme on first render.
import { createMMKV } from 'react-native-mmkv';

export type AppTheme = 'light' | 'dark' | 'system';

const THEME_KEY = 'app.theme';

const storage = createMMKV({ id: 'vnseea-preferences' });

export const themeStorage = {
 getTheme(): AppTheme {
 const value = storage.getString(THEME_KEY);
 if (value === 'light' || value === 'dark' || value === 'system') {
 return value;
 }
 // Default to `system` so the app follows the device setting on
 // first launch. Users can still pick a fixed theme from the menu.
 return 'system';
 },

 setTheme(theme: AppTheme) {
 storage.set(THEME_KEY, theme);
 },
};
