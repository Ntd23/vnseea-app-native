const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Profile back behavior while loading', () => {
  it('renders a real back control in the full profile skeleton', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('function FullProfileSkeleton({');
    expect(source).toContain('onBack: () => void;');
    expect(source).toContain('onPress={onBack}');
    expect(source).toContain(
      '<FullProfileSkeleton onBack={handleProfileBack}',
    );
  });

  it('uses the shared root-aware back handler for button and Android hardware back', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain("import { navigateBackOrFeed } from '../../../navigation/profileBackNavigation';");
    expect(source).toContain('navigateBackOrFeed(navigation);');
    expect(source).toContain("'hardwareBackPress'");
  });

  it('uses explicit back controls without a custom profile swipe gesture', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('onPress={handleProfileBack}');
    expect(source).toContain('hitSlop={PROFILE_HEADER_BUTTON_HIT_SLOP}');
    expect(source).not.toContain('profileSwipeBackGesture');
    expect(source).not.toContain(
      'GestureDetector gesture={profileSwipeBackGesture}',
    );
    expect(source).not.toContain('profileSwipeBackScreenStyle');
    expect(source).not.toContain('Swipe to go back');
  });
});
