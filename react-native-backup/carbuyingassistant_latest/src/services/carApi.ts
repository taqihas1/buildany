import AsyncStorage from '@react-native-async-storage/async-storage';
import { runApifyScraper, isApifyConfigured } from './apifyActor';
import { searchCarListings as searchMarketCheck, isMarketCheckConfigured } from './marketCheckApi';

const ZIP_STORAGE_KEY = '@user_zip_code';

// Car Buying Assistant - Real Vehicle Data + Market Listings
// Uses NHTSA vPIC API (free, no key) for real vehicle data
// Creates realistic market listings with competitive pricing

export interface CarListing {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  price: number;
  originalPrice: number;
  mileage: number;
  condition: 'new' | 'used' | 'cpo';
  fuelType: string;
  bodyType: string;
  transmission: string;
  drivetrain: string;
  color: string;
  interiorColor: string;
  engine: string;
  horsepower: number;
  features: string[];
  dealerName: string;
  dealerRating: number;
  dealerDistance: number;
  dealerAddress?: string;
  location: string;
  images: string[];
  daysOnMarket: number;
  priceHistory: { date: string; price: number }[];
  marketValue: number;
  savings: number;
  savingsPercent: number;
  source: string; // CarGurus, Autotrader, Cars.com, etc.
  listingUrl: string;
  isGreatDeal: boolean;
  isGoodDeal: boolean;
}

export interface SearchFilters {
  make?: string;
  model?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  maxMileage?: number;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
  drivetrain?: string;
  condition?: 'new' | 'used' | 'cpo';
  location?: string;
  radius?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'mileage_asc' | 'year_desc' | 'savings_desc' | 'distance_asc';
}

import {
  apifyScraper,
  ScrapedCarListing,
  setApifyToken
} from './apifyScraper';

export { setApifyToken };

// NHTSA vPIC API - Free, no API key required
const NHTSA_BASE_URL = 'https://vpic.nhtsa.dot.gov/api';

// Get all vehicle makes
// Helper: Get user's zip code from storage
async function getUserZipCode(): Promise<string> {
  try {
    const zip = await AsyncStorage.getItem(ZIP_STORAGE_KEY);
    return zip && /^\d{5}(-\d{4})?$/.test(zip) ? zip : '28201';
  } catch {
    return '28201';
  }
}

export async function getVehicleMakes(): Promise<string[]> {
  try {
    const response = await fetch(`${NHTSA_BASE_URL}/vehicles/getallmakes?format=json`);
    const data = await response.json();
    return data.Results.map((r: any) => r.Make_Name).sort();
  } catch (error) {
    console.error('Error fetching makes:', error);
    return FALLBACK_MAKES;
  }
}

// Get models for a make
export async function getVehicleModels(make: string): Promise<string[]> {
  try {
    const response = await fetch(
      `${NHTSA_BASE_URL}/vehicles/getmodelsformake/${encodeURIComponent(make)}?format=json`
    );
    const data = await response.json();
    const models = [...new Set(data.Results.map((r: any) => r.Model_Name))] as string[];
    return models.sort();
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

// Get vehicle types (body types)
export async function getVehicleTypes(): Promise<string[]> {
  try {
    const response = await fetch(`${NHTSA_BASE_URL}/vehicles/getvehiclevariablevalueslist/Body%20Class?format=json`);
    const data = await response.json();
    return data.Results.map((r: any) => r.ElementName);
  } catch (error) {
    return ['Sedan', 'SUV', 'Truck', 'Coupe', 'Hatchback', 'Wagon', 'Convertible', 'Van'];
  }
}

// Decode VIN to get vehicle details
export async function decodeVIN(vin: string): Promise<any> {
  try {
    const response = await fetch(
      `${NHTSA_BASE_URL}/vehicles/decodevinvalues/${vin}?format=json`
    );
    const data = await response.json();
    return data.Results[0];
  } catch (error) {
    console.error('Error decoding VIN:', error);
    return null;
  }
}

// Generate realistic car listings based on real vehicle data
export async function searchCarListings(filters: SearchFilters): Promise<CarListing[]> {
  const userZip = filters.location || await getUserZipCode();
  
  // 1. Try MarketCheck API first (fastest, most reliable)
  if (await isMarketCheckConfigured()) {
    try {
      console.log('Using MarketCheck API for real listings...');
      
      const mcListings = await searchMarketCheck({
        make: filters.make,
        model: filters.model,
        minYear: filters.minYear,
        maxYear: filters.maxYear,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        zipCode: userZip,
        radius: filters.radius || 50,
        maxResults: 50,
      });
      
      if (mcListings && mcListings.length > 0) {
        console.log(`Got ${mcListings.length} real listings from MarketCheck`);
        return mcListings.map(transformMarketCheckToCarListing);
      }
    } catch (error: any) {
      console.warn('MarketCheck API failed (falling back):', error.message || error);
    }
  }
  
  // 2. Fallback: Try custom Apify actor if configured
  if (await isApifyConfigured()) {
    try {
      console.log('Using custom Apify actor for real listings...');
      
      const apifyListings = await runApifyScraper({
        make: filters.make,
        model: filters.model,
        minYear: filters.minYear,
        maxYear: filters.maxYear,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        zipCode: userZip,
        radius: filters.radius || 50,
        sources: ['autotrader', 'carscom', 'cargurus'],
        maxListingsPerSource: 50,
        includePhotos: true,
      });
      
      if (apifyListings && apifyListings.length > 0) {
        console.log(`Got ${apifyListings.length} real listings from Apify actor`);
        return apifyListings.map(transformScrapedToCarListing);
      }
    } catch (error: any) {
      console.warn('Custom Apify actor failed (falling back to simulated):', error.message || error);
    }
  }
  
  // 3. Final fallback: Generate simulated listings
  console.log('Using simulated listings (no real data source configured)');
  await new Promise(resolve => setTimeout(resolve, 800));
  let listings = await generateRealisticListings(userZip);
  
  // Apply filters
  if (filters.make) {
    listings = listings.filter(l => 
      l.make.toLowerCase() === filters.make!.toLowerCase()
    );
  }
  if (filters.model) {
    listings = listings.filter(l => 
      l.model.toLowerCase().includes(filters.model!.toLowerCase())
    );
  }
  if (filters.minYear) {
    listings = listings.filter(l => l.year >= filters.minYear!);
  }
  if (filters.maxYear) {
    listings = listings.filter(l => l.year <= filters.maxYear!);
  }
  if (filters.minPrice) {
    listings = listings.filter(l => l.price >= filters.minPrice!);
  }
  if (filters.maxPrice) {
    listings = listings.filter(l => l.price <= filters.maxPrice!);
  }
  if (filters.maxMileage) {
    listings = listings.filter(l => l.mileage <= filters.maxMileage!);
  }
  if (filters.bodyType) {
    listings = listings.filter(l => l.bodyType === filters.bodyType);
  }
  if (filters.fuelType) {
    listings = listings.filter(l => l.fuelType === filters.fuelType);
  }
  if (filters.transmission) {
    listings = listings.filter(l => l.transmission === filters.transmission);
  }
  if (filters.drivetrain) {
    listings = listings.filter(l => l.drivetrain === filters.drivetrain);
  }
  if (filters.condition) {
    listings = listings.filter(l => l.condition === filters.condition);
  }
  
  // Sort
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'price_asc':
        listings.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        listings.sort((a, b) => b.price - a.price);
        break;
      case 'mileage_asc':
        listings.sort((a, b) => a.mileage - b.mileage);
        break;
      case 'year_desc':
        listings.sort((a, b) => b.year - a.year);
        break;
      case 'savings_desc':
        listings.sort((a, b) => b.savings - a.savings);
        break;
      case 'distance_asc':
        listings.sort((a, b) => a.dealerDistance - b.dealerDistance);
        break;
    }
  }
  
  return listings;
}

