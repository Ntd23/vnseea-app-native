const fs = require('fs');
const path = require('path');

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

  it('uses a right-to-left root-stack transition for profile screens', () => {
    const appNavigatorSource = read('src/navigation/AppNavigator.tsx');

    expect(appNavigatorSource).toContain('PROFILE_PUSH_ROUTES');
    expect(appNavigatorSource).toContain('ROUTES.PROFILE');
    expect(appNavigatorSource).toContain('ROUTES.USER_PROFILE');
    expect(appNavigatorSource).toContain("animation: 'ios_from_right'");
  });
});
