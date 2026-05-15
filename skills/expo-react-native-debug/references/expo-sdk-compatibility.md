# Expo SDK Compatibility Reference

## SDK Version to Dependency Mapping

| Expo SDK | React Native | React | expo-status-bar | @types/react | Metro Hermes |
|----------|-------------|-------|-----------------|--------------|--------------|
| 54.0.0 | 0.81.x | 19.1.x | ~2.2.0 | ~19.0.0 | hermes-stable |
| 53.0.0 | 0.79.x | 19.0.x | ~2.1.0 | ~18.2.0 | hermes-stable |
| 52.0.0 | 0.76.x | 18.3.x | ~2.0.0 | ~18.2.0 | hermes-stable |
| 51.0.0 | 0.74.x | 18.2.x | ~1.12.0 | ~18.2.45 | hermes-stable |
| 50.0.0 | 0.73.x | 18.2.x | ~1.11.0 | ~18.2.45 | hermes |
| 49.0.0 | 0.72.x | 18.2.x | ~1.6.0 | ~18.2.14 | hermes |
| 48.0.0 | 0.71.x | 18.2.x | ~1.4.4 | ~18.0.27 | hermes |

## Native Module Compatibility Matrix

| Package | SDK 54 | SDK 53 | SDK 52 | SDK 51 |
|---------|--------|--------|--------|--------|
| react-native-gesture-handler | ~2.24.0 | ~2.20.0 | ~2.18.0 | ~2.16.2 |
| react-native-screens | ~4.10.0 | ~4.4.0 | ~4.1.0 | ~3.31.1 |
| react-native-safe-area-context | ~5.4.0 | ~5.1.0 | ~4.12.0 | ~4.10.5 |
| react-native-maps | ~1.20.0 | ~1.18.0 | ~1.14.0 | ~1.18.0 |
| react-native-paper | ~5.13.0 | ~5.12.5 | ~5.12.3 | ~5.12.3 |
| @react-native-masked-view/masked-view | ~0.3.2 | ~0.3.1 | ~0.3.0 | ~0.3.1 |
| @react-navigation/native | ^6.1.18 | ^6.1.17 | ^6.1.14 | ^6.1.18 |
| @react-navigation/stack | ^6.4.1 | ^6.3.29 | ^6.3.20 | ^6.4.1 |
| @react-navigation/bottom-tabs | ^6.6.1 | ^6.5.20 | ^6.5.11 | ^6.6.1 |

## Expo Go App Version Matching

Expo Go auto-updates on iOS/Android and only supports the latest SDK version. Check your user's Expo Go version:

- **iOS:** Open App Store → Updates → Check Expo Go version
- **Android:** Open Play Store → My apps → Check Expo Go version

If user cannot upgrade Expo Go (e.g., corporate device), you MUST downgrade the project to match their Expo Go SDK version.

## Upgrade Commands by SDK

### Upgrading to SDK 54 (latest)
```bash
npm install expo@~54.0.0 react-native@0.81.1 react@19.1.0 --save --legacy-peer-deps
npx expo install --fix
```

### Downgrading to SDK 51 (legacy support)
```bash
npm install expo@~51.0.0 react-native@0.74.0 react@18.2.0 --save --legacy-peer-deps
# Then manually downgrade native modules per matrix above
```

## Critical Rules

1. **react MUST match react-native-renderer's exact version** — not just semver-compatible, but identical minor version
2. **Always use `--legacy-peer-deps`** — npm v7+ strict mode breaks Expo's dependency tree
3. **Clear `.expo/` folder** after any SDK change — stale cache causes cryptic errors
4. **Kill old expo processes** before starting new ones — port 8081 conflicts silently fail
5. **Regenerate QR code** after tunnel restart — ngrok URLs change

## Common Error Signatures

| Error Message | Root Cause | Fix |
|---------------|------------|-----|
| "This project uses SDK X" | Expo Go too new | Upgrade project or downgrade Expo Go |
| "Incompatible React versions" | react ≠ react-native-renderer | Match exact versions |
| "ERESOLVE could not resolve" | npm peer deps | Use `--legacy-peer-deps` |
| "Could not connect to development server" | ngrok/tunnel dead | Kill + restart expo with `--clear` |
| "unexpected end of JSON input" | Metro cache corrupted | `npx expo start --clear` |
| Port already in use 8081 | Multiple expo instances | `pkill -f "expo start"` |
| "Failed to load bundle" | Old bundle cached | Clear cache + restart |
