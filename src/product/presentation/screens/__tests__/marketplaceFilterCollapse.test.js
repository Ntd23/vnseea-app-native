const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Marketplace filter collapse stability', () => {
  const source = read(
    'src/product/presentation/screens/MarketplaceScreen.tsx',
  );

  it('keeps both filter layouts mounted so the panel height can animate', () => {
    expect(source).toContain(
      '<Animated.View pointerEvents="box-none" style={filterPanelAnimatedStyle}>',
    );
    expect(source).toContain(
      'style={[FILTER_PANEL_CHILD_STYLE, fullBarAnimatedStyle]}',
    );
    expect(source).toContain(
      'style={[FILTER_PANEL_CHILD_STYLE, collapsedBarAnimatedStyle]}',
    );
    expect(source).not.toContain(
      "style={filtersCollapsed ? { display: 'none' } : undefined}",
    );
  });

  it('ignores synthetic scroll reversals while the header transition settles', () => {
    expect(source).toContain('const filterTransitionLockRef = useRef(false)');
    expect(source).toContain(
      'if (filterTransitionLockRef.current) return;',
    );
    expect(source).toContain(
      'lastScrollYRef.current = latestScrollYRef.current;',
    );
    expect(source).toContain('const animationId = ++filterAnimationIdRef.current');
  });
});
