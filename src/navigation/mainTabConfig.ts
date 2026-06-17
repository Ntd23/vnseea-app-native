import type { NativeBottomTabNavigationOptions } from '@react-navigation/bottom-tabs/unstable';
import { ROUTES } from './constants/routes';
import type { MainTabRouteName } from './types';

type RouteWithName = {
  name: MainTabRouteName;
};

const IOS_NATIVE_TAB_ROUTE_NAMES = new Set<MainTabRouteName>([
  ROUTES.FEED,
  ROUTES.EXPLORE,
  ROUTES.REELS,
  ROUTES.NOTIFICATIONS,
  ROUTES.SETTINGS,
]);

const TAB_LABELS: Record<MainTabRouteName, string> = {
  [ROUTES.FEED]: 'Home',
  [ROUTES.EXPLORE]: 'Explore',
  [ROUTES.REELS]: 'Video',
  [ROUTES.NOTIFICATIONS]: 'Notifications',
  [ROUTES.SETTINGS]: 'Settings',
};

const IOS_SF_SYMBOLS: Record<MainTabRouteName, string> = {
  [ROUTES.FEED]: 'house.fill',
  [ROUTES.EXPLORE]: 'number',
  [ROUTES.REELS]: 'play.rectangle.fill',
  [ROUTES.NOTIFICATIONS]: 'bell.fill',
  [ROUTES.SETTINGS]: 'gearshape.fill',
};

export function getCustomTabRoutes<T extends RouteWithName>(routes: T[]): T[] {
  return routes;
}

export function getIosNativeTabRoutes<T extends RouteWithName>(routes: T[]): T[] {
  return routes.filter(route => IOS_NATIVE_TAB_ROUTE_NAMES.has(route.name));
}

export function formatNotificationTabBadge(count: number) {
  if (count <= 0) {
    return undefined;
  }

  return count > 99 ? '99+' : count;
}

export function createIosNativeTabOptions(
  routeName: MainTabRouteName,
  notificationCount = 0,
): NativeBottomTabNavigationOptions {
  const options: NativeBottomTabNavigationOptions = {
    tabBarLabel: TAB_LABELS[routeName],
    tabBarIcon: {
      type: 'sfSymbol',
      name: IOS_SF_SYMBOLS[routeName],
    } as NativeBottomTabNavigationOptions['tabBarIcon'],
  };

  if (routeName === ROUTES.NOTIFICATIONS) {
    options.tabBarBadge = formatNotificationTabBadge(notificationCount);
    options.tabBarBadgeStyle = { backgroundColor: '#EF4444' };
  }

  return options;
}
