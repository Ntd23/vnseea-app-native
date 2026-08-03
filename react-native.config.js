// Description: Keeps CallKeep native integration on iOS while Android uses VNSEEA's call UI.
module.exports = {
  dependencies: {
    'react-native-callkeep': {
      platforms: {
        android: null,
      },
    },
  },
};
