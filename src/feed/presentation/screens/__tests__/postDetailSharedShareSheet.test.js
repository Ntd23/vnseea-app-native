const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('shared post share sheet surfaces', () => {
  const feed = read('src/feed/presentation/screens/FeedScreen.tsx');
  const detail = read('src/feed/presentation/screens/PostDetailScreen.tsx');
  const profile = read('src/profile/presentation/screens/ProfileScreen.tsx');
  const viewModel = read(
    'src/feed/application/view-models/usePostDetailViewModel.ts',
  );
  const photoViewer = read(
    'src/shared-kernel/presentation/components/PhotoViewerModal.tsx',
  );

  it('uses the same Feed share sheet in Post Detail and Profile', () => {
    expect(detail).toContain(
      "import { FeedShareBottomSheet } from '../components/FeedShareBottomSheet';",
    );
    expect(profile).toContain(
      "import { FeedShareBottomSheet } from '../../../feed/presentation/components/FeedShareBottomSheet';",
    );
    expect(detail).toContain('<FeedShareBottomSheet');
    expect(profile).toContain('<FeedShareBottomSheet');
    expect(detail).toContain('onOpenShare={handleOpenShare}');
    expect(feed).toContain('onOpenShare={handleOpenSharePost}');
    expect(profile).toContain('onOpenShare={handleOpenSharePost}');
    expect(detail).not.toContain('Share.share(');
  });

  it('routes full-screen photo sharing back through the same parent sheet', () => {
    expect(photoViewer).toContain('onOpenShare?: (post: FeedPost) => void;');
    expect(photoViewer).toContain('onOpenShare(livePost);');
    expect(photoViewer).toContain('{!onOpenShare ? (');
  });

  it('routes internal sharing through the shared Feed repository contract', () => {
    expect(viewModel).toContain('SharePostInput');
    expect(viewModel).toContain('feedRepository.sharePost(input)');
    expect(detail).toContain('onInternalShare={handleInternalSharePost}');
    expect(profile).toContain('onInternalShare={handleInternalSharePost}');
  });

  it('opens the shared sheet from every supported detail post card', () => {
    expect(detail.match(/onShare=\{handleOpenShare\}/g)).toHaveLength(4);
    expect(detail).toContain('if (!isFeedPostShareable(activePost)) return;');
  });
});
