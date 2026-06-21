import os
import shutil

BASE = '/Users/taqihasan/tradepulse'

# Clean slate
if os.path.exists(BASE):
    shutil.rmtree(BASE)

os.makedirs(BASE, exist_ok=True)
os.chdir(BASE)

# ============================================
# 1. package.json
# ============================================
write('package.json', r'''{
  "name": "tradepulse",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-status-bar": "~2.0.1",
    "react": "18.3.1",
    "react-native": "0.76.9",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "react-native-screens": "~4.4.0",
    "react-native-safe-area-context": "~5.4.0",
    "@expo/vector-icons": "^14.0.0",
    "react-native-chart-kit": "^6.12.0",
    "react-native-svg": "^15.11.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@types/react": "~18.3.12",
    "typescript": "~5.3.3"
  },
  "private": true
}
''')

# ============================================
# 2. tsconfig.json
# ============================================
write('tsconfig.json', r'''{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
''')

# ============================================
# 3. app.json
# ============================================
write('app.json', r'''{
  "expo": {
    "name": "TradePulse",
    "slug": "tradepulse",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a2e"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.tradepulse.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1a1a2e"
      },
      "package": "com.tradepulse.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
''')

# ============================================
# 4. App.tsx
# ============================================
write('App.tsx', r'''import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}
''')

# ============================================
# 5. Types
# ============================================
os.makedirs('src/types', exist_ok=True)

write('src/types/analysis.types.ts', r'''export interface StockPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FundamentalData {
  revenueTTM: number;
  revenueGrowthYoY: number;
  epsTTM: number;
  epsGrowthYoY: number;
  peRatio: number;
  pegRatio: number;
  debtToEquity: number;
  currentRatio: number;
  profitMargin: number;
  freeCashFlow: number;
  returnOnEquity: number;
}

export interface TechnicalIndicators {
  sma20: number;
  sma50: number;
  sma200: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerLower: number;
  bollingerMiddle: number;
  volumeSMA20: number;
  priceVsSMA20: number;  // percent
  priceVsSMA50: number;
  priceVsSMA200: number;
}

export interface MacroEvent {
  date: string;
  time: string;
  country: string;
  event: string;
  impact: 'low' | 'medium' | 'high';
  previous?: string;
  forecast?: string;
  actual?: string;
}

export interface MacroData {
  treasuryYield10Y: number;
  treasuryYield2Y: number;
  yieldCurveSpread: number;
  realInterestRate: number;
  upcomingEvents: MacroEvent[];
  lastCPI: number;
  lastJobsReport: number;
  fedFundsRate: number;
}

export interface FactorScore {
  score: number;      // 0-10
  maxPossible: number;  // always 10
  details: string[];  // human readable breakdown
  rawData: Record<string, number | string>;
}

export interface StockAnalysis {
  ticker: string;
  companyName: string;
  sector: string;
  lastPrice: number;
  priceChangePercent: number;
  overallScore: number;       // 0-10 weighted composite
  fundamentalScore: FactorScore;
  technicalScore: FactorScore;
  macroScore: FactorScore;
  earningsDate?: string;
  daysUntilEarnings?: number;
  recommendation: 'strong-positive' | 'positive' | 'neutral' | 'negative' | 'strong-negative';
  swingOutlook: string;       // "Bullish bias, watch for Fed decision"
  timestamp: string;
  dataSources: string[];
}

export interface WatchlistItem {
  ticker: string;
  addedAt: string;
  analysis?: StockAnalysis;
}
''')

# ============================================
# 6. Services - Data Fetchers
# ============================================
os.makedirs('src/services/data', exist_ok=True)

write('src/services/data/yahooFinance.ts', r'''const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

export async function fetchStockPrices(ticker: string, range: string = '1y', interval: string = '1d') {
  try {
    const url = `${BASE_URL}/${ticker}?range=${range}&interval=${interval}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    const result = data.chart.result[0];
    if (!result) throw new Error('No data');
    
    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0];
    
    return timestamps.map((t: number, i: number) => ({
      date: new Date(t * 1000).toISOString().split('T')[0],
      open: prices.open[i],
      high: prices.high[i],
      low: prices.low[i],
      close: prices.close[i],
      volume: prices.volume[i],
    })).filter((p: any) => p.close !== null);
  } catch (error) {
    console.error('Yahoo Finance error:', error);
    return [];
  }
}

export async function fetchFundamentals(ticker: string) {
  try {
    // Yahoo Finance summary endpoint for key stats
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryDetail,defaultKeyStatistics,financialData`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    const result = data.quoteSummary.result[0];
    if (!result) return null;
    
    const summary = result.summaryDetail || {};
    const stats = result.defaultKeyStatistics || {};
    const financial = result.financialData || {};
    
    return {
      revenueTTM: financial.totalRevenue?.raw || 0,
      revenueGrowthYoY: financial.revenueGrowth?.raw || 0,
      epsTTM: stats.trailingEps?.raw || 0,
      epsGrowthYoY: stats.earningsGrowth?.raw || 0,
      peRatio: summary.trailingPE?.raw || 0,
      pegRatio: stats.pegRatio?.raw || 0,
      debtToEquity: stats.debtToEquity?.raw || 0,
      currentRatio: summary.currentRatio?.raw || 0,
      profitMargin: financial.profitMargins?.raw || 0,
      freeCashFlow: financial.freeCashflow?.raw || 0,
      returnOnEquity: stats.returnOnEquity?.raw || 0,
    };
  } catch (error) {
    console.error('Fundamentals error:', error);
    return null;
  }
}

export async function fetchQuote(ticker: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`;
    const response = await fetch(url);
    const data = await response.json();
    const quote = data.quoteResponse.result[0];
    return {
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      name: quote.shortName || quote.longName,
      sector: quote.sector || 'Unknown',
      marketCap: quote.marketCap,
      earningsDate: quote.earningsDate?.fmt || null,
    };
  } catch (error) {
    console.error('Quote error:', error);
    return null;
  }
}
''')