// Get deal analysis
export function analyzeDeal(listing: CarListing): {
  rating: 'great' | 'good' | 'fair' | 'high';
  ratingColor: string;
  message: string;
} {
  const ratio = listing.price / listing.marketValue;
  
  if (ratio <= 0.9) {
    return {
      rating: 'great',
      ratingColor: '#22c55e',
      message: `Great Deal! ${Math.round((1 - ratio) * 100)}% below market`
    };
  } else if (ratio <= 0.97) {
    return {
      rating: 'good',
      ratingColor: '#3b82f6',
      message: `Good Deal ${Math.round((1 - ratio) * 100)}% below market`
    };
  } else if (ratio <= 1.05) {
    return {
      rating: 'fair',
      ratingColor: '#f59e0b',
      message: 'Fair Price - At market value'
    };
  } else {
    return {
      rating: 'high',
      ratingColor: '#ef4444',
      message: `High Price ${Math.round((ratio - 1) * 100)}% above market`
    };
  }
}

// Generate realistic listings with market-based pricing
async function generateRealisticListings(userLocation?: string): Promise<CarListing[]> {
  const makes = [
    { name: 'Toyota', models: [
      { name: 'Camry', bodyType: 'Sedan', basePrice: 28000, types: ['LE', 'SE', 'XLE', 'XSE'] },
      { name: 'RAV4', bodyType: 'SUV', basePrice: 32000, types: ['LE', 'XLE', 'Adventure', 'Limited'] },
      { name: 'Corolla', bodyType: 'Sedan', basePrice: 23000, types: ['LE', 'SE', 'XSE'] },
      { name: 'Highlander', bodyType: 'SUV', basePrice: 42000, types: ['L', 'LE', 'XLE', 'Limited', 'Platinum'] },
      { name: 'Tacoma', bodyType: 'Truck', basePrice: 35000, types: ['SR', 'SR5', 'TRD Sport', 'TRD Off-Road', 'Limited'] }
    ]},
    { name: 'Honda', models: [
      { name: 'Accord', bodyType: 'Sedan', basePrice: 29000, types: ['LX', 'Sport', 'EX-L', 'Touring'] },
      { name: 'CR-V', bodyType: 'SUV', basePrice: 31000, types: ['LX', 'EX', 'EX-L', 'Touring'] },
      { name: 'Civic', bodyType: 'Sedan', basePrice: 25000, types: ['LX', 'Sport', 'EX', 'Touring'] },
      { name: 'Pilot', bodyType: 'SUV', basePrice: 43000, types: ['LX', 'EX-L', 'Touring', 'Elite', 'Black Edition'] }
    ]},
    { name: 'Ford', models: [
      { name: 'F-150', bodyType: 'Truck', basePrice: 38000, types: ['XL', 'XLT', 'Lariat', 'King Ranch', 'Platinum', 'Limited'] },
      { name: 'Escape', bodyType: 'SUV', basePrice: 30000, types: ['S', 'SE', 'SEL', 'Titanium'] },
      { name: 'Explorer', bodyType: 'SUV', basePrice: 40000, types: ['Base', 'XLT', 'Limited', 'ST', 'Platinum'] },
      { name: 'Mustang', bodyType: 'Coupe', basePrice: 33000, types: ['EcoBoost', 'GT', 'Mach 1', 'GT500'] }
    ]},
    { name: 'BMW', models: [
      { name: '3 Series', bodyType: 'Sedan', basePrice: 45000, types: ['330i', '330e', 'M340i', 'M3'] },
      { name: 'X3', bodyType: 'SUV', basePrice: 48000, types: ['sDrive30i', 'xDrive30i', 'M40i', 'X3 M'] },
      { name: 'X5', bodyType: 'SUV', basePrice: 65000, types: ['sDrive40i', 'xDrive40i', 'xDrive50e', 'M60i', 'X5 M'] },
      { name: '5 Series', bodyType: 'Sedan', basePrice: 58000, types: ['530i', '530e', '540i', 'M550i', 'M5'] }
    ]},
    { name: 'Mercedes-Benz', models: [
      { name: 'C-Class', bodyType: 'Sedan', basePrice: 47000, types: ['C300', 'C300 4MATIC', 'AMG C43', 'AMG C63 S'] },
      { name: 'GLC', bodyType: 'SUV', basePrice: 49000, types: ['GLC300', 'GLC300 4MATIC', 'AMG GLC43', 'AMG GLC63 S'] },
      { name: 'E-Class', bodyType: 'Sedan', basePrice: 62000, types: ['E350', 'E450 4MATIC', 'AMG E53', 'AMG E63 S'] }
    ]},
    { name: 'Tesla', models: [
      { name: 'Model 3', bodyType: 'Sedan', basePrice: 42000, types: ['Rear-Wheel Drive', 'Long Range', 'Performance'] },
      { name: 'Model Y', bodyType: 'SUV', basePrice: 48000, types: ['Rear-Wheel Drive', 'Long Range', 'Performance'] },
      { name: 'Model S', bodyType: 'Sedan', basePrice: 90000, types: ['Dual Motor', 'Plaid'] },
      { name: 'Model X', bodyType: 'SUV', basePrice: 100000, types: ['Dual Motor', 'Plaid'] }
    ]},
    { name: 'Lexus', models: [
      { name: 'RX', bodyType: 'SUV', basePrice: 50000, types: ['RX 350', 'RX 350L', 'RX 450h+', 'RX 500h F Sport'] },
      { name: 'ES', bodyType: 'Sedan', basePrice: 43000, types: ['ES 250', 'ES 350', 'ES 300h'] },
      { name: 'NX', bodyType: 'SUV', basePrice: 42000, types: ['NX 250', 'NX 350', 'NX 350h', 'NX 450h+'] }
    ]},
    { name: 'Audi', models: [
      { name: 'A4', bodyType: 'Sedan', basePrice: 43000, types: ['Premium', 'Premium Plus', 'Prestige', 'S4', 'RS4'] },
      { name: 'Q5', bodyType: 'SUV', basePrice: 46000, types: ['Premium', 'Premium Plus', 'Prestige', 'SQ5'] },
      { name: 'A6', bodyType: 'Sedan', basePrice: 58000, types: ['Premium', 'Premium Plus', 'Prestige', 'S6', 'RS6'] }
    ]},
    { name: 'Chevrolet', models: [
      { name: 'Silverado', bodyType: 'Truck', basePrice: 37000, types: ['WT', 'Custom', 'LT', 'RST', 'LTZ', 'High Country'] },
      { name: 'Equinox', bodyType: 'SUV', basePrice: 28000, types: ['LS', 'LT', 'RS', 'Premier'] },
      { name: 'Traverse', bodyType: 'SUV', basePrice: 38000, types: ['LS', 'LT', 'RS', 'Premier', 'High Country'] }
    ]},
    { name: 'Hyundai', models: [
      { name: 'Tucson', bodyType: 'SUV', basePrice: 29000, types: ['SE', 'SEL', 'XRT', 'Limited', 'N Line'] },
      { name: 'Sonata', bodyType: 'Sedan', basePrice: 28000, types: ['SE', 'SEL', 'SEL Plus', 'Limited', 'N Line'] },
      { name: 'Santa Fe', bodyType: 'SUV', basePrice: 35000, types: ['SE', 'SEL', 'XRT', 'Limited', 'Calligraphy'] }
    ]}
  ];
  
  const colors = ['White', 'Black', 'Silver', 'Gray', 'Blue', 'Red', 'Green', 'Pearl White', 'Midnight Black', 'Graphite'];
  const interiorColors = ['Black', 'Beige', 'Gray', 'Tan', 'Red', 'White', 'Brown'];
  const fuelTypes = ['Gasoline', 'Hybrid', 'Electric', 'Diesel', 'Plug-in Hybrid'];
  const transmissions = ['Automatic', 'Manual', 'CVT'];
  const drivetrains = ['FWD', 'RWD', 'AWD', '4WD'];
  
  // Determine metro area from user location (zip or city)
  const metro = getMetroArea(userLocation);
  
  // Generate dealers in the same metro area
  const dealers = generateLocalDealers(metro);
  
  const sources = ['CarGurus', 'Autotrader', 'Cars.com', 'Carvana', 'CarMax', 'TrueCar', 'AutoTempest'];
  
  const listings: CarListing[] = [];
  let id = 1;
  
  // Generate 100 realistic listings
  for (let i = 0; i < 100; i++) {
    const makeData = makes[Math.floor(Math.random() * makes.length)];
    const modelData = makeData.models[Math.floor(Math.random() * makeData.models.length)];
    const trim = modelData.types[Math.floor(Math.random() * modelData.types.length)];
    const year = 2020 + Math.floor(Math.random() * 6); // 2020-2025
    const condition: 'new' | 'used' | 'cpo' = Math.random() > 0.3 ? 'used' : (Math.random() > 0.5 ? 'new' : 'cpo');
    
    // Calculate realistic pricing
    const age = 2026 - year;
    const depreciation = condition === 'new' ? 0 : (0.15 + age * 0.08 + Math.random() * 0.1);
    const mileage = condition === 'new' ? Math.floor(Math.random() * 50) : Math.floor(5000 + age * 12000 + Math.random() * 30000);
    
    const trimPremium = modelData.types.indexOf(trim) * 3000;
    const marketValue = Math.round((modelData.basePrice + trimPremium) * (1 - depreciation));
    
    // Some dealers price below market (good deals), some above
    const priceVariance = (Math.random() - 0.4) * 0.15; // Slight bias toward below-market pricing
    const price = Math.round(marketValue * (1 + priceVariance));
    const originalPrice = Math.round(marketValue * 1.1); // MSRP or original listing price
    
    const savings = originalPrice - price;
    const savingsPercent = Math.round((savings / originalPrice) * 100);
    
    const dealer = dealers[Math.floor(Math.random() * dealers.length)];
    const fuelType = modelData.name.includes('Tesla') ? 'Electric' : 
                    (makeData.name === 'Toyota' && Math.random() > 0.5) ? 'Hybrid' :
                    fuelTypes[Math.floor(Math.random() * fuelTypes.length)];
    
    const source = sources[Math.floor(Math.random() * sources.length)];
    
    const listing: CarListing = {
      id: `listing_${id++}`,
      vin: generateVIN(makeData.name, year),
      year,
      make: makeData.name,
      model: modelData.name,
      trim,
      price,
      originalPrice,
      mileage,
      condition,
      fuelType,
      bodyType: modelData.bodyType,
      transmission: transmissions[Math.floor(Math.random() * transmissions.length)],
      drivetrain: drivetrains[Math.floor(Math.random() * drivetrains.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      interiorColor: interiorColors[Math.floor(Math.random() * interiorColors.length)],
      engine: generateEngineSpec(fuelType),
      horsepower: 150 + Math.floor(Math.random() * 350),
      features: generateFeatures(condition, price),
      dealerName: dealer.name,
      dealerRating: dealer.rating,
      dealerDistance: parseFloat(dealer.distance.toFixed(1)),
      location: dealer.location,
      images: [],
      daysOnMarket: Math.floor(Math.random() * 60),
      priceHistory: generatePriceHistory(price, originalPrice),
      marketValue,
      savings,
      savingsPercent,
      source,
      listingUrl: generateListingUrl(source, makeData.name, modelData.name, metro.zip),
      isGreatDeal: savingsPercent > 10,
      isGoodDeal: savingsPercent > 5
    };
    
    listings.push(listing);
  }
  
  return listings;
}

function generateVIN(make: string, year: number): string {
  // Simplified VIN generation
  const chars = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars[Math.floor(Math.random() * chars.length)];
  }
  return vin;
}

function generateEngineSpec(fuelType: string): string {
  const displacements = ['1.5L', '1.6L', '2.0L', '2.5L', '3.0L', '3.5L', '5.0L'];
  const disp = displacements[Math.floor(Math.random() * displacements.length)];
  
  if (fuelType === 'Electric') {
    const kw = 150 + Math.floor(Math.random() * 350);
    return `${kw}kW Electric Motor`;
  } else if (fuelType === 'Hybrid') {
    return `${disp} Hybrid`;
  } else {
    const cylinders = [4, 6, 8][Math.floor(Math.random() * 3)];
    const turbo = Math.random() > 0.6 ? ' Turbo' : '';
    return `${disp} ${cylinders}-cyl${turbo}`;
  }
}

function generateFeatures(condition: string, price: number): string[] {
  const allFeatures = [
    'Backup Camera', 'Bluetooth', 'Navigation', 'Sunroof', 'Leather Seats',
    'Heated Seats', 'Cooled Seats', 'Apple CarPlay', 'Android Auto',
    'Premium Audio', 'Wireless Charging', 'Keyless Entry', 'Remote Start',
    'Adaptive Cruise Control', 'Lane Keep Assist', 'Blind Spot Monitoring',
    'Parking Sensors', '360 Camera', 'Panoramic Roof', 'Power Liftgate',
    'Memory Seats', 'Ambient Lighting', 'Heads-Up Display', 'Massaging Seats',
    'Air Suspension', 'Tow Package', 'Roof Rails', 'Running Boards'
  ];
  
  const featureCount = condition === 'new' ? 12 + Math.floor(Math.random() * 8) :
                        price > 50000 ? 10 + Math.floor(Math.random() * 8) :
                        6 + Math.floor(Math.random() * 6);
  
  const shuffled = [...allFeatures].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, featureCount);
}

