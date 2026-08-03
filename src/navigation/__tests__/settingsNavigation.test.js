const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('settings navigation across platform tab layouts', () => {
  it('registers an iOS root-stack route without adding Settings to native tabs', () => {
    const routes = read('src/navigation/constants/routes.ts');
    const registry = read('src/navigation/routeRegistry.tsx');
    const types = read('src/navigation/types.ts');

    expect(routes).toContain("SETTINGS_PANEL: 'SettingsPanel'");
    expect(registry).toContain(
      '{ name: ROUTES.SETTINGS_PANEL, component: SettingsScreen }',
    );
    expect(types).toContain(
      '[ROUTES.SETTINGS_PANEL]: SettingsScreenRouteParams | undefined;',
    );

    const iosTabs = registry.slice(
      registry.indexOf('export const IOS_NATIVE_TAB_ROUTES'),
      registry.indexOf('export function createStackRoutes'),
    );
    expect(iosTabs).not.toContain('name: ROUTES.SETTINGS,');
    expect(iosTabs).not.toContain('name: ROUTES.SETTINGS_PANEL,');
  });

  it('pushes Settings on iOS and preserves the Android tab route', () => {
    const helper = read('src/navigation/settingsNavigation.ts');

    expect(helper).toContain("if (Platform.OS === 'ios')");
    expect(helper).toContain('rootNavigator.push(ROUTES.SETTINGS_PANEL, params)');
    expect(helper).toContain('rootNavigator.navigate(ROUTES.MAIN_TABS, {');
    expect(helper).toContain('screen: ROUTES.SETTINGS');
  });

  it('uses the shared helper from every Settings entrypoint', () => {
    const entrypoints = [
      'src/settings/presentation/screens/UserDashboardScreen.tsx',
      'src/feed/presentation/components/HeaderProfileDrawer.tsx',
      'src/profile/presentation/screens/ProfileScreen.tsx',
      'src/profile/presentation/screens/ProfileMoreScreen.tsx',
      'src/settings/presentation/screens/DeleteAccountScreen.tsx',
    ];

    for (const filePath of entrypoints) {
      const source = read(filePath);
      expect(source).toContain('navigateToSettingsPanel');
      expect(source).not.toContain('screen: ROUTES.SETTINGS');
    }
  });
});
