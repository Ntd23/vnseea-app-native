const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const read = relativePath =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

describe('local post hide behavior', () => {
  it('asks for confirmation with cancel and OK actions', () => {
    const menu = read(
      'src/shared-kernel/presentation/components/PostMenuActionSheet.tsx',
    );

    expect(menu).toContain('hideConfirmationVisible');
    expect(menu).toContain('Ẩn bài viết?');
    expect(menu).toContain('Hủy');
    expect(menu).toContain('OK');
    expect(menu).toContain("runAction('hide', onHide)");
  });

  it('persists and filters hidden posts without a hide API action', () => {
    const viewModel = read(
      'src/feed/application/view-models/useFeedViewModel.ts',
    );
    const storage = read(
      'src/feed/infrastructure/storage/hiddenPostsStorage.ts',
    );

    expect(viewModel).toContain('hiddenPostsStorage.hidePost(');
    expect(viewModel).toContain('filterLocallyHiddenPosts(');
    expect(viewModel).toContain('LOCAL_POST_HIDDEN_EVENT');
    expect(storage).toContain("createMMKV({ id: 'vnseea-hidden-posts' })");
    expect(storage).toContain('filterVisiblePosts');
    expect(storage).not.toContain('apiBridge');
    expect(storage).not.toContain('backendApi');
  });

  it('applies the same local preference from profile and post detail', () => {
    const profile = read('src/profile/presentation/screens/ProfileScreen.tsx');
    const detail = read(
      'src/feed/presentation/screens/PostDetailScreen.tsx',
    );

    expect(profile).toContain('hiddenPostsStorage.filterVisiblePosts(');
    expect(profile).toContain('hiddenPostsStorage.hidePost(postId');
    expect(detail).toContain('hiddenPostsStorage.hidePost(');
  });
});
