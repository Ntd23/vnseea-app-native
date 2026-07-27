const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Nearby map search interaction', () => {
  it('keeps a marker tap from being cleared by the map-level press', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain('lastMapMarkerPressAtRef');
    expect(source).toContain(
      "if (Date.now() - lastMapMarkerPressAtRef.current < 450)",
    );
    expect(source).toContain('setIsSearchResultsVisible(false);');
    expect(source).toContain('onPress={() => handleSelectSearchResult(item)}');
  });

  it('routes every two-character business query through the generic backend contract', () => {
    const repositorySource = read(
      'src/user/infrastructure/repositories/ApiUserRepository.ts',
    );
    const requestSource = read(
      'src/user/infrastructure/repositories/mapBusinessSearchRequest.ts',
    );

    expect(repositorySource).toContain('if (trimmedQuery.length < 2) return [];');
    expect(repositorySource).toContain('buildMapBusinessSearchRequest');
    expect(requestSource).toContain("search_mode: 'business'");
    expect(requestSource).not.toContain('prefer_address');
  });

  it('searches around the visible map while a fresh device is still acquiring GPS', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain(
      'currentLocationRef.current ?? currentRegionRef.current',
    );
    expect(source).toContain('lat: searchOrigin.latitude');
    expect(source).toContain('lng: searchOrigin.longitude');
  });
});
