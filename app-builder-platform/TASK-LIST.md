# BuildAny - Master Task List
## System Design → Build → Test → Deploy

**Project**: BuildAny - AI App Builder Platform  
**Domain**: https://base66.cloud  
**VPS**: srv1730121 (2.25.170.135)  
**Status**: ✅ Build succeeded, pushed to GitHub, needs VPS pull

---

## ✅ PHASE 0: INFRASTRUCTURE (COMPLETED)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 0.1 | Register domain `base66.cloud` | ✅ | Active |
| 0.2 | Point DNS A record to VPS | ✅ | 2.25.170.135 |
| 0.3 | Acquire SSL certificate (Let's Encrypt) | ✅ | Expires 2026-09-03 |
| 0.4 | Install Node.js 22 on VPS | ✅ | 22.22.3 |
| 0.5 | Setup PM2 process manager | ✅ | Running |
| 0.6 | Configure Traefik reverse proxy | ✅ | Ports 80/443 |
| 0.7 | Deploy minimal landing page | ✅ | Live at base66.cloud |
| 0.8 | Configure API keys (.env.local) | ✅ | DeepSeek + Clerk + Resend + GitHub PAT |

---

## ✅ PHASE 1: SYSTEM DESIGN & DATABASE (COMPLETED)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 1.1 | Design database schema (SQLite) | ✅ | TBD | users, projects, files, conversations, wiki_pages, agents, tasks, skills — 14 tables |
| 1.2 | Setup Drizzle ORM with migrations | ✅ | TBD | Schema → tables, better-sqlite3 |
| 1.3 | Create project types/interfaces | ✅ | TBD | TypeScript definitions in schema.ts |
| 1.4 | Design API route structure | ✅ | TBD | 22 REST endpoints implemented |
| 1.5 | Setup Clerk auth middleware | ✅ | TBD | Protects all routes, SignIn/SignUp modals |

**Deliverable**: Database + API contract ready ✅

---

## ✅ PHASE 2: CORE UI COMPONENTS (COMPLETED → REFACTORED)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 2.1 | Dashboard layout shell | ✅ | TBD | Sidebar + header + main area — DashboardHeader |
| 2.2 | Project list/grid view | ✅ | TBD | Cards with status badges — ProjectGrid |
| 2.3 | Create new project modal | ✅ | TBD | CreateProjectModal with type selector |
| 2.4 | Prompt input component | ✅ | TBD | PromptBox with research stage indicators |
| 2.5 | LLM selector dropdown | ✅ | TBD | LLMSelector — DeepSeek/Kimi/GPT-4o |
| 2.6 | **3-panel workspace layout** | ✅ | TBD | **NEW: AI chat (left) | Workspace tabs (middle) | File tree (right)** |
| 2.7 | File tree sidebar | ✅ | TBD | File tree on RIGHT panel, click to open code in middle panel |
| 2.8 | Code editor view | ✅ | TBD | Code shown in middle panel when "Code" tab selected |
| 2.9 | **AI chat panel (status messages)** | ✅ | TBD | Left panel: pure chat + status messages with clickable links to workspace tabs |
| 2.10 | Live preview panel | ✅ | TBD | LivePreview in middle panel under "Preview" tab |
| 2.11 | Research panel | ✅ | TBD | ResearchPanel in middle panel under "Research" tab |
| 2.12 | Swarm dashboard | ✅ | TBD | SwarmDashboard in middle panel under "Agents Swarm" tab |
| 2.13 | Wiki viewer | ✅ | TBD | WikiViewer in middle panel under "Wiki Pages" tab |
| 2.14 | Settings/profile page | ✅ | TBD | /settings with API keys, preferences |
| 2.15 | Delete project button | ✅ | TBD | With confirmation dialog |
| 2.16 | Deploy modal | ✅ | TBD | Shows deployment package URL + Vercel instructions |

**Deliverable**: All UI components render without errors ✅

---

## ✅ PHASE 3: AI GENERATION ENGINE (IN PROGRESS)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 3.1 | LLM Router implementation | ✅ | TBD | DeepSeek API integrated |
| 3.2 | System prompts for web apps | ✅ | TBD | Next.js + Tailwind instructions |
| 3.3 | System prompts for mobile apps | ✅ | TBD | Expo SDK 54 + React Native instructions |
| 3.4 | Code generation endpoint `/api/generate` | ✅ | TBD | Accept prompt → return code files |
| 3.5 | File parser (extract code from LLM response) | ✅ | TBD | Parse markdown/json → files |
| 3.6 | Save generated files to database | ✅ | TBD | project_files table |
| 3.7 | Auto-research endpoint `/api/research` | ✅ | TBD | Competitive analysis before build |
| 3.8 | **Auto-decompose into tasks** | ✅ | TBD | Tasks automatically created and assigned to agents |
| 3.9 | **Wiki auto-generation** | ✅ | TBD | Wiki pages generated from project files |
| 3.10 | **Status messages in AI chat** | ✅ | TBD | AI reports progress: "Code generated → click Code tab", "Tasks assigned → click Agents Swarm tab" |
| 3.11 | Streaming response for generation | 🔲 | TBD | Show progress in real-time |

**Deliverable**: User can type prompt → AI generates code → files appear in workspace ✅

---

## 🔲 PHASE 4: TEST AI GENERATION (DEEPSEEK)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 4.1 | Test DeepSeek API connectivity | 🔲 | TBD | curl with provided key |
| 4.2 | Test simple web app generation | 🔲 | TBD | "Create a todo app" |
| 4.3 | Test mobile app generation | 🔲 | TBD | "Create a fitness tracker app" |
| 4.4 | Test code parsing accuracy | 🔲 | TBD | Verify extracted files are valid |
| 4.5 | Test error handling (API failures) | 🔲 | TBD | Graceful fallbacks |
| 4.6 | Test long/complex prompts | 🔲 | TBD | Multi-screen apps |
| 4.7 | Test GitHub export | 🔲 | TBD | Verify GitHub PAT works |
| 4.8 | Test wiki generation | 🔲 | TBD | Verify wiki pages load |
| 4.9 | Test agent swarm task decomposition | 🔲 | TBD | Verify tasks auto-created and assigned |

**Deliverable**: DeepSeek successfully generates code, files parse correctly, all features work

---

## 🔲 PHASE 5: MOBILE GENERATION PIPELINE

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 5.1 | Expo SDK 54 template generator | 🔲 | TBD | package.json, app.json, tsconfig |
| 5.2 | Mobile screen generation prompts | 🔲 | TBD | React Native components |
| 5.3 | Navigation generation (Expo Router) | 🔲 | TBD | Tab/stack navigation |
| 5.4 | Theme/styling generation (NativeWind) | 🔲 | TBD | Tailwind for RN |
| 5.5 | Icon asset generation | 🔲 | TBD | Lucide React Native icons |
| 5.6 | EAS Build config generation | 🔲 | TBD | eas.json profiles |
| 5.7 | GitHub Actions workflow for CI/CD | 🔲 | TBD | Auto-build on push |

**Deliverable**: Full Expo project generated from prompt

---

## 🔲 PHASE 6: EXPORT & DEPLOYMENT

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 6.1 | GitHub export API | ✅ | TBD | Create repo + push files |
| 6.2 | Add GitHub PAT to .env.local | ✅ | TBD | github_pat configured |
| 6.3 | Web app ZIP download | ✅ | TBD | Export as zip file |
| 6.4 | Mobile app ZIP download | ✅ | TBD | Expo project zip |
| 6.5 | QR code generation for mobile preview | 🔲 | TBD | Expo Go compatible |
| 6.6 | Auto-deploy to Vercel/Netlify option | 🔲 | TBD | Future feature |

**Deliverable**: User can export projects to GitHub or download ZIP

---

## 🔲 PHASE 7: AGENT SWARM (HERMES INTEGRATION)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 7.1 | Investigate Hermes agent API/capabilities | 🔲 | TBD | How to send commands |
| 7.2 | Design Hermes ↔ OpenClaw protocol | 🔲 | TBD | Task dispatch + result reporting |
| 7.3 | Create task dispatch endpoint | 🔲 | TBD | Send tasks to Hermes |
| 7.4 | Create result collection endpoint | 🔲 | TBD | Receive Hermes output |
| 7.5 | Task queue system | ✅ | TBD | Tasks table + auto-decomposition |
| 7.6 | Auto-retry on failure | 🔲 | TBD | Resilient execution |
| 7.7 | Shared task list sync | 🔲 | TBD | Both agents see same list |
| 7.8 | **Alibaba Code Review Agent** | 🔲 | TBD | Integrate open-code-review as swarm agent |

**Deliverable**: OpenClaw can dispatch VPS tasks to Hermes, get results back

---

## 🔲 PHASE 8: TESTING & QA

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 8.1 | Unit tests for API routes | 🔲 | TBD | Jest/Vitest |
| 8.2 | Integration tests (end-to-end) | 🔲 | TBD | Playwright/Cypress |
| 8.3 | Test auth flow (Clerk) | 🔲 | TBD | Sign up/in/out |
| 8.3 | Test mobile responsive design | 🔲 | TBD | Phone/tablet/desktop |
| 8.4 | Performance testing | 🔲 | TBD | Generation speed, load times |
| 8.5 | Error boundary testing | 🔲 | TBD | Graceful failures |
| 8.6 | Security audit | 🔲 | TBD | API keys, auth, SQL injection |

**Deliverable**: All tests pass, app is stable

---

## 🔲 PHASE 9: POLISH & LAUNCH

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 9.1 | Loading states + skeletons | 🔲 | TBD | Better UX |
| 9.2 | Toast notifications | 🔲 | TBD | Success/error feedback |
| 9.3 | Onboarding flow | 🔲 | TBD | First-time user guide |
| 9.4 | Landing page marketing content | 🔲 | TBD | Features, pricing, examples |
| 9.5 | SEO optimization | 🔲 | TBD | Meta tags, sitemap |
| 9.6 | Analytics integration | 🔲 | TBD | Track usage |
| 9.7 | Rate limiting / credits system | 🔲 | TBD | Prevent abuse |
| 9.8 | Check and configure SSL cert auto-renewal | ⏳ | TBD | Verify Traefik ACME auto-renewal is working for `base66.cloud` and `www.base66.cloud`; test renewal before 2026-09-03 expiry; fallback to certbot if needed |

**Deliverable**: Production-ready platform

---

## 📊 CURRENT STATUS SUMMARY

**Completed**: 25/63 tasks (40%)  
**In Progress**: 0/63 tasks  
**Pending**: 38/63 tasks

**Next Priority**: Deploy latest build to VPS + Test AI Generation (Phase 4)

---

## 🔄 WORKFLOW PROCESS

1. **I prepare** task list for a phase
2. **You review & approve** (say "go" or ask changes)
3. **I build** on VPS directly (via commands you run)
4. **We test** together
5. **I mark tasks** ✅ and keep them visible
6. **Repeat** for next phase

---

## 🤖 HERMES AGENT INTEGRATION PLAN

**Investigation needed** (Task 7.1):
- Hermes agent installed at `/docker/hermes-agent-cvaj/`
- Need to understand: API endpoint? CLI commands? Docker exec?
- Possible integration pattern:
  - OpenClaw (me) creates task → sends to Hermes
  - Hermes executes on VPS → captures output
  - Hermes reports back → OpenClaw updates task list
  - OpenClaw shows results to user

**Questions for you:**
1. How do you normally interact with Hermes? (CLI, web UI, API?)
2. Does Hermes have an API endpoint we can call?
3. Can Hermes execute shell commands on the VPS?

---

## 📝 DEPLOYMENT INSTRUCTIONS (VPS)

**SSH into your VPS and run:**

```bash
ssh root@2.25.170.135
cd /opt/buildany
git pull origin main
npm install
npm run build
pm2 restart buildany
```

**What's new in this build:**
1. ✅ 3-panel workspace layout (AI chat left, workspace middle, files right)
2. ✅ AI chat panel shows status messages with clickable links to workspace tabs
3. ✅ Auto-decomposition of tasks into agent swarm
4. ✅ Wiki API with auto-generated pages
5. ✅ GitHub export config check
6. ✅ Delete project confirmation
7. ✅ Deploy modal with package URL

---

## 🎯 ALIBABA OPEN-CODE-REVIEW AGENT

**Review**: https://github.com/alibaba/open-code-review

**Verdict**: ✅ HIGHLY USEFUL for BuildAny

**What it does:**
- AI-powered code review CLI tool from Alibaba Group
- Battle-tested at massive scale (tens of thousands of developers, millions of code defects identified)
- Hybrid architecture: deterministic pipelines + LLM Agent
- Reads Git diffs, sends changed files to LLM via agent with tool-use capabilities
- Generates structured review comments with line-level precision
- Built-in fine-tuned ruleset (NPE, thread-safety, XSS, SQL injection)
- Compatible with OpenAI & Anthropic
- Can be integrated into CI/CD pipelines

**Why it's useful for BuildAny:**
1. BuildAny generates code that may have bugs - this tool can review it automatically
2. It catches security issues (XSS, SQL injection), null pointer exceptions, thread-safety issues
3. It can be integrated as part of the agent swarm (e.g., a "Code Review Agent")
4. It runs deterministic checks + LLM reasoning - perfect for generated code quality
5. It can suggest fixes that the orchestrator can apply before showing code to user

**How to incorporate it into BuildAny:**

1. **Add a new agent type**: "code-reviewer" in the agent swarm (table `agents`)
2. **After code generation**: Run the code review on all generated files
3. **Show review results**: In the AI chat panel as a status message: "🔍 Code review complete — 3 issues found, 2 suggestions. Click to view."
4. **Add review tab**: In the workspace tabs, add a "Review" tab showing findings
5. **Auto-fix**: The review agent can suggest fixes, which the orchestrator can apply automatically
6. **Wiki integration**: Add review findings to the project's wiki pages as "Quality Notes"
7. **CI/CD**: When exporting to GitHub, include the review report in the repo

**Implementation steps:**
1. Install `@alibaba-group/open-code-review` npm package in BuildAny
2. Create `/api/review` endpoint that runs OCR on generated files
3. Add `codeReview` column to `projects` table
4. Add "Review" tab to workspace tabs
5. Show review status in AI chat panel

**Recommended**: Add this as Phase 7.8 (Agent Swarm) in the task list above.

---

**Review this list, tell me:**
- What to add/remove/change?
- Which phase to start first?
- How does Hermes work on your VPS?
- Should we integrate the Alibaba code review agent?

**Once approved → I start building!** 🚀
