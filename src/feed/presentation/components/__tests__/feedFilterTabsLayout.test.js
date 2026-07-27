const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('FeedFilterTabs layout ownership', () => {
  it('uses the fixed header variant only from the Android Feed chrome', () => {
    const tabs = read(
      'src/feed/presentation/components/FeedFilterTabs.tsx',
    );
    const feed = read('src/feed/presentation/screens/FeedScreen.tsx');
    const page = read('src/pages/presentation/screens/PageDetailScreen.tsx');
    const group = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );
    const event = read(
      'src/events/presentation/screens/EventDetailScreen.tsx',
    );

    expect(tabs).toContain("variant = 'default'");
    expect(tabs).toContain('variant={variant}');
    expect(feed).toMatch(/<FeedFilterTabs\s+variant="header"/);
    expect(page).not.toMatch(/<FeedFilterTabs\s+variant="header"/);
    expect(group).not.toMatch(/<FeedFilterTabs\s+variant="header"/);
    expect(event).not.toMatch(/<FeedFilterTabs\s+variant="header"/);
  });

  it('does not resolve header controls against the full list-header height', () => {
    const source = read(
      'src/feed/presentation/components/FeedSourceFilterBar.tsx',
    );

    expect(source).not.toContain("'h-full flex-1 items-center justify-center'");
    expect(source).toContain("'h-[66px] flex-1 items-center justify-center'");
  });
});
