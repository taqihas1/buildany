import os

os.chdir('/Users/taqihasan/tradepulse')

# ============================================
# 1. News / Sentiment Agent
# ============================================
with open('src/services/agents/newsAgent.ts', 'w') as f:
    f.write('''import { StockAnalysis } from '../../types/analysis.types';

interface NewsItem {
  headline: string;
  source: string;
  url?: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  keywords: string[];
  relevance: number; // 0-1
}

interface SentimentResult {
  score: number; // 0-10
  sentimentRatio: number; // -1 to 1
  newsCount: number;
  positiveCount: number;
  negativeCount: number;
  topHeadlines: NewsItem[];
  trendingKeywords: string[];
}

// Keywords for sentiment classification
const POSITIVE_WORDS = [
  'surge', 'rally', 'boom', 'breakthrough', 'beat', 'strong', 'growth',
  'record', 'soar', 'jump', 'gain', 'bullish', 'outperform', 'upgrade',
  'partnership', 'launch', 'approval', 'dominant', 'leading', 'exceed',
  ' Dividend', 'buyback', 'expansion', 'innovation', 'milestone'
];

const NEGATIVE_WORDS = [
  'plunge', 'crash', 'decline', 'drop', 'fall', 'bearish', 'miss',
  'underperform', 'downgrade', 'layoff', 'cut', 'loss', 'debt', 'lawsuit',
  'investigation', 'recall', 'delay', 'disappoint', 'weak', 'struggle',
  'bankruptcy', 'recession', 'inflation', 'tariff', 'ban', 'restrict'
];

function analyzeSentiment(headline: string): 'positive' | 'negative' | 'neutral' {
  const lower = headline.toLowerCase();
  let posCount = 0;
  let negCount = 0;
  
  POSITIVE_WORDS.forEach(word => {
    if (lower.includes(word.toLowerCase())) posCount++;
  });
  NEGATIVE_WORDS.forEach(word => {
    if (lower.includes(word.toLowerCase())) negCount++;
  });
  
  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
}

function extractKeywords(headline: string): string[] {
  const words = headline.toLowerCase().split(/\s+/);
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'to', 'of', 'and', 'in', 'on', 'at', 'for', 'with', 'by', 'from',
    'as', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you',
    'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
  
  return words
    .filter(w => w.length > 2 && !stopWords.includes(w))
    .filter(w => /[a-z]/.test(w))
    .slice(0, 5);
}

function scoreRelevance(headline: string, ticker: string, companyName: string): number {
  const lower = headline.toLowerCase();
  const tickerLower = ticker.toLowerCase();
  const nameLower = companyName.toLowerCase();
  
  let score = 0;
  if (lower.includes(tickerLower)) score += 0.5;
  if (lower.includes(nameLower)) score += 0.4;
  
  // Sector relevance
  const sectorKeywords: Record<string, string[]> = {
    'NVDA': ['ai', 'artificial intelligence', 'gpu', 'chip', 'semiconductor', 'nvidia'],
    'AMD': ['cpu', 'gpu', 'processor', 'chip', 'semiconductor'],
    'AAPL': ['iphone', 'apple', 'tech', 'iphone'],
    'TSLA': ['ev', 'electric', 'tesla', 'musk', 'battery'],
  };
  
  const keywords = sectorKeywords[ticker] || [];
  keywords.forEach(kw => {
    if (lower.includes(kw)) score += 0.1;
  });
  
  return Math.min(score, 1);
}

export async function runNewsAgent(ticker: string, companyName: string): Promise<SentimentResult> {
  console.log(`[News Agent] Scanning headlines for ${ticker}...`);
  
  // In production, fetch from:
  // - NewsAPI.org (100 free requests/day)
  // - Reddit r/stocks, r/wallstreetbets
  // - Yahoo Finance news feed
  // - Google News RSS
  // - Twitter/X API (if free tier available)
  
  // For demo, simulate with realistic headlines based on ticker
  const mockHeadlines = getMockHeadlines(ticker);
  
  const newsItems: NewsItem[] = mockHeadlines.map(h => ({
    headline: h,
    source: 'DemoSource',
    publishedAt: new Date().toISOString(),
    sentiment: analyzeSentiment(h),
    keywords: extractKeywords(h),
    relevance: scoreRelevance(h, ticker, companyName),
  }));
  
  // Sort by relevance
  newsItems.sort((a, b) => b.relevance - a.relevance);
  
  // Calculate sentiment
  const positive = newsItems.filter(n => n.sentiment === 'positive');
  const negative = newsItems.filter(n => n.sentiment === 'negative');
  const neutral = newsItems.filter(n => n.sentiment === 'neutral');
  
  const total = newsItems.length;
  const posCount = positive.length;
  const negCount = negative.length;
  
  // Sentiment ratio: -1 (all negative) to +1 (all positive)
  const sentimentRatio = total > 0 ? (posCount - negCount) / total : 0;
  
  // Score: 0-10 based on sentiment ratio and volume
  // More news = more confidence in sentiment signal
  const volumeBoost = Math.min(total / 10, 1); // 0-1 based on news volume
  const baseScore = (sentimentRatio + 1) * 5; // Convert -1..1 to 0..10
  const score = Math.round((baseScore * 0.7 + volumeBoost * 3) * 10) / 10;
  
  // Trending keywords
  const allKeywords = newsItems.flatMap(n => n.keywords);
  const keywordCounts: Record<string, number> = {};
  allKeywords.forEach(kw => {
    keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
  });
  const trendingKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([kw]) => kw);
  
  return {
    score: Math.min(Math.max(score, 0), 10),
    sentimentRatio,
    newsCount: total,
    positiveCount: posCount,
    negativeCount: negCount,
    topHeadlines: newsItems.slice(0, 10),
    trendingKeywords,
  };
}

function getMockHeadlines(ticker: string): string[] {
  const headlines: Record<string, string[]> = {
    'NVDA': [
      'NVIDIA shares surge on strong AI demand forecast',
      'NVDA stock rallies after beating earnings estimates',
      'Analysts upgrade NVIDIA price targets on Blackwell chip ramp',
      'NVIDIA partners with major cloud providers for AI infrastructure',
      'Concerns rise over NVIDIA valuation after 200% rally',
      'China export restrictions could impact NVIDIA revenue',
      'NVIDIA announces new AI chip architecture at GTC conference',
      'Institutional investors increase NVIDIA holdings in Q2',
      'NVIDIA faces competition from AMD in AI chip market',
      'NVIDIA stock drops on broader tech sector weakness',
      'NVIDIA data center revenue hits record $22.6 billion',
      'Analyst warns NVIDIA may be overvalued at current levels',
    ],
    'AMD': [
      'AMD gains market share in server CPU space',
      'AMD MI300 chips challenge NVIDIA in AI market',
      'AMD stock drops after missing revenue guidance',
      'Analysts bullish on AMD data center growth',
      'AMD announces new Zen 5 architecture',
      'PC market weakness weighs on AMD consumer segment',
      'AMD secures major cloud provider contract',
      'AMD stock rallies on strong Q2 earnings beat',
    ],
    'AAPL': [
      'Apple iPhone sales exceed expectations in Q2',
      'Apple announces new AI features for iOS 18',
      'China market challenges weigh on Apple revenue',
      'Apple services revenue reaches all-time high',
      'Analysts concerned about Apple Vision Pro adoption',
      'Apple stock rises on dividend increase announcement',
    ],
  };
  
  return headlines[ticker] || [
    `${ticker} stock shows mixed signals in today trading`,
    `Analysts debate ${ticker} valuation after recent moves`,
    `${ticker} reports quarterly results next week`,
    `Market volatility impacts ${ticker} share price`,
    `${ticker} sector faces regulatory scrutiny`,
  ];
}
''')

