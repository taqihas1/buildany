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
  isMarketCheckConfigured,
  setMarketCheckConfig,
  getMarketCheckConfig,
  testMarketCheckConnection,
  clearMarketCheckConfig,
} from '../services/marketCheckApi';

const ADMIN_PASSWORD = 'Shazia123$';

export default function AdminScreen() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Admin settings
  const [realDataMode, setRealDataModeState] = useState(true);
  const [marketCheckKey, setMarketCheckKey] = useState('');
  const [showMarketCheckInput, setShowMarketCheckInput] = useState(false);
  const [marketCheckStatus, setMarketCheckStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // Load saved settings
  useEffect(() => {
    const load = async () => {
      const mode = await getRealDataMode();
      setRealDataModeState(mode);

      const mcConfig = await getMarketCheckConfig();
      if (mcConfig?.apiKey) {
        setMarketCheckKey(mcConfig.apiKey);
      }

      const mcConnected = await testMarketCheckConnection();
      setMarketCheckStatus(mcConnected.success ? 'connected' : 'error');
    };
    if (authenticated) load();
  }, [authenticated]);

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPasswordInput('');
    } else {
      Alert.alert('Access Denied', 'Incorrect password.');
    }
  };

  const handleToggleRealData = async (value: boolean) => {
    setRealDataModeState(value);
    await setRealDataMode(value);
  };

  const handleSaveMarketCheckKey = async () => {
    if (marketCheckKey.trim()) {
      await setMarketCheckConfig({ apiKey: marketCheckKey.trim() });
      const result = await testMarketCheckConnection();
      setMarketCheckStatus(result.success ? 'connected' : 'error');
      setShowMarketCheckInput(false);
      Alert.alert(
        result.success ? 'Connected' : 'Error',
        result.success
          ? `MarketCheck connected! ${result.remainingCalls ? `(${result.remainingCalls} calls remaining)` : ''}`
          : `Connection test failed: ${result.message}`
      );
    }
  };

  const handleTestMarketCheck = async () => {
    setMarketCheckStatus('checking');
    const result = await testMarketCheckConnection();
    setMarketCheckStatus(result.success ? 'connected' : 'error');
    Alert.alert(
      result.success ? 'Success' : 'Failed',
      result.success
        ? `MarketCheck API is working! ${result.remainingCalls ? `(${result.remainingCalls} calls remaining)` : ''}`
        : `Test failed: ${result.message}`
    );
  };

  const handleClearMarketCheck = async () => {
    await clearMarketCheckConfig();
    setMarketCheckKey('');
    setMarketCheckStatus('error');
    Alert.alert('Cleared', 'MarketCheck API key has been removed.');
  };

  // ─── Password Gate ─────────────────────────────
  if (!authenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockHeader}>
          <Ionicons name="lock-closed" size={48} color="#3b82f6" />
          <Text style={styles.lockTitle}>Admin Access</Text>
          <Text style={styles.lockSubtitle}>Enter password to manage data sources and API keys.</Text>
        </View>

        <View style={styles.lockForm}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter admin password"
            secureTextEntry
            value={passwordInput}
            onChangeText={setPasswordInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Unlock Admin</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Admin Dashboard ───────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={28} color="#3b82f6" />
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <TouchableOpacity onPress={() => setAuthenticated(false)}>
            <Text style={styles.logoutText}>Lock</Text>
          </TouchableOpacity>
        </View>

        {/* Real Car Listings Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Mode</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="car-sport" size={22} color="#3b82f6" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Real Car Listings</Text>
                <Text style={styles.settingDescription}>
                  Use MarketCheck API for live dealer inventory
                </Text>
              </View>
            </View>
            <Switch
              value={realDataMode}
              onValueChange={handleToggleRealData}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor={realDataMode ? '#3b82f6' : '#9ca3af'}
            />
          </View>
          {!realDataMode && (
            <Text style={styles.demoNotice}>
              Demo Mode: Showing simulated listings. Toggle on for real data.
            </Text>
          )}
        </View>

        {/* Data Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sources</Text>

          <View style={styles.sourceItem}>
            <Ionicons name="server" size={22} color="#6b7280" />
            <View style={styles.sourceText}>
              <Text style={styles.sourceLabel}>Market Listings</Text>
              <Text style={styles.sourceDescription}>
                {realDataMode
                  ? marketCheckStatus === 'connected'
                    ? 'Live data via MarketCheck API'
                    : 'Live data configured but not connected'
                  : 'Simulated data for demo'}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                realDataMode && marketCheckStatus === 'connected'
                  ? styles.statusActive
                  : styles.statusDemo,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  realDataMode && marketCheckStatus === 'connected'
                    ? styles.statusActiveText
                    : styles.statusDemoText,
                ]}
              >
                {realDataMode && marketCheckStatus === 'connected' ? 'Live' : 'Demo'}
              </Text>
            </View>
          </View>

          <View style={styles.sourceItem}>
            <Ionicons name="alert-circle" size={22} color="#6b7280" />
            <View style={styles.sourceText}>
              <Text style={styles.sourceLabel}>NHTSA Vehicle Data</Text>
              <Text style={styles.sourceDescription}>Free government vehicle database</Text>
            </View>
            <View style={[styles.statusBadge, styles.statusActive]}>
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>
        </View>

        {/* MarketCheck API Key */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MarketCheck API</Text>

          <View style={styles.apiBanner}>
            <Ionicons
              name={marketCheckStatus === 'connected' ? 'checkmark-circle' : 'warning'}
              size={24}
              color={marketCheckStatus === 'connected' ? '#22c55e' : '#f59e0b'}
            />
            <View style={styles.apiText}>
              <Text
                style={[
                  styles.apiTitle,
                  marketCheckStatus === 'connected' ? styles.apiTitleConnected : styles.apiTitleSetup,
                ]}
              >
                {marketCheckStatus === 'connected' ? 'Real Inventory Connected' : 'Get Real Car Listings'}
              </Text>
              <Text style={styles.apiDescription}>
                {marketCheckStatus === 'connected'
                  ? 'Pulling live dealer inventory from across the US. Fast & reliable.'
                  : 'Sign up for free at developers.marketcheck.com → copy API key → paste below. 500 free calls.'}
              </Text>
            </View>
          </View>

          {marketCheckStatus !== 'connected' && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                // Would open URL in real app
                Alert.alert('MarketCheck', 'Visit developers.marketcheck.com to get your free API key.');
              }}
            >
              <Ionicons name="open-outline" size={18} color="#3b82f6" />
              <Text style={styles.linkButtonText}>Open MarketCheck Developer Portal</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.testButton,
              marketCheckStatus === 'connected' ? styles.testButtonConnected : null,
            ]}
            onPress={handleTestMarketCheck}
          >
            <Ionicons
              name="refresh"
              size={18}
              color={marketCheckStatus === 'connected' ? '#22c55e' : '#3b82f6'}
            />
            <Text
              style={[
                styles.testButtonText,
                marketCheckStatus === 'connected' ? styles.testButtonTextConnected : null,
              ]}
            >
              {marketCheckStatus === 'connected' ? 'Re-Test Connection' : 'Test Connection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.apiButton}
            onPress={() => setShowMarketCheckInput(!showMarketCheckInput)}
          >
            <Ionicons name="key" size={20} color="#3b82f6" />
            <Text style={styles.apiButtonText}>
              {marketCheckKey ? 'Update MarketCheck API Key' : 'Add MarketCheck API Key'}
            </Text>
            <Ionicons
              name={showMarketCheckInput ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#9ca3af"
            />
          </TouchableOpacity>

          {showMarketCheckInput && (
            <View style={styles.tokenInputContainer}>
              <Text style={styles.tokenLabel}>MarketCheck API Key</Text>
              <TextInput
                style={styles.tokenInput}
                value={marketCheckKey}
                onChangeText={setMarketCheckKey}
                placeholder="Paste your MarketCheck API key"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.tokenHelp}>
                1. Go to developers.marketcheck.com{'\n'}
                2. Sign up for free (500 API calls){'\n'}
                3. Copy your API key and paste above{'\n'}
                4. Tap Save — no credit card required
              </Text>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveMarketCheckKey}>
                <Text style={styles.saveButtonText}>Save MarketCheck Key</Text>
              </TouchableOpacity>

              {marketCheckKey.length > 0 && (
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: '#ef4444', marginTop: 8 }]}
                  onPress={handleClearMarketCheck}
                >
                  <Text style={styles.saveButtonText}>Clear Key & Reset to Default</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  lockHeader: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 24,
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  lockSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  lockForm: {
    paddingHorizontal: 24,
    marginTop: 40,
    gap: 12,
  },
  passwordInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  loginButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginLeft: 12,
  },
  logoutText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1f2937',
  },
  settingDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  demoNotice: {
    fontSize: 13,
    color: '#f59e0b',
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontStyle: 'italic',
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  sourceText: {
    flex: 1,
  },
  sourceLabel: {
    fontSize: 16,
    color: '#1f2937',
  },
  sourceDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusActiveText: {
    color: '#166534',
  },
  statusDemo: {
    backgroundColor: '#dbeafe',
  },
  statusDemoText: {
    color: '#1e40af',
  },
  apiBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    gap: 10,
  },
  apiText: {
    flex: 1,
  },
  apiTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  apiTitleConnected: {
    color: '#22c55e',
  },
  apiTitleSetup: {
    color: '#3b82f6',
  },
  apiDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  linkButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  testButtonConnected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  testButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  testButtonTextConnected: {
    color: '#22c55e',
  },
  apiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    marginTop: 8,
  },
  apiButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#3b82f6',
  },
  tokenInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  tokenInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  tokenHelp: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
