const fs = require('fs');
const path = require('path');

const CHAT_SCREEN = path.resolve(__dirname, '../ChatScreen.tsx');
const MESSAGE_SCREEN = path.resolve(__dirname, '../MessageScreen.tsx');

describe('marketplace message previews', () => {
  it('renders canonical product inquiries and order requests before legacy text fallbacks', () => {
    const source = fs.readFileSync(CHAT_SCREEN, 'utf8');

    expect(source).toContain("message.marketplaceContext?.type === 'order_request'");
    expect(source).toContain("message.marketplaceContext?.type === 'product_inquiry'");
    expect(source).toContain('order.items.map');
    expect(source).toContain('order.orderHash');
  });

  it('sends new product inquiries through structured metadata instead of a text template', () => {
    const source = fs.readFileSync(CHAT_SCREEN, 'utf8');

    expect(source).toContain('productInquiry: {');
    expect(source).toContain('productId: String(attachedProduct.id)');
    expect(source).not.toContain('🛍️ *Tôi muốn hỏi về sản phẩm:*');
  });

  it('has a dedicated conversation-list preview for order requests', () => {
    const source = fs.readFileSync(MESSAGE_SCREEN, 'utf8');

    expect(source).toContain("case 'order':");
    expect(source).toContain('Yêu cầu mua mới');
    expect(source).toContain('Bạn đã gửi yêu cầu mua');
  });
});