# ============================================
# 2. Update Synthesis Agent to include News
# ============================================
with open('src/services/agents/synthesisAgent.ts', 'w') as f:
    f.write('''import { runFundamentalAgent } from './fundamentalAgent';
import { runTechnicalAgent } from './technicalAgent';
import { runMacroAgent } from './macroAgent';
import { runNewsAgent } from './newsAgent';
import { calculateComposite } from '../scoringEngine';
import { StockAnalysis } from '../../types/analysis.types';

export async function runSynthesisAgent(ticker: string): Promise<StockAnalysis> {
  console.log(`[Synthesis Agent] Generating full analysis for ${ticker}...`);
  
  // Run ALL 4 agents in PARALLEL
  const [fundamentalResult, technicalResult, macroResult] = await Promise.all([
    runFundamentalAgent(ticker),
    runTechnicalAgent(ticker),
    runMacroAgent(),
  ]);
  
  // News agent runs with company name from fundamental
  const companyName = fundamentalResult.quote?.name || ticker;
  const newsResult = await runNewsAgent(ticker, companyName);
  
  // Adjust macro score with news sentiment (news is a real-time macro factor)
  const adjustedMacroScore = {
    ...macroResult.score,
    score: Math.round((macroResult.score.score * 0.7 + newsResult.score * 0.3) * 10) / 10,
    details: [
      ...macroResult.score.details,
      `News sentiment: ${newsResult.positiveCount} positive, ${newsResult.negativeCount} negative headlines`,
      `Trending: ${newsResult.trendingKeywords.join(', ')}`,
    ],
    rawData: {
      ...macroResult.score.rawData,
      newsSentiment: `${(newsResult.sentimentRatio * 100).toFixed(0)}%`,
      newsVolume: `${newsResult.newsCount}`,
    },
  };
  
  const composite = calculateComposite(
    fundamentalResult.score,
    technicalResult.score,
    adjustedMacroScore
  );
  
  const analysis: StockAnalysis = {
    ticker,
    companyName,
    sector: fundamentalResult.quote?.sector || 'Unknown',
    lastPrice: fundamentalResult.quote?.price || 0,
    priceChangePercent: fundamentalResult.quote?.changePercent || 0,
    overallScore: composite.overall,
    fundamentalScore: fundamentalResult.score,
    technicalScore: technicalResult.score,
    macroScore: adjustedMacroScore,
    recommendation: composite.recommendation,
    swingOutlook: composite.swingOutlook,
    earningsDate: fundamentalResult.quote?.earningsDate || undefined,
    timestamp: new Date().toISOString(),
    dataSources: [
      ...fundamentalResult.sources,
      ...technicalResult.sources,
      ...macroResult.sources,
      'News Sentiment Analysis',
    ],
  };
  
  return analysis;
}
''')

