const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Stub out react-native-google-mobile-ads on web to prevent native-only import errors.
// AdMob is a native-only SDK; the AdBanner component already falls back to a house ad on web.
const adMobStub = path.resolve(__dirname, "lib/stubs/admob-stub.js");

config.resolver = config.resolver || {};
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === "web" &&
    moduleName === "react-native-google-mobile-ads"
  ) {
    return { filePath: adMobStub, type: "sourceFile" };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
