// Description: React hook that exposes the current app theme and
// lets components flip between light / dark / system. Persists the
// choice via `themeStorage` so it survives restarts. Components
// that need to react to theme changes (e.g. re-style themselves)
// can subscribe via the returned `isDark` boolean.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import {
 type AppTheme,
 themeStorage,
} from '../../infrastructure/storage/themeStorage';

/**
 * Resolve a user-chosen `AppTheme` against the current OS color
 * scheme. Useful when the user picked "system" but the rest of the
 * app wants a concrete boolean to branch on.
 */
export function resolveTheme(
 theme: AppTheme,
 systemScheme: 'light' | 'dark' | null | undefined,
): 'light' | 'dark' {
 if (theme === 'dark') return 'dark';
 if (theme === 'light') return 'light';
 return systemScheme === 'dark' ? 'dark' : 'light';
}

export function useAppTheme() {
 const systemScheme = useColorScheme();
 const [theme, setThemeState] = useState<AppTheme>(() => themeStorage.getTheme());

 // Re-read from storage on mount in case another screen changed it
 // while we were unmounted (e.g. after a hot reload).
 useEffect(() => {
 setThemeState(themeStorage.getTheme());
 }, []);

 // When the user picks "system", the OS color scheme can change at
 // runtime. Mirror it so the UI follows along.
 useEffect(() => {
 if (theme !== 'system') return;
 const sub = Appearance.addChangeListener(() => {
 // Force a re-render by re-reading storage. (We still store `system`
 // so the user choice is preserved.)
 setThemeState(themeStorage.getTheme());
 });
 return () => sub.remove();
 }, [theme]);

 const setTheme = useCallback((next: AppTheme) => {
 themeStorage.setTheme(next);
 setThemeState(next);
 }, []);

 const isDark = useMemo(
  () => resolveTheme(theme, systemScheme === 'unspecified' ? null : systemScheme) === 'dark',
  [theme, systemScheme],
 );

 return { theme, setTheme, isDark };
}
