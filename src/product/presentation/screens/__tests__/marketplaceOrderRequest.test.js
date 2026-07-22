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
    expect(checkoutScreen).toContain('AddressAutocomplete');
    expect(checkoutScreen).toContain('addressSheetVisible');
    expect(checkoutScreen).toContain('KeyboardAvoidingView');
    expect(checkoutScreen).toMatch(/vm\.isLoading\s*\|\|\s*vm\.error/);
    expect(checkoutScreen).not.toContain(
      'navigation.navigate(ROUTES.SHIPPING_ADDRESS',
    );
  });
});
