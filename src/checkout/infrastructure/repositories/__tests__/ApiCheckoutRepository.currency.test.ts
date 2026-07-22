import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import { createCheckoutRepository } from '../ApiCheckoutRepository';

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    post: jest.fn(),
  },
}));

const post = apiBridge.post as jest.Mock;

describe('ApiCheckoutRepository product currencies', () => {
  beforeEach(() => post.mockReset());

  it('keeps each product price in its original currency and groups totals by currency', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      total: 12,
      currency_code: 'VNSEEA',
      currency_symbol: 'VNSEEA',
      data: [
        {
          id: '11',
          name: 'Sản phẩm VND',
          price: '125000',
          units: '2',
          currency_code: 'VND',
          currency_symbol: '₫',
        },
        {
          id: '12',
          name: 'Sản phẩm USD',
          price: '20',
          units: '1',
          currency_code: 'USD',
          currency_symbol: '$',
        },
      ],
    });

    const summary = await createCheckoutRepository().getSummary();

    expect(summary.items).toEqual([
      expect.objectContaining({
        productId: 11,
        price: 125000,
        total: 250000,
        currencyCode: 'VND',
        currencySymbol: '₫',
      }),
      expect.objectContaining({
        productId: 12,
        price: 20,
        total: 20,
        currencyCode: 'USD',
        currencySymbol: '$',
      }),
    ]);
    expect(summary.currencyTotals).toEqual([
      { currencyCode: 'VND', currencySymbol: '₫', amount: 250000 },
      { currencyCode: 'USD', currencySymbol: '$', amount: 20 },
    ]);
  });
});
