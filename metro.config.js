// Description: Configures Metro bundling while ignoring native build scratch directories.
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

const root = __dirname.replace(/[/\\]+$/, '');
const escapedRoot = root
  .replace(/[/\\]/g, '[/\\\\]')
  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const reanimatedShimPath = path.resolve(
  __dirname,
  'src/shared-kernel/infrastructure/animation/reanimatedShim.js',
);

const config = {
  resolver: {
    blockList: [
      new RegExp(
        `${escapedRoot}[/\\\\]node_modules[/\\\\].+[/\\\\]android[/\\\\]\\.cxx[/\\\\].*`,
      ),
      new RegExp(
        `${escapedRoot}[/\\\\]node_modules[/\\\\].+[/\\\\]android[/\\\\]build[/\\\\].*`,
      ),
      new RegExp(
        `${escapedRoot}[/\\\\]node_modules[/\\\\].+[/\\\\]android[/\\\\]\\.gradle[/\\\\].*`,
      ),
      new RegExp(`${escapedRoot}[/\\\\]phtml[/\\\\].*`),
      new RegExp(`${escapedRoot}[/\\\\]android[/\\\\]app[/\\\\]build[/\\\\].*`),
    ],
    resolveRequest(context, moduleName, platform) {
      if (moduleName === 'react-native-reanimated') {
        return {
          type: 'sourceFile',
          filePath: reanimatedShimPath,
        };
      }

      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = withNativeWind(
  mergeConfig(getDefaultConfig(__dirname), config),
  {
    input: './global.css',
  },
);
