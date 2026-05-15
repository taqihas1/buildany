import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Linking,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { setSearchRadius, getSearchRadius } from '../store/locationStore';
import { isApifyConfigured, setApifyConfig, getApifyConfig, testApifyConnection } from '../services/apifyActor';
import AdBanner from '../components/AdBanner';
import { 
  isMarketCheckConfigured, 
  setMarketCheckConfig, 
  getMarketCheckConfig, 
  testMarketCheckConnection,
  clearMarketCheckConfig
} from '../services/marketCheckApi';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [priceAlertsEnabled, setPriceAlertsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [searchRadius, setSearchRadiusState] = useState(50);
  const [realDataMode, setRealDataMode] = useState(true);
  const [apifyToken, setApifyToken] = useState('apify_api_9sjr1W0r7kd9kW4dtrAwEOmOB0L3wY0LDnlW');
  const [apifyActorId, setApifyActorId] = useState('clearheaded_whirligig~car-marketplace-scraper');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [actorStatus, setActorStatus] = useState('checking'); // checking, connected, error
  
  // MarketCheck API state
  const [marketCheckKey, setMarketCheckKey] = useState('cJuW19GsTHhPgBxSh7dAuqGApqVSjsw3');
  const [showMarketCheckInput, setShowMarketCheckInput] = useState(false);
  const [marketCheckStatus, setMarketCheckStatus] = useState('checking'); // checking, connected, error
  
  const [accountInfo, setAccountInfo] = useState({
    username: 'your_username',
    name: 'Your Name',
    email: 'your@email.com',
  });

  // Load saved config and check actor status
  useEffect(() => {
    const loadConfig = async () => {
      const config = await getApifyConfig();
      if (config) {
        // Fix old format if needed (convert / to ~)
        const fixedActorId = (config.actorId || '').replace('/', '~');
        setApifyToken(config.token || 'apify_api_9sjr1W0r7kd9kW4dtrAwEOmOB0L3wY0LDnlW');
        setApifyActorId(fixedActorId || 'clearheaded_whirligig~car-marketplace-scraper');
        
        // Re-save with fixed format
        if (fixedActorId !== config.actorId) {
          await setApifyConfig({
            token: config.token || 'apify_api_9sjr1W0r7kd9kW4dtrAwEOmOB0L3wY0LDnlW',
            actorId: fixedActorId || 'clearheaded_whirligig~car-marketplace-scraper',
          });
        }
      } else {
        // Pre-fill defaults and save them
        await setApifyConfig({
          token: 'apify_api_9sjr1W0r7kd9kW4dtrAwEOmOB0L3wY0LDnlW',
          actorId: 'clearheaded_whirligig~car-marketplace-scraper',
        });
      }
      
      // Test Apify connection
      const connected = await testApifyConnection();
      setActorStatus(connected ? 'connected' : 'error');
      
      // Load MarketCheck config
      const mcConfig = await getMarketCheckConfig();
      if (mcConfig?.apiKey) {
        setMarketCheckKey(mcConfig.apiKey);
      }
      // Test MarketCheck connection (works even with default key)
      const mcConnected = await testMarketCheckConnection();
      setMarketCheckStatus(mcConnected.success ? 'connected' : 'error');
    };
    
    loadConfig();
    setSearchRadiusState(getSearchRadius());
  }, []);

  const radiusOptions = [10, 25, 50, 100, 250];

  const handleSaveToken = async () => {
    if (apifyToken.trim()) {
      // Convert / to ~ if user entered with slash
      const fixedActorId = apifyActorId.trim().replace('/', '~');
      await setApifyConfig({
        token: apifyToken.trim(),
        actorId: fixedActorId || undefined,
      });
      setShowTokenInput(false);
      
      // Test connection
      const connected = await testApifyConnection();
      setActorStatus(connected ? 'connected' : 'error');
      
      alert(connected 
        ? 'Apify actor connected! Real car listings will be loaded.'
        : 'Token saved but connection test failed. Check your actor ID format (use ~ not /).'
      );
    }
  };

  const handleSaveMarketCheckKey = async () => {
    if (marketCheckKey.trim()) {
      await setMarketCheckConfig({ apiKey: marketCheckKey.trim() });
      
      const result = await testMarketCheckConnection();
      setMarketCheckStatus(result.success ? 'connected' : 'error');
      
      alert(result.success 
        ? `MarketCheck connected! ${result.remainingCalls ? `(${result.remainingCalls} calls remaining)` : ''} Real inventory data will be loaded.`
        : `Connection test failed: ${result.message}`
      );
    }
  };

  const handleTestMarketCheck = async () => {
    setMarketCheckStatus('checking');
    const result = await testMarketCheckConnection();
    setMarketCheckStatus(result.success ? 'connected' : 'error');
    alert(result.success 
      ? `MarketCheck API is working! ${result.remainingCalls ? `(${result.remainingCalls} calls remaining)` : ''}`
      : `Test failed: ${result.message}`
    );
  };

  const handleRadiusChange = (radius: number) => {
    setSearchRadiusState(radius);
    setSearchRadius(radius);
  };

  const handleRateApp = () => {
    // In a real app, this would link to the App Store / Play Store
    alert('Thanks for rating! This would open the app store.');
  };

  const handleShareApp = () => {
    // In a real app, this would use Share API
    alert('Share this app with friends!');
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@carbuyingassistant.com');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://example.com/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://example.com/terms');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Preferences</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={22} color="#3b82f6" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Notifications</Text>
                <Text style={styles.settingDescription}>Get alerts for new listings</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#d1d5db', true: '#bfdbfe' }}
              thumbColor={notificationsEnabled ? '#3b82f6' : '#9ca3af'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="cash-outline" size={22} color="#3b82f6" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Price Alerts</Text>
                <Text style={styles.settingDescription}>Alert when prices drop</Text>
              </View>
            </View>
            <Switch
              value={priceAlertsEnabled}
              onValueChange={setPriceAlertsEnabled}
              trackColor={{ false: '#d1d5db', true: '#bfdbfe' }}
              thumbColor={priceAlertsEnabled ? '#3b82f6' : '#9ca3af'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={22} color="#3b82f6" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDescription}>Switch to dark theme</Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#d1d5db', true: '#bfdbfe' }}
              thumbColor={darkMode ? '#3b82f6' : '#9ca3af'}
            />
          </View>
        </View>

        {/* Search Radius */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Radius</Text>
          <Text style={styles.radiusDescription}>
            Show cars within {searchRadius} miles
          </Text>
          <View style={styles.radiusOptions}>
            {radiusOptions.map((radius) => (
              <TouchableOpacity
                key={radius}
                style={[
                  styles.radiusButton,
                  searchRadius === radius && styles.radiusButtonActive
                ]}
                onPress={() => handleRadiusChange(radius)}
              >
                <Text
                  style={[
                    styles.radiusButtonText,
                    searchRadius === radius && styles.radiusButtonTextActive
                  ]}
                >
                  {radius} mi
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Data Mode */}
        <View style={styles.section}>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="globe-outline" size={22} color="#22c55e" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Real Car Listings</Text>
                <Text style={styles.settingDescription}>Use MarketCheck API or Apify for live listings</Text>
              </View>
            </View>
            <Switch
              value={realDataMode}
              onValueChange={setRealDataMode}
              trackColor={{ false: '#d1d5db', true: '#bbf7d0' }}
              thumbColor={realDataMode ? '#22c55e' : '#9ca3af'}
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
            <Ionicons name="car-outline" size={22} color="#22c55e" />
            <View style={styles.sourceText}>
              <Text style={styles.sourceLabel}>NHTSA Vehicle Data</Text>
              <Text style={styles.sourceDescription}>Free government vehicle database</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          <View style={styles.sourceItem}>
            <Ionicons name="search-outline" size={22} color="#3b82f6" />
            <View style={styles.sourceText}>
              <Text style={styles.sourceLabel}>Market Listings</Text>
              <Text style={styles.sourceDescription}>
                {realDataMode 
                  ? (marketCheckStatus === 'connected' 
                    ? 'Live data via MarketCheck API' 
                    : 'Live data via your custom Apify actor')
                  : 'Simulated data for demo'}
              </Text>
            </View>
            <View style={[styles.statusBadge, realDataMode ? styles.statusActive : styles.statusDemo]}>
              <Text style={realDataMode ? styles.statusText : styles.statusDemoText}>{realDataMode ? 'Live' : 'Demo'}</Text>
            </View>
          </View>

          {/* Custom Actor Status - HIDDEN: using MarketCheck instead */}
          {false && (
            <>
          <View style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <Ionicons name="rocket-outline" size={28} color="#3b82f6" />
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>Custom Apify Actor</Text>
                <Text style={styles.accountUsername}>car-marketplace-scraper</Text>
                <Text style={styles.accountEmail}>Your own scraper - no rental fees</Text>
              </View>
              <View style={[styles.connectedBadge, actorStatus === 'connected' ? styles.statusActive : styles.statusDemo]}>
                <Text style={actorStatus === 'connected' ? styles.statusText : styles.statusDemoText}>
                  {actorStatus === 'connected' ? 'Ready' : actorStatus === 'checking' ? 'Checking...' : 'Setup'}
                </Text>
              </View>
            </View>

            {/* Actor Status Banner */}
            <View style={[styles.actorBanner, actorStatus === 'connected' ? styles.actorBannerConnected : styles.actorBannerSetup]}>
              <Ionicons 
                name={actorStatus === 'connected' ? "checkmark-circle-outline" : "information-circle-outline"} 
                size={20} 
                color={actorStatus === 'connected' ? '#22c55e' : '#3b82f6'} 
              />
              <View style={styles.actorText}>
                <Text style={[styles.actorTitle, actorStatus === 'connected' ? styles.actorTitleConnected : styles.actorTitleSetup]}>
                  {actorStatus === 'connected' ? 'Actor Deployed & Ready' : 'Deploy Your Actor'}
                </Text>
                <Text style={styles.actorDescription}>
                  {actorStatus === 'connected' 
                    ? 'Scraping AutoTrader, Cars.com, and CarGurus. No monthly rental fees.'
                    : 'Upload the actor ZIP to Apify Console → Build → Run. See README for steps.'}
                </Text>
              </View>
            </View>

            {actorStatus !== 'connected' && (
              <TouchableOpacity 
                style={styles.deployButton}
                onPress={() => Linking.openURL('https://console.apify.com/actors/new')}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.deployButtonText}>Open Apify Console</Text>
              </TouchableOpacity>
            )}
            
            {/* Test Connection Button */}
            <TouchableOpacity 
              style={[styles.testButton, actorStatus === 'connected' && styles.testButtonConnected]}
              onPress={async () => {
                setActorStatus('checking');
                const config = await getApifyConfig();
                const connected = await testApifyConnection();
                setActorStatus(connected ? 'connected' : 'error');
                alert(connected 
                  ? 'Connected! Your actor is ready to scrape real listings.'
                  : `Connection failed. Actor ID: ${config?.actorId || 'not set'}. Check token and actor ID format.`
                );
              }}
            >
              <Ionicons 
                name={actorStatus === 'connected' ? "checkmark-circle" : "refresh"} 
                size={18} 
                color={actorStatus === 'connected' ? '#22c55e' : '#3b82f6'} 
              />
              <Text style={[styles.testButtonText, actorStatus === 'connected' && styles.testButtonTextConnected]}>
                {actorStatus === 'connected' ? 'Connected' : 'Test Connection'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.apiButton} onPress={() => setShowTokenInput(!showTokenInput)}>
            <Ionicons name="key-outline" size={20} color="#3b82f6" />
            <Text style={styles.apiButtonText}>Add API Key</Text>
            <Ionicons name={showTokenInput ? "chevron-up" : "chevron-forward"} size={20} color="#9ca3af" />
          </TouchableOpacity>

          {showTokenInput && (
            <View style={styles.tokenInputContainer}>
              <Text style={styles.tokenLabel}>Apify API Token</Text>
              <View style={styles.tokenInput}>
                <TextInput
                  style={styles.tokenTextInput}
                  placeholder="Enter your Apify API token..."
                  value={apifyToken}
                  onChangeText={setApifyToken}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              
              <Text style={styles.tokenLabel}>Actor ID (optional)</Text>
              <View style={styles.tokenInput}>
                <TextInput
                  style={styles.tokenTextInput}
                  placeholder="username/car-marketplace-scraper"
                  value={apifyActorId}
                  onChangeText={setApifyActorId}
                  autoCapitalize="none"
                />
              </View>
              
              <Text style={styles.tokenHelp}>
                1. Get token at apify.com → Console → Integrations{'\n'}
                2. Deploy actor from ZIP (see README){'\n'}
                3. Enter actor ID: your_username/car-marketplace-scraper
              </Text>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveToken}>
                <Text style={styles.saveButtonText}>Save Configuration</Text>
              </TouchableOpacity>
            </View>
          )}
            </>
          )}
          {/* END HIDDEN APIFY SECTION */}

          {/* MarketCheck API Section */}
          <View style={[styles.accountCard, { marginTop: 12 }]}>
            <View style={styles.accountHeader}>
              <Ionicons name="server-outline" size={28} color="#f59e0b" />
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>MarketCheck API</Text>
                <Text style={styles.accountUsername}>Real dealer inventory data</Text>
                <Text style={styles.accountEmail}>500 free calls — developers.marketcheck.com</Text>
              </View>
              <View style={[styles.connectedBadge, marketCheckStatus === 'connected' ? styles.statusActive : styles.statusDemo]}>
                <Text style={marketCheckStatus === 'connected' ? styles.statusText : styles.statusDemoText}>
                  {marketCheckStatus === 'connected' ? 'Live' : marketCheckStatus === 'checking' ? '...' : 'Setup'}
                </Text>
              </View>
            </View>

            <View style={[styles.actorBanner, marketCheckStatus === 'connected' ? styles.actorBannerConnected : styles.actorBannerSetup]}>
              <Ionicons 
                name={marketCheckStatus === 'connected' ? "checkmark-circle-outline" : "information-circle-outline"} 
                size={20} 
                color={marketCheckStatus === 'connected' ? '#22c55e' : '#f59e0b'} 
              />
              <View style={styles.actorText}>
                <Text style={[styles.actorTitle, marketCheckStatus === 'connected' ? styles.actorTitleConnected : styles.actorTitleSetup]}>
                  {marketCheckStatus === 'connected' ? 'Real Inventory Connected' : 'Get Real Car Listings'}
                </Text>
                <Text style={styles.actorDescription}>
                  {marketCheckStatus === 'connected' 
                    ? 'Pulling live dealer inventory from across the US. Fast & reliable.'
                    : 'Sign up for free at developers.marketcheck.com → copy API key → paste below. 500 free calls.'}
                </Text>
              </View>
            </View>

            {marketCheckStatus !== 'connected' && (
              <TouchableOpacity 
                style={[styles.deployButton, { backgroundColor: '#f59e0b' }]}
                onPress={() => Linking.openURL('https://developers.marketcheck.com')}
              >
                <Ionicons name="open-outline" size={18} color="#fff" />
                <Text style={styles.deployButtonText}>Open MarketCheck Developer Portal</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.testButton, marketCheckStatus === 'connected' && styles.testButtonConnected]}
              onPress={handleTestMarketCheck}
            >
              <Ionicons 
                name={marketCheckStatus === 'connected' ? "checkmark-circle" : "refresh"} 
                size={18} 
                color={marketCheckStatus === 'connected' ? '#22c55e' : '#f59e0b'} 
              />
              <Text style={[styles.testButtonText, marketCheckStatus === 'connected' && styles.testButtonTextConnected]}>
                {marketCheckStatus === 'connected' ? 'Connected' : 'Test Connection'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.apiButton} onPress={() => setShowMarketCheckInput(!showMarketCheckInput)}>
            <Ionicons name="key-outline" size={20} color="#f59e0b" />
            <Text style={styles.apiButtonText}>Add MarketCheck API Key</Text>
            <Ionicons name={showMarketCheckInput ? "chevron-up" : "chevron-forward"} size={20} color="#9ca3af" />
          </TouchableOpacity>

          {showMarketCheckInput && (
            <View style={styles.tokenInputContainer}>
              <Text style={styles.tokenLabel}>MarketCheck API Key</Text>
              <View style={styles.tokenInput}>
                <TextInput
                  style={styles.tokenTextInput}
                  placeholder="Enter your MarketCheck API key..."
                  value={marketCheckKey}
                  onChangeText={setMarketCheckKey}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              
              <Text style={styles.tokenHelp}>
                1. Go to developers.marketcheck.com{'\n'}
                2. Sign up for free (500 API calls){'\n'}
                3. Copy your API key and paste above{'\n'}
                4. Tap Save — no credit card required
              </Text>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#f59e0b' }]} onPress={handleSaveMarketCheckKey}>
                <Text style={styles.saveButtonText}>Save MarketCheck Key</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleRateApp}>
            <Ionicons name="star-outline" size={22} color="#f59e0b" />
            <Text style={styles.menuText}>Rate the App</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleShareApp}>
            <Ionicons name="share-outline" size={22} color="#3b82f6" />
            <Text style={styles.menuText}>Share with Friends</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleContactSupport}>
            <Ionicons name="mail-outline" size={22} color="#3b82f6" />
            <Text style={styles.menuText}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handlePrivacyPolicy}>
            <Ionicons name="shield-outline" size={22} color="#3b82f6" />
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleTermsOfService}>
            <Ionicons name="document-text-outline" size={22} color="#3b82f6" />
            <Text style={styles.menuText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Car Buying Assistant</Text>
          <Text style={styles.appVersion}>Version 1.0.0 (Expo SDK 54)</Text>
          <Text style={styles.appDescription}>
            Find the best car deals from multiple marketplaces
          </Text>
          <Text style={styles.appPackage}>com.carbuyassistant.app</Text>
        </View>

        <AdBanner />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
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
  radiusDescription: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  radiusOptions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  radiusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  radiusButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  radiusButtonText: {
    fontSize: 14,
    color: '#4b5563',
  },
  radiusButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  statusDemo: {
    backgroundColor: '#dbeafe',
  },
  statusDemoText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  apiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
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
  },
  tokenTextInput: {
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
  demoNotice: {
    fontSize: 13,
    color: '#f59e0b',
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontStyle: 'italic',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  appVersion: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  appDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  appPackage: {
    fontSize: 11,
    color: '#d1d5db',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  accountCard: {
    backgroundColor: '#f9fafb',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  accountUsername: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  accountEmail: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  connectedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  connectedText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  rentalBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  rentalBannerRequired: {
    backgroundColor: '#fffbeb',
  },
  rentalText: {
    flex: 1,
  },
  rentalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  rentalTitleRequired: {
    color: '#f59e0b',
  },
  rentalDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  rentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  rentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Actor banner styles
  actorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  actorBannerConnected: {
    backgroundColor: '#f0fdf4',
  },
  actorBannerSetup: {
    backgroundColor: '#eff6ff',
  },
  actorText: {
    flex: 1,
  },
  actorTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actorTitleConnected: {
    color: '#22c55e',
  },
  actorTitleSetup: {
    color: '#3b82f6',
  },
  actorDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  deployButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  deployButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
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
});
