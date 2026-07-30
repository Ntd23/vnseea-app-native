const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Nearby navigation camera control', () => {
  it('stops automatic centering for pan, pinch zoom, and zoom buttons', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain('const isAutoCenteringRef = useRef(true);');
    expect(source).toContain('onPanDrag={handleMapPanDrag}');
    expect(source).toContain('onRegionChangeStart={handleRegionChangeStart}');
    expect(source).toMatch(
      /if \(details\?\.isGesture\) \{\s+disableNavigationAutoCentering\(\);/,
    );
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
