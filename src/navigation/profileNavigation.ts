import { ROUTES } from './constants/routes';
import { Platform } from 'react-native';
import { sessionStorage } from '../shared-kernel/infrastructure/storage/sessionStorage';
import { navigationRef } from './navigationRef';

type NavigateLike = {
  navigate: (...args: any[]) => void;
  push?: (...args: any[]) => void;
  getParent?: () => NavigateLike | undefined;
};

function normalizeUserId(userId: string | number | null | undefined) {
  if (userId === null || userId === undefined) return '';
  return String(userId);
}

function getRootNavigator(navigation: NavigateLike): NavigateLike {
  let current: NavigateLike = navigation;
  let parent = current.getParent?.();

  while (parent) {
    current = parent;
    parent = current.getParent?.();
  }

  return current;
}

function pushProfileRoute(
  navigation: NavigateLike,
  routeName: typeof ROUTES.PROFILE | typeof ROUTES.USER_PROFILE,
  params?: { userId: string },
) {
  if (typeof navigation.push === 'function') {
    navigation.push(routeName, params);
    return;
  }

  navigation.navigate(routeName, params);
}

export function navigateToOwnProfile(navigation: NavigateLike) {
  // A preloaded native-stack screen receives a placeholder navigation object
  // that intentionally rejects actions. The profile drawer is also mounted in
  // the preloaded Messages screen, so use the live container ref when ready.
  // Keep the passed-navigation fallback for tests and early app startup.
  const rootNavigator = navigationRef.isReady()
    ? (navigationRef as unknown as NavigateLike)
    : getRootNavigator(navigation);

  if (Platform.OS !== 'ios') {
    rootNavigator.navigate(ROUTES.PROFILE);
    return;
  }

  rootNavigator.navigate(ROUTES.MAIN_TABS, {
    screen: ROUTES.PROFILE,
  });
}

export function navigateToUserProfile(
  navigation: NavigateLike,
  userId: string | number | null | undefined,
) {
  const targetUserId = normalizeUserId(userId);
  if (!targetUserId) return;

  const currentUserId = normalizeUserId(sessionStorage.getSession()?.userId);
  if (currentUserId && targetUserId === currentUserId) {
    navigateToOwnProfile(navigation);
    return;
  }

  const rootNavigator = getRootNavigator(navigation);
  pushProfileRoute(rootNavigator, ROUTES.USER_PROFILE, { userId: targetUserId });
}
