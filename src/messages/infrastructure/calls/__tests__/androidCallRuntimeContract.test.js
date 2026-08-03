const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Android call runtime contract', () => {
  it('uses permission-aware full-screen notifications without launching an activity from the background', () => {
    const notifier = read(
      'android/app/src/main/java/com/vnseea/android/call/LiveKitCallNotifier.kt',
    );
    const intentModule = read(
      'android/app/src/main/java/com/vnseea/android/call/VnseeaCallIntentModule.kt',
    );
    const showMethod = intentModule.slice(
      intentModule.indexOf('fun showIncomingCall'),
      intentModule.indexOf('fun canUseFullScreenIntent'),
    );

    expect(notifier).toContain('manager.canUseFullScreenIntent()');
    expect(notifier).toContain(
      'notificationBuilder.setFullScreenIntent(fullScreenPendingIntent, true)',
    );
    expect(notifier).toContain('using heads-up notification');
    expect(notifier).not.toContain('context.startActivity(intent)');
    expect(notifier).not.toContain('maybeLaunchFullScreen');
    expect(showMethod).toContain('LiveKitCallNotifier.show(appContext, notificationData)');
    expect(showMethod).not.toContain('appContext.startActivity(intent)');
  });

  it('declares the active call foreground service and wires it to connected calls', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    const nativeService = read(
      'src/messages/infrastructure/calls/nativeCallService.ts',
    );
    const foregroundService = read(
      'android/app/src/main/java/com/vnseea/android/call/LiveKitCallForegroundService.kt',
    );

    expect(manifest).toContain('android:name=".call.LiveKitCallForegroundService"');
    expect(manifest).toContain(
      'android:foregroundServiceType="microphone|camera"',
    );
    expect(nativeService).toContain('startCallForegroundService');
    expect(nativeService).toContain('stopCallForegroundService');
    expect(nativeService).toContain('connectedAndroidCallUuids');
    expect(foregroundService).toContain(
      'ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE',
    );
    expect(foregroundService).toContain(
      'ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA',
    );
  });

  it('keeps CallKeep on iOS but excludes its Android telecom integration and permissions', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    const config = read('react-native.config.js');
    const nativeService = read(
      'src/messages/infrastructure/calls/nativeCallService.ts',
    );

    expect(config).toContain("'react-native-callkeep'");
    expect(config).toContain('android: null');
    expect(config).not.toContain('ios: null');
    expect(manifest).not.toContain('io.wazo.callkeep.VoiceConnectionService');
    for (const permission of [
      'android.permission.CALL_PHONE',
      'android.permission.READ_PHONE_STATE',
      'android.permission.READ_PHONE_NUMBERS',
      'android.permission.MANAGE_OWN_CALLS',
    ]) {
      expect(manifest).toContain(
        `android:name="${permission}" tools:node="remove"`,
      );
    }
    expect(nativeService).toContain("if (Platform.OS === 'android') return null");
    expect(nativeService).not.toContain('selfManaged: true');
  });

  it('declares package visibility for tel URLs used by Linking.canOpenURL', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    const queries = manifest.slice(
      manifest.indexOf('<queries>'),
      manifest.indexOf('</queries>') + '</queries>'.length,
    );

    expect(queries).toContain('android.intent.action.VIEW');
    expect(queries).toContain('android:scheme="tel"');
  });
});
