const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Feed and profile list performance contracts', () => {
  const feedSource = read('src/feed/presentation/screens/FeedScreen.tsx');
  const profileSource = read(
    'src/profile/presentation/screens/ProfileScreen.tsx',
  );
  const deferredVisibleIdsSource = read(
    'src/feed/application/realtime/useDeferredVisiblePostIds.ts',
  );

  it('keeps rich cards in a bounded render window without unsafe Android clipping', () => {
    expect(feedSource).toContain('FEED_SCREEN_HEIGHT * 2.2');
    expect(feedSource).toContain('FEED_SCREEN_HEIGHT * 2.6');
    expect(feedSource).toContain('removeClippedSubviews={false}');
    expect(feedSource).not.toContain('FEED_SCREEN_HEIGHT * 6');

    expect(profileSource).toContain('SCREEN_HEIGHT * 1.8');
    expect(profileSource).toContain('SCREEN_HEIGHT * 2.6');
    expect(profileSource).toContain(
      'removeClippedSubviews={PROFILE_IS_ANDROID}',
    );
    expect(profileSource).not.toContain('SCREEN_HEIGHT * 5.5');
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
      'stickyHeaderIndices={PROFILE_POST_STICKY_HEADER_INDICES}',
    );
  });
});
