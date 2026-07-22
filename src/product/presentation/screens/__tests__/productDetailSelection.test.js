const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const productDetailSource = fs.readFileSync(
  path.join(
    projectRoot,
    'src/product/presentation/screens/ProductDetailScreen.tsx',
  ),
  'utf8',
);

const {
  findRequestedProduct,
} = require('../../../application/findRequestedProduct');

describe('Product detail selection', () => {
  it('selects the requested product instead of the first API result', () => {
    const products = [
      { id: 902, name: 'Newest product' },
      { id: 417, name: 'Selected product' },
    ];

    expect(findRequestedProduct(products, 417)).toEqual(products[1]);
    expect(findRequestedProduct(products, 999)).toBeUndefined();
  });

  it('does not let an unrelated API result overwrite the routed product', () => {
    expect(productDetailSource).toMatch(
      /findRequestedProduct\(\s*response\.products,\s*productId,\s*\)/,
    );
    expect(productDetailSource).not.toContain(
      'setProduct(response.products[0])',
    );
  });
});
