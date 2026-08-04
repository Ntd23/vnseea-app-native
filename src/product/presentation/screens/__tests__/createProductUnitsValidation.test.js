const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('create product quantity validation wiring', () => {
  const screen = read(
    'src/product/presentation/screens/CreateProductScreen.tsx',
  );
  const viewModel = read(
    'src/product/application/view-models/useProductViewModel.ts',
  );

  it('blocks the publish button before submit when quantity is invalid', () => {
    expect(screen).toContain('const handleSubmitProduct = useCallback(() =>');
    expect(screen).toContain(
      'if (parsePositiveProductUnits(formData.units) === null)',
    );
    expect(screen).toContain(
      "Alert.alert('Số lượng không hợp lệ', PRODUCT_UNITS_ERROR)",
    );
    expect(screen).toContain('onPress={handleSubmitProduct}');
  });

  it('keeps the same guard inside the view model before calling the repository', () => {
    expect(viewModel).toContain(
      'if (!validateAll(state.formData) || units === null)',
    );
    expect(viewModel).toContain('setSubmitError(PRODUCT_UNITS_ERROR)');
    expect(
      viewModel.indexOf('if (!validateAll(state.formData) || units === null)'),
    ).toBeLessThan(viewModel.indexOf('await repository.createProduct(input)'));
  });
});
