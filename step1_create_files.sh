#!/bin/bash
set -e

cd /Users/taqihasan/carbuyassistantgithub/Carbuyingassistant

echo "=== CREATING NEW FILES ==="

# 1. adminStore.ts
mkdir -p src/store
cat << 'ASTORE' > src/store/adminStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const REAL_DATA_KEY = '@admin_real_data_mode';

export async function getRealDataMode(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(REAL_DATA_KEY);
    return value === 'true';
  } catch {
    return true;
  }
}

export async function setRealDataMode(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(REAL_DATA_KEY, enabled ? 'true' : 'false');
}
ASTORE

# 2. getLocationZip.ts
mkdir -p src/utils
cat << 'ZUTIL' > src/utils/getLocationZip.ts
import * as Location from 'expo-location';

export async function getZipFromLocation(): Promise<string | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission denied');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.postcode || data.postalCode || null;
  } catch (error) {
    console.error('Error getting zip from location:', error);
    return null;
  }
}
ZUTIL

# 3. Clean SplashScreen.tsx
cat << 'SPLASH' > src/components/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();

    Animated.timing(barWidth, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const barWidthInterpolated = barWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={styles.logoCircle}>
          <Ionicons name="car-sport" size={64} color="#fff" />
        </View>
      </Animated.View>

      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.loadingBar, { width: barWidthInterpolated }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    width: width * 0.5,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  loadingBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
});
SPLASH

# 4. AdminScreen.tsx
cat << 'ADMIN' > src/screens/AdminScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getRealDataMode, setRealDataMode } from '../store/adminStore';
import {
  getMarketCheckConfig,
  setMarketCheckConfig,
  testMarketCheckConnection,
} from '../services/marketCheckApi';

const ADMIN_PASSWORD = 'Shazia123$';

export default function AdminScreen() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [realDataEnabled, setRealDataEnabled] = useState(true);
  const [marketCheckKey, setMarketCheckKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    const load = async () => {
      const mode = await getRealDataMode();
      setRealDataEnabled(mode);
      const mc = await getMarketCheckConfig();
      if (mc?.apiKey) setMarketCheckKey(mc.apiKey);
    };
    load();
  }, []);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
    } else {
      Alert.alert('Invalid Password', 'Please try again.');
    }
  };

  const toggleRealData = async (value: boolean) => {
    setRealDataEnabled(value);
    await setRealDataMode(value);
  };

  const saveMarketCheckKey = async () => {
    if (marketCheckKey.trim()) {
      await setMarketCheckConfig({ apiKey: marketCheckKey.trim() });
      const result = await testMarketCheckConnection();
      Alert.alert(
        result.success ? 'Connected' : 'Failed',
        result.success ? 'MarketCheck API is working.' : result.message
      );
    }
  };

  if (!authenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginBox}>
          <Ionicons name="lock-closed" size={48} color="#3b82f6" />
          <Text style={styles.loginTitle}>Admin Panel</Text>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter admin password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Unlock</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={32} color="#3b82f6" />
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Settings</Text>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Real Car Listings</Text>
              <Text style={styles.rowDesc}>Use MarketCheck API for live data</Text>
            </View>
            <Switch value={realDataEnabled} onValueChange={toggleRealData} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sources</Text>
          <View style={styles.sourceRow}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <Text style={styles.sourceText}>NHTSA Vehicle Database (Free)</Text>
          </View>
          <View style={styles.sourceRow}>
            <Ionicons name={realDataEnabled ? "checkmark-circle" : "close-circle"} size={20} color={realDataEnabled ? "#22c55e" : "#ef4444"} />
            <Text style={styles.sourceText}>MarketCheck API (Live Inventory)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MarketCheck API Key</Text>
          <TouchableOpacity style={styles.button} onPress={() => setShowKeyInput(!showKeyInput)}>
            <Text style={styles.buttonText}>
              {showKeyInput ? 'Hide' : 'Update API Key'}
            </Text>
          </TouchableOpacity>
          {showKeyInput && (
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="Paste MarketCheck API key"
                value={marketCheckKey}
                onChangeText={setMarketCheckKey}
              />
              <TouchableOpacity style={styles.saveButton} onPress={saveMarketCheckKey}>
                <Text style={styles.saveButtonText}>Save & Test</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginTop: 8 },
  loginBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  loginTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  passwordInput: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: { fontSize: 16, color: '#1f2937' },
  rowDesc: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  sourceText: { fontSize: 15, color: '#374151' },
  button: {
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  buttonText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  inputBox: { marginTop: 12, gap: 8 },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 10,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
ADMIN

echo "=== FILES CREATED ==="
ls -la src/store/adminStore.ts src/utils/getLocationZip.ts src/components/SplashScreen.tsx src/screens/AdminScreen.tsx
