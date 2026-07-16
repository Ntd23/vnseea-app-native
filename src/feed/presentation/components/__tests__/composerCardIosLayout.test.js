const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('ComposerCard platform layout', () => {
  const source = read('src/feed/presentation/components/ComposerCard.tsx');

  it('uses an edge-to-edge square card on iOS without changing Android chrome', () => {
    const iosSpacingStyle = source.slice(
      source.indexOf('iosCardSpacing: {'),
      source.indexOf('composerTopRow: {'),
    );

    expect(source).toContain("const isIos = Platform.OS === 'ios'");
    expect(source).toContain('isIos ? styles.iosCardSpacing : null');
    expect(iosSpacingStyle).toContain('marginHorizontal: 0');
    expect(iosSpacingStyle).not.toContain('marginBottom');
    expect(source).toContain('className={composerCardClassName}');
    expect(source).toContain("'bg-white border border-slate-100 p-4'");
    expect(source).toContain(
      "'bg-white rounded-[20px] border border-slate-100 p-4'",
    );
  });

  it('renders four accessible icon-only actions in one row on iOS', () => {
    expect(source).toContain('styles.iosActionsRow');
    expect(source).toContain('styles.iosActionButton');
    expect(source).toContain('accessibilityLabel={action.label}');
    expect(source).toMatch(
      /iosActionButton:\s*\{[\s\S]*minHeight:\s*44,[\s\S]*flex:\s*1,/,
    );
    expect(source).toContain("id: 'photo'");
    expect(source).toContain("id: 'video'");
    expect(source).toContain("id: 'product'");
    expect(source).toContain("id: 'poll'");
  });

  it('keeps the labeled Android action grid', () => {
    expect(source).toContain('styles.androidActionsGrid');
    expect(source).toContain('<Text');
    expect(source).toContain('{action.label}');
  });
});
