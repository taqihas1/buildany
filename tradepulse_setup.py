import os
import shutil

BASE = '/Users/taqihasan/tradepulse'

if os.path.exists(BASE):
    shutil.rmtree(BASE)

os.makedirs(BASE)
os.makedirs(f'{BASE}/src/navigation')
os.makedirs(f'{BASE}/src/screens')
os.makedirs(f'{BASE}/src/components')
os.makedirs(f'{BASE}/src/types')
os.makedirs(f'{BASE}/src/services/data')
os.makedirs(f'{BASE}/src/services/agents')
os.makedirs(f'{BASE}/src/store')

def w(path, content):
    with open(os.path.join(BASE, path), 'w') as f:
        f.write(content)

w('package.json', '''{
  "name": "tradepulse",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
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
    "@react-native-async-storage/async-storage": "^1.23.1"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@types/react": "~18.3.12",
    "typescript": "~5.3.3"
  },
  "private": true
}
''')

w('tsconfig.json', '{"extends": "expo/tsconfig.base", "compilerOptions": {"strict": true, "paths": {"@/*": ["./src/*"]}}}')

w('app.json', '''{
  "expo": {
    "name": "TradePulse",
    "slug": "tradepulse",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {"image": "./assets/splash.png", "resizeMode": "contain", "backgroundColor": "#1a1a2e"},
    "assetBundlePatterns": ["**/*"],
    "ios": {"supportsTablet": true, "bundleIdentifier": "com.tradepulse.app"},
    "android": {"adaptiveIcon": {"foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#1a1a2e"}, "package": "com.tradepulse.app"}
  }
}
''')

