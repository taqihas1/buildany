# Stock Trading Analysis App - Agent Swarm Architecture

## Project: `TradePulse` (working name)

### Core Principle
**Research Intelligence, Not Investment Advice**
- No buy/sell recommendations
- No target prices
- No "will go up X%" predictions
- Just: scored analysis, pattern recognition, and factor synthesis

### Legal Position
- Tool for traders to organize research
- User makes all decisions
- Clear disclaimer: "For informational purposes only"
- No registration as investment advisor needed

---

## MVP Scope (Phase 1)

### Single Stock: NVDA
Why NVDA?
- High volatility = lots of signal for technical analysis
- Clear fundamental drivers (AI revenue, data center spend)
- Macro-sensitive (Fed policy, China tariffs, semiconductor cycles)
- Active news flow = good for sentiment testing
- Earnings every quarter = frequent analysis cycles

### 3-Agent Swarm (Free Sources)

```
┌─────────────────────────────────────────┐
│         ORCHESTRATOR AGENT            │
│     "Generate NVDA Analysis Report"   │
└────────────┬────────────────────────────┘
             │
    ┌────────┼────────┬─────────────────┐
    ▼        ▼        ▼                 │
┌───────┐┌───────┐┌────────────┐        │
│Fundam ││Technic││ Macro/Event │        │
│ental  ││  al   ││   Agent     │        │
│Agent  ││ Agent ││             │        │
│(Yahoo ││(Yahoo ││(ForexFact.  │        │
│Fin,   ││Fin +  ││ + FRED +    │        │
│FRED)  ││local  ││Treasury)    │        │
│       ││calc)  ││             │        │
└────┬──┘└────┬──┘└──────┬─────┘        │
     │        │          │              │
     └────────┴──────────┘              │
              │                          │
         ┌────┴────┐                     │
         │SYNTHESIS│                     │
         │  AGENT  │                     │
         │(scoring│                      │
         │engine) │                      │
         └────┬────┘                     │
              │                          │
         ┌────┴────┐                     │
         │  FINAL  │                     │
         │ REPORT  │                     │
         │(charts,│                     │
         │tables)  │                     │
         └─────────┘                     │
              │                          │
              ▼                          │
    ┌────────────────────┐               │
    │  Expo React Native │               │
    │    Mobile App      │               │
    │ (charts, scores)   │               │
    └────────────────────┘               │
```

---

## Data Sources (All Free)

### 1. Fundamental Agent
**Sources:**
- **Yahoo Finance API** (yfinance Python library)
  - Revenue, earnings, P/E, PEG, debt-to-equity
  - Quarterly earnings dates
  - Free, no rate limit for moderate use
- **SEC EDGAR API** (free)
  - 10-K, 10-Q filings
  - Revenue breakdown by segment
- **FRED API** (free)
  - Industry-level data (semiconductor shipments)

**What it calculates:**
- Revenue growth YoY and QoQ
- Earnings surprise % (actual vs estimate)
- P/E vs 5-year average
- Debt-to-equity trend
- Free cash flow margin
- **Score: 0-10** (growth + profitability + stability)

### 2. Technical Agent
**Sources:**
- **Yahoo Finance API** (daily/weekly price data)
- **Local calculation** (no external API needed for indicators)

**What it calculates:**
- SMA 20, 50, 200
- RSI (14-day)
- MACD
- Bollinger Bands (20, 2)
- Volume trend vs 20-day average
- Price position relative to SMAs
- **Score: 0-10** (trend strength + momentum + position)

**Free library:** `ta-lib` or pure JavaScript/TypeScript calculations

### 3. Macro/Event Agent
**Sources:**
- **ForexFactory** (scraping - free)
  - Economic calendar: CPI, jobs, GDP, FOMC
  - Impact ratings (red = high impact)
  - Previous / Forecast / Actual
- **FRED API** (free)
  - 10-Year Treasury yield
  - Yield curve (10Y - 2Y spread)
  - Real interest rates
- **Treasury.gov** (free)
  - Daily yield curve data
- **Fed website** (free)
  - FOMC statement text
  - Powell speech calendar

**What it calculates:**
- Days until next high-impact event
- Surprise magnitude of last event
- Yield curve status (normal / flat / inverted)
- Real rate trend (rising = bad for growth stocks)
- **Score: 0-10** (headwind/tailwind assessment)

---

## Scoring Engine

### Composite Score: 0-10

```
NVDA Analysis Scorecard
┌────────────────────────────────────────┐
│ OVERALL SCORE: 7.2 / 10               │
│                                        │
│ Fundamental     ████████░░  7.5/10   │
│ Technical       ████████░░░  7.0/10   │
│ Macro/Event     ███████░░░░  6.5/10   │
│ Sentiment       (Phase 2)             │
│                                        │
│ Last Updated: May 26, 2026 2:30 PM     │
│ Next Earnings: Aug 21, 2026 (est.)   │
│                                        │
│ [View Full Analysis]                  │
│ [View Charts]                          │
└────────────────────────────────────────┘
```

