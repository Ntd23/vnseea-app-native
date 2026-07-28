const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pageShareSheet = fs.readFileSync(
  path.join(root, 'src/pages/presentation/components/PageShareActionSheet.tsx'),
  'utf8',
);
const postCards = fs.readFileSync(
  path.join(root, 'src/feed/presentation/components/PostCards.tsx'),
  'utf8',
);
const pagePreview = fs.readFileSync(
  path.join(
    root,
    'src/feed/presentation/components/VnseeaPageLinkPreviewCard.tsx',
  ),
  'utf8',
);

describe('VNSEEA Page link preview in feed posts', () => {
  it('creates internal Page shares with rich Page metadata instead of raw URL text', () => {
    expect(pageShareSheet).toContain('text: note.trim()');
    expect(pageShareSheet).toContain('linkPreview: {');
    expect(pageShareSheet).toContain('title: pageTitle');
    expect(pageShareSheet).toContain('description: pagePreviewDescription');
    expect(pageShareSheet).toContain('image: page.cover || page.avatar');
  });

  it('routes VNSEEA Page links to the dedicated Page preview card', () => {
    expect(postCards).toContain('isVnseeaPageLink(preview.url)');
    expect(postCards).toContain('<VnseeaPageLinkPreviewCard');
    expect(postCards).toContain('cleanVnseeaPageShareCaption');
  });

  it('shows Page identity and CTA without login-page metadata chrome', () => {
    expect(pagePreview).toContain('Trang VNSEEA');
    expect(pagePreview).toContain('Xem Trang');
    expect(pagePreview).toContain('extractVnseeaPageTitleFromCaption');
    expect(pagePreview).not.toContain('<MapPin');
  });
});
