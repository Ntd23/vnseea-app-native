const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Marketplace mobile order request flow', () => {
  const card = read(
    'src/product/presentation/components/ProductPostCard.tsx',
  );
  const marketplace = read(
    'src/product/presentation/screens/MarketplaceScreen.tsx',
  );
  const checkoutRepository = read(
    'src/checkout/infrastructure/repositories/ApiCheckoutRepository.ts',
  );
  const checkoutViewModel = read(
    'src/checkout/application/view-models/useCheckoutViewModel.ts',
  );
  const checkoutScreen = read(
    'src/checkout/presentation/screens/CheckoutScreen.tsx',
  );

  it('shows a dedicated cart action for available products owned by another user', () => {
    expect(card).toContain('ShoppingCart');
    expect(card).toContain('onOrderRequest');
    expect(card).toContain('product.can_add_to_cart');
    expect(card).toContain('event.stopPropagation()');
    expect(card).toContain('canShowOrderRequest');
    expect(card).toMatch(/canShowOrderRequest\s*\?\s*\(/);
  });

  it('ensures the selected product in cart and opens checkout with only that id', () => {
    expect(marketplace).toContain('ensureProductInCart');
    expect(marketplace).toMatch(
      /selectedProductIds:\s*\[product\.id\]/,
    );
    expect(marketplace).toContain('orderingProductId');
  });

  it('submits one canonical request without temporarily mutating unrelated cart rows', () => {
    expect(checkoutRepository).toContain("type: 'request_order'");
    expect(checkoutRepository).toContain('product_ids: JSON.stringify');
    expect(checkoutRepository).not.toContain('itemsToRestore');
    expect(checkoutRepository).not.toContain("type: 'buy'");
  });

  it('does not use wallet or hand-built chat messages during checkout', () => {
    expect(checkoutViewModel).not.toContain('getWalletBalance');
    expect(checkoutViewModel).not.toContain('createMessagesRepository');
    expect(checkoutViewModel).not.toContain('Tôi muốn đặt mua sản phẩm');
    expect(checkoutScreen).not.toContain('Số dư ví');
    expect(checkoutScreen).not.toContain('Nạp tiền');
    expect(checkoutScreen).toContain('Gửi yêu cầu mua');
  });

  it('owns address selection and editing inside checkout', () => {
    expect(checkoutScreen).not.toContain('AddressAutocomplete');
    expect(checkoutScreen).toContain('multiline');
    expect(checkoutScreen).toContain('onEdit');
    expect(checkoutScreen).toContain('onDelete');
    expect(checkoutScreen).toContain('addressSheetVisible');
    expect(checkoutScreen).toContain('useCheckoutKeyboardInset');
    expect(checkoutScreen).toMatch(/vm\.isLoading\s*\|\|\s*vm\.error/);
    expect(checkoutScreen).not.toContain(
      'navigation.navigate(ROUTES.SHIPPING_ADDRESS',
    );
  });

  it('keeps the address sheet scrollable above the keyboard on both platforms', () => {
    expect(checkoutScreen).toContain("style={{ height: '88%' }}");
    expect(checkoutScreen).toContain('useCheckoutKeyboardInset');
    expect(checkoutScreen).toContain("'keyboardWillChangeFrame'");
    expect(checkoutScreen).toContain("'keyboardDidShow'");
    expect(checkoutScreen).toContain('paddingBottom: keyboardInset');
    expect(checkoutScreen).toMatch(
      /<ScrollView[\s\S]*?className="flex-1"[\s\S]*?keyboardDismissMode=\{\s*Platform\.OS === 'ios' \? 'interactive' : 'on-drag'\s*\}/,
    );
    expect(checkoutScreen).toContain('paddingVertical: 0');
    expect(checkoutScreen).toContain('lineHeight: 22');
    expect(checkoutScreen).toContain("textAlignVertical: 'center'");
  });

  it('keeps the save-address action outside the scroll area as a keyboard-safe footer', () => {
    expect(checkoutScreen).toMatch(
      /<\/ScrollView>\s*\{showForm \? \([\s\S]*?onPress=\{saveAddress\}/,
    );
  });

  it('does not convert product prices into VNSEEA for the order request summary', () => {
    expect(checkoutRepository).not.toContain('normalizeSummaryCurrency');
    expect(checkoutRepository).not.toContain("shouldConvert ? 'VNSEEA'");
    expect(checkoutScreen).toContain('summary.currencyTotals');
    expect(checkoutScreen).not.toContain("summary?.currencySymbol || 'VNSEEA'");
  });
});
