const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('ChatScreen input safe area', () => {
  it('adds iOS bottom safe-area padding only while the keyboard is hidden', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(source).toContain(
      "import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';",
    );
    expect(source).toContain('const insets = useSafeAreaInsets();');
    expect(source).toContain('const chatInputBarStyle = useMemo(');
    expect(source).toContain("Platform.OS === 'ios' && !isKeyboardVisible");
    expect(source).toContain('paddingBottom:');
    expect(source).toContain('Math.max(insets.bottom + 6, 12)');
    expect(source).toContain('paddingBottom: 8');
    expect(source).toContain('style={chatInputBarStyle}');
  });
});
