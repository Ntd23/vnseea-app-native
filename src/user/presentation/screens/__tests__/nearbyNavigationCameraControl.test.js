const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Nearby navigation camera control', () => {
  it('queues the first live location until the native map is ready', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain('const isMapReadyRef = useRef(false);');
    expect(source).toContain('const pendingInitialUserCenterRef');
    expect(source).toContain('const applyInitialUserCenter = useCallback');
    expect(source).toContain('if (!isMapReadyRef.current) return;');
    expect(source).toContain('const handleMapReady = useCallback');
    expect(source).toContain('onMapReady={handleMapReady}');
    expect(source).not.toContain(
      'useState(\n    Boolean(persistedCoordinate),\n  );',
    );
  });

 it('clears the place flow and recenters after the detail sheet closes', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');
    const closeHandler = source.slice(
      source.indexOf('const handleCloseSelectedPlace = useCallback'),
      source.indexOf('const disableNavigationAutoCentering'),
    );

    expect(closeHandler).toContain('clearSelectedPoint();');
    expect(closeHandler).toContain('centerOnUser();');
   expect(source).toContain('onClose={handleCloseSelectedPlace}');
 });

  it('forces native route overlays to remount when route state is reset', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain('const [routeRenderRevision');
    expect(source).toContain(
      'setRouteRenderRevision(current => current + 1);',
    );
    expect(source).toContain(
      "key={['route-main', routeRenderRevision].join(':')}",
    );
    expect(source).toContain(
      "key={['route-connector', routeRenderRevision].join(':')}",
    );
  });

 it('stops automatic centering for pan, pinch zoom, and zoom buttons', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain('const isAutoCenteringRef = useRef(true);');
    expect(source).toContain('onPanDrag={handleMapPanDrag}');
    expect(source).toContain('onRegionChangeStart={handleRegionChangeStart}');
    expect(source).toMatch(
      /if \(details\?\.isGesture\) \{[\s\S]*?disableNavigationAutoCentering\(\);/,
    );
    expect(source).toContain('hasUserMovedMapRef.current = true;');
    expect(source).toMatch(
      /const handleZoomIn = useCallback\(\(\) => \{\s+disableNavigationAutoCentering\(\);/,
    );
    expect(source).toMatch(
      /const handleZoomOut = useCallback\(\(\) => \{\s+disableNavigationAutoCentering\(\);/,
    );
  });

  it('preserves a manually moved camera while navigation routes refresh', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');
    const locationHandler = source.slice(
      source.indexOf('const handleUserLocationChange'),
      source.indexOf('const handleShare'),
    );

    expect(source).toContain('if (navigating && moveCamera)');
    expect(source).toContain('isAutoCenteringRef.current;');
    expect(source).toContain('if (navigationPath.length > 1 && moveCamera)');
    expect(locationHandler).not.toContain('setNavigationAutoCentering(true)');
  });
});
