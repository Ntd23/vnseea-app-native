jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    post: jest.fn(),
  },
}));

import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import { createOffersRepository } from '../ApiOffersRepository';

describe('ApiOffersRepository navigation fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps product, post and URL destinations from the backend payload', async () => {
    (apiBridge.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: [
        {
          id: '5',
          page_id: '7',
          user_id: '9',
          product: { id: '31' },
          post_id: '88',
          url: 'https://v2.vnseea.vn/post/88',
          discount_type: 'discount_percent',
          discount_percent: '20',
        },
      ],
    });

    const offers = await createOffersRepository().getOffers();

    expect(offers).toHaveLength(1);
    expect(offers[0]).toEqual(
      expect.objectContaining({
        id: 5,
        productId: 31,
        postId: 88,
        url: 'https://v2.vnseea.vn/post/88',
      }),
    );
  });
});
