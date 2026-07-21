const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../../');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Profile compact identity layout', () => {
  it('places the display name beside the avatar without rendering the username', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('style={profileMainStyles.identityBesideAvatar}');
    expect(source).toContain('{displayName || copy.userFallback}');
    expect(source).not.toContain('style={profileMainStyles.usernameText}');
    expect(source).not.toContain('handleCopyUsername');
  });

  it('does not render the friends section or its loading skeleton', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).not.toContain('profileFriendsSection');
    expect(source).not.toContain('handleOpenFriendsList');
    expect(source).not.toContain('friend-skeleton-');
  });

  it('keeps profile stats on one full-width line and shows follower avatars below', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('style={profileMainStyles.profileStatsFullWidth}');
    expect(source).toContain('minimumFontScale={0.78}');
    expect(source).toContain('numberOfLines={1}');
    expect(source).toContain('style={profileMainStyles.profileStatsLinkText}');
    expect(source).toContain('const profileFollowerPreview = useMemo(');
    expect(source).toContain("? 'Người theo dõi mình' : 'My followers'");
    expect(source).toContain('onPress={handleOpenFollowersList}');
    expect(source).toContain('onPress={handleOpenFollowingList}');
  });

  it('opens personal information editing directly without the profile media sheet', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('const handleEditPersonalDetails = useCallback(() => {');
    expect(source).toContain('navigation.navigate(ROUTES.EDIT_PROFILE);');
    expect(source).toContain('onPress={handleEditPersonalDetails}');
  });
});
