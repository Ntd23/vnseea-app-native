// Description: Guards the Android MessagingStyle identities used by notification quick replies.
const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Android message notification avatars', () => {
  it('uses separate sender and logged-in user Person objects', () => {
    const source = read(
      'android/app/src/main/java/com/vnseea/android/messages/MessagePushNotification.kt',
    );

    expect(source).toContain(
      'NotificationCompat.MessagingStyle(currentUserPerson)',
    );
    expect(source).toContain('bitmap = currentUserAvatarBitmap');
    expect(source).toContain('bitmap = senderAvatarBitmap');
    expect(source).toContain('builder.setLargeIcon(senderAvatarBitmap)');
  });

  it('syncs and clears the native identity with the auth profile lifecycle', () => {
    const sessionSource = read(
      'src/shared-kernel/infrastructure/storage/sessionStorage.ts',
    );
    const pushSource = read(
      'src/shared-kernel/infrastructure/push/oneSignalPush.ts',
    );

    expect(sessionSource).toContain(
      'syncMessageNotificationIdentity(storedProfile)',
    );
    expect(sessionSource).toContain('clearMessageNotificationIdentity()');
    expect(pushSource).toContain(
      'syncMessageNotificationIdentity(sessionStorage.getUserProfile())',
    );
  });

  it('replaces shared-location URLs with a readable notification preview', () => {
    const source = read(
      'android/app/src/main/java/com/vnseea/android/messages/MessagePushNotification.kt',
    );

    expect(source).toContain(
      'val preview = formatMessagePreview(notification.body.orEmpty(), data)',
    );
    expect(source).toContain('SHARED_LOCATION_PREVIEW');
    expect(source).toContain('normalizedUrl.contains("/map?")');
    expect(source).toContain('normalizedUrl.contains("lat=")');
    expect(source).toContain('normalizedUrl.contains("lng=")');
    expect(source).toContain('.replace("&amp;", "&", ignoreCase = true)');
  });

  it('only adds quick reply actions to real conversation pushes', () => {
    const nativeSource = read(
      'android/app/src/main/java/com/vnseea/android/messages/MessagePushNotification.kt',
    );
    const backendSource = read('phtml/assets/includes/functions_three.php');

    expect(nativeSource).toContain('data.optString("push_kind")');
    expect(nativeSource).toContain('pushKind in MESSAGE_PUSH_KINDS');
    expect(nativeSource).toContain(
      '"user" -> data.optString("user_id").isNotBlank()',
    );
    expect(nativeSource).toContain('else -> false');
    expect(backendSource).toContain(
      "$send_array['notification']['notification_data']['push_kind'] = 'notification';",
    );
    expect(backendSource).toContain("'push_kind' => 'message'");
    expect(backendSource).toContain("'message_id' => (string) $message_id");
  });
});
