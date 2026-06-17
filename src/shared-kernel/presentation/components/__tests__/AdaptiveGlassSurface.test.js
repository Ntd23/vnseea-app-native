const fs = require('fs');
const path = require('path');

describe('AdaptiveGlassSurface platform implementations', () => {
  const componentDir = path.join(
    process.cwd(),
    'src/shared-kernel/presentation/components',
  );

  it('uses LiquidGlassView with iOS fallback support in the iOS implementation', () => {
    const iosSource = fs.readFileSync(
      path.join(componentDir, 'AdaptiveGlassSurface.ios.tsx'),
      'utf8',
    );

    expect(iosSource).toContain('@callstack/liquid-glass');
    expect(iosSource).toContain('LiquidGlassView');
    expect(iosSource).toContain('isLiquidGlassSupported');
    expect(iosSource).toContain('@react-native-community/blur');
    expect(iosSource).toContain('BlurView');
    expect(iosSource).toContain('adaptive-glass-fallback');
  });

  it('keeps the default implementation free of LiquidGlass imports for Android', () => {
    const defaultSource = fs.readFileSync(
      path.join(componentDir, 'AdaptiveGlassSurface.tsx'),
      'utf8',
    );

    expect(defaultSource).not.toContain('@callstack/liquid-glass');
    expect(defaultSource).not.toContain('LiquidGlassView');
  });
});