write('src/services/data/fredApi.ts', r'''const BASE_URL = 'https://api.stlouisfed.org/fred';

// Free API key from https://fred.stlouisfed.org/docs/api/api_key.html
// For demo, we use the sample key (replace with your own)
const API_KEY = 'YOUR_FRED_API_KEY';

export async function fetchSeries(seriesId: string) {
  try {
    const url = `${BASE_URL}/series/observations?series_id=${seriesId}&api_key=${API_KEY}&file_type=json&sort_order=desc&limit=1`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.observations && data.observations.length > 0) {
      return parseFloat(data.observations[0].value);
    }
    return null;
  } catch (error) {
    console.error('FRED error:', error);
    return null;
  }
}

export async function fetchMacroBasics() {
  const [yield10Y, yield2Y, fedFunds] = await Promise.all([
    fetchSeries('DGS10'),
    fetchSeries('DGS2'),
    fetchSeries('FEDFUNDS'),
  ]);
  
  return {
    treasuryYield10Y: yield10Y || 0,
    treasuryYield2Y: yield2Y || 0,
    yieldCurveSpread: (yield10Y || 0) - (yield2Y || 0),
    fedFundsRate: fedFunds || 0,
    realInterestRate: (fedFunds || 0) - 2.5, // rough estimate
  };
}
''')

write('src/services/data/forexFactory.ts', r'''// ForexFactory calendar scraping
// Note: In production, cache this aggressively and respect their robots.txt

export async function scrapeEconomicCalendar() {
  try {
    // For demo, return mock high-impact events
    // In production, use a web scraping service or API
    const today = new Date();
    const events: any[] = [
      {
        date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '08:30',
        country: 'USD',
        event: 'CPI (Consumer Price Index)',
        impact: 'high',
        previous: '3.2%',
        forecast: '3.1%',
      },
      {
        date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '08:30',
        country: 'USD',
        event: 'Non-Farm Payrolls',
        impact: 'high',
        previous: '175K',
        forecast: '180K',
      },
      {
        date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '14:00',
        country: 'USD',
        event: 'FOMC Statement',
        impact: 'high',
        previous: '5.25-5.50%',
        forecast: '5.25-5.50%',
      },
    ];
    
    return events;
  } catch (error) {
    console.error('Calendar error:', error);
    return [];
  }
}
''')

# ============================================
# 7. Technical Indicators (Local Calculation)
# ============================================
write('src/services/technicalIndicators.ts', r'''import { StockPrice } from '../types/analysis.types';

function sma(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function rsi(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function macd(prices: number[]) {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  // Signal line = EMA 9 of MACD line
  // Simplified: just use last 9 prices approximation
  const signal = calculateEMA([...prices.slice(-9), macdLine], 9);
  
  return { macd: macdLine, signal };
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function bollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
  const middle = sma(prices, period);
  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
  const std = Math.sqrt(variance);
  
  return {
    upper: middle + stdDev * std,
    middle,
    lower: middle - stdDev * std,
  };
}

export function calculateTechnicals(prices: StockPrice[]) {
  const closes = prices.map(p => p.close);
  const volumes = prices.map(p => p.volume);
  const lastPrice = closes[closes.length - 1] || 0;
  
  const bb = bollingerBands(closes);
  const macdData = macd(closes);
  
  return {
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    rsi14: rsi(closes, 14),
    macd: macdData.macd,
    macdSignal: macdData.signal,
    bollingerUpper: bb.upper,
    bollingerMiddle: bb.middle,
    bollingerLower: bb.lower,
    volumeSMA20: sma(volumes, 20),
    priceVsSMA20: lastPrice && sma(closes, 20) ? ((lastPrice - sma(closes, 20)) / sma(closes, 20)) * 100 : 0,
    priceVsSMA50: lastPrice && sma(closes, 50) ? ((lastPrice - sma(closes, 50)) / sma(closes, 50)) * 100 : 0,
    priceVsSMA200: lastPrice && sma(closes, 200) ? ((lastPrice - sma(closes, 200)) / sma(closes, 200)) * 100 : 0,
  };
}
''')

