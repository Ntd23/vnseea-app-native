import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import { createMessagesRepository } from '../ApiMessagesRepository';

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    post: jest.fn(),
    multipart: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: { webBaseUrl: 'https://v2.vnseea.vn' },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: { getSession: () => ({ userId: '1' }) },
  }),
);

const post = apiBridge.post as jest.Mock;

function rawMessage(overrides: Record<string, unknown>) {
  return {
    id: '91',
    from_id: '2',
    to_id: '1',
    or_text: '',
    time: 100,
    seen: 1,
    ...overrides,
  };
}

describe('ApiMessagesRepository marketplace contexts', () => {
  beforeEach(() => post.mockReset());

  it('maps a canonical product inquiry and keeps its note', async () => {
    post.mockResolvedValueOnce({
      messages: [
        rawMessage({
          product_id: '17',
          type_two: 'product_inquiry',
          or_text: 'Sản phẩm này còn không?',
          product: {
            id: '17',
            name: 'Áo khoác',
            price_format: '250.000 đ',
            location: 'Hà Nội',
            images: [{ image: 'https://cdn.vnseea.vn/coat.jpg' }],
          },
        }),
      ],
    });

    const [message] = await createMessagesRepository().getMessages('2');

    expect(message.contentKind).toBe('product');
    expect(message.marketplaceContext).toEqual({
      type: 'product_inquiry',
      productId: '17',
      name: 'Áo khoác',
      price: '250.000 đ',
      image: 'https://cdn.vnseea.vn/coat.jpg',
      location: 'Hà Nội',
      note: 'Sản phẩm này còn không?',
    });
  });

  it('maps a canonical order request and marks the preview as order', async () => {
    post.mockResolvedValueOnce({
      data: [
        {
          chat_type: 'user',
          chat_id: '2',
          user_data: { user_id: '2', name: 'Người mua' },
          last_message: rawMessage({
            type_two: 'market_order_request',
            market_order_hash: 'ORDER-123',
            market_order: {
              order_hash: 'ORDER-123',
              buyer_name: 'Người mua',
              buyer_phone: '0900000000',
              buyer_address: 'Hà Nội',
              total: '500.000 đ',
              items: [
                {
                  product_id: '17',
                  name: 'Áo khoác',
                  quantity: 2,
                  total: '500.000 đ',
                },
              ],
            },
          }),
        },
      ],
    });

    const [chat] = await createMessagesRepository().getChats({
      includeDiscovery: false,
      latestOnly: true,
    });

    expect(chat.lastMessageKind).toBe('order');
    expect(chat.lastMessage).toContain('ORDER-123');
  });

  it('maps legacy order text for conversation previews and nested replies', async () => {
    const legacyOrder = [
      'Tôi muốn đặt mua sản phẩm:',
      '👉 *Áo khoác*',
      '💰 Giá: *500.000 đ*',
      '🔢 Số lượng: *2*',
      '🆔 ID: *17*',
      '📷 Ảnh: https://cdn.vnseea.vn/coat.jpg',
      '👤 Tên: *Người mua*',
      '📞 SĐT: *0900000000*',
      '🏠 Địa chỉ: *Hà Nội*',
    ].join('\n');

    post
      .mockResolvedValueOnce({
        data: [
          {
            chat_type: 'user',
            chat_id: '2',
            user_data: { user_id: '2', name: 'Người mua' },
            last_message: rawMessage({ or_text: legacyOrder }),
          },
        ],
      })
      .mockResolvedValueOnce({
        messages: [
          rawMessage({
            or_text: 'Tôi đồng ý',
            reply: rawMessage({ id: '90', or_text: legacyOrder }),
          }),
        ],
      });

    const [chat] = await createMessagesRepository().getChats({
      includeDiscovery: false,
      latestOnly: true,
    });
    const [replyMessage] = await createMessagesRepository().getMessages('2');

    expect(chat.lastMessageKind).toBe('order');
    expect(chat.lastMessage).toContain('17');
    expect(replyMessage.replyTo?.contentKind).toBe('order');
    expect(replyMessage.replyTo?.marketplaceContext).toMatchObject({
      type: 'order_request',
      orderHash: '17',
      buyerName: 'Người mua',
      buyerPhone: '0900000000',
      buyerAddress: 'Hà Nội',
    });
  });

  it('sends a product inquiry with structured product metadata', async () => {
    post.mockResolvedValueOnce({ api_status: 200, message_data: [] });

    await createMessagesRepository().sendMessage(
      '2',
      'Sản phẩm này còn không?',
      undefined,
      {
        productInquiry: {
          productId: '17',
          note: 'Sản phẩm này còn không?',
        },
      },
    );

    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        user_id: '2',
        text: 'Sản phẩm này còn không?',
        product_id: '17',
        message_type: 'product_inquiry',
        type_two: 'product_inquiry',
      }),
    );
  });
});
