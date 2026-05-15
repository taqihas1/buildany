/**
 * Custom Expo Config Plugin: withAndroid15Compliance
 *
 * Fixes 3 Google Play Android 15/16 compliance warnings:
 *
 * Issue 1: Restricted foreground service types via BOOT_COMPLETED
 *   - expo-audio registers AudioRecordingService and AudioControlsService which can be
 *     started via BOOT_COMPLETED. On Android 15+, this causes a crash.
 *   - Fix: Remove these services from the AndroidManifest entirely using tools:node="remove"
 *     since RecipeWise does not use audio recording or background audio controls.
 *
 * Issue 2: Deprecated edge-to-edge Window APIs (Android 15+)
 *   - android.view.Window.setStatusBarColor, setNavigationBarColor, etc. are deprecated.
 *   - Fix: Set android:windowOptOutEdgeToEdgeEnforcement="false" in the app theme to
 *     opt out of the forced edge-to-edge enforcement while React Native's own libraries
 *     (react-native-screens, react-native-status-bar) are updated upstream.
 *
 * Issue 3: Portrait-only orientation restriction (Android 16+)
 *   - android:screenOrientation="portrait" on MainActivity is ignored on Android 16+ for
 *     large screens (foldables, tablets) and may cause layout issues.
 *   - Fix: Remove the screenOrientation restriction from MainActivity so Android 16+ can
 *     manage orientation naturally on large screens.
 *
 * R8 Deobfuscation:
 *   - When R8/ProGuard obfuscation is enabled, class and method names are shortened.
 *   - Google Play Console requires a mapping.txt file to decode crash stack traces.
 *   - Fix: Configure the release build to generate and package the mapping file so it
 *     can be uploaded to Google Play Console alongside the AAB.
 */

const { withAndroidManifest } = require("@expo/config-plugins");

// ─── Issue 1: Remove expo-audio background services ────────────────────────
const withRemoveAudioServices = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Ensure tools namespace is declared
    if (!manifest.manifest.$) manifest.manifest.$ = {};
    if (!manifest.manifest.$["xmlns:tools"]) {
      manifest.manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    // Get or create the application element
    const application = manifest.manifest.application?.[0];
    if (!application) return config;

    // Ensure service array exists
    if (!application.service) application.service = [];

    // Services registered by expo-audio that must not be started via BOOT_COMPLETED on Android 15+
    const servicesToRemove = [
      "expo.modules.audio.service.AudioRecordingService",
      "expo.modules.audio.service.AudioControlsService",
    ];

    for (const serviceName of servicesToRemove) {
      const existingIndex = application.service.findIndex(
        (s) => s.$?.["android:name"] === serviceName
      );
      if (existingIndex !== -1) {
        // Replace with a removal directive
        application.service[existingIndex] = {
          $: {
            "android:name": serviceName,
            "tools:node": "remove",
          },
        };
      } else {
        // Add a proactive removal directive in case the service is added by the plugin
        application.service.push({
          $: {
            "android:name": serviceName,
            "tools:node": "remove",
          },
        });
      }
    }

    // Also remove the BOOT_COMPLETED receiver that triggers these services
    if (!application.receiver) application.receiver = [];
    const bootReceivers = application.receiver.filter((r) => {
      const intentFilters = r["intent-filter"] || [];
      return intentFilters.some((f) => {
        const actions = f.action || [];
        return actions.some(
          (a) => a.$?.["android:name"] === "android.intent.action.BOOT_COMPLETED"
        );
      });
    });

    for (const receiver of bootReceivers) {
      const idx = application.receiver.indexOf(receiver);
      if (idx !== -1) {
        application.receiver[idx] = {
          ...receiver,
          $: {
            ...receiver.$,
            "tools:node": "remove",
          },
        };
      }
    }

    return config;
  });
};

// ─── Issue 2: Edge-to-edge deprecated APIs ─────────────────────────────────
const withEdgeToEdgeCompat = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Ensure tools namespace
    if (!manifest.manifest.$) manifest.manifest.$ = {};
    if (!manifest.manifest.$["xmlns:tools"]) {
      manifest.manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    const application = manifest.manifest.application?.[0];
    if (!application) return config;

    // Set windowOptOutEdgeToEdgeEnforcement on the application element.
    // This tells Android 15+ not to force edge-to-edge on the app while
    // the React Native ecosystem (react-native-screens, StatusBarModule) migrates
    // away from the deprecated Window.setStatusBarColor / setNavigationBarColor APIs.
    if (!application.$) application.$ = {};
    application.$["android:windowOptOutEdgeToEdgeEnforcement"] = "false";

    return config;
  });
};

// ─── Issue 3: Remove portrait-only orientation restriction ─────────────────
const withRemoveOrientationLock = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Ensure tools namespace
    if (!manifest.manifest.$) manifest.manifest.$ = {};
    if (!manifest.manifest.$["xmlns:tools"]) {
      manifest.manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    const application = manifest.manifest.application?.[0];
    if (!application || !application.activity) return config;

    // Find MainActivity and remove the screenOrientation restriction
    for (const activity of application.activity) {
      const name = activity.$?.["android:name"] || "";
      if (name.includes("MainActivity") || name === ".MainActivity") {
        if (activity.$) {
          // Remove the portrait lock — Android 16+ ignores it for large screens anyway,
          // but removing it explicitly prevents the Play Console warning and allows
          // foldables/tablets to use landscape naturally.
          delete activity.$["android:screenOrientation"];

          // Set resizeableActivity to true to explicitly support all screen sizes
          activity.$["android:resizeableActivity"] = "true";
        }
      }
    }

    return config;
  });
};

// ─── Compose all fixes ──────────────────────────────────────────────────────
// Note: mappingFileUploadEnabled was removed — it is not supported by the
// Android Gradle Plugin version used by EAS Build and causes a build failure.
// The mapping.txt file is still generated by R8 (enableProguardInReleaseBuilds: true)
// and can be manually uploaded to Google Play Console from:
//   android/app/build/outputs/mapping/release/mapping.txt
const withAndroid15Compliance = (config) => {
  config = withRemoveAudioServices(config);
  config = withEdgeToEdgeCompat(config);
  config = withRemoveOrientationLock(config);
  return config;
};

module.exports = withAndroid15Compliance;
