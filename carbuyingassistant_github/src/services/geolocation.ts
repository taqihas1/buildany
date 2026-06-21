import * as Location from 'expo-location';

export interface GeoLocation {
  zipCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

/**
 * Request location permission and get current GPS position
 * Then reverse geocode to get zip code
 */
export async function getCurrentLocation(): Promise<GeoLocation | null> {
  try {
    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission denied');
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;

    // Reverse geocode to get address info
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (addresses && addresses.length > 0) {
      const address = addresses[0];
      const zipCode = address.postalCode || '';
      const city = address.city || address.region || 'Unknown';
      
      if (zipCode) {
        return {
          zipCode,
          city,
          latitude,
          longitude,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

/**
 * Check if location services are enabled
 */
export async function isLocationEnabled(): Promise<boolean> {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    return enabled;
  } catch {
    return false;
  }
}
