# MEMORY.md - Long-Term Memory

## Hermes Agent on VPS (Docker)

**Container:** `hermes-agent-cvaj-hermes-agent-1`
**Image:** `ghcr.io/hostinger/hvps-hermes-agent:latest`
**Port:** 32768 (VPS) → 4860 (container)
**Compose file:** `/docker/hermes-agent-cvaj/docker-compose.yml`
**Data volume:** `/docker/hermes-agent-cvaj/data` → `/opt/data` (container)
**Working dir (container):** `/opt/hermes`

### Accessing Hermes CLI in Container

```bash
# Enter container
docker exec -it hermes-agent-cvaj-hermes-agent-1 bash

# Inside container, run hermes
hermes --help
hermes chat -q "Hello"
```

### Adding Skills to Hermes

Skills are loaded from `~/.hermes/skills/` inside the container, or via `external_dirs` in config.

**Option 1: External dirs (recommended)**
Clone repos into the mounted data directory and add to config.

**Option 2: Direct copy**
Copy skills into the container's `~/.hermes/skills/` directory.

---

## UX & Design Principles

- **Always research the top apps in the space** before building. Study their features, flows, and visual design.
- **Customer-centric first.** Every feature must answer: "Does this benefit the user?"
- **Beautiful and visually appealing.** Apps should feel polished, not utilitarian.
- **Pleasant UX.** Smooth interactions, clear hierarchy, delightful micro-interactions.
- **Incorporate best practices** from popular apps in the same category.
- Before starting ANY app, do competitive research and study the market leaders.
- **Font preference:** Playfair Display for headings (h1, h2, h3, .font-display) + Geist Sans for body text. User explicitly likes this combination and wants it retained.

## GitHub

- **Always use SSH** for GitHub push/fetch (`git@github.com:...`)
- HTTPS remotes fail; SSH works with existing keys
- Verified working pattern for this user

# Hermes Agent on VPS

**Installed:** `/usr/local/lib/hermes-agent/` (from memory)
**Binary:** Likely at `/usr/local/bin/hermes` or `/usr/local/lib/hermes-agent/hermes`

## How to Access

SSH to your VPS and run:

```bash
# Check if hermes is in PATH
which hermes
# If not, check the install location:
ls -la /usr/local/bin/hermes 2>/dev/null || ls -la /usr/local/lib/hermes-agent/hermes 2>/dev/null || echo "Hermes not found"

# If found at /usr/local/bin/hermes, just run:
hermes --help
hermes chat -q "Hello"

# If not in PATH but exists at /usr/local/lib/hermes-agent/:
/usr/local/lib/hermes-agent/hermes --help
# OR add to PATH:
export PATH="/usr/local/bin:$PATH"
hermes --help
```

## Hermes CLI Basics

```bash
# Interactive session
hermes

# Single query
hermes chat -q "Your question here"

# With skills preloaded
hermes -s spec-driven-development -q "Write a spec for a new API"

# Check skills
hermes skills list 2>/dev/null || /usr/local/bin/hermes skills list

# Check config
hermes config get 2>/dev/null || cat ~/.hermes/config.yaml 2>/dev/null
```

## Check Hermes Status

```bash
# If running via PM2
pm2 list | grep hermes
pm2 logs hermes --lines 20

# If running as systemd
systemctl status hermes-agent 2>/dev/null || systemctl status hermes 2>/dev/null
```

## BuildAny Project (June 2026)

**Status:** Infrastructure setup in progress — SSL cert issued, domain configured

**What it is:** Browser-based prompt-to-app builder (like Base44, Lovable, Replit)
- Users prompt → AI generates full app (frontend + backend + database)
- Everything runs in browser, no local dev environment needed

**Tech stack being explored:**
- Expo SDK 54 + React Native for cross-platform builds
- Kimi API / DeepSeek API for AI generation
- GitHub Actions / Codemagic for CI/CD builds
- Hermes agent for subagent orchestration
- OpenClaw integration for workflow automation

**Next steps:**
- Wire SSL cert to web server (BuildAny app)
- Configure app to serve HTTPS on base66.cloud
- Connect builder backend to domain

## BuildAny App (Session June 5, 2026)

**Status: LIVE on https://base66.cloud** ✅