function generateLocation(): string {
  const cities = [
    'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX',
    'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA',
    'Dallas, TX', 'San Jose, CA', 'Austin, TX', 'Jacksonville, FL',
    'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC', 'San Francisco, CA',
    'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Washington, DC'
  ];
  return cities[Math.floor(Math.random() * cities.length)];
}

// Metro area data for realistic local listings
interface MetroArea {
  name: string;
  zip: string;
  dealers: { name: string; rating: number; distance: number; location: string }[];
}

function getMetroArea(userLocation?: string): MetroArea {
  const defaultMetro: MetroArea = {
    name: 'Charlotte, NC',
    zip: '28201',
    dealers: [
      { name: 'AutoMax Dealership', rating: 4.8, distance: 3.7, location: 'Charlotte, NC' },
      { name: 'Premier Motors', rating: 4.5, distance: 5.1, location: 'Charlotte, NC' },
      { name: 'City Auto Group', rating: 4.2, distance: 8.7, location: 'Matthews, NC' },
      { name: 'Best Price Cars', rating: 4.9, distance: 12.4, location: 'Gastonia, NC' },
      { name: 'National Auto Sales', rating: 4.0, distance: 15.2, location: 'Concord, NC' },
      { name: 'Elite Motors', rating: 4.7, distance: 3.8, location: 'Charlotte, NC' },
      { name: 'Value Auto Center', rating: 4.3, distance: 6.5, location: 'Huntersville, NC' },
      { name: 'Trusty Cars', rating: 4.6, distance: 9.1, location: 'Rock Hill, SC' }
    ]
  };

  if (!userLocation) return defaultMetro;

  const loc = userLocation.toLowerCase().trim();

  // Exact zip prefix matching (most reliable)
  const zipPrefix = loc.substring(0, 3);

  // Raleigh, NC - 276xx
  if (zipPrefix === '276' || loc.startsWith('275') || loc.includes('raleigh')) {
    return {
      name: 'Raleigh, NC',
      zip: '27605',
      dealers: [
        { name: 'AutoMax Dealership', rating: 4.8, distance: 4.2, location: 'Raleigh, NC' },
        { name: 'Premier Motors', rating: 4.5, distance: 6.8, location: 'Raleigh, NC' },
        { name: 'City Auto Group', rating: 4.2, distance: 9.1, location: 'Cary, NC' },
        { name: 'Best Price Cars', rating: 4.9, distance: 13.5, location: 'Durham, NC' },
        { name: 'National Auto Sales', rating: 4.0, distance: 17.2, location: 'Chapel Hill, NC' },
        { name: 'Elite Motors', rating: 4.7, distance: 5.3, location: 'Raleigh, NC' },
        { name: 'Value Auto Center', rating: 4.3, distance: 7.9, location: 'Garner, NC' },
        { name: 'Trusty Cars', rating: 4.6, distance: 11.4, location: 'Apex, NC' }
      ]
    };
  }

  // Charlotte, NC - 282xx
  if (zipPrefix === '282' || loc.includes('charlotte')) {
    return defaultMetro;
  }

  // Dallas, TX - 752xx, 750xx, 760xx
  if (zipPrefix === '752' || zipPrefix === '750' || zipPrefix === '760' || loc.includes('dallas') || loc.includes('fort worth')) {
    return {
      name: 'Dallas, TX',
      zip: '75201',
      dealers: [
        { name: 'AutoMax Dealership', rating: 4.8, distance: 4.2, location: 'Dallas, TX' },
        { name: 'Premier Motors', rating: 4.5, distance: 6.8, location: 'Dallas, TX' },
        { name: 'City Auto Group', rating: 4.2, distance: 9.3, location: 'Plano, TX' },
        { name: 'Best Price Cars', rating: 4.9, distance: 14.1, location: 'Fort Worth, TX' },
        { name: 'National Auto Sales', rating: 4.0, distance: 18.5, location: 'Arlington, TX' },
        { name: 'Elite Motors', rating: 4.7, distance: 5.5, location: 'Irving, TX' },
        { name: 'Value Auto Center', rating: 4.3, distance: 7.2, location: 'Garland, TX' },
        { name: 'Trusty Cars', rating: 4.6, distance: 11.3, location: 'Carrollton, TX' }
      ]
    };
  }

  // Los Angeles, CA - 900xx, 902xx
  if (zipPrefix === '900' || zipPrefix === '902' || loc.includes('los angeles') || loc === 'la') {
    return {
      name: 'Los Angeles, CA',
      zip: '90210',
      dealers: [
        { name: 'AutoMax Dealership', rating: 4.8, distance: 5.2, location: 'Los Angeles, CA' },
        { name: 'Premier Motors', rating: 4.5, distance: 8.1, location: 'Beverly Hills, CA' },
        { name: 'City Auto Group', rating: 4.2, distance: 12.3, location: 'Santa Monica, CA' },
        { name: 'Best Price Cars', rating: 4.9, distance: 15.7, location: 'Glendale, CA' },
        { name: 'National Auto Sales', rating: 4.0, distance: 22.4, location: 'Pasadena, CA' },
        { name: 'Elite Motors', rating: 4.7, distance: 6.9, location: 'West Hollywood, CA' },
        { name: 'Value Auto Center', rating: 4.3, distance: 9.5, location: 'Culver City, CA' },
        { name: 'Trusty Cars', rating: 4.6, distance: 14.2, location: 'Burbank, CA' }
      ]
    };
  }

  // New York, NY - 100xx
  if (zipPrefix === '100' || loc.includes('new york') || loc === 'nyc' || loc === 'ny') {
    return {
      name: 'New York, NY',
      zip: '10001',
      dealers: [
        { name: 'AutoMax Dealership', rating: 4.8, distance: 6.1, location: 'Manhattan, NY' },
        { name: 'Premier Motors', rating: 4.5, distance: 9.4, location: 'Brooklyn, NY' },
        { name: 'City Auto Group', rating: 4.2, distance: 13.2, location: 'Queens, NY' },
        { name: 'Best Price Cars', rating: 4.9, distance: 16.8, location: 'Bronx, NY' },
        { name: 'National Auto Sales', rating: 4.0, distance: 21.5, location: 'Staten Island, NY' },
        { name: 'Elite Motors', rating: 4.7, distance: 7.3, location: 'Jersey City, NJ' },
        { name: 'Value Auto Center', rating: 4.3, distance: 11.7, location: 'Newark, NJ' },
        { name: 'Trusty Cars', rating: 4.6, distance: 15.1, location: 'Yonkers, NY' }
      ]
    };
  }

  // Chicago, IL - 606xx
  if (zipPrefix === '606' || loc.includes('chicago') || loc.includes('illinois') || loc === 'il') {
    return {
      name: 'Chicago, IL',
      zip: '60601',
      dealers: [
        { name: 'AutoMax Dealership', rating: 4.8, distance: 4.5, location: 'Chicago, IL' },
        { name: 'Premier Motors', rating: 4.5, distance: 7.8, location: 'Chicago, IL' },
        { name: 'City Auto Group', rating: 4.2, distance: 11.2, location: 'Evanston, IL' },
        { name: 'Best Price Cars', rating: 4.9, distance: 14.6, location: 'Oak Park, IL' },
        { name: 'National Auto Sales', rating: 4.0, distance: 19.3, location: 'Schaumburg, IL' },
        { name: 'Elite Motors', rating: 4.7, distance: 6.4, location: 'Skokie, IL' },
        { name: 'Value Auto Center', rating: 4.3, distance: 9.1, location: 'Cicero, IL' },
        { name: 'Trusty Cars', rating: 4.6, distance: 12.8, location: 'Berwyn, IL' }
      ]
    };
  }

  return defaultMetro;
}

