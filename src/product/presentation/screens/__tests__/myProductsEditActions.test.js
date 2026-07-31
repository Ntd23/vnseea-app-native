const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('product owner edit actions', () => {
  const card = read(
    'src/product/presentation/components/ProductPostCard.tsx',
  );
  const myProducts = read(
    'src/product/presentation/screens/MyProductsScreen.tsx',
  );
  const detail = read(
    'src/product/presentation/screens/ProductDetailScreen.tsx',
  );

  it('places an edit action beside delete on owned product cards', () => {
    expect(card).toContain('onEdit?: (product: ProductItem) => void;');
    expect(card).toContain('style={styles.compactOwnerActions}');
    expect(card).toContain('styles.compactEditButton');
    expect(card).toContain('styles.compactDeleteButton');
    expect(myProducts).toContain(
      'onEdit={item.is_owner ? handleEditProduct : undefined}',
    );
    expect(myProducts).toContain(
      'navigation.navigate(ROUTES.EDIT_PRODUCT, { product });',
    );
  });

  it('uses a prominent full-width brand edit button on product detail', () => {
    expect(detail).toContain('accessibilityLabel="Chỉnh sửa sản phẩm"');
    expect(detail).toContain('justifyContent: \'center\'');
    expect(detail).toContain('minHeight: 54');
    expect(detail).toContain('backgroundColor: APP_BRAND_COLOR');
    expect(detail).toContain('<Pencil size={20} color="#FFFFFF"');
  });
});
