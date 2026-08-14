const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('incoming call push delivery safeguards', () => {
  it('forwards call request metadata into the actual OneSignal request', () => {
    const canonicalCall = read('phtml/assets/includes/vnseea_livekit_call.php');
    const delivery = read('phtml/assets/includes/vnseea_push_delivery.php');

    expect(canonicalCall).toContain("'ttl' => 45");
    expect(canonicalCall).toContain("'collapse_id' => 'livekit_call_' . $call_type . '_' . $call_id");
    expect(canonicalCall).toContain("$notification['request_data']");
    expect(delivery).toContain("$request['ttl'] = max(1, (int)$request_data['ttl']);");
    expect(delivery).toContain("$request['collapse_id'] = substr((string)$request_data['collapse_id'], 0, 64);");
    expect(delivery).toContain("$request['priority'] = (int)$request_data['priority'] === 5 ? 5 : 10;");
  });

  it('derives bounded delivery metadata for direct and group calls', () => {
    const delivery = read('phtml/assets/includes/vnseea_push_delivery.php');

    expect(delivery).toContain("in_array($ring_mode, array('passive', 'silent'), true) ? 5 : 10");
    expect(delivery).toContain("'livekit_group_call_' . $call_id");
    expect(delivery).toContain("'livekit_call_' . $call_type . '_' . $call_id");
    expect(delivery).toContain("min((int)$request_data['ttl'], $expires_at - time())");
  });

  it('suppresses expired calls and makes passive group calls silent', () => {
    const extension = read(
      'android/app/src/main/java/com/vnseea/android/call/LiveKitCallNotificationServiceExtension.kt',
    );

    expect(extension).toContain('isExpiredIncomingCall(data)');
    expect(extension).toContain('expiresAtMillis <= System.currentTimeMillis()');
    expect(extension).toContain('ringMode == "silent" || ringMode == "passive"');
    expect(extension).toContain('NotificationManager.IMPORTANCE_LOW');
    expect(extension).toContain('enableVibration(false)');
    expect(extension).toContain('setSound(null, null)');
    expect(extension).toContain('.setSilent(true)');
    expect(extension).not.toContain('ignored: silent group call');
  });

  it('drops chat-style call activity before Android builds a quick-reply notification', () => {
    const extension = read(
      'android/app/src/main/java/com/vnseea/android/call/LiveKitCallNotificationServiceExtension.kt',
    );
    const messageNotification = read(
      'android/app/src/main/java/com/vnseea/android/messages/MessagePushNotification.kt',
    );

    const duplicateGuard = extension.indexOf(
      'MessagePushNotification.isDuplicateCallActivityPush(',
    );
    const genericMessageBranch = extension.indexOf(
      'MessagePushNotification.isMessagePush(data)',
    );

    expect(duplicateGuard).toBeGreaterThan(-1);
    expect(duplicateGuard).toBeLessThan(genericMessageBranch);
    expect(messageNotification).toContain(
      'fun isDuplicateCallActivityPush(',
    );
    expect(messageNotification).toContain('if (!isMessagePush(data)) return false');
    expect(messageNotification).toContain('messageType != "call_event"');
    expect(messageNotification).toContain('conversationType != "user"');
    expect(messageNotification).toContain('status == "missed"');
    expect(messageNotification).toContain('status == "no_answer"');
  });
});
