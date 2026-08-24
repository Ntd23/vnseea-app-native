const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../../');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Profile message navigation', () => {
  it('pushes chat above Profile so Back returns to the profile', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');
    const handlerStart = source.indexOf('const handleOpenMessages');
    const handlerEnd = source.indexOf('const handleOpenProfileMore', handlerStart);
    const handler = source.slice(handlerStart, handlerEnd);

    expect(handler).toContain('navigation.navigate(ROUTES.CHAT, { chat });');
    expect(handler).not.toContain("if (Platform.OS === 'ios') {");
    expect(handler).not.toContain('navigation.replace(ROUTES.CHAT, { chat });');
    expect(handler).not.toContain('ROUTES.PROFILE_MORE');
  });
});
