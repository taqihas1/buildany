---
name: expo-react-native-debug
description: Pre-flight diagnostic and remediation tool for Expo + React Native projects. Use when building, upgrading, or debugging Expo React Native apps to catch version mismatches, peer dependency conflicts, tunnel issues, Metro bundler cache problems, and code syntax errors before they cause runtime errors. Triggers on phrases like "expo error", "react native build fail", "metro bundler", "expo go", "version mismatch", "ERESOLVE", "tunnel error", "could not connect to development server", "incompatible react versions", "syntax error", "unexpected token".
---

# Expo React Native Pre-Flight Debugger

## Purpose

Prevent the most common Expo/React Native runtime failures by checking them before the user tries to run the app. Based on hard-won debugging experience.

## The Fatal Errors (and how to catch them early)

### 1. Expo SDK Version Mismatch
**Symptom:** "This project uses SDK X but your Expo Go app only supports SDK Y"
**Root cause:** Expo Go on iOS/Android auto-updates to latest SDK. Older projects break.
**Fix:** Check user's Expo Go version and match the project to it, OR upgrade project to latest SDK.

### 2. React Version Mismatch
**Symptom:** `Error: Incompatible React versions: react@19.0.0 vs react-native-renderer@19.1.0`
**Root cause:** `react` and `react-native-renderer` must match exactly.
**Fix:** Check `node_modules/react-native/package.json` for `peerDependencies.react`, then `npm install react@<exact_version>`.

### 3. Peer Dependency ERESOLVE
**Symptom:** `npm ERR! ERESOLVE could not resolve` during `npm install`
**Root cause:** npm v7+ strict peer dependency checking conflicts with Expo's pinned versions.
**Fix:** Always use `--legacy-peer-deps` when installing packages in Expo projects.

### 4. Metro Bundler Cache Corruption
**Symptom:** "unexpected end of JSON input", stale bundles, old code showing after edits
**Root cause:** Metro aggressively caches compiled bundles. Cache gets corrupted on version changes and holds OLD code even after file edits.
**Fix:** Always restart with `--clear` flag after any code change.

### 5. ngrok Tunnel Staleness / Port Conflict / Server Crash
**Symptom:** "Could not connect to development server" — URL shows at bottom of screen, but bundle won't load
**Root causes:**
- Old ngrok tunnels expire, or multiple Expo instances fight for port 8081
- Server process crashed silently after bundling — tunnel still "works" for manifest but bundle endpoint is dead
- ngrok gateway error: tunnel URL returns HTML error page instead of bundle
**Fix:**
1. Kill ALL processes: `pkill -f "expo start"; pkill -f ngrok`
2. Clear cache: `rm -rf .expo/`
3. Restart: `npx expo start --tunnel --clear`
4. Verify tunnel health: `curl http://localhost:4040/api/tunnels`
5. Verify bundle endpoint: `curl "http://<TUNNEL>/node_modules/expo/AppEntry.bundle?platform=ios&dev=true" | tail -3`

**Critical:** After server restart, ALWAYS generate a NEW QR code — the tunnel URL may have changed!

### 6. Stale Code / Syntax Errors from Bad Edits
**Symptom:** `SyntaxError: Unexpected token`, `Identifier has already been declared`, or code from old versions still running
**Root cause:** After editing files, stray characters (extra `)`, `}`, `;`) or dead code blocks get left behind. Metro cache hides this until `--clear`.
**Fix:** After EVERY edit, run `npx tsc --noEmit` to verify the file compiles. Read the full affected function block to confirm it's clean.

### 7. QR Code Opens Safari Instead of Expo Go
**Symptom:** Scanning QR opens web browser showing JSON manifest instead of loading in Expo Go
**Root cause:** QR code contains `http://` or `https://` URL. iPhone Camera app opens these in Safari.
**Fix:** QR code MUST use `exp://` protocol. Convert `http://u7awrsy...` to `exp://u7awrsy...`.

### 8. Expo Go Cached Tile Loads Old Broken Build
**Symptom:** App opens but shows old error, even after fixes
**Root cause:** Expo Go's "Recently Opened" section caches the previous build. The old tile loads the old bundle.
**Fix:** Delete the old app tile from Expo Go home screen, then load via fresh QR/URL.

