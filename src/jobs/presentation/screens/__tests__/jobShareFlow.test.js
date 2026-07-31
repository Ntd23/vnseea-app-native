const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('job sharing flow', () => {
  it('shows a share action on shareable feed job cards', () => {
    const card = read(
      'src/feed/presentation/components/FeedCommercePostCards.tsx',
    );

    expect(card).toContain('onSharePost: (post: FeedPost) => void');
    expect(card).toContain('post.permissions?.canShare === true');
    expect(card).toContain('event.stopPropagation()');
    expect(card).toContain('<Share2');
    expect(card).toContain('{copy.share}');
  });

  it('uses the real job post id and opens the common share sheet', () => {
    const feed = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feed).toContain("const sharePostId = String(job.post_id || '').trim()")
    expect(feed).toContain('id: canShare ? sharePostId');
    expect(feed).toContain('canShare,');
    expect(feed).toContain('onSharePost={handleOpenSharePost}');
    expect(feed).toContain('<FeedShareBottomSheet');
  });

  it('keeps the share action available for job posts on profiles', () => {
    const profile = read(
      'src/profile/presentation/screens/ProfileScreen.tsx',
    );

    expect(profile).toMatch(
      /<FeedJobPostCard[\s\S]*?onSharePost=\{handleOpenSharePost\}[\s\S]*?\/>/,
    );
  });
});
