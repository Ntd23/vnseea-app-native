const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/feed/application/view-models/useFeedViewModel.ts'),
  'utf8',
);

describe('Home feed load-more latency contracts', () => {
  it('commits a matching in-flight prefetch even while momentum is active', () => {
    const start = source.indexOf('const loadMorePosts = useCallback');
    const end = source.indexOf('loadMorePostsRef.current = loadMorePosts', start);
    const loadMoreSource = source.slice(start, end);

    expect(loadMoreSource).toContain('await inFlightPrefetch;');
    expect(loadMoreSource).not.toContain('if (isScrollBusyRef.current)');
  });

  it('keeps one raw scan on the visible pagination critical path', () => {
    expect(source).toContain('const PAGINATION_SCAN_PAGES = 1;');
  });
});
