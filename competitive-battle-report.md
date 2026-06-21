# AI App Builder Competitive Battle Report

**Compiled:** 2026-06-03
**Scope:** Base44, Lovable, Replit, Bolt.new, v0.dev
**Method:** Live homepage + pricing screenshots, web search, documentation analysis

---

## 1. BASE44

### Overview
Acquired by **Wix** in June 2025. Markets as "prompt-to-app" — natural language → working web app with backend, database, auth, and hosting baked in. Built for non-technical founders building internal tools, dashboards, and client portals.

### Pricing (from live pricing page)
| Plan | Price | Credits | Key Features |
|------|-------|---------|--------------|
| **Starter** | $0 | 25 messages/mo, 500 integration credits | All apps, AI chat, 5-day data retention, 10k chat tokens |
| **Pro** | $80/mo | 100,000 message credits, 200k integration credits | Basic security, custom domain, 15-day retention |
| **Elite** | $160/mo | 1,200 message credits, 50,000 integration credits | App store, built-in monetization, emails, users, API, permissions |
| **Enterprise** | Custom | Custom | Enterprise security, custom plugins, LLMs, storage, CRM |

**Note:** Message credit vs message credit discrepancy — $80 plan has 100,000 message credits while $160 plan has only 1,200. Likely a typo on their pricing page (100,000 vs 1,200 seems backwards — probably $160 gets 120,000).

### UI/UX Analysis (from live screenshot + docs)
- **Homepage:** Dark gradient, "A human language interface for software" headline, orange accents on CTAs
- **Dashboard:** "What would you build today?" — massive central prompt box dominates the screen
- **Top nav:** Apps, Integrations, Templates — clean, 3 items only
- **Builder workspace:** AI chat panel on **left**, live preview on **right**, top bar for code view
- **Category chips:** CRM, Personal Finance, Education, E-commerce — below prompt
- **Design language:** Modern, white space, approachable, uncluttered
- **Builder feel:** Action-oriented, no sidebar mystery icons

### Strengths
- ✓ Everything baked in (DB, auth, email, hosting) — zero external setup
- ✓ Extremely clean, approachable UI for non-technical users
- ✓ Wix acquisition = enterprise backing and resources
- ✓ Template marketplace for faster starts
- ✓ Integration ecosystem (500 credits on free plan)

### Weaknesses / Gaps
- ✗ **Limited to web apps only** — no mobile app generation
- ✗ **Design customization is limited** — prebuilt templates, not pixel-perfect control
- ✗ **No code export** — vendor lock-in, can't take your code elsewhere
- ✗ **No visual drag-and-drop editor** — purely prompt-based
- ✗ **Pricing page has errors** (100k vs 1.2k message credits) — unprofessional
- ✗ No real-time multiplayer collaboration
- ✗ Backend logic is constrained to what the AI generates
- ✗ No version control or Git integration
- ✗ No custom CSS injection in lower tiers

---

## 2. LOVABLE

### Overview
Formerly GPT Engineer. Full-stack AI development platform for building web apps via natural language. Known for gorgeous UI output using React + TypeScript + Tailwind + shadcn/ui. Acquired by Firebase? No — independent. Runs on GPT-5.2 and Gemini 3 Flash.

### Pricing (from live pricing page)
| Plan | Price | Credits | Key Features |
|------|-------|---------|--------------|
| **Free** | $0 | 5 daily credits (~30/mo) | Unlimited projects, community support, Lovable branding |
| **Pro** | $25/mo | 100 credits/mo | Everything in Free + priority support, custom domain, no branding |
| **Pro 200** | $50/mo | 200 credits/mo | Everything in Pro + GPT-5.2 access, code mode |
| **Business** | $100/mo | 400 credits/mo | Everything in Pro 200 + early access, higher rate limits |
| **Enterprise** | Custom | Custom | SSO, audit logs, custom integrations |

**Credit burn rate:** Simple button change = 0.5 credits. Auth setup = 1.2+ credits. Full landing page = 2+ credits. Heavy builders burn through fast.

### UI/UX Analysis (from docs + comparisons)
- **Homepage:** Light clean design, "Ideate. Generate. Iterate." headline, purple/pink gradient accents, chat window illustration, code mockup on right
- **Builder:** Chat-prompt interface + live preview side-by-side
- **Plan Mode:** Review AI's plan before code is written
- **Agent Mode:** Autonomous multi-step execution
- **Browser testing:** AI clicks through your app like a real user
- **Code Mode:** Direct code editing (Pro 200+)
- **GitHub sync:** Two-way sync pushes code to repo automatically

