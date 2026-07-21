const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('map and place discovery performance contracts', () => {
  it('boots the map from the cached one-shot location and avoids duplicate GPS loads', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain('getCurrentDeviceLocation(4500)');
    expect(source).toContain('hasLoadedNearbyPagesRef.current');
    expect(source).toContain('const initialLocationRequestStartedRef = useRef(false);');
  });

  it('keeps marker and traffic work bounded while preserving stable marker keys', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain('const MAX_VISIBLE_PAGE_MARKERS = 40;');
    expect(source).toContain('const MAX_VISIBLE_SEARCH_MARKERS = 24;');
    expect(source).toContain('displayedSearchResults');
    expect(source).toContain('MAX_VISIBLE_SEARCH_MARKERS');
    expect(source).toContain('showsTraffic={shouldShowRoute}');
    expect(source).toContain('key={`${place.id}:address-place`}');
    expect(source).not.toContain('const resolvedPredictions = await Promise.all(');
    expect(source).not.toContain('result.predictions.map(async pred');
  });

  it('caches map discovery and avoids blocking page results on N+1 pin requests', () => {
    const source = read('src/user/infrastructure/repositories/ApiUserRepository.ts');

    expect(source).toContain('nearbyPagesCache.getOrLoad');
    expect(source).toContain('placePredictionsCache.getOrLoad');
    expect(source).toContain('placeDetailsCache.getOrLoad');
    expect(source).toContain('const firstResult = await Promise.race([');
    expect(source).toContain('const DIRECT_GOOGLE_TIMEOUT_MS = 1400;');
    expect(source).toContain('const MAP_SEARCH_RESPONSE_BUDGET_MS = 1750;');
    expect(source).toContain('isGoogleNearbyCategoryType(categoryType)');
    expect(source).toContain('category: input.category,');
    expect(source).toContain('warmNearbyPageMapPinStatuses(hydratedPages)');
    expect(source).not.toContain('hydrateNearbyPageMapPinStatus');
  });

  it('returns category search feedback progressively without waiting for every source', () => {
    const screenSource = read('src/user/presentation/screens/NearbyUsersScreen.tsx');
    const viewModelSource = read('src/user/application/view-models/useUserViewModel.ts');

    expect(screenSource).toContain('const CATEGORY_SEARCH_DEBOUNCE_MS = 140;');
    expect(screenSource).toContain('const TEXT_SEARCH_DEBOUNCE_MS = 220;');
    expect(screenSource).toContain('getGoogleCategorySearchQuery(trimmed)');
    expect(screenSource).toContain('isCommittedSearchLoading');
    expect(screenSource).toContain('setSearchResults(suggestions)');
    expect(screenSource).toContain('setIsSearchResultsVisible(true);');
    expect(screenSource).toContain('fitSearchResultsOnMap(combined);');
    expect(screenSource).toContain('searchResultsPanelHeight');
    expect(screenSource).toContain('!isSearchResultsVisible ? (');
    expect(screenSource).toContain('sortSearchSuggestions(query)');
    expect(screenSource).toContain('fast: true');
    expect(screenSource).toContain('result.pages.length === 0 &&');
    expect(screenSource).toContain('result.predictions.length === 0');
    expect(viewModelSource).toContain('setNearbyPlaces(pages);');
    expect(viewModelSource).toContain('setPlacePredictions(predictions);');
    expect(viewModelSource).toContain('MAP_SEARCH_FIRST_RESULT_DEADLINE_MS = 1500');
  });

  it('commits only the latest discovery request and keeps loading true for concurrent actions', () => {
    const source = read('src/user/application/view-models/useUserViewModel.ts');

    expect(source).toContain('const activeActionCountRef = useRef(0);');
    expect(source).toContain('const nearbyContentRequestIdRef = useRef(0);');
    expect(source).toContain('requestId === nearbyContentRequestIdRef.current');
    expect(source).toContain('if (activeActionCountRef.current === 0)');
  });
});
