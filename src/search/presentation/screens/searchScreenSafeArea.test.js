const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('SearchScreen iOS safe area', () => {
  const source = read('src/search/presentation/screens/SearchScreen.tsx');
  const iosHeaderSource = read(
    'src/feed/presentation/components/FeedHeader.ios.tsx',
  );

  it('wraps both search layouts with an iOS-only top safe area', () => {
    expect((source.match(/<SafeAreaView/g) || []).length).toBe(2);
    expect((source.match(/<\/SafeAreaView>/g) || []).length).toBe(2);
    expect(
      (
        source.match(
          /edges=\{Platform\.OS === 'ios' \? \['top'\] : \[\]\}/g,
        ) || []
      ).length,
    ).toBe(2);
  });

  it('does not move safe-area ownership into the shared iOS FeedHeader', () => {
    expect(iosHeaderSource).not.toContain('SafeAreaView');
    expect(iosHeaderSource).not.toContain('useSafeAreaInsets');
  });
});
