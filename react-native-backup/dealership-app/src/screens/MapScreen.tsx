import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Callout } from 'react-native-maps';
import {
  searchCarListings,
  CarListing,
  SearchFilters,
  analyzeDeal
} from '../services/carApi';
import { RootStackParamList } from '../navigation/AppNavigator';
import AdBanner from '../components/AdBanner';

const { width, height } = Dimensions.get('window');
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [listings, setListings] = useState<CarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCar, setSelectedCar] = useState<CarListing | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await searchCarListings({});
      setListings(data);
      
      // Center map on first listing if available
      if (data.length > 0) {
        // Simulate coordinates based on location names
        const locations = generateCoordinates(data.map(l => l.location));
        if (locations.length > 0) {
          setMapRegion({
            latitude: locations[0].lat,
            longitude: locations[0].lng,
            latitudeDelta: 0.3,
            longitudeDelta: 0.3,
          });
        }
      }
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const generateCoordinates = (locations: string[]) => {
    // Simplified coordinate mapping for demo
    const cityCoords: Record<string, { lat: number; lng: number }> = {
      'New York, NY': { lat: 40.7128, lng: -74.0060 },
      'Los Angeles, CA': { lat: 34.0522, lng: -118.2437 },
      'Chicago, IL': { lat: 41.8781, lng: -87.6298 },
      'Houston, TX': { lat: 29.7604, lng: -95.3698 },
      'Phoenix, AZ': { lat: 33.4484, lng: -112.0740 },
      'Philadelphia, PA': { lat: 39.9526, lng: -75.1652 },
      'San Antonio, TX': { lat: 29.4241, lng: -98.4936 },
      'San Diego, CA': { lat: 32.7157, lng: -117.1611 },
      'Dallas, TX': { lat: 32.7767, lng: -96.7970 },
      'San Jose, CA': { lat: 37.3382, lng: -121.8863 },
      'Austin, TX': { lat: 30.2672, lng: -97.7431 },
      'Jacksonville, FL': { lat: 30.3322, lng: -81.6557 },
      'Fort Worth, TX': { lat: 32.7555, lng: -97.3308 },
      'Columbus, OH': { lat: 39.9612, lng: -82.9988 },
      'Charlotte, NC': { lat: 35.2271, lng: -80.8431 },
      'San Francisco, CA': { lat: 37.7749, lng: -122.4194 },
      'Indianapolis, IN': { lat: 39.7684, lng: -86.1581 },
      'Seattle, WA': { lat: 47.6062, lng: -122.3321 },
      'Denver, CO': { lat: 39.7392, lng: -104.9903 },
      'Washington, DC': { lat: 38.9072, lng: -77.0369 },
    };

    return locations.map(loc => {
      const coords = cityCoords[loc];
      if (coords) {
        // Add small random offset to prevent markers from overlapping
        return {
          lat: coords.lat + (Math.random() - 0.5) * 0.02,
          lng: coords.lng + (Math.random() - 0.5) * 0.02,
        };
      }
      return { lat: 40.7128 + Math.random() * 10, lng: -74.0060 + Math.random() * 10 };
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const coordinates = generateCoordinates(listings.map(l => l.location));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Car Locations</Text>
        <Text style={styles.headerSubtitle}>{listings.length} cars available</Text>
      </View>

      <MapView
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
      >
        {listings.map((listing, index) => {
          const coords = coordinates[index];
          const dealAnalysis = analyzeDeal(listing);
          
          return (
            <Marker
              key={listing.id}
              coordinate={{
                latitude: coords.lat,
                longitude: coords.lng,
              }}
              pinColor={dealAnalysis.rating === 'great' ? '#22c55e' : 
                       dealAnalysis.rating === 'good' ? '#3b82f6' : 
                       dealAnalysis.rating === 'fair' ? '#f59e0b' : '#ef4444'}
              onPress={() => setSelectedCar(listing)}
            >
              <Callout
                onPress={() => navigation.navigate('CarDetail', { carId: listing.id })}
              >
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>
                    {listing.year} {listing.make} {listing.model}
                  </Text>
                  <Text style={styles.calloutPrice}>
                    ${listing.price.toLocaleString()}
                  </Text>
                  <Text style={styles.calloutDeal}>
                    {dealAnalysis.message}
                  </Text>
                  <Text style={styles.calloutTap}>Tap for details</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {selectedCar && (
        <View style={styles.bottomCard}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedCar(null)}
          >
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('CarDetail', { carId: selectedCar.id });
              setSelectedCar(null);
            }}
          >
            <Text style={styles.cardTitle}>
              {selectedCar.year} {selectedCar.make} {selectedCar.make}
            </Text>
            <Text style={styles.cardTrim}>{selectedCar.trim}</Text>
            
            <View style={styles.cardRow}>
              <Text style={styles.cardPrice}>
                ${selectedCar.price.toLocaleString()}
              </Text>
              {selectedCar.savings > 0 && (
                <Text style={styles.cardSavings}>
                  Save ${selectedCar.savings.toLocaleString()}
                </Text>
              )}
            </View>
            
            <View style={styles.cardDetails}>
              <Text style={styles.cardDetail}>
                <Ionicons name="speedometer-outline" size={14} color="#6b7280" />
                {' '}{selectedCar.mileage.toLocaleString()} mi
              </Text>
              <Text style={styles.cardDetail}>
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                {' '}{selectedCar.dealerDistance.toFixed(1)} mi away
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  map: {
    width: width,
    height: height - 170,
  },
  calloutContainer: {
    width: 200,
    padding: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  calloutPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginTop: 4,
  },
  calloutDeal: {
    fontSize: 12,
    color: '#22c55e',
    marginTop: 2,
  },
  calloutTap: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 4,
    fontStyle: 'italic',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    paddingRight: 32,
  },
  cardTrim: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cardSavings: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  cardDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  cardDetail: {
    fontSize: 13,
    color: '#6b7280',
  },
});
