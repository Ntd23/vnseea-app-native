// Description: Configures Babel transforms for React Native and NativeWind.
module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  plugins: ['react-native-worklets/plugin'],
};
