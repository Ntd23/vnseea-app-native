const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

describe('LiveKit dependency versions', () => {
  it('wraps LiveKit iOS audio management through the official setupIOSAudioManagement hook', () => {
    const indexSource = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
    const helperPath = path.join(
      root,
      'src/shared-kernel/infrastructure/livekit/registerLiveKitGlobals.js',
    );

    expect(indexSource).toContain("require('./src/shared-kernel/infrastructure/livekit/registerLiveKitGlobals')");
    expect(indexSource).toContain('registerLiveKitGlobalsForVnseea();');
    expect(indexSource).not.toContain('registerGlobals();');
    expect(fs.existsSync(helperPath)).toBe(true);
    if (!fs.existsSync(helperPath)) return;

    const helperSource = fs.readFileSync(helperPath, 'utf8');
    expect(helperSource).toContain('registerGlobals({ autoConfigureAudioSession: false })');
    expect(helperSource).toContain('setupIOSAudioManagement');
    expect(helperSource).toContain('getAppleAudioConfigurationForAudioState');
    expect(helperSource).toContain('iosRealtimeMediaAudioContext');
    expect(helperSource).toContain('setIosRealtimeMediaAudioActive');
    expect(helperSource).toContain('setIosVoiceCallAudioActive');
    expect(helperSource).toContain('getVoiceCallAppleAudioConfiguration');
    expect(helperSource).not.toContain('getRealtimeMediaInputAppleAudioConfiguration');
    expect(helperSource).toContain("iosRealtimeMediaAudioContext?.owner === 'direct-call'");
    expect(helperSource).toContain('iosRealtimeMediaAudioContext?.requiresInput');
    expect(helperSource).not.toContain("owner: 'live-stream'");
    expect(helperSource).toContain("audioCategory: 'playAndRecord'");
    expect(helperSource).toContain("'defaultToSpeaker'");
    expect(helperSource).toContain("audioMode: 'voiceChat'");
    expect(helperSource).toContain("'videoChat'");
    expect(helperSource).not.toContain('audioDeviceModuleEvents');
    expect(helperSource).not.toContain('setWillEnableEngineHandler');
    expect(helperSource).not.toContain('setDidDisableEngineHandler');
    expect(helperSource).toContain("logLiveKitAudioDebug('ios_audio_management_registered'");
    expect(helperSource).toContain("logLiveKitAudioDebug('ios_realtime_media_audio_active_changed'");
    expect(helperSource).toContain("logLiveKitAudioDebug('ios_audio_device_state_error'");
    expect(helperSource).not.toContain("logLiveKitAudioDebug('ios_audio_engine_state_update'");
    expect(helperSource).not.toContain("logLiveKitAudioDebug('ios_audio_session_configure_start'");
    expect(helperSource).not.toContain("logLiveKitAudioDebug('ios_audio_session_activate_success'");
    expect(helperSource).not.toContain("logLiveKitAudioDebug('ios_audio_session_deactivate_success'");
  });

  it('uses selected LiveKit versions with only the WebRTC native audio engine patch', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
    );
    const patchedDependencies = manifest.pnpm?.patchedDependencies ?? {};

    expect(manifest.dependencies['@livekit/react-native']).toBe('^2.11.1');
    expect(manifest.dependencies['@livekit/react-native-webrtc']).toBe(
      '^144.1.1',
    );
    expect(manifest.dependencies['livekit-client']).toBe('^2.19.2');
    expect(patchedDependencies['@livekit/react-native@2.11.1']).toBeUndefined();
    expect(
      patchedDependencies['@livekit/react-native-webrtc@144.1.1'],
    ).toBe('patches/@livekit__react-native-webrtc@144.1.1.patch');
    expect(
      fs.existsSync(
        path.join(root, 'patches/@livekit__react-native@2.11.1.patch'),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(root, 'patches/@livekit__react-native-webrtc@144.1.1.patch'),
      ),
    ).toBe(true);
  });

  it('keeps WebRTC CallKit bridge official and patches the native engine observer fallback', () => {
    const installedAudioSessionModule = fs.readFileSync(
      path.join(
        root,
        'node_modules/@livekit/react-native-webrtc/ios/RCTWebRTC/WebRTCModule+RTCAudioSession.m',
      ),
      'utf8',
    );
    const webRtcPatchPath = path.join(
      root,
      'patches/@livekit__react-native-webrtc@144.1.1.patch',
    );
    const webRtcPatchSource = fs.existsSync(webRtcPatchPath)
      ? fs.readFileSync(webRtcPatchPath, 'utf8')
      : '';

    expect(installedAudioSessionModule).toContain('audioSessionDidActivate');
    expect(installedAudioSessionModule).toContain('audioSessionDidDeactivate');
    expect(installedAudioSessionModule).not.toContain('audioSessionDebugState');
    expect(installedAudioSessionModule).not.toContain('VNSEEAForceCallKitVoiceRTCAudioSession');
    expect(installedAudioSessionModule).not.toContain('VNSEEACallKitVoiceWebRTCConfiguration');
    expect(fs.existsSync(webRtcPatchPath)).toBe(true);
    expect(webRtcPatchSource).toContain('VNSEEAConfigureAudioSessionForEngine');
    expect(webRtcPatchSource).toContain('native_webrtc_audio_engine_will_enable');
    expect(webRtcPatchSource).toContain('native_webrtc_audio_engine_will_start');
    expect(webRtcPatchSource).toContain('native_webrtc_audio_session_configured');
    expect(webRtcPatchSource).toContain('native_webrtc_audio_session_config_error');
    expect(webRtcPatchSource).toContain('AVAudioSessionModeVideoChat');
  });
});
