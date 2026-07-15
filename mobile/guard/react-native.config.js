/** Guard RN must not link Capacitor pods from the web app workspace. */
module.exports = {
  project: {
    android: {
      packageName: "com.stos.guard",
    },
  },
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
