// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
// Android package name registered in Google Play Console.
// Must use reverse-domain notation (letters, numbers, dots only — no underscores, no version numbers).
// This value is set once and NEVER changed after the app is published.
const rawBundleId = process.env.ANDROID_PACKAGE_NAME || "com.recipewise.app";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "RecipeWise",
  appSlug: "recipewise",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663575983540/QQLBSfis7GvtNCA5PuJ237/recipewise-icon-TfrArG7rppGHP3u4J9dC29.png",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "react-native-google-mobile-ads",
      {
        // Use real AdMob App IDs from env vars (set via Secrets panel)
        // Falls back to Google's official test App IDs so the build works without real IDs
        androidAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID || "ca-app-pub-3229563514854040~3117137018",
        iosAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS || "ca-app-pub-3229563514854040~1507694417",
        // Delay app measurement to comply with GDPR / CCPA
        delayAppMeasurementInit: true,
      }
    ],
    [
      "expo-audio",
      {
        // recordAudioAndroid: false explicitly tells expo-audio NOT to add RECORD_AUDIO permission.
        // RecipeWise only uses expo-audio for playback (cooking timers), never for recording.
        // Without this explicit false, expo-audio's withAudio plugin adds RECORD_AUDIO by default,
        // which triggers a Google Play privacy policy requirement.
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
          // Forcibly remove RECORD_AUDIO from the merged AndroidManifest.
          // This is the definitive way to strip permissions added by any dependency or plugin.
          excludePermissions: [
            "android.permission.RECORD_AUDIO",
            "android.permission.MODIFY_AUDIO_SETTINGS",
          ],
          // R8 code shrinking: removes unused code, rewrites for performance, obfuscates class names.
          // Reduces APK size, improves startup time, lowers memory usage, and reduces ANRs.
          // Google Play recommends enabling both for all production release builds.
          enableProguardInReleaseBuilds: true,
          // Resource shrinking: removes unused drawable, layout, and string resources.
          // Works in tandem with R8 — only effective when enableProguardInReleaseBuilds is true.
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

// Apply custom plugins AFTER all other plugins so they run last in the manifest merge pipeline.
import withRemoveRecordAudio from "./plugins/withRemoveRecordAudio";
import withAndroid15Compliance from "./plugins/withAndroid15Compliance";
(config as any).plugins = [
  ...((config as any).plugins || []),
  withRemoveRecordAudio,       // Strips RECORD_AUDIO permission (triple-layer failsafe)
  withAndroid15Compliance,     // Fixes 3 Android 15/16 Google Play compliance warnings:
                               //   1. Removes expo-audio BOOT_COMPLETED foreground services
                               //   2. Opts out of forced edge-to-edge enforcement (deprecated Window APIs)
                               //   3. Removes portrait-only orientation lock for large screen support
];

export default config;
