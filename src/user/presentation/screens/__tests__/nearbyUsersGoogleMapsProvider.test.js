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

  it('keeps iOS map header overlays below the safe area', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain('useSafeAreaInsets');
    expect(source).toContain('const insets = useSafeAreaInsets();');
    expect(source).toContain('exploreTopControlsStyle');
    expect(source).toContain('routePreviewCardStyle');
    expect(source).toContain('typeaheadOverlayStyle');
    expect(source).toContain('styles.typeaheadOverlay');
    expect(source).toContain('navigationBannerStyle');
    expect(source).toContain('top: insets.top +');
    expect(source).not.toContain("top: Platform.OS === 'android' ? 26 : 10");
    expect(source).not.toContain("top: Platform.OS === 'android' ? 28 : 12");
    expect(source).not.toContain("top: Platform.OS === 'android' ? 90 : 76");
    expect(source).not.toContain("top: Platform.OS === 'android' ? 144 : 128");
    expect(source).not.toContain("top: Platform.OS === 'android' ? 22 : 12");
  });

  it('keeps active navigation heading-up instead of north-up', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain('const nextRouteHeading =');
    expect(source).toContain('const nextCameraHeading = resolveNavigationHeading({');
    expect(source).toContain('heading: nextCameraHeading');
    expect(source).toContain('deviceHeading,');
    expect(source).toContain('userSpeed,');
    expect(source).toContain('const heading = navigationRouteHeading(origin, routePath, destination);');
    expect(source).toContain('heading,');
    expect(source).toContain('style={styles.navigationBannerSubtitle} numberOfLines={2}');
    expect(source).toContain('const selectRouteOption = useCallback');
    expect(source).toContain('const routeMapLabels = useMemo');
    expect(source).toContain('tappable');
    expect(source).toContain('onPress={() => selectRouteOption(route, false)}');
    expect(source).toContain('const shouldShowNavigationPuck = isNavigating && shouldShowRoute;');
    expect(source).toContain('tracksViewChanges={shouldShowHeadingPuck}');
    expect(source).toContain('const ROUTE_CAMERA_LOOKAHEAD_MAX_METERS = 72;');
    expect(source).toContain('const ROUTE_HEADING_LOOKAHEAD_MAX_METERS = 28;');
    expect(source).toContain('const ROUTE_CAMERA_LOOKAHEAD_DISTANCE_RATIO = 0.16;');
    expect(source).toContain('const NAVIGATION_LOCATION_STATE_MIN_METERS = 1;');
    expect(source).toContain('const NAVIGATION_LOCATION_STATE_MIN_MS = 280;');
    expect(source).toContain('const HEADING_STATE_MIN_DEGREES = 2;');
    expect(source).toContain('const HEADING_STATE_MIN_MS = 80;');
    expect(source).toContain('const navigationRoadName = useMemo');
    expect(source).toContain('currentNavigationRoadName({');
    expect(source).toContain('styles.currentUserRoadLabelPill');
    expect(source).toContain('preferRouteHeading: false,');
    expect(source).toContain('preferRouteHeading: true,');
    expect(source).toContain('const OFF_ROUTE_DISTANCE_METERS = 24;');
    expect(source).toContain('const OFF_ROUTE_CONFIRM_MS = 0;');
    expect(source).toContain('const REROUTE_COOLDOWN_MS = 1500;');
    expect(source).toContain('const NAVIGATION_ARRIVAL_DISTANCE_METERS = 24;');
    expect(source).toContain('const [isAutoRerouting, setIsAutoRerouting] = useState(false);');
    expect(source).toContain('const hasArrivedAtDestination = Boolean(');
    expect(source).toContain('setIsAutoCentering(true);');
    expect(source).toContain('styles.navigationFinishButton');
    expect(source).toContain('const routePreviewAlternativeSlots = useMemo');
    expect(source).toContain('key={`alt-route-slot:${index}`}');
    expect(source).toContain('coordinates={route ? route.path : []}');
    expect(source).toContain('const routePoint: SelectedPoint | null = coordinate');
    expect(source).toContain('selectPoint(routePoint, true);');
    expect(source).toContain('clearSelectedPoint();');
    expect(source).toContain('Kết thúc');
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
