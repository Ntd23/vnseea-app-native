const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Feed new-post queue and locally hidden posts', () => {
  const screen = read('src/feed/presentation/screens/FeedScreen.tsx');
  const viewModel = read('src/feed/application/view-models/useFeedViewModel.ts');

  it('filters hidden posts before showing the new-post button and on insertion', () => {
    expect(screen).toContain(
      'hiddenPostsStorage.isHidden(String(post.id), currentUserId)',
    );
    expect(screen).toContain('LOCAL_POST_HIDDEN_EVENT');
    expect(viewModel).toContain('filterLocallyHiddenPosts(posts)');
    expect(viewModel).toContain('hiddenPostsStorage.isHidden(');
  });
});
