import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  searchCarListings,
  CarListing,
  SearchFilters,
  CAR_MAKES,
  BODY_TYPES,
  FUEL_TYPES,
  PRICE_RANGES,
  YEAR_RANGES,
  analyzeDeal
} from '../services/carApi';
import { getCurrentLocation } from '../services/geolocation';
import { getLocation, getLocationAsync, setLocation } from '../store/locationStore';
import { RootStackParamList } from '../navigation/AppNavigator';
import AdBanner from '../components/AdBanner';
import NativeAdCard from '../components/NativeAdCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CarSearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [listings, setListings] = useState<CarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({ sortBy: 'savings_desc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [selectedBodyType, setSelectedBodyType] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ label: string; min: number; max: number } | null>(null);
  const [selectedYearRange, setSelectedYearRange] = useState<{ label: string; min: number; max: number } | null>(null);
  const [zipCode, setZipCode] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState(getLocation());

  // Load saved zip on mount
  useEffect(() => {
    const loadSavedZip = async () => {
      const { zipCode: savedZip } = await getLocationAsync();
      setZipCode(savedZip);
      setUserLocation(getLocation());
    };
    loadSavedZip();
  }, []);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      const currentFilters: SearchFilters = {
        ...filters,
        make: selectedMake || undefined,
        bodyType: selectedBodyType || undefined,
        minPrice: selectedPriceRange?.min,
        maxPrice: selectedPriceRange?.max,
        minYear: selectedYearRange?.min,
        maxYear: selectedYearRange?.max,
        location: zipCode || userLocation.zipCode,
        radius: userLocation.radius,
      };
      
      if (searchQuery) {
        currentFilters.model = searchQuery;
      }
      
      const data = await searchCarListings(currentFilters);
      setListings(data);
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, selectedMake, selectedBodyType, selectedPriceRange, selectedYearRange, searchQuery, userLocation, zipCode]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const location = await getCurrentLocation();
      if (location) {
        setZipCode(location.zipCode);
        await setLocation(location.zipCode, location.city);
        setUserLocation(getLocation());
        alert(`Location detected: ${location.city} (${location.zipCode})`);
      } else {
        alert('Could not detect location. Please enter zip code manually.');
      }
    } catch (error) {
      alert('Error detecting location. Please check permissions.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadListings();
  }, [loadListings]);

  const renderCarCard = ({ item }: { item: CarListing }) => {
    const dealAnalysis = analyzeDeal(item);
    
    return (
      <TouchableOpacity
        style={styles.carCard}
        onPress={() => navigation.navigate('CarDetail', { carId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          {item.images.length > 0 ? (
            <Image
              source={{ uri: item.images[0] }}
              style={styles.carImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImagePlaceholder}>
              <Ionicons name="car-outline" size={40} color="#d1d5db" />
              <Text style={styles.noImageText}>No Photos</Text>
            </View>
          )}
          <View style={[styles.dealBadge, { backgroundColor: dealAnalysis.ratingColor }]}>
            <Text style={styles.dealBadgeText}>{dealAnalysis.rating.toUpperCase()}</Text>
          </View>
          {item.isGreatDeal && (
            <View style={styles.greatDealBadge}>
              <Ionicons name="flame" size={14} color="#fff" />
              <Text style={styles.greatDealText}>GREAT DEAL</Text>
            </View>
          )}
        </View>
        
        <View style={styles.carInfo}>
          <View style={styles.headerRow}>
            <View style={styles.titleSection}>
              <Text style={styles.carTitle}>{item.year} {item.make} {item.model}</Text>
              <Text style={styles.trimText}>{item.trim}</Text>
            </View>
            <View style={styles.priceSection}>
              <Text style={styles.price}>${item.price.toLocaleString()}</Text>
              {item.savings > 0 && (
                <Text style={styles.savings}>
                  <Ionicons name="arrow-down" size={12} color="#22c55e" />
                  ${item.savings.toLocaleString()} off
                </Text>
              )}
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="speedometer-outline" size={16} color="#6b7280" />
              <Text style={styles.detailText}>{item.mileage.toLocaleString()} mi</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="color-palette-outline" size={16} color="#6b7280" />
              <Text style={styles.detailText}>{item.color}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="flash-outline" size={16} color="#6b7280" />
              <Text style={styles.detailText}>{item.fuelType}</Text>
            </View>
          </View>

          <View style={styles.dealerRow}>
            <View style={styles.dealerInfo}>
              <Ionicons name="location-outline" size={14} color="#6b7280" />
              <Text style={styles.dealerText}>{item.dealerName}</Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={styles.ratingText}>{item.dealerRating}</Text>
              </View>
            </View>
            <Text style={styles.distanceText}>{item.dealerDistance.toFixed(1)} mi away</Text>
          </View>

          <View style={styles.sourceRow}>
            <Text style={styles.sourceText}>via {item.source}</Text>
            <Text style={styles.daysText}>{item.daysOnMarket} days on market</Text>
          </View>

          {item.features.slice(0, 3).map((feature, idx) => (
            <View key={idx} style={styles.featureTag}>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContent}
    >
      {selectedMake && (
        <TouchableOpacity
          style={[styles.filterChip, styles.activeChip]}
          onPress={() => setSelectedMake(null)}
        >
          <Text style={styles.activeChipText}>{selectedMake}</Text>
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
      )}
      {selectedBodyType && (
        <TouchableOpacity
          style={[styles.filterChip, styles.activeChip]}
          onPress={() => setSelectedBodyType(null)}
        >
          <Text style={styles.activeChipText}>{selectedBodyType}</Text>
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
      )}
      {selectedPriceRange && (
        <TouchableOpacity
          style={[styles.filterChip, styles.activeChip]}
          onPress={() => setSelectedPriceRange(null)}
        >
          <Text style={styles.activeChipText}>
            ${(selectedPriceRange.min / 1000).toFixed(0)}K-${(selectedPriceRange.max / 1000).toFixed(0)}K
          </Text>
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
      )}
      {zipCode && (
        <TouchableOpacity
          style={[styles.filterChip, styles.activeChip]}
          onPress={() => { setZipCode(''); loadListings(); }}
        >
          <Ionicons name="location" size={14} color="#fff" />
          <Text style={styles.activeChipText}>{zipCode}</Text>
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  // Prepare data with native ads inserted every 5 listings
  const listData = listings.reduce<(Array<CarListing | { type: 'native_ad'; id: string }>)>((acc, car, index) => {
    acc.push(car);
    if ((index + 1) % 5 === 0 && index !== listings.length - 1) {
      acc.push({ type: 'native_ad', id: `native_ad_${index}` });
    }
    return acc;
  }, []);

  const renderListItem = ({ item }: { item: CarListing | { type: 'native_ad'; id: string } }) => {
    if ('type' in item && item.type === 'native_ad') {
      return <NativeAdCard />;
    }
    return renderCarCard({ item: item as CarListing });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Find Your Car</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Searching best deals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Car Buying Assistant</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color="#ef4444" />
            <Text style={styles.locationText}>{userLocation.zipCode}</Text>
            <Text style={styles.locationRadius}>+{userLocation.radius} mi</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? "filter" : "filter-outline"}
            size={24}
            color="#3b82f6"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by make or model..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={loadListings}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); loadListings(); }}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {renderFilterChips()}

      {showFilters && (
        <ScrollView style={styles.filtersPanel} showsVerticalScrollIndicator={false}>
          {/* Location / Zip Code Filter */}
          <Text style={styles.filterSectionTitle}>Location</Text>
          <View style={styles.zipCodeContainer}>
            <View style={styles.zipInputWrapper}>
              <Ionicons name="location" size={20} color="#6b7280" style={styles.zipIcon} />
              <TextInput
                style={styles.zipInput}
                placeholder="Enter ZIP code"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={5}
                value={zipCode}
                onChangeText={(text) => {
                  setZipCode(text.replace(/[^0-9]/g, ''));
                }}
                onSubmitEditing={loadListings}
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity
              style={[styles.gpsButton, isDetectingLocation && styles.gpsButtonActive]}
              onPress={handleDetectLocation}
              disabled={isDetectingLocation}
            >
              {isDetectingLocation ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <>
                  <Ionicons name="navigate" size={18} color="#3b82f6" />
                  <Text style={styles.gpsButtonText}>Use My Location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.filterSectionTitle}>Make</Text>
          <View style={styles.filterGrid}>
            {CAR_MAKES.map((make) => (
              <TouchableOpacity
                key={make}
                style={[
                  styles.filterOption,
                  selectedMake === make && styles.filterOptionActive
                ]}
                onPress={() => setSelectedMake(selectedMake === make ? null : make)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedMake === make && styles.filterOptionTextActive
                ]}>
                  {make}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterSectionTitle}>Body Type</Text>
          <View style={styles.filterGrid}>
            {BODY_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterOption,
                  selectedBodyType === type && styles.filterOptionActive
                ]}
                onPress={() => setSelectedBodyType(selectedBodyType === type ? null : type)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedBodyType === type && styles.filterOptionTextActive
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterSectionTitle}>Price Range</Text>
          <View style={styles.filterGrid}>
            {PRICE_RANGES.map((range) => (
              <TouchableOpacity
                key={range.label}
                style={[
                  styles.filterOption,
                  selectedPriceRange?.label === range.label && styles.filterOptionActive
                ]}
                onPress={() => setSelectedPriceRange(
                  selectedPriceRange?.label === range.label ? null : range
                )}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedPriceRange?.label === range.label && styles.filterOptionTextActive
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterSectionTitle}>Year</Text>
          <View style={styles.filterGrid}>
            {YEAR_RANGES.map((range) => (
              <TouchableOpacity
                key={range.label}
                style={[
                  styles.filterOption,
                  selectedYearRange?.label === range.label && styles.filterOptionActive
                ]}
                onPress={() => setSelectedYearRange(
                  selectedYearRange?.label === range.label ? null : range
                )}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedYearRange?.label === range.label && styles.filterOptionTextActive
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.applyButton} onPress={loadListings}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <FlatList
        data={listData}
        renderItem={renderListItem}
        keyExtractor={(item) => ('type' in item ? item.id : item.id)}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsText}>{listings.length} cars found</Text>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => {
                const sorts: SearchFilters['sortBy'][] = [
                  'savings_desc', 'price_asc', 'price_desc', 'year_desc', 'mileage_asc'
                ];
                const currentIdx = sorts.indexOf(filters.sortBy || 'savings_desc');
                const nextSort = sorts[(currentIdx + 1) % sorts.length];
                setFilters({ ...filters, sortBy: nextSort });
                loadListings();
              }}
            >
              <Text style={styles.sortText}>
                Sort: {filters.sortBy?.replace('_', ' ')}
              </Text>
              <Ionicons name="swap-vertical" size={16} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No cars found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        )}
      />
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  locationRadius: {
    fontSize: 12,
    color: '#6b7280',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  filterScroll: {
    maxHeight: 44,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    gap: 4,
  },
  activeChip: {
    backgroundColor: '#3b82f6',
  },
  activeChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  filtersPanel: {
    backgroundColor: '#fff',
    padding: 16,
    maxHeight: 500,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  zipCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  zipInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 44,
  },
  zipIcon: {
    marginRight: 8,
  },
  zipInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 6,
  },
  gpsButtonActive: {
    opacity: 0.7,
  },
  gpsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#4b5563',
  },
  filterOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 14,
    color: '#3b82f6',
  },
  carCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  carImage: {
    width: '100%',
    height: 200,
  },
  noImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9ca3af',
  },
  dealBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dealBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  greatDealBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  greatDealText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  carInfo: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleSection: {
    flex: 1,
  },
  carTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  trimText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  savings: {
    fontSize: 13,
    color: '#22c55e',
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  dealerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dealerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dealerText: {
    fontSize: 13,
    color: '#4b5563',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 13,
    color: '#6b7280',
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sourceText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  daysText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  featureTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  featureText: {
    fontSize: 12,
    color: '#3b82f6',
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 4,
  },
});
