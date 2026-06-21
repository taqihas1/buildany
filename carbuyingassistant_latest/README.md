# Car Buying Assistant 🚗

A cross-platform mobile app for finding, comparing, and analyzing real car listings. Built with React Native + Expo.

## Features

- 🔍 **Search Real Inventory** — Live car listings from actual dealer inventory (via MarketCheck API)
- 💰 **Deal Analyzer** — Compare prices against market value to spot great deals
- 📊 **Price Comparison** — See prices across multiple marketplaces
- 🗺️ **Dealer Locator** — Find dealerships near you with ratings and contact info
- 📋 **Vehicle History** — CARFAX-style reports and NHTSA recall checks
- 🔔 **Price Alerts** — Get notified when prices drop
- 📱 **Material Design UI** — Clean, modern interface with React Native Paper

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.74 | Core framework |
| Expo SDK | 54 | Development & build tooling |
| TypeScript | 5.1 | Type safety |
| React Navigation v6 | 6.x | Stack + Bottom Tab navigation |
| React Native Paper | 5.12 | Material Design UI components |
| React Native Maps | 1.18 | Interactive maps |
| Axios | 1.7 | API integration |

## Project Structure

```
dealership-app/
├── App.tsx                  # App entry point with PaperProvider + NavigationContainer
├── src/
│   ├── navigation/
│   │   ├── AppNavigator.tsx         # Root Stack Navigator
│   │   └── MainTabNavigator.tsx       # Bottom Tabs (Home, Map, Dealerships, Settings)
│   ├── screens/
│   │   ├── HomeScreen.tsx           # Search + featured listings
│   │   ├── SearchScreen.tsx         # Advanced search with filters
│   │   ├── ResultsScreen.tsx        # Listing results with deal badges
│   │   ├── CarDetailScreen.tsx      # Full vehicle details + history
│   │   ├── CompareScreen.tsx        # Side-by-side comparison
│   │   ├── MapScreen.tsx            # Map with dealer locations
│   │   ├── DealershipScreen.tsx     # Dealer list + details
│   │   ├── HistoryScreen.tsx        # CARFAX-style vehicle history
│   │   ├── FavoritesScreen.tsx      # Saved listings
│   │   └── SettingsScreen.tsx       # API keys + preferences
│   ├── services/
│   │   ├── carApi.ts                # Main car search API (MarketCheck → Apify → Simulated)
│   │   ├── marketCheckApi.ts        # MarketCheck API client
│   │   ├── apifyActor.ts            # Apify actor integration
│   │   ├── apifyScraper.ts          # Direct Apify scraper
│   │   ├── api.ts                   # Axios instance + helpers
│   │   └── geolocation.ts           # Location services
│   ├── store/
│   │   └── locationStore.ts         # Location state management
│   └── utils/
│       └── formatters.ts            # Price, mileage, date formatters
├── assets/                  # Images, fonts, etc.
└── package.json
```

## Data Sources

The app uses a **priority-based fallback system** for maximum reliability:

### 1. MarketCheck API (Recommended — Fastest & Most Reliable)
- **Source:** Real dealer inventory from across North America
- **Speed:** API response in ~500ms
- **Cost:** 500 free calls, then $0.002 per call (2/10ths of a penny)
- **Setup:** Sign up at [developers.marketcheck.com](https://developers.marketcheck.com) → copy API key → paste in Settings
- **Status:** Displays as "Live" when connected

### 2. Custom Apify Actor (Advanced — Your Own Scraper)
- **Source:** Scrapes AutoTrader, Cars.com, CarGurus
- **Speed:** 30-60 seconds per scrape
- **Cost:** Apify platform fees (~$5-10/month for hobby use)
- **Setup:** Deploy the included actor ZIP to Apify Console
- **Note:** Requires bot evasion expertise — some sites block datacenter IPs

### 3. Simulated Listings (Always Works)
- **Source:** Generated realistic data with market-based pricing
- **Use case:** Demo mode or when no API keys are configured
- **Toggle:** Turn off "Real Car Listings" in Settings to force simulated

## Quick Setup (MarketCheck — Easiest Path)

1. Go to **Settings** → **MarketCheck API**
2. Tap **"Open MarketCheck Developer Portal"**
3. Sign up for free (no credit card required)
4. Copy your **API Key**
5. Return to app → tap **"Add MarketCheck API Key"**
6. Paste key → **"Save MarketCheck Key"**
7. Tap **"Test Connection"** — you should see "Connected"
8. Search for cars — real inventory appears! 🔥

## Advanced Setup (Apify Actor)

If you prefer full control or want to scrape additional sites:

### Deploy the Actor

1. Zip the `apify-car-scraper/` folder (excluding `node_modules`):
   ```bash
   cd apify-car-scraper
   rm -rf node_modules  # Important! Don't upload node_modules
   zip -r ../apify-actor.zip .
   ```

2. Go to [Apify Console](https://console.apify.com/actors/new) → **Upload Actor**

3. Upload the ZIP file and wait for build to complete

4. Get your **Actor ID** from the URL (e.g., `your-username/car-marketplace-scraper`)

5. In the app, go to **Settings** → **Data Sources** → **Add API Key**

6. Enter:
   - **Apify API Token:** Get from [Apify Integrations](https://console.apify.com/account/integrations)
   - **Actor ID:** Your actor ID (use `~` not `/` — e.g., `username~actor-name`)

7. Tap **Save Configuration**

8. The status should change to **"Ready"**

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo Go app (iOS/Android) for testing on physical devices

### Installation

```bash
cd dealership-app
npm install
```

### Running the App

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Run on Web
npm run web
```

### Scan QR Code with Expo Go

When you run `npm start`, a QR code appears in the terminal. Scan it with the **Expo Go** app on your phone to instantly preview the app.

## Screenshots

| Home | Search | Results | Detail |
|------|--------|---------|--------|
| Dashboard with search bar | Advanced filters | Listings with deal badges | Full vehicle info + history |

## Navigation Flow

```
App (PaperProvider + NavigationContainer)
└── Stack Navigator
    ├── MainTabs (Bottom Tabs)
    │   ├── Home Tab (Dashboard + Search)
    │   ├── Map Tab (Dealer Locations)
    │   ├── Dealerships Tab (Dealer List)
    │   └── Settings Tab (Preferences + API Keys)
    ├── CarDetail (Stack Screen)
    ├── Compare (Stack Screen)
    ├── History (Stack Screen)
    └── Favorites (Stack Screen)
```

## API Endpoints Used

| API | Purpose | Auth |
|-----|---------|------|
| MarketCheck `/v2/search/car/active` | Real inventory search | API Key |
| NHTSA vPIC API | Vehicle makes, models, VIN decode | None (free) |
| NHTSA Recalls API | Safety recalls by VIN | None (free) |
| Apify Actor (custom) | Scrapes AutoTrader, Cars.com | Token + Actor ID |

## Build & Deploy

### Expo EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure build
eas build:configure

# Build for production
eas build --platform android
eas build --platform ios
```

### Local Build

```bash
# Android
expo prebuild
npx expo run:android --variant release

# iOS (macOS + Xcode required)
expo prebuild
npx expo run:ios --configuration Release
```

## License
MIT
