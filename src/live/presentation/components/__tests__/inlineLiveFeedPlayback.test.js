const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('inline live feed playback', () => {
  it('renders the live player directly in Home and Profile without a watch CTA', () => {
    const feed = read('src/feed/presentation/screens/FeedScreen.tsx');
    const profile = read('src/profile/presentation/screens/ProfileScreen.tsx');
    const sharedCard = read(
      'src/feed/presentation/components/LiveStreamPostCard.tsx',
    );
    const aspect = read(
      'src/live/presentation/components/inlineLiveAspect.ts',
    );

    expect(feed).toContain('<InlineLiveStreamPlayer');
    expect(feed).toContain('onVideoDimensionsChange={handleVideoDimensionsChange}');
    expect(feed).toContain('activeInlineLivePostId === item.item.postId');
    expect(profile).toContain('activeProfileInlineLivePostId === item.item.postId');
    expect(profile).toContain('extraData={activeProfileInlineLivePostId}');
    expect(sharedCard).toContain('<InlineLiveStreamPlayer');
    expect(sharedCard).toContain(
      'onVideoDimensionsChange={handleVideoDimensionsChange}',
    );
    expect(feed).toContain('style={{ aspectRatio }}');
    expect(sharedCard).toContain('style={{ aspectRatio }}');
    expect(feed).not.toContain('className="relative h-52 bg-[#0f172a]"');
    expect(sharedCard).not.toContain(
      'className="relative h-52 bg-[#0f172a]"',
    );
    expect(aspect).toContain('DEFAULT_INLINE_LIVE_ASPECT_RATIO = 4 / 5');
    expect(aspect).toContain('MIN_INLINE_LIVE_ASPECT_RATIO = 4 / 5');
    expect(sharedCard).not.toContain('copy.watchLive');
  });

  it('uses poster-first muted video-only playback and skips diagnostics', () => {
    const player = read(
      'src/live/presentation/components/InlineLiveStreamPlayer.tsx',
    );
    const defaultLiveKit = read(
      'src/live/presentation/components/LiveKitStreamView.tsx',
    );
    const sessionHook = read(
      'src/live/presentation/hooks/useInlineLiveSession.ts',
    );

    expect(player).toContain('audioEnabled={false}');
    expect(player).toContain('diagnosticsEnabled={false}');
    expect(player).toContain('objectFit="contain"');
    expect(player).toContain('onVideoDimensionsChange={onVideoDimensionsChange}');
    expect(player).toContain('posterOpacity');
    expect(player).toContain('connectionReady && videoReady');
    expect(player).toContain('connectionReadyRef.current = true');
    expect(player).not.toContain('ActivityIndicator');
    expect(player).not.toContain('loadingBadge');
    expect(defaultLiveKit).toContain('LIVE_VIDEO_ONLY_CONNECT_OPTIONS');
    expect(defaultLiveKit).not.toContain('autoSubscribe: false');
    expect(defaultLiveKit).toContain('publication.setSubscribed(shouldSubscribe)');
    expect(defaultLiveKit).toContain('live_inline_track_subscribed');
    expect(defaultLiveKit).toContain('RoomEvent.ParticipantConnected');
    expect(defaultLiveKit).toContain('RoomEvent.Reconnected');
    expect(defaultLiveKit).toContain('Boolean(item.publication.track)');
    expect(defaultLiveKit).toContain('enabled={!isHost && !audioEnabled}');
    expect(defaultLiveKit).toContain('onDimensionsChange={handleNativeVideoDimensionsChange}');
    expect(player).toContain("state === 'connected'");
    expect(player).toContain('requestRetry(undefined, true)');
    expect(player).toContain('INLINE_LIVE_VIDEO_READY_TIMEOUT_MS');
    expect(player).toContain('INLINE_LIVE_SESSION_READY_TIMEOUT_MS');
    expect(player).toContain('}, [playbackKey, shouldPlay]);');
    expect(sessionHook).toContain(
      'sessionEntry?.key === sessionKey ? sessionEntry.session : null',
    );
  });

  it('keeps iOS inline playback muted and reports video readiness', () => {
    const iosView = read(
      'src/live/presentation/components/LiveKitStreamView.ios.tsx',
    );
    const nativeView = read('ios/VNSEEA/VNSEEALiveKitNativeView.swift');
    const nativeBridge = read('ios/VNSEEA/VNSEEALiveKitNativeViewManager.m');

    expect(iosView).toContain('audioEnabled={audioEnabled}');
    expect(iosView).toContain("eventName === 'live_native_video_attached'");
    expect(nativeView).toContain('try await publication.set(subscribed: false)');
    expect(nativeView).toContain('try await remotePublication.set(subscribed: true)');
    expect(nativeView).toContain('role == .host || audioEnabled');
    expect(nativeView).toContain('live_native_video_attached');
    expect(nativeBridge).toContain('RCT_EXPORT_VIEW_PROPERTY(audioEnabled, BOOL)');
    expect(nativeBridge).toContain('RCT_EXPORT_VIEW_PROPERTY(objectFit, NSString)');
  });
});
