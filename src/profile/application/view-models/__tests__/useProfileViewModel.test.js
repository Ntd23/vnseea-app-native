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
});
