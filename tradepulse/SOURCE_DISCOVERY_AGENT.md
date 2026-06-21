# TradePulse — Source Discovery Agent

## Agent 0: Source Discovery & Validation Agent

This agent is the **foundation** of the entire swarm. Before Fundamental, Technical, or Macro agents can work, this agent finds and validates free data sources.

### Mission
- Continuously discover free financial data sources
- Test if they actually work (not just "listed as free")
- Document rate limits, coverage, reliability
- Maintain a scored directory
- Alert when a source breaks or changes limits

### Why This Matters
- **APIs die**: Yahoo Finance API was "free" for years, then blocked. Alpha Vantage went from 500/day to 25/day.
- **New APIs emerge**: Someone launches a better free source every 6 months
- **Rate limits change silently**: You hit a wall mid-day, app breaks
- **Data coverage gaps**: Some APIs have US stocks but not ETFs, or prices but not fundamentals

### Agent Workflow

```
Source Discovery Agent runs on schedule:

1. SEARCH PHASE (kimi_search + web_fetch)
   - Search: "free stock market API 2026"
   - Search: "free financial data API no rate limit"
   - Search: "Yahoo Finance API alternative free"
   - Search: "ForexFactory API scraping 2026"
   - Search: "free earnings calendar API"
   - Search: "free technical indicators API"

2. DISCOVERY PHASE
   - Scrape documentation pages
   - Extract: pricing tiers, rate limits, endpoints, data coverage
   - Check if "free tier" actually exists or is just a trial

3. VALIDATION PHASE
   - Make actual test requests to each API
   - Verify: does it return real data? Is it current? Is it accurate?
   - Time the response
   - Check CORS headers (critical for mobile apps)

4. SCORING PHASE
   - Score each source 0-100 on:
     * Cost (100 = completely free, no signup)
     * Rate Limit (100 = unlimited or very high)
     * Data Quality (100 = accurate, current, complete)
     * Reliability (100 = 99.9% uptime, no random blocks)
     * Coverage (100 = US stocks, ETFs, crypto, international)
     * Ease of Use (100 = simple REST, good docs, no auth complexity)

5. DIRECTORY OUTPUT
   - Write to: /src/data/sourceDirectory.json
   - Update: /docs/SOURCES.md (human-readable)
   - Alert: If a previously-good source drops below 60 score

```

---

## Source Directory Format

```json
{
  "lastUpdated": "2026-05-26T03:00:00Z",
  "sources": [
    {
      "id": "yahoo-finance-unofficial",
      "name": "Yahoo Finance (unofficial)",
      "url": "https://query1.finance.yahoo.com/v8/finance/chart/",
      "tier": "free",
      "cost": 0,
      "rateLimit": {
        "requestsPerDay": 2000,
        "requestsPerMinute": null,
        "notes": "No official API; web scraping. IP may be blocked if abusive."
      },
      "coverage": {
        "stocks": true,
        "etfs": true,
        "crypto": true,
        "international": true,
        "fundamentals": true,
        "technicals": false,
        "news": false
      },
      "scores": {
        "cost": 100,
        "rateLimit": 70,
        "dataQuality": 85,
        "reliability": 60,
        "coverage": 90,
        "easeOfUse": 80
      },
      "overallScore": 81,
      "status": "active",
      "lastTested": "2026-05-26T03:00:00Z",
      "testResults": {
        "responseTime": "120ms",
        "sampleRequest": "AAPL price: $189.45",
        "cors": true
      },
      "tags": ["prices", "fundamentals", "recommended"]
    },
    {
      "id": "fred-api",
      "name": "FRED (Federal Reserve Economic Data)",
      "url": "https://api.stlouisfed.org/fred/",
      "tier": "free",
      "cost": 0,
      "rateLimit": {
        "requestsPerMinute": 120,
        "notes": "Requires free API key from stlouisfed.org"
      },
      "coverage": {
        "macroIndicators": true,
        "treasuryYields": true,
        "economicCalendar": false,
        "stocks": false
      },
      "scores": {
        "cost": 100,
        "rateLimit": 90,
        "dataQuality": 95,
        "reliability": 95,
        "coverage": 40,
        "easeOfUse": 75
      },
      "overallScore": 83,
      "status": "active",
      "lastTested": "2026-05-26T03:00:00Z",
      "tags": ["macro", "bonds", "recommended"]
    },
    {
      "id": "forexfactory-scrape",
      "name": "ForexFactory (scraping)",
      "url": "https://www.forexfactory.com/calendar",
      "tier": "free",
      "cost": 0,
      "rateLimit": {
        "notes": "No API; HTML scraping. Use politely, cache aggressively."
      },
      "coverage": {
        "economicCalendar": true,
        "impactRatings": true,
        "historicalActual": true,
        "forecasts": true
      },
      "scores": {
        "cost": 100,
        "rateLimit": 50,
        "dataQuality": 90,
        "reliability": 50,
        "coverage": 70,
        "easeOfUse": 40
      },
      "overallScore": 67,
      "status": "active",
      "lastTested": "2026-05-26T03:00:00Z",
      "tags": ["calendar", "macro", "scraping"]
    }
  ],
  "byCategory": {
    "stockPrices": ["yahoo-finance-unofficial", "alpha-vantage"],
    "fundamentals": ["yahoo-finance-unofficial", "sec-edgar"],
    "technicals": ["yahoo-finance-unofficial"],
    "macroIndicators": ["fred-api", "treasurygov"],
    "economicCalendar": ["forexfactory-scrape", "tradingeconomics"],
    "earningsCalendar": ["earningswhispers", "finnhub-free"]
  }
}
```