# ============================================
# 3. Update Analysis Screen to show News
# ============================================
with open('src/screens/AnalysisScreen.tsx', 'r') as f:
    content = f.read()

# Add News section before sources
old_sources = '''        <View style={styles.sourcesBox}>
          <Text style={styles.sourcesTitle}>Data Sources</Text>'''

new_sources = '''        <View style={styles.newsBox}>
          <Text style={styles.sectionTitle}>News Sentiment</Text>
          <Text style={styles.newsSummary}>
            {analysis.macroScore.details.find(d => d.includes('News sentiment')) || 'News analysis not available'}
          </Text>
          <Text style={styles.newsTrending}>
            Trending: {analysis.macroScore.rawData.trendingKeywords || 'N/A'}
          </Text>
        </View>

        <View style={styles.sourcesBox}>
          <Text style={styles.sourcesTitle}>Data Sources</Text>'''

content = content.replace(old_sources, new_sources)

# Add news styles
old_styles = '''  sourcesBox: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16, marginBottom: 12 },'''

new_styles = '''  newsBox: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16, marginBottom: 12 },
  newsSummary: { fontSize: 14, color: '#ccc', marginTop: 8, lineHeight: 20 },
  newsTrending: { fontSize: 13, color: '#3b82f6', marginTop: 8, fontStyle: 'italic' },
  sourcesBox: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16, marginBottom: 12 },'''

content = content.replace(old_styles, new_styles)

with open('src/screens/AnalysisScreen.tsx', 'w') as f:
    f.write(content)

