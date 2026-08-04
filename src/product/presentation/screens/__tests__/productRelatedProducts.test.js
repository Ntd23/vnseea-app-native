const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    'src/product/presentation/screens/ProductDetailScreen.tsx',
  ),
  'utf8',
);

describe('Product detail related products', () => {
  it('renders only real related products returned by the API', () => {
    expect(source).toContain('products.map((item) =>');
    expect(source).toContain("if (!loading && products.length === 0) return null;");
    expect(source).not.toContain('currentProduct.name + " - Premium"');
    expect(source).not.toContain('currentProduct.name + " - Lite"');
    expect(source).not.toContain('id: 9991');
    expect(source).not.toContain('id: 9992');
  });
});