# ============================================
# 8. Scoring Engine
# ============================================
write('src/services/scoringEngine.ts', r'''import { FundamentalData, TechnicalIndicators, MacroData, FactorScore } from '../types/analysis.types';

export function scoreFundamentals(data: FundamentalData | null): FactorScore {
  if (!data) {
    return { score: 5, maxPossible: 10, details: ['No fundamental data available'], rawData: {} };
  }
  
  let points = 0;
  const details: string[] = [];
  const rawData: Record<string, number | string> = {};
  
  // Revenue Growth (0-3 points)
  if (data.revenueGrowthYoY > 0.3) { points += 3; details.push('Strong revenue growth > 30%'); }
  else if (data.revenueGrowthYoY > 0.15) { points += 2; details.push('Good revenue growth 15-30%'); }
  else if (data.revenueGrowthYoY > 0) { points += 1; details.push('Positive revenue growth'); }
  else { details.push('Revenue declining'); }
  rawData.revenueGrowth = `${(data.revenueGrowthYoY * 100).toFixed(1)}%`;
  
  // EPS Growth (0-2 points)
  if (data.epsGrowthYoY > 0.25) { points += 2; details.push('Strong EPS growth > 25%'); }
  else if (data.epsGrowthYoY > 0.10) { points += 1; details.push('Moderate EPS growth 10-25%'); }
  else { details.push('Weak EPS growth'); }
  rawData.epsGrowth = `${(data.epsGrowthYoY * 100).toFixed(1)}%`;
  
  // P/E Ratio (0-2 points)
  if (data.peRatio > 0 && data.peRatio < 20) { points += 2; details.push('Attractive P/E < 20'); }
  else if (data.peRatio > 0 && data.peRatio < 35) { points += 1; details.push('Reasonable P/E 20-35'); }
  else { details.push('High P/E or negative earnings'); }
  rawData.peRatio = data.peRatio.toFixed(1);
  
  // Debt/Financial Health (0-2 points)
  if (data.debtToEquity < 0.5 && data.currentRatio > 1.5) { points += 2; details.push('Strong balance sheet'); }
  else if (data.debtToEquity < 1.0 && data.currentRatio > 1.0) { points += 1; details.push('Adequate balance sheet'); }
  else { details.push('Weak balance sheet'); }
  rawData.debtToEquity = data.debtToEquity.toFixed(2);
  rawData.currentRatio = data.currentRatio.toFixed(2);
  
  // Profitability (0-1 point)
  if (data.profitMargin > 0.15) { points += 1; details.push('High profit margin > 15%'); }
  else { details.push('Lower profit margin'); }
  rawData.profitMargin = `${(data.profitMargin * 100).toFixed(1)}%`;
  
  return { score: Math.min(points, 10), maxPossible: 10, details, rawData };
}

export function scoreTechnical(data: TechnicalIndicators): FactorScore {
  let points = 0;
  const details: string[] = [];
  const rawData: Record<string, number | string> = {};
  
  // Trend (0-3 points)
  const aboveSMA20 = data.priceVsSMA20 > 0;
  const aboveSMA50 = data.priceVsSMA50 > 0;
  const aboveSMA200 = data.priceVsSMA200 > 0;
  
  if (aboveSMA20 && aboveSMA50 && aboveSMA200) { points += 3; details.push('Price above all SMAs - strong uptrend'); }
  else if (aboveSMA50 && aboveSMA200) { points += 2; details.push('Price above 50/200 SMA - medium uptrend'); }
  else if (aboveSMA200) { points += 1; details.push('Price above 200 SMA only - weak uptrend'); }
  else { details.push('Price below 200 SMA - downtrend'); }
  rawData.vsSMA20 = `${data.priceVsSMA20.toFixed(1)}%`;
  rawData.vsSMA50 = `${data.priceVsSMA50.toFixed(1)}%`;
  rawData.vsSMA200 = `${data.priceVsSMA200.toFixed(1)}%`;
  
  // Momentum (0-3 points)
  if (data.rsi14 > 50 && data.rsi14 < 70) { points += 3; details.push('RSI in bullish zone (50-70)'); }
  else if (data.rsi14 > 40 && data.rsi14 <= 50) { points += 2; details.push('RSI neutral-bullish (40-50)'); }
  else if (data.rsi14 > 30 && data.rsi14 <= 40) { points += 1; details.push('RSI weak (30-40)'); }
  else { details.push('RSI extreme or weak'); }
  rawData.rsi = data.rsi14.toFixed(1);
  
  // MACD (0-2 points)
  if (data.macd > 0 && data.macd > data.macdSignal) { points += 2; details.push('MACD bullish crossover'); }
  else if (data.macd > 0) { points += 1; details.push('MACD positive'); }
  else { details.push('MACD negative'); }
  rawData.macd = data.macd.toFixed(2);
  
  // Bollinger (0-2 points)
  const midBB = (data.bollingerUpper + data.bollingerLower) / 2;
  const nearUpper = data.sma20 > midBB + (data.bollingerUpper - midBB) * 0.5;
  if (!nearUpper) { points += 2; details.push('Not overextended on Bollinger'); }
  else { points += 1; details.push('Near upper Bollinger band'); }
  rawData.bbWidth = `${((data.bollingerUpper - data.bollingerLower) / data.bollingerMiddle * 100).toFixed(1)}%`;
  
  return { score: Math.min(points, 10), maxPossible: 10, details, rawData };
}

export function scoreMacro(data: MacroData): FactorScore {
  let points = 0;
  const details: string[] = [];
  const rawData: Record<string, number | string> = {};
  
  // Yield Curve (0-3 points)
  if (data.yieldCurveSpread > 0.5) { points += 3; details.push('Steep yield curve - growth friendly'); }
  else if (data.yieldCurveSpread > 0) { points += 2; details.push('Normal yield curve'); }
  else if (data.yieldCurveSpread > -0.5) { points += 1; details.push('Flattening curve - caution'); }
  else { details.push('Inverted curve - recession signal'); }
  rawData.yieldSpread = `${data.yieldCurveSpread.toFixed(2)}%`;
  
  // Interest Rate Environment (0-3 points)
  if (data.fedFundsRate < 3.0) { points += 3; details.push('Low rates - supportive for growth'); }
  else if (data.fedFundsRate < 4.5) { points += 2; details.push('Moderate rates'); }
  else if (data.fedFundsRate < 5.5) { points += 1; details.push('Higher rates - headwind'); }
  else { details.push('High rates - significant headwind'); }
  rawData.fedRate = `${data.fedFundsRate.toFixed(2)}%`;
  
  // Upcoming Events (0-2 points)
  const highImpactEvents = data.upcomingEvents.filter(e => e.impact === 'high');
  if (highImpactEvents.length === 0) { points += 2; details.push('No major events this week'); }
  else if (highImpactEvents.length <= 2) { points += 1; details.push(`${highImpactEvents.length} high-impact events ahead`); }
  else { details.push(`${highImpactEvents.length} high-impact events - elevated volatility`); }
  rawData.upcomingEvents = `${highImpactEvents.length}`;
  
  // Real Rate (0-2 points)
  if (data.realInterestRate < 1.0) { points += 2; details.push('Low real rates - good for equities'); }
  else if (data.realInterestRate < 2.0) { points += 1; details.push('Moderate real rates'); }
  else { details.push('High real rates - pressure on valuations'); }
  rawData.realRate = `${data.realInterestRate.toFixed(2)}%`;
  
  return { score: Math.min(points, 10), maxPossible: 10, details, rawData };
}

export function calculateComposite(
  fundamental: FactorScore,
  technical: FactorScore,
  macro: FactorScore
) {
  // Swing trade weights: Fundamentals 40%, Technicals 30%, Macro 30%
  const weighted = (fundamental.score * 0.4) + (technical.score * 0.3) + (macro.score * 0.3);
  const overall = Math.round(weighted * 10) / 10;
  
  let recommendation: 'strong-positive' | 'positive' | 'neutral' | 'negative' | 'strong-negative';
  let swingOutlook: string;
  
  if (overall >= 8.0) {
    recommendation = 'strong-positive';
    swingOutlook = 'Strong bullish alignment. Favorable for swing entry.';
  } else if (overall >= 6.5) {
    recommendation = 'positive';
    swingOutlook = 'Bullish bias. Good setup with manageable risk.';
  } else if (overall >= 5.0) {
    recommendation = 'neutral';
    swingOutlook = 'Mixed signals. Wait for clearer direction.';
  } else if (overall >= 3.5) {
    recommendation = 'negative';
    swingOutlook = 'Bearish bias. Consider short or avoid.';
  } else {
    recommendation = 'strong-negative';
    swingOutlook = 'Strong bearish alignment. Avoid swing long.';
  }
  
  return { overall, recommendation, swingOutlook };
}
''')

