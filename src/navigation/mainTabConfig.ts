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
  ROUTES.NEARBY_USERS,
  ROUTES.PROFILE,
]);

const TAB_LABELS: Record<AppLanguage, Partial<Record<MainTabRouteName, string>>> = {
  vi: {
    [ROUTES.FEED]: 'Trang chủ',
    [ROUTES.REELS]: 'Video',
    [ROUTES.MARKETPLACE]: 'Mua sắm',
    [ROUTES.NEARBY_USERS]: 'Bản đồ',
    [ROUTES.PROFILE]: 'Cá nhân',
  },
  en: {
    [ROUTES.FEED]: 'Home',
    [ROUTES.REELS]: 'Video',
    [ROUTES.MARKETPLACE]: 'Shop',
    [ROUTES.NEARBY_USERS]: 'Map',
    [ROUTES.PROFILE]: 'Profile',
  },
};

const IOS_SF_SYMBOLS: Partial<Record<MainTabRouteName, string>> = {
  [ROUTES.FEED]: 'house.fill',
  [ROUTES.REELS]: 'play.rectangle.fill',
  [ROUTES.MARKETPLACE]: 'storefront.fill',
  [ROUTES.NEARBY_USERS]: 'map.fill',
  [ROUTES.PROFILE]: 'person.crop.circle.fill',
};

export function getCustomTabRoutes<T extends RouteWithName>(routes: T[]): T[] {
  return routes;
}

export function getIosNativeTabRoutes<T extends RouteWithName>(routes: T[]): T[] {
  return routes.filter(route => IOS_NATIVE_TAB_ROUTE_NAMES.has(route.name));
}

export function shouldHideIosNativeTabBar(
  routeName: MainTabRouteName | undefined,
) {
  return routeName === ROUTES.REELS || routeName === ROUTES.NEARBY_USERS;
}

export function formatIosTabBadge(count: number) {
  if (count <= 0) {
    return undefined;
  }

  return count > 99 ? '99+' : count;
}

export function createIosNativeTabOptions(
  routeName: MainTabRouteName,
  language: AppLanguage = 'vi',
  marketplaceBadgeCount = 0,
): NativeBottomTabNavigationOptions {
  const options: NativeBottomTabNavigationOptions = {
    tabBarLabel:
      TAB_LABELS[language][routeName] ?? TAB_LABELS.en[routeName] ?? routeName,
    tabBarIcon: {
      type: 'sfSymbol',
      name: IOS_SF_SYMBOLS[routeName] ?? 'circle.fill',
    } as NativeBottomTabNavigationOptions['tabBarIcon'],
  };

  if (routeName === ROUTES.MARKETPLACE) {
    options.tabBarBadge = formatIosTabBadge(marketplaceBadgeCount);
    options.tabBarBadgeStyle = { backgroundColor: '#EF4444' };
  }

  return options;
}
