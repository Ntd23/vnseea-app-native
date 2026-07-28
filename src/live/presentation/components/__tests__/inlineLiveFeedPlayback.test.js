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

    expect(feed).toContain('<InlineLiveStreamPlayer active={isActive} item={item} />');
    expect(feed).toContain('activeInlineLivePostId === item.item.postId');
    expect(profile).toContain('activeProfileInlineLivePostId === item.item.postId');
    expect(profile).toContain('extraData={activeProfileInlineLivePostId}');
    expect(sharedCard).toContain(
      '<InlineLiveStreamPlayer active={isActive} item={item} />',
    );
    expect(sharedCard).not.toContain('copy.watchLive');
  });

  it('uses poster-first muted video-only playback and skips diagnostics', () => {
    const player = read(
      'src/live/presentation/components/InlineLiveStreamPlayer.tsx',
    );
    const defaultLiveKit = read(
      'src/live/presentation/components/LiveKitStreamView.tsx',
    );

    expect(player).toContain('audioEnabled={false}');
    expect(player).toContain('diagnosticsEnabled={false}');
    expect(player).toContain('objectFit="cover"');
    expect(player).toContain('posterOpacity');
    expect(defaultLiveKit).toContain('LIVE_VIDEO_ONLY_CONNECT_OPTIONS');
    expect(defaultLiveKit).toContain('publication.setSubscribed(shouldSubscribe)');
    expect(defaultLiveKit).toContain('enabled={!isHost && !audioEnabled}');
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
