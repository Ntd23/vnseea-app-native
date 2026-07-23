import type { TabRouteDefinition } from '../routeRegistry';
import { ROUTES } from '../constants/routes';
import {
  createIosNativeTabOptions,
  formatIosTabBadge,
  getCustomTabRoutes,
  getIosNativeTabRoutes,
  shouldHideIosNativeTabBar,
} from '../mainTabConfig';

const routes = [
  { name: ROUTES.FEED },
  { name: ROUTES.EXPLORE },
  { name: ROUTES.REELS },
  { name: ROUTES.MARKETPLACE },
  { name: ROUTES.NEARBY_USERS },
  { name: ROUTES.NOTIFICATIONS },
  { name: ROUTES.PROFILE },
  { name: ROUTES.SETTINGS },
] as TabRouteDefinition[];

describe('main tab platform configuration', () => {
  it('keeps the custom tab route list used by Android unchanged', () => {
    expect(
      getCustomTabRoutes([
        { name: ROUTES.FEED },
        { name: ROUTES.EXPLORE },
        { name: ROUTES.REELS },
        { name: ROUTES.NOTIFICATIONS },
        { name: ROUTES.SETTINGS },
      ] as TabRouteDefinition[]).map(route => route.name),
    ).toEqual([
      ROUTES.FEED,
      ROUTES.EXPLORE,
      ROUTES.REELS,
      ROUTES.NOTIFICATIONS,
      ROUTES.SETTINGS,
    ]);
  });

  it('uses the five iOS native tab routes requested for the Liquid Glass tabs', () => {
    expect(getIosNativeTabRoutes(routes).map(route => route.name)).toEqual([
      ROUTES.FEED,
      ROUTES.REELS,
      ROUTES.MARKETPLACE,
      ROUTES.NEARBY_USERS,
      ROUTES.PROFILE,
    ]);
  });

  it('uses localized labels and SF Symbol options for native iOS tabs', () => {
    expect(createIosNativeTabOptions(ROUTES.FEED, 'vi')).toMatchObject({
      tabBarLabel: 'Trang chủ',
      tabBarIcon: {
        type: 'sfSymbol',
        name: 'house.fill',
      },
    });

    expect(createIosNativeTabOptions(ROUTES.MARKETPLACE, 'vi')).toMatchObject({
      tabBarLabel: 'Mua sắm',
      tabBarIcon: {
        type: 'sfSymbol',
        name: 'storefront.fill',
      },
    });

    expect(createIosNativeTabOptions(ROUTES.NEARBY_USERS, 'vi')).toMatchObject({
      tabBarLabel: 'Bản đồ',
      tabBarIcon: {
        type: 'sfSymbol',
        name: 'map.fill',
      },
    });

    expect(createIosNativeTabOptions(ROUTES.NEARBY_USERS, 'en')).toMatchObject({
      tabBarLabel: 'Map',
      tabBarIcon: {
        type: 'sfSymbol',
        name: 'map.fill',
      },
    });

    expect(createIosNativeTabOptions(ROUTES.PROFILE, 'vi')).toMatchObject({
      tabBarLabel: 'Cá nhân',
      tabBarIcon: {
        type: 'sfSymbol',
        name: 'person.crop.circle.fill',
      },
    });

    expect(createIosNativeTabOptions(ROUTES.REELS, 'en')).toMatchObject({
      tabBarLabel: 'Video',
      tabBarIcon: {
        type: 'sfSymbol',
        name: 'play.rectangle.fill',
      },
    });
  });

  it('keeps Notifications only in the Android custom tab route list', () => {
    expect(getIosNativeTabRoutes(routes).map(route => route.name)).not.toContain(
      ROUTES.NOTIFICATIONS,
    );
    expect(getCustomTabRoutes(routes).map(route => route.name)).toContain(
      ROUTES.NOTIFICATIONS,
    );
  });

  it('keeps the cart badge on Marketplace without adding a notification tab badge', () => {
    expect(
      createIosNativeTabOptions(ROUTES.MARKETPLACE, 'vi', 3).tabBarBadge,
    ).toBe(3);
    expect(
      createIosNativeTabOptions(ROUTES.NEARBY_USERS, 'vi', 3).tabBarBadge,
    ).toBeUndefined();
    expect(formatIosTabBadge(0)).toBeUndefined();
    expect(formatIosTabBadge(100)).toBe('99+');
  });

  it('treats only Reels and Nearby Map as full-screen iOS tabs', () => {
    expect(shouldHideIosNativeTabBar(ROUTES.REELS)).toBe(true);
    expect(shouldHideIosNativeTabBar(ROUTES.NEARBY_USERS)).toBe(true);
    expect(shouldHideIosNativeTabBar(ROUTES.FEED)).toBe(false);
    expect(shouldHideIosNativeTabBar(ROUTES.MARKETPLACE)).toBe(false);
    expect(shouldHideIosNativeTabBar(ROUTES.PROFILE)).toBe(false);
  });
});
