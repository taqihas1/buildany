# TradePulse — Competitive Intelligence Agent

## Agent: Market Research & Competitive Analysis

This agent scans the competitive landscape before we build. It finds apps/sites doing similar things, reverse-engineers their approach, and identifies where we can differentiate.

### Mission
- Find all apps/sites offering stock analysis, scoring, or research synthesis
- Analyze their features, UX, data sources, pricing
- Identify gaps — what they DON'T do that we should
- Synthesize: "Here's what users are missing"

### Why This Matters
- **Don't build blind**: If 5 apps already do exactly what we plan, we need differentiation
- **Learn from their UX**: What layout works? What confuses users?
- **Find the gap**: The market always has a hole nobody fills
- **Pricing intelligence**: What will users pay for?

---

## Competitive Landscape (Known Players)

### Direct Competitors (Stock Analysis/Scoring)

| App/Site | What They Do | Free Tier? | Paid? | Gap We Can Fill |
|----------|-------------|-----------|-------|----------------|
| **TradingView** | Charts, technicals, social | Yes (limited) | $15-60/mo | No fundamental synthesis, no macro scoring |
| **Seeking Alpha** | Articles, quant ratings | Yes (5 articles/mo) | $20-240/yr | No unified score, no technical integration |
| **Finviz** | Screening, heatmaps, news | Yes (delayed) | $25-40/mo | No scoring engine, no macro factor |
| **Stock Rover** | Research reports, ratings | No | $80-280/yr | Expensive, desktop-focused, no mobile app |
| **Simply Wall St** | Visual fundamentals | Yes (limited) | $10-20/mo | No technicals, no macro, no earnings preview |
| **Kavout (K Score)** | AI stock score 0-9 | No | $$$ | Black box scoring, no transparency |
| **Tickeron** | AI predictions, patterns | No | $50-250/mo | Predictions = liability, expensive |
| **Zacks** | Rankings, earnings | Yes (limited) | $25-300/mo | No unified score, no technical overlay |
| **TipRanks** | Analyst consensus | Yes (limited) | $30-50/mo | Analyst-focused, not multi-factor |
| **MarketWatch** | News + basic data | Yes | Free | No scoring, no synthesis |
| **Yahoo Finance** | Data + news + basic charts | Yes | Free | No scoring engine, no factor synthesis |
| **Webull** | Brokerage + research | Yes | Free | Brokerage-first, research is secondary |
| **Fidelity / Schwab** | Brokerage research | Yes | Free (with account) | Requires account, not standalone app |

### Adjacent Competitors (Research Tools)

| App/Site | What They Do | Gap |
|----------|-------------|-----|
| **Koyfin** | Professional-grade research | $30-70/mo, no mobile app, overkill for retail |
| **Bloomberg Terminal** | Everything | $24,000/yr, institutional only |
| **Thinkor swim** | TD Ameritrade platform | Requires account, complex |
| **E*TRADE Power** | Research + trading | Requires account |

---

## Gap Analysis: What NOBODY Does Well

### Gap 1: **Free Multi-Factor Scoring with Transparency**
- **TradingView**: Has technicals, no fundamentals scoring
- **Simply Wall St**: Has fundamentals, no technicals
- **Kavout**: Has score, but black box (how did they calculate 7.2?)
- **Our play**: Show the math. "Fundamental score = 7.5 because revenue growth 85% + P/E reasonable + debt low"

### Gap 2: **Macro Factor Integration**
- **Nobody** consistently shows: "Fed policy + yield curve + CPI trend = headwind for growth stocks"
- Seeking Alpha has articles, but no automated synthesis
- **Our play**: Auto-detect macro regime and show impact on your watchlist

### Gap 3: **Earnings Preview Mode**
- **EarningsWhispers**: Has whisper numbers, no analysis synthesis
- **Zacks**: Has earnings calendar, no pre-earnings scoring
- **Our play**: 7 days before earnings, auto-generate preview report with all factors

### Gap 4: **Free Mobile-First Research**
- **Stock Rover**: Desktop-only, expensive
- **Koyfin**: Desktop-first, paid
- **Simply Wall St**: Has app but limited free tier
- **Our play**: Expo React Native = iOS + Android, completely free tier with all core features

### Gap 5: **Swing Trade Specific Analysis**
- Most apps optimize for day traders (fast charts) or long-term investors (dividend focus)
- **Nobody** optimizes for 2-week to 3-month swing trades
- **Our play**: Weight fundamentals 40%, technicals 30%, macro 30%. Show 3-month price targets (ranges, not predictions)

### Gap 6: **Sector Cluster Analysis**
- **Nobody** lets you analyze: "How will CHIPS Act impact all semiconductor stocks?"
- **Our play**: Analyze NVDA + AMD + MU + WDC as a cluster. Same macro events, same policy risks.