function generateLocalDealers(metro: MetroArea): { name: string; rating: number; distance: number; location: string }[] {
  return metro.dealers;
}

function generateListingUrl(source: string, make: string, model: string, zip: string): string {
  const encodedMake = encodeURIComponent(make);
  const encodedModel = encodeURIComponent(model);
  const makeCode = make.toLowerCase().replace(/\s/g, '');
  const modelCode = model.toLowerCase().replace(/\s/g, '_');
  
  switch (source) {
    case 'Autotrader':
      return `https://www.autotrader.com/cars-for-sale/all-cars/${makeCode}/${modelCode}?zip=${zip}&makeCodeList=${makeCode}&modelCodeList=${modelCode}&searchRadius=50`;
    case 'Cars.com':
      return `https://www.cars.com/shopping/results/?stock_type=used&makes%5B%5D=${encodedMake}&models%5B%5D=${encodedModel}&zip=${zip}`;
    case 'CarGurus':
      return `https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterUpdate.action?sourceContext=carGurusHomePageModel&newSearchFromOverviewPage=true&inventorySearchWidgetType=AUTO&entitySelectingHelper.selectedEntity=${makeCode}&entitySelectingHelper.selectedEntity2=${modelCode}&zip=${zip}&distance=50&searchChanged=true&modelChanged=true&filtersModified=true`;
    case 'Carvana':
      return `https://www.carvana.com/cars/${makeCode}-${modelCode}`;
    case 'CarMax':
      return `https://www.carmax.com/cars/${makeCode}/${modelCode}`;
    case 'TrueCar':
      return `https://www.truecar.com/used-cars-for-sale/listings/${makeCode}/${modelCode}/?zipcode=${zip}`;
    case 'AutoTempest':
    default:
      return `https://www.autotempest.com/results?make=${makeCode}&model=${modelCode}&zip=${zip}&radius=50`;
  }
}

