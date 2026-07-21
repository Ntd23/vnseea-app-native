const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../../');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Profile connections screen', () => {
  it('opens followers and following with the requested initial tab', () => {
    const profile = read('src/profile/presentation/screens/ProfileScreen.tsx');
    const connections = read(
      'src/profile/presentation/screens/ProfileFriendsScreen.tsx',
    );
    const navigationTypes = read('src/navigation/types.ts');

    expect(profile).toContain("handleOpenConnections('followers')");
    expect(profile).toContain("handleOpenConnections('following')");
    expect(profile).toContain('setProfileConnectionsSnapshot(');
    expect(profile).not.toContain('initialFollowers: followers.filter');
    expect(profile).not.toContain('initialFollowing: following.filter');
    expect(connections).toContain('getProfileConnectionsSnapshot(userId)');
    expect(connections).toContain("initialTab = 'followers'");
    expect(connections).toContain("type ConnectionTab = 'followers' | 'following' | 'friends';");
    expect(navigationTypes).toContain("initialTab?: 'followers' | 'following' | 'friends';");
  });

  it('uses seeded profile data immediately and supports native horizontal paging', () => {
    const source = read(
      'src/profile/presentation/screens/ProfileFriendsScreen.tsx',
    );

    expect(source).toContain("from 'react-native-pager-view'");
    expect(source).toContain('<PagerView');
    expect(source).toContain('onPageSelected={handlePageSelected}');
    expect(source).toContain('pagerRef.current?.setPage(nextPage);');
    expect(source).toContain('setIsLoading] = useState(!hasSeededConnections)');
    expect(source).toContain('const [mountedTabs, setMountedTabs]');
    expect(source).toContain('InteractionManager.runAfterInteractions');
    expect(source).toContain('mountedTabs.has(tab)');
    expect(source).toContain("loadConnections('refresh', tab)");
    expect(source).toContain("loadConnections('more', tab)");
  });

  it('provides relationship-specific three-dot menus backed by real actions', () => {
    const source = read(
      'src/profile/presentation/screens/ProfileFriendsScreen.tsx',
    );

    expect(source).toContain('setSelectedUserTab(tab);');
    expect(source).toContain('setSelectedUser(item);');
    expect(source).toContain("menuTab === 'followers' && !selectedUserIsFollowing");
    expect(source).toContain('copy.followBack');
    expect(source).toContain('copy.unfollow(');
    expect(source).toContain('navigation.navigate(ROUTES.CHAT, { chat });');
    expect(source).toContain('apiRoutes.social.follow');
    expect(source).toContain("block_action: 'block'");
  });
});
