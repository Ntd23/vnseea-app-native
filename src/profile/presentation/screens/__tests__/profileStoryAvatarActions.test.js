const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../../');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Profile story and avatar actions', () => {
  it('keeps the story carousel owner-only while retaining target story loading', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('shouldShowProfileStorySection({');
    expect(source).toContain('isOwnProfile,');
    expect(source).toContain('mergeStoriesForProfile(');
    expect(source).toContain('targetUserId');
  });

  it('opens the avatar action sheet for another profile', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');
    const handlerStart = source.indexOf('const handleAvatarPress');
    const handlerEnd = source.indexOf('const handleCloseProfileMediaSheet', handlerStart);
    const handler = source.slice(handlerStart, handlerEnd);

    expect(handler).toContain("openProfileMediaSheet('avatar')");
    expect(handler).not.toContain('ROUTES.AVATAR_VIEWER');
  });

  it('closes the sheet before opening story or avatar post detail', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('resolveProfileAvatarViewDestination({');
    expect(source).toContain("destination.kind === 'post-detail'");
    expect(source).toContain('navigation.navigate(ROUTES.POST_DETAIL, {');
    expect(source).toContain('postId: destination.postId');
    expect(source).toMatch(
      /closeProfileMediaSheet\(\(\) => \{[\s\S]*?ROUTES\.STORY_VIEWER/,
    );
  });

  it('does not expose owner avatar controls on another profile', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain("{isOwnProfile && profileMediaSheet === 'avatar' ? (");
    expect(source).toContain('{isOwnProfile ? (');
    expect(source).toContain('userStory.media.length');
  });
});
