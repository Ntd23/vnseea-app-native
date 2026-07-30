const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

describe('Home feed photo source', () => {
  it('switches All and Photos locally without clearing or reloading the feed', () => {
    const source = fs.readFileSync(
      path.join(
        root,
        'src/feed/application/view-models/useFeedViewModel.ts',
      ),
      'utf8',
    );
    const start = source.indexOf('const selectFeedSource = useCallback');
    const end = source.indexOf('const consumePrefetchBatch', start);
    const selection = source.slice(start, end);

    expect(selection).toContain("nextSource === 'photos' ? 'all' : nextSource");
    expect(selection).toContain(
      'if (feedSourceRef.current === nextApiSource)',
    );
    expect(selection).toContain('setFeedSourceState(nextSource);');
    expect(selection.indexOf('setFeedSourceState(nextSource);')).toBeLessThan(
      selection.indexOf('lightPostsRef.current = [];'),
    );
  });
});
