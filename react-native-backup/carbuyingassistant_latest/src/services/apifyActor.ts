import AsyncStorage from '@react-native-async-storage/async-storage';

// Apify Actor API Integration for Real Car Listings
const APIFY_BASE_URL = 'https://api.apify.com/v2';

interface ApifyConfig {
  token: string;
  actorId?: string; // e.g., 'username/car-marketplace-scraper'
}

// Store config in AsyncStorage
const APIFY_CONFIG_KEY = '@apify_config';

export async function getApifyConfig(): Promise<ApifyConfig | null> {
  try {
    const config = await AsyncStorage.getItem(APIFY_CONFIG_KEY);
    return config ? JSON.parse(config) : null;
  } catch {
    return null;
  }
}

export async function setApifyConfig(config: ApifyConfig): Promise<void> {
  await AsyncStorage.setItem(APIFY_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Run the custom Apify actor to scrape real listings
 */
export async function runApifyScraper(params: {
  make?: string;
  model?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  zipCode?: string;
  radius?: number;
  sources?: string[];
  maxListingsPerSource?: number;
  includePhotos?: boolean;
}): Promise<any[]> {
  const config = await getApifyConfig();
  
  if (!config || !config.token) {
    throw new Error('Apify token not configured. Set it in Settings.');
  }
  
  const actorId = config.actorId?.replace('/', '~') || '8pu7xASEg7MmaqG41';
  
  // Start the actor run
  const startResponse = await fetch(
    `${APIFY_BASE_URL}/acts/${actorId}/runs?token=${config.token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        headless: true,
        proxySettings: { useApifyProxy: true },
      }),
    }
  );
  
  if (!startResponse.ok) {
    throw new Error(`Failed to start actor: ${startResponse.statusText}`);
  }
  
  const { data: run } = await startResponse.json();
  
  // Poll for completion (max 5 minutes)
  const maxWait = 5 * 60 * 1000;
  const pollInterval = 5000;
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
    const statusResponse = await fetch(
      `${APIFY_BASE_URL}/acts/${actorId}/runs/${run.id}?token=${config.token}`
    );
    
    if (!statusResponse.ok) continue;
    
    const { data: status } = await statusResponse.json();
    
    if (status.status === 'SUCCEEDED') {
      // Fetch results from dataset
      const datasetResponse = await fetch(
        `${APIFY_BASE_URL}/acts/${actorId}/runs/${run.id}/dataset/items?token=${config.token}&format=json`
      );
      
      if (!datasetResponse.ok) {
        throw new Error('Failed to fetch results');
      }
      
      return await datasetResponse.json();
    }
    
    if (status.status === 'FAILED' || status.status === 'ABORTED') {
      throw new Error(`Actor run failed: ${status.statusMessage || 'Unknown error'}`);
    }
  }
  
  throw new Error('Actor run timed out. Try again with smaller maxListingsPerSource.');
}

/**
 * Check if Apify is configured
 */
export async function isApifyConfigured(): Promise<boolean> {
  const config = await getApifyConfig();
  return !!config?.token;
}

/**
 * Quick test of the actor connection
 */
export async function testApifyConnection(): Promise<boolean> {
  try {
    const config = await getApifyConfig();
    if (!config?.token) return false;
    
    // Use unique actor ID (more reliable)
    const uniqueActorId = '8pu7xASEg7MmaqG41';
    const actorId = config.actorId?.replace('/', '~') || uniqueActorId;
    
    // Try to get actor info - lightweight test
    const response = await fetch(
      `${APIFY_BASE_URL}/acts/${actorId}?token=${config.token}`,
      { method: 'GET' }
    );
    
    if (response.ok) {
      return true;
    }
    
    // If username~name format fails, try unique ID
    const response2 = await fetch(
      `${APIFY_BASE_URL}/acts/${uniqueActorId}?token=${config.token}`,
      { method: 'GET' }
    );
    
    return response2.ok;
  } catch (e) {
    console.error('Apify connection test error:', e);
    return false;
  }
}
