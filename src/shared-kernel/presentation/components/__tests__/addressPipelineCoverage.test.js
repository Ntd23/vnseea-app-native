const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('address-only search coverage', () => {
  it('uses the shared address trigger across every address form', () => {
    const formFiles = [
      'src/pages/presentation/screens/CreatePageScreen.tsx',
      'src/product/presentation/screens/CreateProductScreen.tsx',
      'src/jobs/presentation/screens/CreateJobScreen.tsx',
      'src/settings/presentation/screens/EditProfileScreen.tsx',
      'src/settings/presentation/screens/SettingsScreen.tsx',
      'src/checkout/presentation/screens/ShippingAddressScreen.tsx',
    ];

    formFiles.forEach(file => {
      expect(read(file)).toContain('AddressAutocomplete');
    });
    expect(formFiles.map(read).join('\n')).not.toContain(
      'preferAddressSearch',
    );
  });

  it('fills canonical delivery fields from place details', () => {
    const settings = read(
      'src/settings/presentation/screens/SettingsScreen.tsx',
    );
    const shipping = read(
      'src/checkout/presentation/screens/ShippingAddressScreen.tsx',
    );

    expect(settings).toContain('place.city || place.district');
    expect(settings).toContain(
      'countryIdFromAddressCountry(place.country)',
    );
    expect(shipping).toContain('place.city || place.district');
    expect(shipping).toContain(
      "vm.updateAddressField('country', place.country)",
    );
  });

  it('keeps checkout address search inside its existing native sheet', () => {
    const checkout = read(
      'src/checkout/presentation/screens/CheckoutScreen.tsx',
    );

    expect(checkout).toContain('<AddressSearchContent');
    expect(checkout).not.toContain('<AddressAutocomplete');
    expect(checkout).toContain('addressSearchVisible');
  });

  it('keeps saved-address search inside its existing address sheet', () => {
    const addressScreen = read(
      'src/settings/presentation/screens/AddressScreen.tsx',
    );

    expect(addressScreen).toContain('<AddressSearchContent');
    expect(addressScreen).not.toContain('<AddressAutocomplete');
    expect(addressScreen).toContain('isAddressSearchVisible');
  });

  it('keeps page pin search on the address repository while nearby stays separate', () => {
    const picker = read(
      'src/pages/presentation/components/PageLocationPickerModal.tsx',
    );
    const nearby = read(
      'src/user/presentation/screens/NearbyUsersScreen.tsx',
    );

    expect(picker).toContain('createAddressSearchRepository');
    expect(picker).not.toContain('filterAddressPredictions');
    expect(nearby).not.toContain('createAddressSearchRepository');
  });
});
