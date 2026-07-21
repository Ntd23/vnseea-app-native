const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const read = relativePath =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

describe('Chat media viewer safe area', () => {
  it('uses a dedicated full-screen viewer with one safe-area owner', () => {
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');
    const viewer = read(
      'src/messages/presentation/components/ChatMediaViewerModal.tsx',
    );

    expect(chat).toContain('<ChatMediaViewerModal');
    expect(viewer).toContain('presentationStyle="fullScreen"');
    expect(viewer).toContain("barStyle=\"light-content\"");
    expect(viewer).toContain("edges={['top', 'right', 'bottom', 'left']}");
    expect(viewer).not.toContain('statusBarTranslucent');
  });
});
