const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../FeedScreen.tsx'),
  'utf8',
);

describe('Feed scroll hot path', () => {
  it('does not perform native video surface measurement inside onScroll', () => {
    const start = source.indexOf('const handleFeedScroll = useCallback');
    const end = source.indexOf('const handleScrollEndDrag', start);
    const scrollHandler = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(scrollHandler).not.toContain('measureActiveFeedVideoOnScreen');
    expect(scrollHandler).not.toContain('measureInWindow');
  });

  it('measures the active video once after scroll-busy state is released', () => {
    const start = source.indexOf('const endScrollPause = useCallback');
    const end = source.indexOf('const rememberFeedScrollOffset', start);
    const settleHandler = source.slice(start, end);

    expect(settleHandler).toContain('isScrollingRef.current = false;');
    expect(settleHandler).toContain('measureActiveFeedVideoOnScreen(false);');
    expect(settleHandler.indexOf('isScrollingRef.current = false;')).toBeLessThan(
      settleHandler.indexOf('measureActiveFeedVideoOnScreen(false);'),
    );
  });

  it('does not scan the accumulated feed in the 1-percent viewability callback', () => {
    const start = source.indexOf(
      'const publishStableFeedVisibleMediaPostIds = useCallback',
    );
    const end = source.indexOf(
      'const getFeedVideoMeasurementPriorityIds',
      start,
    );
    const visibilityPublisher = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(visibilityPublisher).toContain('feedPostIdsRef.current');
    expect(visibilityPublisher).not.toContain('feedListItemsRef.current');
    expect(visibilityPublisher).not.toContain('.filter(');
    expect(visibilityPublisher).not.toContain('.map(');
    expect(visibilityPublisher).toContain('!isScrollingRef.current');
  });

  it('uses a fixed relayout retention deadline that partial snapshots cannot renew', () => {
    const start = source.indexOf(
      'const publishStableFeedVisibleMediaPostIds = useCallback',
    );
    const end = source.indexOf(
      'const getFeedVideoMeasurementPriorityIds',
      start,
    );
    const visibilityPublisher = source.slice(start, end);

    expect(visibilityPublisher).toContain(
      'visibleMediaRetentionDeadlineAtRef.current',
    );
    expect(visibilityPublisher).toContain(
      'resolveFeedVisibleMediaRetentionDeadline',
    );
    expect(visibilityPublisher).toContain(
      'retentionDeadlineAtMs - Date.now()',
    );
  });

});
