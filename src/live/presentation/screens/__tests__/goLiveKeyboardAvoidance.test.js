const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Go Live keyboard avoidance', () => {
  it('keeps the live title field above the keyboard on Android', () => {
    const source = read('src/live/presentation/screens/GoLiveScreen.tsx');

    expect(source).toContain(
      "import { KeyboardSafeView } from '../../../shared-kernel/presentation/components/KeyboardSafeView';",
    );
    expect(source).toContain('<KeyboardSafeView');
    expect(source).toContain('style={StyleSheet.absoluteFill}');
    expect(source).toContain(
      "behavior={Platform.OS === 'ios' ? 'padding' : 'height'}",
    );
    expect(source).toContain(
      "keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}",
    );
    expect(source).toContain('returnKeyType="done"');
  });
});
