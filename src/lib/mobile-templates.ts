// Mobile Template Generator — Expo SDK 54 + React Native 0.81.5
// This module generates Expo project scaffolding when the user selects "mobile" type

import { randomUUID } from "crypto";

export interface MobileTemplate {
  packageJson: string;
  appJson: string;
  tsconfigJson: string;
  babelConfig: string;
  metroConfig: string;
  entryFile: string;
  appLayout: string;
  indexFile: string;
  themeFile: string;
  gitignore: string;
  easJson: string;
  githubWorkflow: string;
}

export function generateMobileTemplate(projectName: string): MobileTemplate {
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9]/g, "-");

  return {
    packageJson: JSON.stringify({
      name: safeName,
      version: "1.0.0",
      main: "expo/AppEntry.js",
      scripts: {
        start: "expo start --clear",
        android: "expo start --android",
        ios: "expo start --ios",
        web: "expo start --web",
        "build:android": "eas build --platform android",
        "build:ios": "eas build --platform ios",
        "build:preview": "eas build --profile preview",
      },
      dependencies: {
        "expo": "~54.0.0",
        "expo-status-bar": "~2.2.0",
        "expo-router": "~5.0.0",
        "expo-linking": "~7.0.0",
        "expo-constants": "~17.0.0",
        "expo-secure-store": "~14.0.0",
        "expo-image": "~2.0.0",
        "expo-linear-gradient": "~14.0.0",
        "react": "19.1.0",
        "react-native": "0.81.5",
        "react-native-gesture-handler": "~2.24.0",
        "react-native-reanimated": "~3.17.0",
        "react-native-safe-area-context": "5.4.0",
        "react-native-screens": "~4.10.0",
        "@react-native-async-storage/async-storage": "1.24.0",
        "@react-navigation/native": "^7.0.0",
        "@react-navigation/bottom-tabs": "^7.0.0",
        "@react-navigation/stack": "^7.0.0",
        "lucide-react-native": "^0.460.0",
        "clsx": "^2.1.1",
        "tailwind-merge": "^2.6.0",
        "nativewind": "^4.0.0",
      },
      devDependencies: {
        "@babel/core": "^7.25.0",
        "@types/react": "~19.0.0",
        "typescript": "~5.8.0",
        "tailwindcss": "^3.4.0",
      },
      private: true,
    }, null, 2),

    appJson: JSON.stringify({
      expo: {
        name: projectName,
        slug: safeName,
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "automatic",
        splash: {
          image: "./assets/splash.png",
          resizeMode: "contain",
          backgroundColor: "#0f172a",
        },
        assetBundlePatterns: ["**/*"],
        ios: {
          supportsTablet: true,
          bundleIdentifier: `com.${safeName}.app`,
        },
        android: {
          adaptiveIcon: {
            foregroundImage: "./assets/adaptive-icon.png",
            backgroundColor: "#0f172a",
          },
          package: `com.${safeName}.app`,
        },
        web: {
          favicon: "./assets/favicon.png",
          bundler: "metro",
        },
        plugins: [
          "expo-router",
          [
            "expo-secure-store",
            {
              configureAndroidBackup: true,
              faceIDPermission: "Allow $(PRODUCT_NAME) to access your Face ID biometric data.",
            },
          ],
        ],
        scheme: safeName,
        newArchEnabled: false,
        extra: {
          router: {
            origin: false,
          },
          eas: {
            projectId: "YOUR_EAS_PROJECT_ID",
          },
        },
      },
    }, null, 2),

    tsconfigJson: JSON.stringify({
      extends: "expo/tsconfig.base",
      compilerOptions: {
        strict: true,
        jsx: "react-jsx",
        baseUrl: ".",
        paths: {
          "@/*": ["./src/*"],
          "@/components/*": ["./src/components/*"],
          "@/screens/*": ["./src/screens/*"],
          "@/hooks/*": ["./src/hooks/*"],
          "@/lib/*": ["./src/lib/*"],
          "@/assets/*": ["./assets/*"],
        },
      },
      include: ["**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"],
    }, null, 2),

    babelConfig: `module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["nativewind/babel", "react-native-reanimated/plugin"],
  };
};`,

    metroConfig: `const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './src/styles.css' });`,

    entryFile: `import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Must be exported or Fast Refresh won't work
export function App() {
  return <ExpoRoot context={require.context('./src/app')} />;
}

registerRootComponent(App);`,

    appLayout: `import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});`,

    indexFile: `import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)" />;
}`,

    themeFile: `// Theme configuration for the app
// Follows the user's design philosophy: beautiful, competitive, customer-centric

export const colors = {
  // Primary palette
  primary: '#06b6d4',      // cyan-500
  primaryDark: '#0891b2',  // cyan-600
  secondary: '#3b82f6',    // blue-500
  
  // Background
  background: '#0f172a',   // slate-900
  surface: '#1e293b',      // slate-800
  elevated: '#334155',     // slate-700
  
  // Text
  text: '#f8fafc',         // slate-50
  textSecondary: '#94a3b8', // slate-400
  textMuted: '#64748b',    // slate-500
  
  // Status
  success: '#10b981',      // emerald-500
  warning: '#f59e0b',      // amber-500
  error: '#ef4444',        // red-500
  info: '#06b6d4',         // cyan-500
  
  // Border
  border: '#334155',       // slate-700
  borderLight: '#475569',  // slate-600
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};`,

    gitignore: `# Learn more https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files

# dependencies
node_modules/

# Expo
.expo/
dist/
web-build/

# Native
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
*.pem

# local env files
.env*.local

# typescript
*.tsbuildinfo

# EAS
.eas/`,

    easJson: JSON.stringify({
      cli: {
        version: ">= 5.0.0",
      },
      build: {
        development: {
          developmentClient: true,
          distribution: "internal",
          android: {
            buildType: "apk",
          },
        },
        preview: {
          distribution: "internal",
          android: {
            buildType: "apk",
          },
          ios: {
            enterpriseProvisioning: "adhoc",
          },
        },
        production: {
          autoIncrement: true,
          android: {
            buildType: "app-bundle",
          },
        },
      },
    }, null, 2),

    githubWorkflow: `name: EAS Build

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      
      - name: Setup Expo and EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: \${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm install --legacy-peer-deps
      
      - name: Build Android
        run: eas build --platform android --profile preview --non-interactive
      
      - name: Build iOS
        run: eas build --platform ios --profile preview --non-interactive
`,
  };
}

