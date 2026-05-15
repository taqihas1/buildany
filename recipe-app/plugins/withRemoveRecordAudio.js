/**
 * Custom Expo Config Plugin: withRemoveRecordAudio
 *
 * This plugin is the definitive, final-failsafe removal of the RECORD_AUDIO
 * permission from the Android build. It operates directly on the merged
 * AndroidManifest.xml using the Android Manifest Merger's tools:node="remove"
 * directive, which instructs the Gradle merge tool to strip the permission
 * even if any library, plugin, or transitive dependency tries to add it.
 *
 * Why this is needed:
 * - expo-audio's withAudio plugin adds RECORD_AUDIO unless recordAudioAndroid: false is set
 * - expo-build-properties excludePermissions works at a different layer and may not
 *   catch permissions injected by AAR libraries bundled inside react-native-google-mobile-ads
 * - This plugin operates at the final manifest merge step, guaranteeing removal
 *
 * RecipeWise uses expo-audio for PLAYBACK only (cooking mode timers).
 * It never records audio. RECORD_AUDIO is not needed.
 */

const { withAndroidManifest } = require("@expo/config-plugins");

const withRemoveRecordAudio = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Ensure the tools namespace is declared on the manifest root
    if (!manifest.manifest.$) {
      manifest.manifest.$ = {};
    }
    if (!manifest.manifest.$["xmlns:tools"]) {
      manifest.manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    // Get or create the uses-permission array
    if (!manifest.manifest["uses-permission"]) {
      manifest.manifest["uses-permission"] = [];
    }

    const permissions = manifest.manifest["uses-permission"];

    // Permissions to forcibly remove
    const permissionsToRemove = [
      "android.permission.RECORD_AUDIO",
      "android.permission.MODIFY_AUDIO_SETTINGS",
    ];

    for (const permissionName of permissionsToRemove) {
      // Check if permission already exists (added by a plugin/dependency)
      const existingIndex = permissions.findIndex(
        (p) => p.$?.["android:name"] === permissionName
      );

      if (existingIndex !== -1) {
        // Replace it with a tools:node="remove" entry to strip it at merge time
        permissions[existingIndex] = {
          $: {
            "android:name": permissionName,
            "tools:node": "remove",
          },
        };
      } else {
        // Add a removal directive proactively so it gets stripped if added later
        permissions.push({
          $: {
            "android:name": permissionName,
            "tools:node": "remove",
          },
        });
      }
    }

    return config;
  });
};

module.exports = withRemoveRecordAudio;
