const fs = require('fs');
const path = require('path');

const lifecycleModulePath = path.resolve(
  __dirname,
  '../liveViewerLifecycle.ts',
);
const screenSource = fs.readFileSync(
  path.resolve(__dirname, '../../../presentation/screens/LiveRoomScreen.tsx'),
  'utf8',
);
const viewModelSource = fs.readFileSync(
  path.resolve(__dirname, '../useLiveViewModel.ts'),
  'utf8',
);

describe('live viewer ended lifecycle', () => {
  it('keeps reconnecting until media reconnects or backend confirms offline', () => {
    expect(fs.existsSync(lifecycleModulePath)).toBe(true);
    if (!fs.existsSync(lifecycleModulePath)) return;

    const { reduceLiveViewerLifecycle } = require(lifecycleModulePath);

    expect(
      reduceLiveViewerLifecycle('watching', 'media_disconnected'),
    ).toBe('reconnecting');
    expect(
      reduceLiveViewerLifecycle('reconnecting', 'backend_live'),
    ).toBe('reconnecting');
    expect(
      reduceLiveViewerLifecycle('reconnecting', 'media_connected'),
    ).toBe('watching');
    expect(
      reduceLiveViewerLifecycle('watching', 'backend_offline'),
    ).toBe('ended');
    expect(
      reduceLiveViewerLifecycle('ended', 'media_connected'),
    ).toBe('ended');
    expect(
      reduceLiveViewerLifecycle('ended', 'room_changed'),
    ).toBe('watching');
  });

  it('exposes an authoritative status refresh and awaits host end', () => {
    expect(viewModelSource).toContain('const refreshLiveState = useCallback');
    expect(viewModelSource).toContain('await repository.endLive(postId)');
    expect(viewModelSource).toContain('refreshLiveState,');
    expect(viewModelSource).toContain(
      "stream.state === 'live' &&",
    );
    expect(viewModelSource).toContain('liveSession?.isHost');
    expect(viewModelSource).toContain(
      'pendingLiveStateCheckRef.current?.postId === postId',
    );
    expect(viewModelSource).toContain(
      'activePostIdRef.current !== postId',
    );
    expect(viewModelSource).toContain(
      'if (activePostIdRef.current !== postId) return;',
    );
    expect(
      (viewModelSource.match(
        /if \(activePostIdRef\.current !== postId\) return;/g,
      ) || []).length,
    ).toBeGreaterThanOrEqual(5);
  });

  it('shows a persistent viewer end screen and has a feed fallback', () => {
    expect(screenSource).toContain('Phiên live đã kết thúc');
    expect(screenSource).toContain('Cảm ơn bạn đã theo dõi');
    expect(screenSource).toContain('navigation.canGoBack()');
    expect(screenSource).toContain('ROUTES.MAIN_TABS');
    expect(screenSource).toContain('onConnectionStateChange=');
    expect(screenSource).not.toMatch(/setTimeout[\s\S]{0,200}live đã kết thúc/);
  });

  it('removes ended Home live cards without reviving stale requests', () => {
    const repositorySource = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../infrastructure/repositories/ApiLiveRepository.ts',
      ),
      'utf8',
    );

    expect(viewModelSource).toContain('Promise.allSettled([');
    expect(viewModelSource).toContain('foregroundLoadGenerationRef');
    expect(viewModelSource).toContain('activeProbeGenerationRef');
    expect(viewModelSource).toContain('repository.getLivePost(postId)');
    expect(viewModelSource).toContain(
      'endedLivePostsStorage.markEnded(postId, localOwnerId)',
    );
    expect(viewModelSource).toContain(
      'endedLivePostsStorage.notifyInactive(postId, localOwnerId)',
    );
    expect(repositorySource).toContain(
      "throw new Error('Live post lookup returned an incomplete payload.')",
    );
  });
});
