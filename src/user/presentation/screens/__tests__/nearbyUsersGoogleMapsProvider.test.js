const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

describe('iOS Google Maps provider for nearby address search', () => {
  it('renders NearbyUsersScreen with the Google Maps provider on every platform', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain("import MapView, {");
    expect(source).toContain('PROVIDER_GOOGLE');
    expect(source).toContain('provider={PROVIDER_GOOGLE}');
    expect(source).not.toContain(
      "provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}",
    );
  });

  it('links Google Maps SDK for iOS and initializes it from react-native-config', () => {
    const podfile = read('ios/Podfile');
    const appDelegate = read('ios/VNSEEA/AppDelegate.swift');
    const bridgingHeader = read('ios/VNSEEA/VnseeaRn-Bridging-Header.h');

    expect(podfile).toContain(
      "pod 'react-native-maps/Google', :path => '../node_modules/react-native-maps'",
    );
    expect(appDelegate).toContain('import GoogleMaps');
    expect(appDelegate).toContain('GMSServices.provideAPIKey');
    expect(appDelegate).toContain('RNCConfig.env(for: "GOOGLE_MAPS_IOS_API_KEY")');
    expect(appDelegate).toContain('RNCConfig.env(for: "GOOGLE_MAPS_API_KEY")');
    expect(bridgingHeader).toContain('#import "RNCConfig.h"');
  });

  it('documents the required Google Cloud setup for iOS API keys', () => {
    const envExample = read('.env.example');
    const guidePath = 'duong/google-maps-ios-setup.md';
    const guide = exists(guidePath) ? read(guidePath) : '';

    expect(envExample).toContain('GOOGLE_MAPS_IOS_API_KEY=');
    expect(exists(guidePath)).toBe(true);
    expect(guide).toContain('com.vnseea.vnseea');
    expect(guide).toContain('com.vnseea.android');
    expect(guide).toContain('Maps SDK for iOS');
    expect(guide).toContain('GOOGLE_MAPS_IOS_API_KEY');
    expect(guide).toContain('corepack pnpm@10.23.0 install --frozen-lockfile');
    expect(guide).toContain('cd ios && pod install');
  });
});