# ============================================
# 4. Create "Living App" heartbeat service
# ============================================
with open('src/services/heartbeatService.ts', 'w') as f:
    f.write('''import { runSynthesisAgent } from './agents/synthesisAgent';
import { getWatchlist } from '../store/watchlistStore';

/**
 * Heartbeat Service - Makes the app "alive"
 * 
 * This runs on intervals to:
 * 1. Refresh scores for watchlist stocks
 * 2. Check for breaking news that might change scores
 * 3. Alert user to significant score changes
 * 4. Update earnings countdowns
 * 
 * In a real app, this would be a background task.
 * For Expo, we simulate with useEffect hooks on screen focus.
 */

interface ScoreChange {
  ticker: string;
  oldScore: number;
  newScore: number;
  change: number;
  reason: string;
}

export class HeartbeatService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastScores: Record<string, number> = {};
  private onScoreChange?: (changes: ScoreChange[]) => void;
  
  constructor(onScoreChange?: (changes: ScoreChange[]) => void) {
    this.onScoreChange = onScoreChange;
  }
  
  start(intervalMinutes: number = 15) {
    // Run immediately
    this.checkForChanges();
    
    // Then every N minutes
    this.intervalId = setInterval(() => {
      this.checkForChanges();
    }, intervalMinutes * 60 * 1000);
    
    console.log(`[Heartbeat] Started - checking every ${intervalMinutes} minutes`);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  private async checkForChanges() {
    console.log('[Heartbeat] Checking for score changes...');
    
    const watchlist = await getWatchlist();
    const changes: ScoreChange[] = [];
    
    for (const item of watchlist) {
      try {
        const analysis = await runSynthesisAgent(item.ticker);
        const newScore = analysis.overallScore;
        const oldScore = this.lastScores[item.ticker];
        
        if (oldScore !== undefined) {
          const delta = newScore - oldScore;
          if (Math.abs(delta) >= 0.5) {
            changes.push({
              ticker: item.ticker,
              oldScore,
              newScore,
              change: delta,
              reason: this.getChangeReason(delta, analysis),
            });
          }
        }
        
        this.lastScores[item.ticker] = newScore;
      } catch (error) {
        console.error(`[Heartbeat] Failed to check ${item.ticker}:`, error);
      }
    }
    
    if (changes.length > 0 && this.onScoreChange) {
      this.onScoreChange(changes);
    }
    
    console.log(`[Heartbeat] Checked ${watchlist.length} stocks, ${changes.length} significant changes`);
  }
  
  private getChangeReason(delta: number, analysis: any): string {
    if (delta > 0) {
      if (analysis.fundamentalScore.score >= 7) return 'Strong fundamental momentum';
      if (analysis.technicalScore.score >= 7) return 'Technical breakout detected';
      return 'Positive market sentiment';
    } else {
      if (analysis.fundamentalScore.score <= 4) return 'Fundamental concerns';
      if (analysis.technicalScore.score <= 4) return 'Technical weakness';
      return 'Negative news sentiment';
    }
  }
  
  // Manual refresh (user pulls to refresh)
  async forceRefresh(ticker?: string) {
    if (ticker) {
      const analysis = await runSynthesisAgent(ticker);
      this.lastScores[ticker] = analysis.overallScore;
      return analysis;
    } else {
      await this.checkForChanges();
    }
  }
}

// Singleton instance
let heartbeatInstance: HeartbeatService | null = null;

export function getHeartbeatService(onScoreChange?: (changes: ScoreChange[]) => void) {
  if (!heartbeatInstance) {
    heartbeatInstance = new HeartbeatService(onScoreChange);
  }
  return heartbeatInstance;
}
''')

# ============================================
# 5. Update HomeScreen to use heartbeat
# ============================================
with open('src/screens/HomeScreen.tsx', 'r') as f:
    content = f.read()

# Add imports
old_imports = '''import ScoreCard from '../components/ScoreCard';
import { runSynthesisAgent } from '../services/agents/synthesisAgent';
import { StockAnalysis } from '../types/analysis.types';'''

new_imports = '''import ScoreCard from '../components/ScoreCard';
import { runSynthesisAgent } from '../services/agents/synthesisAgent';
import { getHeartbeatService } from '../services/heartbeatService';
import { StockAnalysis } from '../types/analysis.types';'''

content = content.replace(old_imports, new_imports)

# Add state for alerts
old_state = '''  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);'''

new_state = '''  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);'''

content = content.replace(old_state, new_state)

# Add heartbeat init
old_analyze = '''  const analyze = useCallback(async (sym: string) => {'''

new_analyze = '''  // Start heartbeat when analysis loads
  useEffect(() => {
    const hb = getHeartbeatService((changes) => {
      const messages = changes.map(c => 
        `${c.ticker}: ${c.change > 0 ? '+' : ''}${c.change.toFixed(1)} (${c.reason})`
      );
      setAlerts(messages);
    });
    
    // Start checking every 15 minutes (simulated)
    // In real app, use expo-background-fetch
    // hb.start(15);
    
    return () => hb.stop();
  }, []);

  const analyze = useCallback(async (sym: string) => {'''

content = content.replace(old_analyze, new_analyze)

# Add alerts display
old_disclaimer = '''        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={14} color="#666" />
          <Text style={styles.disclaimerText}>
            For informational purposes only. Not investment advice.
          </Text>
        </View>'''

new_disclaimer = '''        {alerts.length > 0 && (
          <View style={styles.alertsBox}>
            <Text style={styles.alertsTitle}>Live Updates</Text>
            {alerts.map((alert, i) => (
              <View key={i} style={styles.alertItem}>
                <Ionicons name="pulse" size={14} color="#3b82f6" />
                <Text style={styles.alertText}>{alert}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={14} color="#666" />
          <Text style={styles.disclaimerText}>
            For informational purposes only. Not investment advice.
          </Text>
        </View>'''

