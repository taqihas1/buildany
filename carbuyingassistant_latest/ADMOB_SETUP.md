# AdMob Setup for Car Buying Assistant

## What Was Added
- `react-native-google-mobile-ads` package installed
- Reusable `AdBanner` component in `src/components/AdBanner.tsx`
- Banner ads placed on 4 screens (non-intrusive bottom placement):
  - **Car Search** — below the car listings
  - **Car Detail** — below the action buttons
  - **Map** — below the map view
  - **Settings** — below the app info section
- Map height adjusted (`height - 170`) to make room for the banner
- `app.json` configured with Google test App IDs

## Current Config (TEST MODE)
The app is using **Google's official test IDs** — ads will show but earn no revenue.

### app.json
```json
"plugins": [
  ["react-native-google-mobile-ads", {
    "androidAppId": "ca-app-pub-3940256099942544~3347511713",
    "iosAppId": "ca-app-pub-3940256099942544~1458002511"
  }]
]
```

### AdBanner.tsx
```ts
const AD_UNIT_ID = TestIds.BANNER;  // Test mode
```

## How to Switch to REAL Ads (Production)

### Step 1: Create AdMob Account
1. Go to https://apps.admob.com
2. Sign up / log in
3. Add your app (Android + iOS)
4. Copy the **App IDs**:
   - Android: `ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy`
   - iOS: `ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy`

### Step 2: Create Banner Ad Units
1. In AdMob, go to **Ad Units** → **Banner**
2. Create one banner ad unit per app platform
3. Copy the **Ad Unit IDs**:
   - Android: `ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy`
   - iOS: `ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy`

### Step 3: Update app.json
Replace the test App IDs with your real ones:
```json
"plugins": [
  ["react-native-google-mobile-ads", {
    "androidAppId": "ca-app-pub-YOUR_ANDROID_APP_ID",
    "iosAppId": "ca-app-pub-YOUR_IOS_APP_ID"
  }]
]
```

### Step 4: Update AdBanner.tsx
Replace `TestIds.BANNER` with your real ad unit IDs:
```ts
const AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-YOUR_IOS_AD_UNIT_ID',
  android: 'ca-app-pub-YOUR_ANDROID_AD_UNIT_ID',
});
```

### Step 5: Rebuild
```bash
cd dealership-app
npm install
npx expo prebuild --clean
npx expo run:android
```

## Notes
- **Non-personalized ads** are requested by default (`requestNonPersonalizedAdsOnly: true`)
- Banner uses `ANCHORED_ADAPTIVE_BANNER` size — auto-fits screen width
- Ads won't show in Expo Go. Must build a **development build** or **production APK/AAB**.
- Test ads show a "Test Ad" label — safe to click during development.

## Package Added
```json
"react-native-google-mobile-ads": "^16.3.3"
```
