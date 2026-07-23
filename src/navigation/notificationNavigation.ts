import { Platform } from 'react-native';

import { ROUTES } from './constants/routes';

type NavigateLike = {
  navigate: (...args: any[]) => void;
  getParent?: () => NavigateLike | undefined;
};

function getRootNavigator(navigation: NavigateLike): NavigateLike {
  let current = navigation;
  let parent = current.getParent?.();

  while (parent) {
    current = parent;
    parent = current.getParent?.();
  }

  return current;
}

export function navigateToNotifications(navigation: NavigateLike) {
  const rootNavigator = getRootNavigator(navigation);

  if (Platform.OS === 'ios') {
    rootNavigator.navigate(ROUTES.NOTIFICATIONS);
    return;
  }

  rootNavigator.navigate(ROUTES.MAIN_TABS, {
    screen: ROUTES.NOTIFICATIONS,
  });
}
