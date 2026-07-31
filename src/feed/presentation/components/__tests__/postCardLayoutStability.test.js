const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../../..');

function readPostCards() {
  return fs.readFileSync(
    path.join(
      repoRoot,
      'src/feed/presentation/components/PostCards.tsx',
    ),
    'utf8',
  );
}

describe('Post card rendering stability', () => {
  it('calls reaction-summary hooks before its empty-row return', () => {
    const source = readPostCards();
    const summarySource = source.slice(
      source.indexOf('const VideoReactionSummary'),
      source.indexOf('const VideoPostActions'),
    );
    const hookIndex = summarySource.indexOf(
      'const handleOpenReactions = useCallback',
    );
    const earlyReturnIndex = summarySource.indexOf(
      'if (likeCount <= 0 && commentCount <= 0) return null;',
    );

    expect(hookIndex).toBeGreaterThan(-1);
    expect(earlyReturnIndex).toBeGreaterThan(hookIndex);
  });

  it('measures video thumbnails before scroll idle and caches their stable identity', () => {
    const source = readPostCards();
    const measurementSource = source.slice(
      source.indexOf('// Measure thumbnail size on mount'),
      source.indexOf('// Refine aspect ratio when actual video loads'),
    );

    expect(measurementSource).toContain('Image.getSize(');
    expect(measurementSource).not.toContain('isScrollBusy');
    expect(measurementSource).toContain(
      'cacheMediaAspectRatio(videoPreviewCacheKey, width, height);',
    );
  });
});
