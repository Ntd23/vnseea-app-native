const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('ChatScreen input safe area', () => {
  it('adds iOS bottom safe-area padding only while the keyboard is hidden', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(source).toContain("from 'react-native-safe-area-context';");
    expect(source).toContain('SafeAreaView,');
    expect(source).toContain('useSafeAreaInsets,');
    expect(source).toContain('const insets = useSafeAreaInsets();');
    expect(source).toContain('const chatInputBarStyle = useMemo(');
    expect(source).toContain("Platform.OS === 'ios' && !isKeyboardVisible");
    expect(source).toContain('paddingBottom:');
    expect(source).toContain('Math.max(insets.bottom + 6, 12)');
    expect(source).toContain('paddingBottom: 8');
    expect(source).toContain('style={chatInputBarStyle}');
  });

  it('uses one cross-platform keyboard boundary without applying the bottom inset twice', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(source).toContain('const CHAT_SAFE_AREA_EDGES: Edge[] =');
    expect(source).toContain("Platform.OS === 'ios' ? ['top', 'left', 'right'] : ROOT_SAFE_AREA_EDGES");
    expect(source).toContain('edges={CHAT_SAFE_AREA_EDGES}');
    expect(source).toContain("import { KeyboardSafeView } from '../../../shared-kernel/presentation/components/KeyboardSafeView';");
    expect(source).toContain('<KeyboardSafeView');
    expect(source).toContain('style={styles.keyboardBoundary}');
    expect(source).toContain('behavior="padding"');
    expect(source).toContain('keyboardVerticalOffset={0}');
    expect(source).not.toContain('<KeyboardAvoidingView');
    expect(source).toMatch(
      /Keyboard\.addListener\(\s*'keyboardWillChangeFrame'/,
    );
    expect(source).toMatch(/Keyboard\.addListener\(\s*'keyboardWillHide'/);
    expect(source).toMatch(
      /keyboardDismissMode=\{\s*Platform\.OS === 'ios'\s*\? 'interactive'\s*: 'on-drag'\s*\}/,
    );
    expect(source).toContain('onFocus={handleComposerFocus}');
  });
});
