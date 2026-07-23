const fs = require('fs');
const path = require('path');
const { ROUTES } = require('../constants/routes');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('notification center navigation', () => {
  afterEach(() => {
    jest.resetModules();
    jest.unmock('react-native');
  });

  it.each([
    {
      platform: 'ios',
      expectedArgs: [ROUTES.NOTIFICATIONS],
    },
    {
      platform: 'android',
      expectedArgs: [ROUTES.MAIN_TABS, { screen: ROUTES.NOTIFICATIONS }],
    },
  ])('navigates from a nested navigator on $platform', ({
    platform,
    expectedArgs,
  }) => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: platform } }));
    const { navigateToNotifications } = require('../notificationNavigation');
    const rootNavigation = { navigate: jest.fn() };
    const childNavigation = {
      navigate: jest.fn(),
      getParent: () => rootNavigation,
    };

    navigateToNotifications(childNavigation);

    expect(rootNavigation.navigate).toHaveBeenCalledWith(...expectedArgs);
    expect(childNavigation.navigate).not.toHaveBeenCalled();
  });

  it('pushes the root notification screen on iOS and preserves the Android tab', () => {
    const helperPath = path.join(
      projectRoot,
      'src/navigation/notificationNavigation.ts',
    );

    expect(fs.existsSync(helperPath)).toBe(true);
    const source = fs.readFileSync(helperPath, 'utf8');

    expect(source).toContain("if (Platform.OS === 'ios')");
    expect(source).toContain('rootNavigator.navigate(ROUTES.NOTIFICATIONS)');
    expect(source).toContain('rootNavigator.navigate(ROUTES.MAIN_TABS, {');
    expect(source).toContain('screen: ROUTES.NOTIFICATIONS');
  });

  it('registers Notifications in the root stack while retaining its Android tab', () => {
    const registry = read('src/navigation/routeRegistry.tsx');
    const types = read('src/navigation/types.ts');

    expect(registry).toContain("Platform.OS === 'ios'");
    expect(registry).toContain(
      '{ name: ROUTES.NOTIFICATIONS, component: NotificationsScreen }',
    );
    expect(types).toMatch(
      /export type RootStackParamList = \{[\s\S]*?\[ROUTES\.NOTIFICATIONS\]: undefined;/,
    );
    expect(registry).toMatch(
      /export const TAB_ROUTES[\s\S]*?name: ROUTES\.NOTIFICATIONS/,
    );
  });

  it('routes every existing notification entrypoint through the shared helper', () => {
    const iosHeader = read('src/feed/presentation/components/FeedHeader.ios.tsx');
    const settings = read('src/settings/presentation/screens/SettingsScreen.tsx');
    const messages = read('src/messages/presentation/screens/MessageScreen.tsx');

    for (const source of [iosHeader, settings, messages]) {
      expect(source).toContain('navigateToNotifications');
    }
  });
});
