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

  it('initializes OneSignal without showing the notification prompt', () => {
    const source = read(
      'src/shared-kernel/infrastructure/push/oneSignalPush.ts',
    );
    const initializeIndex = source.indexOf(
      'export function initializePushNotifications',
    );
    const initializeBlock = source.slice(
      initializeIndex,
      source.indexOf(
        'export async function getPushNotificationPermissionStatus',
        initializeIndex,
      ),
    );

    expect(initializeBlock).not.toContain('requestPermission(');
    expect(source).toContain(
      'export async function requestPushNotificationPermission',
    );
    expect(source).toContain('canRequestPermission()');
  });

  it('requests push permission only from the explicit settings action', () => {
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
