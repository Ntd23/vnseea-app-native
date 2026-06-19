import type { TabRouteDefinition } from '../routeRegistry';
import { ROUTES } from '../constants/routes';
import {
  createIosNativeTabOptions,
  formatNotificationTabBadge,
  getCustomTabRoutes,
  getIosNativeTabRoutes,
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
      ROUTES.NOTIFICATIONS,
      ROUTES.PROFILE,
    ]);
  });

  it('uses localized labels, SF Symbol options, and notification badge formatting for native iOS tabs', () => {
    expect(createIosNativeTabOptions(ROUTES.FEED, 0, 'vi')).toMatchObject({
      tabBarLabel: 'Trang chủ',
      tabBarIcon: {
        type: 'sfSymbol',
        name: 'house.fill',
      },
    });

    expect(createIosNativeTabOptions(ROUTES.MARKETPLACE, 0, 'vi')).toMatchObject({
      tabBarLabel: 'Mua sắm',
      tabBarIcon: {
        type: 'sfSymbol',
        name: 'cart.fill',
      },
    });

    expect(createIosNativeTabOptions(ROUTES.PROFILE, 0, 'vi')).toMatchObject({
      tabBarLabel: 'Cá nhân',
      tabBarIcon: {
        type: 'sfSymbol',
        name: 'person.crop.circle.fill',
      },
    });

    expect(createIosNativeTabOptions(ROUTES.NOTIFICATIONS, 105, 'en')).toMatchObject({
      tabBarLabel: 'Notifications',
      tabBarBadge: '99+',
      tabBarIcon: {
        type: 'sfSymbol',
        name: 'bell.fill',
      },
    });

    expect(createIosNativeTabOptions(ROUTES.REELS, 0, 'en')).toMatchObject({
      tabBarLabel: 'Video',
      tabBarIcon: {
        type: 'sfSymbol',
        name: 'play.rectangle.fill',
      },
    });
  });

  it('omits empty notification badges for native iOS tabs', () => {
    expect(formatNotificationTabBadge(0)).toBeUndefined();
    expect(formatNotificationTabBadge(3)).toBe(3);
    expect(formatNotificationTabBadge(100)).toBe('99+');
  });
});