## Pre-Flight Checklist (Run this before every `expo start`)

### Step 0: Kill All Lingering Expo Processes
**Critical:** Multiple Expo instances on port 8081 cause "Port in use" silent failures.
```bash
pkill -f "expo start" 2>/dev/null || true
sleep 2
# Verify port is free
lsof -i :8081 2>/dev/null || echo "Port 8081 is free"
```

### Step 1: Check Expo SDK Compatibility
```bash
cd <project-dir>
npx expo --version              # Get CLI version
cat node_modules/expo/package.json | grep version  # Get project SDK version
```
Match project SDK to Expo Go app. If user reports their Expo Go version, upgrade project:
```bash
npm install expo@~<SDK_VERSION>.0.0 react-native@<MATCHING_RN_VERSION> react@<MATCHING_REACT_VERSION> --save --legacy-peer-deps
```

SDK-to-React mapping (as of 2025):
- SDK 54 → React Native 0.81.x → React 19.1.x
- SDK 53 → React Native 0.79.x → React 19.0.x
- SDK 52 → React Native 0.76.x → React 18.3.x
- SDK 51 → React Native 0.74.x → React 18.2.x

### Step 2: Verify React Version Alignment
```bash
cd <project-dir>
# Check installed react version
node -e "console.log(require('./node_modules/react/package.json').version)"
# Check what react-native expects
node -e "console.log(require('./node_modules/react-native/package.json').peerDependencies?.react || 'not specified')"
# Check react-native-renderer (this is what actually loads in Metro)
node -e "console.log(require('./node_modules/react-native-renderer/package.json')?.version || 'react-native-renderer not found')"
```
If mismatch: `npm install react@<expected_version> --save --legacy-peer-deps`

### Step 3: Check for Port Conflicts
```bash
lsof -i :8081 2>/dev/null || ss -tlnp | grep 8081 || echo "Port 8081 is free"
```
If occupied, kill existing Expo processes:
```bash
pkill -f "expo start" || true
sleep 2
rm -rf .expo/
```

### Step 4: Verify ngrok Tunnel Health
```bash
curl -s --max-time 10 http://localhost:4040/api/tunnels 2>/dev/null | grep public_url
curl -s --max-time 10 -o /dev/null -w "%{http_code}" <TUNNEL_URL> 2>/dev/null
```
Expected: `200`. If not, restart tunnel by killing and restarting `expo start --tunnel`.

### Step 5: Verify No Stale Code / Syntax Errors
**Critical after any code edit:** Always verify the edited file compiles before starting Metro.
```bash
cd <project-dir>
npx tsc --noEmit 2>&1 | head -20
```
If errors exist, fix them **before** starting the dev server. Metro cache can hide errors until `--clear`.

**Common post-edit traps:**
- Stray closing parentheses `)` from partial replacements
- Dead code after `return` statements (never executes, but parser still trips)
- Duplicate function declarations from overlapping edits
- Missing imports after deleting files
- Mismatched braces `{}` or brackets `[]`

**Rule:** After every edit, read the full affected function block (±20 lines) to confirm it's clean.

### Step 6: Always Start With `--clear` After Code Changes
Metro bundler aggressively caches. Old code will persist even after file edits.
```bash
npx expo start --clear        # local
npx expo start --tunnel --clear  # tunnel
```

### Step 7: Verify Bundle Compiles
```bash
curl -s --max-time 30 "http://localhost:8081/node_modules/expo/AppEntry.bundle?platform=ios&dev=true" | tail -3
```
Expected: Ends with `__r(0);` and `//# sourceMappingURL=`. If truncated, Metro is still bundling or cache is corrupted.

## Post-Edit Verification Checklist

After EVERY code edit, before starting the dev server:

1. **Read the affected block**: `read <file>`, check ±20 lines around the edit
2. **Type-check**: `npx tsc --noEmit` or at least `npx tsc --noEmit <edited_file>`
3. **Check for duplicates**: `grep -n "function <name>" <file>`
4. **Clear Metro cache**: Start with `--clear`
5. **Kill old processes**: `pkill -f "expo start"` before starting new server

