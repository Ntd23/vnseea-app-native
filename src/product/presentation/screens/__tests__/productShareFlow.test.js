const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('product share flow', () => {
  it('shares marketplace products and product details through the common sheet', () => {
    const marketplace = read('src/product/presentation/screens/MarketplaceScreen.tsx');
    const detail = read('src/product/presentation/screens/ProductDetailScreen.tsx');
    const card = read('src/product/presentation/components/ProductPostCard.tsx');

    expect(marketplace).toContain(
      'onShare={Number(item.post_id) > 0 ? handleShareProduct : undefined}',
    );
    expect(marketplace).toContain('<ProductShareBottomSheet');
    expect(detail).toContain('accessibilityLabel="Chia sẻ sản phẩm"');
    expect(detail).toContain('<ProductShareBottomSheet');
    expect(card).toContain('styles.compactShareButton');
    expect(card).toContain('event?.stopPropagation()');
  });
});
