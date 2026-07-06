const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('1-1 video call local preview mirroring', () => {
  it('keeps remote video unmirrored while local preview mirrors only front camera', () => {
    const source = read('src/messages/presentation/screens/CallRoomScreen.tsx');
    const remoteBlock = source.slice(
      source.indexOf('{remoteVideoStreamUrl ? ('),
      source.indexOf('      ) : (', source.indexOf('{remoteVideoStreamUrl ? (')),
    );
    const localBlock = source.slice(
      source.indexOf('{localVideoStreamUrl && session?.isLocalCameraEnabled ? ('),
      source.indexOf('      ) : (', source.indexOf('{localVideoStreamUrl && session?.isLocalCameraEnabled ? (')),
    );

    expect(remoteBlock).toContain('streamURL={remoteVideoStreamUrl}');
    expect(remoteBlock).not.toContain('mirror');
    expect(localBlock).toContain('streamURL={localVideoStreamUrl}');
    expect(localBlock).toContain("mirror={session?.localCameraFacingMode === 'user'}");
    expect(localBlock).not.toContain('\n            mirror\n');
  });

  it('tracks local camera facing mode through the 1-1 call session', () => {
    const source = read('src/messages/application/view-models/useLiveKitCallSession.tsx');
    const switchIndex = source.indexOf('switchCamera: async () => {');
    const switchBlock = source.slice(switchIndex, source.indexOf('      },', switchIndex));

    expect(source).toContain("localCameraFacingMode: 'user' | 'environment';");
    expect(source).toContain("localCameraFacingMode: 'user',");
    expect(source).toContain('localCameraFacingMode: cameraFacingModeRef.current,');
    expect(switchBlock).toContain('await localParticipant.setCameraEnabled(true, {');
    expect(switchBlock).toContain('facingMode: cameraFacingModeRef.current,');
    expect(switchBlock).toContain('localCameraFacingMode: nextFacingMode,');
  });
});