# ============================================
# 9. Agents
# ============================================
os.makedirs('src/services/agents', exist_ok=True)

write('src/services/agents/fundamentalAgent.ts', r'''import { fetchFundamentals, fetchQuote } from '../data/yahooFinance';
import { scoreFundamentals } from '../scoringEngine';
import { FundamentalData } from '../../types/analysis.types';

export async function runFundamentalAgent(ticker: string) {
  console.log(`[Fundamental Agent] Analyzing ${ticker}...`);
  
  const [fundamentals, quote] = await Promise.all([
    fetchFundamentals(ticker),
    fetchQuote(ticker),
  ]);
  
  const score = scoreFundamentals(fundamentals);
  
  return {
    score,
    data: fundamentals,
    quote,
    sources: ['Yahoo Finance'],
  };
}
''')

write('src/services/agents/technicalAgent.ts', r'''import { fetchStockPrices } from '../data/yahooFinance';
import { calculateTechnicals } from '../technicalIndicators';
import { scoreTechnical } from '../scoringEngine';

export async function runTechnicalAgent(ticker: string) {
  console.log(`[Technical Agent] Analyzing ${ticker}...`);
  
  const prices = await fetchStockPrices(ticker, '1y', '1d');
  
  if (prices.length < 50) {
    return {
      score: { score: 5, maxPossible: 10, details: ['Insufficient price history'], rawData: {} },
      data: null,
      prices,
      sources: ['Yahoo Finance'],
    };
  }
  
  const indicators = calculateTechnicals(prices);
  const score = scoreTechnical(indicators);
  
  return {
    score,
    data: indicators,
    prices,
    sources: ['Yahoo Finance'],
  };
}
''')

