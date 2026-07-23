const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('checkout delivery address management', () => {
  const checkout = read(
    'src/checkout/presentation/screens/CheckoutScreen.tsx',
  );
  const shipping = read(
    'src/checkout/presentation/screens/ShippingAddressScreen.tsx',
  );
  const repository = read(
    'src/checkout/infrastructure/repositories/ApiCheckoutRepository.ts',
  );
  const contract = read(
    'src/checkout/domain/repositories/CheckoutRepository.ts',
  );
  const viewModel = read(
    'src/checkout/application/view-models/useCheckoutViewModel.ts',
  );

  it('uses direct text entry instead of Google Places in both address flows', () => {
    expect(checkout).not.toContain('AddressAutocomplete');
    expect(checkout).not.toContain('inferAddress(');
    expect(shipping).not.toContain('AddressAutocomplete');
    expect(shipping).not.toContain('inferCityCountryFromPlace(');
    expect(checkout).toContain('multiline');
    expect(shipping).toContain('multiline');
  });

  it('exposes edit and delete controls for saved checkout addresses', () => {
    expect(checkout).toContain('onEdit');
    expect(checkout).toContain('onDelete');
    expect(checkout).toContain('Sửa');
    expect(checkout).toContain('Xóa');
    expect(checkout).toContain('Lưu thay đổi');
    expect(checkout).toContain('Alert.alert(');
  });

  it('deletes addresses through the existing endpoint and refreshes the list', () => {
    expect(contract).toContain(
      'deleteAddress(addressId: string): Promise<DeliveryAddress[]>;',
    );
    expect(repository).toContain("type: 'delete'");
    expect(repository).toContain('id: addressId');
    expect(repository).toContain('return getAddresses();');
    expect(viewModel).toContain('isDeletingAddressId');
    expect(viewModel).toContain('const deleteAddress = useCallback');
    expect(viewModel).toContain('repository.deleteAddress(addressId)');
  });
});
