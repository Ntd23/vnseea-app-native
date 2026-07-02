const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('LiveKit live stream iOS audio lifecycle', () => {
  it('keeps the viewer LiveKit session stable after join so stream refreshes do not remount the view', () => {
    const source = read('src/live/application/view-models/useLiveViewModel.ts');
    const hookIndex = source.indexOf('export function useLiveRoomViewModel');
    const hookBlock = source.slice(hookIndex);
    const loadStreamIndex = hookBlock.indexOf('const loadStream = useCallback');
    const refreshCommentsIndex = hookBlock.indexOf('const refreshComments = useCallback');
    const loadStreamBlock = hookBlock.slice(loadStreamIndex, refreshCommentsIndex);

    expect(source).toContain('const liveSessionRef = useRef<LiveSession | null>');
    expect(source).toContain('liveSessionRef.current = liveSession');
    expect(loadStreamBlock).toContain('!liveSessionRef.current');
    expect(loadStreamBlock).toContain('setLiveSession(session)');
    expect(loadStreamBlock).not.toContain('!liveSession && !currentIsHost');
    expect(loadStreamBlock).not.toContain('}, [postId, repository, liveSession]');
  });

  it('does not unmount the LiveKit stream view during live room refresh loading once stream info exists', () => {
    const source = read('src/live/presentation/screens/LiveRoomScreen.tsx');
    const loadingIndex = source.indexOf('if (isLoading');
    const streamMissingIndex = source.indexOf('if (!streamInfo)', loadingIndex);
    const loadingBlock = source.slice(loadingIndex, streamMissingIndex);

    expect(loadingBlock).toContain('isLoading && !streamInfo');
    expect(source).toContain('hasLiveKitSession && liveSession ?');
    expect(source).toContain('<LiveKitStreamView');
  });

  it('lets LiveKit own the iOS audio session instead of manually starting or stopping it', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');

    expect(source).not.toContain('AudioSession');
    expect(source).not.toContain('AudioSession.startAudioSession');
    expect(source).not.toContain('AudioSession.stopAudioSession');
    expect(source).toContain('setIosRealtimeMediaAudioActive');
    expect(source).toContain("owner: 'live-stream'");
    expect(source).toContain("mediaKind: 'video'");
    expect(source).toContain("role: isHost ? 'host' : 'viewer'");
    expect(source).toContain('requiresInput: isHost');
    expect(source).toContain("stage: 'mount'");
    expect(source).toContain("stage: 'unmount'");
  });

  it('emits compact LiveKit room lifecycle logs for host and viewer sessions', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');

    expect(source).toContain("logLiveAudioDebug('live_view_mount'");
    expect(source).toContain("logLiveAudioDebug('live_view_unmount'");
    expect(source).toContain("logLiveAudioDebug('live_room_connect_start'");
    expect(source).toContain("logLiveAudioDebug('live_room_connected'");
    expect(source).toContain("logLiveAudioDebug('live_room_disconnected'");
    expect(source).toContain("logLiveAudioDebug('live_room_error'");
  });

  it('requests iOS host camera and microphone permissions before connecting while leaving viewers passive', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');

    expect(source).toContain('requestCallMediaPermissions');
    expect(source).toContain("requestCallMediaPermissions('video')");
    expect(source).toContain("Platform.OS === 'ios'");
    expect(source).toContain('if (!isHost)');
    expect(source).toContain("setPermissionState('granted')");
  });

  it('emits compact live audio stats for host outbound and viewer inbound audio', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');

    expect(source).toContain('startLiveAudioStatsProbe');
    expect(source).toContain("logLiveAudioDebug('live_audio_stats_compact'");
    expect(source).toContain('hostPacketsSent');
    expect(source).toContain('hostBytesSent');
    expect(source).toContain('viewerPacketsReceived');
    expect(source).toContain('viewerBytesReceived');
    expect(source).toContain('room.engine.pcManager?.publisher.getStats');
    expect(source).toContain('room.engine.pcManager?.subscriber?.getStats');
  });

  it('uses a live media bridge to publish host mic-camera and subscribe viewer remote mic-camera through the SDK', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const bridgeIndex = source.indexOf('function LiveKitStreamMediaBridge');
    const videoSurfaceIndex = source.indexOf('function LiveKitVideoSurface');
    const bridgeBlock = source.slice(bridgeIndex, videoSurfaceIndex);

    expect(bridgeIndex).toBeGreaterThan(-1);
    expect(bridgeBlock).toContain('useRoomContext()');
    expect(bridgeBlock).toContain('useLocalParticipant()');
    expect(bridgeBlock).toContain('RoomEvent.Connected');
    expect(bridgeBlock).toContain('RoomEvent.LocalTrackPublished');
    expect(bridgeBlock).toContain('RoomEvent.TrackPublished');
    expect(bridgeBlock).toContain('RoomEvent.TrackSubscribed');
    expect(bridgeBlock).toContain('localParticipant.setMicrophoneEnabled(true)');
    expect(bridgeBlock).toContain('localParticipant.setCameraEnabled(true)');
    expect(source).toContain('publication.setSubscribed(true)');
    expect(bridgeBlock).toContain('requestLiveRemoteTrackSubscription');
    expect(bridgeBlock).toContain('requestLiveRemoteParticipantTrackSubscriptions');
    expect(bridgeBlock).toContain("logLiveAudioDebug('live_local_track_published'");
    expect(bridgeBlock).toContain("logLiveAudioDebug('live_remote_track_published'");
    expect(bridgeBlock).toContain("logLiveAudioDebug('live_remote_track_subscribed'");
    expect(bridgeBlock).not.toContain('AudioSession');
  });

  it('routes iOS live viewers through a manual Room with explicit subscription events', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const manualIndex = source.indexOf('function ManualIosLiveViewerRoom');
    const viewIndex = source.indexOf('export function LiveKitStreamView');
    const manualBlock = source.slice(manualIndex, viewIndex);
    const returnBlock = source.slice(viewIndex);

    expect(manualIndex).toBeGreaterThan(-1);
    expect(manualBlock).toContain('new Room({ adaptiveStream: true, dynacast: true })');
    expect(manualBlock).toContain('<RoomContext.Provider value={room}>');
    expect(manualBlock).toContain('autoSubscribe: false');
    expect(manualBlock.indexOf('RoomEvent.Connected')).toBeLessThan(
      manualBlock.indexOf('room.connect(session.wsUrl, session.token'),
    );
    expect(manualBlock).toContain('RoomEvent.ParticipantConnected');
    expect(manualBlock).toContain('RoomEvent.TrackPublished');
    expect(manualBlock).toContain('RoomEvent.TrackSubscribed');
    expect(manualBlock).toContain('RoomEvent.TrackSubscriptionStatusChanged');
    expect(manualBlock).toContain('RoomEvent.TrackSubscriptionPermissionChanged');
    expect(manualBlock).toContain('RoomEvent.TrackSubscriptionFailed');
    expect(manualBlock).toContain('RoomEvent.Disconnected');
    expect(manualBlock).toContain('clearAllLiveRemoteTrackSubscriptionTimeouts');
    expect(manualBlock).toContain('room.disconnect()');
    expect(returnBlock).toContain("Platform.OS === 'ios' && !isHost");
    expect(returnBlock).toContain('<ManualIosLiveViewerRoom');
    expect(returnBlock).toContain('<LiveKitRoom');
  });

  it('retries stuck live viewer subscriptions and includes remote publication state in viewer stats', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');

    expect(source).toContain('LIVE_REMOTE_SUBSCRIPTION_TIMEOUT_MS = 2_000');
    expect(source).toContain('live_remote_track_subscription_timeout');
    expect(source).toContain('live_remote_track_subscription_retry');
    expect(source).toContain('publication.setSubscribed(false)');
    expect(source).toContain('publication.setSubscribed(true)');
    expect(source).toContain('live_remote_track_subscription_retry_applied');
    expect(source).toContain('clearLiveRemoteTrackSubscriptionTimeout');
    expect(source).toContain('live_remote_track_subscription_status_changed');
    expect(source).toContain('live_remote_track_subscription_permission_changed');
    expect(source).toContain('audioStatsReadyRef.current = true');
    expect(source).toContain('remoteAudioPublication');
    expect(source).toContain('remotePublicationState');
    expect(source).toContain('subscriptionStatus');
    expect(source).toContain('permissionStatus');
  });

  it('starts live audio stats only after audio publication or subscription is ready', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const probeIndex = source.indexOf('function LiveAudioStatsProbe');
    const viewIndex = source.indexOf('function LiveKitVideoSurface');
    const probeBlock = source.slice(probeIndex, viewIndex);

    expect(source).toContain('LIVE_AUDIO_STATS_PROBE_SAMPLES = 12');
    expect(probeBlock).toContain('enabled');
    expect(probeBlock).toContain('if (!enabled) return undefined');
    expect(source).toContain('setAudioStatsReady(true)');
    expect(source).toContain('<LiveAudioStatsProbe');
    expect(source).toContain('enabled={audioStatsReady}');
  });
});
