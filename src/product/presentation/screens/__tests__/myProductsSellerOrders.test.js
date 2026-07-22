const fs = require('fs');
const path = require('path');

const SCREEN = path.resolve(__dirname, '../MyProductsScreen.tsx');
const VIEW_MODEL = path.resolve(
  __dirname,
  '../../../application/view-models/useMyProductsViewModel.ts',
);

describe('seller marketplace orders', () => {
  it('keeps seller orders as a separate tab instead of redirecting to purchases', () => {
    const source = fs.readFileSync(SCREEN, 'utf8');

    expect(source).toContain("{ key: 'orders', label: 'Đơn bán' }");
    expect(source).not.toContain("route.params.initialTab === 'orders'");
    expect(source).toContain("vm.activeTab === 'orders'");
  });

  it('loads and filters seller orders independently', () => {
    const source = fs.readFileSync(VIEW_MODEL, 'utf8');

    expect(source).toContain('ordersRepository.getSellerOrders');
    expect(source).toMatch(/sellerOrders\s*\.filter/);
    expect(source).toContain('order.code');
  });
});