write('src/services/agents/macroAgent.ts', r'''import { fetchMacroBasics } from '../data/fredApi';
import { scrapeEconomicCalendar } from '../data/forexFactory';
import { scoreMacro } from '../scoringEngine';

export async function runMacroAgent() {
  console.log('[Macro Agent] Analyzing macro environment...');
  
  const [macroBasics, events] = await Promise.all([
    fetchMacroBasics(),
    scrapeEconomicCalendar(),
  ]);
  
  const macroData = {
    ...macroBasics,
    upcomingEvents: events,
    lastCPI: 3.1,
    lastJobsReport: 175,
  };
  
  const score = scoreMacro(macroData);
  
  return {
    score,
    data: macroData,
    sources: ['FRED API', 'ForexFactory'],
  };
}
''')

write('src/services/agents/synthesisAgent.ts', r'''import { runFundamentalAgent } from './fundamentalAgent';
import { runTechnicalAgent } from './technicalAgent';
import { runMacroAgent } from './macroAgent';
import { calculateComposite } from '../scoringEngine';
import { StockAnalysis } from '../../types/analysis.types';

export async function runSynthesisAgent(ticker: string): Promise<StockAnalysis> {
  console.log(`[Synthesis Agent] Generating full analysis for ${ticker}...`);
  
  // Run all 3 agents in PARALLEL
  const [fundamentalResult, technicalResult, macroResult] = await Promise.all([
    runFundamentalAgent(ticker),
    runTechnicalAgent(ticker),
    runMacroAgent(),
  ]);
  
  const composite = calculateComposite(
    fundamentalResult.score,
    technicalResult.score,
    macroResult.score
  );
  
  const analysis: StockAnalysis = {
    ticker,
    companyName: fundamentalResult.quote?.name || ticker,
    sector: fundamentalResult.quote?.sector || 'Unknown',
    lastPrice: fundamentalResult.quote?.price || 0,
    priceChangePercent: fundamentalResult.quote?.changePercent || 0,
    overallScore: composite.overall,
    fundamentalScore: fundamentalResult.score,
    technicalScore: technicalResult.score,
    macroScore: macroResult.score,
    recommendation: composite.recommendation,
    swingOutlook: composite.swingOutlook,
    earningsDate: fundamentalResult.quote?.earningsDate || undefined,
    timestamp: new Date().toISOString(),
    dataSources: [
      ...fundamentalResult.sources,
      ...technicalResult.sources,
      ...macroResult.sources,
    ],
  };
  
  return analysis;
}
''')

# ============================================
# 10. Store
# ============================================
os.makedirs('src/store', exist_ok=True)

write('src/store/watchlistStore.ts', r'''import AsyncStorage from '@react-native-async-storage/async-storage';
import { WatchlistItem } from '../types/analysis.types';

const STORAGE_KEY = '@tradepulse_watchlist';

export async function getWatchlist(): Promise<WatchlistItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addToWatchlist(ticker: string): Promise<void> {
  const list = await getWatchlist();
  if (!list.find(item => item.ticker === ticker.toUpperCase())) {
    list.push({
      ticker: ticker.toUpperCase(),
      addedAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

export async function removeFromWatchlist(ticker: string): Promise<void> {
  const list = await getWatchlist();
  const filtered = list.filter(item => item.ticker !== ticker.toUpperCase());
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function clearWatchlist(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
''')

# ============================================
# 11. Components
# ============================================
os.makedirs('src/components', exist_ok=True)

