const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('brand chrome contract', () => {
  it('uses the shared soft red token for the active bottom-tab pill', () => {
    const source = read('src/navigation/MainTabNavigator.tsx');

    expect(source).toContain('const BRAND_LIGHT_BG = APP_COLORS.brand.soft;');
    expect(source).not.toContain("rgba(37, 99, 255, 0.08)");
  });

  it('uses red sent bubbles with readable primary and metadata text', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(source).toContain("'rounded-2xl rounded-br-md bg-brand px-3 py-2'");
    expect(source).toContain("isSentByMe && !replyInfo ? 'text-white'");
    expect(source).toMatch(/isSentByMe\s*\? 'text-brand-on-muted'\s*:\s*'text-gray-500'/);
    expect(source).not.toContain("isSentByMe\n                          ? 'text-blue-100'");
  });

  it('uses red soft focus chrome in authentication fields', () => {
    const source = read('src/auth/presentation/components/AuthTextField.tsx');

    expect(source).toContain('APP_COLORS.brand.border');
    expect(source).not.toContain("rgba(0, 0, 255, 0.12)");
  });

  it('passes the shared red theme into React Navigation', () => {
    const navigator = read('src/navigation/AppNavigator.tsx');
    const theme = read('src/navigation/navigationTheme.ts');

    expect(navigator).toContain('theme={VNSEEA_NAVIGATION_THEME}');
    expect(theme).toContain('primary: APP_COLORS.brand.primary');
    expect(theme).toContain('background: APP_COLORS.neutral.base');
    expect(theme).toContain('notification: APP_COLORS.status.error');
  });
});
