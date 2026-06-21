# react-native-screenshot-test Setup Guide

## Quick Setup (3 Steps)

### Step 1: Install

```bash
# For Expo projects (Headless mode - RECOMMENDED)
npm install react-native-screenshot-test

# For Simulator/Device mode (requires native modules)
sudo npm install react-native-screenshot-test react-native-view-shot react-native-fs
```

### Step 2: Add Script to package.json

```json
{
  "scripts": {
    "ss-test": "(npx expo start -c & sleep 2) && cd ./node_modules/screenshot-test-server/dist && node server.js true"
  }
}
```

For **Simulator/Device mode** (non-headless):
```json
{
  "scripts": {
    "ss-test": "cd ./node_modules/screenshot-test-server/dist && node server.js false"
  }
}
```

### Step 3: Create Test File

Create `ScreenshotTestApp.tsx` (see template in `ScreenshotTestApp.tsx`).

Then run:
```bash
npm run ss-test
```

This will:
1. Start Expo in headless mode
2. Start the screenshot test server
3. Capture screenshots of all components
4. Generate `ss-test/test.html` report

## View Results

Open `ss-test/test.html` in your browser to see:
- **Baseline** (previous screenshot)
- **Current** (new screenshot)
- **Diff** (pixel differences highlighted in red)

## Configuration Options

```typescript
interface ScreenshotConfig {
  path?: string;              // Output folder (default: 'ss-test')
  serverUrl?: string;         // Server URL (default: 'http://127.0.0.1:8080')
  batchSize?: number;         // Tests per batch (default: 10)
  maxWidth?: number;          // Max width in HTML (default: 500)
  backgroundColor?: string;   // Background color (default: transparent)
  showDiffInGrayScale?: boolean; // Show diff in gray (default: false)
  quality?: number;           // Screenshot quality 0-1 (default: 0.9)
}
```

## Component Interface

```typescript
interface TestComponent {
  component: (props?: any) => ReactElement;  // Your component
  title: string;                           // Display title
  id: string;                              // Unique identifier
  description?: string;                      // Optional description
  showDiffInGrayScale?: boolean;             // Override global setting
  maxWidth?: number;                        // Override global setting
  backgroundColor?: string;                 // Override global setting
  quality?: number;                        // Override (device mode only)
  autoCapture?: boolean;                    // Auto capture (device mode only)
}
```

## CI/CD Integration (GitHub Actions)

```yaml
name: Screenshot Tests

on: [push, pull_request]

jobs:
  screenshot-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'  # Required: Node 22+
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run screenshot tests
        run: npm run ss-test
        
      - name: Upload screenshots
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: screenshots
          path: ss-test/
```

## Troubleshooting

### "Server NOT running!!" Error

The default `serverUrl` is `http://127.0.0.1:8080`. If you get this error:

1. Find your network address:
   ```bash
   # macOS
   ipconfig getifaddr en0
   
   # Linux
   hostname -I
   ```

2. Use that IP in config:
   ```typescript
   const screenshotConfig = {
     serverUrl: "http://192.168.0.5:8080", // Your actual IP
   };
   ```

### Android Emulator
Use `http://10.0.2.2:8080` for Android emulator.

## Requirements

- **Node.js 22+** (required)
- Works with Expo and bare React Native
- Works with react-native-web (for headless mode)

## Example Report

See a live example: https://abhinandan-kushwaha.github.io/TestingCharts/ss-test/test.html

## Next Steps

1. Add screenshot tests to your CI/CD pipeline
2. Store baseline screenshots in version control
3. Review diffs in PRs before merging
4. Use for App Store screenshot generation
