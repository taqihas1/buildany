// Apify Scraper Service for Real Car Listings
// Integrates with Apify AutoTempest scraper and other car marketplace scrapers

const APIFY_BASE_URL = 'https://api.apify.com/v2';

// Actor IDs for car marketplace scrapers on Apify
const ACTORS = {
  autotempest: 'ecomscrape/autotempest-cars-search-scraper',
  // Additional scrapers available on Apify Store
  cargurus: 'com.valentin/apify-cargurus-scraper', // hypothetical - would need real ID
  autotrader: 'com.valentin/apify-autotrader-scraper', // hypothetical
};

export interface ApifyConfig {
  apiToken: string;
}

export interface ScraperInput {
  urls?: string[];        // AutoTempest search result URLs
  keyword?: string;       // Search keyword (e.g., "toyota camry")
  zipCode?: string;       // ZIP code for location
  radius?: number;        // Search radius in miles
  maxItemsPerUrl?: number; // Max listings to scrape per URL
  maxRetries?: number;    // Max retries per URL
}

export interface ScrapedCarListing {
  id: string;
  title: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  price: number;
  originalPrice?: number;
  mileage: number;
  condition: 'new' | 'used' | 'cpo';
  fuelType?: string;
  transmission?: string;
  drivetrain?: string;
  color?: string;
  interiorColor?: string;
  engine?: string;
  vin?: string;
  features?: string[];
  dealerName: string;
  dealerRating?: number;
  dealerDistance?: number;
  location?: string;
  imageUrl?: string;
  images?: string[];
  daysOnMarket?: number;
  source: string;        // Which marketplace (AutoTrader, Cars.com, etc.)
  listingUrl: string;
  listingDate?: string;
  dealScore?: number;     // AutoTempest deal rating
  priceHistory?: { date: string; price: number }[];
}

// Check if Apify token is configured
export function isApifyConfigured(): boolean {
  return !!getApifyToken();
}

// Get stored API token
export function getApifyToken(): string | null {
  // In real app, this would use AsyncStorage
  // For now, we'll use a module-level variable (reset on app restart)
  return _apifyToken;
}

let _apifyToken: string | null = 'apify_api_9sjr1W0r7kd9kW4dtrAwEOmOB0L3wY0LDnlW';

export function setApifyToken(token: string): void {
  _apifyToken = token;
}

// Run AutoTempest scraper on Apify
export async function scrapeAutoTempest(
  config: ApifyConfig,
  input: ScraperInput
): Promise<ScrapedCarListing[]> {
  const runInput = buildAutoTempestInput(input);
  
  // Start the Actor run
  const run = await startActorRun(config.apiToken, ACTORS.autotempest, runInput);
  
  // Wait for completion
  const datasetId = await waitForRunCompletion(config.apiToken, run.id);
  
  // Fetch results
  const results = await fetchDatasetItems(config.apiToken, datasetId);
  
  // Transform to our format
  return results.map(transformAutoTempestResult);
}

// Build input for AutoTempest scraper
function buildAutoTempestInput(input: ScraperInput): any {
  if (input.urls && input.urls.length > 0) {
    return {
      urls: input.urls,
      ignore_url_failures: true,
      max_items_per_url: input.maxItemsPerUrl || 50,
      max_retries_per_url: input.maxRetries || 2,
      proxy: { useApifyProxy: true }
    };
  }
  
  // Build search URL if keyword provided
  if (input.keyword) {
    const searchParams = new URLSearchParams();
    searchParams.set('make', input.keyword.split(' ')[0] || '');
    if (input.keyword.split(' ')[1]) {
      searchParams.set('model', input.keyword.split(' ').slice(1).join(' '));
    }
    if (input.zipCode) searchParams.set('zip', input.zipCode);
    if (input.radius) searchParams.set('radius', input.radius.toString());
    
    const searchUrl = `https://www.autotempest.com/results?${searchParams.toString()}`;
    
    return {
      urls: [searchUrl],
      ignore_url_failures: true,
      max_items_per_url: input.maxItemsPerUrl || 50,
      max_retries_per_url: input.maxRetries || 2,
      proxy: { useApifyProxy: true }
    };
  }
  
  throw new Error('Either urls or keyword must be provided');
}

