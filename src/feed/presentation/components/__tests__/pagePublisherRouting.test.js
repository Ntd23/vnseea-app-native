const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Page publisher routing surfaces', () => {
  it('routes text and video identity headers through the Page resolver', () => {
    const source = read('src/feed/presentation/components/PostCards.tsx');

    expect(source).toContain("from '../navigation/feedPublisherNavigation'");
    expect(
      source.match(/navigateToFeedPublisherPage\(navigation, post\.publisher\)/g),
    ).toHaveLength(2);
  });

  it('routes poll cards and the sticky post-detail header through the resolver', () => {
    const pollSource = read(
      'src/feed/presentation/components/PollPostCard.tsx',
    );
    const detailSource = read(
      'src/feed/presentation/screens/PostDetailScreen.tsx',
    );

    expect(pollSource).toContain(
      'navigateToFeedPublisherPage(navigation, post.publisher)',
    );
    expect(detailSource).toContain(
      'navigateToFeedPublisherPage(navigation, publisher)',
    );
  });
});
