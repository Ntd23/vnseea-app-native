const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../CreatePageScreen.tsx'),
  'utf8',
);

describe('CreatePageScreen bottom safe-area ownership', () => {
  it('keeps the footer actions above Android three-button navigation', () => {
    expect(source).toContain('useSafeAreaInsets');
    expect(source).toContain('const insets = useSafeAreaInsets();');
    expect(source).toContain('paddingBottom: 110 + insets.bottom');
    expect(source).toContain('height: 72 + insets.bottom');
    expect(source).toContain('paddingBottom: insets.bottom');
  });
});
