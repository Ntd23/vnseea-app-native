const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Android current-location integration policy', () => {
  it('asks for map location access on focus before opening system prompts', () => {
    const screen = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(screen).toContain('checkAndroidLocationPermission');
    expect(screen).toContain('useFocusEffect(');
    expect(screen).toContain("'Bật vị trí để dùng bản đồ'");
    expect(screen).toContain("text: 'Hủy'");
    expect(screen).toContain("text: 'Đồng ý'");
    expect(screen).toContain(
      "'Bạn cần cấp quyền vị trí để sử dụng bản đồ chính xác. Nếu không, một số chức năng có thể hoạt động không như ý muốn.'",
    );
  });

  it('requests permission before Android in-place location-services consent', () => {
    const screen = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(screen).toContain('requestAndroidLocationPermission');
    expect(screen).toContain('requestAndroidLocationServices');
    expect(screen.indexOf('requestAndroidLocationPermission()')).toBeLessThan(
      screen.indexOf('requestAndroidLocationServices()'),
    );
    expect(screen).not.toContain('PermissionsAndroid.request(');
  });

  it('uses the Android system resolution dialog instead of navigating to Settings', () => {
    const nativeModule = read(
      'android/app/src/main/java/com/vnseea/android/location/CurrentLocationModule.kt',
    );
    const gradle = read('android/app/build.gradle');

    expect(gradle).toContain(
      'implementation("com.google.android.gms:play-services-location:21.3.0")',
    );
    expect(nativeModule).toContain(
      'fun requestLocationServices(promise: Promise)',
    );
    expect(nativeModule).toContain('LocationServices.getSettingsClient');
    expect(nativeModule).toContain('checkLocationSettings');
    expect(nativeModule).toContain('ResolvableApiException');
    expect(nativeModule).toContain('startResolutionForResult');
    expect(nativeModule).toContain('ActivityEventListener');
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