async function generateCarImages(make: string, model: string, year?: number): Promise<string[]> {
  // Wikimedia Commons API - free, real car photos
  try {
    const searchQuery = year ? `${make} ${model} ${year}` : `${make} ${model}`;
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchQuery)}&gsrnamespace=6&prop=imageinfo&iiprop=url|size&iiurlwidth=800&format=json&origin=*`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.query?.pages) {
      const pages = Object.values(data.query.pages) as any[];
      const images: string[] = [];
      
      for (const page of pages.slice(0, 3)) {
        if (page.imageinfo?.[0]?.url) {
          images.push(page.imageinfo[0].url);
        }
      }
      
      if (images.length > 0) {
        return images;
      }
    }
  } catch (e) {
    console.log('Wikimedia fetch failed:', e);
  }
  
  // Fallback to curated Wikimedia car photos by make
  const makePhotos: Record<string, string[]> = {
    'Audi': [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Audi_A6_50_TDI_quattro_C8_IMG_4101.jpg/800px-Audi_A6_50_TDI_quattro_C8_IMG_4101.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Audi_A6_Avant_50_TDI_quattro_C8_IMG_4275.jpg/800px-Audi_A6_Avant_50_TDI_quattro_C8_IMG_4275.jpg'
    ],
    'BMW': [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/2019_BMW_320i_SE_Automatic_2.0_Front.jpg/800px-2019_BMW_320i_SE_Automatic_2.0_Front.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/2018_BMW_X5_xDrive30d_M_Sport_Automatic_3.0_Front.jpg/800px-2018_BMW_X5_xDrive30d_M_Sport_Automatic_3.0_Front.jpg'
    ],
    'Mercedes-Benz': [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/2018_Mercedes-Benz_C220_D_SE_Automatic_2.0_Front.jpg/800px-2018_Mercedes-Benz_C220_D_SE_Automatic_2.0_Front.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/2019_Mercedes-Benz_E220d_SE_Automatic_2.0_Front.jpg/800px-2019_Mercedes-Benz_E220d_SE_Automatic_2.0_Front.jpg'
    ],
    'Toyota': [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/2021_Toyota_Camry_XSE.jpg/800px-2021_Toyota_Camry_XSE.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/2019_Toyota_RAV4_XLE_AWD.jpg/800px-2019_Toyota_RAV4_XLE_AWD.jpg'
    ],
    'Honda': [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/2018_Honda_Accord_EX_1.5T.jpg/800px-2018_Honda_Accord_EX_1.5T.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/2019_Honda_CR-V_EX.jpg/800px-2019_Honda_CR-V_EX.jpg'
    ],
    'Tesla': [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/2021_Tesla_Model_3.jpg/800px-2021_Tesla_Model_3.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/2020_Tesla_Model_Y.jpg/800px-2020_Tesla_Model_Y.jpg'
    ],
    'Ford': [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/2018_Ford_F-150_XLT.jpg/800px-2018_Ford_F-150_XLT.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/2019_Ford_Mustang_GT.jpg/800px-2019_Ford_Mustang_GT.jpg'
    ],
    'Chevrolet': [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/2019_Chevrolet_Silverado_LT.jpg/800px-2019_Chevrolet_Silverado_LT.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/2020_Chevrolet_Equinox_LT.jpg/800px-2020_Chevrolet_Equinox_LT.jpg'
    ],
    'Lexus': [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/2019_Lexus_RX_350.jpg/800px-2019_Lexus_RX_350.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/2018_Lexus_ES_350.jpg/800px-2018_Lexus_ES_350.jpg'
    ],
    'Nissan': [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/2019_Nissan_Altima_SV.jpg/800px-2019_Nissan_Altima_SV.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/2020_Nissan_Rogue_SV.jpg/800px-2020_Nissan_Rogue_SV.jpg'
    ],
    'default': [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/2018_Audi_A6_40_TDi_S_Line_2.0_Front.jpg/800px-2018_Audi_A6_40_TDi_S_Line_2.0_Front.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/2019_BMW_320i_SE_Automatic_2.0_Front.jpg/800px-2019_BMW_320i_SE_Automatic_2.0_Front.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/2021_Toyota_Camry_XSE.jpg/800px-2021_Toyota_Camry_XSE.jpg'
    ]
  };

  const makeKey = Object.keys(makePhotos).find(k => 
    make.toLowerCase().includes(k.toLowerCase()) || 
    k.toLowerCase().includes(make.toLowerCase())
  );

  return makeKey ? makePhotos[makeKey] : makePhotos['default'];
}

function generatePriceHistory(currentPrice: number, originalPrice: number): { date: string; price: number }[] {
  const history: { date: string; price: number }[] = [];
  let price = originalPrice;
  const now = new Date();
  
  for (let i = 3; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 7);
    
    if (i === 0) {
      price = currentPrice;
    } else {
      price = Math.round(price * (0.98 + Math.random() * 0.03));
    }
    
    history.push({
      date: date.toISOString().split('T')[0],
      price
    });
  }
  
  return history;
}

const FALLBACK_MAKES = [
  'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW',
  'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge', 'Ferrari',
  'Fiat', 'Ford', 'Genesis', 'GMC', 'Honda', 'Hyundai', 'Infiniti',
  'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Land Rover', 'Lexus',
  'Lincoln', 'Lotus', 'Maserati', 'Mazda', 'McLaren', 'Mercedes-Benz',
  'MINI', 'Mitsubishi', 'Nissan', 'Porsche', 'Ram', 'Rolls-Royce',
  'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'
];

// Market value estimator based on real depreciation curves
export function estimateMarketValue(year: number, make: string, model: string, mileage: number, condition: string): number {
  // Base values for popular models (approximate MSRP)
  const baseValues: Record<string, Record<string, number>> = {
    'Toyota': { 'Camry': 28000, 'RAV4': 32000, 'Corolla': 23000, 'Highlander': 42000 },
    'Honda': { 'Accord': 29000, 'CR-V': 31000, 'Civic': 25000, 'Pilot': 43000 },
    'Ford': { 'F-150': 38000, 'Escape': 30000, 'Explorer': 40000, 'Mustang': 33000 },
    'BMW': { '3 Series': 45000, 'X3': 48000, 'X5': 65000, '5 Series': 58000 },
    'Mercedes-Benz': { 'C-Class': 47000, 'GLC': 49000, 'E-Class': 62000 },
    'Tesla': { 'Model 3': 42000, 'Model Y': 48000, 'Model S': 90000, 'Model X': 100000 },
    'Lexus': { 'RX': 50000, 'ES': 43000, 'NX': 42000 },
    'Audi': { 'A4': 43000, 'Q5': 46000, 'A6': 58000 },
    'Chevrolet': { 'Silverado': 37000, 'Equinox': 28000, 'Traverse': 38000 },
    'Hyundai': { 'Tucson': 29000, 'Sonata': 28000, 'Santa Fe': 35000 }
  };
  
  const makeValues = baseValues[make] || {};
  const baseValue = makeValues[model] || 35000;
  
  const age = 2026 - year;
  let depreciation: number;
  
  if (condition === 'new') {
    depreciation = 0;
  } else if (age <= 1) {
    depreciation = 0.20 + (mileage / 100000) * 0.10;
  } else if (age <= 3) {
    depreciation = 0.30 + (mileage / 100000) * 0.15;
  } else if (age <= 5) {
    depreciation = 0.45 + (mileage / 100000) * 0.15;
  } else {
    depreciation = 0.55 + (mileage / 100000) * 0.10;
  }
  
  return Math.round(baseValue * (1 - Math.min(depreciation, 0.8)));
}

// Compare prices across sources
export async function comparePrices(vin: string): Promise<{ source: string; price: number; url: string }[]> {
  // In a real implementation, this would query multiple APIs
  // For now, return simulated comparison data
  const basePrice = 25000 + Math.floor(Math.random() * 30000);
  
  return [
    { source: 'CarGurus', price: basePrice, url: `https://cargurus.com/vin/${vin}` },
    { source: 'Autotrader', price: basePrice + 500, url: `https://autotrader.com/vin/${vin}` },
    { source: 'Cars.com', price: basePrice - 200, url: `https://cars.com/vin/${vin}` },
    { source: 'Carvana', price: basePrice + 1000, url: `https://carvana.com/vin/${vin}` },
    { source: 'CarMax', price: basePrice + 1500, url: `https://carmax.com/vin/${vin}` },
    { source: 'TrueCar', price: basePrice - 100, url: `https://truecar.com/vin/${vin}` }
  ].sort((a, b) => a.price - b.price);
}

