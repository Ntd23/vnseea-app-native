const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('useCurrentUserViewModel profile hydration', () => {
  it('hydrates the current profile from the backend when session cache is incomplete', () => {
    const source = read(
      'src/shared-kernel/application/view-models/useCurrentUserViewModel.ts',
    );

    expect(source).toContain('createAuthRepository');
    expect(source).toContain('const sessionUserId = session.userId');
    expect(source).toContain('fetchUserById(sessionUserId)');
    expect(source).toContain('sessionStorage.setUserProfile');
    expect(source).not.toContain('if (cached && session?.userId)');
  });

  it('prefers display name, then username, before falling back to empty copy data', () => {
    const source = read(
      'src/shared-kernel/application/view-models/useCurrentUserViewModel.ts',
    );

    expect(source).toContain('cached.name || cached.username ||');
    expect(source).toContain('result.user.name || result.user.username ||');
  });
});
