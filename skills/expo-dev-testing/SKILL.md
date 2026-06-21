# Expo Dev Testing Workflow

## Purpose
Fastest way to test React Native + Expo apps on a real device. Clone → Install → Scan QR → Test live. Only use CI builds when the app is actually ready.

## When to Use
- Testing new features before building
- Debugging crashes (APK not opening, black screen, etc.)
- Rapid iteration — see changes instantly on device
- Any React Native + Expo app (RecipeWise, CarbuyingAssistant, TradePulse, etc.)

## Prerequisites
- Node.js 18+ installed on Mac
- Git with SSH key configured (check: `ssh -T git@github.com`)
- Expo Go app installed on iPhone/Android from App Store
- Phone and laptop on **same WiFi network**

## The Commands

### Step 1: Clone via SSH (One-time per project)

```bash
cd ~
# For RecipeWise
git clone git@github.com:taqihas1/RecipeWise.git recipewise

# For CarbuyingAssistant
git clone git@github.com:taqihas1/Carbuyingassistant.git carbuyassistant

# For TradePulse
git clone git@github.com:taqihas1/tradepulse.git tradepulse
```

### Step 2: Install & Start (Every session)

```bash
cd ~/recipewise  # or ~/carbuyassistant, ~/tradepulse

# If node_modules exists, skip install
# If fresh clone or package.json changed:
npm install --legacy-peer-deps

# 🚀 RECOMMENDED: Use --offline to skip login prompt and avoid timeout issues
npx expo start --clear --offline
```

### Step 3: Scan QR Code

1. Open **Expo Go** app on your phone
2. Tap **"Scan QR Code"**
3. Point camera at the QR shown in terminal
4. App loads instantly! 🎉

### Step 4: Hot Reload Testing

- Edit any file in the repo
- Save (Ctrl+S)
- App updates **automatically** on your phone!
- No rebuild needed!

## Troubleshooting

### "Tunnel not found" or QR won't scan / "Request timed out"

**Primary fix — Use --offline flag:**
```bash
# This skips the Expo login prompt AND avoids network timeout issues
npx expo start --clear --offline
```

**If that doesn't work, try tunnel mode:**
```bash
npx expo start --tunnel --clear
```

**Also check:**
```bash
# Kill any stale expo processes
pkill -f "expo"

# Restart with offline mode
npx expo start --clear --offline
```

### "Metro bundler cache" issues
```bash
rm -rf node_modules/.cache
npx expo start --clear
```

### iPhone says "Cannot connect to server"
- Phone and laptop must be on **same WiFi**
- Try `npx expo start --lan` instead of default
- Check firewall: `sudo ufw allow 8081` (if on Linux)

### App crashes on open in Expo Go
1. Check Expo Go version matches project SDK
   - RecipeWise = Expo SDK 54
   - CarbuyingAssistant = Expo SDK 54
2. If mismatch, update Expo Go from App Store
3. Or downgrade project SDK in `package.json`

## Workflow Decision Tree

```
AI makes code changes → Git push → You pull on Mac → npx expo start --clear --offline → Scan QR → Test on phone
                                    ↓
                           App works? → YES → GitHub Actions build APK/IPA
                                    ↓
                           App works? → NO → Tell AI what's broken → AI fixes → Loop
```

**Always use `--offline` flag** — it skips the Expo login prompt and avoids the "Request timed out" error that happens when Expo tries to authenticate.

## When to Build (GitHub Actions)

ONLY build when:
- ✅ All features tested and working in Expo Go
- ✅ No crashes, black screens, or navigation issues
- ✅ UI looks correct on real device
- ✅ Ready for app store submission

NEVER build when:
- ❌ App crashes on open
- ❌ You haven't tested in Expo Go yet
- ❌ Just made major changes and want to "see if it works"

## Speed Comparison

| Method | Time to Test | Can Debug? | Reliable? |
|--------|-------------|------------|-----------|
| Expo Go QR | 30 seconds | ✅ Hot reload | ✅ Always works |
| GitHub Actions APK | 15-25 min | ❌ Must rebuild | ⚠️ May not install |
| Local APK build | 5-10 min | ❌ Must rebuild | ⚠️ Device-specific issues |

## Projects Using This Workflow

| App | Repo Path | Expo SDK |
|-----|-----------|----------|
| RecipeWise | `~/recipewise` | 54 |
| CarbuyingAssistant | `~/carbuyassistant` | 54 |
| TradePulse | `~/tradepulse` | 54 |

## Pro Tips

1. **Always use `--offline`** — skips login prompt, avoids timeout errors
2. **Always use `--clear`** after AI pushes code — clears Metro cache
3. **Keep terminal open** — that's your dev server
4. **Shake phone** in Expo Go → opens debug menu (reload, perf monitor)
5. **Screen mirror** with QuickTime or Scrcpy to show AI screenshots of bugs
6. **Git pull before each test session** to get latest AI changes:
   ```bash
   cd ~/recipewise && git pull && npx expo start --clear --offline
   ```

## Commands Cheat Sheet

```bash
# Full test cycle (RECOMMENDED with --offline)
cd ~/recipewise && git pull && npx expo start --clear --offline

# If install needed
cd ~/recipewise && git pull && npm install --legacy-peer-deps && npx expo start --clear --offline

# Fresh clone
cd ~ && git clone git@github.com:taqihas1/RecipeWise.git recipewise && cd recipewise && npm install --legacy-peer-deps && npx expo start --clear --offline

# Tunnel mode (if offline doesn't work)
cd ~/recipewise && npx expo start --tunnel --clear
```
