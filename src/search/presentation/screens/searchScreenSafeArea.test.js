const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('SearchScreen top safe area', () => {
  const source = read('src/search/presentation/screens/SearchScreen.tsx');
  const iosHeaderSource = read(
    'src/feed/presentation/components/FeedHeader.ios.tsx',
  );

  it('wraps both search layouts with top safe area on every platform', () => {
    expect((source.match(/<SafeAreaView/g) || []).length).toBe(2);
    expect((source.match(/<\/SafeAreaView>/g) || []).length).toBe(2);
    expect((source.match(/edges=\{\['top'\]\}/g) || []).length).toBe(2);
    expect(source).not.toContain('Platform.OS');
  });

  it('does not move safe-area ownership into the shared iOS FeedHeader', () => {
    expect(iosHeaderSource).not.toContain('SafeAreaView');
    expect(iosHeaderSource).not.toContain('useSafeAreaInsets');
  });
});
