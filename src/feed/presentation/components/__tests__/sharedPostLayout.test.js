const fs = require('fs');
const path = require('path');

const root = process.cwd();
const postCards = fs.readFileSync(
  path.join(root, 'src/feed/presentation/components/PostCards.tsx'),
  'utf8',
);
const previewCard = fs.readFileSync(
  path.join(root, 'src/feed/presentation/components/SharedPostPreviewCard.tsx'),
  'utf8',
);
const privacyPolicy = fs.readFileSync(
  path.join(root, 'src/feed/domain/policies/feedPostPrivacy.ts'),
  'utf8',
);

describe('shared post feed layout', () => {
  it('renders the source in a dedicated inner card without its own action row', () => {
    expect(postCards).toContain('<SharedPostPreviewCard');
    expect(previewCard).toContain('testID="shared-post-preview-card"');
    expect(previewCard).toContain('borderRadius: 8');
    expect(previewCard).not.toContain('VideoPostActions');
    expect(previewCard).not.toContain('VideoReactionSummary');
  });

  it('injects the existing feed video player as a media slot instead of mounting a second player', () => {
    expect(previewCard).toContain('mediaSlot?: React.ReactNode');
    expect(postCards).toContain('mediaSlot={videoMedia}');
    expect(previewCard).not.toContain('react-native-video');
  });

  it('routes source content separately and limits the source image grid to four items', () => {
    expect(previewCard).toContain('onOpenPost');
    expect(previewCard).toContain('onOpenPhoto');
    expect(previewCard).toContain('.slice(0, 4)');
    expect(previewCard).toContain('+{photos.length - 4}');
  });

  it('disables resharing when the post is already a share', () => {
    expect(privacyPolicy).toContain('!post.sharedPostId');
  });
});
