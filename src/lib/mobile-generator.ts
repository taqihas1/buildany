import { db } from './db';
import { projectFiles, deployments } from './db/schema';
import { eq } from 'drizzle-orm';
import { generateComponentCode } from './ai-component-generator';
import { generateMobileScreen } from './ai-mobile-screen';

interface MobileProjectOptions {
  projectId: string;
  projectName: string;
  description: string;
  type: string;
  platform: 'ios' | 'android' | 'both';
}

export async function generateMobileProject(options: MobileProjectOptions) {
  const { projectId, projectName, description, platform } = options;

  const buildId = `mobile-${Date.now()}`;

  const files = await generateExpoProjectFiles({
    projectName,
    description,
    platform,
  });

  for (const file of files) {
    await db.insert(projectFiles).values({
      id: crypto.randomUUID(),
      projectId,
      path: file.path,
      content: file.content,
      language: file.type || 'typescript',
      isGenerated: true,
    }).onConflictDoUpdate({
      target: [projectFiles.projectId, projectFiles.path],
      set: { content: file.content, updatedAt: new Date() },
    });
  }

  await db.insert(deployments).values({
    id: crypto.randomUUID(),
    projectId,
    provider: platform === 'both' ? 'ios+android' : platform,
    status: 'ready',
    url: `/api/project/${projectId}/download/mobile`,
    createdAt: new Date(),
  }).onConflictDoNothing();

  return { buildId, files };
}

interface ExpoProjectInput {
  projectName: string;
  description: string;
  platform: 'ios' | 'android' | 'both';
}

async function generateExpoProjectFiles(input: ExpoProjectInput) {
  const { projectName, description } = input;
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const screens = generateScreensFromDescription(description);

  const files = [
    {
      path: 'package.json',
      type: 'config',
      content: generatePackageJson(safeName),
    },
    {
      path: 'app.json',
      type: 'config',
      content: generateAppJson(safeName, projectName),
    },
    {
      path: 'App.tsx',
      type: 'code',
      content: generateAppEntry(safeName, screens),
    },
    {
      path: 'tsconfig.json',
      type: 'config',
      content: generateTsConfig(),
    },
    ...screens.map(screen => ({
      path: `src/screens/${screen.name}.tsx`,
      type: 'code',
      content: screen.code,
    })),
    {
      path: 'src/components/common/Header.tsx',
      type: 'code',
      content: generateHeaderComponent(),
    },
    {
      path: 'src/components/common/Button.tsx',
      type: 'code',
      content: generateButtonComponent(),
    },
    {
      path: 'src/theme/colors.ts',
      type: 'code',
      content: generateThemeColors(),
    },
    {
      path: 'eas.json',
      type: 'config',
      content: generateEasConfig(),
    },
  ];

  return files;
}

function generateScreensFromDescription(description: string) {
  const screens = [
    {
      name: 'HomeScreen',
      title: 'Home',
      code: generateHomeScreen(),
    },
    {
      name: 'ProfileScreen',
      title: 'Profile',
      code: generateProfileScreen(),
    },
  ];

  if (description.toLowerCase().includes('list') || description.toLowerCase().includes('feed')) {
    screens.push({
      name: 'ListScreen',
      title: 'List',
      code: generateListScreen(),
    });
  }

  if (description.toLowerCase().includes('map') || description.toLowerCase().includes('location')) {
    screens.push({
      name: 'MapScreen',
      title: 'Map',
      code: generateMapScreen(),
    });
  }

  return screens;
}

function generatePackageJson(name: string) {
  return JSON.stringify({
    name,
    version: '1.0.0',
    main: 'expo/AppEntry.js',
    scripts: {
      start: 'expo start --clear',
      android: 'expo start --android',
      ios: 'expo start --ios',
      web: 'expo start --web',
      build: 'eas build',
    },
    dependencies: {
      expo: '^54.0.0',
      'expo-status-bar': '~2.2.0',
      'expo-router': '~4.0.0',
      react: '19.1.0',
      'react-native': '0.81.5',
      'react-native-safe-area-context': '5.4.0',
      'react-native-screens': '~4.10.0',
      '@react-navigation/native': '^7.0.0',
      '@react-navigation/stack': '^7.0.0',
      'react-native-gesture-handler': '~2.24.0',
      'react-native-reanimated': '~3.17.0',
      '@react-native-async-storage/async-storage': '2.1.2',
      'react-native-vector-icons': '^10.2.0',
    },
    devDependencies: {
      '@babel/core': '^7.20.0',
      '@types/react': '~19.0.0',
      'typescript': '~5.8.0',
    },
    private: true,
  }, null, 2);
}