// Get vehicle history (CARFAX simulation)
export async function getVehicleHistory(vin: string): Promise<any> {
  // In real implementation, would call CARFAX API
  return {
    vin,
    accidents: Math.floor(Math.random() * 2),
    owners: 1 + Math.floor(Math.random() * 3),
    serviceRecords: 5 + Math.floor(Math.random() * 15),
    lastReportedMileage: 25000 + Math.floor(Math.random() * 75000),
    titleStatus: ['Clean', 'Clean', 'Clean', 'Clean', 'Salvage'][Math.floor(Math.random() * 5)],
    usageType: ['Personal', 'Personal', 'Lease', 'Fleet'][Math.floor(Math.random() * 4)],
    recalls: Math.floor(Math.random() * 3),
    warranty: 'Manufacturer warranty expired',
    recommended: true
  };
}

// Check NHTSA recalls
export async function checkRecalls(vin: string): Promise<any[]> {
  try {
    const response = await fetch(
      `https://api.nhtsa.gov/recalls/recallsByVin/${vin}?format=json`
    );
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching recalls:', error);
    return [];
  }
}

// Export for use in other modules
export const CAR_MAKES = [
  'Acura', 'Audi', 'BMW', 'Chevrolet', 'Ford', 'Honda', 'Hyundai',
  'Lexus', 'Mercedes-Benz', 'Tesla', 'Toyota', 'Volkswagen'
];

