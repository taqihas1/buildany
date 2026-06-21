# Expo SDK 54 New Project Setup

When creating a new Expo project or fixing an existing one that has Expo SDK / React Native version mismatches, always use these exact versions to match the current Expo Go app (which auto-updates and currently ships with React Native 0.81.x).

## Current Expo Go Version (as of May 2026)
- **Expo SDK:** 54.0.x
- **React Native:** 0.81.4 (or 0.81.5)
- **React:** 19.1.0
- **Node.js required:** >= 20.19.4 (warns if lower)

## package.json Template

```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
  },
  "dependencies": {
    "expo": "~54.0.0",
    "expo-status-bar": "~3.0.9",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "react-native-screens": "~4.16.0",
    "react-native-safe-area-context": "~5.6.0",
    "@expo/vector-icons": "^15.0.3",
    "react-native-chart-kit": "^6.12.0",
    "react-native-svg": "15.12.1",
    "@react-native-async-storage/async-storage": "2.2.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@types/react": "~19.1.10",
    "typescript": "~5.9.2"
  },
  "private": true
}
```

## Required Assets

Expo requires these image files in an `assets/` folder:

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | 1024×1024 | App icon |
| `splash.png` | 1242×2436 | Launch screen |
| `adaptive-icon.png` | 1024×1024 | Android adaptive icon |
| `favicon.png` | 32×32 | Web favicon |

## Quick Setup Commands

```bash
# 1. Create project directory and assets
mkdir -p your-project/assets
cd your-project

# 2. Write package.json (paste template above)
# Or use: cat > package.json << 'EOF' ... EOF

# 3. Create placeholder images
python3 -c "
import struct, zlib

def png(w, h, r, g, b, path):
    sig = b'\\x89PNG\\r\\n\\x1a\\n'
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    crc = zlib.crc32(b'IHDR' + ihdr) & 0xffffffff
    ihdr_c = struct.pack('>I', len(ihdr)) + b'IHDR' + ihdr + struct.pack('>I', crc)
    raw = b''.join(b'\\x00' + bytes([r,g,b])*w for _ in range(h))
    comp = zlib.compress(raw)
    crc2 = zlib.crc32(b'IDAT' + comp) & 0xffffffff
    idat = struct.pack('>I', len(comp)) + b'IDAT' + comp + struct.pack('>I', crc2)
    crc3 = zlib.crc32(b'IEND') & 0xffffffff
    iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', crc3)
    with open(path, 'wb') as f: f.write(sig + ihdr_c + idat + iend)

png(1024, 1024, 59, 130, 246, 'assets/icon.png')
png(1242, 2436, 26, 26, 46, 'assets/splash.png')
png(1024, 1024, 59, 130, 246, 'assets/adaptive-icon.png')
png(32, 32, 59, 130, 246, 'assets/favicon.png')
print('Assets created!')
"

# 4. Install dependencies
npm install --legacy-peer-deps

# 5. Start Expo
npx expo start --clear
```

## Version Mismatch Error Pattern

If you see this red screen on your phone:
```
[runtime not ready]: console.error: React Native version mismatch.
JavaScript version: 0.79.0
Native version: 0.81.4
```

**Root cause:** Your `package.json` has the wrong React Native version.
**Fix:** Update `package.json` to use `react-native: 0.81.5` and `react: 19.1.0`, then `rm -rf node_modules package-lock.json && npm install --legacy-peer-deps`.

## Missing Asset Error Pattern

If you see:
```
Unable to resolve asset "./assets/splash.png" from "splash.image"
```

**Fix:** Create the `assets/` folder and generate the 4 required PNG files (see Quick Setup Commands above).

## Node.js Version Warning

If you see `EBADENGINE` warnings during `npm install`:
```
required: { node: '>= 20.19.4' }
current: { node: 'v20.11.0' }
```

These are **warnings**, not errors. The install usually succeeds. But for cleanest setup, upgrade Node.js via:
```bash
# Using Homebrew on Mac
brew upgrade node

# Or use nvm
nvm install 20.19.4
nvm use 20.19.4
```

## When This Skill Applies

- Creating any new Expo project
- Fixing "React Native version mismatch" errors
- Fixing "Unable to resolve asset" errors for splash/icon
- Reinstalling after deleting `node_modules`
- Setting up a new dev environment for an existing Expo app

## Common Expo Go Version Check

To verify what version your phone's Expo Go currently supports:
1. Open Expo Go app
2. Check the version in Settings or About
3. Or just scan the QR — the red screen will tell you the "Native version" number

Then match `react-native` in `package.json` to that exact version.
