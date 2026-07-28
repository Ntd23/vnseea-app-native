const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('PagesScreen mobile layout', () => {
  it('matches the Home header treatment on Android and iOS', () => {
    const source = read('src/pages/presentation/screens/PagesScreen.tsx');

    expect(source).toContain(
      "Platform.OS === 'android' ? APP_BRAND_COLOR : '#FFFFFF'",
    );
    expect(source).toContain(
      "barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}",
    );
    expect(source).toContain(
      '<SafeAreaFeedHeader safeAreaBackgroundColor={headerBackgroundColor} />',
    );
  });

  it('fits all filters on screen without horizontal scrolling', () => {
    const source = read('src/pages/presentation/screens/PagesScreen.tsx');
    const filters = source.slice(
      source.indexOf('function FilterTabs({'),
      source.indexOf('function PageAvatar('),
    );

    expect(filters).toContain('style={styles.filterTabs}');
    expect(filters).toContain('style={[styles.filterTab, isActive');
    expect(filters).toContain('accessibilityRole="tab"');
    expect(filters).not.toContain('horizontal');
    expect(filters).not.toContain('ScrollView');
  });

  it('uses a large standalone create action suitable for touch', () => {
    const source = read('src/pages/presentation/screens/PagesScreen.tsx');

    expect(source).toContain('style={styles.createPageButton}');
    expect(source).toContain('{copy.createNewPage}');
    expect(source).toContain('createPageButton: {');
    expect(source).toContain('minHeight: 54');
  });

  it('renders compact page cards with cover, avatar and clear actions', () => {
    const source = read('src/pages/presentation/screens/PagesScreen.tsx');

    expect(source).toContain('<PageCover page={page} />');
    expect(source).toContain('<PageAvatar page={page} />');
    expect(source).toContain('page.pageDescription');
    expect(source).toContain('style={styles.pageOpenButton}');
    expect(source).toContain('{viewPageLabel}');
    expect(source).toContain('minHeight: 52');
    expect(source).not.toContain('<FileText');
  });
});
