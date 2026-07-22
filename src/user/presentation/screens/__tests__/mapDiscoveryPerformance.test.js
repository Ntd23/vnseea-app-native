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
    expect(source).toContain(
      'const initialLocationRequestStartedRef = useRef(false);',
    );
    expect(source).toContain('isPersistedDiscoveryLocationFresh');
    expect(source).toContain('nearbyPagesOriginRef');
    expect(source).toContain('nearbyPagesPendingOriginRef');
    expect(source).toContain('nearbyPagesCandidateRef');
    expect(source).toContain("source: 'gps'");
  });

  it('keeps marker and traffic work bounded while preserving stable marker keys', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain('const MAX_VISIBLE_PAGE_MARKERS = 40;');
    expect(source).toContain('const MAX_VISIBLE_SEARCH_MARKERS = 24;');
    expect(source).toContain('displayedSearchResults');
    expect(source).toContain('MAX_VISIBLE_SEARCH_MARKERS');
    expect(source).toContain('showsTraffic={shouldShowRoute}');
    expect(source).toContain(':address-place:${');
    expect(source).toContain("compact ? 'compact' : 'label'");
    expect(source).toContain('Preserve the API order.');
    expect(source).not.toContain('distanceFromAnchor');
    expect(source).not.toContain(
      'const resolvedPredictions = await Promise.all(',
    );
    expect(source).not.toContain('result.predictions.map(async pred');
  });

  it('caches map discovery and avoids blocking page results on N+1 pin requests', () => {
    const source = read(
      'src/user/infrastructure/repositories/ApiUserRepository.ts',
    );

    expect(source).toContain('nearbyPagesCache.getOrLoad');
    expect(source).toContain('placePredictionsCache.getOrLoad');
    expect(source).toContain('placeDetailsCache.getOrLoad');
    expect(source).toContain('const firstResult = await Promise.race([');
    expect(source).toContain('const DIRECT_GOOGLE_TIMEOUT_MS = 1700;');
    expect(source).toContain("'X-Android-Package'");
    expect(source).toContain("'X-Android-Cert'");
    expect(source).toContain('const MAP_SEARCH_RESPONSE_BUDGET_MS = 1800;');
    expect(source).toContain('isGoogleNearbyCategoryType');
    expect(source).toContain('canUseDirectGoogleNearbyPredictions');
    expect(source).toContain(
      'const directPredictions = await getDirectGoogleNearbyPredictions',
    );
    expect(source).toContain('if (directPredictions.length > 0)');
    expect(source).toContain('signal: input.signal');
    expect(source).toContain('category: input.category,');
    expect(source).toContain('prefer_address: input.category ? undefined : 1,');
    expect(source).toContain('warmNearbyPageMapPinStatuses(hydratedPages)');
    expect(source).not.toContain('hydrateNearbyPageMapPinStatus');
  });

  it('returns category search feedback progressively without waiting for every source', () => {
    const screenSource = read(
      'src/user/presentation/screens/NearbyUsersScreen.tsx',
    );
    const viewModelSource = read(
      'src/user/application/view-models/useUserViewModel.ts',
    );

    expect(screenSource).toContain('const CATEGORY_SEARCH_DEBOUNCE_MS = 80;');
    expect(screenSource).toContain('const TEXT_SEARCH_DEBOUNCE_MS = 120;');
    expect(screenSource).toContain('const REMOTE_SEARCH_MIN_LENGTH = 2;');
    expect(screenSource).toContain('styles.typeaheadOverlay');
    expect(screenSource).toContain('typeaheadResultDistance');
    expect(screenSource).toContain('useAuthBranding');
    expect(screenSource).toContain('styles.vnseeaPageBadge');
    expect(screenSource).toContain('TypeaheadSearchSkeleton');
    expect(screenSource).toContain('styles.typeaheadSkeletonRow');
    expect(screenSource).toContain('activeSearchListResults.length > 0');
    expect(screenSource).not.toContain('TypeaheadSearchProgress');
    expect(screenSource).not.toContain('styles.typeaheadLoadingTrack');
    expect(screenSource).toContain('!isSearchMode &&');
    expect(screenSource).toContain('getGoogleCategorySearchQuery(trimmed)');
    expect(screenSource).toContain('isCommittedSearchLoading');
    expect(screenSource).not.toContain('setSearchResults(suggestions)');
    expect(screenSource).toContain('submittedTypeaheadResults');
    expect(screenSource).toContain('setIsSearchResultsVisible(true);');
    expect(screenSource).toContain('sortSearchSuggestions(query)');
    expect(screenSource).toContain('fast: true');
    expect(screenSource).toContain('result.pages.length === 0 &&');
    expect(screenSource).toContain('result.predictions.length === 0');
    expect(viewModelSource).toContain('setNearbyPlaces(pages);');
    expect(viewModelSource).toContain('setPlacePredictions(predictions);');
    expect(viewModelSource).toContain(
      'MAP_SEARCH_FIRST_RESULT_DEADLINE_MS = 1850',
    );
    expect(viewModelSource).toContain('mapSearchAbortControllerRef');
    expect(viewModelSource).toContain('isMapSearchLoading');
    expect(viewModelSource).toContain('placePredictionsQuery');
  });

  it('opens submitted search results as a three-level draggable map sheet', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');

    expect(source).toContain(
      "type SearchResultsSheetSnap = 'peek' | 'half' | 'expanded';",
    );
    expect(source).toContain('const SEARCH_RESULTS_SHEET_SNAPS');
    expect(source).toContain('Gesture.Pan()');
    expect(source).toContain(
      '<GestureDetector gesture={searchResultsSheetGestures.header}>',
    );
    expect(source).toContain(
      '<GestureDetector gesture={searchResultsSheetGestures.body}>',
    );
    expect(source).toContain('useSharedValue(0)');
    expect(source).toContain('withSpring(');
    expect(source).toContain('runOnJS(commitSearchResultsSheetSnap)');
    expect(source).not.toContain('PanResponder.create');
    expect(source).toContain("animateSearchResultsSheetTo('half');");
    expect(source).toContain('openSearchResultsSheet();');
    expect(source).toContain(
      "scrollEnabled={searchResultsSheetSnap === 'expanded'}",
    );
    expect(source).not.toContain('searchResultsSheetPanResponder.panHandlers');
    expect(source).toContain('searchResultsSheetTranslateY');
    expect(source).toContain(
      'transform: [{ translateY: searchResultsSheetTranslateY.value }]',
    );
    expect(source).toContain('<FlatList');
    expect(source).toContain('initialNumToRender={2}');
    expect(source).toContain('maxToRenderPerBatch={3}');
    expect(source).not.toContain('height: searchResultsSheetHeightAnim');
    expect(source).toContain('searchSheetViewportHeight');
    expect(source).toContain('stableViewportRef');
    expect(source).toContain('const isSearchMode = isSearchFocused;');
    expect(source).toContain('fitToCoordinates(uniqueCoordinates');
    expect(source).toContain('latestCombinedResults.length === 0');
    expect(source).toContain('styles.searchResultsNotice');
    expect(source).not.toContain(
      "Alert.alert('Lỗi', 'Không thể thực hiện tìm kiếm.')",
    );
    expect(source).not.toContain(
      "Alert.alert('Lỗi', 'Không thể lấy thông tin địa điểm.')",
    );
  });

  it('opens a selected address in one draggable three-level detail sheet', () => {
    const screenSource = read(
      'src/user/presentation/screens/NearbyUsersScreen.tsx',
    );
    const sheetSource = read(
      'src/user/presentation/components/MapPlaceDetailSheet.tsx',
    );

    expect(screenSource).toContain('<MapPlaceDetailSheet');
    expect(screenSource).toContain('onSnapChange={setPlaceDetailSheetSnap}');
    expect(screenSource).toContain(
      'const SHOW_LEGACY_SELECTED_PLACE_CARD: boolean = false;',
    );
    expect(screenSource).toContain('photoUrls: item.prediction.photoUrls');
    expect(screenSource).toContain('details.photoUrls ?? []');
    expect(screenSource).toContain('<SearchResultPhotoStrip');
    expect(sheetSource).toContain(
      "export type MapPlaceDetailSheetSnap = 'peek' | 'half' | 'expanded';",
    );
    expect(sheetSource).toContain('Gesture.Pan()');
    expect(sheetSource).toContain('runOnJS(commitSnap)(targetSnap)');
    expect(sheetSource).toContain("scrollEnabled={snap === 'expanded'}");
    expect(sheetSource).toContain('gesture.activeOffsetY(6).failOffsetY(-6)');
    expect(sheetSource).toContain('visiblePhotoUrls.length > 0');
    expect(sheetSource).toContain('onError={() => markPhotoFailed(url)}');
    expect(sheetSource).toContain('Đánh giá từ Google');
    expect(sheetSource).toContain('Địa điểm gợi ý khác');
    expect(sheetSource).toContain('Truy cập Page');
    expect(sheetSource).toContain('place.pageFollowersCount');
    expect(screenSource).toContain('suggestions={selectedPlaceSuggestions}');
    expect(screenSource).toContain('const selectedPlaceSuggestionItems');
    expect(screenSource).toContain('.getPageDetail({ pageId })');
    expect(sheetSource).toContain("return '--';");
    expect(sheetSource).not.toContain('FALLBACK_AVATAR');
  });

  it('hydrates Google place details with optional photos and metadata', () => {
    const repositorySource = read(
      'src/user/infrastructure/repositories/ApiUserRepository.ts',
    );
    const backendSource = read('phtml/api/v2/endpoints/map_discovery.php');

    expect(repositorySource).toContain(
      'rating,user_ratings_total,opening_hours,photos',
    );
    expect(repositorySource).toContain('const photoReferences =');
    expect(repositorySource).toContain('function mapGooglePlaceReview');
    expect(repositorySource).toContain('reviews,editorial_summary');
    expect(repositorySource).toContain(
      'record.rating !== undefined && record.rating !== null',
    );
    expect(repositorySource).toContain('photoUrls,');
    expect(backendSource).toContain(
      'icon_background_color,types,rating,user_ratings_total,opening_hours,photos',
    );
    expect(backendSource).toContain("'photo_references' => $photo_references");
    expect(backendSource).toContain("'reviews' => $reviews");
    expect(backendSource).toContain("'website' => !empty($result['website'])");
    expect(backendSource).toContain(
      "'open_now' => isset($result['opening_hours']['open_now'])",
    );
  });

  it('keeps distant Page and Google results while explaining their distance', () => {
    const screenSource = read(
      'src/user/presentation/screens/NearbyUsersScreen.tsx',
    );
    const viewModelSource = read(
      'src/user/application/view-models/useUserViewModel.ts',
    );
    const repositorySource = read(
      'src/user/infrastructure/repositories/ApiUserRepository.ts',
    );
    const backendSource = read('phtml/api/v2/endpoints/map_discovery.php');

    expect(screenSource).toContain(
      'const GLOBAL_SEARCH_BIAS_RADIUS_METERS = 50000;',
    );
    expect(screenSource).toContain('globalSearch: true,');
    expect(screenSource).toContain("label: 'Gần bạn'");
    expect(screenSource).toContain("label: 'Trong khu vực'");
    expect(screenSource).toContain("label: 'Xa bạn'");
    expect(screenSource).toContain('searchDistanceSummary');
    expect(screenSource).toContain('takeMixedSearchResults');
    expect(screenSource).toContain('const MAX_COMMITTED_SEARCH_RESULTS = 60;');
    expect(screenSource).toContain('mergeSearchResultSets(');
    expect(screenSource).toContain('waitForAllSources: true,');
    expect(screenSource).toContain(
      'onPartialResults: publishCommittedSearchResults',
    );
    expect(screenSource).not.toContain('dist <= SEARCH_RADIUS_METERS');
    expect(viewModelSource).toContain('globalSearch?: boolean;');
    expect(viewModelSource).toContain('waitForAllSources?: boolean;');
    expect(viewModelSource).toContain('onPartialResults?: (result:');
    expect(viewModelSource).toContain('publishPartialResults();');
    expect(viewModelSource).toContain(
      'if (input.fast && !input.waitForAllSources)',
    );
    expect(repositorySource).toContain(
      'global_search: input.globalSearch ? 1 : undefined',
    );
    expect(repositorySource).toContain('!input.globalSearch &&');
    expect(backendSource).toContain(
      "$global_search = !empty($_POST['global_search'])",
    );
    expect(backendSource).toContain('$should_run_text_search =');
    expect(backendSource).toContain('$global_search ||');
    expect(backendSource).toContain("preg_match('/\\b(caf|cafe|");
    expect(backendSource).toContain(
      '$fast && !$prefer_address && $detected_type !== null && count($places_results) === 0',
    );
    expect(backendSource).toContain("'query' => $global_search ? $input");
  });

  it('keeps the fast backend path inside the interactive search budget', () => {
    const repositorySource = read(
      'src/user/infrastructure/repositories/ApiUserRepository.ts',
    );
    const backendSource = read('phtml/api/v2/endpoints/map_discovery.php');

    expect(repositorySource).toContain('fast: input.fast ? 1 : undefined');
    expect(backendSource).toContain(
      '$google_timeout_ms = $fast ? 1500 : 20000;',
    );
    expect(backendSource).toContain("while (!$fast && $next_page_token !== ''");
    expect(backendSource).toContain(
      '`page_id`, `page_name`, `page_title`, `page_description`, `address`, `avatar`, `cover`, `place_id`, `lat`, `lng`',
    );
    expect(backendSource).toContain('Wo_ApiMapDiscoveryPageFulltextAvailable');
    expect(backendSource).toContain('number_format((float) $origin_lat, 4');
    expect(backendSource).toContain('apcu_store($cache_key, $response, 15);');
    expect(backendSource).toContain('$should_run_text_search =');
    expect(backendSource).toContain('$global_search ||');
    expect(backendSource).toContain(
      'if (!$global_search && !$fast && $prefer_address',
    );
    expect(backendSource).not.toContain('search_debug.log');
  });

  it('commits only the latest discovery request and keeps loading true for concurrent actions', () => {
    const source = read('src/user/application/view-models/useUserViewModel.ts');

    expect(source).toContain('const activeActionCountRef = useRef(0);');
    expect(source).toContain('const discoveryRequestIdRef = useRef(0);');
    expect(source).toContain('const mapSearchRequestIdRef = useRef(0);');
    expect(source).toContain('requestId === discoveryRequestIdRef.current');
    expect(source).toContain('if (activeActionCountRef.current === 0)');
  });
});
