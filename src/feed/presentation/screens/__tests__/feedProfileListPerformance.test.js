const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Feed and profile list performance contracts', () => {
  const feedSource = read('src/feed/presentation/screens/FeedScreen.tsx');
  const feedViewModelSource = read(
    'src/feed/application/view-models/useFeedViewModel.ts',
  );
  const profileSource = read(
    'src/profile/presentation/screens/ProfileScreen.tsx',
  );
  const deferredVisibleIdsSource = read(
    'src/feed/application/realtime/useDeferredVisiblePostIds.ts',
  );

  it('keeps rich cards in a bounded render window without unsafe Android clipping', () => {
    expect(feedSource).toContain('FEED_SCREEN_HEIGHT * 2.8');
    expect(feedSource).toContain('FEED_SCREEN_HEIGHT * 3.8');
    expect(feedSource).toContain(
      'const FEED_LIST_RECYCLE_POOL_SIZE = FEED_IS_ANDROID ? 18 : 32',
    );
    expect(feedSource).toContain(
      'const FEED_LOAD_MORE_LOOKAHEAD_ITEMS = FEED_IS_ANDROID ? 18 : 14',
    );
    expect(feedSource).toContain('onEndReachedThreshold={1.4}');
    expect(feedSource).toContain('removeClippedSubviews={false}');
    expect(feedSource).not.toContain('FEED_SCREEN_HEIGHT * 6');

    expect(profileSource).toContain('SCREEN_HEIGHT * 2.6');
    expect(profileSource).toContain('SCREEN_HEIGHT * 3.2');
    expect(profileSource).toContain(
      'const PROFILE_POST_RECYCLE_POOL_SIZE = PROFILE_IS_ANDROID ? 14 : 22',
    );
    expect(profileSource).toContain('removeClippedSubviews={false}');
    expect(profileSource).not.toContain('SCREEN_HEIGHT * 5.5');
  });

  it('shortens fling momentum and loads profile posts before the tail is visible', () => {
    expect(feedSource).toContain(
      'const FEED_SCROLL_DECELERATION_RATE = FEED_IS_ANDROID ? 0.94 : 0.992',
    );
    expect(feedSource).toContain(
      'decelerationRate={FEED_SCROLL_DECELERATION_RATE}',
    );
    expect(profileSource).toContain(
      'const PROFILE_SCROLL_DECELERATION_RATE = PROFILE_IS_ANDROID ? 0.94 : 0.992',
    );
    expect(profileSource).toContain(
      'decelerationRate={PROFILE_SCROLL_DECELERATION_RATE}',
    );
    expect(profileSource).toContain(
      'PROFILE_POST_EARLY_LOAD_DISTANCE_MULTIPLIER',
    );
    expect(profileSource).toContain(
      'PROFILE_POST_EARLY_LOAD_MIN_DISTANCE',
    );
    expect(profileSource).toContain('onEndReachedThreshold={1.2}');
    expect(profileSource).not.toContain('onEndReachedThreshold={0.35}');
  });

  it('settles visible post ids before rebuilding realtime scopes while scrolling', () => {
    expect(feedSource).toContain('useDeferredVisiblePostIds()');
    expect(profileSource).toContain('useDeferredVisiblePostIds()');
    expect(feedSource).toContain(
      'scheduleRealtimeVisiblePostIds(visiblePostIds)',
    );
    expect(profileSource).toContain(
      'scheduleRealtimeVisiblePostIds(visiblePostIds)',
    );
    expect(deferredVisibleIdsSource).toContain(
      'DEFAULT_VISIBLE_POST_SETTLE_MS = 180',
    );
    expect(deferredVisibleIdsSource).toContain('MAX_VISIBLE_POST_IDS = 8');
    expect(deferredVisibleIdsSource).toContain(
      'clearTimeout(settleTimerRef.current)',
    );
  });

  it('uses constant-time post index lookup for profile viewability work', () => {
    expect(profileSource).toContain('profilePostIndexByIdRef');
    expect(profileSource).toContain(
      'profilePostIndexByIdRef.current.get(String(viewedPost.id))',
    );
    expect(profileSource).not.toContain(
      'currentPosts.findIndex(post => post.id === viewedPost.id)',
    );
  });

  it('keeps frequently passed list elements and configuration references stable', () => {
    expect(feedSource).toContain('const feedRefreshControl = useMemo(');
    expect(feedSource).toContain('const feedListEmptyComponent = useMemo(');
    expect(profileSource).toContain(
      'const profilePostsEmptyComponent = useMemo(',
    );
    expect(profileSource).toContain(
      'PROFILE_POST_MAINTAIN_VISIBLE_CONTENT_POSITION',
    );
  });

  it('commits one ready page per fling update and keeps the tail runway stable', () => {
    expect(feedViewModelSource).not.toContain('SCROLL_REVEAL_BATCH_SIZE');
    expect(feedViewModelSource).toContain('policy.revealBatchSize,');

    const footerStart = feedSource.indexOf(
      'const ListFooterComponent = useMemo',
    );
    const footerEnd = feedSource.indexOf(
      '// â”€â”€ Photo viewer state',
      footerStart,
    );
    const footerSource = feedSource.slice(footerStart, footerEnd);

    expect(footerSource).toContain('FEED_LOAD_MORE_FOOTER_STYLE');
    expect(footerSource).toContain('isFeedLoadingMore ?');
    expect(footerSource).toContain('<ActivityIndicator');
    expect(footerSource).not.toContain('<PostSkeleton');
    expect(footerSource).toContain('hasFeedContent,');
    expect(footerSource).toContain('isFeedAllLoaded,');
    expect(footerSource).toContain('isFeedLoadingMore,');
    expect(footerSource).toContain('vm.error,');
  });
});