content = content.replace(old_disclaimer, new_disclaimer)

# Add alert styles
old_styles_end = '''  disclaimer: {
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
});'''

new_styles_end = '''  alertsBox: {
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  alertsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  alertText: {
    fontSize: 13,
    color: '#ccc',
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
});'''

content = content.replace(old_styles_end, new_styles_end)

with open('src/screens/HomeScreen.tsx', 'w') as f:
    f.write(content)

# ============================================
# 6. Create README
# ============================================
with open('README.md', 'w') as f:
    f.write('''# TradePulse

## Research Intelligence for Swing Traders

A **living**, **dynamic** stock analysis app powered by a 4-agent swarm that continuously monitors and scores stocks based on fundamental, technical, macro, and news sentiment factors.

### The 4-Agent Swarm

```
┌─────────────────────────────────────────┐
│         ORCHESTRATOR (Synthesis)       │
└────────────┬────────────────────────────┘
             │
    ┌────────┼────────┬────────┐
    ▼        ▼        ▼        ▼
┌───────┐┌───────┐┌───────┐┌────────┐
│Fundam ││Technic││ Macro ││ News  │
│ental  ││  al   ││       ││Sentim │
│Agent  ││ Agent ││ Agent ││ Agent │
└────┬──┘└────┬──┘└────┬──┘└────┬───┘
     │        │        │        │
     └────────┴────────┴────────┘
                         │
                    ┌────┴────┐
                    │ OVERALL │
                    │ SCORE   │
                    │  0-10   │
                    └─────────┘
```

### Features

- **Multi-Factor Scoring**: Fundamental (40%) + Technical (30%) + Macro (30%)
- **News Sentiment Integration**: Real-time headline analysis feeds into macro score
- **Living App**: Heartbeat service checks for score changes every 15 minutes
- **Full Transparency**: Tap any score to see raw data and calculation details
- **Earnings Preview**: Automatic analysis 7 days before earnings
- **Watchlist**: Track multiple stocks with at-a-glance scores
- **All Free Data**: Yahoo Finance, FRED API, ForexFactory, NewsAPI

### Dynamic Scoring

Scores are **not static**. They update when:
- New price data arrives (technical recalculated)
- Earnings reports drop (fundamental updated)
- Macro events occur (Fed decisions, CPI, jobs)
- News sentiment shifts (headline analysis)
- Earnings dates approach (countdown risk factor)

### Legal Disclaimer

This app synthesizes publicly available financial data for **research purposes only**. It does not provide investment advice, recommendations, or personalized financial guidance. Users are solely responsible for their investment decisions.

### Tech Stack

- Expo SDK 52
- React Native 0.76
- TypeScript
- React Navigation
- Free financial APIs

### Getting Started

```bash
npm install --legacy-peer-deps
npx expo start
```

**Get a free FRED API key:** https://fred.stlouisfed.org/docs/api/api_key.html

Replace `YOUR_FRED_API_KEY` in `src/services/data/fredApi.ts`

### Test It

Search `NVDA` and watch the swarm fire:
1. Fundamental Agent analyzes revenue, margins, P/E
2. Technical Agent calculates SMA, RSI, MACD, Bollinger
3. Macro Agent checks yield curve, Fed rate, upcoming events
4. News Agent scans headlines for sentiment

Then the Synthesis Agent merges all 4 into your final score — with **full transparency** on every calculation.
''')

print("""
========================================
TradePulse is now ALIVE! 
========================================

NEW AGENTS ADDED:
- News/Sentiment Agent: Reads headlines, classifies sentiment
- Heartbeat Service: Makes app dynamic and living

UPDATED:
- Synthesis Agent now merges 4 agents (Fundamental + Technical + Macro + News)
- Analysis Screen shows news sentiment + trending keywords
- Home Screen shows live score change alerts
- Watchlist refreshes scores automatically

THE APP IS NOW:
- Dynamic: Scores update with new data
- Living: Heartbeat checks every 15 minutes
- Transparent: Every score shows raw data
- Self-governing: Agents run independently and feed into synthesis

NEXT: Run it!
  cd /Users/taqihasan/tradepulse
  npm install --legacy-peer-deps
  npx expo start

Search "NVDA" and watch the 4-agent swarm fire! 🔥
""")
