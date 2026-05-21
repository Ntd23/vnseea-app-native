// Description: Configures Jest for the React Native app while ignoring bundled PHP backend sources.
module.exports = {
  preset: '@react-native/jest-preset',
  modulePathIgnorePatterns: ['<rootDir>/phtml/'],
  testPathIgnorePatterns: ['<rootDir>/phtml/'],
  watchPathIgnorePatterns: ['<rootDir>/phtml/'],
};
