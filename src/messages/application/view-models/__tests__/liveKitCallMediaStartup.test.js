const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('LiveKit call media startup resilience', () => {
  it('renders iOS direct audio calls through LiveKitRoom with SDK-owned media startup', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const managedComponentIndex = source.indexOf(
      'const ManagedIosDirectLiveKitRoom',
    );
    const activeManualComponentIndex = source.indexOf(
      'const ActiveLiveKitRoom',
      managedComponentIndex,
    );
    const managedBlock = source.slice(
      managedComponentIndex,
      activeManualComponentIndex,
    );

    expect(managedComponentIndex).toBeGreaterThan(-1);
    expect(managedBlock).toContain('<LiveKitRoom');
    expect(managedBlock).toContain('audio={true}');
    expect(managedBlock).toContain('video={false}');
    expect(managedBlock).toContain('connect={session.iosNativeAudioReady}');
    expect(managedBlock).not.toContain('connect={true}');
    expect(managedBlock).toContain('useRoomContext()');
    expect(managedBlock).toContain('useConnectionState()');
    expect(managedBlock).not.toContain('options={LIVEKIT_ROOM_OPTIONS}');
    expect(managedBlock).not.toContain('connectOptions={LIVEKIT_CONNECT_OPTIONS}');
    expect(managedBlock).not.toContain('new Room');
    expect(managedBlock).not.toContain('publication.setSubscribed');
    expect(managedBlock).not.toContain('room.localParticipant.setMicrophoneEnabled(true)');
  });

  it('routes only iOS direct audio calls to the managed LiveKitRoom path', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).toContain('function shouldUseManagedIosDirectRoom');
    expect(source).toContain("Platform.OS === 'ios'");
    expect(source).toContain("callType === 'audio'");
    expect(source).not.toContain("callType === 'audio' || callType === 'video'");
    expect(source).toContain('isManagedIosDirectCall');
    expect(source).toContain('managed_ios_direct_room_prepare_start');
    expect(source).toContain("logCallDebug('native_audio_gate_pass'");
    expect(source).toContain("logCallDebug('native_audio_gate_failed'");
    expect(source).toContain('iosNativeAudioReady');
    expect(source).toContain('managed_ios_direct_room_connected');
  });

  it('does not use custom CallKit voice locks or WebRTC audio reapply helpers', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).not.toContain('setCallKitVoiceAudioLock');
    expect(source).not.toContain('prepareManagedIosDirectRoomConnectGuard');
    expect(source).not.toContain('managedIosDirectConnectGuardReadyKey');
    expect(source).not.toContain('ensureWebRTCAudioBridgeForCallKit');
    expect(source).not.toContain('activateWebRTCAudioSessionForCallKit');
    expect(source).not.toContain('getWebRTCAudioSessionDebugState');
    expect(source).not.toContain('repairIosVoiceAudioSessionDrift');
    expect(source).not.toContain('ios_audio_session_state_after_local_publish_reapply');
  });

  it('waits for CallKit activation without taking native recording ownership before connect', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const nativeSource = read(
      'src/messages/infrastructure/calls/nativeCallService.ts',
    );

    expect(nativeSource).toContain('waitForNativeAudioSessionActivation');
    expect(source).toContain('waitForNativeAudioSessionActivation');
    expect(source).toContain("logCallDebug('callkit_audio_session_wait_start'");
    expect(source).toContain("logCallDebug('callkit_audio_session_wait_end'");
    expect(source).toContain('setIosVoiceCallAudioActive(true');
    expect(source).not.toContain('prepareIosVoiceRecordingDevice');
    expect(source).not.toContain('ensureIosVoiceRecordingRunning');
    expect(source).not.toContain('AudioDeviceModule.setEngineAvailability');
    expect(source).not.toContain('isInputAvailable: true');
    expect(source).not.toContain('isOutputAvailable: true');
    expect(source).not.toContain('AudioDeviceModule.setRecordingAlwaysPreparedMode');
    expect(source).not.toContain('AudioDeviceModule.setVoiceProcessingEnabled');
    expect(source).not.toContain('AudioDeviceModule.setVoiceProcessingAGCEnabled');
    expect(source).not.toContain('AudioDeviceModule.setMicrophoneMuted');
    expect(source).not.toContain('AudioSession.setAppleAudioConfiguration');
    expect(source).toContain("stage: 'before_connect'");
    expect(source).toContain('ensureIosCallKitAudioSessionStarted');
    expect(source).toContain("stage: 'callkit_activation'");
    expect(source).toContain("stage: 'managed_room_connected'");
    expect(source).toContain('activation.callUuid === callUuid');
    expect(source).toContain("logCallDebug('ios_callkit_audio_session_start_start'");
    expect(source).toContain("logCallDebug('ios_callkit_audio_session_ready'");
    expect(source).not.toContain("logCallDebug('ios_callkit_audio_session_start_success'");
    expect(source).not.toContain("logCallDebug('ios_callkit_audio_session_start_error'");
    expect(source).not.toContain("logCallDebug('ios_voice_recording_prepare_start'");
    expect(source).not.toContain("logCallDebug('ios_voice_recording_prepare_success'");
    expect(source).not.toContain("logCallDebug('ios_voice_recording_warm_start'");
    expect(source).not.toContain("logCallDebug('ios_voice_recording_warm_error'");
    expect(source).toContain("logCallDebug('ios_audio_device_state'");
    expect(source).toContain('preferSpeakerOutput');
    expect(source).not.toContain("logCallDebug('ios_callkit_audio_outputs_after_start'");
    expect(source).not.toContain("logCallDebug('ios_callkit_audio_output_select_start'");
    expect(source).not.toContain("logCallDebug('ios_callkit_audio_output_select_success'");
    expect(source).toContain('shouldStartAudioSessionBeforeConnect');
    expect(source).toContain('usesNativeCallUi');
  });

  it('hard-gates managed iOS direct voice rendering on native audio readiness', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const renderGuardIndex = source.indexOf(
      'const shouldRenderManagedIosDirectRoom',
    );
    const renderGuardEndIndex = source.indexOf(
      'const value = useMemo<LiveKitCallSessionContextValue>',
      renderGuardIndex,
    );
    const renderGuardBlock = source.slice(renderGuardIndex, renderGuardEndIndex);

    expect(source).toContain('iosNativeAudioReady: false');
    expect(source).toContain('iosNativeAudioReady: true');
    expect(renderGuardIndex).toBeGreaterThan(-1);
    expect(renderGuardBlock).toContain('session.iosNativeAudioReady');
    expect(renderGuardBlock).toContain('session?.payload');
    expect(renderGuardBlock).toContain('shouldUseManagedIosDirectRoom');
    expect(source).toContain('catch (prepareError)');
    expect(source).toContain('endNativeCall(callUuid)');
    expect(source).toContain('throw prepareError');
    expect(source).toContain('!shouldUseManagedIosDirectRoom(session.callType)');
  });

  it('does not manually stop AudioSession for iOS CallKit teardown', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const resetIndex = source.indexOf('const resetMediaState = useCallback');
    const finishIndex = source.indexOf('const finishSession = useCallback');
    const resetBlock = source.slice(resetIndex, finishIndex);
    const finishEndIndex = source.indexOf(
      'const endCall = useCallback',
      finishIndex,
    );
    const finishBlock = source.slice(finishIndex, finishEndIndex);

    expect(resetIndex).toBeGreaterThan(-1);
    expect(resetBlock).toContain('stopAudioSession');
    expect(resetBlock).toContain("Platform.OS === 'ios'");
    expect(resetBlock).toContain('usesNativeCallUi');
    expect(resetBlock).toContain('AudioSession.stopAudioSession()');
    expect(finishBlock).toContain('isIosNativeCall');
    expect(finishBlock.indexOf('endNativeCall')).toBeLessThan(
      finishBlock.indexOf('resetMediaState'),
    );
    expect(finishBlock).toContain('stopAudioSession: !isIosNativeCall');
  });

  it('keeps custom Room connect options out of the managed iOS voice path', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const managedComponentIndex = source.indexOf(
      'const ManagedIosDirectLiveKitRoom',
    );
    const activeManualComponentIndex = source.indexOf(
      'const ActiveLiveKitRoom',
      managedComponentIndex,
    );
    const managedBlock = source.slice(
      managedComponentIndex,
      activeManualComponentIndex,
    );

    expect(managedBlock).not.toContain('LIVEKIT_ROOM_OPTIONS');
    expect(managedBlock).not.toContain('LIVEKIT_CONNECT_OPTIONS');
    expect(source).toContain('LIVEKIT_CONNECT_OPTIONS');
    expect(source).toContain('autoSubscribe: false');
    expect(source).toContain(
      'await nextRoom.connect(nextPayload.wsUrl, nextPayload.token, LIVEKIT_CONNECT_OPTIONS)',
    );
  });

  it('keeps recording SDK-owned and uses compact stats with one SDK mic recovery', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const probeIndex = source.indexOf('function startCallAudioStatsProbe');
    const probeEndIndex = source.indexOf('function startCallVideoStatsProbe', probeIndex);
    const probeBlock = source.slice(probeIndex, probeEndIndex);

    expect(source).not.toContain('ensureIosVoiceRecordingRunning');
    expect(source).not.toContain('AudioDeviceModule.isRecording()');
    expect(source).not.toContain('AudioDeviceModule.startLocalRecording()');
    expect(source).not.toContain('releaseIosVoiceRecordingDevice');
    expect(source).not.toContain('AudioDeviceModule.stopLocalRecording()');
    expect(source).not.toContain('AudioDeviceModule.setRecordingAlwaysPreparedMode');
    expect(source).toContain('setIosVoiceCallAudioActive(false');
    expect(probeBlock).not.toContain("logCallDebug('audio_stats_sample'");
    expect(probeBlock).toContain("logCallDebug('audio_stats_compact'");
    expect(probeBlock).toContain('toCompactAudioStats');
    expect(source).toContain('localPacketsSent');
    expect(source).toContain('localBytesSent');
    expect(source).toContain('remotePacketsReceived');
    expect(source).toContain('diagnosis');
    expect(probeBlock).toContain("logCallDebug('audio_stats_zero_outbound'");
    expect(probeBlock).toContain("logCallDebug('zero_outbound_recovery_start'");
    expect(probeBlock).toContain("logCallDebug('zero_outbound_recovery_success'");
    expect(probeBlock).toContain("logCallDebug('zero_outbound_recovery_error'");
    expect(probeBlock).toContain('room.localParticipant.setMicrophoneEnabled(false)');
    expect(probeBlock).toContain('room.localParticipant.setMicrophoneEnabled(true)');
    expect(probeBlock).not.toContain('onZeroOutboundAudio');
    expect(source).not.toContain('restartIosWebRTCAudioDeviceAfterZeroStats');
    expect(source).not.toContain('AudioDeviceModule.stopRecording()');
    expect(source).not.toContain('AudioDeviceModule.stopPlayout()');
  });
});
