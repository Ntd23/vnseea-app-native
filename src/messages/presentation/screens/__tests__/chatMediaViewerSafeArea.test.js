const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const read = relativePath =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

describe('Chat media viewer safe area', () => {
  it('uses explicit modal insets and a downward-only dismiss gesture', () => {
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');
    const viewer = read(
      'src/messages/presentation/components/ChatMediaViewerModal.tsx',
    );

    expect(chat).toContain('<ChatMediaViewerModal');
    expect(viewer).toContain('presentationStyle="overFullScreen"');
    expect(viewer).toContain("barStyle=\"light-content\"");
    expect(viewer).toContain('useSafeAreaInsets()');
    expect(viewer).toContain('paddingTop: Math.max(insets.top, 12)');
    expect(viewer).toContain('statusBarTranslucent');
    expect(viewer).toContain('items.length > 0 ? (');
    expect(viewer).toContain('<GestureHandlerRootView');
    expect(viewer).toContain('<GestureDetector gesture={dismissGesture}>');
    expect(viewer).toContain('getChatMediaDismissTranslation');
    expect(viewer).toContain('shouldDismissChatMedia');
  });
});
