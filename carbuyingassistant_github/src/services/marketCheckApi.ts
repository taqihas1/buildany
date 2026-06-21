import AsyncStorage from '@react-native-async-storage/async-storage';

// MarketCheck API Integration for Real Car Listings
const MARKETCHECK_BASE_URL = 'https://api.marketcheck.com/v2';
const DEFAULT_MARKETCHECK_API_KEY = 'cJuW19GsTHhPgBxSh7dAuqGApqVSjsw3';

interface MarketCheckConfig {
  apiKey: string;
}

// Store config in AsyncStorage
const MARKETCHECK_CONFIG_KEY = '@marketcheck_config';

export async function getMarketCheckConfig(): Promise<MarketCheckConfig | null> {
  try {
    const config = await AsyncStorage.getItem(MARKETCHECK_CONFIG_KEY);
    if (config) return JSON.parse(config);
    // Fallback: return pre-configured key so app works out of the box
    return { apiKey: DEFAULT_MARKETCHECK_API_KEY };
  } catch {
    return { apiKey: DEFAULT_MARKETCHECK_API_KEY };
  }
}

export async function setMarketCheckConfig(config: MarketCheckConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(MARKETCHECK_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // silently fail
  }
}

export async function clearMarketCheckConfig(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MARKETCHECK_CONFIG_KEY);
  } catch {
    // silently fail
  }
}

export async function isMarketCheckConfigured(): Promise<boolean> {
  const config = await getMarketCheckConfig();
  return !!(config?.apiKey && config.apiKey.length > 10);
}

/**
 * Test if MarketCheck API key is valid
 */
export async function testMarketCheckConnection(): Promise<{
  success: boolean;
  message: string;
  remainingCalls?: number;
}> {
  try {
    const config = await getMarketCheckConfig();
    if (!config?.apiKey) {
      return { success: false, message: 'No API key configured' };
    }

    // Make a small test search (1 result, any make)
    const testUrl = `${MARKETCHECK_BASE_URL}/search/car/active?api_key=${config.apiKey}&make=honda&zip=27605&radius=50&rows=1`;
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'Invalid API key. Please check your key at developers.marketcheck.com' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `API error (${response.status}): ${errorText.substring(0, 100)}` };
    }

    const data = await response.json();
    
    // Check if we got listings back
    const listings = data?.listings || data?.data || [];
    const remainingCalls = response.headers.get('X-RateLimit-Remaining');
    
    if (listings.length === 0) {
      return { 
        success: true, 
        message: 'API key valid! No listings found for test query (Honda near 27605). Try a broader search.',
        remainingCalls: remainingCalls ? parseInt(remainingCalls) : undefined
      };
    }

    return { 
      success: true, 
      message: `API key valid! Found ${listings.length} test listing(s).`,
      remainingCalls: remainingCalls ? parseInt(remainingCalls) : undefined
    };

  } catch (error) {
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}

/**
 * Search for car listings using MarketCheck API
 */