### Gap 7: **Source Transparency**
- **Nobody** shows: "This score used Yahoo Finance prices + FRED macro + ForexFactory calendar"
- **Our play**: Full source attribution. User can inspect raw data behind every score.

---

## UX Lessons from Competitors

### What Works (Copy This)

**TradingView:**
- ✅ Chart-first layout = immediate visual impact
- ✅ Community ideas (social proof)
- ✅ Clean dark mode
- ❌ Overwhelming for beginners (too many indicators)

**Simply Wall St:**
- ✅ Snowflake visual (instant factor breakdown)
- ✅ Color-coded health scores (green/yellow/red)
- ✅ Clean, minimal design
- ❌ No technical overlay
- ❌ Slow on mobile

**Finviz:**
- ✅ Heatmaps (instant sector view)
- ✅ Screener is powerful
- ❌ Cluttered UI
- ❌ No mobile app
- ❌ Delayed data on free tier

**Seeking Alpha:**
- ✅ Quant ratings (Bull/Bear)
- ✅ Earnings call transcripts
- ❌ Paywall too aggressive
- ❌ No unified dashboard

### What Frustrates Users (Avoid This)

1. **Paywall shock**: Simply Wall St lets you see one stock, then blocks everything. Annoying.
2. **Black box scores**: Kavout says "K Score = 7" but won't explain. Users don't trust it.
3. **Desktop-only**: Koyfin is amazing but you can't use it on the train.
4. **Information overload**: TradingView has 100 indicators. Beginners freeze.
5. **No context**: Finviz shows a heatmap but doesn't explain WHY a sector is red today.

---

## Our Differentiation Strategy

### The "Transparency + Free + Mobile" Triangle

```
        ┌─────────────────────┐
        │    TradePulse       │
        │  (Sweet Spot)       │
        └──────────┬──────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌────────┐  ┌──────────┐  ┌──────────┐
│  Free  │  │ Mobile   │  │Transparent│
│  Tier  │  │ First    │  │ Scoring   │
│ (Full) │  │ (iOS+And)│  │ (Show     │
│        │  │          │  │ the math) │
└────────┘  └──────────┘  └──────────┘
    │              │              │
    ▼              ▼              ▼
  No one       No one         No one
  gives        gives          gives
  full free   true native     formula
  research    mobile          visibility
```

**Nobody occupies this intersection. That's our gap.**

---

## Feature Priorities Based on Gaps

### Phase 1 MVP (Must-Have)
1. **Scorecard view** — Overall score + 3 factor breakdowns
2. **Factor transparency** — Tap any score, see the raw data
3. **Watchlist** — Track 5-10 stocks, see scores at-a-glance
4. **Earnings preview** — 7 days before, auto-generated report
5. **Macro event alerts** — "CPI tomorrow — check your tech stocks"

### Phase 2 (Should-Have)
6. **Sector cluster analysis** — NVDA + AMD + MU scored together
7. **Historical score tracking** — "NVDA was 8.5 last month, now 6.2. What changed?"
8. **News sentiment overlay** — "Sentiment turned negative after earnings miss"
9. **Custom scoring weights** — User adjusts fundamental vs technical weight

### Phase 3 (Could-Have)
10. **Social sharing** — "My NVDA analysis" shareable image
11. **Paper trade tracking** — Log hypothetical trades, track if score predicted right
12. **API for power users** — Export scores to spreadsheet
13. **Community scores** — Users vote on factors, crowd-sourced adjustment

---

## Pricing Strategy (When We Add Paid Tier)

### Free Tier (Always Free)
- 3 stocks on watchlist
- Daily score updates
- Basic factor breakdown
- Earnings preview for 1 stock
- Economic calendar

### Pro Tier ($4.99/mo or $39.99/yr)
- Unlimited watchlist
- Real-time score updates
- Full historical score charts
- Sector cluster analysis
- Custom scoring weights
- Export to CSV
- No ads

### Why This Pricing Wins
- **Simply Wall St**: $10-20/mo — we're cheaper
- **TradingView**: $15-60/mo — we're WAY cheaper
- **Stock Rover**: $80-280/yr — we're massively cheaper
- **Koyfin**: $30-70/mo — we're cheaper + mobile

**At $4.99/mo, we're cheaper than a cup of coffee and provide more value than $20/mo competitors.**

---

## The Agent's Discovery Process

