const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Marketplace VNSEEA point price', () => {
  const createScreen = read(
    'src/product/presentation/screens/CreateProductScreen.tsx',
  );
  const viewModel = read(
    'src/product/application/view-models/useProductViewModel.ts',
  );
  const repository = read(
    'src/product/infrastructure/repositories/ApiProductRepository.ts',
  );
  const productCard = read(
    'src/product/presentation/components/ProductPostCard.tsx',
  );
  const productDetail = read(
    'src/product/presentation/screens/ProductDetailScreen.tsx',
  );

  it('adds an optional VNSEEA point-price input to the product form', () => {
    expect(createScreen).toContain('Giá điểm VNSEEA (không bắt buộc)');
    expect(createScreen).toContain('value={formData.points}');
    expect(createScreen).toContain("updateFormData('points', val)");
    expect(viewModel).toContain("points: ''");
    expect(viewModel).toContain('formData.points.trim() &&');
  });

  it('passes the existing point field through create and edit requests', () => {
    expect(viewModel).toContain('points: state.formData.points.trim()');
    expect(repository).toContain('formData.product_point = input.points');
    expect(repository).toContain('record.point ??');
  });

  it('shows VNSEEA below VND on every product card that has a point price', () => {
    expect(productCard).toContain('formatProductPoints(product)');
    expect(productCard).not.toContain(
      'marketplaceFloatingActions && productPointsLabel',
    );
    expect(productCard).toContain('productPointsLabel ? (');
    expect(productCard).toContain('{productPointsLabel}');
  });

  it('shows VNSEEA below VND on product detail and related products', () => {
    expect(productDetail).toContain('formatProductPoints(product)');
    expect(productDetail).toContain('{pointsLabel}');
  });
});
