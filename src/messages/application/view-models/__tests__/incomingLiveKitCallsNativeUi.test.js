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

  it('answers the native CallKit record before joining an iOS passive group call', () => {
    const incomingSource = read(
      'src/messages/application/view-models/useIncomingLiveKitCalls.ts',
    );
    const nativeSource = read(
      'src/messages/infrastructure/calls/nativeCallService.ts',
    );

    expect(incomingSource).toContain(
      'prepareAndAnswerPassiveIosGroupCall',
    );
    expect(incomingSource).toContain(
      'nativeCallService.displayNativeIncomingGroupCall',
    );
    expect(incomingSource).toContain('answerNativeIncomingCall(callUuid)');
    expect(nativeSource).toContain(
      'export function answerNativeIncomingCall(callUuid: string)',
    );
    expect(nativeSource).toContain(
      'RNCallKeep.default.answerIncomingCall(callUuid);',
    );
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

  it('does not resurrect an Android incoming notification after the call was answered', () => {
    const notifierSource = read(
      'android/app/src/main/java/com/vnseea/android/call/LiveKitCallNotifier.kt',
    );
    const activitySource = read(
      'android/app/src/main/java/com/vnseea/android/call/IncomingCallActivity.kt',
    );
    const actionsSource = read(
      'android/app/src/main/java/com/vnseea/android/call/LiveKitCallNativeActions.kt',
    );
    const incomingSource = read(
      'src/messages/application/view-models/useIncomingLiveKitCalls.ts',
    );

    expect(notifierSource).toContain('skip late notification for handled call_id=');
    expect(notifierSource).toContain('cancel raced notification for handled call_id=');
    expect(notifierSource).toContain('manager.cancel(notificationId)');
    expect(activitySource).toContain('if (finishIfIncomingCallWasHandled()) return');
    expect(activitySource).toContain('finishIfIncomingCallWasHandled()');
    expect(actionsSource).toContain(
      'HANDLED_INCOMING_CALL_TTL_MS = 12 * 60 * 60 * 1000L',
    );
    expect(incomingSource).toContain(
      'dismissAndroidIncomingCall(call.callId);',
    );
  });
});