function generateAppJson(name: string, displayName: string) {
  return JSON.stringify({
    expo: {
      name: displayName,
      slug: name,
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'light',
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
      assetBundlePatterns: ['**/*'],
      ios: {
        supportsTablet: true,
        bundleIdentifier: `com.${name}.app`,
      },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff',
        },
        package: `com.${name}.app`,
      },
      web: {
        favicon: './assets/favicon.png',
      },
      plugins: [
        'expo-router',
      ],
    },
  }, null, 2);
}

function generateTsConfig() {
  return JSON.stringify({
    extends: 'expo/tsconfig.base',
    compilerOptions: {
      strict: true,
      paths: {
        '@/*': ['./src/*'],
      },
    },
  }, null, 2);
}

function generateEasConfig() {
  return JSON.stringify({
    cli: {
      version: '>= 14.0.0',
    },
    build: {
      development: {
        developmentClient: true,
        distribution: 'internal',
      },
      preview: {
        distribution: 'internal',
        ios: {
          enterpriseProvisioning: 'adhoc',
        },
      },
      production: {},
    },
    submit: {
      production: {},
    },
  }, null, 2);
}

function generateAppEntry(appName: string, screens: any[]) {
  const imports = screens.map(s => `import ${s.name} from './src/screens/${s.name}';`).join('\n');
  const routes = screens.map(s => `<Stack.Screen name="${s.name}" component={${s.name}} options={{ title: '${s.title}' }} />`).join('\n    ');

  return `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
${imports}

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator initialRouteName="${screens[0]?.name || 'HomeScreen'}">
    ${routes}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}`;
}

function generateHomeScreen() {
  return `import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { colors } from '../theme/colors';

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Header title="Home" />
      <ScrollView style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Welcome!</Text>
          <Text style={styles.heroSubtitle}>Your app is ready</Text>
        </View>
        <View style={styles.section}>
          <Button
            title="Go to Profile"
            onPress={() => navigation.navigate('ProfileScreen')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  hero: { padding: 24, alignItems: 'center' },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  heroSubtitle: { fontSize: 16, color: colors.secondary, marginTop: 8 },
  section: { padding: 16 },
});`;
}

function generateProfileScreen() {
  return `import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { colors } from '../theme/colors';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Header title="Profile" showBack />
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.name}>User Name</Text>
        <Text style={styles.email}>user@example.com</Text>
        <View style={styles.actions}>
          <Button title="Edit Profile" onPress={() => {}} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36 },
  name: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginTop: 16 },
  email: { fontSize: 14, color: colors.secondary, marginTop: 4 },
  actions: { width: '100%', marginTop: 24 },
});`;
}

function generateListScreen() {
  return `import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Header } from '../components/common/Header';
import { colors } from '../theme/colors';

const MOCK_DATA = [
  { id: '1', title: 'Item 1', description: 'Description for item 1' },
  { id: '2', title: 'Item 2', description: 'Description for item 2' },
  { id: '3', title: 'Item 3', description: 'Description for item 3' },
];

export default function ListScreen() {
  const [items] = useState(MOCK_DATA);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.item}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemDesc}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header title="List" showBack />
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  item: { padding: 16, backgroundColor: colors.card, borderRadius: 12, marginBottom: 12 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  itemDesc: { fontSize: 14, color: colors.secondary, marginTop: 4 },
});`;
}

function generateMapScreen() {
  return `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Header } from '../components/common/Header';
import { colors } from '../theme/colors';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Header title="Map" showBack />
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>🗺️ Map View</Text>
        <Text style={styles.placeholderSub}>Integrate react-native-maps here</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 48 },
  placeholderSub: { fontSize: 14, color: colors.secondary, marginTop: 8 },
});`;
}

function generateHeaderComponent() {
  return `import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';

interface HeaderProps {
  title: string;
  showBack?: boolean;
}

export function Header({ title, showBack }: HeaderProps) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {showBack && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: colors.primary },
  backButton: { marginBottom: 8 },
  backText: { color: '#fff', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
});`;
}

function generateButtonComponent() {
  return `import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ title, onPress, variant = 'primary' }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, variant === 'secondary' && styles.secondary]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, variant === 'secondary' && styles.secondaryText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center' },
  secondary: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryText: { color: colors.primary },
});`;
}

function generateThemeColors() {
  return `export const colors = {
  primary: '#6366f1',
  secondary: '#64748b',
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
};

export const darkColors = {
  primary: '#818cf8',
  secondary: '#94a3b8',
  background: '#0f172a',
  surface: '#1e293b',
  card: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  border: '#334155',
  error: '#f87171',
  success: '#4ade80',
  warning: '#fbbf24',
};`;
}