// Start an Actor run
async function startActorRun(
  token: string,
  actorId: string,
  input: any
): Promise<{ id: string }> {
  const response = await fetch(
    `${APIFY_BASE_URL}/acts/${actorId}/runs?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (errorData?.error?.type === 'actor-is-not-rented') {
      throw new Error('RENTAL_REQUIRED: You need to rent this scraper. Go to https://console.apify.com/actors/agUfQUk8hVv8cCsT4 and click "Rent for $15/month"');
    }
    throw new Error(`Apify run failed: ${JSON.stringify(errorData) || response.statusText}`);
  }
  
  const data = await response.json();
  return data.data;
}

// Poll for run completion
async function waitForRunCompletion(
  token: string,
  runId: string,
  maxWaitSeconds: number = 120
): Promise<string> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    const response = await fetch(
      `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to check run status');
    }
    
    const data = await response.json();
    const status = data.data.status;
    
    if (status === 'SUCCEEDED') {
      return data.data.defaultDatasetId;
    }
    
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Run ${status}: ${data.data.statusMessage || 'Unknown error'}`);
    }
    
    // Wait before polling again
    await sleep(3000);
  }
  
  throw new Error('Run timed out waiting for completion');
}

// Fetch dataset items
async function fetchDatasetItems(
  token: string,
  datasetId: string
): Promise<any[]> {
  const response = await fetch(
    `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&clean=true`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch dataset items');
  }
  
  return response.json();
}

// Transform AutoTempest result to our format
function transformAutoTempestResult(result: any): ScrapedCarListing {
  return {
    id: `apify_${result.vin || Math.random().toString(36).substr(2, 9)}`,
    title: result.title || `${result.year} ${result.make} ${result.model}`,
    year: parseInt(result.year) || new Date().getFullYear(),
    make: result.make || 'Unknown',
    model: result.model || 'Unknown',
    trim: result.trim || undefined,
    price: parseInt(result.price?.replace(/[^0-9]/g, '')) || 0,
    originalPrice: result.originalPrice ? parseInt(result.originalPrice.replace(/[^0-9]/g, '')) : undefined,
    mileage: parseInt(result.mileage?.replace(/[^0-9]/g, '')) || 0,
    condition: mapCondition(result.condition),
    fuelType: result.fuelType,
    transmission: result.transmission,
    drivetrain: result.drivetrain,
    color: result.exteriorColor,
    interiorColor: result.interiorColor,
    engine: result.engine,
    vin: result.vin,
    features: result.features?.split(',').map((f: string) => f.trim()) || [],
    dealerName: result.dealerName || result.sellerName || 'Private Seller',
    dealerRating: result.dealerRating ? parseFloat(result.dealerRating) : undefined,
    dealerDistance: result.distance ? parseFloat(result.distance) : undefined,
    location: result.location,
    imageUrl: result.imageUrl,
    images: result.images || (result.imageUrl ? [result.imageUrl] : []),
    daysOnMarket: result.daysOnMarket || result.listingAge,
    source: result.source || 'AutoTempest',
    listingUrl: result.url || result.listingUrl || '',
    listingDate: result.listingDate,
    dealScore: result.dealScore,
    priceHistory: result.priceHistory || []
  };
}

function mapCondition(condition?: string): 'new' | 'used' | 'cpo' {
  if (!condition) return 'used';
  const lower = condition.toLowerCase();
  if (lower.includes('new')) return 'new';
  if (lower.includes('certified') || lower.includes('cpo')) return 'cpo';
  return 'used';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get user's Apify account info
export async function getApifyAccountInfo(token: string): Promise<any> {
  const response = await fetch(
    `${APIFY_BASE_URL}/users/me?token=${token}`
  );
  
  if (!response.ok) {
    throw new Error('Invalid API token');
  }
  
  return response.json();
}

// Get estimated cost for a scrape
export function estimateScrapeCost(listingCount: number): {
  computeUnits: number;
  estimatedCost: number;
  actorRental: number;
} {
  // AutoTempest scraper typically uses ~0.1-0.3 CU per 100 listings
  const cuPerListing = 0.003;
  const computeUnits = listingCount * cuPerListing;
  
  return {
    computeUnits,
    estimatedCost: computeUnits * 0.30, // Free plan rate
    actorRental: 15.00 // Monthly rental for AutoTempest scraper
  };
}

// Generate AutoTempest search URL
export function generateAutoTempestUrl(
  make?: string,
  model?: string,
  minYear?: number,
  maxYear?: number,
  minPrice?: number,
  maxPrice?: number,
  zipCode?: string,
  radius?: number
): string {
  const params = new URLSearchParams();
  
  if (make) params.set('make', make.toLowerCase());
  if (model) params.set('model', model.toLowerCase().replace(/\s/g, '_'));
  if (minYear) params.set('min_year', minYear.toString());
  if (maxYear) params.set('max_year', maxYear.toString());
  if (minPrice) params.set('min_price', minPrice.toString());
  if (maxPrice) params.set('max_price', maxPrice.toString());
  if (zipCode) params.set('zip', zipCode);
  if (radius) params.set('radius', radius.toString());
  
  return `https://www.autotempest.com/results?${params.toString()}`;
}

// Export all scraper functions
export const apifyScraper = {
  scrapeAutoTempest,
  isApifyConfigured,
  getApifyToken,
  setApifyToken,
  getApifyAccountInfo,
  estimateScrapeCost,
  generateAutoTempestUrl,
  ACTORS
};