## QR Code Generation Rules

### Dynamic URL (Never Hardcode)
Tunnel URLs change every session. Hardcoded URLs cause 404 errors.
```javascript
// generate_qr.js - Fetch live URL from ngrok API
const http = require('http');
http.get('http://localhost:4040/api/tunnels', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const url = json.tunnels?.[0]?.public_url;
    // Convert http:// to exp:// for Expo Go deep linking
    const expUrl = url.replace(/^https?:\/\//, 'exp://');
    generateQR(expUrl);
  });
});
```

### Protocol Matters
| Protocol | Result when scanned |
|----------|-------------------|
| `http://` | Opens Safari with JSON manifest (wrong!) |
| `https://` | Opens Safari with JSON manifest (wrong!) |
| `exp://` | Opens directly in Expo Go (correct!) |

## Auto-Remediation Script

Use the bundled script for automated diagnosis:
```bash
node scripts/expo-preflight.js <project-directory>
```

The script will:
1. Check SDK version and warn if outdated
2. Verify React version alignment
3. Check for port conflicts
4. Test Metro bundle compilation
5. Report all issues with fix commands

## Complete Project Upgrade Workflow

When upgrading an Expo project to a newer SDK:

1. **Backup**: `cp package.json package.json.bak`
2. **Check target SDK**: Ask user their Expo Go version, or check https://docs.expo.dev/versions/latest/
3. **Install new SDK**:
   ```bash
   npm install expo@~<NEW_SDK>.0.0 --save --legacy-peer-deps
   npx expo install --fix  # Let Expo fix compatible native module versions
   ```
4. **Verify React alignment**: Run Step 2 from checklist above
5. **Clear Metro cache**: `npx expo start --clear`
6. **Test bundle compilation**: Run Step 7 from checklist
7. **Generate new QR**: Use dynamic script (never hardcode URL)

## Reference: Common Expo Go SDK Versions

See `references/expo-sdk-compatibility.md` for the full SDK-to-dependency mapping table.

## Reference: npm install Flags for Expo

- `--legacy-peer-deps`: **Always required** for Expo projects to avoid ERESOLVE
- `--force`: Only if `--legacy-peer-deps` fails
- `EXPO_NO_DEPENDENCY_VALIDATION=1`: Skip Expo's own validation (use when upstream is buggy)

## Reference: Useful Diagnostic Commands

```bash
# Expo diagnostics
npx expo doctor

# Reset everything
rm -rf node_modules/ .expo/ package-lock.json
npm install --legacy-peer-deps

# Metro logs
npx expo start --clear

# Check which native modules need updating
npx expo install --check

# Find duplicate function declarations
grep -n "function " src/services/*.ts

# Check specific file for syntax issues
npx tsc --noEmit src/services/carApi.ts
```

### 11. Expo SDK Upgrade to SDK 54 (Latest)
**Standard practice:** All new and existing projects should target Expo SDK 54.

**SDK 54 dependency mapping:**
- `expo@~54.0.0`
- `react-native@0.81.x`
- `react@19.1.x` (or `19.0.0` to start, then adjust)

**Upgrade command:**
```bash
cd <project-dir>
npx expo install expo@~54.0.0 react@19.0.0 react-native@0.79.0 --legacy-peer-deps
npx expo start --clear --offline
```

**Verify after upgrade:**
- Check `node_modules/expo/package.json` → version should start with `54.`
- Check user's Expo Go app version matches SDK 54
- Clear Metro cache: `npx expo start --clear`

## Quick Fixes Cheat Sheet

| Error | Quick Fix |
|-------|-----------|
| "SDK mismatch" | Upgrade `expo` package to match Expo Go |
| "Incompatible React versions" | `npm install react@<renderer_version> --save --legacy-peer-deps` |
| "ERESOLVE" | Add `--legacy-peer-deps` to npm install |
| "Could not connect" | Server/tunnel dead. Kill all expo+ngrok, `rm -rf .expo/`, restart with `--clear`, generate NEW QR |
| "unexpected end of JSON" | Metro cache corrupted. Restart with `--clear` |
| Port 8081 in use | `pkill -f "expo start"`, then restart |
| ngrok tunnel dead | `pkill -f ngrok`, restart `expo start --tunnel` |
| QR opens Safari | QR must use `exp://` not `http://` |
| QR 404 error | Tunnel URL expired. Regenerate from live ngrok API |
| Old app still showing | Delete cached tile in Expo Go, reload fresh |
| SyntaxError after edit | `npx tsc --noEmit`, fix stray `)` or dead code |
| QR download fails / image won't open | Provide QR as ZIP file with PNG inside for guaranteed download |

