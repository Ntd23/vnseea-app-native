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

  it('scopes iOS live viewer audio session start to remote audio playout only', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const bridgeIndex = source.indexOf('function LiveKitRemoteAudioPlayoutBridge');
    const manualIndex = source.indexOf('function ManualIosLiveViewerRoom');
    const bridgeBlock = source.slice(bridgeIndex, manualIndex);

    expect(bridgeIndex).toBeGreaterThan(-1);
    expect(source).toContain('AudioSession');
    expect(bridgeBlock).toContain('AudioSession.setDefaultRemoteAudioTrackVolume(1)');
    expect(bridgeBlock).toContain('AudioSession.startAudioSession()');
    expect(bridgeBlock).toContain('room.startAudio?.()');
    expect(bridgeBlock).toContain("logLiveAudioDebug('live_remote_audio_playout_ready'");
    expect(bridgeBlock).toContain("logLiveAudioDebug('live_remote_audio_session_start'");
    expect(bridgeBlock).toContain("logLiveAudioDebug('live_remote_audio_session_start_error'");
    expect(source).not.toContain('AudioSession.stopAudioSession');
    expect(source).not.toContain('AudioDeviceModule.startLocalRecording');
    expect(source).not.toContain('AudioDeviceModule.setRecordingAlwaysPreparedMode');
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
    const statsIndex = source.indexOf("logLiveAudioDebug('live_audio_stats_compact'");
    const errorIndex = source.indexOf("logLiveAudioDebug('live_audio_stats_error'");
    const statsBlock = source.slice(statsIndex, errorIndex);

    expect(source).toContain('startLiveAudioStatsProbe');
    expect(source).toContain('collectLiveLocalAudioTrackStats');
    expect(source).toContain('collectLiveRemoteAudioTrackStats');
    expect(source).toContain('getRTCStatsReport');
    expect(source).toContain("logLiveAudioDebug('live_audio_stats_compact'");
    expect(source).toContain('hostPacketsSent');
    expect(source).toContain('hostBytesSent');
    expect(source).toContain('hostLocalTrackPacketsSent');
    expect(source).toContain('hostLocalTrackBytesSent');
    expect(source).toContain('hostLocalTrackAudioEnergy');
    expect(source).toContain('hostLocalTrackReadyState');
    expect(source).toContain('hostIsMicrophoneMuted');
    expect(source).toContain('hostAudioSessionPrepared');
    expect(source).toContain('viewerPacketsReceived');
    expect(source).toContain('viewerBytesReceived');
    expect(source).toContain('remoteTrackPacketsReceived');
    expect(source).toContain('remoteTrackBytesReceived');
    expect(source).toContain('remoteTrackAudioLevel');
    expect(source).toContain('remoteTrackReadyState');
    expect(source).toContain('audioSessionStartedByViewer');
    expect(source).toContain('room.engine.pcManager?.publisher.getStats');
    expect(source).toContain('room.engine.pcManager?.subscriber?.getStats');
    expect(source).toContain("logLiveAudioDebug('live_audio_track_stats_detail'");
    expect(statsBlock).not.toContain('outboundAudio');
    expect(statsBlock).not.toContain('inboundAudio');
    expect(statsBlock).not.toContain('localTrackAudio');
    expect(statsBlock).not.toContain('remoteTrackAudio,');
  });

  it('mounts a remote audio playout bridge for manual iOS live viewers', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const bridgeIndex = source.indexOf('function LiveKitRemoteAudioPlayoutBridge');
    const manualIndex = source.indexOf('function ManualIosLiveViewerRoom');
    const viewIndex = source.indexOf('export function LiveKitStreamView');
    const bridgeBlock = source.slice(bridgeIndex, manualIndex);
    const manualBlock = source.slice(manualIndex, viewIndex);

    expect(bridgeIndex).toBeGreaterThan(-1);
    expect(bridgeBlock).toContain('useRoomContext()');
    expect(bridgeBlock).toContain('RoomEvent.Connected');
    expect(bridgeBlock).toContain('RoomEvent.ParticipantConnected');
    expect(bridgeBlock).toContain('RoomEvent.TrackSubscribed');
    expect(bridgeBlock).toContain('RoomEvent.TrackUnsubscribed');
    expect(bridgeBlock).toContain('isLiveAudioPublication(publication)');
    expect(bridgeBlock).toContain('track.setVolume(1)');
    expect(bridgeBlock).toContain('logLiveAudioDeviceState');
    expect(manualBlock).toContain('<LiveKitRemoteAudioPlayoutBridge');
  });

  it('logs remote audio PCM volume for manual iOS live viewers', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const volumeIndex = source.indexOf('function LiveRemoteAudioVolumeProbe');
    const manualIndex = source.indexOf('function ManualIosLiveViewerRoom');
    const viewIndex = source.indexOf('export function LiveKitStreamView');
    const volumeBlock = source.slice(volumeIndex, manualIndex);
    const manualBlock = source.slice(manualIndex, viewIndex);

    expect(source).toContain('useTrackVolume');
    expect(volumeIndex).toBeGreaterThan(-1);
    expect(volumeBlock).toContain('useTrackVolume');
    expect(volumeBlock).toContain("logLiveAudioDebug('live_remote_audio_pcm_volume'");
    expect(manualBlock).toContain('<LiveRemoteAudioVolumeProbe');
  });

  it('uses a live media bridge to publish host mic-camera and subscribe viewer remote mic-camera through the SDK', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const bridgeIndex = source.indexOf('function LiveKitStreamMediaBridge');
    const audioPlayoutIndex = source.indexOf('function LiveKitRemoteAudioPlayoutBridge');
    const bridgeBlock = source.slice(bridgeIndex, audioPlayoutIndex);

    expect(bridgeIndex).toBeGreaterThan(-1);
    expect(audioPlayoutIndex).toBeGreaterThan(bridgeIndex);
    expect(bridgeBlock).toContain('useRoomContext()');
    expect(bridgeBlock).toContain('useLocalParticipant()');
    expect(bridgeBlock).toContain('RoomEvent.Connected');
    expect(bridgeBlock).toContain('RoomEvent.LocalTrackPublished');
    expect(bridgeBlock).toContain('RoomEvent.TrackPublished');
    expect(bridgeBlock).toContain('RoomEvent.TrackSubscribed');
    expect(source).toContain('ensureIosLiveHostMicrophoneUnmuted');
    expect(bridgeBlock).toContain('publishIosLiveHostMicrophoneTrack({');
    expect(bridgeBlock).toContain('localParticipant.setCameraEnabled(true)');
    expect(source).toContain('publication.setSubscribed(true)');
    expect(bridgeBlock).toContain('requestLiveRemoteTrackSubscription');
    expect(bridgeBlock).toContain('requestLiveRemoteParticipantTrackSubscriptions');
    expect(bridgeBlock).toContain("logLiveAudioDebug('live_local_track_published'");
    expect(bridgeBlock).toContain("logLiveAudioDebug('live_remote_track_published'");
    expect(bridgeBlock).toContain("logLiveAudioDebug('live_remote_track_subscribed'");
    expect(bridgeBlock).not.toContain('AudioSession');
  });

  it('unmutes the iOS live host AudioDeviceModule microphone around host capture', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const helperIndex = source.indexOf('async function ensureIosLiveHostMicrophoneUnmuted');
    const mediaBridgeIndex = source.indexOf('function LiveKitStreamMediaBridge');
    const audioPlayoutIndex = source.indexOf('function LiveKitRemoteAudioPlayoutBridge');
    const hostIndex = source.indexOf('function ManualIosLiveHostRoom');
    const viewerIndex = source.indexOf('function ManualIosLiveViewerRoom');
    const helperBlock = source.slice(helperIndex, mediaBridgeIndex);
    const mediaBridgeBlock = source.slice(mediaBridgeIndex, audioPlayoutIndex);
    const hostBlock = source.slice(hostIndex, viewerIndex);

    expect(source).toContain("import { AudioDeviceModule } from '@livekit/react-native-webrtc'");
    expect(helperIndex).toBeGreaterThan(-1);
    expect(helperBlock).toContain('AudioDeviceModule.setMicrophoneMuted(false)');
    expect(helperBlock).toContain('getIosLiveAudioDeviceStateForLog()');
    expect(helperBlock).toContain("logLiveAudioDebug('live_host_microphone_unmute_start'");
    expect(helperBlock).toContain("logLiveAudioDebug('live_host_microphone_unmute_success'");
    expect(helperBlock).toContain("logLiveAudioDebug('live_host_microphone_unmute_error'");
    expect(hostBlock).toContain("ensureIosLiveHostMicrophoneUnmuted('after_audio_session_start'");
    expect(helperBlock).toContain('`before_${reason}`');
    expect(helperBlock).toContain('`after_${reason}`');
    expect(mediaBridgeBlock).toContain("reason: 'initial_publish'");
    expect(source).not.toContain('AudioDeviceModule.startLocalRecording');
    expect(source).not.toContain('AudioDeviceModule.setRecordingAlwaysPreparedMode');
  });

  it('publishes the iOS live host microphone through an explicit local audio track', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const helperIndex = source.indexOf('async function publishIosLiveHostMicrophoneTrack');
    const mediaBridgeIndex = source.indexOf('function LiveKitStreamMediaBridge');
    const audioPlayoutIndex = source.indexOf('function LiveKitRemoteAudioPlayoutBridge');
    const helperBlock = source.slice(helperIndex, mediaBridgeIndex);
    const mediaBridgeBlock = source.slice(mediaBridgeIndex, audioPlayoutIndex);

    expect(helperIndex).toBeGreaterThan(-1);
    expect(helperBlock).toContain('localParticipant.createTracks({ audio: true, video: false })');
    expect(helperBlock).toContain('localParticipant.publishTrack(audioTrack');
    expect(helperBlock).toContain('source: Track.Source.Microphone');
    expect(helperBlock).toContain('stream: streamName');
    expect(helperBlock).toContain("logLiveAudioDebug('live_host_audio_track_create_start'");
    expect(helperBlock).toContain("logLiveAudioDebug('live_host_audio_track_create_success'");
    expect(helperBlock).toContain("logLiveAudioDebug('live_host_audio_track_publish_success'");
    expect(helperBlock).toContain("logLiveAudioDebug('live_host_audio_track_publish_error'");
    expect(mediaBridgeBlock).toContain("reason: 'initial_publish'");
    expect(mediaBridgeBlock).toContain('publishIosLiveHostMicrophoneTrack({');
  });

  it('recovers iOS live host silent outbound audio by republishing the microphone once', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const statsIndex = source.indexOf('function startLiveAudioStatsProbe');
    const probeIndex = source.indexOf('function LiveAudioStatsProbe');
    const hostIndex = source.indexOf('function ManualIosLiveHostRoom');
    const viewerIndex = source.indexOf('function ManualIosLiveViewerRoom');
    const statsBlock = source.slice(statsIndex, probeIndex);
    const hostBlock = source.slice(hostIndex, viewerIndex);

    expect(source).toContain('LIVE_HOST_SILENT_AUDIO_RECOVERY_SAMPLE = 4');
    expect(statsBlock).toContain('hostSilentAudioRecoveryRequested');
    expect(statsBlock).toContain('onHostSilentAudioDetected');
    expect(statsBlock).toContain("logLiveAudioDebug('live_host_silent_audio_detected'");
    expect(statsBlock).toContain('hostLocalTrackBytesSent > 0');
    expect(statsBlock).toContain('hostLocalTrackAudioEnergy === 0');
    expect(hostBlock).toContain('handleHostSilentAudioDetected');
    expect(hostBlock).toContain("logLiveAudioDebug('live_host_silent_audio_recovery_start'");
    expect(hostBlock).toContain("reason: 'silent_audio_recovery'");
    expect(hostBlock).toContain("logLiveAudioDebug('live_host_silent_audio_recovery_success'");
    expect(hostBlock).toContain("logLiveAudioDebug('live_host_silent_audio_recovery_error'");
    expect(hostBlock).toContain('onHostSilentAudioDetected={handleHostSilentAudioDetected}');
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
    expect(manualBlock).toContain('autoSubscribe: true');
    expect(manualBlock).not.toContain('autoSubscribe: false');
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

  it('routes iOS live hosts through a manual Room and prepares recording audio before connect', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const hostIndex = source.indexOf('function ManualIosLiveHostRoom');
    const viewerIndex = source.indexOf('function ManualIosLiveViewerRoom');
    const viewIndex = source.indexOf('export function LiveKitStreamView');
    const hostBlock = source.slice(hostIndex, viewerIndex);
    const returnBlock = source.slice(viewIndex);

    expect(hostIndex).toBeGreaterThan(-1);
    expect(viewerIndex).toBeGreaterThan(hostIndex);
    expect(hostBlock).toContain('new Room({ adaptiveStream: true, dynacast: true })');
    expect(hostBlock).toContain('<RoomContext.Provider value={room}>');
    expect(hostBlock).toContain('setIosLiveStreamAudioActive({');
    expect(hostBlock).toContain("stage: 'before_connect'");
    expect(hostBlock).toContain('AudioSession.setAppleAudioConfiguration({');
    expect(hostBlock).toContain("audioCategory: 'playAndRecord'");
    expect(hostBlock).toContain("audioMode: 'videoChat'");
    expect(hostBlock).toContain("audioCategoryOptions: ['allowBluetooth', 'defaultToSpeaker', 'mixWithOthers']");
    expect(hostBlock).toContain('AudioSession.startAudioSession()');
    expect(hostBlock).toContain("ensureIosLiveHostMicrophoneUnmuted('after_audio_session_start'");
    expect(hostBlock).toContain("logLiveAudioDebug('live_host_audio_session_prepare_start'");
    expect(hostBlock).toContain("logLiveAudioDebug('live_host_audio_session_prepare_success'");
    expect(hostBlock).toContain("logLiveAudioDebug('live_host_audio_session_prepare_error'");
    expect(hostBlock).toContain('room.connect(session.wsUrl, session.token, { autoSubscribe: true })');
    expect(hostBlock.indexOf('RoomEvent.Connected')).toBeLessThan(
      hostBlock.indexOf('room.connect(session.wsUrl, session.token'),
    );
    expect(hostBlock).toContain('<LiveKitStreamMediaBridge');
    expect(hostBlock).toContain('<LiveAudioStatsProbe');
    expect(hostBlock).toContain('hostAudioSessionPrepared={hostAudioSessionPrepared}');
    expect(returnBlock).toContain("Platform.OS === 'ios' && isHost");
    expect(returnBlock).toContain('<ManualIosLiveHostRoom');
    expect(returnBlock).toContain("Platform.OS === 'ios' && !isHost");
    expect(returnBlock).toContain('<ManualIosLiveViewerRoom');
    expect(returnBlock).toContain('<LiveKitRoom');
  });

  it('patches native WebRTC to unmute the recording microphone when the audio engine starts', () => {
    const patch = read('patches/@livekit__react-native-webrtc@144.1.1.patch');

    expect(patch).toContain('VNSEEAUnmuteMicrophoneForRecordingEngine');
    expect(patch).toContain('native_webrtc_audio_microphone_unmuted');
    expect(patch).toContain('isRecordingEnabled');
    expect(patch).toContain('[audioDeviceModule setMicrophoneMuted:NO]');
    expect(patch).toContain('audioDeviceModule.isMicrophoneMuted');
    expect(patch).toContain('VNSEEAConfigureAudioSessionForEngine(isPlayoutEnabled, isRecordingEnabled);');
    expect(patch).toContain('VNSEEAUnmuteMicrophoneForRecordingEngine(audioDeviceModule, isPlayoutEnabled, isRecordingEnabled);');
  });

  it('retries stuck live viewer subscriptions and includes remote publication state in viewer stats', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');

    expect(source).toContain('LIVE_REMOTE_SUBSCRIPTION_TIMEOUT_MS = 2_000');
    expect(source).toContain('live_remote_track_subscription_timeout');
    expect(source).toContain('live_remote_track_subscription_retry');
    expect(source).toContain('live_remote_track_auto_subscribe_timeout');
    expect(source).toContain('live_remote_track_subscription_manual_recovery');
    expect(source).toContain('publication.setSubscribed(true)');
    expect(source).toContain('live_remote_track_subscription_manual_recovery_applied');
    expect(source).toContain('publication.setSubscribed(false)');
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

  it('lets autoSubscribe own initial iOS live viewer subscription before manual recovery', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const manualIndex = source.indexOf('function ManualIosLiveViewerRoom');
    const viewIndex = source.indexOf('export function LiveKitStreamView');
    const manualBlock = source.slice(manualIndex, viewIndex);
    const connectedIndex = manualBlock.indexOf('const handleConnected = () =>');
    const participantIndex = manualBlock.indexOf('const handleParticipantConnected');
    const trackPublishedIndex = manualBlock.indexOf('const handleTrackPublished');
    const connectedBlock = manualBlock.slice(connectedIndex, participantIndex);
    const participantBlock = manualBlock.slice(participantIndex, trackPublishedIndex);

    expect(manualBlock).toContain('scheduleLiveRemoteTrackSubscriptionRecovery');
    expect(manualBlock).toContain("'auto_subscribe_connected'");
    expect(manualBlock).toContain("'auto_subscribe_participant_connected'");
    expect(connectedBlock).not.toContain('requestLiveRemoteTrackSubscription');
    expect(connectedBlock).not.toContain('requestParticipantSubscriptions');
    expect(participantBlock).not.toContain('requestLiveRemoteTrackSubscription');
    expect(participantBlock).not.toContain('requestParticipantSubscriptions');
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
