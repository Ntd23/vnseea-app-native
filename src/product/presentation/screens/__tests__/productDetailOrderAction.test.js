const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Product detail order action', () => {
  const productDetail = read(
    'src/product/presentation/screens/ProductDetailScreen.tsx',
  );

  it('shows an accessible cart action with loading and unavailable states', () => {
    expect(productDetail).toContain('ShoppingCart');
    expect(productDetail).toContain('accessibilityLabel="Mua sản phẩm"');
    expect(productDetail).toContain('isBuying');
    expect(productDetail).toContain("'Chưa thể mua'");
  });

  it('uses the existing cart flow and opens checkout for only this product', () => {
    expect(productDetail).toContain(
      'repository.ensureProductInCart(product.id)',
    );
    expect(productDetail).toContain('setSyncedCartCount');
    expect(productDetail).toMatch(/selectedProductIds:\s*\[product\.id\]/);
    expect(productDetail).toContain('navigation.navigate(ROUTES.CHECKOUT');
  });
});
