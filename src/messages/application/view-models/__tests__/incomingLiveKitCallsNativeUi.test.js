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

  it('clears stale custom incoming UI state when a native CallKit answer is consumed', () => {
    const source = read(
      'src/messages/application/view-models/useIncomingLiveKitCalls.ts',
    );

    expect(source).toContain('clearNativeAnsweredIncomingState');
    expect(source).toContain('clearNativeAnsweredIncomingState();');
  });

  it('does not dismiss the iOS CallKit call before answer/join completes', () => {
    const source = read(
      'src/messages/application/view-models/useIncomingLiveKitCalls.ts',
    );
    const start = source.indexOf('const openIncomingCallRoom = useCallback');
    const end = source.indexOf('const openIncomingGroupCallRoom = useCallback');
    const block = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(block).toContain('answerIncomingCall(call)');
    expect(source).toContain('const dismissAndroidIncomingCall = useCallback');
    expect(source).toContain("Platform.OS !== 'android'");
    expect(block).toContain('dismissAndroidIncomingCall(call.callId)');
    expect(block).not.toContain('dismissNativeIncomingCall(call.callId);');
  });
});
