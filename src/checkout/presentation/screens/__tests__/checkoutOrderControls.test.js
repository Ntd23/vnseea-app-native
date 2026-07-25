const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Checkout order controls', () => {
  const screen = read(
    'src/checkout/presentation/screens/CheckoutScreen.tsx',
  );
  const viewModel = read(
    'src/checkout/application/view-models/useCheckoutViewModel.ts',
  );

  it('renders bounded decrement and increment controls for each product', () => {
    expect(screen).toContain('Minus');
    expect(screen).toContain('Plus');
    expect(screen).toContain('onDecrease');
    expect(screen).toContain('onIncrease');
    expect(screen).toContain('item.quantity <= 1');
    expect(screen).toContain('item.quantity >= item.maxQuantity');
    expect(screen).toContain('vm.changeQuantity');
  });

  it('validates saved and legacy phone values before an order is confirmed', () => {
    expect(viewModel).toContain('normalizeCheckoutPhone');
    expect(viewModel).toContain('isValidCheckoutPhone');
    expect(viewModel).toContain('Số điện thoại phải có từ 8 đến 15 chữ số.');
    expect(screen).toContain('handleOpenConfirm');
    expect(screen).toContain('setAddressSheetVisible(true)');
    expect(screen).toContain(
      "vm.addresses.length === 0 || vm.step === 'confirm'",
    );
  });

  it('applies the system bottom inset only through the Android checkout layout', () => {
    expect(screen).toContain('getCheckoutBottomLayout');
    expect(screen).toContain("isAndroid: Platform.OS === 'android'");
    expect(screen).toContain(
      'paddingBottom: bottomLayout.contentBottomPadding',
    );
    expect(screen).toContain(
      'paddingBottom: bottomLayout.footerBottomPadding',
    );
  });
});
