const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Notifications stack presentation on iOS', () => {
  it('shows a Back action outside tab presentation', () => {
    const screen = read('src/notifications/presentation/screens/NotificationsScreen.tsx');
    const header = read('src/notifications/presentation/components/NotificationsHeader.tsx');

    expect(screen).toContain("const isTabRoute = navigatorType === 'tab'");
    expect(screen).toContain('onBackPress={!isTabRoute ? handleBackPress : undefined}');
    expect(header).toContain('onBackPress?: () => void');
    expect(header).toContain('<ArrowLeft');
  });

  it('does not apply tab-only bottom padding or scroll publishing in stack mode', () => {
    const source = read('src/notifications/presentation/screens/NotificationsScreen.tsx');

    expect(source).toMatch(
      /const notificationsBottomContentPadding = isTabRoute\s*\? bottomContentPadding/,
    );
    expect(source).toContain("if (Platform.OS !== 'ios' || !isTabRoute)");
    expect(source).toContain('isTabRoute ? scrollIndicatorBottomInset : 0');
  });

  it('falls back to Feed when the notification stack cannot go back', () => {
    const source = read('src/notifications/presentation/screens/NotificationsScreen.tsx');

    expect(source).toContain('if (navigation.canGoBack())');
    expect(source).toContain('navigation.goBack()');
    expect(source).toContain('navigation.navigate(ROUTES.MAIN_TABS, {');
    expect(source).toContain('screen: ROUTES.FEED');
  });
});