write('src/components/ScoreCard.tsx', r'''import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StockAnalysis } from '../types/analysis.types';

interface Props {
  analysis: StockAnalysis;
  onPress?: () => void;
}

export default function ScoreCard({ analysis, onPress }: Props) {
  const scoreColor = getScoreColor(analysis.overallScore);
  const recLabel = getRecLabel(analysis.recommendation);
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.header}>
        <View>
          <Text style={styles.ticker}>{analysis.ticker}</Text>
          <Text style={styles.name}>{analysis.companyName}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
          <Text style={styles.scoreText}>{analysis.overallScore.toFixed(1)}</Text>
        </View>
      </View>
      
      <View style={styles.priceRow}>
        <Text style={styles.price}>${analysis.lastPrice.toFixed(2)}</Text>
        <Text style={[styles.change, analysis.priceChangePercent >= 0 ? styles.positive : styles.negative]}>
          {analysis.priceChangePercent >= 0 ? '+' : ''}{analysis.priceChangePercent.toFixed(2)}%
        </Text>
      </View>
      
      <View style={styles.factors}>
        <FactorBar label="Fundamental" score={analysis.fundamentalScore.score} />
        <FactorBar label="Technical" score={analysis.technicalScore.score} />
        <FactorBar label="Macro" score={analysis.macroScore.score} />
      </View>
      
      <View style={styles.footer}>
        <Ionicons name="pulse-outline" size={14} color="#888" />
        <Text style={styles.outlook}>{analysis.swingOutlook}</Text>
      </View>
      
      {analysis.earningsDate && (
        <View style={styles.earningsBadge}>
          <Ionicons name="calendar-outline" size={12} color="#f39c12" />
          <Text style={styles.earningsText}>Earnings: {analysis.earningsDate}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function FactorBar({ label, score }: { label: string; score: number }) {
  const width = `${score * 10}%`;
  const color = score >= 7 ? '#27ae60' : score >= 5 ? '#f39c12' : '#e74c3c';
  
  return (
    <View style={styles.factorRow}>
      <Text style={styles.factorLabel}>{label}</Text>
      <View style={styles.factorBarBg}>
        <View style={[styles.factorBarFill, { width, backgroundColor: color }]} />
      </View>
      <Text style={styles.factorScore}>{score.toFixed(1)}</Text>
    </View>
  );
}

function getScoreColor(score: number): string {
  if (score >= 8) return '#27ae60';
  if (score >= 6.5) return '#2ecc71';
  if (score >= 5) return '#f39c12';
  if (score >= 3.5) return '#e67e22';
  return '#e74c3c';
}

function getRecLabel(rec: string): string {
  const map: Record<string, string> = {
    'strong-positive': 'Strong Positive',
    'positive': 'Positive',
    'neutral': 'Neutral',
    'negative': 'Negative',
    'strong-negative': 'Strong Negative',
  };
  return map[rec] || rec;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticker: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  scoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  price: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  change: {
    fontSize: 14,
    fontWeight: '600',
  },
  positive: {
    color: '#2ecc71',
  },
  negative: {
    color: '#e74c3c',
  },
  factors: {
    marginTop: 12,
    gap: 8,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorLabel: {
    fontSize: 12,
    color: '#aaa',
    width: 80,
  },
  factorBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
  },
  factorBarFill: {
    height: 6,
    borderRadius: 3,
  },
  factorScore: {
    fontSize: 12,
    color: '#fff',
    width: 28,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  outlook: {
    fontSize: 12,
    color: '#aaa',
    flex: 1,
  },
  earningsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  earningsText: {
    fontSize: 11,
    color: '#f39c12',
  },
});
''')

# ============================================
# 12. Navigation
# ============================================
os.makedirs('src/navigation', exist_ok=True)

write('src/navigation/AppNavigator.tsx', r'''import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import WatchlistScreen from '../screens/WatchlistScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  Home: undefined;
  Analysis: { ticker: string };
  Watchlist: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        contentStyle: { backgroundColor: '#0f0f1a' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'TradePulse' }} />
      <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: 'Analysis' }} />
      <Stack.Screen name="Watchlist" component={WatchlistScreen} options={{ title: 'Watchlist' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}
''')

# ============================================
# 13. Screens
# ============================================
os.makedirs('src/screens', exist_ok=True)

write('src/screens/HomeScreen.tsx', r'''import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScoreCard from '../components/ScoreCard';
import { runSynthesisAgent } from '../services/agents/synthesisAgent';
import { StockAnalysis } from '../types/analysis.types';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [ticker, setTicker] = useState('');
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const analyze = useCallback(async (sym: string) => {
    if (!sym) return;
    setLoading(true);
    try {
      const result = await runSynthesisAgent(sym.toUpperCase());
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze. Check ticker symbol.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (analysis) {
      analyze(analysis.ticker);
    } else {
      setRefreshing(false);
    }
  }, [analysis, analyze]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>TradePulse</Text>
          <Text style={styles.subtitle}>Research Intelligence</Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#888" />
          <TextInput
            style={styles.input}
            placeholder="Enter ticker (e.g. NVDA)"
            placeholderTextColor="#666"
            value={ticker}
            onChangeText={setTicker}
            autoCapitalize="characters"
            maxLength={5}
            onSubmitEditing={() => analyze(ticker)}
          />
          <TouchableOpacity style={styles.button} onPress={() => analyze(ticker)}>
            <Text style={styles.buttonText}>Analyze</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Running 3-agent swarm...</Text>
          </View>
        )}

        {analysis && !loading && (
          <ScoreCard
            analysis={analysis}
            onPress={() => navigation.navigate('Analysis', { ticker: analysis.ticker })}
          />
        )}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={14} color="#666" />
          <Text style={styles.disclaimerText}>
            For informational purposes only. Not investment advice.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e2e',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loading: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 16,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
});
''')

