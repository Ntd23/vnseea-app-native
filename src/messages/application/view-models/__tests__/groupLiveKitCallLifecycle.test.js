const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('LiveKit group call video-only lifecycle', () => {
  it('warns only a new-call host when delivery fails and clears after a remote joins', () => {
    const source = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );
    const screen = read(
      'src/messages/presentation/screens/GroupCallRoomScreen.tsx',
    );

    expect(source).toContain(
      "!created.isExisting && created.delivery.state === 'failed'",
    );
    expect(source).toContain('deliveryWarningText');
    expect(source).toContain('hasRemoteParticipant');
    expect(screen).toContain('session?.deliveryWarningText');
    expect(source).not.toContain('retryCallDelivery');
  });

  it('exposes a video-only group call contract', () => {
    const types = read('src/messages/domain/types/groupCall.types.ts');
    const repository = read(
      'src/messages/domain/repositories/GroupLiveKitCallRepository.ts',
    );
    const chatScreen = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(types).toContain("export type GroupLiveKitCallType = 'video'");
    expect(types).not.toContain('callType: LiveKitCallType');
    expect(repository).not.toContain('callType: LiveKitCallType');
    expect(chatScreen).toContain('startGroupCall(callParams)');
    expect(chatScreen).toContain("groupId,\n          direction: 'outgoing' as const");
    expect(chatScreen).not.toContain('groupId,\n          callType,');
  });

  it('uses the shared CallKit audio gate before connecting group rooms', () => {
    const source = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );
    const nativeSource = read(
      'src/messages/infrastructure/calls/nativeCallService.ts',
    );
    const gateIndex = source.indexOf('await prepareIosCallAudioGate(');
    const roomIndex = source.indexOf('const nextRoom = new Room(');
    const connectIndex = source.indexOf('await nextRoom.connect(');

    expect(source).toContain('prepareIosCallAudioGate');
    expect(source).toContain("owner: 'group-call'");
    expect(source).toContain('startNativeOutgoingGroupCall');
    expect(nativeSource).toContain('export async function startNativeOutgoingGroupCall');
    expect(gateIndex).toBeGreaterThan(-1);
    expect(roomIndex).toBeGreaterThan(gateIndex);
    expect(connectIndex).toBeGreaterThan(roomIndex);
    expect(source).toContain('singlePeerConnection: false');
    expect(source).toContain('autoSubscribe: true');
  });

  it('uses the shared subscription coordinator for microphone and camera', () => {
    const source = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );
    const coordinator = read(
      'src/messages/application/livekit/remoteTrackSubscriptionCoordinator.ts',
    );

    expect(source).toContain('createRemoteTrackSubscriptionCoordinator');
    expect(source).toContain(
      'autoSubscribe: LIVEKIT_CONNECT_OPTIONS.autoSubscribe',
    );
    expect(source).toContain('Track.Source.Microphone');
    expect(source).toContain('Track.Source.Camera');
    expect(coordinator).toContain('autoSubscribe: boolean');
    expect(coordinator).toContain('group_track_auto_subscribe_waiting');
    expect(coordinator).toContain(
      'group_track_subscription_recovery_requested',
    );
    expect(coordinator).toContain('group_track_subscription_requested');
    expect(coordinator).toContain('group_track_subscription_retry');
    expect(coordinator).toContain('group_track_subscription_terminal_failure');
    expect(source).not.toContain('AudioDeviceModule');
  });

  it('shares the same processed audio routing controls as direct calls', () => {
    const source = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );
    const screen = read(
      'src/messages/presentation/screens/GroupCallRoomScreen.tsx',
    );

    expect(source).toContain('CALL_AUDIO_CAPTURE_DEFAULTS');
    expect(source).toContain('configureCallAudioSession');
    expect(source).toContain('applyCallAudioOutputMode');
    expect(source).toContain('setRemoteAudioTrackOutputMode');
    expect(source).toContain('setAudioOutputMode');
    expect(screen).toContain('CallAudioOutputSelector');
    expect(screen).toContain('session?.audioOutputMode');
  });

  it('exposes the room to React only after initial local media setup', () => {
    const source = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );
    const connectIndex = source.indexOf('await nextRoom.connect(');
    const microphoneIndex = source.indexOf(
      'await nextRoom.localParticipant.setMicrophoneEnabled(true)',
      connectIndex,
    );
    const cameraIndex = source.indexOf(
      '.setCameraEnabled(true',
      microphoneIndex,
    );
    const exposeRoomIndex = source.indexOf(
      'setActiveRoom(nextRoom)',
      connectIndex,
    );

    expect(connectIndex).toBeGreaterThan(-1);
    expect(microphoneIndex).toBeGreaterThan(connectIndex);
    expect(cameraIndex).toBeGreaterThan(microphoneIndex);
    expect(exposeRoomIndex).toBeGreaterThan(cameraIndex);
  });

  it('keeps LiveKit as participant membership authority during server sync', () => {
    const source = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );
    const incomingSource = read(
      'src/messages/application/view-models/useIncomingLiveKitCalls.ts',
    );

    expect(source).toContain('reconcileLiveKitParticipants');
    expect(source).toContain('mergeGroupParticipantMetadata');
    expect(source).not.toContain('replaceServerParticipants');
    expect(source).toContain("finishSession('realtime_closed'");
    expect(source).toContain("finishSession('sync_inactive'");
    expect(source).toContain("'connect_failure'");
    expect(source).toContain("'provider_unmount'");
    expect(incomingSource).toContain("leaveCall('native_end')");
  });

  it('renders the gallery with official VideoTrack and facing-aware mirroring', () => {
    const screen = read(
      'src/messages/presentation/screens/GroupCallRoomScreen.tsx',
    );
    const types = read('src/messages/domain/types/groupCall.types.ts');

    expect(screen).toContain('VideoTrack');
    expect(screen).toContain('useTracks');
    expect(screen).toContain('RoomContext.Provider');
    expect(screen).not.toContain('RTCView');
    expect(screen).not.toContain('streamURL=');
    expect(screen).toContain("localCameraFacingMode === 'user'");
    expect(screen).toContain('localCameraTracks');
    expect(screen).toContain('remoteCameraPublications');
    expect(screen).toContain('remoteSubscribedCameraTracks');
    expect(screen).toContain('remoteRenderableCameraTracks');
    expect(screen).toContain('getRenderableGroupCameraTrack');
    expect(screen).toContain('getGroupCameraTrackRenderKey');
    expect(screen).toContain('cameraRenderStateKey');
    expect(types).not.toContain('videoStreamUrl?: string');
    expect(types).not.toContain('videoRenderKey?: number');
  });

  it('removes disconnected participants and reports the actual camera state', () => {
    const source = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );
    const patchIndex = source.indexOf('const patchParticipants = useCallback');
    const patchEnd = source.indexOf(
      'const mergeServerParticipantMetadata = useCallback',
      patchIndex,
    );
    const patchBlock = source.slice(patchIndex, patchEnd);

    expect(patchBlock).toContain('reconcileLiveKitParticipants');
    expect(patchBlock).toContain('participants: reconciledParticipants');
    expect(patchBlock).not.toContain('mergeParticipants(');
    expect(source).toContain('let cameraEnabled = false');
    expect(source).toContain('isLocalCameraEnabled: cameraEnabled');
  });

  it('logs compact local and per-participant remote media stats', () => {
    const source = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );

    expect(source).toContain("'group_audio_stats_compact'");
    expect(source).toContain("'group_video_stats_compact'");
    expect(source).toContain("direction: 'local_outbound'");
    expect(source).toContain("'remote_inbound'");
    expect(source).toContain('participantIdentity');
  });

  it('does not manually stop the iOS CallKit-owned audio session', () => {
    const source = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );
    const finishIndex = source.indexOf('const finishSession = useCallback');
    const finishEnd = source.indexOf('const connectPayload = useCallback', finishIndex);
    const finishBlock = source.slice(finishIndex, finishEnd);

    expect(finishBlock).toContain('isIosNativeCall');
    expect(finishBlock.indexOf('endNativeCall')).toBeLessThan(
      finishBlock.indexOf('disconnectActiveRoom'),
    );
    expect(finishBlock).toContain('const stopAudioSession = !isIosNativeCall');
    expect(finishBlock).toContain('if (stopAudioSession)');
  });

  it('cleans up native and server state when group media startup fails', () => {
    const source = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );
    const cleanupIndex = source.indexOf(
      'const cleanupFailedGroupCallStart = useCallback',
    );
    const cleanupEnd = source.indexOf(
      'const connectPayload = useCallback',
      cleanupIndex,
    );
    const cleanupBlock = source.slice(cleanupIndex, cleanupEnd);

    expect(cleanupBlock).toContain('endNativeCall(current.nativeCallUuid)');
    expect(cleanupBlock).toContain('disconnectActiveRoom()');
    expect(cleanupBlock).toContain('releaseIosCallAudio(');
    expect(cleanupBlock).toContain('repository.leaveCall({ callId: joinedCallId })');
    expect(cleanupBlock).toContain("if (!isIosCall)");
    expect(cleanupBlock).toContain('AudioSession.stopAudioSession()');
  });
});
