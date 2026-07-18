const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('feed post delete ownership', () => {
  const menuSource = read(
    'src/shared-kernel/presentation/components/PostMenuActionSheet.tsx',
  );
  const feedSource = read('src/feed/presentation/screens/FeedScreen.tsx');
  const profileSource = read(
    'src/profile/presentation/screens/ProfileScreen.tsx',
  );

  it('only renders the delete action when the caller confirms ownership', () => {
    expect(menuSource).toContain('canDelete?: boolean');
    expect(menuSource).toContain('canDelete = false');
    expect(menuSource).toMatch(
      /\{canDelete \? \([\s\S]*?label="Xóa bài viết"[\s\S]*?\) : null\}/,
    );
  });

  it('compares the feed publisher with the signed-in user before deleting', () => {
    expect(feedSource).toContain(
      'userVm.user?.userId ?? sessionStorage.getSession()?.userId',
    );
    expect(feedSource).toContain(
      'String(selectedPostForMenu.publisher.id) ===',
    );
    expect(feedSource).toContain('canDelete={canDeleteSelectedPost}');
    expect(feedSource).toMatch(
      /if \([\s\S]*?!canDeleteSelectedPost[\s\S]*?selectedPostForMenu\?\.id !== postId[\s\S]*?throw new Error/,
    );
  });

  it('keeps the shared profile menu on the same ownership rule', () => {
    expect(profileSource).toContain(
      'String(selectedPostForMenu.publisher.id) === String(currentUserId)',
    );
    expect(profileSource).toContain('canDelete={canDeleteSelectedPost}');
  });
});
