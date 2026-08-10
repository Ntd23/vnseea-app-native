const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Profile viewport media loading', () => {
  it('renders profile rows ahead while mounting heavy media only when visible', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('<HomeVideoPostCard');
    expect(source).toContain('<TextPostCard');
    expect(source).toContain('deferMediaUntilVisible');
    expect(source).toContain(
      'const PROFILE_POST_DRAW_DISTANCE = PROFILE_IS_ANDROID',
    );
    expect(source).toContain(
      '? Math.max(1600, Math.round(SCREEN_HEIGHT * 1.8))',
    );
    expect(source).toContain('removeClippedSubviews={false}');
    expect(source).toContain(
      'onViewableItemsChanged={onProfilePostViewableItemsChanged}',
    );
    expect(source).toContain(
      'viewabilityConfig={profilePostsViewabilityConfigRef.current}',
    );
    expect(source).toContain(
      'itemVisiblePercentThreshold: PROFILE_POST_VIEWABLE_PERCENT',
    );
    expect(source).not.toContain('onProfileMediaViewableItemsChanged');
    expect(source).not.toContain('viewabilityConfigCallbackPairs={');
  });

  it('keeps profile media prefetch bounded on Android', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain(
      'const PROFILE_POST_MEDIA_PREFETCH_LOOKAHEAD = PROFILE_IS_ANDROID ? 3 : 12;',
    );
    expect(source).toContain(
      'const PROFILE_POST_MEDIA_PREFETCH_LIMIT = PROFILE_IS_ANDROID ? 4 : 16;',
    );
    expect(source).toContain(
      'const PROFILE_POST_MEDIA_PREFETCH_BATCH_SIZE = PROFILE_IS_ANDROID ? 1 : 3;',
    );
  });
});
