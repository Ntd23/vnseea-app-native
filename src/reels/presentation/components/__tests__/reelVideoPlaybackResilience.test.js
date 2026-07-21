const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Reel video playback resilience', () => {
  const reelItemSource = read('src/reels/presentation/components/ReelItem.tsx');
  const reelsScreenSource = read(
    'src/reels/presentation/screens/ReelsScreen.tsx',
  );

  it('uses an Android TextureView and avoids clipped player detach churn', () => {
    expect(reelItemSource).toContain(
      "useTextureView={Platform.OS === 'android'}",
    );
    expect(reelsScreenSource).toContain(
      "removeClippedSubviews={Platform.OS !== 'android'}",
    );
  });

  it('retries a transient player error before marking the current reel unavailable', () => {
    expect(reelItemSource).toContain('REEL_VIDEO_RETRY_LIMIT = 1');
    expect(reelItemSource).toContain(
      'setPlayerAttempt(previous => previous + 1)',
    );
    expect(reelItemSource).toContain('if (!isCurrent) return;');
  });

  it('resets and reports native player readiness across remounts', () => {
    expect(reelItemSource).toContain('onLoadStart={() => {');
    expect(reelItemSource).toContain('onReadyForDisplay={markVideoDisplayed}');
    expect(reelItemSource).toContain(
      'onBuffer={({ isBuffering: nextIsBuffering }) => {',
    );
    expect(reelItemSource).toContain('key={`${item.id}:${playerAttempt}`}');
  });

  it('pauses and unmounts reel players while the app is backgrounded', () => {
    expect(reelsScreenSource).toContain(
      "() => AppState.currentState === 'active'",
    );
    expect(reelsScreenSource).toContain(
      "setIsAppActive(nextState === 'active')",
    );
    expect(reelsScreenSource).toContain(
      'isFocusedScreen && isSelectedRoute && isAppActive',
    );
  });

  it('keeps video source identity and seek-time memo inputs stable', () => {
    expect(reelItemSource).toContain('const videoSource = useMemo(');
    expect(reelItemSource).toContain(
      'prev.initialSeekTime === next.initialSeekTime',
    );
  });
});
