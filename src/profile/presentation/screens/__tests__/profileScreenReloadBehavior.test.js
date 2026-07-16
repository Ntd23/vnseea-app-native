const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../../');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('ProfileScreen reload behavior', () => {
  it('does not refetch profile data on every focus cycle', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('const routeProfileKey = route.params?.userId');
    expect(source).toContain('const lastLoadedUserIdRef = useRef<string | null>(null);');
    expect(source).toContain('if (lastLoadedUserIdRef.current === routeProfileKey) {');
    expect(source).not.toMatch(
      /useFocusEffect\(useCallback\(\(\) => \{\s*loadProfile\(\{\s*userId:\s*route\.params\?\.(?:userId),\s*includeFriends:\s*true,\s*\}\)\.catch\(\(\) => undefined\);\s*\},\s*\[loadProfile,\s*route\.params\?\.(?:userId)\]\)\);/s,
    );
  });
});
