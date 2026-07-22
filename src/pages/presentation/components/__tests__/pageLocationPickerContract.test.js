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

  it('wires the picker into Create Page and keeps address search in address mode', () => {
    const screen = fs.readFileSync(
      path.resolve(__dirname, '../../screens/CreatePageScreen.tsx'),
      'utf8',
    );

    expect(screen).toContain('preferAddressSearch');
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

    expect(backend).toContain("Wo_ApiMapDiscoveryGoogleGet('geocode/json'");
    expect(backend).toContain(
      'if (!$global_search && $prefer_address && count($predictions) === 0)',
    );
    expect(backend).toContain('!$prefer_address');
    expect(backend).toContain('$should_run_text_search =');
    expect(autocomplete).toContain('filterAddressPredictions');
    expect(autocomplete).toContain('searchRequestIdRef.current += 1');
    expect(autocomplete).toContain(
      'parseMapCoordinate(\n        prediction.lat,\n        prediction.lng,\n      )',
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

    expect(picker).toContain('const MIN_SEARCH_CHARS = 2;');
    expect(picker).toContain('trimmed.length < MIN_SEARCH_CHARS');
    expect(autocomplete).toContain('const MIN_AUTOCOMPLETE_CHARS = 2;');
    expect(autocomplete).toContain(
      'trimmedInput.length < MIN_AUTOCOMPLETE_CHARS',
    );
  });
});
