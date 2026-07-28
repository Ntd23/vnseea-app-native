const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('live discovery surfaces', () => {
  it('loads and refreshes a profile-specific live stream', () => {
    const profile = read('src/profile/presentation/screens/ProfileScreen.tsx');
    const liveViewModel = read(
      'src/live/application/view-models/useLiveViewModel.ts',
    );
    const liveRepository = read(
      'src/live/infrastructure/repositories/ApiLiveRepository.ts',
    );

    expect(profile).toContain('userId: targetUserId ? String(targetUserId)');
    expect(profile).toContain('refreshIntervalMs: 10_000');
    expect(profile).toContain('<LiveStreamPostCard');
    expect(profile).toContain('ROUTES.LIVE_ROOM');
    expect(liveViewModel).toContain('repository.getUserLiveStreams(userId)');
    expect(liveRepository).toContain('async getUserLiveStreams(');
    expect(liveRepository).toContain("type: 'get_user_posts'");
  });

  it('renders live broadcasters before regular stories on Android and iOS', () => {
    const shared = read(
      'src/feed/presentation/components/HomeFeedIntro.shared.ts',
    );
    const android = read(
      'src/feed/presentation/components/HomeFeedIntro.tsx',
    );
    const ios = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );

    expect(shared).toContain('useLiveViewModel({');
    expect(shared).toContain('autoLoad: !usesSharedLiveStreams');
    expect(shared).toContain('enabled: isFocused && !usesSharedLiveStreams');
    expect(shared).toContain('HOME_RAIL_REALTIME_REFRESH_MS');
    expect(shared).toContain('goToLive');
    expect(shared).toContain('ROUTES.LIVE_ROOM');
    expect(android).toContain('function LiveStoryCard');
    expect(ios).toContain('function LiveStoryCard');
    expect(android.indexOf('liveStreams.map')).toBeLessThan(
      android.indexOf('stories.map'),
    );
    expect(ios.indexOf('liveStreams.map')).toBeLessThan(
      ios.indexOf('stories.map'),
    );
  });

  it('shares one focused live source across the Home rail and inline feed cards', () => {
    const feed = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feed).toContain('autoLoad: true');
    expect(feed).toContain('enabled: isFeedTabFocused');
    expect(feed).toContain('refreshIntervalMs: 10_000');
    expect(feed).toContain('liveStreams={feedLiveItems}');
    expect(feed).toContain('onLivePress={handleOpenLive}');
    expect(feed).not.toContain('runWhenScrollIdle(reloadLive)');
  });

  it('refreshes stories while focused and when the app returns to foreground', () => {
    const shared = read(
      'src/feed/presentation/components/HomeFeedIntro.shared.ts',
    );
    const storiesList = read(
      'src/stories/presentation/screens/StoriesListScreen.tsx',
    );
    const storiesListViewModel = read(
      'src/stories/application/view-models/useStoriesListViewModel.ts',
    );

    expect(shared).toContain('setInterval(');
    expect(shared).toContain("AppState.addEventListener('change'");
    expect(storiesList).toContain('STORIES_REALTIME_REFRESH_MS = 10_000');
    expect(storiesList).toContain('useIsFocused()');
    expect(storiesList).toContain("AppState.addEventListener('change'");
    expect(storiesListViewModel).toContain('const refreshSilently');
  });

  it('keeps live posts out of the ordinary profile post mapper', () => {
    const feedRepository = read(
      'src/feed/infrastructure/repositories/ApiFeedRepository.ts',
    );
    const feedScreen = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedRepository).toContain('function looksLikeLive(');
    expect(feedRepository).toContain('if (looksLikeLive(raw)) return false;');
    expect(feedRepository).toContain(
      'if (looksLikeAd(item) || looksLikeLive(item)) continue;',
    );
    expect(feedRepository).toContain(
      'if (isGroupRawPost(item) || looksLikeLive(item))',
    );
    expect(feedScreen).toContain('const livePostIds = new Set(');
    expect(feedScreen).toContain(
      '.filter(post => !livePostIds.has(String(post.id)))',
    );
  });
});
