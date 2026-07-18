const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('feed post delete authorization', () => {
  const menuSource = read(
    'src/shared-kernel/presentation/components/PostMenuActionSheet.tsx',
  );
  const feedSource = read('src/feed/presentation/screens/FeedScreen.tsx');
  const profileSource = read(
    'src/profile/presentation/screens/ProfileScreen.tsx',
  );

  it('only renders delete when both the post permission and caller allow it', () => {
    expect(menuSource).toContain('canDelete?: boolean');
    expect(menuSource).toContain('canDelete = false');
    expect(menuSource).toContain('post.permissions?.canDelete === true');
    expect(menuSource).toContain('{canRenderDelete ? (');
  });

  it('uses the canonical backend permission in Feed', () => {
    expect(feedSource).toContain(
      'selectedPostForMenu?.permissions?.canDelete === true',
    );
    expect(feedSource).not.toContain(
      'String(selectedPostForMenu.publisher.id) ===',
    );
    expect(feedSource).toContain('canDelete={canDeleteSelectedPost}');
    expect(feedSource).toMatch(
      /if \([\s\S]*?!canDeleteSelectedPost[\s\S]*?selectedPostForMenu\?\.id !== postId[\s\S]*?throw new Error/,
    );
  });

  it('keeps Profile on the same backend permission rule', () => {
    expect(profileSource).toContain(
      'selectedPostForMenu?.permissions?.canDelete === true',
    );
    expect(profileSource).not.toContain(
      'String(selectedPostForMenu.publisher.id) === String(currentUserId)',
    );
    expect(profileSource).toContain('canDelete={canDeleteSelectedPost}');
  });
});