export async function searchCarListings(params: {
  make?: string;
  model?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  zipCode?: string;
  radius?: number;
  maxResults?: number;
}): Promise<any[]> {
  const config = await getMarketCheckConfig();
  if (!config?.apiKey) {
    throw new Error('MarketCheck API key not configured');
  }

  const {
    make, model,
    minYear, maxYear,
    minPrice, maxPrice,
    zipCode = '90210',
    radius = 50,
    maxResults = 50,
  } = params;

  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.set('api_key', config.apiKey);
  queryParams.set('zip', zipCode);
  queryParams.set('radius', radius.toString());
  queryParams.set('rows', maxResults.toString());
  queryParams.set('facets', 'include');
  
  if (make) queryParams.set('make', make);
  if (model) queryParams.set('model', model);
  if (minYear) queryParams.set('year', `${minYear}-${maxYear || minYear}`);
  else if (maxYear) queryParams.set('year', `1900-${maxYear}`);
  if (minPrice) queryParams.set('price_range', `${minPrice}-${maxPrice || 999999}`);
  else if (maxPrice) queryParams.set('price_range', `0-${maxPrice}`);

  const url = `${MARKETCHECK_BASE_URL}/search/car/active?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MarketCheck API error (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  
  // MarketCheck returns listings in data.listings or data.data
  const rawListings = data?.listings || data?.data || [];
  
  return rawListings.map((item: any) => transformMarketCheckToCarListing(item));
}

/**
 * Transform MarketCheck listing to app's CarListing format
 */
function transformMarketCheckToCarListing(raw: any): any {
  // Extract images - MarketCheck provides media.photo_links array
  const images: string[] = [];
  if (raw.media?.photo_links && Array.isArray(raw.media.photo_links)) {
    images.push(...raw.media.photo_links.filter((url: string) => url && url.startsWith('http')));
  }
  
  // Build title from year, make, model, trim
  const year = raw.build?.year || raw.year;
  const make = raw.build?.make || raw.make;
  const model = raw.build?.model || raw.model;
  const trim = raw.build?.trim || raw.trim || '';
  const title = `${year || ''} ${make || ''} ${model || ''} ${trim}`.trim();
  
  // Parse price
  const price = raw.price || raw.pricing?.price || 0;
  const originalPrice = raw.pricing?.msrp || raw.msrp || null;
  
  // Parse mileage
  const mileage = raw.miles || raw.odometer || 0;
  
  // Extract dealer info
  const dealerName = raw.dealer?.name || raw.seller_name || 'Unknown Dealer';
  const dealerRating = raw.dealer?.rating ? parseFloat(raw.dealer.rating) : null;
  const dealerDistance = raw.distance || null;
  const dealerAddress = raw.dealer?.street || raw.dealer?.address || '';
  const location = raw.dealer?.city && raw.dealer?.state 
    ? `${raw.dealer.city}, ${raw.dealer.state}` 
    : (raw.location || '');
  
  // Extract VIN
  const vin = raw.vin || raw.build?.vin || '';
  
  // Extract specs
  const engine = raw.build?.engine || raw.engine || '';
  const transmission = raw.build?.transmission || raw.transmission || '';
  const drivetrain = raw.build?.drivetrain || raw.drivetrain || '';
  const fuelType = raw.build?.fuel_type || raw.fuel_type || '';
  const bodyType = raw.build?.body_type || raw.body_type || '';
  const color = raw.exterior_color || raw.build?.exterior_color || '';
  const interiorColor = raw.interior_color || raw.build?.interior_color || '';
  const horsepower = raw.build?.horsepower || raw.horsepower || null;
  
  // Features
  const features = raw.features || raw.build?.options || [];
  
  // Days on market
  const daysOnMarket = raw.dom || raw.days_on_market || null;
  
  // Condition
  const condition = raw.inventory_type || raw.condition || 'used';
  
  return {
    id: raw.id || `mc_${raw.vin || Date.now()}`,
    vin,
    title,
    year: parseInt(year) || new Date().getFullYear(),
    make: make || 'Unknown',
    model: model || 'Unknown',
    trim: trim || '',
    price: parseInt(price) || 0,
    originalPrice: originalPrice ? parseInt(originalPrice) : null,
    mileage: parseInt(mileage) || 0,
    condition: normalizeCondition(condition),
    fuelType: fuelType || 'Gasoline',
    bodyType: bodyType || 'Sedan',
    transmission: transmission || 'Automatic',
    drivetrain: drivetrain || 'FWD',
    color: color || 'Unknown',
    interiorColor: interiorColor || 'Unknown',
    engine: engine || '',
    horsepower: horsepower ? parseInt(horsepower) : null,
    features: Array.isArray(features) ? features : [],
    dealerName,
    dealerRating,
    dealerDistance,
    dealerAddress,
    location,
    images,
    daysOnMarket,
    source: 'MarketCheck',
    listingUrl: raw.vdp_url || raw.url || raw.source_url || '',
    scrapedAt: new Date().toISOString(),
    savings: originalPrice && price ? parseInt(originalPrice) - parseInt(price) : 0,
    savingsPercent: originalPrice && price
      ? Math.round(((parseInt(originalPrice) - parseInt(price)) / parseInt(originalPrice)) * 100)
      : 0,
  };
}

function normalizeCondition(condition: string): string {
  if (!condition) return 'used';
  const lower = condition.toLowerCase();
  if (lower.includes('new')) return 'new';
  if (lower.includes('certified') || lower.includes('cpo')) return 'cpo';
  return 'used';
}