### Strengths
- ✓ **Best-in-class UI output** — polished, production-ready React apps out of the box
- ✓ **GitHub sync** — you own your code, can export anytime
- ✓ **Plan Mode + Agent Mode** — choose between review-first or autonomous
- ✓ **Browser testing** — AI actually tests your UI by clicking elements
- ✓ **One-click deploy** — to Lovable Cloud instantly
- ✓ **Supabase integration** — 1-click auth, DB, storage
- ✓ **Stripe integration** — 1-click payment setup
- ✓ **Community collaboration** — up to 20 workspace members on all plans

### Weaknesses / Gaps
- ✗ **React ONLY** — no Python, Go, Svelte, Vue. Every project is React+TS+Vite
- ✗ **Supabase dependency** — backend locked to Supabase, no custom DB
- ✗ **No mobile apps** — web only, no native mobile generation
- ✗ **Credits burn fast** — heavy users hit limits quickly, expensive to scale
- ✗ **Limited code editing** — Code Mode exists but not a full IDE
- ✗ **No visual drag-and-drop** — prompt-only, no canvas editor
- ✗ **No real-time multiplayer code editing** — collaboration is project-level, not live
- ✗ **No custom backend logic** — beyond what Supabase provides

---

## 3. REPLIT

### Overview
The OG browser-based IDE. 40M+ users. Full cloud IDE with AI Agent 3 built in. Language-agnostic (50+ languages). Not a no-code tool — it's a low-code IDE with AI assistance. For developers who want to see file trees, terminals, and deployment logs.

### Pricing (from search + docs)
| Plan | Price | Credits | Key Features |
|------|-------|---------|--------------|
| **Starter** | $0 | Limited Agent trial | 10 dev apps, public only, 1 vCPU, 2 GiB RAM |
| **Core** | $20/mo ($18 annual) | $20/mo usage credits | Full Agent, private apps, 4 vCPUs, 8 GiB RAM, deployments |
| **Pro** | $100/mo ($90 annual) | $100/mo pooled credits | Up to 15 builders, tiered pricing, priority support |
| **Enterprise** | Custom | Custom | SSO/SAML, SCIM, advanced privacy, dedicated support |

**CRITICAL:** Effort-based pricing = unpredictable. Credits cover Agent + hosting + DB + storage + transfer = shared pool. Users report $100-$300/mo bills on $25 plan. One prompt cost $20. No spending cap.

### UI/UX Analysis (from comparisons + docs)
- **Homepage:** Dark theme, code-focused, "Build software, collaboratively" — developer-centric
- **Dashboard:** "Hi [name], what do you want to make?" prompt + sidebar packed with features
- **Sidebar:** Create App, Import (GitHub, Figma, Lovable, Bolt), Apps quota, Deployments, Usage, Frameworks, Learn, Documentation
- **Workspace:** Full IDE — file tree, terminal, code editor, chat panel, deployment logs
- **Design Mode:** Visual interface creation (slides, prototypes)
- **Fast Mode:** Accelerated development workflows
- **Theme selector:** Quadratic, Nomad, Honey — personalization
- **Real-time collaboration:** Google Docs-style multiplayer editing

### Strengths
- ✓ **Full IDE** — file tree, terminal, syntax highlighting, autocomplete — complete control
- ✓ **50+ languages** — Python, JS, Go, C++, Java, etc. — most flexible stack
- ✓ **Built-in PostgreSQL** — no external DB setup needed
- ✓ **GitHub integration** — import and export code freely
- ✓ **Mobile apps** — React Native + Expo generation and deployment
- ✓ **Real-time collaboration** — multiplayer pair programming
- ✓ **One-click deploy** — replit.app subdomain, autoscale, reserved VMs
- ✓ **Design Mode** — visual interface creation for non-coders
- ✓ **Import from Figma/Lovable/Bolt** — design-to-code pipeline

### Weaknesses / Gaps
- ✗ **Effort-based pricing = unpredictable bills** — biggest pain point
- ✗ **Steep learning curve** — not for non-technical users
- ✗ **No spending cap** — surprise $300 bills on $25 plan
- ✗ **Credits run out fast** — $25 Core credits can vanish in 2-3 weeks of active building
- ✗ **Pricing model changes frequently** — checkpoint → effort-based → Agent 3 recalibration → Teams→Pro migration
- ✗ **No production compliance** — no SOC 2 on standard plans, VPC "coming soon"
- ✗ **Agent 3 autonomously over-engineers** — redesigned entire UI without being asked, cost $20
- ✗ **UI less polished** than Lovable/Base44 for frontend output

---

## 4. BOLT.NEW

### Overview
AI-powered web app builder. Framework agnostic — Next.js, Svelte, Vue, React. From StackBlade? No — from StackBlitz. AI chat + live preview + deploy. Database agnostic. Code export available.

### Pricing (from docs + comparisons — no live screenshot due to browser timeout)
| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | Basic prototyping, limited tokens |
| **Pro** | ~$20-30/mo | Full AI access, more tokens, deployments |
| **Team/Enterprise** | Custom | Collaboration, SSO, more resources |

