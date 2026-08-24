const fs = require('fs');
const path = require('path');

const mockNavigationRef = {
  isReady: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('../navigationRef', () => ({ navigationRef: mockNavigationRef }));

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('profile navigation route separation', () => {
  it('declares a root-stack-only route for viewing other users', () => {
    const routesSource = read('src/navigation/constants/routes.ts');
    const registrySource = read('src/navigation/routeRegistry.tsx');
    const typesSource = read('src/navigation/types.ts');

    expect(routesSource).toContain("USER_PROFILE: 'UserProfile'");
    expect(registrySource).toContain('{ name: ROUTES.USER_PROFILE, component: ProfileScreen }');
    const stackRoutesSource = registrySource.slice(
      registrySource.indexOf('export function createStackRoutes'),
    );
    expect(stackRoutesSource).toContain(
      "...(Platform.OS === 'android'",
    );
    expect(stackRoutesSource).toContain(
      '{ name: ROUTES.PROFILE, component: ProfileScreen }',
    );
    expect(typesSource).toContain('[ROUTES.PROFILE]: undefined');
    expect(typesSource).toContain('[ROUTES.USER_PROFILE]: { userId: string }');
  });

  it('keeps the iOS native tab profile route as own profile only', () => {
    const registrySource = read('src/navigation/routeRegistry.tsx');
    const mainTabSource = read('src/navigation/mainTabConfig.ts');

    expect(registrySource).toContain('name: ROUTES.PROFILE');
    expect(registrySource).not.toContain('name: ROUTES.USER_PROFILE,\n    component: ProfileScreen,\n    Icon: CircleUser');
    expect(mainTabSource).toContain('ROUTES.PROFILE');
    expect(mainTabSource).not.toContain('ROUTES.USER_PROFILE');
  });

  it('funnels userId profile navigation through the shared helper', () => {
    const helperSource = read('src/navigation/profileNavigation.ts');
    const filesToScan = [
      'src/explore/presentation/screens/ExploreScreen.tsx',
      'src/feed/presentation/screens/FeedScreen.tsx',
      'src/feed/presentation/screens/PostDetailScreen.tsx',
      'src/feed/presentation/components/PostReactionsSheet.tsx',
      'src/messages/presentation/screens/ChatScreen.tsx',
      'src/notifications/presentation/screens/NotificationsScreen.tsx',
      'src/pages/presentation/screens/PageDetailScreen.tsx',
      'src/profile/presentation/screens/ProfileFriendsScreen.tsx',
      'src/profile/presentation/screens/ProfileScreen.tsx',
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
      'src/reels/presentation/components/ReelPublisherOverlay.tsx',
      'src/search/presentation/screens/SearchScreen.tsx',
      'src/community/presentation/screens/FollowingScreen.tsx',
    ];

    expect(helperSource).toContain('export function navigateToUserProfile');
    expect(helperSource).toContain('ROUTES.USER_PROFILE');
    expect(helperSource).toContain('ROUTES.PROFILE');
    expect(helperSource).toContain('pushProfileRoute');

    for (const filePath of filesToScan) {
      const source = read(filePath);
      expect(source).not.toMatch(/navigate\(\s*ROUTES\.PROFILE\s*,\s*\{\s*userId/);
      expect(source).not.toMatch(/screen:\s*ROUTES\.PROFILE,\s*params:\s*\{\s*userId/);
    }
  });

  it('uses the shared profile helper from the drawer too', () => {
    const drawerSource = read('src/feed/presentation/components/HeaderProfileDrawer.tsx');

    expect(drawerSource).toContain('navigateToOwnProfile(navigation)');
    expect(drawerSource).not.toContain('navigation.navigate(ROUTES.USER_PROFILE)');
  });

  it('bypasses a placeholder screen navigation object when the root ref is ready', () => {
    const { navigateToOwnProfile } = require('../profileNavigation');
    mockNavigationRef.isReady.mockReturnValue(true);
    mockNavigationRef.navigate.mockImplementation(() => undefined);
    const placeholderNavigation = {
      navigate: jest.fn(() => {
        throw new Error('Actions cannot be dispatched from a placeholder screen.');
      }),
      getParent: jest.fn(() => undefined),
    };

    expect(() => navigateToOwnProfile(placeholderNavigation)).not.toThrow();
    expect(mockNavigationRef.navigate).toHaveBeenCalled();
    expect(placeholderNavigation.navigate).not.toHaveBeenCalled();

    mockNavigationRef.navigate.mockReset();
    mockNavigationRef.isReady.mockReset();
  });

  it('uses the iOS profile tab and the Android full-page profile route', () => {
    const helperSource = read('src/navigation/profileNavigation.ts');

    expect(helperSource).toContain("import { navigationRef } from './navigationRef'");
    expect(helperSource).toContain('navigationRef.isReady()');
    expect(helperSource).toContain('navigationRef as unknown as NavigateLike');
    expect(helperSource).toContain('rootNavigator.navigate(ROUTES.MAIN_TABS, {');
    expect(helperSource).toContain('screen: ROUTES.PROFILE');
    expect(helperSource).toContain("import { Platform } from 'react-native'");
    expect(helperSource).toContain("if (Platform.OS !== 'ios')");
    expect(helperSource).toContain('rootNavigator.navigate(ROUTES.PROFILE)');
    expect(helperSource).not.toContain(
      'pushProfileRoute(rootNavigator, ROUTES.PROFILE)',
    );
  });

  it('opens other-user profiles as opaque native-stack cards', () => {
    const appNavigatorSource = read('src/navigation/AppNavigator.tsx');
    const profileSource = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(appNavigatorSource).toContain(
      'const PROFILE_STACK_OPTIONS: NativeStackNavigationOptions = {',
    );
    expect(appNavigatorSource).toContain("presentation: 'card'");
    expect(appNavigatorSource).toContain("animation: 'default'");
    expect(appNavigatorSource).toContain("contentStyle: { backgroundColor: '#FFFFFF' }");
    expect(appNavigatorSource).toContain('gestureEnabled: true');
    expect(appNavigatorSource).toContain('name === ROUTES.PROFILE');
    expect(appNavigatorSource).toContain('name === ROUTES.USER_PROFILE');
    expect(appNavigatorSource).not.toContain('PROFILE_PUSH_ROUTES');
    expect(appNavigatorSource).not.toContain('PROFILE_PUSH_OPTIONS');
    expect(profileSource).toContain('onPress={handleProfileBack}');
    expect(profileSource).not.toContain('profileSwipeBackGesture');
    expect(profileSource).not.toContain(
      'GestureDetector gesture={profileSwipeBackGesture}',
    );
    expect(profileSource).not.toContain('profileSwipeBackScreenStyle');
    expect(profileSource).not.toContain('profileSwipeBackCue');
    expect(profileSource).not.toContain('Swipe to go back');
  });

  it('routes Settings fallbacks to the own-profile tab instead of a root profile screen', () => {
    const settingsSource = read(
      'src/settings/presentation/screens/SettingsScreen.tsx',
    );

    expect(settingsSource).toContain('navigateToOwnProfile(rootNavigation)');
    expect(settingsSource).not.toContain(
      'rootNavigation.dispatch(CommonActions.navigate(ROUTES.PROFILE))',
    );
  });

  it('opens profile connections with a short dedicated transition', () => {
    const source = read('src/navigation/AppNavigator.tsx');

    expect(source).toContain(
      'const PROFILE_CONNECTIONS_OPTIONS: NativeStackNavigationOptions = {',
    );
    expect(source).toContain("animation: 'fade'");
    expect(source).toContain('animationDuration: 140');
    expect(source).toContain('name === ROUTES.PROFILE_FRIENDS');
  });
});
