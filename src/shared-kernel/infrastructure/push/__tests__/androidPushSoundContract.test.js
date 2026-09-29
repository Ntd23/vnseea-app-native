const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Android push sound contract', () => {
  it('plays the system default notification sound on a fresh channel', () => {
    const channels = read(
      'android/app/src/main/java/com/vnseea/android/push/VnseeaNotificationChannels.kt',
    );

    expect(channels).toContain(
      'DEFAULT_PUSH_CHANNEL_ID = "vnseea_notifications_v2"',
    );
    expect(channels).toContain(
      'setSound(Settings.System.DEFAULT_NOTIFICATION_URI, soundAttributes)',
    );
    expect(channels).toContain('"vnseea_notifications_sound_v1"');
    expect(channels).toContain('manager.deleteNotificationChannel(channelId)');
    expect(channels).not.toContain('app_notification_sound');
    expect(
      fs.existsSync(
        path.join(root, 'android/app/src/main/res/raw/app_notification_sound.mp3'),
      ),
    ).toBe(false);
  });

  it('routes OneSignal-displayed pushes to the app channel', () => {
    const extension = read(
      'android/app/src/main/java/com/vnseea/android/call/LiveKitCallNotificationServiceExtension.kt',
    );

    expect(extension).toContain(
      'builder.setChannelId(VnseeaNotificationChannels.DEFAULT_PUSH_CHANNEL_ID)',
    );
  });
});
