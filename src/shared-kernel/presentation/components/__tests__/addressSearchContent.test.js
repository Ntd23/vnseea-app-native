const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('AddressSearchContent contract', () => {
  it('owns one billing session and ignores stale autocomplete responses', () => {
    const source = read(
      'src/shared-kernel/presentation/components/AddressSearchContent.tsx',
    );

    expect(source).toContain('createAddressSessionToken()');
    expect(source).toContain('searchRequestIdRef.current');
    expect(source).toContain('requestId !== searchRequestIdRef.current');
    expect(source).toContain('detailsRequestIdRef.current');
    expect(source).toContain(
      'detailsRequestId !== detailsRequestIdRef.current',
    );
    expect(source).toContain('createAsyncResourceCache');
    expect(source).toContain('didInitialSearchRef');
  });

  it('falls back to raw geocoding and resolves a selection through details', () => {
    const source = read(
      'src/shared-kernel/presentation/components/AddressSearchContent.tsx',
    );
    const wrapper = read(
      'src/shared-kernel/presentation/components/AddressAutocomplete.tsx',
    );

    expect(source).toContain('repository.searchAddresses');
    expect(source).toContain('repository.geocodeAddress');
    expect(source).toContain('repository.resolveAddressSuggestion');
    expect(source).toContain('handleSubmitEditing');
    expect(source).toContain('Google Maps');
    expect(source).not.toContain('Powered by Google');
    expect(source).not.toContain(
      'if (autocomplete.length > 0) return autocomplete;',
    );
    expect(source).not.toContain('filterAddressPredictions');
    expect(wrapper).toContain('isModalActiveRef.current = false');
    expect(wrapper).toContain('if (!isModalActiveRef.current) return');
  });
});
