const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Profile initial content loading', () => {
  it('waits for the current profile and first posts request before revealing content', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain(
      'const [initialPostsSettledKey, setInitialPostsSettledKey] = useState<',
    );
    expect(source).toContain('setInitialPostsSettledKey(null);');
    expect(source).toContain('const requestProfileKey = routeProfileKey;');
    expect(source).toMatch(
      /\.finally\(\(\) => \{\s*if \(!cancelled\) \{\s*setInitialPostsSettledKey\(requestProfileKey\);/s,
    );
    expect(source).toContain(
      'const expectedProfileUserId = route.params?.userId ?? currentUserId;',
    );
    expect(source).toContain('const isInitialProfileContentReady =');
    expect(source).toContain(
      'hasCurrentProfile && initialPostsSettledKey === routeProfileKey;',
    );
    expect(source).toContain('if (!isInitialProfileContentReady) {');
    expect(source).toContain(
      'return <FullProfileSkeleton onBack={handleProfileBack} />;',
    );
  });

  it('does not expose a second posts-only loading stage after the profile appears', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).not.toContain('isPostsLoading && posts.length === 0');
    expect(source).toContain('postsError ? (');
    expect(source).toContain('posts.length === 0 ? (');
  });
});
