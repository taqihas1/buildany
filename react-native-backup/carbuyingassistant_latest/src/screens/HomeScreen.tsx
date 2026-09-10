import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLocation } from '../store/locationStore';
import { Ionicons } from '@expo/vector-icons';

const ZIP_STORAGE_KEY = '@user_zip_code';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [zipCode, setZipCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Don't auto-skip anymore - user can manually enter zip
    setIsLoading(false);
  }, []);

  const checkSavedZip = async () => {
    try {
      const savedZip = await AsyncStorage.getItem(ZIP_STORAGE_KEY);
      if (savedZip && isValidZip(savedZip)) {
        // Skip to main app if zip already set
        navigation.replace('MainTabs');
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      setIsLoading(false);
    }
  };

  const isValidZip = (zip: string) => {
    return /^\d{5}(-\d{4})?$/.test(zip);
  };

  const handleContinue = async () => {
    if (!zipCode.trim()) {
      setError('Please enter a zip code');
      return;
    }

    const cleanZip = zipCode.trim();
    if (!isValidZip(cleanZip)) {
      setError('Please enter a valid 5-digit zip code');
      return;
    }

    try {
      await AsyncStorage.setItem(ZIP_STORAGE_KEY, cleanZip);
      await setLocation(cleanZip, undefined, 50); // Save to location store too
      setError('');
      navigation.replace('MainTabs');
    } catch (err) {
      setError('Could not save zip code. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Hero Illustration */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="car-sport" size={64} color="#3b82f6" />
          </View>
          <Text style={styles.title}>Find Your Perfect Car</Text>
          <Text style={styles.subtitle}>
            Search real car listings from dealerships near you
          </Text>
        </View>

        {/* Zip Code Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Enter Your Zip Code</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="location"
              size={24}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g. 28201"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              maxLength={5}
              value={zipCode}
              onChangeText={(text) => {
                setZipCode(text.replace(/[^0-9]/g, ''));
                setError('');
              }}
              onSubmitEditing={handleContinue}
              returnKeyType="go"
            />
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.continueButton,
              !zipCode.trim() && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!zipCode.trim()}
          >
            <Text style={styles.continueButtonText}>Start Searching</Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color="white"
              style={styles.buttonIcon}
            />
          </TouchableOpacity>

          <Text style={styles.hint}>
            You can change this anytime in Settings
          </Text>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="search" size={20} color="#3b82f6" />
            </View>
            <View>
              <Text style={styles.featureTitle}>Search Listings</Text>
              <Text style={styles.featureDesc}>Browse cars from top marketplaces</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="map" size={20} color="#3b82f6" />
            </View>
            <View>
              <Text style={styles.featureTitle}>Dealer Map</Text>
              <Text style={styles.featureDesc}>Find dealers near your location</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
            </View>
            <View>
              <Text style={styles.featureTitle}>Real Listings</Text>
              <Text style={styles.featureDesc}>Live data from AutoTempest</Text>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  inputSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    height: '100%',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginLeft: 6,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  hint: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
  },
  featuresSection: {
    marginTop: 'auto',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  featureDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});
