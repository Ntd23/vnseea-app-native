const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../useFeedViewModel.ts'),
  'utf8',
);

describe('feed prefetch lifecycle', () => {
  it('invalidates in-flight refill work when the view model unmounts', () => {
    expect(source).toContain('const isDisposedRef = useRef(false)');
    expect(source).toMatch(
      /return \(\) => \{[\s\S]*isDisposedRef\.current = true;[\s\S]*paginationGenerationRef\.current \+= 1;/,
    );
    expect(source).toMatch(
      /const schedulePrefetchRefill = useCallback\([\s\S]*if \(isDisposedRef\.current \|\| !isFeedSurfaceActiveRef\.current\) return;/,
    );
  });

  it('lets a shorter healthy refill replace a stale retry backoff', () => {
    expect(source).toContain('prefetchRefillDeadlineRef');
    expect(source).toMatch(
      /candidateDeadline[\s\S]*prefetchRefillDeadlineRef\.current <= candidateDeadline[\s\S]*clearTimeout\(prefetchRefillTimerRef\.current\)/,
    );
  });
});