**Note:** Exact pricing not captured — need to verify from bolt.new/pricing directly. Uses token-based billing similar to Lovable but less transparent than Replit's credit system.

### UI/UX Analysis (from docs)
- **Homepage:** Clean, modern, "Prompt, run, edit, and deploy full-stack web apps"
- **Builder:** AI chat interface + live preview + code editor side-by-side
- **Framework support:** Next.js, Svelte, Vue, React — user chooses
- **Database:** Database agnostic — user picks their own
- **Deployment:** One-click deploy to various platforms
- **Code export:** Full code access, can take it anywhere

### Strengths
- ✓ **Framework agnostic** — not locked to React like Lovable
- ✓ **Database agnostic** — choose your own DB
- ✓ **Code export** — full ownership, no vendor lock-in
- ✓ **Full-stack** — frontend + backend + DB in one flow
- ✓ **Deploy anywhere** — not locked to one hosting platform

### Weaknesses / Gaps
- ✗ **Newer player** — less mature than Replit/Lovable
- ✗ **Pricing not as transparent** — token-based, less clear than credit systems
- ✗ **UI output less polished** than Lovable's React+Tailwind output
- ✗ **No mobile app generation** — web focused
- ✗ **No visual editor** — prompt + code only
- ✗ **Smaller ecosystem** — fewer templates, integrations, community resources
- ✗ **Less enterprise features** — no SSO, audit logs, team management

---

## 5. V0 by Vercel

### Overview
Vercel's AI UI generator. React component focused. Generates shadcn/ui components from prompts. More of a UI/component builder than a full app builder.

### Pricing (from live pricing page)
| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | $5 included monthly credits, 7 message/day limit, v0 Blocks, RSC support |
| **Team** | $30/user/mo | Unlimited messages, custom blocks, organization features |
| **Business** | $100/user/mo | Everything in Team + advanced features |

### UI/UX Analysis (from live screenshot + docs)
- **Homepage:** Dark, minimal, "Generate UI with simple text prompts" — component focused
- **Builder:** Chat interface for generating React components
- **v0 Blocks:** Pre-built component blocks (forms, tables, cards, etc.)
- **shadcn integration:** Directly exports to shadcn/ui registry
- **RSC support:** React Server Components
- **Chat Mode:** Custom UI components via conversation
- **Deploy:** Direct to Vercel hosting

### Strengths
- ✓ **Vercel ecosystem integration** — deploy to Vercel instantly
- ✓ **shadcn/ui output** — high-quality component library
- ✓ **Component-level generation** — precise UI control
- ✓ **RSC support** — modern React patterns
- ✓ **Free tier is generous** — $5 credits + 7 msgs/day

### Weaknesses / Gaps
- ✗ **Component builder, NOT full app builder** — no backend, no DB, no auth
- ✗ **React only** — no other frameworks
- ✗ **No deployment pipeline** — generates code, you wire it up
- ✗ **No real app generation** — individual components only
- ✗ **Limited to UI** — no business logic, no data layer
- ✗ **Not a competitor** to full app builders — more of a design tool

---

## 📊 COMPETITIVE MATRIX

| Feature | Base44 | Lovable | Replit | Bolt.new | v0 |
|---------|--------|---------|--------|----------|-----|
| **Full-stack app gen** | ✅ | ✅ | ✅ | ✅ | ❌ (UI only) |
| **Mobile app support** | ❌ | ❌ | ✅ (React Native) | ❌ | ❌ |
| **Code ownership/export** | ❌ | ✅ (GitHub) | ✅ | ✅ | ✅ |
| **Framework flexibility** | ❌ | ❌ (React only) | ✅ (50+ langs) | ✅ | ❌ (React only) |
| **Visual drag-and-drop** | ❌ | ❌ | ✅ (Design Mode) | ❌ | ❌ |
| **Real-time collab** | ❌ | ❌ (project-level) | ✅ (IDE) | ❌ | ❌ |
| **Predictable pricing** | ✅ | ✅ (credit-based) | ❌ (effort-based) | ⚠️ (token-based) | ✅ |
| **Non-technical friendly** | ✅✅ | ✅✅ | ❌ | ✅ | ✅ |
| **Backend flexibility** | ❌ (baked-in) | ❌ (Supabase only) | ✅ | ✅ | ❌ |
| **Custom code editing** | ❌ | ⚠️ (Code Mode) | ✅ (full IDE) | ✅ | ✅ |
| **Vendor lock-in** | HIGH | LOW | LOW | LOW | LOW |
| **Enterprise ready** | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| **Template marketplace** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **AI testing** | ❌ | ✅ (browser) | ❌ | ❌ | ❌ |
| **Plan/Agent mode** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Free tier generous** | ✅ (25 msgs) | ⚠️ (5/day) | ⚠️ (10 apps) | ⚠️ | ✅ ($5+7/day) |

