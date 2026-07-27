const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('CreatePostModal keyboard safety', () => {
  it('uses the shared Android OEM fallback for the transparent modal', () => {
    const source = read(
      'src/feed/presentation/screens/CreatePostScreen.tsx',
    );
    const keyboardSafeView = read(
      'src/shared-kernel/presentation/components/KeyboardSafeView.tsx',
    );

    expect(source).toContain(
      "import { KeyboardSafeView } from '../../../shared-kernel/presentation/components/KeyboardSafeView';",
    );
    expect(source).toContain('<KeyboardSafeView');
    expect(source).not.toContain('<KeyboardAvoidingView');
    expect(keyboardSafeView).toContain(
      "Platform.OS === 'ios' ? 'padding' : 'height'",
    );
  });
});
