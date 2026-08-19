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
      'if (Date.now() - lastMapMarkerPressAtRef.current < 450)',
    );
    expect(source).toContain('setIsSearchResultsVisible(false);');
    expect(source).toContain('onPress={() => handleSelectSearchResult(item)}');
  });

  it('starts mixed Page and address suggestions from one character', () => {
    const screenSource = read(
      'src/user/presentation/screens/NearbyUsersScreen.tsx',
    );
    const repositorySource = read(
      'src/user/infrastructure/repositories/ApiUserRepository.ts',
    );
    const requestSource = read(
      'src/user/infrastructure/repositories/mapBusinessSearchRequest.ts',
    );
    const backendSource = read('phtml/api/v2/endpoints/map_discovery.php');

    expect(screenSource).toContain('const REMOTE_SEARCH_MIN_LENGTH = 1;');
    expect(repositorySource).toContain(
      'if (trimmedQuery.length < 1) return [];',
    );
    expect(repositorySource).toContain('buildMapBusinessSearchRequest');
    expect(repositorySource).toContain('buildMapPageSearchRequest');
    expect(repositorySource).toContain('getDirectGooglePlacePredictions');
    expect(requestSource).toContain("search_mode: 'business'");
    expect(requestSource).not.toContain('prefer_address');
    expect(screenSource).toContain(
      `radius: MAP_TYPEAHEAD_SEARCH_RADIUS_METERS,
          limit: 20,
          fast: true,
          globalSearch: true,`,
    );
    expect(backendSource).toContain(
      "$allow_unmapped_matches = $global_search && $keyword !== '';",
    );
    expect(backendSource).toContain(
      '$has_origin = $origin_lat !== null && $origin_lng !== null',
    );
    expect(backendSource).toContain('if ($has_origin && !$global_search)');
    expect(backendSource).toContain('if (!$global_search) {');
    expect(backendSource).toContain(
      'if (!$allow_unmapped_matches && !$has_page_coordinate)',
    );
    expect(backendSource).toContain(
      '$single_character_search = $query_length === 1;',
    );
    expect(backendSource).toContain(
      '$legacy_search_pattern = ($single_character_search && !$global_search)',
    );
    expect(screenSource).toContain('doesMapSearchCandidateMatchQuery');
    expect(screenSource).not.toContain('haystack.includes(normalizedQuery)');
    expect(backendSource).toContain(
      "'lat' => $has_page_coordinate ? $page_lat : null",
    );
    expect(backendSource).toContain(
      "'lng' => $has_page_coordinate ? $page_lng : null",
    );
    expect(backendSource).toContain(
      "['distance_meters'] = Wo_ApiMapDiscoveryDistanceMeters",
    );
  });

  it('publishes Google and Page results as each source becomes available', () => {
    const screenSource = read(
      'src/user/presentation/screens/NearbyUsersScreen.tsx',
    );
    const viewModelSource = read(
      'src/user/application/view-models/useUserViewModel.ts',
    );

    expect(screenSource).toContain(
      'onPartialResults: publishCommittedSearchResults',
    );
    expect(viewModelSource).toContain(
      'onPartialPredictions: publishPredictions',
    );
    expect(viewModelSource).toContain('publishPartialResults();');
  });

  it('resolves Google predictions without coordinates before route actions', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain('function selectedPointFromGooglePrediction(');
    expect(source).toContain('const resolveGooglePredictionPoint = useCallback');
    expect(source).toContain(
      'const details = await getPlaceDetails(prediction.placeId);',
    );
    expect(source).toContain(
      'const handleGoogleSearchResultRouteAction = useCallback',
    );
    expect(source).toContain(
      'handleGoogleSearchResultRouteAction(\n                        item.prediction,',
    );
    expect(source).not.toContain(
      "disabled={!coordinate && item.kind !== 'page'}",
    );
  });

  it('does not let background nearby discovery overwrite an active search', () => {
    const screenSource = read(
      'src/user/presentation/screens/NearbyUsersScreen.tsx',
    );

    expect(screenSource).toContain(
      'if (wasSearchQueryActiveRef.current) return;',
    );
  });

  it('uses only the device location for search ranking and requests', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain(
      "const searchRankingOrigin = locationSource === 'gps' ? currentLocation : null;",
    );
    expect(
      source.match(/const searchOrigin = deviceLocationRef\.current;/g) ?? [],
    ).toHaveLength(2);
    expect(source).toContain('lat: searchOrigin?.latitude');
    expect(source).toContain('lng: searchOrigin?.longitude');
    expect(source).not.toContain(
      'currentLocationRef.current ?? currentRegionRef.current',
    );
    expect(source).not.toContain(
      'const current = isViewportDiscoveryRef.current',
    );
  });

  it('reloads Page markers around the visible viewport after a map gesture', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');
    const viewModelSource = read(
      'src/user/application/view-models/useUserViewModel.ts',
    );

    expect(source).toContain('queueViewportPageLoad(region);');
    expect(source).toContain('isViewportDiscoveryRef.current = true;');
    expect(source).toContain("source: 'viewport'");
    expect(source).toContain('const MAP_DISCOVERY_PAGE_LIMIT = 40;');
    expect(viewModelSource).toContain('distance: input?.distance ?? 3');
  });
});
