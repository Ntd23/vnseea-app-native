const fs = require('fs');
const path = require('path');

describe('Reanimated native configuration', () => {
  test('Metro does not alias react-native-reanimated to the JS shim', () => {
    const metroConfigSource = fs.readFileSync(
      path.join(process.cwd(), 'metro.config.js'),
      'utf8',
    );

    expect(metroConfigSource).not.toContain(
      "moduleName === 'react-native-reanimated'",
    );
    expect(metroConfigSource).not.toContain('reanimatedShim');
  });

  test('Worklets Babel plugin is configured last', () => {
    const babelConfigPath = path.join(process.cwd(), 'babel.config.js');
    delete require.cache[require.resolve(babelConfigPath)];
    const babelConfig = require(babelConfigPath);

    expect(Array.isArray(babelConfig.plugins)).toBe(true);
    expect(babelConfig.plugins[babelConfig.plugins.length - 1]).toBe(
      'react-native-worklets/plugin',
    );
  });
});
