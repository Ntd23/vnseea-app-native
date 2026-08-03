const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Android current-location integration policy', () => {
  it('uses the shared fine-and-coarse permission flow on the nearby map', () => {
    const screen = read(
      'src/user/presentation/screens/NearbyUsersScreen.tsx',
    );

    expect(screen).toContain('requestAndroidLocationPermission');
    expect(screen).toContain(
      'requestAndroidLocationPermission()\n      .then(setLocationAllowed)',
    );
    expect(screen).not.toContain('PermissionsAndroid.request(');
  });

  it('does not include the GPS provider when only coarse access is available', () => {
    const nativeModule = read(
      'android/app/src/main/java/com/vnseea/android/location/CurrentLocationModule.kt',
    );

    expect(nativeModule).toContain(
      'enabledProviders(locationManager, hasFineLocation)',
    );
    expect(nativeModule).toContain(
      'if (hasFineLocation) add(LocationManager.GPS_PROVIDER)',
    );
    expect(nativeModule).toContain('add(LocationManager.NETWORK_PROVIDER)');
  });
});
