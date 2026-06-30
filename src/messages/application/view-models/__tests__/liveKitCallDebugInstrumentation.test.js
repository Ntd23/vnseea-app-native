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

  it('logs managed iOS LiveKitRoom mic and remote track events without owning media startup', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const bridgeIndex = source.indexOf(
      'function ManagedIosDirectLiveKitRoomBridge',
    );
    const activeRoomIndex = source.indexOf(
      'const ActiveLiveKitRoom',
      bridgeIndex,
    );
    const bridgeBlock = source.slice(bridgeIndex, activeRoomIndex);

    expect(bridgeIndex).toBeGreaterThan(-1);
    expect(bridgeBlock).toContain('useRoomContext()');
    expect(bridgeBlock).toContain('useConnectionState()');
    expect(bridgeBlock).toContain('useLocalParticipant()');
    expect(bridgeBlock).toContain("logCallDebug('managed_local_mic_state'");
    expect(bridgeBlock).toContain("logCallDebug('managed_local_track_published'");
    expect(bridgeBlock).toContain("logCallDebug('managed_local_track_unpublished'");
    expect(bridgeBlock).toContain("logCallDebug('managed_local_track_muted'");
    expect(bridgeBlock).toContain("logCallDebug('managed_local_track_unmuted'");
    expect(bridgeBlock).toContain("logCallDebug('managed_remote_track_published'");
    expect(bridgeBlock).toContain("logCallDebug('managed_remote_track_subscribed'");
    expect(bridgeBlock).not.toContain("logCallDebug('managed_local_microphone_enable_start'");
    expect(bridgeBlock).not.toContain("logCallDebug('managed_local_microphone_enable_success'");
    expect(bridgeBlock).not.toContain("logCallDebug('managed_local_microphone_enable_error'");
    expect(bridgeBlock).not.toContain('.setMicrophoneEnabled(true)');
    expect(bridgeBlock).toContain('RoomEvent.LocalTrackPublished');
    expect(bridgeBlock).toContain('RoomEvent.LocalTrackUnpublished');
    expect(bridgeBlock).toContain('RoomEvent.TrackMuted');
    expect(bridgeBlock).toContain('RoomEvent.TrackUnmuted');
    expect(bridgeBlock).toContain('RoomEvent.TrackPublished');
    expect(bridgeBlock).toContain('RoomEvent.TrackSubscribed');
    expect(bridgeBlock).not.toContain('RoomEvent.TrackSubscriptionFailed');
    expect(bridgeBlock).not.toContain('publication.setSubscribed');
  });

  it('does not pass custom room/connect options to managed iOS direct voice LiveKitRoom', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const managedIndex = source.indexOf('const ManagedIosDirectLiveKitRoom');
    const bridgeIndex = source.indexOf(
      'function ManagedIosDirectLiveKitRoomBridge',
      managedIndex,
    );
    const managedBlock = source.slice(managedIndex, bridgeIndex);

    expect(managedIndex).toBeGreaterThan(-1);
    expect(managedBlock).toContain('<LiveKitRoom');
    expect(managedBlock).toContain('audio={true}');
    expect(managedBlock).toContain('video={false}');
    expect(managedBlock).not.toContain("logCallDebug('managed_ios_direct_room_options'");
    expect(managedBlock).not.toContain('options={LIVEKIT_ROOM_OPTIONS}');
    expect(managedBlock).not.toContain('connectOptions={LIVEKIT_CONNECT_OPTIONS}');
  });

  it('logs managed LiveKitRoom state and audio stats for iOS voice calls', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const managedBridgeIndex = source.indexOf(
      'function ManagedIosDirectLiveKitRoomBridge',
    );
    const managedBridgeEndIndex = source.indexOf(
      'const ActiveLiveKitRoom',
      managedBridgeIndex,
    );
    const managedBridgeBlock = source.slice(
      managedBridgeIndex,
      managedBridgeEndIndex,
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
    expect(managedBridgeBlock).toContain(
      "logCallDebug('managed_local_mic_state'",
    );
    expect(managedBridgeBlock).toContain('isMicrophoneEnabled');
    expect(managedBridgeBlock).not.toContain('managed_ios_local_microphone');
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
    const managedBridgeIndex = source.indexOf(
      'function ManagedIosDirectLiveKitRoomBridge',
    );
    const managedBridgeEndIndex = source.indexOf(
      'const ActiveLiveKitRoom',
      managedBridgeIndex,
    );
    const managedBridgeBlock = source.slice(
      managedBridgeIndex,
      managedBridgeEndIndex,
    );
    const localPublishIndex = managedBridgeBlock.indexOf(
      'const handleLocalTrackPublished',
    );
    const localUnpublishIndex = managedBridgeBlock.indexOf(
      'const handleLocalTrackUnpublished',
      localPublishIndex,
    );
    const localPublishBlock = managedBridgeBlock.slice(
      localPublishIndex,
      localUnpublishIndex,
    );

    expect(localPublishIndex).toBeGreaterThan(-1);
    expect(localPublishBlock).not.toContain('repairIosVoiceAudioSessionDrift');
    expect(localPublishBlock).not.toContain('after_local_publish');
    expect(localPublishBlock).not.toContain(
      "logCallDebug('ios_audio_session_state_after_local_publish_reapply'",
    );
  });

  it('lets LiveKitRoom enable managed iOS voice microphone from the audio prop', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const bridgeIndex = source.indexOf(
      'function ManagedIosDirectLiveKitRoomBridge',
    );
    const activeRoomIndex = source.indexOf(
      'const ActiveLiveKitRoom',
      bridgeIndex,
    );
    const bridgeBlock = source.slice(bridgeIndex, activeRoomIndex);

    expect(bridgeBlock).not.toContain('MANAGED_IOS_MIC_PUBLISH_GUARD_MS');
    expect(bridgeBlock).not.toContain('managed_ios_local_microphone_guard_start');
    expect(bridgeBlock).not.toContain('managed_ios_local_microphone_force_start');
    expect(bridgeBlock).not.toContain('managedMicEnableAttemptedRef');
    expect(bridgeBlock).not.toContain('.setMicrophoneEnabled(true)');
    expect(bridgeBlock).not.toContain("logCallDebug('managed_local_microphone_enable_start'");
    expect(bridgeBlock).not.toContain("logCallDebug('managed_local_microphone_enable_success'");
    expect(bridgeBlock).not.toContain("logCallDebug('managed_local_microphone_enable_error'");
  });

  it('does not force managed iOS remote microphone subscription or retry', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const bridgeIndex = source.indexOf(
      'function ManagedIosDirectLiveKitRoomBridge',
    );
    const activeRoomIndex = source.indexOf(
      'const ActiveLiveKitRoom',
      bridgeIndex,
    );
    const bridgeBlock = source.slice(bridgeIndex, activeRoomIndex);

    expect(bridgeBlock).not.toContain('MANAGED_IOS_REMOTE_SUBSCRIPTION_TIMEOUT_MS');
    expect(bridgeBlock).not.toContain('managed_remote_subscription_requested');
    expect(bridgeBlock).not.toContain('managed_remote_subscription_timeout');
    expect(bridgeBlock).not.toContain('managed_remote_subscription_retry');
    expect(bridgeBlock).not.toContain('managed_remote_publication_missing');
    expect(bridgeBlock).not.toContain('publication.setSubscribed(true)');
    expect(bridgeBlock).not.toContain('publication.setSubscribed(false)');
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
