const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('feed video canonical timeline', () => {
  const viewModelSource = read(
    'src/feed/application/view-models/useFeedViewModel.ts',
  );
  const repositorySource = read(
    'src/feed/infrastructure/repositories/ApiFeedRepository.ts',
  );
  const postCardsSource = read(
    'src/feed/presentation/components/PostCards.tsx',
  );

  it('maps videos into the same repository page as other post kinds', () => {
    const mapper = repositorySource.slice(
      repositorySource.indexOf('function mapLightRawFeedPosts'),
      repositorySource.indexOf('export function createFeedRepository'),
    );

    expect(mapper).toContain('posts.push(mapVideoPost(item));');
    expect(mapper.indexOf('looksLikeVideo(item)')).toBeLessThan(
      mapper.indexOf('looksLikeTextOrPhoto(item)'),
    );
  });

  it('does not gate or artificially mix Feed videos by poster readiness', () => {
    expect(viewModelSource).not.toContain('isFeedVideoReadyForDisplay');
    expect(viewModelSource).not.toContain('mergeFeedContentWithVideos');
    expect(viewModelSource).not.toContain('scheduleVideoBuffer');
    expect(viewModelSource).not.toContain('VIDEO_READY_POOL_LIMIT');
    expect(viewModelSource).toContain(
      'const timelinePosts = sortByTime(',
    );
  });

  it('inserts a newly-created video immediately and keeps poster loading visual-only', () => {
    const prependSource = viewModelSource.slice(
      viewModelSource.indexOf('const prependPost = useCallback'),
      viewModelSource.indexOf('const toggleReaction = useCallback'),
    );

    expect(prependSource).toContain('if (isTimelineFeedPost(post))');
    expect(prependSource).toContain('insertPostAtTop();');
    expect(prependSource).not.toContain('prepareFeedVideoForDisplay');
    expect(postCardsSource).toContain('<VideoPosterSkeleton />');
    expect(postCardsSource).toContain('<FeedMediaFrame style={{ aspectRatio }}>');
  });
});
