import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import { createOrdersRepository } from '../ApiOrdersRepository';

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: { post: jest.fn() },
}));

const post = apiBridge.post as jest.Mock;

describe('ApiOrdersRepository request orders', () => {
  beforeEach(() => post.mockReset());

  it('maps request flow metadata and uses the order hash as its stable identity', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      data: [
        {
          id: '91',
          order_hash_id: 'REQ-123',
          price: '250000',
          address: {
            name: 'Nguyễn Văn A',
            phone: '0900000000',
            address: '1 Nguyễn Huệ',
            city: 'Hồ Chí Minh',
            country: 'Việt Nam',
            zip: '700000',
          },
          orders: [
            {
              id: '92',
              hash_id: 'REQ-123',
              order_flow: 'request',
              stock_reserved: '0',
              status: 'placed',
              units: '1',
              product: { name: 'Áo khoác' },
            },
          ],
        },
      ],
    });

    const page = await createOrdersRepository().getSellerOrders();

    expect(page.items[0]).toMatchObject({
      id: 'REQ-123',
      code: '#REQ-123',
      orderFlow: 'request',
      stockReserved: false,
      shippingAddress: {
        name: 'Nguyễn Văn A',
        phone: '0900000000',
        address: '1 Nguyễn Huệ',
        city: 'Hồ Chí Minh',
        country: 'Việt Nam',
        zip: '700000',
      },
    });
  });

  it('normalizes the hash before changing order status', async () => {
    post.mockResolvedValueOnce({ api_status: 200 });

    await createOrdersRepository().changeOrderStatus('#REQ-123', 'accepted');

    expect(post).toHaveBeenCalledWith(expect.any(String), {
      type: 'change_status',
      hash_id: 'REQ-123',
      status: 'accepted',
    });
  });
});