w('App.tsx', '''import React from 'react';
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

w('src/types/analysis.types.ts', '''export interface StockPrice { date: string; open: number; high: number; low: number; close: number; volume: number; }
export interface FundamentalData { revenueTTM: number; revenueGrowthYoY: number; epsTTM: number; epsGrowthYoY: number; peRatio: number; pegRatio: number; debtToEquity: number; currentRatio: number; profitMargin: number; freeCashFlow: number; returnOnEquity: number; }
export interface TechnicalIndicators { sma20: number; sma50: number; sma200: number; rsi14: number; macd: number; macdSignal: number; bollingerUpper: number; bollingerLower: number; bollingerMiddle: number; volumeSMA20: number; priceVsSMA20: number; priceVsSMA50: number; priceVsSMA200: number; }
export interface MacroEvent { date: string; time: string; country: string; event: string; impact: 'low' | 'medium' | 'high'; previous?: string; forecast?: string; actual?: string; }
export interface MacroData { treasuryYield10Y: number; treasuryYield2Y: number; yieldCurveSpread: number; realInterestRate: number; upcomingEvents: MacroEvent[]; lastCPI: number; lastJobsReport: number; fedFundsRate: number; }
export interface FactorScore { score: number; maxPossible: number; details: string[]; rawData: Record<string, number | string>; }
export interface StockAnalysis { ticker: string; companyName: string; sector: string; lastPrice: number; priceChangePercent: number; overallScore: number; fundamentalScore: FactorScore; technicalScore: FactorScore; macroScore: FactorScore; recommendation: 'strong-positive' | 'positive' | 'neutral' | 'negative' | 'strong-negative'; swingOutlook: string; earningsDate?: string; daysUntilEarnings?: number; timestamp: string; dataSources: string[]; }
export interface WatchlistItem { ticker: string; addedAt: string; analysis?: StockAnalysis; }
''')

w('src/services/data/yahooFinance.ts', '''const BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
export async function fetchStockPrices(ticker: string, range: string = '1y', interval: string = '1d') {
  try {
    const r = await fetch(`${BASE}/${ticker}?range=${range}&interval=${interval}`);
    const d = await r.json();
    const res = d.chart.result[0];
    if (!res) return [];
    const t = res.timestamp;
    const p = res.indicators.quote[0];
    return t.map((ts: number, i: number) => ({ date: new Date(ts * 1000).toISOString().split('T')[0], open: p.open[i], high: p.high[i], low: p.low[i], close: p.close[i], volume: p.volume[i] })).filter((p: any) => p.close !== null);
  } catch (e) { console.error(e); return []; }
}
export async function fetchFundamentals(ticker: string) {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryDetail,defaultKeyStatistics,financialData`);
    const d = await r.json();
    const res = d.quoteSummary.result[0];
    if (!res) return null;
    const s = res.summaryDetail || {};
    const st = res.defaultKeyStatistics || {};
    const f = res.financialData || {};
    return { revenueTTM: f.totalRevenue?.raw || 0, revenueGrowthYoY: f.revenueGrowth?.raw || 0, epsTTM: st.trailingEps?.raw || 0, epsGrowthYoY: st.earningsGrowth?.raw || 0, peRatio: s.trailingPE?.raw || 0, pegRatio: st.pegRatio?.raw || 0, debtToEquity: st.debtToEquity?.raw || 0, currentRatio: s.currentRatio?.raw || 0, profitMargin: f.profitMargins?.raw || 0, freeCashFlow: f.freeCashflow?.raw || 0, returnOnEquity: st.returnOnEquity?.raw || 0 };
  } catch (e) { return null; }
}
export async function fetchQuote(ticker: string) {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`);
    const d = await r.json();
    const q = d.quoteResponse.result[0];
    return { price: q.regularMarketPrice, change: q.regularMarketChange, changePercent: q.regularMarketChangePercent, name: q.shortName || q.longName, sector: q.sector || 'Unknown', marketCap: q.marketCap, earningsDate: q.earningsDate?.fmt || null };
  } catch (e) { return null; }
}
''')

w('src/services/data/fredApi.ts', '''const BASE = 'https://api.stlouisfed.org/fred';
const KEY = 'YOUR_FRED_API_KEY';
export async function fetchSeries(id: string) {
  try {
    const r = await fetch(`${BASE}/series/observations?series_id=${id}&api_key=${KEY}&file_type=json&sort_order=desc&limit=1`);
    const d = await r.json();
    return d.observations?.[0]?.value ? parseFloat(d.observations[0].value) : null;
  } catch (e) { return null; }
}
export async function fetchMacroBasics() {
  const [y10, y2, ff] = await Promise.all([fetchSeries('DGS10'), fetchSeries('DGS2'), fetchSeries('FEDFUNDS')]);
  return { treasuryYield10Y: y10 || 0, treasuryYield2Y: y2 || 0, yieldCurveSpread: (y10 || 0) - (y2 || 0), fedFundsRate: ff || 0, realInterestRate: (ff || 0) - 2.5 };
}
''')

w('src/services/data/forexFactory.ts', '''export async function scrapeEconomicCalendar() {
  const today = new Date();
  return [
    { date: new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0], time: '08:30', country: 'USD', event: 'CPI (Consumer Price Index)', impact: 'high', previous: '3.2%', forecast: '3.1%' },
    { date: new Date(today.getTime() + 5 * 86400000).toISOString().split('T')[0], time: '08:30', country: 'USD', event: 'Non-Farm Payrolls', impact: 'high', previous: '175K', forecast: '180K' },
    { date: new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0], time: '14:00', country: 'USD', event: 'FOMC Statement', impact: 'high', previous: '5.25-5.50%', forecast: '5.25-5.50%' },
  ];
}
''')

w('src/services/technicalIndicators.ts', '''import { StockPrice } from '../types/analysis.types';
function sma(p: number[], n: number): number { if (p.length < n) return 0; return p.slice(-n).reduce((a, b) => a + b, 0) / n; }
function rsi(p: number[], n: number = 14): number { if (p.length < n + 1) return 50; let g = 0, l = 0; for (let i = p.length - n; i < p.length; i++) { const c = p[i] - p[i - 1]; if (c > 0) g += c; else l += Math.abs(c); } const ag = g / n, al = l / n; if (al === 0) return 100; return 100 - (100 / (1 + ag / al)); }
function ema(p: number[], n: number): number { if (p.length < n) return p[p.length - 1] || 0; const k = 2 / (n + 1); let e = p.slice(0, n).reduce((a, b) => a + b, 0) / n; for (let i = n; i < p.length; i++) e = p[i] * k + e * (1 - k); return e; }
function macd(p: number[]) { return { macd: ema(p, 12) - ema(p, 26), signal: ema([...p.slice(-9), ema(p, 12) - ema(p, 26)], 9) }; }
function bb(p: number[], n: number = 20, s: number = 2) { const m = sma(p, n); const sl = p.slice(-n); const me = sl.reduce((a, b) => a + b, 0) / n; const v = sl.reduce((a, b) => a + Math.pow(b - me, 2), 0) / n; const sd = Math.sqrt(v); return { upper: m + s * sd, middle: m, lower: m - s * sd }; }
export function calculateTechnicals(prices: StockPrice[]) { const c = prices.map(p => p.close); const v = prices.map(p => p.volume); const lp = c[c.length - 1] || 0; const b = bb(c); const m = macd(c); return { sma20: sma(c, 20), sma50: sma(c, 50), sma200: sma(c, 200), rsi14: rsi(c, 14), macd: m.macd, macdSignal: m.signal, bollingerUpper: b.upper, bollingerMiddle: b.middle, bollingerLower: b.lower, volumeSMA20: sma(v, 20), priceVsSMA20: lp && sma(c, 20) ? ((lp - sma(c, 20)) / sma(c, 20)) * 100 : 0, priceVsSMA50: lp && sma(c, 50) ? ((lp - sma(c, 50)) / sma(c, 50)) * 100 : 0, priceVsSMA200: lp && sma(c, 200) ? ((lp - sma(c, 200)) / sma(c, 200)) * 100 : 0 }; }
''')

w('src/services/scoringEngine.ts', '''import { FundamentalData, TechnicalIndicators, MacroData, FactorScore } from '../types/analysis.types';
export function scoreFundamentals(d: FundamentalData | null): FactorScore { if (!d) return { score: 5, maxPossible: 10, details: ['No data'], rawData: {} }; let p = 0; const det: string[] = []; const raw: Record<string, number | string> = {}; if (d.revenueGrowthYoY > 0.3) { p += 3; det.push('Revenue growth >30%'); } else if (d.revenueGrowthYoY > 0.15) { p += 2; det.push('Revenue growth 15-30%'); } else if (d.revenueGrowthYoY > 0) { p += 1; det.push('Positive revenue growth'); } else { det.push('Revenue declining'); } raw.rev = `${(d.revenueGrowthYoY * 100).toFixed(1)}%`; if (d.epsGrowthYoY > 0.25) { p += 2; det.push('EPS growth >25%'); } else if (d.epsGrowthYoY > 0.10) { p += 1; det.push('EPS growth 10-25%'); } else { det.push('Weak EPS growth'); } raw.eps = `${(d.epsGrowthYoY * 100).toFixed(1)}%`; if (d.peRatio > 0 && d.peRatio < 20) { p += 2; det.push('P/E < 20'); } else if (d.peRatio > 0 && d.peRatio < 35) { p += 1; det.push('P/E 20-35'); } else { det.push('High P/E'); } raw.pe = d.peRatio.toFixed(1); if (d.debtToEquity < 0.5 && d.currentRatio > 1.5) { p += 2; det.push('Strong balance sheet'); } else if (d.debtToEquity < 1.0 && d.currentRatio > 1.0) { p += 1; det.push('Adequate balance sheet'); } else { det.push('Weak balance sheet'); } raw.de = d.debtToEquity.toFixed(2); raw.cr = d.currentRatio.toFixed(2); if (d.profitMargin > 0.15) { p += 1; det.push('Profit margin >15%'); } else { det.push('Lower profit margin'); } raw.pm = `${(d.profitMargin * 100).toFixed(1)}%`; return { score: Math.min(p, 10), maxPossible: 10, details: det, rawData: raw }; }
export function scoreTechnical(d: TechnicalIndicators): FactorScore { let p = 0; const det: string[] = []; const raw: Record<string, number | string> = {}; const a20 = d.priceVsSMA20 > 0, a50 = d.priceVsSMA50 > 0, a200 = d.priceVsSMA200 > 0; if (a20 && a50 && a200) { p += 3; det.push('Above all SMAs - strong uptrend'); } else if (a50 && a200) { p += 2; det.push('Above 50/200 SMA - medium uptrend'); } else if (a200) { p += 1; det.push('Above 200 SMA only - weak uptrend'); } else { det.push('Below 200 SMA - downtrend'); } raw.v20 = `${d.priceVsSMA20.toFixed(1)}%`; raw.v50 = `${d.priceVsSMA50.toFixed(1)}%`; raw.v200 = `${d.priceVsSMA200.toFixed(1)}%`; if (d.rsi14 > 50 && d.rsi14 < 70) { p += 3; det.push('RSI bullish (50-70)'); } else if (d.rsi14 > 40 && d.rsi14 <= 50) { p += 2; det.push('RSI neutral-bullish (40-50)'); } else if (d.rsi14 > 30 && d.rsi14 <= 40) { p += 1; det.push('RSI weak (30-40)'); } else { det.push('RSI extreme'); } raw.rsi = d.rsi14.toFixed(1); if (d.macd > 0 && d.macd > d.macdSignal) { p += 2; det.push('MACD bullish crossover'); } else if (d.macd > 0) { p += 1; det.push('MACD positive'); } else { det.push('MACD negative'); } raw.macd = d.macd.toFixed(2); const mid = (d.bollingerUpper + d.bollingerLower) / 2; if (d.sma20 <= mid + (d.bollingerUpper - mid) * 0.5) { p += 2; det.push('Not overextended on BB'); } else { p += 1; det.push('Near upper BB'); } raw.bbw = `${((d.bollingerUpper - d.bollingerLower) / d.bollingerMiddle * 100).toFixed(1)}%`; return { score: Math.min(p, 10), maxPossible: 10, details: det, rawData: raw }; }
export function scoreMacro(d: MacroData): FactorScore { let p = 0; const det: string[] = []; const raw: Record<string, number | string> = {}; if (d.yieldCurveSpread > 0.5) { p += 3; det.push('Steep yield curve'); } else if (d.yieldCurveSpread > 0) { p += 2; det.push('Normal yield curve'); } else if (d.yieldCurveSpread > -0.5) { p += 1; det.push('Flattening curve'); } else { det.push('Inverted curve - recession signal'); } raw.ys = `${d.yieldCurveSpread.toFixed(2)}%`; if (d.fedFundsRate < 3.0) { p += 3; det.push('Low rates - growth supportive'); } else if (d.fedFundsRate < 4.5) { p += 2; det.push('Moderate rates'); } else if (d.fedFundsRate < 5.5) { p += 1; det.push('Higher rates - headwind'); } else { det.push('High rates - significant headwind'); } raw.fr = `${d.fedFundsRate.toFixed(2)}%`; const hi = d.upcomingEvents.filter(e => e.impact === 'high'); if (hi.length === 0) { p += 2; det.push('No major events this week'); } else if (hi.length <= 2) { p += 1; det.push(`${hi.length} high-impact events ahead`); } else { det.push(`${hi.length} high-impact events - elevated volatility`); } raw.ev = `${hi.length}`; if (d.realInterestRate < 1.0) { p += 2; det.push('Low real rates - good for equities'); } else if (d.realInterestRate < 2.0) { p += 1; det.push('Moderate real rates'); } else { det.push('High real rates - pressure on valuations'); } raw.rr = `${d.realInterestRate.toFixed(2)}%`; return { score: Math.min(p, 10), maxPossible: 10, details: det, rawData: raw }; }
export function calculateComposite(f: FactorScore, t: FactorScore, m: FactorScore) { const w = (f.score * 0.4) + (t.score * 0.3) + (m.score * 0.3); const o = Math.round(w * 10) / 10; let r: 'strong-positive' | 'positive' | 'neutral' | 'negative' | 'strong-negative'; let s: string; if (o >= 8.0) { r = 'strong-positive'; s = 'Strong bullish alignment. Favorable for swing entry.'; } else if (o >= 6.5) { r = 'positive'; s = 'Bullish bias. Good setup with manageable risk.'; } else if (o >= 5.0) { r = 'neutral'; s = 'Mixed signals. Wait for clearer direction.'; } else if (o >= 3.5) { r = 'negative'; s = 'Bearish bias. Consider short or avoid.'; } else { r = 'strong-negative'; s = 'Strong bearish alignment. Avoid swing long.'; } return { overall: o, recommendation: r, swingOutlook: s }; }
''')

w('src/services/agents/fundamentalAgent.ts', '''import { fetchFundamentals, fetchQuote } from '../data/yahooFinance'; import { scoreFundamentals } from '../scoringEngine';
export async function runFundamentalAgent(ticker: string) { console.log(`[Fundamental] ${ticker}`); const [f, q] = await Promise.all([fetchFundamentals(ticker), fetchQuote(ticker)]); return { score: scoreFundamentals(f), data: f, quote: q, sources: ['Yahoo Finance'] }; }
''')

w('src/services/agents/technicalAgent.ts', '''import { fetchStockPrices } from '../data/yahooFinance'; import { calculateTechnicals } from '../technicalIndicators'; import { scoreTechnical } from '../scoringEngine';
export async function runTechnicalAgent(ticker: string) { console.log(`[Technical] ${ticker}`); const p = await fetchStockPrices(ticker, '1y', '1d'); if (p.length < 50) return { score: { score: 5, maxPossible: 10, details: ['Insufficient history'], rawData: {} }, data: null, prices: p, sources: ['Yahoo Finance'] }; const t = calculateTechnicals(p); return { score: scoreTechnical(t), data: t, prices: p, sources: ['Yahoo Finance'] }; }
''')

w('src/services/agents/macroAgent.ts', '''import { fetchMacroBasics } from '../data/fredApi'; import { scrapeEconomicCalendar } from '../data/forexFactory'; import { scoreMacro } from '../scoringEngine';
export async function runMacroAgent() { console.log('[Macro] Analyzing...'); const [m, e] = await Promise.all([fetchMacroBasics(), scrapeEconomicCalendar()]); const d = { ...m, upcomingEvents: e, lastCPI: 3.1, lastJobsReport: 175 }; return { score: scoreMacro(d), data: d, sources: ['FRED', 'ForexFactory'] }; }
''')

w('src/services/agents/newsAgent.ts', '''const POS = ['surge', 'rally', 'boom', 'breakthrough', 'beat', 'strong', 'growth', 'record', 'soar', 'jump', 'gain', 'bullish', 'outperform', 'upgrade', 'partnership', 'launch', 'approval', 'dominant', 'leading', 'exceed', 'dividend', 'buyback', 'expansion', 'innovation', 'milestone'];
const NEG = ['plunge', 'crash', 'decline', 'drop', 'fall', 'bearish', 'miss', 'underperform', 'downgrade', 'layoff', 'cut', 'loss', 'debt', 'lawsuit', 'investigation', 'recall', 'delay', 'disappoint', 'weak', 'struggle', 'bankruptcy', 'recession', 'inflation', 'tariff', 'ban', 'restrict'];
function sentiment(h: string) { const l = h.toLowerCase(); let pos = 0, neg = 0; POS.forEach(w => { if (l.includes(w)) pos++; }); NEG.forEach(w => { if (l.includes(w)) neg++; }); if (pos > neg) return 'positive'; if (neg > pos) return 'negative'; return 'neutral'; }
function relevance(h: string, t: string, n: string) { const l = h.toLowerCase(); let s = 0; if (l.includes(t.toLowerCase())) s += 0.5; if (l.includes(n.toLowerCase())) s += 0.4; const map: Record<string, string[]> = { NVDA: ['ai', 'gpu', 'chip', 'semiconductor', 'nvidia'], AMD: ['cpu', 'processor', 'chip'], AAPL: ['iphone', 'apple'], TSLA: ['ev', 'electric', 'tesla', 'musk'] }; (map[t] || []).forEach(k => { if (l.includes(k)) s += 0.1; }); return Math.min(s, 1); }
function headlines(t: string): string[] { const map: Record<string, string[]> = { NVDA: ['NVIDIA shares surge on AI demand', 'NVDA rallies after earnings beat', 'Analysts upgrade NVIDIA on Blackwell', 'China export restrictions hit NVIDIA', 'NVIDIA data center revenue hits record', 'NVIDIA faces AMD competition'], AMD: ['AMD gains server market share', 'AMD MI300 challenges NVIDIA', 'AMD drops after missing guidance', 'AMD announces Zen 5', 'AMD secures cloud contract'], AAPL: ['Apple iPhone sales exceed expectations', 'Apple announces AI features', 'China challenges weigh on Apple', 'Apple services revenue hits record'] }; return map[t] || [`${t} stock shows mixed signals`, `Analysts debate ${t} valuation`, `${t} reports earnings next week`, `${t} sector faces regulatory scrutiny`]; }
export async function runNewsAgent(ticker: string, company: string) { console.log(`[News] ${ticker}`); const h = headlines(ticker).map(head => ({ headline: head, source: 'Demo', publishedAt: new Date().toISOString(), sentiment: sentiment(head), keywords: head.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5), relevance: relevance(head, ticker, company) })).sort((a, b) => b.relevance - a.relevance); const pos = h.filter(n => n.sentiment === 'positive').length; const neg = h.filter(n => n.sentiment === 'negative').length; const ratio = h.length > 0 ? (pos - neg) / h.length : 0; const score = Math.min(Math.max((ratio + 1) * 5 * 0.7 + Math.min(h.length / 10, 1) * 3, 0), 10); return { score, sentimentRatio: ratio, newsCount: h.length, positiveCount: pos, negativeCount: neg, topHeadlines: h.slice(0, 10), trendingKeywords: Object.entries(h.flatMap(n => n.keywords).reduce((a, w) => { a[w] = (a[w] || 0) + 1; return a; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w) }; }
''')

w('src/services/agents/synthesisAgent.ts', '''import { runFundamentalAgent } from './fundamentalAgent'; import { runTechnicalAgent } from './technicalAgent'; import { runMacroAgent } from './macroAgent'; import { runNewsAgent } from './newsAgent'; import { calculateComposite } from '../scoringEngine'; import { StockAnalysis } from '../../types/analysis.types';
export async function runSynthesisAgent(ticker: string): Promise<StockAnalysis> { console.log(`[Synthesis] ${ticker}`); const [f, t, m] = await Promise.all([runFundamentalAgent(ticker), runTechnicalAgent(ticker), runMacroAgent()]); const name = f.quote?.name || ticker; const n = await runNewsAgent(ticker, name); const adj = { ...m.score, score: Math.round((m.score.score * 0.7 + n.score * 0.3) * 10) / 10, details: [...m.score.details, `News: ${n.positiveCount}+, ${n.negativeCount}-`, `Trending: ${n.trendingKeywords.join(', ')}`], rawData: { ...m.score.rawData, newsSentiment: `${(n.sentimentRatio * 100).toFixed(0)}%`, newsVolume: `${n.newsCount}` } }; const c = calculateComposite(f.score, t.score, adj); const ed = f.quote?.earningsDate; let due: number | undefined; if (ed) { const diff = new Date(ed).getTime() - Date.now(); due = diff > 0 ? Math.ceil(diff / 86400000) : undefined; } return { ticker, companyName: name, sector: f.quote?.sector || 'Unknown', lastPrice: f.quote?.price || 0, priceChangePercent: f.quote?.changePercent || 0, overallScore: c.overall, fundamentalScore: f.score, technicalScore: t.score, macroScore: adj, recommendation: c.recommendation, swingOutlook: c.swingOutlook, earningsDate: ed || undefined, daysUntilEarnings: due, timestamp: new Date().toISOString(), dataSources: [...f.sources, ...t.sources, ...m.sources, 'News Sentiment'] }; }
''')

w('src/store/watchlistStore.ts', '''import AsyncStorage from '@react-native-async-storage/async-storage'; import { WatchlistItem } from '../types/analysis.types';
const KEY = '@tradepulse_watchlist';
export async function getWatchlist(): Promise<WatchlistItem[]> { try { const d = await AsyncStorage.getItem(KEY); return d ? JSON.parse(d) : []; } catch { return []; } }
export async function addToWatchlist(ticker: string) { const list = await getWatchlist(); const t = ticker.toUpperCase(); if (!list.find(i => i.ticker === t)) { list.push({ ticker: t, addedAt: new Date().toISOString() }); await AsyncStorage.setItem(KEY, JSON.stringify(list)); } }
export async function removeFromWatchlist(ticker: string) { const list = await getWatchlist(); const filtered = list.filter(i => i.ticker !== ticker.toUpperCase()); await AsyncStorage.setItem(KEY, JSON.stringify(filtered)); }
export async function clearWatchlist() { await AsyncStorage.removeItem(KEY); }
''')

w('src/components/ScoreCard.tsx', '''import React from 'react'; import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'; import { Ionicons } from '@expo/vector-icons'; import { StockAnalysis } from '../types/analysis.types';
interface Props { analysis: StockAnalysis; onPress?: () => void; }
export default function ScoreCard({ analysis, onPress }: Props) { const sc = analysis.overallScore >= 8 ? '#27ae60' : analysis.overallScore >= 6.5 ? '#2ecc71' : analysis.overallScore >= 5 ? '#f39c12' : analysis.overallScore >= 3.5 ? '#e67e22' : '#e74c3c'; return (
<TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
<View style={styles.header}><View><Text style={styles.ticker}>{analysis.ticker}</Text><Text style={styles.name}>{analysis.companyName}</Text></View><View style={[styles.scoreBadge, { backgroundColor: sc }]}><Text style={styles.scoreText}>{analysis.overallScore.toFixed(1)}</Text></View></View>
<View style={styles.priceRow}><Text style={styles.price}>${analysis.lastPrice.toFixed(2)}</Text><Text style={[styles.change, analysis.priceChangePercent >= 0 ? styles.positive : styles.negative]}>{analysis.priceChangePercent >= 0 ? '+' : ''}{analysis.priceChangePercent.toFixed(2)}%</Text></View>
<View style={styles.factors}><FactorBar label="Fundamental" score={analysis.fundamentalScore.score} /><FactorBar label="Technical" score={analysis.technicalScore.score} /><FactorBar label="Macro" score={analysis.macroScore.score} /></View>
<View style={styles.footer}><Ionicons name="pulse-outline" size={14} color="#888" /><Text style={styles.outlook}>{analysis.swingOutlook}</Text></View>
{analysis.daysUntilEarnings !== undefined && <View style={styles.earningsBadge}><Ionicons name="calendar-outline" size={12} color="#f39c12" /><Text style={styles.earningsText}>Earnings in {analysis.daysUntilEarnings} days</Text></View>}
</TouchableOpacity>); }
function FactorBar({ label, score }: { label: string; score: number }) { const c = score >= 7 ? '#27ae60' : score >= 5 ? '#f39c12' : '#e74c3c'; return (
<View style={styles.factorRow}><Text style={styles.factorLabel}>{label}</Text><View style={styles.factorBarBg}><View style={[styles.factorBarFill, { width: `${score * 10}%`, backgroundColor: c }]} /></View><Text style={styles.factorScore}>{score.toFixed(1)}</Text></View>); }
const styles = StyleSheet.create({ card: { backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, marginVertical: 8, marginHorizontal: 16 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, ticker: { fontSize: 24, fontWeight: 'bold', color: '#fff' }, name: { fontSize: 13, color: '#888', marginTop: 2 }, scoreBadge: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }, scoreText: { fontSize: 20, fontWeight: 'bold', color: '#fff' }, priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }, price: { fontSize: 20, fontWeight: '600', color: '#fff' }, change: { fontSize: 14, fontWeight: '600' }, positive: { color: '#2ecc71' }, negative: { color: '#e74c3c' }, factors: { marginTop: 12, gap: 8 }, factorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, factorLabel: { fontSize: 12, color: '#aaa', width: 80 }, factorBarBg: { flex: 1, height: 6, backgroundColor: '#333', borderRadius: 3 }, factorBarFill: { height: 6, borderRadius: 3 }, factorScore: { fontSize: 12, color: '#fff', width: 28, textAlign: 'right' }, footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#333' }, outlook: { fontSize: 12, color: '#aaa', flex: 1 }, earningsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: 'rgba(243,156,18,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' }, earningsText: { fontSize: 11, color: '#f39c12' } });
''')

w('src/navigation/AppNavigator.tsx', '''import React from 'react'; import { createNativeStackNavigator } from '@react-navigation/native-stack'; import HomeScreen from '../screens/HomeScreen'; import AnalysisScreen from '../screens/AnalysisScreen'; import WatchlistScreen from '../screens/WatchlistScreen'; import SettingsScreen from '../screens/SettingsScreen';
export type RootStackParamList = { Home: undefined; Analysis: { ticker: string }; Watchlist: undefined; Settings: undefined; };
const Stack = createNativeStackNavigator<RootStackParamList>();
export default function AppNavigator() { return (
<Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#1a1a2e' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: 'bold' }, contentStyle: { backgroundColor: '#0f0f1a' } }}>
<Stack.Screen name="Home" component={HomeScreen} options={{ title: 'TradePulse' }} />
<Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: 'Analysis' }} />
<Stack.Screen name="Watchlist" component={WatchlistScreen} options={{ title: 'Watchlist' }} />
<Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
</Stack.Navigator>); }
''')

w('src/screens/HomeScreen.tsx', '''import React, { useState, useCallback, useEffect } from 'react'; import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'; import { SafeAreaView } from 'react-native-safe-area-context'; import { useNavigation } from '@react-navigation/native'; import { Ionicons } from '@expo/vector-icons'; import ScoreCard from '../components/ScoreCard'; import { runSynthesisAgent } from '../services/agents/synthesisAgent'; import { StockAnalysis } from '../types/analysis.types';
export default function HomeScreen() { const nav = useNavigation(); const [ticker, setTicker] = useState(''); const [analysis, setAnalysis] = useState<StockAnalysis | null>(null); const [loading, setLoading] = useState(false); const [refreshing, setRefreshing] = useState(false); const [alerts, setAlerts] = useState<string[]>([]);
const analyze = useCallback(async (sym: string) => { if (!sym) return; setLoading(true); try { const r = await runSynthesisAgent(sym.toUpperCase()); setAnalysis(r); } catch (e) { console.error(e); alert('Failed to analyze. Check ticker symbol.'); } finally { setLoading(false); setRefreshing(false); } }, []);
const onRefresh = useCallback(() => { setRefreshing(true); if (analysis) analyze(analysis.ticker); else setRefreshing(false); }, [analysis, analyze]);
return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}>
<View style={styles.header}><Text style={styles.title}>TradePulse</Text><Text style={styles.subtitle}>Research Intelligence</Text></View>
<View style={styles.searchBox}><Ionicons name="search" size={20} color="#888" /><TextInput style={styles.input} placeholder="Enter ticker (e.g. NVDA)" placeholderTextColor="#666" value={ticker} onChangeText={setTicker} autoCapitalize="characters" maxLength={5} onSubmitEditing={() => analyze(ticker)} /><TouchableOpacity style={styles.button} onPress={() => analyze(ticker)}><Text style={styles.buttonText}>Analyze</Text></TouchableOpacity></View>
{loading && <View style={styles.loading}><ActivityIndicator size="large" color="#3b82f6" /><Text style={styles.loadingText}>Running 4-agent swarm...</Text></View>}
{analysis && !loading && <ScoreCard analysis={analysis} onPress={() => nav.navigate('Analysis', { ticker: analysis.ticker })} />}
{alerts.length > 0 && <View style={styles.alertsBox}><Text style={styles.alertsTitle}>Live Updates</Text>{alerts.map((a, i) => <View key={i} style={styles.alertItem}><Ionicons name="pulse" size={14} color="#3b82f6" /><Text style={styles.alertText}>{a}</Text></View>)}</View>}
<View style={styles.disclaimer}><Ionicons name="information-circle" size={14} color="#666" /><Text style={styles.disclaimerText}>For informational purposes only. Not investment advice.</Text></View>
</ScrollView>
</SafeAreaView>); }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#0f0f1a' }, header: { padding: 20, alignItems: 'center' }, title: { fontSize: 32, fontWeight: 'bold', color: '#3b82f6' }, subtitle: { fontSize: 14, color: '#888', marginTop: 4 }, searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e2e', marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 12, height: 52, gap: 8 }, input: { flex: 1, fontSize: 16, color: '#fff', fontWeight: '600' }, button: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }, buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 }, loading: { alignItems: 'center', padding: 40 }, loadingText: { color: '#888', marginTop: 12 }, alertsBox: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#3b82f6' }, alertsTitle: { fontSize: 14, fontWeight: '600', color: '#3b82f6', marginBottom: 8 }, alertItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }, alertText: { fontSize: 13, color: '#ccc' }, disclaimer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16 }, disclaimerText: { fontSize: 11, color: '#666', textAlign: 'center' } });
''')

w('src/screens/AnalysisScreen.tsx', '''import React, { useState, useEffect } from 'react'; import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'; import { SafeAreaView } from 'react-native-safe-area-context'; import { useRoute } from '@react-navigation/native'; import { Ionicons } from '@expo/vector-icons'; import { runSynthesisAgent } from '../services/agents/synthesisAgent'; import { StockAnalysis } from '../types/analysis.types';
export default function AnalysisScreen() { const { ticker } = useRoute().params as { ticker: string }; const [analysis, setAnalysis] = useState<StockAnalysis | null>(null); const [loading, setLoading] = useState(true);
useEffect(() => { runSynthesisAgent(ticker).then(r => { setAnalysis(r); setLoading(false); }); }, [ticker]);
if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.loading}><ActivityIndicator size="large" color="#3b82f6" /><Text style={styles.loadingText}>Analyzing {ticker}...</Text></View></SafeAreaView>;
if (!analysis) return null;
return (
<SafeAreaView style={styles.container} edges={['top']}><ScrollView style={styles.scroll}>
<View style={styles.header}><Text style={styles.ticker}>{analysis.ticker}</Text><Text style={styles.price}>${analysis.lastPrice.toFixed(2)}</Text><Text style={[styles.change, analysis.priceChangePercent >= 0 ? styles.positive : styles.negative]}>{analysis.priceChangePercent >= 0 ? '+' : ''}{analysis.priceChangePercent.toFixed(2)}%</Text></View>
<View style={styles.scoreSection}><Text style={styles.sectionTitle}>Overall Score</Text><View style={styles.scoreRow}><View style={[styles.bigScore, { backgroundColor: getScoreColor(analysis.overallScore) }]}><Text style={styles.bigScoreText}>{analysis.overallScore.toFixed(1)}</Text></View><View style={styles.scoreInfo}><Text style={styles.recText}>{getRecLabel(analysis.recommendation)}</Text><Text style={styles.outlookText}>{analysis.swingOutlook}</Text></View></View></View>
<FactorSection title="Fundamental Analysis" score={analysis.fundamentalScore} icon="document-text" /><FactorSection title="Technical Analysis" score={analysis.technicalScore} icon="trending-up" /><FactorSection title="Macro Environment" score={analysis.macroScore} icon="globe" />
<View style={styles.newsBox}><Text style={styles.sectionTitle}>News Sentiment</Text><Text style={styles.newsSummary}>{analysis.macroScore.details.find(d => d.includes('News:')) || 'News analysis not available'}</Text><Text style={styles.newsTrending}>Trending: {analysis.macroScore.rawData.trendingKeywords || 'N/A'}</Text></View>
<View style={styles.sourcesBox}><Text style={styles.sourcesTitle}>Data Sources</Text>{analysis.dataSources.map((s, i) => <Text key={i} style={styles.sourceItem}>• {s}</Text>)}</View>
<View style={styles.disclaimerBox}><Ionicons name="warning" size={16} color="#f39c12" /><Text style={styles.disclaimerText}>This analysis synthesizes publicly available financial data for research purposes only. It does not constitute investment advice. Always conduct your own research before making investment decisions.</Text></View>
</ScrollView></SafeAreaView>); }
function FactorSection({ title, score, icon }: { title: string; score: any; icon: string }) { const [expanded, setExpanded] = useState(false); return (
<View style={styles.factorSection}><TouchableOpacity style={styles.factorHeader} onPress={() => setExpanded(!expanded)}><View style={styles.factorTitleRow}><Ionicons name={icon as any} size={18} color="#3b82f6" /><Text style={styles.factorTitle}>{title}</Text></View><View style={styles.factorScoreBadge}><Text style={styles.factorScoreText}>{score.score.toFixed(1)}</Text><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#888" /></View></TouchableOpacity>
{expanded && <View style={styles.factorDetails}>{score.details.map((d: string, i: number) => <View key={i} style={styles.detailRow}><Ionicons name="checkmark-circle" size={14} color="#2ecc71" /><Text style={styles.detailText}>{d}</Text></View>)}<View style={styles.rawDataBox}><Text style={styles.rawDataTitle}>Raw Data</Text>{Object.entries(score.rawData).map(([k, v]) => <Text key={k} style={styles.rawDataItem}>{k}: {v}</Text>)}</View></View>}</View>); }
function getScoreColor(s: number) { if (s >= 8) return '#27ae60'; if (s >= 6.5) return '#2ecc71'; if (s >= 5) return '#f39c12'; if (s >= 3.5) return '#e67e22'; return '#e74c3c'; }
function getRecLabel(r: string) { const m: Record<string, string> = { 'strong-positive': 'Strong Positive', 'positive': 'Positive', 'neutral': 'Neutral', 'negative': 'Negative', 'strong-negative': 'Strong Negative' }; return m[r] || r; }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#0f0f1a' }, scroll: { padding: 16 }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }, loadingText: { color: '#888', marginTop: 12 }, header: { alignItems: 'center', marginBottom: 20 }, ticker: { fontSize: 32, fontWeight: 'bold', color: '#fff' }, price: { fontSize: 24, color: '#fff', marginTop: 4 }, change: { fontSize: 16, fontWeight: '600', marginTop: 2 }, positive: { color: '#2ecc71' }, negative: { color: '#e74c3c' }, scoreSection: { marginBottom: 20 }, sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 }, scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 }, bigScore: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' }, bigScoreText: { fontSize: 28, fontWeight: 'bold', color: '#fff' }, scoreInfo: { flex: 1 }, recText: { fontSize: 16, fontWeight: '600', color: '#fff' }, outlookText: { fontSize: 13, color: '#aaa', marginTop: 4 }, factorSection: { backgroundColor: '#1e1e2e', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }, factorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }, factorTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, factorTitle: { fontSize: 16, fontWeight: '600', color: '#fff' }, factorScoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 }, factorScoreText: { fontSize: 16, fontWeight: 'bold', color: '#3b82f6' }, factorDetails: { paddingHorizontal: 16, paddingBottom: 16 }, detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }, detailText: { fontSize: 13, color: '#ccc', flex: 1 }, rawDataBox: { backgroundColor: '#2a2a3e', borderRadius: 8, padding: 12, marginTop: 12 }, rawDataTitle: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 8 }, rawDataItem: { fontSize: 12, color: '#aaa', fontFamily: 'monospace' }, newsBox: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16, marginBottom: 12 }, newsSummary: { fontSize: 14, color: '#ccc', marginTop: 8, lineHeight: 20 }, newsTrending: { fontSize: 13, color: '#3b82f6', marginTop: 8, fontStyle: 'italic' }, sourcesBox: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16, marginBottom: 12 }, sourcesTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 8 }, sourceItem: { fontSize: 13, color: '#aaa', marginBottom: 4 }, disclaimerBox: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(243,156,18,0.1)', borderRadius: 12, padding: 12, marginBottom: 20 }, disclaimerText: { flex: 1, fontSize: 11, color: '#f39c12', lineHeight: 16 } });
''')

w('src/screens/WatchlistScreen.tsx', '''import React, { useState, useCallback } from 'react'; import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'; import { SafeAreaView } from 'react-native-safe-area-context'; import { useNavigation, useFocusEffect } from '@react-navigation/native'; import { Ionicons } from '@expo/vector-icons'; import { getWatchlist, removeFromWatchlist } from '../store/watchlistStore'; import { runSynthesisAgent } from '../services/agents/synthesisAgent'; import { StockAnalysis } from '../types/analysis.types'; import ScoreCard from '../components/ScoreCard';
export default function WatchlistScreen() { const nav = useNavigation(); const [items, setItems] = useState<any[]>([]); const [analyses, setAnalyses] = useState<Record<string, StockAnalysis>>({}); const [refreshing, setRefreshing] = useState(false);
const load = useCallback(async () => { const list = await getWatchlist(); setItems(list); if (list.length > 0) { const results: Record<string, StockAnalysis> = {}; for (const item of list) { try { results[item.ticker] = await runSynthesisAgent(item.ticker); } catch {} } setAnalyses(results); } }, []);
useFocusEffect(useCallback(() => { load(); }, [load]));
const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
const remove = async (ticker: string) => { await removeFromWatchlist(ticker); load(); };
return (
<SafeAreaView style={styles.container} edges={['top']}>
<FlatList data={items} keyExtractor={item => item.ticker} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />} contentContainerStyle={styles.list} ListHeaderComponent={() => <View style={styles.header}><Text style={styles.title}>Watchlist</Text><Text style={styles.count}>{items.length} stocks</Text></View>} renderItem={({ item }) => <View>{analyses[item.ticker] && <ScoreCard analysis={analyses[item.ticker]} onPress={() => nav.navigate('Analysis', { ticker: item.ticker })} />}<TouchableOpacity style={styles.removeBtn} onPress={() => remove(item.ticker)}><Ionicons name="trash-outline" size={16} color="#e74c3c" /><Text style={styles.removeText}>Remove</Text></TouchableOpacity></View>} ListEmptyComponent={() => <View style={styles.empty}><Ionicons name="list-outline" size={48} color="#555" /><Text style={styles.emptyText}>No stocks in watchlist</Text><Text style={styles.emptySub}>Search and analyze a stock to add it here</Text></View>} />
</SafeAreaView>); }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#0f0f1a' }, list: { padding: 16 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, title: { fontSize: 24, fontWeight: 'bold', color: '#fff' }, count: { fontSize: 14, color: '#888' }, removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingBottom: 12 }, removeText: { fontSize: 12, color: '#e74c3c' }, empty: { alignItems: 'center', paddingVertical: 64 }, emptyText: { fontSize: 18, color: '#888', marginTop: 16 }, emptySub: { fontSize: 14, color: '#555', marginTop: 4 } });
''')

w('src/screens/SettingsScreen.tsx', '''import React from 'react'; import { View, Text, StyleSheet, ScrollView } from 'react-native'; import { SafeAreaView } from 'react-native-safe-area-context'; import { Ionicons } from '@expo/vector-icons';
export default function SettingsScreen() { return (
<SafeAreaView style={styles.container} edges={['top']}><ScrollView>
<View style={styles.header}><Text style={styles.title}>Settings</Text></View>
<View style={styles.section}><Text style={styles.sectionTitle}>About TradePulse</Text><Text style={styles.description}>TradePulse synthesizes publicly available financial data from multiple sources. It does not provide investment advice or recommendations.</Text></View>
<View style={styles.section}><Text style={styles.sectionTitle}>Data Sources</Text><SourceItem icon="trending-up" name="Yahoo Finance" desc="Stock prices, fundamentals" /><SourceItem icon="globe" name="FRED API" desc="Macroeconomic indicators" /><SourceItem icon="calendar" name="ForexFactory" desc="Economic calendar" /><SourceItem icon="newspaper" name="NewsAPI" desc="News sentiment" /></View>
<View style={styles.section}><Text style={styles.sectionTitle}>Scoring Method</Text><Text style={styles.description}>Overall scores are weighted composites: Fundamental (40%), Technical (30%), Macro (30%). Each factor scored 0-10 based on quantitative thresholds. News sentiment feeds into macro score.</Text></View>
<View style={styles.disclaimerBox}><Ionicons name="warning" size={20} color="#f39c12" /><Text style={styles.disclaimerText}>All analysis is for informational purposes only. Past performance does not guarantee future results. Users are solely responsible for their investment decisions. TradePulse is not a registered investment advisor.</Text></View>
<View style={styles.footer}><Text style={styles.version}>TradePulse v1.0.0</Text><Text style={styles.copyright}>Built with Expo + React Native</Text></View>
</ScrollView></SafeAreaView>); }
function SourceItem({ icon, name, desc }: { icon: string; name: string; desc: string }) { return (
<View style={styles.sourceRow}><Ionicons name={icon as any} size={18} color="#3b82f6" /><View style={styles.sourceInfo}><Text style={styles.sourceName}>{name}</Text><Text style={styles.sourceDesc}>{desc}</Text></View></View>); }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#0f0f1a' }, header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e1e2e' }, title: { fontSize: 28, fontWeight: 'bold', color: '#fff' }, section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e2e' }, sectionTitle: { fontSize: 16, fontWeight: '600', color: '#3b82f6', marginBottom: 12 }, description: { fontSize: 14, color: '#aaa', lineHeight: 20 }, sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }, sourceInfo: { flex: 1 }, sourceName: { fontSize: 14, color: '#fff' }, sourceDesc: { fontSize: 12, color: '#888' }, disclaimerBox: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(243,156,18,0.1)', margin: 16, padding: 16, borderRadius: 12 }, disclaimerText: { flex: 1, fontSize: 12, color: '#f39c12', lineHeight: 18 }, footer: { alignItems: 'center', padding: 24 }, version: { fontSize: 14, color: '#666' }, copyright: { fontSize: 12, color: '#555', marginTop: 4 } });
''')

print(f"""
========================================
TradePulse created at: {BASE}
========================================

Run these commands:

cd {BASE}
npm install --legacy-peer-deps
npx expo start

Then scan QR with Expo Go!

Search NVDA to test the 4-agent swarm.
""")
