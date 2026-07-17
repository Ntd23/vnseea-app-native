const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('avatar propagation to existing posts', () => {
  it('updates cached and rendered home-feed posts after the profile cache changes', () => {
    const source = read('src/feed/application/view-models/useFeedViewModel.ts');

    expect(source).toContain('import { sessionStorage }');
    expect(source).toContain('subscribeToUserProfile(syncCurrentUserAvatar)');
    expect(source).toContain('updatePostEverywhere(post => {');
    expect(source).toContain('post.publisher.avatarUrl === avatarUrl');
  });

  it('updates old posts shown on the profile screen as well', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('subscribeToUserProfile(syncCurrentUserAvatar)');
    expect(source).toContain('profilePostsRef.current = nextPosts;');
    expect(source).toContain('post.publisher.avatarUrl === avatarUrl');
  });
});
