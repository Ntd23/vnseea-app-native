const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('VNSEEA brand token contract', () => {
  it('exposes semantic brand utilities through NativeWind', () => {
    const source = read('tailwind.config.js');

    expect(source).toContain("DEFAULT: '#B91C1C'");
    expect(source).toContain("pressed: '#991B1B'");
    expect(source).toContain("soft: 'rgba(185, 28, 28, 0.08)'");
    expect(source).toContain("'on-muted': '#FEE2E2'");
    expect(source).toContain("on: '#FFFFFF'");
    expect(source).toContain("DEFAULT: '#3B82F6'");
    expect(source).toContain("DEFAULT: '#16A34A'");
    expect(source).toContain("DEFAULT: '#F59E0B'");
    expect(source).toContain("DEFAULT: '#DC2626'");
  });

  it('uses red brand tokens and neutral content surfaces', () => {
    const source = read('assets/styles/tokens.css');

    expect(source).toContain('--color-primary-500: #b91c1c;');
    expect(source).toContain('--color-primary-700: #991b1b;');
    expect(source).toContain('--text-brand: var(--color-primary-500);');
    expect(source).toContain('--bg-base: #f8fafc;');
    expect(source).toContain('--bg-brand: var(--color-primary-500);');
    expect(source).toContain('--border-default: #e2e8f0;');
    expect(source).toContain('--border-on-brand: rgba(255, 255, 255, 0.25);');
    expect(source).toContain('--color-success: #16a34a;');
    expect(source).toContain('--color-info: #3b82f6;');
  });

  it('keeps shared brand primitives free of legacy blue colors', () => {
    const source = read('assets/styles/tokens.css');
    const sharedPrimitiveSource = source.slice(
      0,
      source.indexOf('/* --- Explore Hashtags tokens'),
    );

    expect(sharedPrimitiveSource).not.toMatch(/#0000ff|rgba\(0, 0, 255/i);
    expect(sharedPrimitiveSource).toContain('background-color: #b91c1c;');
    expect(sharedPrimitiveSource).toContain('color: #ffffff;');
  });
});
