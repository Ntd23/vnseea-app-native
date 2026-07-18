const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

describe('activity center navigation contract', () => {
  it('registers the new route and preserves SavedPosts compatibility', () => {
    const routes = fs.readFileSync(path.join(root, 'src/navigation/constants/routes.ts'), 'utf8');
    const registry = fs.readFileSync(path.join(root, 'src/navigation/routeRegistry.tsx'), 'utf8');
    const types = fs.readFileSync(path.join(root, 'src/navigation/types.ts'), 'utf8');

    expect(routes).toContain("ACTIVITY_CENTER: 'ActivityCenter'");
    expect(registry).toContain('ROUTES.ACTIVITY_CENTER');
    expect(registry).toContain('ROUTES.SAVED_POSTS');
    expect(registry).toContain('ActivityCenterScreen');
    expect(types).toContain('[ROUTES.ACTIVITY_CENTER]');
  });

  it('opens reaction history from own profile and saved tab from existing menus', () => {
    const profile = fs.readFileSync(
      path.join(root, 'src/profile/presentation/screens/ProfileScreen.tsx'),
      'utf8',
    );
    const more = fs.readFileSync(
      path.join(root, 'src/profile/presentation/screens/ProfileMoreScreen.tsx'),
      'utf8',
    );
    const settings = fs.readFileSync(
      path.join(root, 'src/settings/presentation/screens/SettingsScreen.tsx'),
      'utf8',
    );

    expect(profile).toContain("initialTab: 'reaction'");
    expect(more).toContain("initialTab: 'saved'");
    expect(settings).toContain("initialTab: 'saved'");
  });
});
