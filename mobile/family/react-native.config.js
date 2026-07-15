/** Family RN must not link Capacitor pods from the web app workspace. */
module.exports = {
  dependencies: {
    "@capacitor/preferences": {
      platforms: { ios: null, android: null },
    },
    "@capacitor/core": {
      platforms: { ios: null, android: null },
    },
    "@capacitor/ios": {
      platforms: { ios: null, android: null },
    },
  },
};