---

## 🎯 GAP ANALYSIS — WHERE TO COMPETE

### 🔴 Underserved Niches (BIG OPPORTUNITIES)

1. **Mobile App Generation** — Only Replit supports this. Base44, Lovable, Bolt.new, v0 = web only. React Native/Expo generation from prompts is a HUGE gap.

2. **Visual Canvas + Prompt Hybrid** — No one has a true drag-and-drop canvas + AI prompt hybrid. Lovable is prompt-only. Replit has Design Mode but it's slides/prototypes, not full app canvas. A visual builder where you can drag components AND prompt AI to fill them = differentiated.

3. **Predictable Pricing + No Surprises** — Replit's effort-based pricing is a PR disaster. Users fear bills. A simple, predictable credit/message model with NO hidden costs is a competitive advantage.

4. **Full Code Ownership + Easy Export** — Base44 has no code export. A platform where every app is a Git repo from day one = trust.

5. **Multi-Framework Support** — Lovable = React only. A platform supporting React, Vue, Svelte, Next.js = flexibility win.

6. **No-Code to Pro-Code Continuum** — Most platforms are either no-code (Base44) or pro-code (Replit). A platform that starts simple (prompts) but lets you graduate to full code editing = best of both worlds.

7. **Template Marketplace** — Base44 has this. Lovable, Replit, Bolt.new don't. A marketplace where users sell templates = network effect + revenue.

8. **AI-Powered Testing** — Lovable has browser testing. No one else does. AI that tests your app, finds bugs, suggests fixes = killer feature.

9. **On-Device Preview** — Most platforms show web preview only. A platform that generates QR codes for instant mobile testing (like Expo Go) = magic moment.

10. **One-Click App Store Publishing** — No platform does true one-click App Store/Play Store publishing. Replit has Expo but still requires manual store submission. Auto-generate store listings, screenshots, privacy policy = massive value.

---

## 🏆 COMPETITIVE POSITIONING RECOMMENDATION

### Our Platform: "BuildAny" (placeholder)
**Tagline:** "From idea to app store in one conversation"

### Positioning
- **Base44's ease + Lovable's polish + Replit's flexibility + Mobile support no one has**
- Start with a prompt like Base44, get polished output like Lovable, own your code like Replit, AND generate mobile apps

### Key Differentiators
1. ✅ **Mobile-first** — Generate React Native/Expo apps from prompts (not just web)
2. ✅ **Visual canvas + prompt hybrid** — Drag components AND prompt AI
3. ✅ **Predictable pricing** — Fixed credits, no surprise bills, transparent burn rate
4. ✅ **Git from day one** — Every app is a repo, own your code
5. ✅ **Multi-framework** — React, Vue, Svelte, Next.js
6. ✅ **Template marketplace** — Buy/sell app templates
7. ✅ **AI testing** — Auto-test your app, find bugs before users do
8. ✅ **One-click deploy** — Web (Vercel), iOS (App Store), Android (Play Store)
9. ✅ **Graduated complexity** — Starts simple, grows with you to full code editing

---

## 📋 RECOMMENDED PRICING (Our Platform)

| Tier | Price | Credits | Features |
|------|-------|---------|----------|
| **Starter** | $0 | 20 msgs/mo, 5 apps | Web apps only, community support, Lovable branding |
| **Builder** | $29/mo | 150 msgs/mo, unlimited apps | + Mobile apps, custom domain, GitHub sync, no branding |
| **Pro** | $79/mo | 400 msgs/mo | + Priority AI, template marketplace, AI testing, API access |
| **Team** | $49/user/mo | 300 msgs/user | + Team collab, RBAC, shared templates, SSO ready |
| **Enterprise** | Custom | Custom | + Dedicated infra, SLA, custom LLMs, white-label |

**Pricing strategy:** Undercut Lovable Pro ($25/100 msgs) and Base44 Pro ($80/mo) by offering more value per dollar. Position between Base44 (no-code) and Replit (pro-code) — accessible but powerful.

---

## 🚀 NEXT STEPS (Option A)

1. **Core Engine:** Prompt → Code generation (LLM integration)
2. **Preview System:** Live iframe preview of generated app
3. **Code Editor:** Monaco/CodeMirror for direct editing
4. **Mobile Generation:** React Native/Expo export from web app
5. **Deployment:** One-click deploy to Vercel (web) + EAS (mobile)
6. **Database:** Built-in SQLite/PostgreSQL or Supabase integration
7. **Auth:** Clerk/Supabase Auth integration
8. **Template Marketplace:** Browse, buy, sell templates
9. **AI Testing:** Automated UI testing with AI agent

---

*Report compiled from live screenshots, web research, and documentation analysis.*
