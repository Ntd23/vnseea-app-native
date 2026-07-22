const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) return '';
  const end = source.indexOf(endMarker, start + startMarker.length);
  return source.slice(start, end < 0 ? source.length : end);
}

function detailSheetBlock(source) {
  const renderStart = source.indexOf(
    '      {selectedPoint &&\n      !isSheetCollapsed',
  );
  const componentStart = source.indexOf('<MapPlaceDetailSheet', renderStart);
  if (componentStart < 0) return '';
  const conditionStart =
    renderStart >= 0
      ? renderStart
      : source.lastIndexOf('      {selectedPoint &&', componentStart);
  const nextSelectedPoint = source.indexOf(
    '      {selectedPoint &&',
    componentStart,
  );
  return source.slice(
    conditionStart < 0 ? componentStart : conditionStart,
    nextSelectedPoint < 0 ? source.length : nextSelectedPoint,
  );
}

describe('Nearby search/detail sheet lifecycle', () => {
  it('keeps the suggestion sheet state when a result opens a detail sheet', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');
    const selectPoint = sliceBetween(
      source,
      'const selectPoint = useCallback(',
      'const handledInitialLocationRef',
    );
    const detailRender = detailSheetBlock(source);

    // Selecting a result must not destroy the submitted search. Closing the
    // detail sheet should therefore be able to reveal the same suggestions.
    expect(selectPoint).not.toContain('setIsSearchResultsVisible(false);');
    expect(detailRender).not.toContain('!isSearchResultsVisible');
    expect(source).toContain('!selectedPoint &&');
  });

  it('preserves the committed query for every search-result selection', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');
    const selectSearchResult = sliceBetween(
      source,
      'const handleSelectSearchResult = useCallback(',
      'const handleSelectPlaceDetailSuggestion',
    );

    expect(selectSearchResult).toContain('preserveSearchContext');
    expect(selectSearchResult).toContain(
      'options.preserveSearchContext !== false',
    );
    expect(selectSearchResult).toContain('if (!preserveSearchContext)');
    expect(source).toContain(
      'handleSelectSearchResult(item, { preserveSearchContext: true })',
    );
  });

  it('snapshots focused typeahead suggestions before opening detail', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');
    const selectSearchResult = sliceBetween(
      source,
      'const handleSelectSearchResult = useCallback(',
      'const handleSelectPlaceDetailSuggestion',
    );

    expect(selectSearchResult).toContain(
      'committedSearchQueryRef.current = trimmedSearchQuery;',
    );
    expect(selectSearchResult).toContain('if (isSearchFocused)');
    expect(selectSearchResult).toContain('setSearchResults(typeaheadResults);');
    expect(selectSearchResult).toContain('setIsSearchResultsVisible(true);');
    expect(selectSearchResult).toContain('openSearchResultsSheet();');
  });

  it('lets the suggestion-sheet close action clear the submitted search', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');
    const searchPanel = sliceBetween(
      source,
      '      {/* Submitted searches return',
      '      <Modal\n        visible={Boolean(activePageDetail)}',
    );
    const closeButton = sliceBetween(
      searchPanel,
      'styles.searchResultsCloseBtn',
      '</TouchableOpacity>',
    );

    // Implementations may keep the cleanup inline or delegate it to a named
    // handler, but the close action must clear all committed-search state.
    const closeHandler =
      closeButton.includes('setQuery(\'\')') ||
      closeButton.includes('handleCloseSearchResults') ||
      closeButton.includes('handleExitSearchMode');
    expect(closeHandler).toBe(true);
    expect(source).toContain('setSearchResults([]);');
    expect(source).toContain('clearPlacePredictions();');
  });

  it('hides suggestions during directions/navigation and allows them to return', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');
    const searchMarkers = sliceBetween(
      source,
      '        {/* Render search results markers on the map */}',
      '      </MapView>',
    );
    const searchPanel = sliceBetween(
      source,
      '      {/* Submitted searches return',
      '      <Modal\n        visible={Boolean(activePageDetail)}',
    );
    const hasTemporaryVisibilityState = source.includes(
      'isSearchResultsTemporarilyHidden',
    );
    const hasRouteVisibilityGuard =
      (hasTemporaryVisibilityState &&
        searchPanel.includes('isSearchResultsTemporarilyHidden')) ||
      (source.includes('shouldShowSearchResultsSheet') &&
        searchPanel.includes('shouldShowSearchResultsSheet')) ||
      (searchPanel.includes('!isRoutePreview') &&
        searchPanel.includes('!isNavigating'));
    const derivedSheetVisibility = sliceBetween(
      source,
      'const shouldShowSearchResultsSheet =',
      'const arrivalTimeText =',
    );

    // Route preview and active navigation should only hide the sheet. The
    // committed query/results must remain available when route mode ends.
    expect(hasRouteVisibilityGuard).toBe(true);
    if (derivedSheetVisibility) {
      expect(derivedSheetVisibility).toContain('!selectedPoint');
      expect(derivedSheetVisibility).toContain('!isRoutePreview');
      expect(derivedSheetVisibility).toContain('!isNavigating');
    }
    expect(source).toContain('setIsNavigating(false);');
    expect(source).toContain('resetRouteState');
    expect(detailSheetBlock(source)).toContain('!isNavigating');
    expect(searchMarkers).toContain('!isRoutePreview');
    expect(searchMarkers).toContain('!isNavigating');
    expect(searchMarkers).not.toContain('setSearchResults([]);');
  });

  it('does not make clearSelectedPoint erase the submitted suggestions', () => {
    const source = read('src/user/presentation/screens/NearbyUsersScreen.tsx');
    const clearSelectedPoint = sliceBetween(
      source,
      'const clearSelectedPoint = useCallback(',
      'useEffect(',
    );

    expect(clearSelectedPoint).not.toContain('setQuery(\'\');');
    expect(clearSelectedPoint).not.toContain('setSearchResults([]);');
    expect(clearSelectedPoint).not.toContain('clearPlacePredictions();');
  });
});
