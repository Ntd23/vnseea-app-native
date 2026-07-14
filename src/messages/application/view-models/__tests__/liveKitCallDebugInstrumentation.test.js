const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('LiveKit CallKit debug instrumentation', () => {
  it('logs the CallKit answer, payload, room, participant, track, and local media boundaries', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).toContain('[VNSEEA_CALL_DEBUG]');
    expect(source).toContain("logCallDebug('media_permission_result'");
    expect(source).toContain("logCallDebug('callkit_answer_start'");
    expect(source).toContain("logCallDebug('answer_request'");
    expect(source).toContain("logCallDebug('answer_response'");
    expect(source).toContain("logCallDebug('answer_error'");
    expect(source).toContain("logCallDebug('payload_request'");
    expect(source).toContain("logCallDebug('payload_response'");
    expect(source).toContain("logCallDebug('payload_error'");
    expect(source).toContain("logCallDebug('room_connect_start'");
    expect(source).toContain("logCallDebug('room_connect_success'");
    expect(source).toContain("logCallDebug('room_connected'");
    expect(source).toContain("logCallDebug('participant_connected'");
    expect(source).toContain("logCallDebug('track_published'");
    expect(source).toContain("logCallDebug('track_subscription_requested'");
    expect(source).toContain("logCallDebug('track_subscription_failed'");
    expect(source).toContain("logCallDebug('track_subscription_status_changed'");
    expect(source).toContain("logCallDebug('track_subscription_permission_changed'");
    expect(source).toContain("logCallDebug('track_subscription_sdk_failed'");
    expect(source).toContain("logCallDebug('track_subscription_timeout'");
    expect(source).toContain("logCallDebug('track_subscription_retry'");
    expect(source).toContain("logCallDebug('track_subscribed'");
    expect(source).toContain("logCallDebug('local_track_published'");
    expect(source).toContain("logCallDebug('local_microphone_enable_start'");
    expect(source).toContain("logCallDebug('local_microphone_enabled'");
    expect(source).toContain("logCallDebug('local_camera_enable_start'");
    expect(source).toContain("logCallDebug('local_camera_enabled'");
    expect(source).toContain("logCallDebug('audio_stats_compact'");
    expect(source).toContain("logCallDebug('audio_stats_zero_outbound'");
    expect(source).toContain("logCallDebug('audio_stats_error'");
    expect(source).toContain("logCallDebug('ios_audio_device_state'");
    expect(source).not.toContain("logCallDebug('audio_stats_sample'");
    expect(source).not.toContain("logCallDebug('ios_voice_recording_warm_start'");
    expect(source).not.toContain("logCallDebug('ios_voice_recording_warm_success'");
    expect(source).toContain("logCallDebug('video_stats_sample'");
    expect(source).toContain("logCallDebug('video_stats_zero_outbound'");
    expect(source).toContain("logCallDebug('video_stats_error'");
    expect(source).toContain("logCallDebug('room_connect_error'");
    expect(source).toContain("logCallDebug('check_response'");
    expect(source).toContain("logCallDebug('incoming_boot_error'");
  });

  it('actively subscribes to remote audio and video publications as they appear', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).toContain('requestRemoteTrackSubscription');
    expect(source).toContain('requestRemoteParticipantTrackSubscriptions');
    expect(source).toContain('publication.setSubscribed(true)');
    expect(source).toContain('SUBSCRIBABLE_REMOTE_TRACK_KINDS');

    const participantConnectedIndex = source.indexOf(
      'const handleParticipantConnected =',
    );
    const participantDisconnectedIndex = source.indexOf(
      'const handleParticipantDisconnected =',
      participantConnectedIndex,
    );
    const participantConnectedBlock = source.slice(
      participantConnectedIndex,
      participantDisconnectedIndex,
    );

    expect(participantConnectedBlock).toContain(
      'requestRemoteParticipantTrackSubscriptions',
    );

    const trackPublishedIndex = source.indexOf('const handleTrackPublished =');
    const localTrackPublishedIndex = source.indexOf(
      'const handleLocalTrackPublished =',
      trackPublishedIndex,
    );
    const trackPublishedBlock = source.slice(
      trackPublishedIndex,
      localTrackPublishedIndex,
    );

    expect(trackPublishedBlock).toContain('requestRemoteTrackSubscription');
  });

  it('logs LiveKit SDK subscription status, permission, and failure events', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).toContain('RoomEvent.TrackSubscriptionFailed');
    expect(source).toContain('RoomEvent.TrackSubscriptionStatusChanged');
    expect(source).toContain('RoomEvent.TrackSubscriptionPermissionChanged');
    expect(source).toContain('handleTrackSubscriptionFailed');
    expect(source).toContain('handleTrackSubscriptionStatusChanged');
    expect(source).toContain('handleTrackSubscriptionPermissionChanged');
    expect(source).toContain("logCallDebug('track_subscription_sdk_failed'");
    expect(source).toContain("logCallDebug('track_subscription_status_changed'");
    expect(source).toContain("logCallDebug('track_subscription_permission_changed'");
  });

  it('times out unresolved remote subscriptions and retries once', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).toContain('REMOTE_SUBSCRIPTION_TIMEOUT_MS');
    expect(source).toContain('pendingRemoteSubscriptionsRef');
    expect(source).toContain('scheduleRemoteTrackSubscriptionTimeout');
    expect(source).toContain('clearRemoteTrackSubscriptionTimeout');
    expect(source).toContain("logCallDebug('track_subscription_timeout'");
    expect(source).toContain("logCallDebug('track_subscription_retry'");
    expect(source).toContain('publication.setSubscribed(false)');
    expect(source).toContain('publication.setSubscribed(true)');
    expect(source).toContain('subscriptionStatus');
    expect(source).toContain('permissionStatus');
  });

  it('collects peer-connection and track-level audio/video stats as proof of media flow', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).toContain('startCallAudioStatsProbe');
    expect(source).toContain('startCallVideoStatsProbe');
    expect(source).toContain('summarizeAudioStatsReport');
    expect(source).toContain('summarizeVideoStatsReport');
    expect(source).toContain('collectAudioTrackRtcStats');
    expect(source).toContain('getRTCStatsReport');
    expect(source).toContain('pcManager?.publisher.getStats');
    expect(source).toContain('pcManager?.subscriber?.getStats');
    expect(source).toContain('outboundAudio');
    expect(source).toContain('inboundAudio');
    expect(source).toContain('localTrackAudio');
    expect(source).toContain('remoteTrackAudio');
    expect(source).toContain('audioTrafficDiagnosis');
    expect(source).toContain('toCompactAudioStats');
    expect(source).toContain('localPacketsSent');
    expect(source).toContain('localBytesSent');
    expect(source).toContain('remotePacketsReceived');
    expect(source).toContain('diagnosis');
    expect(source).toContain("logCallDebug('audio_stats_zero_track_outbound'");
    expect(source).toContain('outboundVideo');
    expect(source).toContain('inboundVideo');
    expect(source).toContain('totalAudioEnergy');
  });

  it('uses one manual subscription lifecycle for iOS voice and video calls', () => {
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
    expect(source).not.toContain("logCallDebug('managed_track_subscription_timeout'");
    expect(connectBlock).toContain('RoomEvent.ParticipantConnected');
    expect(connectBlock).toContain('RoomEvent.TrackPublished');
    expect(connectBlock).toContain('RoomEvent.TrackSubscribed');
    expect(connectBlock).toContain('RoomEvent.TrackSubscriptionFailed');
    expect(source).toContain('publication.setSubscribed(true)');
    expect(source).toContain('autoSubscribe: false');
    expect(connectBlock.indexOf('.on(RoomEvent.Connected')).toBeLessThan(
      connectBlock.indexOf('await nextRoom.connect'),
    );
  });

  it('keeps iOS direct voice and video calls on the manual Room subscription and render path', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const connectIndex = source.indexOf('const connectPayload = useCallback');
    const connectEndIndex = source.indexOf(
      'const joinAnsweredOutgoingCall = useCallback',
      connectIndex,
    );
    const connectBlock = source.slice(connectIndex, connectEndIndex);
    const providerRenderIndex = source.indexOf(
      'const statusText = resolveStatusText(session)',
    );
    const renderGuardIndex = source.indexOf('return (', providerRenderIndex);
    const renderGuardEndIndex = source.indexOf(
      '</LiveKitCallSessionContext.Provider>',
      renderGuardIndex,
    );
    const renderGuardBlock = source.slice(renderGuardIndex, renderGuardEndIndex);

    expect(source).toContain('function shouldUseIosDirectCallAudioGate');
    expect(connectBlock).toContain('prepareIosDirectCallAudioGate({');
    expect(connectBlock).toContain('const nextRoom = new Room(LIVEKIT_ROOM_OPTIONS)');
    expect(connectBlock).toContain('await nextRoom.connect(nextPayload.wsUrl, nextPayload.token, LIVEKIT_CONNECT_OPTIONS)');
    expect(connectBlock).toContain('requestRemoteParticipantTrackSubscriptions');
    expect(connectBlock).toContain('RoomEvent.TrackSubscribed');
    expect(connectBlock).toContain('publishLocalCallMedia({');
    expect(renderGuardBlock).toContain('activeRoom');
    expect(renderGuardBlock).not.toContain('shouldUseManagedIosDirectRoom');
  });

  it('logs manual Room state and audio stats for iOS voice calls', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).not.toContain('ensureWebRTCAudioBridgeForCallKit');
    expect(source).not.toContain('activateWebRTCAudioSessionForCallKit');
    expect(source).not.toContain('getWebRTCAudioSessionDebugState');
    expect(source).toContain("logCallDebug('ios_callkit_audio_session_ready'");
    expect(source).not.toContain("logCallDebug('ios_callkit_audio_session_start_success'");
    expect(source).not.toContain("logCallDebug('ios_callkit_audio_session_start_error'");
    expect(source).not.toContain("logCallDebug('ios_audio_session_state_after_livekit_start'");
    expect(source).not.toContain("logCallDebug('audio_stats_sample'");
    expect(source).toContain("logCallDebug('audio_stats_compact'");
    expect(source).toContain("logCallDebug('audio_stats_zero_outbound'");
    expect(source).toContain("logCallDebug('zero_outbound_recovery_start'");
    expect(source).toContain("logCallDebug('zero_outbound_recovery_success'");
    expect(source).toContain("logCallDebug('zero_outbound_recovery_error'");
    expect(source).toContain('room.localParticipant.setMicrophoneEnabled(false)');
    expect(source).toContain('room.localParticipant.setMicrophoneEnabled(true)');
    expect(source).not.toContain('ensureIosVoiceRecordingRunning');
    expect(source).toContain("logCallDebug('local_microphone_enable_start'");
    expect(source).toContain("logCallDebug('local_microphone_enabled'");
  });

  it('does not keep custom iOS audio session drift repair helpers', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).not.toContain('function isExpectedIosVoiceAudioSessionState');
    expect(source).not.toContain('repairIosVoiceAudioSessionDrift');
    expect(source).not.toContain('ios_audio_session_config_drift');
  });

  it('does not re-apply iOS audio session after local mic publish', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const localPublishIndex = source.indexOf('const enableMicrophone = async');
    const localPublishEndIndex = source.indexOf(
      'const enableCamera = async',
      localPublishIndex,
    );
    const localPublishBlock = source.slice(localPublishIndex, localPublishEndIndex);

    expect(localPublishIndex).toBeGreaterThan(-1);
    expect(localPublishBlock).not.toContain('repairIosVoiceAudioSessionDrift');
    expect(localPublishBlock).not.toContain('after_local_publish');
    expect(localPublishBlock).not.toContain(
      "logCallDebug('ios_audio_session_state_after_local_publish_reapply'",
    );
  });

  it('publishes the iOS voice microphone through the SDK manual Room path', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    expect(source).not.toContain('MANAGED_IOS_MIC_PUBLISH_GUARD_MS');
    expect(source).not.toContain('managedMicEnableAttemptedRef');
    expect(source).toContain('room.localParticipant.setMicrophoneEnabled(true)');
  });

  it('deduplicates manual subscriptions and reports terminal subscription failure', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const timeoutIndex = source.indexOf(
      'const scheduleRemoteTrackSubscriptionTimeout = useCallback',
    );
    const timeoutEndIndex = source.indexOf(
      'const disconnectActiveRoom = useCallback',
      timeoutIndex,
    );
    const timeoutBlock = source.slice(timeoutIndex, timeoutEndIndex);
    const sdkFailureIndex = source.indexOf(
      'const handleTrackSubscriptionFailed =',
    );
    const sdkFailureEndIndex = source.indexOf(
      'const handleTrackSubscriptionStatusChanged =',
      sdkFailureIndex,
    );
    const sdkFailureBlock = source.slice(
      sdkFailureIndex,
      sdkFailureEndIndex,
    );
    const microphoneClassifierIndex = source.indexOf(
      'function isRemoteMicrophonePublication',
    );
    const microphoneClassifierEndIndex = source.indexOf(
      'function debugValue',
      microphoneClassifierIndex,
    );
    const microphoneClassifierBlock = source.slice(
      microphoneClassifierIndex,
      microphoneClassifierEndIndex,
    );

    expect(source).toContain('pendingRemoteSubscriptionsRef.current.has(trackSid)');
    expect(timeoutBlock).toContain("logCallDebug('track_subscription_terminal_failure'");
    expect(timeoutBlock).not.toContain('finishSession()');
    expect(source).toContain('const REMOTE_AUDIO_SUBSCRIPTION_ERROR =');
    expect(source).toContain("logCallDebug('remote_audio_ready'");
    expect(source).toContain('publication.setSubscribed(true)');
    expect(source).toContain('publication.setSubscribed(false)');
    expect(source).toContain('isRemoteMicrophonePublication');
    expect(source).toContain('mediaErrorText: REMOTE_AUDIO_SUBSCRIPTION_ERROR');
    expect(sdkFailureBlock).not.toContain(
      'clearRemoteTrackSubscriptionTimeout(trackSid)',
    );
    expect(microphoneClassifierBlock).toContain(
      "if (source) return source === String(Track.Source.Microphone)",
    );
    expect(microphoneClassifierBlock).toContain("return kind === 'audio'");
  });

  it('does not let local media success clear a remote subscription error', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const microphoneIndex = source.indexOf('const enableMicrophone = async');
    const cameraIndex = source.indexOf('const enableCamera = async');
    const publishEndIndex = source.indexOf(
      'await Promise.allSettled',
      cameraIndex,
    );
    const microphoneBlock = source.slice(microphoneIndex, cameraIndex);
    const cameraBlock = source.slice(cameraIndex, publishEndIndex);

    expect(microphoneBlock).toContain('preserveRemoteAudioSubscriptionError()');
    expect(cameraBlock).toContain('preserveRemoteAudioSubscriptionError()');
  });

  it('does not install AudioEngine-specific lifecycle handlers for the default WebRTC audio device path', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).not.toContain('audioDeviceModuleEvents');
    expect(source).not.toContain('installIosCallKitAudioDeviceEventLogging');
    expect(source).not.toContain('setEngineCreatedHandler');
    expect(source).not.toContain('setWillEnableEngineHandler');
    expect(source).not.toContain('setWillStartEngineHandler');
    expect(source).not.toContain('setDidStopEngineHandler');
    expect(source).not.toContain('setDidDisableEngineHandler');
    expect(source).not.toContain('setWillReleaseEngineHandler');
    expect(source).not.toContain("logCallDebug('ios_callkit_audio_engine_created'");
    expect(source).not.toContain("logCallDebug('ios_callkit_audio_engine_will_enable'");
    expect(source).not.toContain("logCallDebug('ios_callkit_audio_engine_will_start'");
    expect(source).not.toContain("logCallDebug('ios_callkit_audio_engine_did_stop'");
    expect(source).not.toContain("logCallDebug('ios_callkit_audio_engine_did_disable'");
    expect(source).not.toContain("logCallDebug('ios_callkit_audio_engine_will_release'");
  });

  it('does not log the full LiveKit JWT token', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).toContain('tokenLength');
    expect(source).not.toContain('token: nextPayload.token');
  });
});
