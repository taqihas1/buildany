#!/usr/bin/env bash
# eas-local-build.sh — Local EAS Android production build (AAB)
# Use when free-plan quota exhausted or you want faster builds
#
# Prerequisites:
#   - Android Studio installed
#   - Android SDK (API 34+ recommended)
#   - JDK 17
#   - eas-cli installed globally: npm install -g eas-cli
#   - env var EXPO_TOKEN set OR logged in via `eas login`
#
# Usage:
#   chmod +x scripts/eas-local-build.sh
#   ./scripts/eas-local-build.sh
#
# Output:
#   build-*.aab file in project root (rename to app.aab for Play Store)

set -euo pipefail

echo "🔨 EAS Local Android Production Build"
echo "===================================="

# Verify prerequisites
command -v eas >/dev/null 2>&1 || { echo "❌ eas-cli not found. Install: npm install -g eas-cli"; exit 1; }

# Check for EXPO_TOKEN or login status
if [ -z "${EXPO_TOKEN:-}" ]; then
  echo "⚠️  EXPO_TOKEN not set. Checking EAS login..."
  eas whoami >/dev/null 2>&1 || { echo "❌ Not logged in. Run: eas login  OR  export EXPO_TOKEN=..."; exit 1; }
fi

# Verify app.json has android.package
if ! grep -q '"package"' app.json; then
  echo "❌ Missing android.package in app.json. Add it first."
  exit 1
fi

# Clean old builds
echo "🧹 Cleaning old local builds..."
rm -f build-*.aab build-*.apk

# Run local build
echo "⬇️  Starting local build (this may take 10–30 min first time)..."
eas build --platform android --profile production --local --non-interactive "$@"

# Find output
echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Output files:"
ls -lh build-*.aab 2>/dev/null || ls -lh build-*.apk 2>/dev/null || echo "(check current directory for build output)"
echo ""
echo "🚀 Next steps:"
echo "   1. Rename to app.aab:  mv build-*.aab app.aab"
echo "   2. Upload to Google Play Console → Internal Testing"
echo "   3. Test → Promote to Production"
