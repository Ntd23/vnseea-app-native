const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('marketplace order notification badges', () => {
  const marketplace = read(
    'src/product/presentation/screens/MarketplaceScreen.tsx',
  );
  const myProducts = read(
    'src/product/presentation/screens/MyProductsScreen.tsx',
  );
  const mainTabs = read('src/navigation/MainTabNavigator.tsx');

  it('shows an order notification action beside My Products', () => {
    expect(marketplace).toContain('Thông báo đơn hàng');
    expect(marketplace).toContain('useOrderNotificationBadges');
    expect(marketplace).toContain(
      'className="w-full flex-row items-center justify-between"',
    );
    expect(marketplace).toContain('const MARKETPLACE_HEADER_ACTION_STYLE = {');
    expect(marketplace).toContain("width: '49%'");
    expect(
      marketplace.match(/style=\{MARKETPLACE_HEADER_ACTION_STYLE\}/g),
    ).toHaveLength(2);
    expect(marketplace).toContain(
      "orderBadges.preferredMode === 'seller' ? 'orders' : 'purchased'",
    );
  });

  it('uses the aggregate order badge for the iOS Marketplace tab', () => {
    expect(mainTabs).toContain('useOrderNotificationBadges');
    expect(mainTabs).toContain('orderBadges.totalCount');
    expect(mainTabs).not.toContain('useSyncedCartCount');
  });

  it('shows independent badges and marks an opened order tab as read', () => {
    expect(myProducts).toContain('orderBadges.purchasedCount');
    expect(myProducts).toContain('orderBadges.sellerCount');
    expect(myProducts).toContain('markOrderNotificationModeRead');
    expect(myProducts).toContain("vm.activeTab === 'purchased'");
    expect(myProducts).toContain("vm.activeTab === 'orders'");
  });
});