export const BODY_TYPES = ['Sedan', 'SUV', 'Truck', 'Coupe', 'Hatchback', 'Wagon', 'Convertible', 'Van'];

export const FUEL_TYPES = ['Gasoline', 'Hybrid', 'Electric', 'Diesel', 'Plug-in Hybrid'];

export const PRICE_RANGES = [
  { label: 'Under $20K', min: 0, max: 20000 },
  { label: '$20K - $30K', min: 20000, max: 30000 },
  { label: '$30K - $40K', min: 30000, max: 40000 },
  { label: '$40K - $50K', min: 40000, max: 50000 },
  { label: '$50K - $75K', min: 50000, max: 75000 },
  { label: '$75K+', min: 75000, max: 200000 }
];


// Transform MarketCheck listing to CarListing format
function transformMarketCheckToCarListing(raw: any): CarListing {
  const marketValue = estimateMarketValue(
    raw.year, raw.make, raw.model, raw.mileage, raw.condition
  );
  
  const originalPrice = raw.originalPrice || marketValue;
  const savings = originalPrice - raw.price;
  const savingsPercent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;
  
  return {
    id: raw.id,
    vin: raw.vin || generateVIN(raw.make, raw.year),
    year: raw.year,
    make: raw.make,
    model: raw.model,
    trim: raw.trim || 'Base',
    price: raw.price,
    originalPrice,
    mileage: raw.mileage,
    condition: raw.condition || 'used',
    fuelType: raw.fuelType || 'Gasoline',
    bodyType: raw.bodyType || 'Sedan',
    transmission: raw.transmission || 'Automatic',
    drivetrain: raw.drivetrain || 'FWD',
    color: raw.color || 'White',
    interiorColor: raw.interiorColor || 'Black',
    engine: raw.engine || `${150 + Math.floor(Math.random() * 150)}hp Engine`,
    horsepower: raw.horsepower || (150 + Math.floor(Math.random() * 200)),
    features: raw.features || ['Bluetooth', 'Backup Camera'],
    dealerName: raw.dealerName || 'Unknown Dealer',
    dealerRating: raw.dealerRating || 4.5,
    dealerDistance: raw.dealerDistance || Math.random() * 20,
    location: raw.location || 'Unknown',
    images: raw.images?.length > 0 ? raw.images : [],
    daysOnMarket: raw.daysOnMarket || Math.floor(Math.random() * 30),
    priceHistory: raw.priceHistory || [],
    marketValue,
    savings,
    savingsPercent,
    source: raw.source || 'MarketCheck',
    listingUrl: raw.listingUrl || '',
    isGreatDeal: savingsPercent > 10,
    isGoodDeal: savingsPercent > 5
  };
}

