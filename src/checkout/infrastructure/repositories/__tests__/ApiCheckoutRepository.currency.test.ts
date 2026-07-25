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
          stock_units: '7',
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
        maxQuantity: 7,
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

  it('deletes an owned address and reloads the remaining addresses', async () => {
    post
      .mockResolvedValueOnce({
        api_status: 200,
        message: 'address successfully deleted',
      })
      .mockResolvedValueOnce({
        api_status: 200,
        data: [
          {
            id: '8',
            name: 'Nguyễn Văn A',
            phone: '0900000000',
            country: 'Việt Nam',
            city: 'Hà Nội',
            zip: '10000',
            address: 'Số 8',
          },
        ],
      });

    const addresses = await createCheckoutRepository().deleteAddress('9');

    expect(post).toHaveBeenNthCalledWith(1, 'address', {
      type: 'delete',
      id: '9',
    });
    expect(post).toHaveBeenNthCalledWith(2, 'address', {
      type: 'get',
      limit: 50,
    });
    expect(addresses).toEqual([
      expect.objectContaining({ id: '8', address: 'Số 8' }),
    ]);
  });
});
