const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('iOS full-bottom layout guard', () => {
  it('removes the Home floating create-post FAB', () => {
    const source = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(source).not.toContain('FEED_CREATE_POST_FAB_STYLES');
    expect(source).not.toContain('AdaptiveGlassSurface');
  });

  it('uses explicit platform-aware root safe-area edges on screens that previously used bottom/default edges', () => {
    const files = [
      'src/auth/presentation/screens/LoginScreen.tsx',
      'src/auth/presentation/screens/ForgotPasswordScreen.tsx',
      'src/auth/presentation/screens/RegisterScreen.tsx',
      'src/blogs/presentation/screens/BlogDetailScreen.tsx',
      'src/feed/presentation/screens/FeedScreen.tsx',
      'src/messages/presentation/screens/CallRoomScreen.tsx',
      'src/messages/presentation/screens/ChatScreen.tsx',
      'src/messages/presentation/screens/GroupCallRoomScreen.tsx',
      'src/pages/presentation/screens/PageSettingsScreen.tsx',
      'src/reels/presentation/screens/CreateReelScreen.tsx',
      'src/stories/presentation/screens/StoryViewerScreen.tsx',
    ];

    for (const file of files) {
      const source = read(file);
      expect(source).toContain('ROOT_SAFE_AREA_EDGES');
      expect(source).not.toMatch(/<SafeAreaView(?![^>]*edges=)/);
      expect(source).not.toContain("edges={['top', 'bottom']}");
    }
  });
});
