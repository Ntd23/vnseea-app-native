const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('feed video readiness pipeline', () => {
  const source = read('src/feed/application/view-models/useFeedViewModel.ts');

  it('keeps the ready video pool small and prepares posters before display', () => {
    expect(source).toContain('const VIDEO_PREPARE_BATCH_SIZE = 2;');
    expect(source).toContain('const VIDEO_READY_POOL_LIMIT = 8;');
    expect(source).toContain('await Image.prefetch(posterUrl)');
    expect(source).toContain('.slice(0, VIDEO_READY_POOL_LIMIT)');
  });

  it('probes the newest video page even when the prepared cache is full', () => {
    expect(source).toContain('(lightCount: number, forceNewest = false)');
    expect(source).toContain(
      'if (!forceNewest && videoPostsRef.current.length >= requiredVideos)',
    );
    expect(source).toContain('scheduleVideoBuffer(freshPosts.length, true)');
  });

  it('does not prepend an unprepared new video card into the visible feed', () => {
    const videoBranchStart = source.indexOf("if (post.kind === 'video')");
    const videoBranchEnd = source.indexOf(
      'if (isLightFeedPost(post))',
      videoBranchStart,
    );
    const videoBranch = source.slice(videoBranchStart, videoBranchEnd);

    expect(videoBranch).toContain('const insertPreparedVideo = () =>');
    expect(videoBranch).toContain('if (isFeedVideoReadyForDisplay(post))');
    expect(videoBranch).toContain('prepareFeedVideoForDisplay(post)');
    expect(videoBranch).not.toContain('insertPostAtTop();\n\n        if');
  });
});
