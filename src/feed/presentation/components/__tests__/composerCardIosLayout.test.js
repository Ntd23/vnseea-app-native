const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('ComposerCard platform layout', () => {
  const source = read('src/feed/presentation/components/ComposerCard.tsx');

  it('keeps the iOS card unchanged and reuses feed-card chrome on Android', () => {
    const iosSpacingStyle = source.slice(
      source.indexOf('iosCardSpacing: {'),
      source.indexOf('composerTopRow: {'),
    );

    expect(source).toContain("const isIos = Platform.OS === 'ios'");
    expect(source).toContain(
      'style={isIos ? [styles.cardShadow, styles.iosCardSpacing] : undefined}',
    );
    expect(iosSpacingStyle).toContain('marginHorizontal: 0');
    expect(iosSpacingStyle).not.toContain('marginBottom');
    expect(source).toContain('className={composerCardClassName}');
    expect(source).toContain("'bg-white border border-slate-100 p-4'");
    expect(source).toContain('`${FEED_CARD_CLASS} ${FEED_CARD_PADDING_CLASS}`');
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

  it('renders four accessible icon-only Android actions in one balanced row', () => {
    expect(source).toContain('styles.androidActionsRow');
    expect(source).not.toContain('actions.slice');
    expect(source).not.toContain('styles.androidActionLabel');
    expect(source).not.toContain('ellipsizeMode="tail"');
    expect(source).toContain(
      '<action.Icon size={22} color={action.color} strokeWidth={2.4} />',
    );
    expect(source).toMatch(
      /androidActionButton:\s*\{[\s\S]*flex:\s*1,[\s\S]*minHeight:\s*46,[\s\S]*borderRadius:\s*16,/,
    );
  });
});