---

## Agent Schedule

```
Frequency:
- Full scan: Weekly (Sundays at 6 AM)
- Quick validation: Daily (check top 5 sources still responding)
- On-demand: When another agent reports a source is broken

Triggers:
- cron job: weekly deep scan
- heartbeat: daily quick check
- manual: user says "find me a better source for X"
```

---

## Integration with Other Agents

```typescript
// Fundamental Agent asks:
const source = sourceDirectory.getBestSource('fundamentals');
// Returns: "yahoo-finance-unofficial" (score 81)

// Technical Agent asks:
const source = sourceDirectory.getBestSource('stockPrices');
// Returns: "yahoo-finance-unofficial" (score 81)

// Macro Agent asks:
const source = sourceDirectory.getBestSource('economicCalendar');
// Returns: "forexfactory-scrape" (score 67)

// If source breaks:
sourceDirectory.fallback('stockPrices');
// Returns: next best source ("alpha-vantage", score 72)
```

---

## Source Discovery Agent Output

After each run, the agent produces:

1. **Updated sourceDirectory.json** (machine-readable)
2. **SOURCES.md** (human-readable summary)
3. **CHANGELOG.md** (what changed since last scan)
4. **Alert** if any critical source dropped below usable threshold

---

## Example: Sources Currently Known

| Category | Best Free Source | Score | Notes |
|----------|-----------------|-------|-------|
| Stock Prices | Yahoo Finance (unofficial) | 81 | No key needed, but may block IPs |
| Fundamentals | Yahoo Finance + SEC EDGAR | 75 | Combined approach |
| Technicals | Local calculation + Yahoo prices | 85 | Calculate SMA/RSI locally, get prices from Yahoo |
| Macro Indicators | FRED API | 83 | Free key, reliable |
| Treasury Yields | Treasury.gov | 90 | No API needed, CSV download |
| Economic Calendar | ForexFactory scraping | 67 | Fragile, needs caching |
| Earnings Dates | EarningsWhispers scraper | 55 | Unreliable, often wrong |
| News Headlines | NewsAPI free tier | 60 | 100 requests/day, headlines only |
| Sentiment | Reddit API + Twitter/X | 45 | Complex, rate-limited |

---

## What the Agent Would Find If It Ran Right Now

Based on my knowledge, here's what a Source Discovery Agent would likely surface today:

**Stock Prices (Free):**
1. Yahoo Finance (unofficial endpoint) — free, no key, ~2000/day limit
2. Alpha Vantage — 25 requests/day free tier (very limited)
3. Finnhub — 60 requests/minute free tier (good!)
4. Polygon.io — 5 API calls/minute free tier
5. IEX Cloud — limited free tier

**Fundamentals (Free):**
1. Yahoo Finance (same endpoint) — has P/E, EPS, revenue
2. SEC EDGAR API — raw filings, requires parsing
3. Financial Modeling Prep — limited free tier

**Macro/Economic (Free):**
1. FRED API — 120 req/min, requires key, excellent
2. Treasury.gov — no API needed, download CSV
3. ForexFactory — scraping only
4. TradingEconomics — limited free tier

**News (Free):**
1. NewsAPI.org — 100 requests/day
2. GNews — limited free tier
3. Reddit API — 100 req/min for read access

---

## Agent Implementation

```typescript
// src/agents/sourceDiscoveryAgent.ts

export class SourceDiscoveryAgent {
  async runFullScan(): Promise<void> {
    // 1. Search for new sources
    const newSources = await this.searchForSources();
    
    // 2. Test existing sources
    const existingSources = await this.loadExistingDirectory();
    
    // 3. Validate all
    const validated = await Promise.all(
      [...existingSources, ...newSources].map(s => this.validateSource(s))
    );
    
    // 4. Score
    const scored = validated.map(s => this.scoreSource(s));
    
    // 5. Save
    await this.saveDirectory(scored);
    await this.generateReport(scored);
    
    // 6. Alert on changes
    const changes = this.detectChanges(existingSources, scored);
    if (changes.critical.length > 0) {
      await this.alertCritical(changes.critical);
    }
  }
  
  private async searchForSources(): Promise<SourceCandidate[]> {
    // Use kimi_search to find "free stock API 2026"
    // Use web_fetch to read docs
    // Extract endpoints, limits, coverage
  }
  
  private async validateSource(source: SourceCandidate): Promise<ValidatedSource> {
    // Make test request
    // Check response time
    // Verify data accuracy (known test case: AAPL price should be ~$180-200)
    // Check CORS
  }
  
  private scoreSource(source: ValidatedSource): ScoredSource {
    // Calculate 6 scores, weighted average
  }
}
```

---

## Why This Agent Is Critical

Without it:
- You build the app around Yahoo Finance
- 3 months later, they block your IP
- App breaks
- You scramble to find alternatives
- Users uninstall

With it:
- Agent detects Yahoo Finance reliability dropped to 40
- Automatically switches to Finnhub (score 78)
- Other agents use Finnhub seamlessly
- Zero downtime
- App keeps working

---

## My Recommendation

**Start with this agent FIRST.** Before building Fundamental, Technical, or Macro agents, let the Source Discovery Agent run and produce the sourceDirectory.json. Then build the other agents to consume that directory.

This is literally the foundation everything else stands on.

Want me to build this agent right now? It would:
1. Run a search for current free financial APIs
2. Test the top candidates
3. Produce sourceDirectory.json
4. Write SOURCES.md

Ready when you are! 🔥