// Transform scraped listing to CarListing format
async function transformScrapedToCarListing(scraped: any): Promise<CarListing> {
  const marketValue = estimateMarketValue(
    scraped.year, scraped.make, scraped.model, scraped.mileage, scraped.condition
  );
  
  const originalPrice = scraped.originalPrice || marketValue;
  const savings = originalPrice - scraped.price;
  const savingsPercent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;
  
  return {
    id: scraped.id,
    vin: scraped.vin || generateVIN(scraped.make, scraped.year),
    year: scraped.year,
    make: scraped.make,
    model: scraped.model,
    trim: scraped.trim || 'Base',
    price: scraped.price,
    originalPrice,
    mileage: scraped.mileage,
    condition: scraped.condition,
    fuelType: scraped.fuelType || 'Gasoline',
    bodyType: 'Sedan',
    transmission: scraped.transmission || 'Automatic',
    drivetrain: scraped.drivetrain || 'FWD',
    color: scraped.color || 'White',
    interiorColor: scraped.interiorColor || 'Black',
    engine: scraped.engine || `${150 + Math.floor(Math.random() * 150)}hp Engine`,
    horsepower: 150 + Math.floor(Math.random() * 200),
    features: scraped.features || ['Bluetooth', 'Backup Camera'],
    dealerName: scraped.dealerName,
    dealerRating: scraped.dealerRating || 4.5,
    dealerDistance: scraped.dealerDistance || Math.random() * 20,
    location: scraped.location || 'Unknown',
    images: scraped.images?.length > 0 ? scraped.images : [],
    daysOnMarket: scraped.daysOnMarket || Math.floor(Math.random() * 30),
    priceHistory: scraped.priceHistory || [],
    marketValue,
    savings,
    savingsPercent,
    source: scraped.source,
    listingUrl: scraped.listingUrl,
    isGreatDeal: savingsPercent > 10,
    isGoodDeal: savingsPercent > 5
  };
}

export const YEAR_RANGES = [
  { label: '2024-2025', min: 2024, max: 2025 },
  { label: '2022-2025', min: 2022, max: 2025 },
  { label: '2020-2025', min: 2020, max: 2025 },
  { label: '2018-2025', min: 2018, max: 2025 },
  { label: '2015+', min: 2015, max: 2025 }
];
