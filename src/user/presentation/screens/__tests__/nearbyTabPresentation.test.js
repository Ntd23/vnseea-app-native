const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Nearby map iOS tab presentation', () => {
  it('occupies the former Notifications slot between Marketplace and Profile', () => {
    const registry = read('src/navigation/routeRegistry.tsx');
    const iosRoutes = registry.slice(
      registry.indexOf('export const IOS_NATIVE_TAB_ROUTES'),
      registry.indexOf('export function createStackRoutes'),
    );

    expect(iosRoutes.indexOf('name: ROUTES.MARKETPLACE')).toBeLessThan(
      iosRoutes.indexOf('name: ROUTES.NEARBY_USERS'),
    );
    expect(iosRoutes.indexOf('name: ROUTES.NEARBY_USERS')).toBeLessThan(
      iosRoutes.indexOf('name: ROUTES.PROFILE'),
    );
    expect(iosRoutes).not.toContain('name: ROUTES.NOTIFICATIONS');
  });

  it('hides the tab bar and locks pager swipes only in tab presentation', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain("const isTabRoute = navigatorType === 'tab'");
    expect(source).toContain('if (!isTabRoute) return undefined');
    expect(source).toContain('tabBarVisibility.setVisible(false)');
    expect(source).toContain('iosPagerSwipeLock.setLocked(true)');
    expect(source).toContain('tabBarVisibility.setVisible(true)');
    expect(source).toContain('iosPagerSwipeLock.setLocked(false)');
  });

  it('uses pager history so the existing Back button returns to the source tab', () => {
    const navigator = read('src/navigation/MainTabNavigator.tsx');
    const nearby = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(navigator).toContain('backBehavior="history"');
    expect(nearby).toContain('onPress={handleBackPress}');
    expect(nearby).toContain('navigation.goBack()');
  });
});
