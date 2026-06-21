const fs = require('fs');
const path = require('path');

const PROGUARD_RULES = `
# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Google Mobile Ads (AdMob) - REQUIRED for release builds
-keep class com.google.android.gms.ads.** { *; }
-keep interface com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.common.** { *; }
-dontwarn com.google.android.gms.ads.**
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# React Native
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.modules.** { *; }
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.react.defaults.** { *; }
-keep class com.facebook.react.common.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.yoga.** { *; }

# Expo modules
-keep class expo.modules.** { *; }
-keep class com.expo.modules.** { *; }
-keep class expo.modules.adapters.react.** { *; }
-keep class expo.modules.core.** { *; }
-keep class expo.modules.kotlin.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep JavascriptInterface for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Parcelable classes
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable\$Creator *;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep application class (will be updated by patch-release-signing.js)
# -keep class com.carbuyassistant.app.MainApplication { *; }
# -keep class com.carbuyassistant.app.MainActivity { *; }

# Suppress warnings
-dontwarn com.facebook.react.**
-dontwarn com.google.android.gms.**
-dontwarn com.swmansion.reanimated.**
-dontwarn org.w3c.dom.events.**
`;

const proguardPath = path.join(process.cwd(), 'android', 'app', 'proguard-rules.pro');

if (!fs.existsSync(proguardPath)) {
  console.error('❌ proguard-rules.pro not found at', proguardPath);
  process.exit(1);
}

fs.writeFileSync(proguardPath, PROGUARD_RULES.trim());
console.log('✅ Patched proguard-rules.pro with AdMob + React Native rules');

// Also patch AndroidManifest.xml to add ACCESS_NETWORK_STATE if missing
const manifestPath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  if (!manifest.includes('ACCESS_NETWORK_STATE')) {
    manifest = manifest.replace(
      '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>',
      '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>\n  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>'
    );
    fs.writeFileSync(manifestPath, manifest);
    console.log('✅ Patched AndroidManifest.xml with ACCESS_NETWORK_STATE');
  } else {
    console.log('ℹ️ AndroidManifest.xml already has ACCESS_NETWORK_STATE');
  }
} else {
  console.warn('⚠️ AndroidManifest.xml not found');
}

// Also ensure gradle.properties has memory-safe settings
const gradlePropsPath = path.join(process.cwd(), 'android', 'gradle.properties');
if (fs.existsSync(gradlePropsPath)) {
  let props = fs.readFileSync(gradlePropsPath, 'utf8');
  if (!props.includes('org.gradle.jvmargs')) {
    props += '\norg.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=512m\n';
    fs.writeFileSync(gradlePropsPath, props);
    console.log('✅ Patched gradle.properties with memory-safe JVM args');
  }
}

console.log('🎉 All post-prebuild patches applied!');