## Golden Rules (Memorize These)

1. **Always `--legacy-peer-deps`** for npm installs in Expo projects
2. **Always `--clear`** when starting after code changes
3. **Always `pkill -f "expo start"`** before starting a new server
4. **Always verify with `tsc`** after editing TypeScript files
5. **Always use `exp://`** for QR code URLs
6. **Always generate QR dynamically** — never hardcode tunnel URLs
7. **Always read the full function block** after editing to check for stray code
8. **Always use GitHub Actions for EAS Build** — never build locally. Push to `main` and let CI handle iOS/Android builds
9. **Always provide QR as downloadable file** — Inline images may not render in all chat clients. ZIP with PNG is safest.
10. **Always verify QR scans correctly** before telling user to scan — test with `curl` on tunnel URL first.

## EAS Build CI/CD (GitHub Actions)

**Standard practice:** Always use GitHub Actions to build iOS/Android via EAS. Never build locally.

### Setup

1. **Install EAS CLI** (one-time):
   ```bash
   npm install -g eas-cli
   ```

2. **Create EAS project**:
   ```bash
   cd <project-dir>
   eas build:configure
   # Copy the project ID from output
   ```

3. **Add `eas.json`** with preview + production profiles:
   ```json
   {
     "cli": { "version": ">= 16.0.0" },
     "build": {
       "preview": {
         "distribution": "internal",
         "android": { "buildType": "apk" },
         "ios": { "enterpriseProvisioning": "adhoc" }
       },
       "production": {
         "distribution": "store",
         "android": { "buildType": "app-bundle" },
         "ios": { "enterpriseProvisioning": "adhoc" }
       }
     }
   }
   ```

4. **Add EAS project ID to `app.json`**:
   ```json
   {
     "expo": {
       "extra": {
         "eas": { "projectId": "YOUR_PROJECT_ID" }
       }
     }
   }
   ```

5. **Get Expo token**:
   - Go to https://expo.dev/accounts/[username]/settings/access-tokens
   - Create token → Name it `github-actions`
   - Copy token (shown once!)

6. **Add GitHub Secret**:
   - Go to https://github.com/[user]/[repo]/settings/secrets/actions
   - New repository secret → Name: `EXPO_TOKEN` → Value: your token

7. **Create `.github/workflows/eas-build.yml`**:
   ```yaml
   name: EAS Build
   on:
     push:
       branches: [main]
     workflow_dispatch:
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 20 }
         - uses: expo/expo-github-action@v8
           with: { eas-version: latest, token: ${{ secrets.EXPO_TOKEN }} }
         - run: npm install --legacy-peer-deps
         - run: eas build --platform ios --profile preview --non-interactive
         - run: eas build --platform android --profile preview --non-interactive
   ```

### What Happens

| Trigger | Action | Output |
|---------|--------|--------|
| Push to `main` | GitHub Actions triggers | EAS Build starts |
| EAS Build | Cloud builds iOS + Android | `.ipa` (iOS) + `.apk` (Android) |
| Download | EAS dashboard or CLI | Install on device |

### iOS Install Options (No App Store)

| Method | Requires | Best For |
|--------|----------|----------|
| **Expo Go** | Nothing (free) | Quick testing |
| **TestFlight** | Apple Dev ($99/yr) | Share with 100 people |
| **Ad Hoc** | Apple Dev + UDIDs | Specific devices only |
| **Diawi** | `.ipa` file | Share install link |

### For Testing (Expo Go)

```bash
npx expo start --clear --offline
# Scan QR with iPhone camera → opens in Expo Go
```

**User confirmed:** They always use Expo Go for testing. EAS Build is for sharing the real app.
