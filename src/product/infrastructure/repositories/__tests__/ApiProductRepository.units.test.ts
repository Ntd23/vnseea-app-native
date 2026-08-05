import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import { PRODUCT_UNITS_ERROR } from '../../../domain/validation/productValidation';
import { createProductRepository } from '../ApiProductRepository';

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    post: jest.fn(),
    multipart: jest.fn(),
  },
}));

const multipart = apiBridge.multipart as jest.Mock;
const post = apiBridge.post as jest.Mock;

const validInput = {
  product_title: 'Product',
  product_category: '1',
  product_description: 'Product description',
  product_price: '100',
  product_location: 'Ho Chi Minh City',
  images: [],
  units: 3,
};

describe('ApiProductRepository product quantity', () => {
  beforeEach(() => {
    multipart.mockReset();
    post.mockReset();
  });

  it.each(['createProduct', 'updateProduct'] as const)(
    'rejects non-positive quantity before %s calls the API',
    async method => {
      const repository = createProductRepository();

      await expect(
        repository[method]({
          ...validInput,
          ...(method === 'updateProduct' ? { product_id: 12 } : {}),
          units: 0,
        }),
      ).rejects.toThrow(PRODUCT_UNITS_ERROR);
      expect(multipart).not.toHaveBeenCalled();
    },
  );

  it('sends a validated positive quantity for both create and edit', async () => {
    multipart.mockResolvedValue({ api_status: 200, product_id: 12 });
    const repository = createProductRepository();

    await repository.createProduct(validInput);
    await repository.updateProduct({
      ...validInput,
      product_id: 12,
      units: 5,
    });

    expect(multipart).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({ units: 3 }),
    );
    expect(multipart).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({ product_id: 12, units: 5 }),
    );
  });

  it('sends the live API product point field for both create and edit', async () => {
    multipart.mockResolvedValue({ api_status: 200, product_id: 12 });
    const repository = createProductRepository();

    await repository.createProduct({ ...validInput, points: '50000' });
    await repository.updateProduct({
      ...validInput,
      product_id: 12,
      points: '75000',
    });

    expect(multipart).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({ product_point: '50000' }),
    );
    expect(multipart).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({ product_id: 12, product_point: '75000' }),
    );
  });

  it('normalizes the live API point response for product displays', async () => {
    post.mockResolvedValue({
      api_status: 200,
      products: [{ id: 12, point: 50000 }],
      products_categories: {},
    });
    const repository = createProductRepository();

    const response = await repository.getProducts();

    expect(response.products[0]).toEqual(
      expect.objectContaining({ id: 12, points: '50000' }),
    );
  });
});
