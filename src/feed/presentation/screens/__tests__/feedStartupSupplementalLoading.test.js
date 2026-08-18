const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    'src/feed/presentation/screens/FeedScreen.tsx',
  ),
  'utf8',
);

describe('feed startup supplemental loading', () => {
  it('does not start the Reels warmup during the first active feed scroll', () => {
    const effectStart = source.indexOf('const startReelsPreload = () => {');
    const effectEnd = source.indexOf(
      'const isFeedLoadingRef = useRef(vm.isLoading);',
      effectStart,
    );
    const preloadEffect = source.slice(effectStart, effectEnd);

    expect(effectStart).toBeGreaterThan(-1);
    expect(effectEnd).toBeGreaterThan(effectStart);
    expect(preloadEffect).toContain('shouldRunFeedStartupBackgroundWork({');
    expect(preloadEffect).toContain(
      'lastScrollActivityAtMs: lastFeedScrollActivityAtRef.current',
    );
    expect(source).toContain('const FEED_REELS_PRELOAD_DELAY_MS = 8000;');
    expect(preloadEffect).toContain(
      'scheduleReelsPreload(FEED_REELS_PRELOAD_DELAY_MS);',
    );
    expect(preloadEffect).not.toContain(
      'setTimeout(startReelsPreload, 800)',
    );
  });

  it('keeps supplemental requests deferred for the full active scroll', () => {
    expect(source).toContain(
      'const runWhenScrollIdle = (task: () => void) => {',
    );
    expect(source).toContain('shouldRunFeedStartupBackgroundWork({');
    expect(source).toContain(
      'lastScrollActivityAtMs: lastFeedScrollActivityAtRef.current',
    );
    expect(source).not.toContain('deadlineAt = Date.now() + 1200');
    expect(source).not.toContain('Date.now() < deadlineAt');
    expect(source).toContain(
      'const FEED_PRODUCTS_LOAD_DELAY_MS = 6000;',
    );
    expect(source).toContain('const FEED_GROUPS_LOAD_DELAY_MS = 7000;');
    expect(source).toContain('const FEED_PAGES_LOAD_DELAY_MS = 8000;');
    expect(source).toContain('const FEED_EVENTS_LOAD_DELAY_MS = 9000;');
    expect(source).toContain('const FEED_JOBS_LOAD_DELAY_MS = 10000;');
    expect(source).toContain('const FEED_FUNDING_LOAD_DELAY_MS = 11000;');
  });
});
