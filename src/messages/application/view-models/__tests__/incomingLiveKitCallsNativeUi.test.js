const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('incoming LiveKit calls native UI routing', () => {
  it('does not open the custom direct incoming modal for iOS foreground signals', () => {
    const source = read(
      'src/messages/application/view-models/useIncomingLiveKitCalls.ts',
    );

    expect(source).toContain(
      "loadNativeCallService()?.displayNativeIncomingCall?.(call);",
    );
    expect(source).not.toContain('setActiveIncomingCall(call);');
  });

  it('uses CallKit for iOS fullscreen group signals while keeping passive groups custom', () => {
    const source = read(
      'src/messages/application/view-models/useIncomingLiveKitCalls.ts',
    );

    expect(source).toContain("call.ringMode !== 'passive'");
    expect(source).toContain(
      "loadNativeCallService()?.displayNativeIncomingGroupCall?.(call);",
    );
    expect(source).toContain('setActiveIncomingGroupCall(call);');
  });
});