**What was built:**
- Next.js 15 + React app deployed on VPS (srv1730121, 2.25.170.135)
- Traefik reverse proxy with SSL (Let's Encrypt)
- Domain: base66.cloud + www.base66.cloud
- PM2 process manager running on port 3000
- **Hermes Agent Integration** (June 15, 2026) — new! ⚡

**Hermes Integration (June 15, 2026):**
- Hermes container: `hermes-agent-cvaj-hermes-agent-1` (Hostinger HVPS template)
- Config: `HERMES_HOME=/opt/data`, DeepSeek API configured (`deepseek-chat` model)
- **Skills:** 37 skills loaded from Addy Osmani + Superpowers repos (symlinked into `/opt/data/skills/`)
- **API Bridge:** `/api/hermes-chat` (POST, public, no auth) — calls `docker exec` to run Hermes
- **React Hook:** `useHermesChat` in `src/hooks/useHermesChat.ts` — manages chat state
- **Middleware:** `/api/hermes-chat` added to `PUBLIC_API_ROUTES` in `middleware.ts`
- **Tested:** `curl http://localhost:3000/api/hermes-chat` returns Hermes response ✅

**Skills Available:**
- `spec-driven-development` ✅ builtin
- `test-driven-development` ✅ builtin
- `systematic-debugging` ✅ builtin
- `planning-and-task-breakdown` ✅ builtin
- And 33 more... (see skills-user-guide.md)

**Test Command:**
```bash
curl -X POST http://localhost:3000/api/hermes-chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[], "query": "Hello!"}'
```

**CRITICAL ISSUE (2026-06-12):**
- HTTPS traffic to `base66.cloud` is NOT reaching the VPS
- Hostinger CDN/WAF is intercepting requests and serving stale responses from an old version of the app
- Projects created via browser are stored in the CDN backend's database, not the VPS database
- VPS has correct code (verified via localhost tests), but HTTPS never reaches it
- **Fix needed:** Disable CDN/WAF in Hostinger control panel or clear cache

**Infrastructure:**
| Component | Status |
|-----------|--------|
| Domain DNS | ✅ A record → 2.25.170.135 |
| SSL Cert | ✅ Let's Encrypt (expires 2026-09-03) |
| Traefik | ✅ Ports 80/443, auto HTTPS redirect |
| App Server | ✅ PM2 on port 3000 |
| Nginx | ❌ Not used (Traefik handles everything) |
| Hostinger CDN | 🚨 INTERCEPTING HTTPS (needs disable) |

**API Keys configured:**
| Key | Status |
|-----|--------|
| DEEPSEEK_API_KEY | ✅ Set in .env.local — `sk-69828b4ab62c4778850b1234480db1f9` (updated 2026-06-08) |
| CLERK_PUBLISHABLE_KEY | ✅ Set |
| CLERK_SECRET_KEY | ✅ Set |
| GITHUB_TOKEN | ⏳ Still needed for export feature |
| RESEND_API_KEY | ✅ Set (re_8a5SS6ZU_HqBGRzH3pirjAKrHSj1vynxf) — for email sending |

**Next Steps:**
- Build full app features (dashboard, prompt box, code generation)
- Add GitHub export with token
- Add mobile generation pipeline
- Add live preview component

---

## TradePulse App (Session May 26, 2026)

**Status:** Running on iPhone, visually upgraded Portfolio + News screens

**What works:**
- App loads via Expo Go (SDK 54, RN 0.81.5)
- Portfolio screen with sparkline mini-charts, pill badges, clean cards
- News screen with horizontal category filters, source attribution, clickable links
- GitHub repo: https://github.com/taqihas1/tradepulse (SSH push configured)

**User preference captured:**
- Always use SSH for GitHub push/fetch (never HTTPS)
- Beautiful, visually appealing apps with pleasant UX
- Research top apps in the space before building
- Customer-centric approach for all apps

**Next time:**
- Add real stock data API (Alpha Vantage, Finnhub, Polygon)
- Add search autocomplete with trending tickers
- Add analyst consensus scores
- Consider interactive charts (TradingView-style)
- Add push notifications for price alerts

---

## Expo / React Native Debugging

When building React Native apps with Expo, these 5 issues happen predictably. Created a skill (`expo-react-native-debug`) to catch them pre-flight:

1. **Expo SDK mismatch** — iOS Expo Go auto-updates. Always match project SDK to user's Expo Go.
2. **React version mismatch** — `react` MUST match `react-native-renderer` exactly (e.g. both 19.1.0).
3. **npm ERESOLVE** — Always use `--legacy-peer-deps` for Expo projects.
4. **Metro cache** — Always use `--clear` after SDK changes.
5. **ngrok tunnel** — Can go stale. Verify with `curl` before giving QR to user.

**NEW (2026-05-15):**
6. **Silent Metro bundler failures** — When Expo Go shows "timeout", the bundler is usually failing, not the network. Always `curl http://localhost:PORT` to see actual Metro errors.
7. **Missing peer dependencies** — `@trpc/react-query` requires `@trpc/server` even for client-only use. Metro won't warn about this — it'll just fail.
8. **Circular imports with path aliases** — `lib/fridge.tsx` importing `@/lib/fridge` resolves to itself. Always use relative imports (`./fridge`) within the same directory.
9. **Path alias mismatches** — `@/constants/theme` won't find `lib/constants/theme.ts`. Path aliases in tsconfig must map to actual file locations.
10. **First bundle build time** — With `--clear`, initial Metro build can take 2+ minutes. Warn users to be patient on first connect.

Skill location: `skills/expo-react-native-debug/`
Pre-flight script: `node scripts/expo-preflight.js <project-dir>`

## User's Communication Style

Extremely concise and imperative. Sends screenshots of errors directly (very efficient). Knows React Native basics. Wants automated solutions — asked for a skill to prevent issues next time.

## Technical Preferences

Pragmatic tool-stack assembler who values inspectable, downloadable artifacts. Preference for modular, composable systems. Favors mid-size efficient models over frontier-scale options.

## Active Projects

- Dealership App (React Native + Expo SDK 54) — now at https://github.com/taqihas1/Carbuyingassistant with CI/CD
- RecipeWise App — now at https://github.com/taqihas1/RecipeWise with CI/CD
- EAS CI/CD Pipeline Skill — https://github.com/taqihas1/expo-eas-cicd-pipeline (reusable for all Expo projects)
- RFP Automation System — web form → JSON → markdown → RFP pipeline
- SharePoint-hosted knowledge base of markdown files

## GitHub / CI/CD Setup — Self-Healing Pipeline v1.0

**GitHub Account:** taqihas1
**Token:** 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 (classic PAT with repo scope)
**Expo Account:** aitrader (taqihas@gmail.com)
**Expo Token:** 0yfrtboRI6NmEJ_Gdk3-NZ7KSAnKdAkNEEbe6eJI (for GitHub Actions)

**Repos:**
- `taqihas1/RecipeWise` — Recipe app with self-healing EAS Build workflow ✓
- `taqihas1/Carbuyingassistant` — Dealership app with self-healing EAS Build workflow ✓
- `taqihas1/expo-eas-cicd-pipeline` — Reusable CI/CD skill/template ✓
- `taqihas1/car-care-assistant` — Reserved for future project

**Self-Healing Pipeline Flow:**
```
Push Code → GitHub Actions → EAS Build → Success? → Done!
                                    ↓ Failure
                              Auto-Retry (4x)
                                    ↓ Still fails
                              Create GitHub Issue
                              + Email notification
                                    ↓
                              You see error
                              → Share with AI (me)
                              → AI fixes & pushes
                              → CI auto-retriggers
```

**Pipeline features:**
1. **Auto-retry:** Up to 4 attempts per build with exponential backoff
2. **Auto-issues:** GitHub Issue created on failure with full context (logs, commit, links)
3. **Email notifications:** GitHub emails you when issues created + Actions fail
4. **Human-in-the-loop:** You share error → I fix → Push → CI retriggers automatically
5. **Build profiles:** Preview (APK+QR), Production (AAB for Play Store, IPA for App Store)

**Required GitHub Secret per repo:** `EXPO_TOKEN` (same token works for all repos)

**How to add EXPO_TOKEN:**
1. Go to https://expo.dev/accounts/[your-username]/settings/access-tokens
2. Click "Create Token" → name it `github-actions`
3. Copy token (shown only once)
4. GitHub repo → Settings → Secrets → New repository secret → Name: `EXPO_TOKEN`

**Verified working:**
- Token added to RecipeWise ✓
- Token added to Carbuyingassistant ✓
- Token authenticates as aitrader ✓

**Lessons learned:**
- GitHub push protection blocks commits with secrets — use env vars or empty strings for API keys
- `git filter-branch` or fresh commits needed if secrets slip into history
- Always add `.github/workflows/eas-build.yml` + `eas.json` with preview/production profiles
- Use `nick-fields/retry@v3` for auto-retry in GitHub Actions
- Use `actions/github-script@v7` for auto-creating issues on failure


---

## Hermes Gateway (Nous Research) — Discovered 2026-06-20

**Container:** `hermes-gateway`
**Image:** `nousresearch/hermes-agent:latest`
**Port:** 8642 (host) → 8642 (container)
**Data dir:** `/root/.hermes` (mounted to `/opt/data` in container)
**Started via:** `docker run` (no compose file)

### API Access
- **URL:** `http://127.0.0.1:8642/v1/chat/completions`
- **API Key:** Read from `/root/.hermes/.env` → `API_SERVER_KEY`
- **Current key:** `820a8890e58dfd3dadd4166cb2be9b8c4db1afce6514110039374ea1da7b84cc`
- **Model:** `deepseek-chat`

### BuildAny Integration
`.env.local` must have:
```
HERMES_URL=http://127.0.0.1:8642/v1/chat/completions
HERMES_API_KEY=820a8890e58dfd3dadd4166cb2be9b8c4db1afce6514110039374ea1da7b84cc
HERMES_MODEL=deepseek-chat
```

⚠️ **Do NOT use `buildany-bridge-secret`** — the gateway validates against `API_SERVER_KEY` from `/root/.hermes/.env`

### Test Command
```bash
curl -s http://127.0.0.1:8642/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 820a8890e58dfd3dadd4166cb2be9b8c4db1afce6514110039374ea1da7b84cc" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"Hello"}]}'
```

### Two Hermes Containers (Know Which One!)

| Container | Image | Port | Status | Notes |
|-----------|-------|------|--------|-------|
| `hermes-gateway` | `nousresearch/hermes-agent:latest` | **8642** | ✅ ACTIVE | This is the one BuildAny uses |
| `hermes-agent-cvaj-hermes-agent-1` | `ghcr.io/hostinger/hvps-hermes-agent:latest` | 32777 | Legacy | Old Hostinger template, NOT used |

**Data volume:** `/root/.hermes` (on host) → `/opt/data` (in container)

### Key Files

```
/root/.hermes/.env              ← API_SERVER_KEY lives here
/root/.hermes/config.yaml       ← Hermes config (skills, models, etc.)
/root/.hermes/auth.json         ← Provider credentials (DeepSeek)
/root/.hermes/gateway_state.json ← Gateway running state
```

### How to Verify Hermes is Working

```bash
# Direct test to Hermes gateway
curl -s http://127.0.0.1:8642/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(grep API_SERVER_KEY /root/.hermes/.env | cut -d= -f2)" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"Hello"}]}'

# Check gateway logs
tail -20 /root/.hermes/logs/gateway.log

# Check container status
docker ps | grep hermes-gateway
```

### 400 Bad Request Fix (2026-06-20)

The frontend hook (`useHermesChat.ts`) and API route (`hermes-chat/route.ts`) spoke different formats. Fixed by making the API accept BOTH:

- `message` OR `query` (user message)
- `history` OR `messages` (chat history)
- Returns BOTH `reply` AND `response` (so either frontend format works)

### If Hermes Breaks Again

1. Check the API key hasn't changed: `cat /root/.hermes/.env | grep API_SERVER_KEY`
2. Check gateway is running: `docker ps | grep hermes-gateway`
3. Check gateway logs: `tail -30 /root/.hermes/logs/gateway.log`
4. Test direct: `curl` command above
5. Check BuildAny `.env.local` has the right key
6. Rebuild: `cd /root/buildany && npm run build && pm2 restart buildany`

### Important Commands

```bash
# Restart Hermes gateway
docker restart hermes-gateway

# Rebuild BuildAny
cd /root/buildany && npm run build && pm2 restart buildany

# Check all running containers
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"

# Check PM2 status
pm2 list
```

---

# BuildAny Infrastructure Master Doc (2026-06-20)

## VPS Details

| Property | Value |
|----------|-------|
| **Host** | `srv1730121.hstgr.cloud` |
| **IP** | `2.25.170.135` |
| **Domain** | `base66.cloud` + `www.base66.cloud` |
| **SSL** | Let's Encrypt (expires 2026-09-03) |
| **Reverse Proxy** | Traefik (ports 80/443) |
| **App Port** | 3000 (PM2) |

---

## BuildAny App

**Location:** `/root/buildany/`
**Framework:** Next.js 16.2.7 + React + Turbopack
**Process Manager:** PM2 (`buildany` process)
**Database:** SQLite (Drizzle ORM)
**Auth:** Clerk (dev keys currently)

### Environment Variables (`.env.local`)

```bash
HERMES_URL=http://127.0.0.1:8642/v1/chat/completions
HERMES_API_KEY=820a8890e58dfd3dadd4166cb2be9b8c4db1afce6514110039374ea1da7b84cc
HERMES_MODEL=deepseek-chat
DEEPSEEK_API_KEY=sk-69828b4ab62c4778850b1234480db1f9
CLERK_PUBLISHABLE_KEY=<set>
CLERK_SECRET_KEY=<set>
RESEND_API_KEY=re_8a5SS6ZU_HqBGRzH3pirjAKrHSj1vynxf
```

### Build & Deploy

```bash
cd /root/buildany && npm run build && pm2 restart buildany
```

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/hermes-chat` | Kelly chat interface |
| `/api/hermes` | Hermes proxy |
| `/api/hermes-tool` | Hermes tool calling |
| `/api/project/[id]/chat` | Project-specific chat |
| `/api/project/[id]/research` | Market research |
| `/api/project/[id]/wiki` | Wiki generation |
| `/api/project/[id]/review` | Code review |
| `/api/project/[id]/workflow` | Workflow orchestration |

---

## Hermes Gateway (AI Backend)

**Container:** `hermes-gateway`
**Image:** `nousresearch/hermes-agent:latest`
**Port:** `8642` (host ↔ container)
**Data:** `/root/.hermes` → `/opt/data`
**Started:** `docker run` (no compose)

### Key Config Files

```
/root/.hermes/.env              ← API_SERVER_KEY, DEEPSEEK_API_KEY
/root/.hermes/config.yaml       ← Main config (skills, models, providers)
/root/.hermes/auth.json         ← Provider credentials
/root/.hermes/gateway_state.json ← Runtime state
/root/.hermes/logs/gateway.log  ← Gateway logs
```

### Hermes `.env` Contents

```bash
DEEPSEEK_API_KEY=sk-69828b4ab62c4778850b1234480db1f9
API_SERVER_ENABLED=true
API_SERVER_HOST=0.0.0.0
API_SERVER_PORT=8642
API_SERVER_KEY=820a8890e58dfd3dadd4166cb2be9b8c4db1afce6514110039374ea1da7b84cc
GATEWAY_ALLOW_ALL_USERS=true
```

### Skills Available (in `/root/.hermes/skills/`)

From Addy Osmani repo:
- `spec-driven-development`
- `test-driven-development`
- `systematic-debugging`
- `planning-and-task-breakdown`
- `browser-testing-with-devtools`
- `code-review-and-quality`
- And 30+ more...

From Superpowers repo:
- `api-and-interface-design`
- `brainstorming`
- `campaign-plan`
- And more...

### Test Hermes

```bash
curl -s http://127.0.0.1:8642/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 820a8890e58dfd3dadd4166cb2be9b8c4db1afce6514110039374ea1da7b84cc" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"Hello"}]}'
```

### Hermes Commands

```bash
# Restart gateway
docker restart hermes-gateway

# Check logs
tail -50 /root/.hermes/logs/gateway.log

# Enter container
docker exec -it hermes-gateway bash

# Inside container, run hermes CLI
hermes --help
hermes chat -q "Hello"
hermes skills list
```

---

## Docker Containers

```bash
# All containers
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"

# Current state:
# hermes-gateway        nousresearch/hermes-agent:latest    0.0.0.0:8642->8642/tcp     Up 2 days
# hermes-agent-cvaj...  ghcr.io/hostinger/hvps-hermes...    0.0.0.0:32777->4860/tcp   Up 46 hours (LEGACY)
```

---

## PM2 Process

```bash
# Check status
pm2 list

# Restart
pm2 restart buildany

# View logs
pm2 logs buildany --lines 50

# Save PM2 config
pm2 save
```

---

## Troubleshooting Checklist

### Kelly Not Responding in Chat

1. **Check Hermes container:** `docker ps | grep hermes-gateway`
2. **Check API key:** `cat /root/.hermes/.env | grep API_SERVER_KEY`
3. **Test direct:** `curl` test command above
4. **Check BuildAny env:** `cat /root/buildany/.env.local | grep HERMES`
5. **Check gateway logs:** `tail -30 /root/.hermes/logs/gateway.log`
6. **Rebuild & restart:** `cd /root/buildany && npm run build && pm2 restart buildany`

### 400 Bad Request

- Frontend sends: `{ query, messages, skills }`
- API accepts: `{ message OR query, history OR messages, skills }`
- Returns: `{ reply, response, raw }`

### 502 Bad Gateway

- Hermes container is down
- Wrong port (should be 8642)
- Wrong API key

---

## GitHub

**Account:** taqihas1
**Token:** `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` (classic PAT, repo scope)
**Expo Account:** aitrader (taqihas@gmail.com)
**Expo Token:** `0yfrtboRI6NmEJ_Gdk3-NZ7KSAnKdAkNEEbe6eJI`

---

## DeepSeek API

**Key:** `sk-69828b4ab62c4778850b1234480db1f9`
**Base URL:** `https://api.deepseek.com/v1`
**Model:** `deepseek-chat`

---

## OpenManus (Morgan) — June 21, 2026

**Installed:** ✅ `/root/OpenManus` (Archive repo from `mannaandpoem/OpenManus_Archive`)
**Venv:** ✅ `/root/OpenManus/.venv` (standard Python venv, all packages installed)
**Config:** ✅ `/root/OpenManus/config/config.toml` (DeepSeek: `deepseek-chat`)
**DeepSeek Key:** `sk-69828b4ab62c4778850b1234480db1f9`
**Import Test:** `Morgan ok` ✅

### Task Templates (in `/root/OpenManus/tasks/`)
- `security-audit.md` — Security vulnerability scan
- `code-cleanup.md` — Remove dead code, console.logs
- `dependency-audit.md` — npm audit + outdated check
- `test-generation.md` — Unit test templates
- `performance-audit.md` — Find bottlenecks

### System Prompt
`/root/OpenManus/MORGAN_SYSTEM.md` — Ponytail rules, BuildAny context, safety guarantees

### How to Run
```bash
cd /root/OpenManus && .venv/bin/python3 run_mcp.py --task tasks/security-audit.md
```

**Important:** Always use `.venv/bin/python3` NOT system `python3`.

---


---

## To Do List

1. **2026-06-21: ✅ COMPLETE** — Use Hermes for code review of BuildAny app. **28 issues found!** Full report saved to `buildany-code-review.md`.
2. **2026-06-21: ✅ COMPLETE** — Fix Kelly (Hermes) chat panel in BuildAny app. Fixed: message duplication race condition, non-JSON error handling, AbortController support, input UX.
3. **2026-06-21 (NEXT PRIORITY):** Fix the critical/high issues identified in Kelly's code review — top 5: AbortController, tool result feedback, setState side-effect, DB persistence (localStorage→DB), boolean precedence bug.

## How to Talk to Kelly (Hermes Agent)

**You have 4 ways to talk to Kelly:**

### 1. BuildAny Chat Panel (just fixed!) 🎯
- Go to any project on https://base66.cloud
- The Kelly panel is on the right side
- Type anything — "Build me a todo app" or "Review this code"

### 2. Direct API (curl or fetch)
```bash
curl -s http://127.0.0.1:8642/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 820a8890e58dfd3dadd4166cb2be9b8c4db1afce6514110039374ea1da7b84cc" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"Hello Kelly"}]}'
```

### 3. BuildAny API Endpoint
```bash
curl -s http://localhost:3000/api/hermes-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Kelly","history":[]}'
```

### 4. Hermes CLI (inside Docker container)
```bash
# Enter the container
docker exec -it hermes-gateway bash

# Talk to Kelly
hermes chat -q "Hello, what can you do?"

# Use a skill
hermes -s code-review-and-quality -q "Review my code"
```

### With Skills!
Kelly has 37+ skills loaded. You can invoke them by asking:
- "Review my code using code-review-and-quality"
- "Plan this project using planning-and-task-breakdown"
- "Debug this error using systematic-debugging"

**Skills are in `/root/.hermes/skills/`** — from Addy Osmani and Superpowers repos.

## Recent Notes

- **2026-06-21: Kelly code review COMPLETE!** 28 issues found across 5 categories:
  - **3 CRITICAL** — setState side-effects, tool call handling, fire-and-forget
  - **10 HIGH** — AbortController, platform hardcoding, type safety, logic bugs
  - **12 MEDIUM** — Schema, stale closures, dead code, security
  - **4 LOW** — UX, compatibility, missing fields
- **Report saved:** `buildany-code-review.md` (full file with line-level fixes)
- **Next:** Fix Kelly chat panel (messages duplicating, streaming broken)



- 2026-06-21: User asked to use Hermes for code review of BuildAny app. This is a GREAT idea — we have the `code-review-and-quality` skill ready. The plan: run Hermes against the BuildAny codebase to review React/Next.js code, catch bugs, performance issues, and best practice violations. Will queue this up and execute when the user says go.

