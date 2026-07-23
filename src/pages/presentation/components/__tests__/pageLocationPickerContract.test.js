const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

describe('page location picker contract', () => {
  it('uses a Google map with a fixed center pin and reverse-geocodes after map movement', () => {
    const source = read('PageLocationPickerModal.tsx');

    expect(source).toContain('provider={PROVIDER_GOOGLE}');
    expect(source).toContain('onRegionChangeComplete={handleRegionChangeComplete}');
    expect(source).toContain("type: 'reverse_geocode'");
    expect(source).toContain('REVERSE_GEOCODE_DEBOUNCE_MS');
    expect(source).toContain('handleUseCurrentLocation');
    expect(source).toContain('Google Maps');
    expect(source).not.toContain('Powered by Google');
    expect(source).toContain('resolveInitialPlace');
    expect(source).toContain('onMapReady={handleMapReady}');
    expect(source).toContain('navigationBarTranslucent');
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
    expect(source).not.toContain('!isResolving &&');
    expect(source).toContain('Boolean(selectedAddress.trim())');
    expect(source).toContain('disabled={!canConfirm}');
  });

  it('wires the picker into Create Page and passes the existing coordinate as address bias', () => {
    const screen = fs.readFileSync(
      path.resolve(__dirname, '../../screens/CreatePageScreen.tsx'),
      'utf8',
    );

    expect(screen).not.toContain('preferAddressSearch');
    expect(screen).toContain('locationBias=');
    expect(screen).toContain('PageLocationPickerModal');
    expect(screen).toContain('Chọn vị trí chính xác trên bản đồ');
    expect(screen).toContain('onConfirm={handleLocationConfirm}');
    expect(screen).toContain('onSelectPlace={handlePlaceSelected}');
    expect(screen).toContain('setIsLocationPickerVisible(true)');
    expect(screen).toContain('parseMapCoordinate(place.lat, place.lng)');
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
