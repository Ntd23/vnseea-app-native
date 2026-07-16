const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const source = fs.readFileSync(
  path.join(
    projectRoot,
    'src/feed/presentation/components/PostReactionsSheet.tsx',
  ),
  'utf8',
);

describe('PostReactionsSheet profile navigation lifecycle', () => {
  it('closes the sheet and defers profile navigation until modal dismissal', () => {
    expect(source).toContain(
      'const pendingProfileUserIdRef = useRef<string | null>(null);',
    );
    expect(source).toMatch(
      /const requestProfileNavigation = useCallback\([\s\S]*pendingProfileUserIdRef\.current = userId;[\s\S]*onClose\(\);/,
    );
    expect(source).toMatch(
      /const completePendingProfileNavigation = useCallback\([\s\S]*pendingProfileUserIdRef\.current = null;[\s\S]*navigateToUserProfile\(navigation, userId\);/,
    );
    expect(source).toContain('onDismiss={handleModalDismiss}');
  });

  it('keeps an invisible Modal mounted for iOS onDismiss and handles Android after close', () => {
    expect(source).toMatch(
      /if \(!isMounted\) \{[\s\S]*<Modal[\s\S]*visible=\{false\}[\s\S]*onDismiss=\{handleModalDismiss\}/,
    );
    expect(source).toMatch(
      /Platform\.OS === 'ios' \|\| isMounted[\s\S]*completePendingProfileNavigation\(\);/,
    );
    expect(source).not.toMatch(
      /const navigateToProfile = useCallback\([\s\S]*navigateToUserProfile\(navigation, userId\);/,
    );
    expect(source).not.toContain('setTimeout(');
  });
});
