const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('ProfileMore transition responsiveness', () => {
  it('uses native-stack navigation instead of a custom overlay transition', () => {
    const source = read('src/profile/presentation/screens/ProfileMoreScreen.tsx');

    expect(source).toContain('onPress={() => navigation.goBack()}');
    expect(source).toContain("backgroundColor: '#FFFFFF'");
    expect(source).not.toContain('GestureDetector');
    expect(source).not.toContain('previousScreenDim');
    expect(source).not.toContain('screenTranslateX');
    expect(source).not.toContain('Vuốt đúng rồi');
  });

  it('presents ProfileMore and PostDetail as opaque full-page cards', () => {
    const source = read('src/navigation/AppNavigator.tsx');

    expect(source).toContain('options={PROFILE_STACK_OPTIONS}');
    expect(source).toContain("presentation: 'card'");
    expect(source).toContain("contentStyle: { backgroundColor: '#FFFFFF' }");
    expect(source).not.toContain('PROFILE_MORE_OPTIONS');
    const postDetailOptions = source.slice(
      source.indexOf('const POST_DETAIL_OPTIONS'),
      source.indexOf('const NOTIFICATIONS_OPTIONS'),
    );
    expect(postDetailOptions).toContain("presentation: 'card'");
    expect(postDetailOptions).toContain(
      "contentStyle: { backgroundColor: '#FFFFFF' }",
    );
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
