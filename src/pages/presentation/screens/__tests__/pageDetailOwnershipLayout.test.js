const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../PageDetailScreen.tsx'),
  'utf8',
);

describe('PageDetailScreen ownership layout', () => {
  it('does not render the global Feed source bar inside a Page', () => {
    expect(source).not.toContain('FeedFilterTabs');
  });

  it('shows the Page composer only to the Page owner', () => {
    expect(source).toContain('const isPageOwner =');
    expect(source).toContain('const canManagePage =');
    expect(source).toMatch(
      /\{isPageOwner \? \(\s*<ComposerCard[\s\S]*?\/>\s*\) : null\}/,
    );
  });
});
