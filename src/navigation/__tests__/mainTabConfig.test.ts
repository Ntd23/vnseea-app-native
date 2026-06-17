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
  { name: ROUTES.NOTIFICATIONS },
  { name: ROUTES.SETTINGS },
] as TabRouteDefinition[];

describe('main tab platform configuration', () => {
  it('keeps Reels in the custom tab route list used by Android', () => {
    expect(getCustomTabRoutes(routes).map(route => route.name)).toEqual([
      ROUTES.FEED,
      ROUTES.EXPLORE,
      ROUTES.REELS,
      ROUTES.NOTIFICATIONS,
      ROUTES.SETTINGS,
    ]);
  });

  it('keeps Reels in the iOS native tab route list in the center slot', () => {
    expect(getIosNativeTabRoutes(routes).map(route => route.name)).toEqual([
      ROUTES.FEED,
      ROUTES.EXPLORE,
      ROUTES.REELS,
      ROUTES.NOTIFICATIONS,
      ROUTES.SETTINGS,
    ]);
  });

  it('uses SF Symbol options and notification badge formatting for native iOS tabs', () => {
    expect(createIosNativeTabOptions(ROUTES.FEED)).toMatchObject({
      tabBarLabel: 'Home',
      tabBarIcon: {
        type: 'sfSymbol',
        name: 'house.fill',
      },
    });

    expect(createIosNativeTabOptions(ROUTES.NOTIFICATIONS, 105)).toMatchObject({
      tabBarLabel: 'Notifications',
      tabBarBadge: '99+',
      tabBarIcon: {
        type: 'sfSymbol',
        name: 'bell.fill',
      },
    });

    expect(createIosNativeTabOptions(ROUTES.REELS)).toMatchObject({
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
