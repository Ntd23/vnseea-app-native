const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('iOS Feed-style tab reselect screens', () => {
  const marketplace = read(
    'src/product/presentation/screens/MarketplaceScreen.tsx',
  );
  const profile = read(
    'src/profile/presentation/screens/ProfileScreen.tsx',
  );

  it('scrolls or refreshes Marketplace from its active iOS tab', () => {
    expect(marketplace).toContain(
      'const marketplaceListRef = useRef<FlatList<ProductItem>>(null)',
    );
    expect(marketplace).toContain(
      'getTabReselectAction(latestScrollYRef.current)',
    );
    expect(marketplace).toContain(
      'const handleMarketplaceTabReselect = useCallback',
    );
    expect(marketplace).toContain("Platform.OS !== 'ios'");
    expect(marketplace).toContain("navigation.addListener('tabPress'");
    expect(marketplace).toContain('if (!isMarketplaceFocused) return');
    expect(marketplace).toContain('marketplaceTabRefreshRef.current');
    expect(marketplace).toContain('reloadMarketplace()');
    expect(marketplace).toContain('ref={marketplaceListRef}');
  });

  it('refreshes own Profile metadata and posts from its active iOS tab', () => {
    expect(profile).toContain(
      'const profileListRef = useRef<FlashListRef<ProfileListItem>>(null)',
    );
    expect(profile).toContain(
      'const [isProfileRefreshing, setIsProfileRefreshing] = useState(false)',
    );
    expect(profile).toContain(
      'const refreshProfileContent = useCallback',
    );
    expect(profile).toContain('await Promise.all([');
    expect(profile).toContain(
      'getTabReselectAction(profileScrollYRef.current)',
    );
    expect(profile).toContain(
      'const handleProfileTabReselect = useCallback',
    );
    expect(profile).toContain("navigation.addListener('tabPress'");
    expect(profile).toContain(
      'if (!isProfileFocused || !isOwnProfile) return',
    );
    expect(profile).toContain('refreshControl={profileRefreshControl}');
    expect(profile).toContain('ref={profileListRef}');
  });
});