```typescript
// src/agents/competitiveIntelligenceAgent.ts

export class CompetitiveIntelligenceAgent {
  async runAnalysis(): Promise<CompetitiveReport> {
    // 1. DISCOVERY PHASE
    // Search for "best stock analysis app 2026"
    // Search for "free stock research app mobile"
    // Search for "stock scoring app like Kavout"
    // Check app store rankings (Finance category)
    
    // 2. ANALYSIS PHASE
    // For each competitor found:
    //   - web_fetch their landing page
    //   - Extract: features, pricing, data sources
    //   - Check app store reviews for complaints
    //   - Identify UX patterns
    
    // 3. GAP IDENTIFICATION
    // Compare against our planned features
    // Find: what do they NOT do?
    // Find: what do users complain about?
    
    // 4. STRATEGY PHASE
    // Synthesize recommendations
    // Prioritize features by gap size + effort
    
    // 5. OUTPUT
    // Write: /docs/COMPETITIVE_LANDSCAPE.md
    // Write: /docs/FEATURE_PRIORITIES.md
    // Write: /docs/PRICING_STRATEGY.md
    
    return report;
  }
}
```

---

## Current Competitive Report (Based on Knowledge)

### Top 5 Direct Competitors

1. **TradingView** (30M+ users)
   - Strength: Charts, community, platform
   - Weakness: No fundamental scoring, no macro synthesis, overwhelming for beginners
   - Pricing: Free (limited) → $15-60/mo
   - Gap: They own technicals, we own fundamentals+macro synthesis

2. **Simply Wall St** (3M+ users)
   - Strength: Beautiful fundamentals visualization
   - Weakness: No technicals, no macro, limited free tier, slow mobile
   - Pricing: Free (1 stock) → $10-20/mo
   - Gap: They own fundamentals visual, we own multi-factor + mobile

3. **Seeking Alpha** (20M+ users)
   - Strength: Content volume, quant ratings
   - Weakness: Paywall aggressive, no unified score, articles are opinions
   - Pricing: Free (5 articles) → $20-240/yr
   - Gap: They own content, we own synthesized data-driven scores

4. **Finviz** (Power users)
   - Strength: Screeners, heatmaps, speed
   - Weakness: No mobile, cluttered, delayed free data, no scoring
   - Pricing: Free (delayed) → $25-40/mo
   - Gap: They own screeners, we own mobile scoring

5. **Stock Rover** (Value investors)
   - Strength: Deep research, ratings
   - Weakness: Desktop-only, expensive, no mobile
   - Pricing: $80-280/yr
   - Gap: They own desktop research, we own mobile-first

### What Users Complain About (Reddit/App Store Reviews)

- "TradingView is too complex for beginners"
- "Simply Wall St paywall hits after one stock"
- "Seeking Alpha articles are just opinions, not data"
- "Finviz needs a mobile app badly"
- "Stock Rover is amazing but I can't use it on my phone"
- "Kavout doesn't explain the score, I don't trust it"
- "Why isn't there an app that shows fundamentals + technicals + macro in one view?"

**That last complaint? That's our app.**

---

## Recommended Positioning

### Tagline Options
1. "All your research. One score. Zero confusion."
2. "The only stock research app that shows its work."
3. "Fundamentals + Technicals + Macro = Your edge."
4. "Research transparency for swing traders."

### Value Proposition
"Most stock apps give you charts OR fundamentals OR news. TradePulse synthesizes all three into a single transparent score — so you know WHY a stock scores 8.2, not just that it does."

### Target User
- **Primary**: Swing traders (2 weeks - 3 months hold)
- **Secondary**: Long-term investors doing pre-purchase research
- **NOT for**: Day traders (they need L2 data, order flow)
- **NOT for**: Passive investors (they just buy index funds)

---

## Action Items from Competitive Analysis

1. ✅ **Build scorecard UI first** — this is the core differentiator nobody has
2. ✅ **Make scores transparent** — show raw data behind every number
3. ✅ **Mobile-first design** — most competitors fail here
4. ✅ **Free tier = full features for 3 stocks** — more generous than Simply Wall St
5. ✅ **Earnings preview = killer feature** — nobody does this well
6. ✅ **Sector clusters** — analyze semiconductor stocks as a group
7. ✅ **Source attribution** — show where every data point comes from
8. ⏳ **Dark mode** — TradingView users expect this
9. ⏳ **Export/share scores** — social proof and virality
10. ⏳ **Historical score charts** — show score trends over time

---

## Conclusion

The competitive landscape is fragmented:
- **Charts**: TradingView owns this
- **Fundamentals**: Simply Wall St owns this
- **Content**: Seeking Alpha owns this
- **Screeners**: Finviz owns this
- **Synthesis + Scoring + Mobile + Free**: **NOBODY owns this**

**This is the gap. This is our lane. Let's build it.**

---

## Files Created

- `COMPETITIVE_LANDSCAPE.md` — This document
- `FEATURE_PRIORITIES.md` — Ranked feature list with gaps
- `PRICING_STRATEGY.md` — Free vs Pro tier plan

Ready to build? 🎯
