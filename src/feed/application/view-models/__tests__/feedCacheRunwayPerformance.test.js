const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    'src/feed/application/view-models/useFeedViewModel.ts',
  ),
  'utf8',
);

describe('feed cache runway performance', () => {
  it('serializes only the bounded cold-start runway', () => {
    expect(source).toContain('const FEED_CACHE_RUNWAY_LIMIT = 30;');
    expect(source).toContain(
      'const snapshot = posts.slice(0, FEED_CACHE_RUNWAY_LIMIT);',
    );
    expect(source).not.toContain('const snapshot = posts.slice(0, 100);');
  });
});
