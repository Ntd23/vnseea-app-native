const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('LiveKit endpoint ownership', () => {
  it('attaches the persistent installation endpoint to API and Live XHR calls', () => {
    const apiClient = read('src/shared-kernel/infrastructure/api/client.ts');
    const liveRepository = read(
      'src/live/infrastructure/repositories/ApiLiveRepository.ts',
    );

    expect(apiClient).toContain('getClientEndpointIdentity');
    expect(apiClient).toContain("'X-VNSEEA-Endpoint-ID'");
    expect(apiClient).toContain('client_endpoint_id');
    expect(liveRepository).toContain('getClientEndpointIdentity');
    expect(liveRepository).toContain('client_endpoint_id');
  });

  it('treats a same-account live opened without the host session as a viewer', () => {
    const source = read('src/live/application/view-models/useLiveViewModel.ts');
    const repository = read(
      'src/live/infrastructure/repositories/ApiLiveRepository.ts',
    );

    expect(source).toContain('const isHost = liveSession?.isHost === true;');
    expect(source).not.toContain('streamInfo?.publisher.id === userId');
    expect(source).toContain('const session = await repository.joinLive(');
    expect(source).not.toContain('!currentIsHost');
    expect(repository).toContain('const viewerSession: LiveSession = {');
    expect(repository).toContain('const postViewerSession: LiveSession = {');
  });

  it('dismisses a direct or group incoming UI from requester-scoped ownership without endpoint id leaks', () => {
    const incoming = read(
      'src/messages/application/view-models/useIncomingLiveKitCalls.ts',
    );
    const realtime = read(
      'src/messages/infrastructure/realtime/liveKitCallRealtime.ts',
    );

    expect(realtime).not.toContain('answeredEndpointId');
    expect(realtime).not.toContain('activeEndpointId');
    expect(incoming).toContain('onLiveKitCallAnswered');
    expect(incoming).toContain('onLiveKitGroupCallSync');
    expect(incoming).toContain('endpointOwned === false');
    expect(incoming).toContain('checkCall');
    expect(incoming).toContain('syncCall');
    expect(incoming).toContain('dismissNativeIncomingCall');
  });

  it('does not expose endpoint ids through LiveKit participant metadata', () => {
    const sources = [
      'phtml/assets/includes/functions_two.php',
      'phtml/api/v2/endpoints/livekit.php',
      'phtml/api/v2/endpoints/group_call.php',
      'phtml/xhr/livekit_call_payload.php',
      'phtml/xhr/get_group_call_payload.php',
    ].map(read);

    sources.forEach(source => {
      expect(source).not.toContain("'endpoint_id' => $endpoint_id");
    });
  });

  it('waits for the group endpoint claim before opening the call room', () => {
    const incoming = read(
      'src/messages/application/view-models/useIncomingLiveKitCalls.ts',
    );
    const groupSession = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );
    const start = incoming.indexOf(
      'const openIncomingGroupCallRoom = useCallback',
    );
    const end = incoming.indexOf('const acceptIncomingCall = useCallback');
    const openRoomBlock = incoming.slice(start, end);

    expect(groupSession).toContain(
      'answerIncomingGroupCall: (call: IncomingGroupLiveKitCall) => Promise<boolean>',
    );
    expect(groupSession).toContain(
      'return joinedCallIdRef.current === call.callId;',
    );
    expect(openRoomBlock).toContain('answerIncomingGroupCall(call)');
    expect(openRoomBlock).toContain('.then(didAnswer =>');
    expect(openRoomBlock).toContain('if (!didAnswer) return;');
    expect(openRoomBlock.indexOf('if (!didAnswer) return;')).toBeLessThan(
      openRoomBlock.indexOf('navigationRef.navigate'),
    );
  });

  it('waits for the direct endpoint answer claim before opening the call room', () => {
    const directSession = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(directSession).toContain(
      'return answeredIncomingCallIdRef.current === call.callId;',
    );
    expect(directSession).toContain(
      'answeredIncomingCallIdRef.current = call.callId;',
    );
    expect(directSession).toContain('if (didCommitAnswer) {');
    expect(directSession).toContain("status: 'cancelled'");
  });

  it('releases group ownership when media startup fails after joining', () => {
    const groupSession = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );

    expect(groupSession).toContain('if (didJoinCall) {');
    expect(groupSession).toContain('.leaveCall({ callId: call.callId })');
  });
});
