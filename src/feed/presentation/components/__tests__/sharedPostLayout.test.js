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

  it('keeps group identity for a group post embedded inside a share', () => {
    expect(previewCard).toContain('const groupContext = model.groupContext');
    expect(previewCard).toContain('{groupContext.title}');
    expect(previewCard).toContain('styles.publisherAvatarOverlay');
    expect(previewCard).toContain("groupContext?.privacy === 'private'");
  });

  it('renders shared products as a compact, overflow-safe product preview', () => {
    expect(previewCard).toContain("content.attachmentKind === 'product'");
    expect(previewCard).toContain("language === 'vi' ? 'Sản phẩm' : 'Product'");
    expect(previewCard).toContain('styles.productAttachment');
    expect(previewCard).toContain('styles.productBadge');
    expect(previewCard).toContain('numberOfLines={2}');
    expect(previewCard).toContain('adjustsFontSizeToFit');
    expect(previewCard).toContain('minimumFontScale={0.75}');
  });

  it('renders shared jobs with a dedicated label, location and action', () => {
    expect(previewCard).toContain("content.attachmentKind === 'job'");
    expect(previewCard).toContain("language === 'vi' ? 'Việc làm' : 'Job'");
    expect(previewCard).toContain(
      "language === 'vi' ? 'Xem việc làm' : 'View job'",
    );
    expect(previewCard).toContain('styles.jobBadge');
    expect(previewCard).toContain('styles.jobLocation');
    expect(previewCard).toContain('missingJobLocationLabel');
  });

  it('does not label a shared attachment as a zero-photo post', () => {
    expect(postCards).toContain('post.sharedPost');
    expect(postCards).toContain('? formatPostTime(post.postedAt, copy)');
  });

  it('disables resharing when the post is already a share', () => {
    expect(privacyPolicy).toContain('!post.sharedPostId');
  });
});
