import { Platform } from 'react-native';
import { ROUTES } from './constants/routes';
import type {
  SettingsPanelRouteParam,
  SettingsScreenRouteParams,
} from './types';

type NavigateLike = {
  // React Navigation exposes overloaded tuple signatures, so the shared helper
  // keeps only the runtime surface needed while walking to the root navigator.
  navigate: (...args: any[]) => void;
  push?: (...args: any[]) => void;
  getParent?: () => NavigateLike | undefined;
};

function getRootNavigator(navigation: NavigateLike) {
  let current = navigation;
  let parent = current.getParent?.();

  while (parent) {
    current = parent;
    parent = current.getParent?.();
  }

  return current;
}

export function navigateToSettingsPanel(
  navigation: NavigateLike,
  panel: SettingsPanelRouteParam = 'main',
  options: Omit<SettingsScreenRouteParams, 'initialPanel'> = {},
) {
  const rootNavigator = getRootNavigator(navigation);
  const params: SettingsScreenRouteParams = {
    initialPanel: panel,
    fromDashboard: true,
    ...options,
  };

  if (Platform.OS === 'ios') {
    if (typeof rootNavigator.push === 'function') {
      rootNavigator.push(ROUTES.SETTINGS_PANEL, params);
      return;
    }
    rootNavigator.navigate(ROUTES.SETTINGS_PANEL, params);
    return;
  }

  rootNavigator.navigate(ROUTES.MAIN_TABS, {
    screen: ROUTES.SETTINGS,
    params,
  });
}
