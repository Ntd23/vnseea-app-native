// Description: Configures Metro bundling while ignoring native build scratch directories.
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

const root = __dirname.replace(/[/\\]+$/, '');
const escapedRoot = root
  .replace(/[/\\]/g, '[/\\\\]')
  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  },
};

module.exports = withNativeWind(
  mergeConfig(getDefaultConfig(__dirname), config),
  {
    input: './global.css',
  },
);
