const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

describe('iOS CallKit audio session configuration', () => {
  it('configures CallKeep with a CallKit-safe voice audio session before activation', () => {
    const nativeSource = read('ios/VNSEEA/AppDelegate.swift');
    const serviceSource = read(
      'src/messages/infrastructure/calls/nativeCallService.ts',
    );

    expect(nativeSource).toContain('import AVFoundation');
    expect(nativeSource).toContain('"audioSession"');
    expect(nativeSource).toContain('"categoryOptions"');
    expect(nativeSource).toContain('AVAudioSession.CategoryOptions');
    expect(nativeSource).toContain('.allowBluetoothHFP');
    expect(nativeSource).toContain('.defaultToSpeaker');
    expect(nativeSource).toContain('"mode": AVAudioSession.Mode.voiceChat.rawValue');
    expect(nativeSource).not.toContain('AVAudioSession.Mode.videoChat.rawValue');
    expect(nativeSource).not.toContain('.allowBluetoothA2DP');
    expect(nativeSource).not.toContain('.allowAirPlay');

    expect(serviceSource).not.toContain('AudioSessionCategoryOption');
    expect(serviceSource).not.toContain('AudioSessionMode.videoChat');
    expect(serviceSource).not.toContain('audioSession: {');
  });

  it('bridges CallKit activation natively and keeps JS as event bookkeeping only', () => {
    const serviceSource = read(
      'src/messages/infrastructure/calls/nativeCallService.ts',
    );
    const callKeepPatchSource = read('patches/react-native-callkeep@4.3.16.patch');

    expect(serviceSource).not.toContain(
      "import { RTCAudioSession } from '@livekit/react-native-webrtc';",
    );
    expect(serviceSource).not.toContain('RTCAudioSession.audioSessionDidActivate();');
    expect(serviceSource).not.toContain('RTCAudioSession.audioSessionDidDeactivate();');
    expect(serviceSource).toContain("'didActivateAudioSession'");
    expect(serviceSource).toContain("'didDeactivateAudioSession'");
    expect(serviceSource).toContain('RNCallKeepDidActivateAudioSession');
    expect(serviceSource).toContain('RNCallKeepDidDeactivateAudioSession');
    expect(serviceSource).toContain('callkit_audio_session_event_received');
    expect(serviceSource).toContain('callkit_webrtc_audio_session_activated');
    expect(serviceSource).toContain('callkit_webrtc_audio_session_deactivated');
    expect(serviceSource).toContain('activationApplied: true');
    expect(serviceSource).toContain('deactivationApplied: true');

    expect(callKeepPatchSource).toContain('VNSEEABridgeRTCAudioSessionDidActivate');
    expect(callKeepPatchSource).toContain('VNSEEABridgeRTCAudioSessionDidDeactivate');
    expect(callKeepPatchSource).toContain('NSClassFromString(@"RTCAudioSession")');
    expect(callKeepPatchSource).toContain('audioSessionDidActivate:');
    expect(callKeepPatchSource).toContain('audioSessionDidDeactivate:');
    expect(callKeepPatchSource).toContain('VNSEEAConfigureCallKitAudioSession');
    expect(callKeepPatchSource).toContain('AVAudioSessionCategoryPlayAndRecord');
    expect(callKeepPatchSource).toContain('AVAudioSessionModeVoiceChat');
    expect(callKeepPatchSource).toContain('AVAudioSessionCategoryOptionDefaultToSpeaker');
    expect(callKeepPatchSource).toContain('AVAudioSessionCategoryOptionAllowBluetooth');
    expect(callKeepPatchSource).toContain('AVAudioSessionCategoryOptionMixWithOthers');
    expect(callKeepPatchSource).toContain('setPreferredSampleRate:48000.0');
    expect(callKeepPatchSource).toContain('setPreferredIOBufferDuration:0.01');
    expect(callKeepPatchSource).toContain('[VNSEEA_CALL_DEBUG]');
    expect(callKeepPatchSource).toContain('native_callkit_audio_session_activated');
    expect(callKeepPatchSource).toContain('native_callkit_audio_session_deactivated');
    expect(callKeepPatchSource).toContain('native_callkit_audio_session_config_error');

    expect(serviceSource).not.toContain('NativeModules.WebRTCModule');
    expect(serviceSource).not.toContain('audioSessionDebugState');
    expect(serviceSource).not.toContain('activateWebRTCAudioSessionForCallKit');
    expect(serviceSource).not.toContain('setCallKitVoiceAudioLock');
    expect(serviceSource).not.toContain('callkit_webrtc_audio_session_activate_reapply');
  });

  it('keeps CallKit activation timing without native audio reapply state', () => {
    const serviceSource = read(
      'src/messages/infrastructure/calls/nativeCallService.ts',
    );
    const sessionSource = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const helperIndex = sessionSource.indexOf(
      'async function ensureIosCallKitAudioSessionStarted',
    );
    const helperEndIndex = sessionSource.indexOf(
      'function resolveAudioOutput',
      helperIndex,
    );
    const helperBlock = sessionSource.slice(helperIndex, helperEndIndex);

    expect(serviceSource).toContain('lastWebRTCAudioSessionActivatedAt');
    expect(serviceSource).toContain('lastWebRTCAudioSessionActivatedCallUuid');
    expect(serviceSource).toContain('hasRecentWebRTCAudioSessionActivation');
    expect(serviceSource).toContain("source: 'recent'");
    expect(serviceSource).toContain("source: 'event'");
    expect(serviceSource).toContain("source: 'timeout'");
    expect(serviceSource).toContain('CALLKIT_AUDIO_SESSION_RECENT_MS = 15_000');
    expect(serviceSource).toContain('activationAgeMs?: number');
    expect(serviceSource).not.toContain('bridgeState');
    expect(serviceSource).not.toContain('bridgeApplied');
    expect(serviceSource).not.toContain('lastWebRTCAudioSessionActivationState');
    expect(helperIndex).toBeGreaterThan(-1);
    expect(helperBlock).toContain("logCallDebug('ios_callkit_audio_session_start_start'");
    expect(helperBlock).toContain("logCallDebug('ios_callkit_audio_session_ready'");
    expect(helperBlock).toContain('getIosAudioDeviceStateForLog()');
    expect(helperBlock).not.toContain('AudioSession.startAudioSession()');
    expect(helperBlock).not.toContain("logCallDebug('ios_callkit_audio_session_start_success'");
    expect(helperBlock).not.toContain("logCallDebug('ios_callkit_audio_session_start_error'");
  });

  it('scopes CallKit audio activation to a deterministic call UUID', () => {
    const serviceSource = read(
      'src/messages/infrastructure/calls/nativeCallService.ts',
    );

    expect(serviceSource).toContain('resolveCallKitAudioSessionCallUuid');
    expect(serviceSource).toContain('candidateCount');
    expect(serviceSource).toContain('rawCallUuid');
    expect(serviceSource).toContain('resolvedCallUuid');
    expect(serviceSource).toContain('activationApplied');
    expect(serviceSource).toContain('activationCallUuidMatchesWaiter');
    expect(serviceSource).toContain('type NativeAudioSessionActivationWaiter');
    expect(serviceSource).toContain('audioSessionActivationWaiters.add(waiter)');
    expect(serviceSource).not.toContain(
      'if (!callUuid || !lastWebRTCAudioSessionActivatedCallUuid) {\n    return true;\n  }',
    );
  });

  it('patches only the native dependency layers required for CallKit/WebRTC audio', () => {
    const packageJson = JSON.parse(read('package.json'));
    const patchedDependencies = packageJson.pnpm?.patchedDependencies ?? {};

    expect(patchedDependencies['@livekit/react-native@2.11.1']).toBeUndefined();
    expect(
      patchedDependencies['@livekit/react-native-webrtc@144.1.1'],
    ).toBe('patches/@livekit__react-native-webrtc@144.1.1.patch');
    expect(
      patchedDependencies['react-native-callkeep@4.3.16'],
    ).toBe('patches/react-native-callkeep@4.3.16.patch');
    expect(
      patchedDependencies['react-native-video@6.19.2'],
    ).toBe('patches/react-native-video@6.19.2.patch');
    expect(exists('patches/@livekit__react-native@2.11.1.patch')).toBe(false);
    expect(exists('patches/@livekit__react-native-webrtc@144.1.1.patch')).toBe(true);
    expect(exists('patches/react-native-video@6.19.2.patch')).toBe(true);
  });

  it('keeps LiveKit unpatched and adds native WebRTC engine audio safeguards', () => {
    const liveKitNativeSource = read(
      'node_modules/@livekit/react-native/ios/LiveKitReactNativeModule.swift',
    );
    const webRtcAudioSessionSource = read(
      'node_modules/@livekit/react-native-webrtc/ios/RCTWebRTC/WebRTCModule+RTCAudioSession.m',
    );
    const webRtcPatchPath = 'patches/@livekit__react-native-webrtc@144.1.1.patch';
    const webRtcPatchSource = exists(webRtcPatchPath) ? read(webRtcPatchPath) : '';

    expect(liveKitNativeSource).not.toContain('callKitVoiceAudioLockEnabled');
    expect(liveKitNativeSource).not.toContain('setCallKitVoiceAudioLock');
    expect(liveKitNativeSource).not.toContain('guardCallKitVoiceAudioLock');
    expect(webRtcAudioSessionSource).toContain('audioSessionDidActivate');
    expect(webRtcAudioSessionSource).toContain('audioSessionDidDeactivate');
    expect(webRtcAudioSessionSource).not.toContain('audioSessionDebugState');
    expect(webRtcAudioSessionSource).not.toContain('VNSEEAWebRTCAudioSessionState');
    expect(webRtcAudioSessionSource).not.toContain('VNSEEAForceCallKitVoiceRTCAudioSession');
    expect(exists(webRtcPatchPath)).toBe(true);
    expect(webRtcPatchSource).toContain('VNSEEAConfigureAudioSessionForEngine');
    expect(webRtcPatchSource).toContain('native_webrtc_audio_engine_will_enable');
    expect(webRtcPatchSource).toContain('native_webrtc_audio_engine_will_start');
    expect(webRtcPatchSource).toContain('native_webrtc_audio_session_configured');
    expect(webRtcPatchSource).toContain('native_webrtc_audio_session_config_error');
    expect(webRtcPatchSource).toContain('AVAudioSessionCategoryPlayAndRecord');
    expect(webRtcPatchSource).toContain('AVAudioSessionModeVoiceChat');
    expect(webRtcPatchSource).toContain('AVAudioSessionModeVideoChat');
    expect(webRtcPatchSource).toContain('AVAudioSessionCategoryOptionDefaultToSpeaker');
    expect(webRtcPatchSource).toContain('AVAudioSessionCategoryOptionAllowBluetooth');
    expect(webRtcPatchSource).toContain('AVAudioSessionCategoryOptionMixWithOthers');
    expect(webRtcPatchSource).toContain('setActive:YES');
    expect(webRtcPatchSource).not.toContain('startLocalRecording');
  });

  it('prevents react-native-video from overriding an active realtime media session', () => {
    const videoPatchPath = 'patches/react-native-video@6.19.2.patch';
    const videoPatchSource = exists(videoPatchPath) ? read(videoPatchPath) : '';

    expect(exists(videoPatchPath)).toBe(true);
    expect(videoPatchSource).toContain(
      'diff --git a/ios/Video/AudioSessionManager.swift b/ios/Video/AudioSessionManager.swift',
    );
    expect(videoPatchSource).not.toContain('package-current');
    expect(videoPatchSource).toContain('isVnseeaRealtimeMediaSessionActive');
    expect(videoPatchSource).toContain('AVAudioSession.Category.playAndRecord');
    expect(videoPatchSource).toContain('AVAudioSession.Mode.voiceChat');
    expect(videoPatchSource).toContain('AVAudioSession.Mode.videoChat');
    expect(videoPatchSource).toContain('VNSEEA_CALL_DEBUG');
    expect(videoPatchSource).toContain('react_native_video_audio_session_skip_realtime_media_update');
    expect(videoPatchSource).toContain('react_native_video_audio_session_skip_realtime_media_configure');
    expect(videoPatchSource).toContain('react_native_video_audio_session_skip_realtime_media_remote_controls');
    expect(videoPatchSource).toContain('react_native_video_audio_session_skip_realtime_media_activate');
    expect(videoPatchSource).toContain('react_native_video_audio_session_skip_realtime_media_deactivate');
    expect(videoPatchSource).toContain('react_native_video_audio_session_skip_realtime_media_route_change');
    expect(videoPatchSource).not.toContain('react_native_video_audio_session_skip_voice_call_');
    expect(videoPatchSource).not.toContain('AVAudioSessionModeMoviePlayback');
  });
});
