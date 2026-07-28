const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function liveStreamSource() {
  return read('src/live/presentation/components/LiveKitStreamView.tsx');
}

function iosLiveStreamSource() {
  return read('src/live/presentation/components/LiveKitStreamView.ios.tsx');
}

function nativeLiveViewSource() {
  return read('ios/VNSEEA/VNSEEALiveKitNativeView.swift');
}

function nativeLiveViewBridgeSource() {
  return read('ios/VNSEEA/VNSEEALiveKitNativeViewManager.m');
}

describe('LiveKit live stream native iOS media path', () => {
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

  it('uses the native LiveKit Swift view for iOS live media', () => {
    const source = iosLiveStreamSource();

    expect(source).toContain("requireNativeComponent<NativeLiveKitViewProps>('VNSEEALiveKitNativeView')");
    expect(source).toContain('serverUrl={session.wsUrl}');
    expect(source).toContain('token={session.token}');
    expect(source).toContain('roomName={session.roomName}');
    expect(source).toContain('streamName={session.streamName}');
    expect(source).toContain("liveRole={isHost ? 'host' : 'viewer'}");
    expect(source).toContain('cameraFacing={cameraFacing}');
    expect(source).toContain("connect={permissionState === 'granted'}");
    expect(source).toContain('onLiveNativeEvent={handleNativeEvent}');
  });

  it('keeps the Android/default managed LiveKitRoom path for live media', () => {
    const source = liveStreamSource();
    const viewIndex = source.indexOf('export function LiveKitStreamView');
    const viewBlock = source.slice(viewIndex);

    expect(viewBlock).toContain('<LiveKitRoom');
    expect(viewBlock).toContain('audio={isHost}');
    expect(viewBlock).toContain('video={hostVideoCaptureOptions}');
    expect(viewBlock).toContain('connectOptions={connectOptions}');
    expect(source).toContain('const LIVE_CONNECT_OPTIONS = {');
    expect(source).toContain('const LIVE_VIDEO_ONLY_CONNECT_OPTIONS = {');
    expect(source).toContain('autoSubscribe: true');
    expect(source).not.toContain('autoSubscribe: false');
    expect(source).toContain('setRemoteTrackVolume(track, 0)');
    expect(source).not.toContain('new Room(');
    expect(source).not.toContain('RoomContext.Provider');
    expect(source).not.toContain('ManualIosLiveHostRoom');
    expect(source).not.toContain('ManualIosLiveViewerRoom');
  });

  it('keeps iOS live JavaScript out of RN LiveKit/WebRTC media ownership', () => {
    const source = iosLiveStreamSource();

    expect(source).not.toContain('LiveKitRoom');
    expect(source).not.toContain('AudioSession');
    expect(source).not.toContain('useTracks');
    expect(source).not.toContain('VideoTrack');
    expect(source).not.toContain('useTrackVolume');
    expect(source).not.toContain('new Room(');
    expect(source).not.toContain('RoomContext.Provider');
    expect(source).not.toContain('publication.setSubscribed');
    expect(source).not.toContain('silent_audio_recovery');
    expect(source).not.toContain('AudioDeviceModule');
    expect(source).not.toContain('NativeModules.LivekitReactNativeModule');
    expect(source).not.toContain('RTCAudioSession');
    expect(source).not.toContain('setAppleAudioConfiguration');
  });

  it('requests host camera and microphone permissions before connecting while leaving viewers passive', () => {
    const source = iosLiveStreamSource();

    expect(source).toContain('requestCallMediaPermissions');
    expect(source).toContain("requestCallMediaPermissions('video')");
    expect(source).toContain('if (!isHost)');
    expect(source).toContain("setPermissionState('granted')");
    expect(source).toContain('permissionState === \'granted\'');
  });

  it('implements the native iOS live view with the LiveKit Swift SDK', () => {
    const source = nativeLiveViewSource();
    const bridge = nativeLiveViewBridgeSource();
    const project = read('ios/VNSEEA.xcodeproj/project.pbxproj');

    expect(source).toContain('import LiveKit');
    expect(source).toContain('class VNSEEALiveKitNativeView');
    expect(source).toContain('VideoView()');
    expect(source).toContain('Room(delegate: self');
    expect(source).toContain('let shouldAutoSubscribe = role == .host || audioEnabled');
    expect(source).toContain(
      'ConnectOptions(autoSubscribe: shouldAutoSubscribe)',
    );
    expect(source).toContain('RoomOptions(');
    expect(source).toContain('setMicrophone(enabled: true)');
    expect(source).toContain('setCamera(enabled: true');
    expect(source).toContain('CameraCaptureOptions(');
    expect(source).toContain('func roomDidConnect(_ room: Room)');
    expect(source).toContain('didPublishTrack publication: LocalTrackPublication');
    expect(source).toContain('didSubscribeTrack publication: RemoteTrackPublication');
    expect(source).toContain('videoView.track = track');
    expect(source).toContain('live_native_room_connected');
    expect(source).toContain('live_native_track_published');
    expect(source).toContain('live_native_track_subscribed');
    expect(source).toContain('live_native_error');
    expect(bridge).toContain('RCT_EXTERN_MODULE(VNSEEALiveKitNativeViewManager, RCTViewManager)');
    expect(bridge).toContain('RCT_EXPORT_VIEW_PROPERTY(audioEnabled, BOOL)');
    expect(bridge).toContain('RCT_EXPORT_VIEW_PROPERTY(objectFit, NSString)');
    expect(bridge).toContain('RCT_EXPORT_VIEW_PROPERTY(onLiveNativeEvent, RCTBubblingEventBlock)');
    expect(project).toContain('https://github.com/livekit/client-sdk-swift');
    expect(project).toContain('kind = exactVersion;');
    expect(project).toContain('version = 2.15.1;');
    expect(project).toContain('productName = LiveKit;');
  });

  it('pauses feed video and disables react-native-video audio session management while live is active', () => {
    const feedSource = read('src/feed/presentation/screens/FeedScreen.tsx');
    const postCardsSource = read('src/feed/presentation/components/PostCards.tsx');
    const liveRoomSource = read('src/live/presentation/screens/LiveRoomScreen.tsx');
    const isolationSource = read('src/shared-kernel/application/state/liveMediaPlaybackIsolation.ts');
    const handleOpenLiveIndex = feedSource.indexOf('const handleOpenLive = useCallback');
    const handleOpenLiveBlock = feedSource.slice(
      handleOpenLiveIndex,
      feedSource.indexOf('// ── Reactions sheet state', handleOpenLiveIndex),
    );

    expect(handleOpenLiveBlock).toContain('setActiveFeedVideo(null)');
    expect(handleOpenLiveBlock).toContain("logFeedLiveDebug('feed_live_navigation_media_pause'");
    expect(handleOpenLiveBlock.indexOf('setActiveFeedVideo(null)')).toBeLessThan(
      handleOpenLiveBlock.indexOf('navigation.navigate'),
    );
    expect(liveRoomSource).toContain('publishLiveMediaActive(liveMediaActive)');
    expect(liveRoomSource).toContain(
      'const liveMediaActive = !viewerHasEnded',
    );
    expect(liveRoomSource).toContain('publishLiveMediaActive(false)');
    expect(isolationSource).toContain('live_video_audio_session_isolation_changed');
    expect(postCardsSource).toContain('useLiveMediaActive');
    expect(postCardsSource).toMatch(
      /disableAudioSessionManagement=\{\s*Platform\.OS === 'ios' && liveMediaActive\s*\}/,
    );
  });

  it('removes live-stream context ownership from shared LiveKit audio bootstrap', () => {
    const source = read('src/shared-kernel/infrastructure/livekit/registerLiveKitGlobals.js');

    expect(source).toContain('setIosRealtimeMediaAudioActive');
    expect(source).toContain('setIosVoiceCallAudioActive');
    expect(source).toContain('isIosVoiceCallAudioActive');
    expect(source).not.toContain("owner: 'live-stream'");
    expect(source).not.toContain('getRealtimeMediaInputAppleAudioConfiguration');
    expect(source).not.toContain("context.owner === 'live-stream'");
  });

  it('keeps the minimal frame-dimensions bridge alongside call-related patches', () => {
    const packageJson = JSON.parse(read('package.json'));
    const webRtcPatch = read('patches/@livekit__react-native-webrtc@144.1.1.patch');

    expect(packageJson.pnpm?.patchedDependencies?.['@livekit/react-native@2.11.1']).toBe(
      'patches/@livekit__react-native@2.11.1.patch',
    );
    const liveKitPatch = read('patches/@livekit__react-native@2.11.1.patch');
    expect(liveKitPatch).toContain('onDimensionsChange');
    expect(webRtcPatch).toContain('native_webrtc_audio_engine_will_start');
    expect(webRtcPatch).toContain('native_webrtc_audio_microphone_unmuted');
    expect(webRtcPatch).toContain('params.putInt("rotation", rotation);');
    expect(webRtcPatch).not.toContain('native_live_apm_capture_probe');
    expect(webRtcPatch).not.toContain('native_live_audio_sender_attach');
    expect(webRtcPatch).not.toContain('native_live_mic_pcm_probe');
    expect(webRtcPatch).not.toContain('startVnseeaMicInputProbe');
    expect(webRtcPatch).not.toContain('audioTrack.source.volume = 1.0');
  });
});
