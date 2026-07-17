const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Home feed video autoplay safety', () => {
  it('does not activate the first feed video before it is viewable', () => {
    const feedScreenSource = read(
      'src/feed/presentation/screens/FeedScreen.tsx',
    );

    expect(feedScreenSource).not.toContain(
      'Autoplay the first video on mount / load',
    );
    expect(feedScreenSource).not.toContain(
      "feedPosts.find(p => p.kind === 'video')",
    );
  });

  it('uses shared audio state with feed videos unmuted by default', () => {
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );

    expect(postCardsSource).toContain(
      'export let feedVideoMutedSnapshot = false',
    );
    expect(postCardsSource).toContain('function useFeedVideoMuted()');
    expect(postCardsSource).toContain('publishFeedVideoMuted(!muted)');
    expect(postCardsSource).toContain(
      'const isScrollBusy = useFeedScrollBusy();',
    );
    expect(postCardsSource).toContain(
      'const canMountWarmVideo = !isScrollBusy || shouldKeepPreparedVideoMounted;',
    );
    expect(postCardsSource).toContain('!isScrollBusy &&');
    expect(postCardsSource).toContain(
      '(isActive ? !isScrollBusy : warmPlaying)',
    );
    expect(postCardsSource).toContain(
      'muted={muted || !isActive || isScrollBusy || !hasRenderedFrame}',
    );
    expect(postCardsSource).not.toContain('setMuted(false)');
    expect(postCardsSource).not.toContain('setMuted(true)');
    expect(postCardsSource).not.toContain(
      'const [muted, setMuted] = useState(',
    );
  });

  it('keeps the poster visible until the first real video frame is ready', () => {
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );

    expect(postCardsSource).toContain(
      'const mediaIdentity = `${post.id}:${videoUrl}`;',
    );
    expect(postCardsSource).toContain(
      'if (mediaIdentity !== mediaIdentityRef.current) return;',
    );
    expect(postCardsSource).toContain('onReadyForDisplay={revealVideoFrame}');
    expect(postCardsSource).toContain(
      '!hasRenderedFrame ? { opacity: 0 } : null',
    );
    expect(postCardsSource).toContain('frameCoverOpacity.value = withTiming(');
    expect(postCardsSource).toContain(
      'runOnJS(hideFrameCoverForMedia)(mediaIdentity)',
    );
    expect(postCardsSource).toContain(
      'style={[StyleSheet.absoluteFill, frameCoverAnimatedStyle]}',
    );
  });

  it('uses SurfaceView for Android feed playback compatibility', () => {
    const postCardsSource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );

    expect(postCardsSource).toContain('useTextureView={false}');
  });
});
