const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Profile owner-only controls', () => {
  it('derives ownership instead of trusting route shape or route params', () => {
    const profile = read('src/profile/presentation/screens/ProfileScreen.tsx');
    const profileMore = read(
      'src/profile/presentation/screens/ProfileMoreScreen.tsx',
    );
    const navigationTypes = read('src/navigation/types.ts');

    expect(profile).toContain('resolveProfileOwnership({');
    expect(profile).not.toContain('!route.params?.userId ||');
    expect(profileMore).toContain('resolveProfileOwnership({');
    expect(profileMore).not.toContain('params.isOwnProfile');
    expect(navigationTypes).not.toMatch(
      /\[ROUTES\.PROFILE_MORE\]:\s*\{[\s\S]*?isOwnProfile:\s*boolean;/,
    );
  });

  it('hides owner actions on other profiles but keeps public products available', () => {
    const profile = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(profile).not.toContain('Edit Profile (own) or Cart (other)');
    expect(profile).toContain('{isOwnProfile && (');
    expect(profile).toContain("language === 'vi' ? 'Sản phẩm' : 'Products'");
    expect(profile).toContain('handleOpenPublicProducts');
    expect(profile).toContain('isOwnProfile ? (');
    expect(profile).not.toContain(
      'onPress={() => isOwnProfile && navigation.navigate(ROUTES.EDIT_PROFILE)}',
    );
  });

  it('pushes a one-to-one chat above the full-page profile menu', () => {
    const profileMore = read(
      'src/profile/presentation/screens/ProfileMoreScreen.tsx',
    );

    expect(profileMore).toContain('navigation.navigate(ROUTES.CHAT');
    expect(profileMore).not.toContain('pendingCloseActionRef');
    expect(profileMore).not.toContain('closeScreenThen(() =>');
    const openChatStart = profileMore.indexOf('const openChat = useCallback');
    const navigateIndex = profileMore.indexOf(
      'navigation.navigate(ROUTES.CHAT',
      openChatStart,
    );
    expect(navigateIndex).toBeGreaterThan(openChatStart);
  });
});
