const fs = require('fs');
const path = process.argv[2] || 'android/app/build.gradle';
let content = fs.readFileSync(path, 'utf8');

// 1. Add release signing config after debug signing config
const debugSigningBlock = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const releaseSigningBlock = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (System.getenv('CM_KEYSTORE_PATH')) {
                storeFile file(System.getenv('CM_KEYSTORE_PATH'))
                storePassword System.getenv('CM_KEYSTORE_PASSWORD')
                keyAlias System.getenv('CM_KEY_ALIAS')
                keyPassword System.getenv('CM_KEY_PASSWORD')
            } else {
                storeFile file('release.keystore')
                storePassword 'carbuy2024'
                keyAlias 'upload'
                keyPassword 'carbuy2024'
            }
        }
    }`;

if (!content.includes('CM_KEYSTORE_PATH')) {
  content = content.replace(debugSigningBlock, releaseSigningBlock);
  console.log('✅ Patched signingConfigs with Codemagic env var support');
} else {
  console.log('ℹ️ signingConfigs already patched');
}

// 2. Ensure release buildType uses release signingConfig
if (content.includes('signingConfig signingConfigs.debug') && content.includes('buildTypes')) {
  const releaseBuildTypePattern = /(buildTypes \{[\s\S]*?release \{[\s\S]*?)(signingConfig signingConfigs\.debug)([\s\S]*?\n        \})/;
  content = content.replace(releaseBuildTypePattern, '$1signingConfig signingConfigs.release$3');
  console.log('✅ Updated release buildType to use release signingConfig');
}

fs.writeFileSync(path, content);
console.log('📝 android/app/build.gradle updated successfully');

// Verify
const verify = fs.readFileSync(path, 'utf8');
const hasReleaseSigning = verify.includes('signingConfigs.release');
const hasReleaseConfig = verify.includes('CM_KEYSTORE_PATH') || verify.includes('release.keystore');
console.log('Has release signingConfig:', hasReleaseSigning);
console.log('Has release keystore config:', hasReleaseConfig);