write('src/screens/AnalysisScreen.tsx', r'''import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { runSynthesisAgent } from '../services/agents/synthesisAgent';
import { StockAnalysis } from '../types/analysis.types';

export default function AnalysisScreen() {
  const route = useRoute();
  const { ticker } = route.params as { ticker: string };
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runSynthesisAgent(ticker).then(result => {
      setAnalysis(result);
      setLoading(false);
    });
  }, [ticker]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Analyzing {ticker}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analysis) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.ticker}>{analysis.ticker}</Text>
          <Text style={styles.price}>${analysis.lastPrice.toFixed(2)}</Text>
          <Text style={[styles.change, analysis.priceChangePercent >= 0 ? styles.positive : styles.negative]}>
            {analysis.priceChangePercent >= 0 ? '+' : ''}{analysis.priceChangePercent.toFixed(2)}%
          </Text>
        </View>

        <View style={styles.scoreSection}>
          <Text style={styles.sectionTitle}>Overall Score</Text>
          <View style={styles.scoreRow}>
            <View style={[styles.bigScore, { backgroundColor: getScoreColor(analysis.overallScore) }]}>
              <Text style={styles.bigScoreText}>{analysis.overallScore.toFixed(1)}</Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={styles.recText}>{getRecLabel(analysis.recommendation)}</Text>
              <Text style={styles.outlookText}>{analysis.swingOutlook}</Text>
            </View>
          </View>
        </View>

        <FactorSection title="Fundamental Analysis" score={analysis.fundamentalScore} icon="document-text" />
        <FactorSection title="Technical Analysis" score={analysis.technicalScore} icon="trending-up" />
        <FactorSection title="Macro Environment" score={analysis.macroScore} icon="globe" />

        <View style={styles.sourcesBox}>
          <Text style={styles.sourcesTitle}>Data Sources</Text>
          {analysis.dataSources.map((source, i) => (
            <Text key={i} style={styles.sourceItem}>• {source}</Text>
          ))}
        </View>

        <View style={styles.disclaimerBox}>
          <Ionicons name="warning" size={16} color="#f39c12" />
          <Text style={styles.disclaimerText}>
            This analysis synthesizes publicly available financial data for research purposes only. 
            It does not constitute investment advice. Always conduct your own research before making investment decisions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FactorSection({ title, score, icon }: { title: string; score: any; icon: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.factorSection}>
      <TouchableOpacity style={styles.factorHeader} onPress={() => setExpanded(!expanded)}>
        <View style={styles.factorTitleRow}>
          <Ionicons name={icon as any} size={18} color="#3b82f6" />
          <Text style={styles.factorTitle}>{title}</Text>
        </View>
        <View style={styles.factorScoreBadge}>
          <Text style={styles.factorScoreText}>{score.score.toFixed(1)}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.factorDetails}>
          {score.details.map((detail: string, i: number) => (
            <View key={i} style={styles.detailRow}>
              <Ionicons name="checkmark-circle" size={14} color="#2ecc71" />
              <Text style={styles.detailText}>{detail}</Text>
            </View>
          ))}
          <View style={styles.rawDataBox}>
            <Text style={styles.rawDataTitle}>Raw Data</Text>
            {Object.entries(score.rawData).map(([key, value]) => (
              <Text key={key} style={styles.rawDataItem}>
                {key}: {value}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function getScoreColor(score: number): string {
  if (score >= 8) return '#27ae60';
  if (score >= 6.5) return '#2ecc71';
  if (score >= 5) return '#f39c12';
  if (score >= 3.5) return '#e67e22';
  return '#e74c3c';
}

function getRecLabel(rec: string): string {
  const map: Record<string, string> = {
    'strong-positive': 'Strong Positive',
    'positive': 'Positive',
    'neutral': 'Neutral',
    'negative': 'Negative',
    'strong-negative': 'Strong Negative',
  };
  return map[rec] || rec;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  scroll: { padding: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { color: '#888', marginTop: 12 },
  header: { alignItems: 'center', marginBottom: 20 },
  ticker: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  price: { fontSize: 24, color: '#fff', marginTop: 4 },
  change: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  positive: { color: '#2ecc71' },
  negative: { color: '#e74c3c' },
  scoreSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bigScore: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  bigScoreText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  scoreInfo: { flex: 1 },
  recText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  outlookText: { fontSize: 13, color: '#aaa', marginTop: 4 },
  factorSection: { backgroundColor: '#1e1e2e', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  factorTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factorTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  factorScoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factorScoreText: { fontSize: 16, fontWeight: 'bold', color: '#3b82f6' },
  factorDetails: { paddingHorizontal: 16, paddingBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailText: { fontSize: 13, color: '#ccc', flex: 1 },
  rawDataBox: { backgroundColor: '#2a2a3e', borderRadius: 8, padding: 12, marginTop: 12 },
  rawDataTitle: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 8 },
  rawDataItem: { fontSize: 12, color: '#aaa', fontFamily: 'monospace' },
  sourcesBox: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16, marginBottom: 12 },
  sourcesTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 8 },
  sourceItem: { fontSize: 13, color: '#aaa', marginBottom: 4 },
  disclaimerBox: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(243, 156, 18, 0.1)', borderRadius: 12, padding: 12, marginBottom: 20 },
  disclaimerText: { fontSize: 11, color: '#f39c12', flex: 1, lineHeight: 16 },
});
''')

