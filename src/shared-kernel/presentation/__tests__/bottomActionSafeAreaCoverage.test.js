const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../../..');

const read = relativePath =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

describe('bottom action safe-area coverage', () => {
  it.each([
    'src/checkout/presentation/screens/CartScreen.tsx',
    'src/product/presentation/screens/CreateProductScreen.tsx',
    'src/photos/presentation/screens/CreateAlbumScreen.tsx',
    'src/blogs/presentation/screens/CreateBlogScreen.tsx',
    'src/blogs/presentation/screens/BlogFilterCategoryScreen.tsx',
  ])('%s derives fixed footer and scroll clearance from the system inset', file => {
    expect(read(file)).toContain('useFixedBottomLayout');
  });

  it.each([
    'src/shared-kernel/presentation/components/PostMenuActionSheet.tsx',
    'src/shared-kernel/presentation/components/ShareActionSheet.tsx',
    'src/shared-kernel/presentation/components/ColorPicker.tsx',
    'src/pages/presentation/components/PageDetailMenuActionSheet.tsx',
    'src/pages/presentation/components/PagePostMenuActionSheet.tsx',
    'src/pages/presentation/components/PageShareActionSheet.tsx',
    'src/community/presentation/screens/GroupPostMenuActionSheet.tsx',
    'src/community/presentation/screens/GroupDetailScreen.tsx',
    'src/pages/presentation/screens/PageDetailScreen.tsx',
    'src/explore/presentation/screens/ExploreScreen.tsx',
    'src/withdrawal/presentation/screens/WithdrawalScreen.tsx',
  ])('%s derives bottom-sheet padding from the system inset', file => {
    expect(read(file)).toContain('useSafeBottomPadding');
  });

  it('keeps the final Android profile post above the system navigation bar', () => {
    const profile = read(
      'src/profile/presentation/screens/ProfileScreen.tsx',
    );

    expect(profile).toContain('useSafeBottomPadding');
    expect(profile).toContain('profilePostsBottomPadding');
    expect(profile).toContain('Platform.OS === \'android\'');
  });

  it('does not add the shared footer primitive to intentional full-screen media', () => {
    for (const file of [
      'src/stories/presentation/screens/StoryViewerScreen.tsx',
      'src/reels/presentation/screens/ReelsScreen.tsx',
      'src/messages/presentation/screens/CallRoomScreen.tsx',
      'src/messages/presentation/screens/GroupCallRoomScreen.tsx',
    ]) {
      const source = read(file);
      expect(source).not.toContain('useFixedBottomLayout');
      expect(source).not.toContain('useSafeBottomPadding');
    }
  });
});
