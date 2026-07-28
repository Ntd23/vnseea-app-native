const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('progressive runtime permission policy', () => {
  it('does not request call or media permissions while the app boots', () => {
    const app = read('App.tsx');

    expect(app).toContain('initializePushNotifications();');
    expect(app).not.toContain('requestCallStartupPermissions');
    expect(app).not.toContain('PermissionsAndroid.request');
  });

  it('requests notification permission once on the first app launch', () => {
    const app = read('App.tsx');
    const source = read(
      'src/shared-kernel/infrastructure/push/oneSignalPush.ts',
    );
    expect(app).toContain('requestPushNotificationPermissionOnFirstLaunch');
    expect(app).toContain(
      'requestPushNotificationPermissionOnFirstLaunch().catch',
    );
    expect(source).toContain(
      'export async function requestPushNotificationPermissionOnFirstLaunch',
    );
    expect(source).toContain('pushPermissionPromptStorage.wasRequested()');
    expect(source).toContain('pushPermissionPromptStorage.markRequested()');
    expect(
      fs.existsSync(
        path.join(
          root,
          'src/shared-kernel/infrastructure/push/pushPermissionPromptStorage.ts',
        ),
      ),
    ).toBe(true);
    const promptStorage = read(
      'src/shared-kernel/infrastructure/push/pushPermissionPromptStorage.ts',
    );
    expect(promptStorage).toContain('react-native-mmkv');
    expect(promptStorage).toContain('notification.permission.prompted');
  });

  it('keeps the settings action available for notification permission recovery', () => {
    const settings = read(
      'src/settings/presentation/screens/SettingsScreen.tsx',
    );

    expect(settings).toContain('DeviceNotificationPermissionCard');
    expect(settings).toContain('requestPushNotificationPermission()');
    expect(settings).toContain('onPress={() => {');
  });

  it('keeps sensitive feature permissions close to the feature action', () => {
    const mediaPermission = read(
      'src/shared-kernel/application/utils/microphonePermission.ts',
    );
    const location = read(
      'src/shared-kernel/application/utils/currentLocation.ts',
    );
    const reel = read('src/reels/presentation/screens/CreateReelScreen.tsx');
    const wallet = read('src/wallet/presentation/screens/MyBalanceScreen.tsx');

    expect(mediaPermission).toContain('requestCallMediaPermissions');
    expect(location).toContain('PermissionsAndroid.requestMultiple');
    expect(reel).toContain(
      'const hasPermission = await requestCameraPermissions',
    );
    expect(wallet).toContain('PermissionsAndroid.PERMISSIONS.CAMERA');
  });
});
