const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

describe('page location picker contract', () => {
  it('uses a Google map with a fixed center pin and reverse-geocodes after map movement', () => {
    const source = read('PageLocationPickerModal.tsx');
    const addressRepository = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../shared-kernel/infrastructure/address/ApiAddressSearchRepository.ts',
      ),
      'utf8',
    );
    const backend = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../../phtml/api/v2/endpoints/map_discovery.php',
      ),
      'utf8',
    );

    expect(source).toContain('provider={PROVIDER_GOOGLE}');
    expect(source).toContain('onRegionChangeComplete={handleRegionChangeComplete}');
    expect(addressRepository).toContain("type: 'reverse_geocode'");
    expect(addressRepository).toContain('reverseGeocodeCoordinate');
    expect(addressRepository).toContain("loadSuggestions('address_geocode'");
    expect(addressRepository).toContain(
      'place/nearbysearch/json?${params.toString()}',
    );
    expect(backend).toContain("Wo_ApiMapDiscoveryGoogleGet('place/nearbysearch/json'");
    expect(backend).toContain("'is_nearby' => 1");
    expect(backend).toContain("'nearby_places' => $nearby_places");
    expect(source).toContain('REVERSE_GEOCODE_DEBOUNCE_MS');
    expect(source).toContain('handleUseCurrentLocation');
    expect(source).toContain('await reverseGeocode(coordinate, sessionIdRef.current)');
    expect(source).toContain("primaryAddressRef.current = ''");
    expect(source).toContain('Google Maps');
    expect(source).not.toContain('Powered by Google');
    expect(source).toContain('resolveInitialPlace');
    expect(source).toContain('onMapReady={handleMapReady}');
    expect(source).toContain('navigationBarTranslucent');
    expect(source).toContain('StatusBar.currentHeight');
    expect(source).toContain(
      'Math.max(insets.top, androidStatusBarHeight, 10)',
    );
    expect(source).toContain('paddingTop: topSafeInset + 8');
    expect(source).toContain('parseMapCoordinate(latitude, longitude)');
    expect(source).toContain('cancelPendingReverseGeocode');
    expect(source).toContain('onRegionChangeStart={handleRegionChangeStart}');
    expect(source).toContain('mapGestureRef.current || details?.isGesture === true');
    expect(source).toContain('suppressedSearchQueryRef.current === query');
    expect(source).not.toContain('skipNextSearchRef');
    expect(source).toContain('SELECTED_PLACE_DELTAS');
    expect(source).toContain('latitudeDelta: 0.0008');
    expect(source).toContain('longitudeDelta: 0.0008');
    expect(source).toContain('primaryAddressRef');
    expect(source).toContain('prepareManualPinMove()');
    expect(source).toContain('applyPrimaryAddress(address, placeId)');
    expect(source).toContain('handleSelectNearbySuggestion');
    expect(source).toContain('nearbySuggestions.slice(0, 3)');
    expect(source).toContain('{copy.nearbySuggestions}');
    expect(source).toContain('{copy.distanceFromPin} {distance}');
    expect(source).toContain('setNearbyAddress(address === primaryAddress ? \'\' : address)');
    expect(source).toContain('setSelectedPlaceId(undefined)');
    expect(source).toContain('setHasPinnedCoordinate(true)');
    expect(source).toContain(
      'const detailsRequestId = ++initialPlaceRequestIdRef.current;',
    );
    expect(source).toContain(
      'detailsRequestId !== initialPlaceRequestIdRef.current',
    );
    expect(source).toContain(
      'resolved.formattedAddress || fallbackAddress',
    );
    expect(source).not.toContain('MAX_NEARBY_PIN_FALLBACK_METERS');
    expect(source).not.toContain('restoreNearbyConfirmedPin');
    expect(source).toContain('{selectedAddress || copy.dragHint}');
    expect(source).toContain('{nearbyAddress}');
    expect(source).toContain('region.latitude.toFixed(6)');
    expect(source).toContain('region.longitude.toFixed(6)');
    expect(source).toContain('const canConfirm =');
    expect(source).toContain('hasPinnedCoordinate &&');
    expect(source).not.toContain('const canConfirm =\n    !isResolving');
    expect(source).toContain('Boolean(selectedAddress.trim())');
    expect(source).toContain('disabled={!canConfirm}');
  });

  it('opens the exact map picker directly from the Create Page location field', () => {
    const screen = fs.readFileSync(
      path.resolve(__dirname, '../../screens/CreatePageScreen.tsx'),
      'utf8',
    );

    expect(screen).not.toContain('AddressAutocomplete');
    expect(screen).toContain('PageLocationPickerModal');
    expect(screen).toContain('Chọn vị trí chính xác trên bản đồ');
    expect(screen).toContain('onConfirm={handleLocationConfirm}');
    expect(screen).toContain('const openLocationPicker = useCallback');
    expect(screen).toContain('onPress={openLocationPicker}');
    expect(screen).toContain('Keyboard.dismiss()');
    expect(screen).toContain('parseMapCoordinate(draft.lat, draft.lng)');
  });

  it('keeps address lookup separate from nearby business discovery', () => {
    const backend = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../../phtml/api/v2/endpoints/map_discovery.php',
      ),
      'utf8',
    );
    const autocomplete = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../shared-kernel/presentation/components/AddressAutocomplete.tsx',
      ),
      'utf8',
    );
    const searchContent = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../shared-kernel/presentation/components/AddressSearchContent.tsx',
      ),
      'utf8',
    );

    expect(backend).toContain("'address_autocomplete'");
    expect(backend).toContain("'address_geocode'");
    expect(backend).toContain("'address_details'");
    expect(searchContent).toContain('createAddressSearchRepository');
    expect(searchContent).not.toContain('filterAddressPredictions');
    expect(searchContent).not.toContain("type: 'place_autocomplete'");
    expect(searchContent).toContain('searchRequestIdRef.current += 1');
    expect(searchContent).toContain('resolveAddressSuggestion');
    expect(autocomplete).toContain('AddressSearchContent');
    expect(read('PageLocationPickerModal.tsx')).toContain(
      'resolveAddressLocationBias',
    );
    expect(read('PageLocationPickerModal.tsx')).toContain(
      'addressLocationBiasRef.current',
    );
  });

  it('starts address suggestions after two typed characters', () => {
    const picker = read('PageLocationPickerModal.tsx');
    const autocomplete = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../shared-kernel/presentation/components/AddressAutocomplete.tsx',
      ),
      'utf8',
    );
    const searchContent = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../shared-kernel/presentation/components/AddressSearchContent.tsx',
      ),
      'utf8',
    );

    expect(picker).toContain('const MIN_SEARCH_CHARS = 2;');
    expect(picker).toContain('trimmed.length < MIN_SEARCH_CHARS');
    expect(picker).not.toContain('if (suggestions.length === 0)');
    expect(autocomplete).toContain('AddressSearchContent');
    expect(searchContent).toContain('const MIN_SEARCH_CHARS = 2;');
    expect(searchContent).toContain('trimmed.length < MIN_SEARCH_CHARS');
  });
});
