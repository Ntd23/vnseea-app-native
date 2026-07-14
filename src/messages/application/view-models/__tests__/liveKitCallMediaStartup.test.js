const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('LiveKit call media startup resilience', () => {
  it('routes iOS direct audio and video calls through the manual Room path', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const connectIndex = source.indexOf('const connectPayload = useCallback');
    const connectEndIndex = source.indexOf(
      'const joinAnsweredOutgoingCall = useCallback',
      connectIndex,
    );
    const connectBlock = source.slice(connectIndex, connectEndIndex);

    expect(source).not.toContain('ManagedIosDirectLiveKitRoom');
    expect(source).not.toContain('shouldUseManagedIosDirectRoom');
    expect(source).not.toContain('<LiveKitRoom');
    expect(source).toContain('function shouldUseIosDirectCallAudioGate');
    expect(source).toContain("callType === 'audio' || callType === 'video'");
    expect(connectBlock).toContain('prepareIosDirectCallAudioGate({');
    expect(connectBlock).toContain('const nextRoom = new Room(LIVEKIT_ROOM_OPTIONS)');
    expect(connectBlock).toContain(
      'await nextRoom.connect(nextPayload.wsUrl, nextPayload.token, LIVEKIT_CONNECT_OPTIONS)',
    );
    expect(connectBlock).toContain('publishLocalCallMedia({');
    expect(source).toContain("logCallDebug('native_audio_gate_pass'");
    expect(source).toContain("logCallDebug('native_audio_gate_failed'");
    expect(source).toContain('iosNativeAudioReady');
  });

  it('publishes audio and optional video after the manual room connects', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const connectIndex = source.indexOf('const connectPayload = useCallback');
    const connectEndIndex = source.indexOf('const joinAnsweredOutgoingCall = useCallback', connectIndex);
    const connectBlock = source.slice(connectIndex, connectEndIndex);

    expect(source).toContain('function shouldUseIosDirectCallAudioGate');
    expect(source).toContain("callType === 'audio' || callType === 'video'");
    expect(connectBlock).toContain('prepareIosDirectCallAudioGate({');
    expect(connectBlock).toContain('const nextRoom = new Room(LIVEKIT_ROOM_OPTIONS)');
    expect(connectBlock).toContain(
      'await nextRoom.connect(nextPayload.wsUrl, nextPayload.token, LIVEKIT_CONNECT_OPTIONS)',
    );
    expect(connectBlock).toContain('publishLocalCallMedia({');
    expect(source).toContain('room.localParticipant.setMicrophoneEnabled(true)');
    expect(source).toContain('room.localParticipant.setCameraEnabled(true)');
    expect(source).toContain('requestRemoteTrackSubscription');
  });

  it('sets the iOS realtime media latch for direct video calls before connect and clears it on teardown', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).toContain('setIosRealtimeMediaAudioActive');
    expect(source).toContain('shouldUseIosDirectCallAudioGate(params.callType)');
    expect(source).toContain("owner: 'direct-call'");
    expect(source).toContain("role: 'call'");
    expect(source).toContain("mediaKind: params.callType");
    expect(source).toContain('requiresInput: true');
    expect(source).toContain("stage: 'before_connect'");
    expect(source).toContain("stage: 'ios_direct_room_error'");
    expect(source).toContain("stage: 'release'");
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
    expect(source).toContain('setIosRealtimeMediaAudioActive');
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

  it('hard-gates iOS direct calls before creating the manual room', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const connectIndex = source.indexOf('const connectPayload = useCallback');
    const roomIndex = source.indexOf(
      'const nextRoom = new Room(LIVEKIT_ROOM_OPTIONS)',
      connectIndex,
    );
    const gateIndex = source.indexOf(
      'await prepareIosDirectCallAudioGate({',
      connectIndex,
    );

    expect(source).toContain('iosNativeAudioReady: false');
    expect(source).toContain(
      'iosNativeAudioReady: shouldPrepareIosDirectAudioGate',
    );
    expect(gateIndex).toBeGreaterThan(-1);
    expect(roomIndex).toBeGreaterThan(gateIndex);
    expect(source).toContain('catch (prepareError)');
    expect(source).toContain('endNativeCall(callUuid)');
    expect(source).toContain('throw prepareError');
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

  it('releases the iOS direct-call audio owner on connect failure and final room disconnect', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const connectIndex = source.indexOf('const connectPayload = useCallback');
    const connectEndIndex = source.indexOf(
      'const joinAnsweredOutgoingCall = useCallback',
      connectIndex,
    );
    const connectBlock = source.slice(connectIndex, connectEndIndex);
    const disconnectedIndex = connectBlock.indexOf(
      'const handleDisconnected =',
    );
    const disconnectedEndIndex = connectBlock.indexOf(
      'const handleMediaDeviceError =',
      disconnectedIndex,
    );
    const disconnectedBlock = connectBlock.slice(
      disconnectedIndex,
      disconnectedEndIndex,
    );
    const connectCatchIndex = connectBlock.indexOf("logCallDebug('room_connect_error'");
    const connectCatchEndIndex = connectBlock.indexOf(
      'const elapsedSeconds =',
      connectCatchIndex,
    );
    const connectCatchBlock = connectBlock.slice(
      connectCatchIndex,
      connectCatchEndIndex,
    );

    expect(disconnectedBlock).toContain('activeRoomRef.current !== nextRoom');
    expect(disconnectedBlock).toContain('finishSession({');
    expect(connectCatchBlock).toContain('setIosVoiceCallAudioActive(false');
    expect(connectCatchBlock).toContain('endNativeCall(callUuid)');
  });

  it('uses selective subscription for every manual call room', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).not.toContain('connectOptions={{ autoSubscribe: true }}');
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
