const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/feed/application/view-models/useFeedViewModel.ts'),
  'utf8',
);

describe('Home feed load-more latency contracts', () => {
  it('does not reveal the startup prefetch buffer while the user is scrolling', () => {
    const start = source.indexOf('const scheduleWarmVisibleFill = useCallback');
    const end = source.indexOf('const applyFeedSources = useCallback', start);
    const warmFillSource = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(warmFillSource).toContain('isScrollBusyRef.current');
    expect(warmFillSource.indexOf('isScrollBusyRef.current')).toBeLessThan(
      warmFillSource.indexOf('void loadMorePostsRef.current();'),
    );
  });

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

  it('lets background page prefetch continue while native scrolling is busy', () => {
    const schedulerStart = source.indexOf(
      'const schedulePrefetchRefill = useCallback',
    );
    const schedulerEnd = source.indexOf(
      'schedulePrefetchRefillRef.current = schedulePrefetchRefill',
      schedulerStart,
    );
    const prefetchStart = source.indexOf(
      'const prefetchNextPage = useCallback',
      schedulerEnd,
    );
    const prefetchEnd = source.indexOf(
      'prefetchNextPageRef.current = prefetchNextPage',
      prefetchStart,
    );
    const schedulerSource = source.slice(schedulerStart, schedulerEnd);
    const prefetchSource = source.slice(prefetchStart, prefetchEnd);

    expect(schedulerStart).toBeGreaterThan(-1);
    expect(schedulerEnd).toBeGreaterThan(schedulerStart);
    expect(prefetchStart).toBeGreaterThan(schedulerEnd);
    expect(prefetchEnd).toBeGreaterThan(prefetchStart);
    expect(schedulerSource).not.toContain('isScrollBusyRef.current');
    expect(prefetchSource).not.toContain('isScrollBusyRef.current');
  });

  it('exposes synchronous admission plus an async append outcome', () => {
    const start = source.indexOf('const requestLoadMorePosts = useCallback');
    const end = source.indexOf('loadMorePostsRef.current = loadMorePosts', start);
    const requestSource = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(requestSource).toContain('if (!canStartLoadMorePosts()) return false;');
    expect(requestSource).toContain('loadMorePosts().then(outcome => {');
    expect(requestSource).toContain('onComplete?.(outcome);');
    expect(requestSource).toContain('return true;');
  });

  it('reports retryable completion when an accepted page adds no rows', () => {
    const start = source.indexOf('const loadMorePosts = useCallback');
    const end = source.indexOf('const requestLoadMorePosts = useCallback', start);
    const loadMoreSource = source.slice(start, end);

    expect(source).toContain('export type FeedLoadMoreOutcome');
    expect(loadMoreSource).toContain("return 'appended';");
    expect(loadMoreSource).toContain("return 'terminal';");
    expect(loadMoreSource).toContain("return 'retryable';");
    expect(loadMoreSource).toContain("return 'stale';");
  });
});
