const fs = require('fs');
const path = require('path');

describe('native bottom tabs package compatibility', () => {
  it('passes route keys to react-native-screens with the current screenKey prop', () => {
    const packageJsonPath = require.resolve(
      '@react-navigation/bottom-tabs/package.json',
    );
    const viewPath = path.join(
      path.dirname(packageJsonPath),
      'lib/module/unstable/NativeBottomTabView.native.js',
    );
    const source = fs.readFileSync(viewPath, 'utf8');

    expect(source).toContain('screenKey: route.key');
    expect(source).not.toContain('tabKey: route.key');
  });

  it('keeps native bottom tabs on a version compatible with react-native-screens 4.25+', () => {
    const packageJsonPath = require.resolve(
      '@react-navigation/bottom-tabs/package.json',
    );
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const [major, minor] = packageJson.version.split('.').map(Number);

    expect(path.basename(packageJsonPath)).toBe('package.json');
    expect(major).toBe(7);
    expect(minor).toBeGreaterThanOrEqual(18);
  });
});