### Score Ranges
- **8.0-10**: Strong positive alignment across factors
- **6.0-8.0**: Moderate positive, some caution
- **4.0-6.0**: Mixed signals, elevated risk
- **2.0-4.0**: Negative alignment, headwinds
- **0.0-2.0**: Strong negative, avoid

### NOT Investment Advice
Below the score, explicit text:
> "This is a research synthesis score, not a recommendation to buy, sell, or hold any security. Past performance does not guarantee future results. Always conduct your own research."

---

## Swing Trade Focus

Since swing trades last weeks to months, the analysis weights:
- **Fundamental: 40%** (earnings trajectory matters most)
- **Technical: 30%** (entry/exit timing)
- **Macro/Event: 30%** (tailwinds/headwinds)

Daily/Intraday traders would flip this (technical = 50%), but for swing, fundamentals lead.

---

## The "Earnings Preview" Feature

**Trigger**: 7 days before NVDA earnings

**What the swarm does:**
1. Fundamental agent: "Q2 consensus: $28.5B revenue. Whisper: $29.2B. Historical beat rate: 75%"
2. Technical agent: "Price +12% last 30 days. Above all SMAs. RSI 68 (not overbought)"
3. Macro agent: "Fed dovish. 10Y at 4.3% (stable). No major events this week."
4. Synthesis: **"Earnings Preview Score: 7.8/10. Key risk: China export restrictions. Key catalyst: Blackwell ramp."**

**Output**: Full report with charts, not "buy before earnings"

---

## App Structure (Expo React Native)

```
AppNavigator
├── HomeScreen (scorecard view)
│   └── Overall score + factor breakdown
├── AnalysisScreen (full report)
│   ├── Fundamental tab
│   ├── Technical tab (charts)
│   └── Macro/Event tab
├── WatchlistScreen
│   └── Add/remove stocks, scores at-a-glance
├── CalendarScreen
│   └── Upcoming earnings + economic events
└── SettingsScreen
```

---

## Free API Limits & Workarounds

| Source | Free Limit | Workaround |
|--------|-----------|------------|
| Yahoo Finance | ~2000 requests/day | Cache data, update every 4 hours |
| FRED | 120 requests/min | Batch requests, store in local DB |
| NewsAPI | 100 requests/day | Use for major headlines only |
| ForexFactory | Scraping (no API) | Cache calendar daily at 6 AM |
| Alpha Vantage | 25 requests/day | Use for historical data only |

**Caching strategy:**
- Prices: Update every 15 minutes during market hours
- Fundamentals: Update daily after close
- Technicals: Recalculate on price update
- Macro calendar: Scrape once daily at 6 AM ET
- Earnings dates: Check weekly

---

## Next Steps

1. **Create Expo app skeleton** with navigation
2. **Build Fundamental Agent** (Yahoo Finance data fetch)
3. **Build Technical Agent** (local indicator calculations)
4. **Build Macro Agent** (ForexFactory + FRED)
5. **Build Synthesis Engine** (scoring logic)
6. **Build UI** (scorecard, charts, reports)
7. **Test with NVDA** for 2 weeks, validate scores against price action
8. **Expand to AMD, MU, WDC** (semiconductor/memory cluster)

---

## Files to Create

```
/src
  /agents
    fundamentalAgent.ts
    technicalAgent.ts
    macroAgent.ts
    synthesisAgent.ts
  /services
    yahooFinance.ts
    fredApi.ts
    forexFactory.ts
    technicalIndicators.ts
    scoringEngine.ts
  /screens
    HomeScreen.tsx
    AnalysisScreen.tsx
    WatchlistScreen.tsx
    CalendarScreen.tsx
  /components
    ScoreCard.tsx
    FactorBreakdown.tsx
    TechnicalChart.tsx
    EventCalendar.tsx
  /store
    stockCache.ts
    watchlistStore.ts
  /types
    analysis.types.ts
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Yahoo Finance blocks API | Fallback to Alpha Vantage free tier |
| ForexFactory blocks scraping | Cache aggressively, rotate user agents |
| Scores are wrong | Log all inputs, let user inspect raw data |
| App store rejection for finance | Clear disclaimers, no buy/sell language |
| Data stale | Show "Last updated" timestamp prominently |
| User blames app for losses | Terms of service: "Informational only" |

---

## Legal Disclaimer Template

```
TradePulse is a research tool that synthesizes publicly available 
financial data. It does not provide investment advice, recommendations, 
or personalized financial guidance. All analysis is for informational 
purposes only. Users are solely responsible for their investment 
decisions. Past performance is not indicative of future results.
```

---

**Ready to build?** I can start with the Expo app skeleton and Fundamental Agent right now. 🔥
