
const { withAndroidManifest } = require("@expo/config-plugins");

const withCleartextTraffic = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];

    if (application) {
      application.$["android:usesCleartextTraffic"] = "true";
    }

    return config;
  });
};

module.exports = withCleartextTraffic;
