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

  it('allows generic business queries such as “tiệm” to use Google place results', () => {
    const source = read('src/user/infrastructure/repositories/ApiUserRepository.ts');

    expect(source).toContain('input.query.trim().length >= 2');
    expect(source).toContain('if (hasCategory)');
    expect(source).toContain('tiem|shop|salon|barber|cafe|quan');
    expect(source).toContain('place_autocomplete');
  });
});
