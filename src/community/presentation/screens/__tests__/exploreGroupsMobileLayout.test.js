const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('ExploreGroupsScreen mobile layout', () => {
  it('matches the Pages header treatment on Android and iOS', () => {
    const source = read(
      'src/community/presentation/screens/ExploreGroupsScreen.tsx',
    );

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
    const source = read(
      'src/community/presentation/screens/ExploreGroupsScreen.tsx',
    );
    const filters = source.slice(
      source.indexOf('function FilterTabs({'),
      source.indexOf('function GroupAvatar('),
    );

    expect(filters).toContain('style={styles.filterTabs}');
    expect(filters).toContain('style={[styles.filterTab, isActive');
    expect(filters).toContain('accessibilityRole="tab"');
    expect(filters).not.toContain('horizontal');
    expect(filters).not.toContain('ScrollView');
  });

  it('uses a large standalone create action suitable for touch', () => {
    const source = read(
      'src/community/presentation/screens/ExploreGroupsScreen.tsx',
    );

    expect(source).toContain('style={styles.createGroupButton}');
    expect(source).toContain('{copy.createNewGroup}');
    expect(source).toContain('createGroupButton: {');
    expect(source).toContain('minHeight: 54');
  });

  it('renders compact group cards with cover, avatar, metadata and actions', () => {
    const source = read(
      'src/community/presentation/screens/ExploreGroupsScreen.tsx',
    );

    expect(source).toContain('<GroupCover group={group} />');
    expect(source).toContain('<GroupAvatar group={group} />');
    expect(source).toContain('group.about');
    expect(source).toContain('style={styles.groupOpenButton}');
    expect(source).toContain('{copy.viewGroup}');
    expect(source).toContain('groupCardCover: {');
    expect(source).toContain('height: 136');
    expect(source).toContain('Math.min(80 + index * 60, 320)');
    expect(source).toContain(
      'accessibilityLabel={viewGroupAccessibilityLabel}',
    );
    expect(source).not.toContain('aspectRatio: 1');
  });
});
