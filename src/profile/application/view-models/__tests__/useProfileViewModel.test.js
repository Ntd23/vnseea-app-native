const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

describe('useProfileViewModel current-user cache sync', () => {
  it('publishes the freshly loaded own profile to session storage', () => {
    const source = fs.readFileSync(
      path.join(
        projectRoot,
        'src/profile/application/view-models/useProfileViewModel.ts',
      ),
      'utf8',
    );

    expect(source).toContain("import { sessionStorage }");
    expect(source).toContain('String(loadedProfile.id) === String(currentUserId)');
    expect(source).toContain('sessionStorage.setUserProfile({');
    expect(source).toContain('avatarUrl: loadedProfile.avatarUrl');
  });

  it('writes follow changes through to the client profile cache', () => {
    const source = fs.readFileSync(
      path.join(
        projectRoot,
        'src/profile/application/view-models/useProfileViewModel.ts',
      ),
      'utf8',
    );
    const toggleStart = source.indexOf('const toggleFollow = useCallback');
    const toggleEnd = source.indexOf('const pokeUser = useCallback', toggleStart);
    const toggleSource = source.slice(toggleStart, toggleEnd);

    expect(toggleStart).toBeGreaterThan(-1);
    expect(toggleEnd).toBeGreaterThan(toggleStart);
    expect(toggleSource).toContain('getProfileClientCacheEntry(');
    expect(toggleSource).toContain('updateProfileClientCacheEntry(');
  });
});
