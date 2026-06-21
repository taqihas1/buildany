import AsyncStorage from '@react-native-async-storage/async-storage';

const ZIP_KEY = '@user_zip_code';
const CITY_KEY = '@user_city';
const RADIUS_KEY = '@user_search_radius';

let _zipCode: string = '28201';
let _city: string = 'Charlotte, NC';
let _searchRadius: number = 50;
let _initialized = false;

async function initStore() {
  if (_initialized) return;
  try {
    const [zip, city, radius] = await Promise.all([
      AsyncStorage.getItem(ZIP_KEY),
      AsyncStorage.getItem(CITY_KEY),
      AsyncStorage.getItem(RADIUS_KEY),
    ]);
    if (zip) _zipCode = zip;
    if (city) _city = city;
    if (radius) _searchRadius = parseInt(radius, 10);
  } catch (e) {
    console.log('Location store init error:', e);
  }
  _initialized = true;
}

export async function getLocationAsync(): Promise<{ zipCode: string; city: string; radius: number }> {
  await initStore();
  return { zipCode: _zipCode, city: _city, radius: _searchRadius };
}

export function getLocation(): { zipCode: string; city: string; radius: number } {
  return { zipCode: _zipCode, city: _city, radius: _searchRadius };
}

export async function setLocation(zipCode: string, city?: string, radius?: number): Promise<void> {
  _zipCode = zipCode;
  if (city) _city = city;
  if (radius !== undefined) _searchRadius = radius;
  try {
    await AsyncStorage.setItem(ZIP_KEY, _zipCode);
    await AsyncStorage.setItem(CITY_KEY, _city);
    await AsyncStorage.setItem(RADIUS_KEY, String(_searchRadius));
  } catch (e) {
    console.log('Error saving location:', e);
  }
}

export function setSearchRadius(radius: number): void {
  _searchRadius = radius;
  AsyncStorage.setItem(RADIUS_KEY, String(radius)).catch(() => {});
}

export function getZipCode(): string {
  return _zipCode;
}

export function getCity(): string {
  return _city;
}

export function getSearchRadius(): number {
  return _searchRadius;
}

// Initialize on import
initStore();