export function getMobileFileList(template: MobileTemplate): { path: string; content: string }[] {
  return [
    { path: "package.json", content: template.packageJson },
    { path: "app.json", content: template.appJson },
    { path: "tsconfig.json", content: template.tsconfigJson },
    { path: "babel.config.js", content: template.babelConfig },
    { path: "metro.config.js", content: template.metroConfig },
    { path: "index.js", content: template.entryFile },
    { path: "src/app/_layout.tsx", content: template.appLayout },
    { path: "src/app/index.tsx", content: template.indexFile },
    { path: "src/lib/theme.ts", content: template.themeFile },
    { path: ".gitignore", content: template.gitignore },
    { path: "eas.json", content: template.easJson },
    { path: ".github/workflows/eas-build.yml", content: template.githubWorkflow },
  ];
}

export function getMobileSystemPrompt(): string {
  return `You are an expert Expo/React Native developer. 

You are building a mobile app using:
- Expo SDK 54
- React Native 0.81.5
- React 19.1.0
- Expo Router for navigation
- NativeWind for styling (Tailwind CSS for React Native)
- Lucide React Native for icons

RULES:
1. All components must be React Native components (View, Text, ScrollView, etc.)
2. Use StyleSheet.create() for styles, or NativeWind classes
3. Navigation uses Expo Router file-based routing (app/ directory)
4. Icons come from lucide-react-native
5. Use the theme from src/lib/theme.ts for colors
6. Follow the user's design philosophy: beautiful, competitive, customer-centric
7. Every screen must have a clear purpose and pleasant UX
8. Use SafeAreaView for proper insets handling
9. Support dark mode with useColorScheme()
10. All async operations must handle loading and error states

Generate the app following the user's specific requirements. Output JSON with files array.`;
}