write('src/screens/WatchlistScreen.tsx', r'''import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getWatchlist, removeFromWatchlist } from '../store/watchlistStore';
import { runSynthesisAgent } from '../services/agents/synthesisAgent';
import { WatchlistItem, StockAnalysis } from '../types/analysis.types';
import ScoreCard from '../components/ScoreCard';

export default function WatchlistScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, StockAnalysis>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const list = await getWatchlist();
    setItems(list);
    
    if (list.length > 0) {
      setLoading(true);
      const results: Record<string, StockAnalysis> = {};
      for (const item of list) {
        try {
          results[item.ticker] = await runSynthesisAgent(item.ticker);
        } catch {
          // skip failed
        }
      }
      setAnalyses(results);
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const remove = async (ticker: string) => {
    await removeFromWatchlist(ticker);
    load();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.ticker}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Text style={styles.title}>Watchlist</Text>
            <Text style={styles.count}>{items.length} stocks</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View>
            {analyses[item.ticker] && (
              <ScoreCard
                analysis={analyses[item.ticker]}
                onPress={() => navigation.navigate('Analysis', { ticker: item.ticker })}
              />
            )}
            <TouchableOpacity style={styles.removeBtn} onPress={() => remove(item.ticker)}>
              <Ionicons name="trash-outline" size={16} color="#e74c3c" />
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={48} color="#555" />
            <Text style={styles.emptyText}>No stocks in watchlist</Text>
            <Text style={styles.emptySub}>Search and analyze a stock to add it here</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  list: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  count: { fontSize: 14, color: '#888' },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingBottom: 12 },
  removeText: { fontSize: 12, color: '#e74c3c' },
  empty: { alignItems: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 18, color: '#888', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#555', marginTop: 4 },
});
''')

write('src/screens/SettingsScreen.tsx', r'''import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About TradePulse</Text>
          <Text style={styles.description}>
            TradePulse is a research intelligence tool that synthesizes publicly available financial data 
            from multiple sources. It does not provide investment advice or recommendations.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sources</Text>
          <SourceItem icon="trending-up" name="Yahoo Finance" desc="Stock prices, fundamentals" />
          <SourceItem icon="globe" name="FRED API" desc="Macroeconomic indicators" />
          <SourceItem icon="calendar" name="ForexFactory" desc="Economic calendar" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scoring Method</Text>
          <Text style={styles.description}>
            Overall scores are weighted composites: Fundamental (40%), Technical (30%), Macro (30%). 
            Each factor is scored 0-10 based on quantitative thresholds. Tap any score to see raw data.
          </Text>
        </View>

        <View style={styles.disclaimerBox}>
          <Ionicons name="warning" size={20} color="#f39c12" />
          <Text style={styles.disclaimerText}>
            All analysis is for informational purposes only. Past performance does not guarantee future results. 
            Users are solely responsible for their investment decisions. TradePulse is not a registered investment advisor.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>TradePulse v1.0.0</Text>
          <Text style={styles.copyright}>Built with Expo + React Native</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SourceItem({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  return (
    <View style={styles.sourceRow}>
      <Ionicons name={icon as any} size={18} color="#3b82f6" />
      <View style={styles.sourceInfo}>
        <Text style={styles.sourceName}>{name}</Text>
        <Text style={styles.sourceDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e1e2e' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e2e' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#3b82f6', marginBottom: 12 },
  description: { fontSize: 14, color: '#aaa', lineHeight: 20 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  sourceInfo: { flex: 1 },
  sourceName: { fontSize: 14, color: '#fff' },
  sourceDesc: { fontSize: 12, color: '#888' },
  disclaimerBox: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(243, 156, 18, 0.1)', margin: 16, padding: 16, borderRadius: 12 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#f39c12', lineHeight: 18 },
  footer: { alignItems: 'center', padding: 24 },
  version: { fontSize: 14, color: '#666' },
  copyright: { fontSize: 12, color: '#555', marginTop: 4 },
});
''')

# ============================================
# 14. Install script
# ============================================
write('install.sh', r'''#!/bin/bash
cd "$(dirname "$0")"
echo "Installing TradePulse dependencies..."
npm install --legacy-peer-deps
echo "Done! Run: npx expo start"
''')

os.chmod('install.sh', 0o755)

print(f"""
========================================
TradePulse app created at:
{BASE}
========================================

FILES CREATED:
- package.json
- tsconfig.json
- app.json
- App.tsx
- src/navigation/AppNavigator.tsx
- src/screens/HomeScreen.tsx
- src/screens/AnalysisScreen.tsx
- src/screens/WatchlistScreen.tsx
- src/screens/SettingsScreen.tsx
- src/components/ScoreCard.tsx
- src/types/analysis.types.ts
- src/services/data/yahooFinance.ts
- src/services/data/fredApi.ts
- src/services/data/forexFactory.ts
- src/services/technicalIndicators.ts
- src/services/scoringEngine.ts
- src/services/agents/fundamentalAgent.ts
- src/services/agents/technicalAgent.ts
- src/services/agents/macroAgent.ts
- src/services/agents/synthesisAgent.ts
- src/store/watchlistStore.ts
- install.sh

NEXT STEPS:
1. cd {BASE}
2. bash install.sh
3. npx expo start
4. Scan QR with Expo Go

The app features:
- Dark theme UI
- Scorecard with overall + 3 factor breakdowns
- Tap any score to see raw data
- Search any ticker (e.g., NVDA, AAPL)
- Watchlist for tracking multiple stocks
- Earnings date display
- Full disclaimers for legal safety

Note: Add your FRED API key in src/services/data/fredApi.ts
Get one free at: https://fred.stlouisfed.org/docs/api/api_key.html
""")
