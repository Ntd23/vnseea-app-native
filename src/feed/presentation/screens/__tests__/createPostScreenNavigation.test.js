const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Create Post screen navigation', () => {
  const feedSource = read(
    'src/feed/presentation/screens/FeedScreen.tsx',
  );
  const createPostSource = read(
    'src/feed/presentation/screens/CreatePostScreen.tsx',
  );
  const appNavigatorSource = read('src/navigation/AppNavigator.tsx');

  it('opens the Create Post stack route from the Feed composer', () => {
    expect(feedSource).toContain(
      "const initialAction = typeof action === 'string'",
    );
    expect(feedSource).toMatch(
      /\(navigation as any\)\.navigate\(\s*ROUTES\.CREATE_POST/,
    );
    expect(feedSource).toContain(
      'onCreatePostPress={openCreatePost}',
    );
    expect(feedSource).toContain(
      'onCreatePostPressAction={goToCreatePost}',
    );
    expect(feedSource).not.toContain('composerModalVisible');
    expect(feedSource).not.toContain('<CreatePostModal');
  });

  it('renders the standalone route as a full screen instead of a popup', () => {
    expect(createPostSource).toContain(
      "presentation?: 'modal' | 'screen'",
    );
    expect(createPostSource).toContain(
      "if (presentation === 'screen')",
    );
    expect(createPostSource).toContain('presentation="screen"');
    expect(createPostSource).toContain(
      "<SafeAreaView",
    );
    expect(createPostSource).toContain('<ComposerActionTray');
    expect(createPostSource).toContain('<CreateActionSheet');
    expect(createPostSource).toContain('visible={moreSheetVisible}');
    expect(createPostSource).toContain('showPrimaryActions={false}');
    expect(appNavigatorSource).not.toMatch(
      /const TRANSPARENT_MODAL_ROUTES:[\s\S]*new Set\(\[[\s\S]*ROUTES\.CREATE_POST/,
    );
  });
});
