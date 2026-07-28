const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('ProfileMore transition responsiveness', () => {
  it('releases the underlying profile as soon as the custom close starts', () => {
    const source = read('src/profile/presentation/screens/ProfileMoreScreen.tsx');

    expect(source).toContain('const SCREEN_CLOSE_DURATION_MS = 180;');
    expect(source).toContain('const swipeBackCueStyle = useAnimatedStyle(() => ({');
    expect(source).toContain('styles.swipeBackCue');
    expect(source).toContain('Vuốt đúng rồi');
  });

  it('keeps profile routes warm while ProfileMore is displayed as a transparent modal', () => {
    const source = read('src/navigation/AppNavigator.tsx');

    expect(source).toContain('const PROFILE_PUSH_OPTIONS: NativeStackNavigationOptions = {');
    expect(source).toContain('const PROFILE_MORE_OPTIONS: NativeStackNavigationOptions = {');
    expect(source).toContain("presentation: 'transparentModal'");
    expect(source).toContain("animation: 'none'");
    expect(source).toContain("contentStyle: { backgroundColor: 'transparent' }");
    expect(source).toContain('gestureEnabled: false');
  });

  it('keeps ProfileScreen navigation on its explicit back control', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('onPress={handleProfileBack}');
    expect(source).toContain("'hardwareBackPress'");
    expect(source).not.toContain('profileSwipeBackGesture');
    expect(source).not.toContain('profileBackTranslateX');
    expect(source).not.toContain('profileMainStyles.profileSwipeBackCue');
  });
});
