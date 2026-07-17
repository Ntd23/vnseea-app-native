const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../../');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Profile message navigation', () => {
  it('replaces the transparent profile route with full-screen chat on iOS', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');
    const handlerStart = source.indexOf('const handleOpenMessages');
    const handlerEnd = source.indexOf('const handleOpenProfileMore', handlerStart);
    const handler = source.slice(handlerStart, handlerEnd);

    expect(handler).toContain("if (Platform.OS === 'ios') {");
    expect(handler).toContain('navigation.replace(ROUTES.CHAT, { chat });');
    expect(handler).toContain('navigation.navigate(ROUTES.CHAT, { chat });');
    expect(handler.indexOf('navigation.replace(ROUTES.CHAT, { chat });')).toBeLessThan(
      handler.indexOf('navigation.navigate(ROUTES.CHAT, { chat });'),
    );
    expect(handler).not.toContain('ROUTES.PROFILE_MORE');
  });
});
