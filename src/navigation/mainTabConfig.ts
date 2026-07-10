import type { NativeBottomTabNavigationOptions } from '@react-navigation/bottom-tabs/unstable';
import { ROUTES } from './constants/routes';
import type { MainTabRouteName } from './types';
import type { AppLanguage } from '../shared-kernel/infrastructure/storage/languageStorage';

type RouteWithName = {
  name: MainTabRouteName;
};

const IOS_NATIVE_TAB_ROUTE_NAMES = new Set<MainTabRouteName>([
  ROUTES.FEED,
  ROUTES.REELS,
  ROUTES.MARKETPLACE,
  ROUTES.NOTIFICATIONS,
  ROUTES.PROFILE,
]);

const TAB_LABELS: Record<AppLanguage, Partial<Record<MainTabRouteName, string>>> = {
  vi: {
    [ROUTES.FEED]: 'Trang chủ',
    [ROUTES.REELS]: 'Video',
    [ROUTES.MARKETPLACE]: 'Mua sắm',
    [ROUTES.NOTIFICATIONS]: 'Thông báo',
    [ROUTES.PROFILE]: 'Cá nhân',
  },
  en: {
    [ROUTES.FEED]: 'Home',
    [ROUTES.REELS]: 'Video',
    [ROUTES.MARKETPLACE]: 'Shop',
    [ROUTES.NOTIFICATIONS]: 'Notifications',
    [ROUTES.PROFILE]: 'Profile',
  },
};

const IOS_SF_SYMBOLS: Partial<Record<MainTabRouteName, string>> = {
  [ROUTES.FEED]: 'house.fill',
  [ROUTES.REELS]: 'play.rectangle.fill',
  [ROUTES.MARKETPLACE]: 'cart.fill',
  [ROUTES.NOTIFICATIONS]: 'bell.fill',
  [ROUTES.PROFILE]: 'person.crop.circle.fill',
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
  language: AppLanguage = 'vi',
  cartCount = 0,
): NativeBottomTabNavigationOptions {
  const options: NativeBottomTabNavigationOptions = {
    tabBarLabel:
      TAB_LABELS[language][routeName] ?? TAB_LABELS.en[routeName] ?? routeName,
    tabBarIcon: {
      type: 'sfSymbol',
      name: IOS_SF_SYMBOLS[routeName] ?? 'circle.fill',
    } as NativeBottomTabNavigationOptions['tabBarIcon'],
  };

  if (routeName === ROUTES.NOTIFICATIONS) {
    options.tabBarBadge = formatNotificationTabBadge(notificationCount);
    options.tabBarBadgeStyle = { backgroundColor: '#EF4444' };
  }

  if (routeName === ROUTES.MARKETPLACE) {
    options.tabBarBadge = formatNotificationTabBadge(cartCount);
    options.tabBarBadgeStyle = { backgroundColor: '#EF4444' };
  }

  return options;
}
