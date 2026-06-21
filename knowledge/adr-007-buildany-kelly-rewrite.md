# BuildAny Architecture Roadmap (2026-06-21)

## Vision
BuildAny becomes a **Kelly-orchestrated platform** where all user interactions flow through the Hermes agent (Kelly). Kelly decides what to do, delegates to Morgan (OpenManus) for execution, and uses her own skills for planning and code review.

---

## TODO List (Prioritized)

### 🔴 P0 — Critical (Blocking)

**1. Fix Hostinger CDN / Edge Proxy Interception**
- **Problem**: External HTTPS traffic to `base66.cloud` is intercepted by Hostinger infrastructure, never reaches VPS Nginx
- **Evidence**: `X-VPS-Debug` header mismatch, stale JS chunks from June 14, 404 on new routes (`/kelly-chat`, `/chat`)
- **Fix**: Contact Hostinger support — disable CDN/proxy, enable DNS Only, or purge ALL cache (not just browser)
- **Impact**: Everything below is blocked until this is resolved

---

### 🟠 P1 — High Priority (Architecture Rewire)

**2. Rewire BuildAny — All Interactions Go Through Kelly (Hermes Agent)**
- **Current**: BuildAny has its own orchestration logic (`/api/decompose`, `/api/generate`, `/api/deploy`) that runs independently
- **Target**: ALL user requests → Kelly → Kelly decides → delegates to BuildAny or Morgan
- **Changes needed**:
  - Replace direct `/api/generate` calls with `/api/hermes-orchestrate`
  - Make project creation flow: User prompt → Kelly (research + plan) → BuildAny (generate code) → Kelly (review)
  - Kelly should be the entry point for every significant operation

**3. Merge AI Assistant + Kelly Hermes → Single Kelly Interface**
- **Current**: Two tabs in AI Chat panel — "AI Assistant" (BuildAny native) and "Kelly" (Hermes)
- **Target**: Only ONE tab — "Kelly" (Hermes agent)
- **Changes needed**:
  - Remove "AI Assistant" tab and all its logic
  - Make "Kelly" the default and only chat mode
  - Update `AIChatPanel.tsx` to remove tab switching UI
  - Update `useHermesChat.ts` to always use Hermes API
  - Ensure welcome message, placeholder, and all UX references say "Kelly" only

**4. Kelly = Brain, Morgan = Executor**
- **Architecture**:
  ```
  User → Kelly (Hermes) → Decision
    ├─ Planning/Research → Kelly's skills (spec-driven-development, planning-and-task-breakdown)
    ├─ Code Generation → BuildAny native
    ├─ Code Review → Kelly's skills (code-review-and-quality, systematic-debugging)
    ├─ Security Audit/Fixes → Morgan (OpenManus)
    └─ Complex Automation → Morgan (OpenManus)
  ```
- **Integration**: Add `/api/orchestrate` endpoint that:
  1. Receives user request
  2. Sends to Kelly for analysis
  3. Kelly returns structured plan with `executor: "kelly" | "morgan" | "buildany"`
  4. Route to correct executor
  5. Return combined result

**5. Code Review via Kelly's Skills**
- **Current**: Code Review tab likely uses basic analysis
- **Target**: Use Kelly's built-in skills:
  - `code-review-and-quality` — structured code review
  - `systematic-debugging` — debug analysis
  - `test-driven-development` — test strategy
- **Integration**: Add "Review with Kelly" button in Code Review tab
  - Sends code to Hermes with skill preloaded
  - Kelly returns structured review (issues, suggestions, severity)
  - Display in UI with severity badges

---

### 🟡 P2 — Medium Priority (Features)

**6. Replace "Future Release" Tab with "Agents/Tasks" Dashboard**
- **Current**: "Future Release" tab is a static placeholder
- **Target**: Live dashboard showing:
  - Active tasks assigned to Kelly vs Morgan
  - Task status (queued, running, completed, failed)
  - Results and artifacts from each agent
- **Powered by**: Kelly's `planning-and-task-breakdown` skill

**7. Add Project-Level Agent Context**
- **Current**: Each chat is stateless
- **Target**: Kelly remembers project context across sessions
  - Project description, tech stack, user preferences
  - Previous decisions and their rationale
  - Morgan's execution history
- **Storage**: Use existing MCP memory server (`/root/.hermes/memory.db`) or project-level JSON

**8. Auto-Delegation Rules**
- Define when Kelly delegates to Morgan:
  - "Audit security" → Morgan
  - "Fix all TypeScript errors" → Morgan
  - "Refactor this component" → Kelly (if small) or Morgan (if large)
  - "Research competitors" → Kelly
  - "Generate tests" → Kelly (with TDD skill)

---

### 🟢 P3 — Low Priority (Polish)

**9. Unify Branding**
- Remove all "AI Assistant" references
- Consistent "Kelly" branding everywhere
- Kelly avatar/icon in chat
- Morgan avatar/icon for executor tasks

**10. Performance Optimization**
- Stream responses from Kelly instead of buffering
- Parallel execution where possible (Kelly plans while Morgan executes previous task)
- Caching of Kelly's research results

---

## Technical Implementation Notes

### Files to Modify (BuildAny)
1. `src/components/AIChatPanel.tsx` — Remove AI Assistant tab, keep only Kelly
2. `src/hooks/useHermesChat.ts` — Already Kelly-focused, ensure no dual-mode logic
3. `src/app/api/hermes-orchestrate/route.ts` — New: Main orchestration endpoint
4. `src/app/api/orchestrate/route.ts` — New: Kelly → Morgan delegation
5. `src/components/CodeReview.tsx` — Add "Review with Kelly" integration
6. `src/components/FutureRelease.tsx` → `src/components/AgentsDashboard.tsx`
7. `src/lib/orchestrator.ts` — New: Decision engine for Kelly vs Morgan

### Files to Create
1. `src/lib/kelly-client.ts` — Typed client for Hermes API
2. `src/lib/morgan-client.ts` — Client for OpenManus execution
3. `src/app/api/review/route.ts` — Code review via Kelly skills
4. `src/components/AgentsDashboard.tsx` — Task management UI

### OpenManus Integration
- Use `/root/OpenManus` (already cloned)
- Create wrapper script: `morgan-execute.sh`
- API endpoint: `/api/morgan` that runs OpenManus tasks asynchronously
- Store results in `/tmp/morgan-results/` or project directory

---

## Success Criteria

- [ ] User never sees "AI Assistant" — only "Kelly"
- [ ] Every significant action goes through Kelly first
- [ ] Kelly automatically delegates to Morgan when appropriate
- [ ] Code Review uses Kelly's structured review format
- [ ] Agents/Tasks dashboard shows real-time task status
- [ ] External CDN issue resolved (Hostinger)

---

## Dependencies

- **P0 must be resolved first** — without external access, none of the UX changes matter
- OpenManus must be installed for Morgan executor role (script ready at `/root/install-openmanus-web.sh`)
- Hermes gateway must be running (already active on port 8642)

---

## Ponytail Integration (NEW — 2026-06-21)

**Ponytail** is a minimalist coding ruleset that prevents over-engineering. Benchmarks: 54% less code, 20% cheaper, 27% faster.

### Why It Matters for BuildAny
- Kelly generates code → Ponytail keeps it minimal
- Morgan executes fixes → Ponytail prevents over-building
- TaqClaw reviews → Ponytail catches bloat before shipping

### Skills Available
| Skill | Purpose |
|-------|---------|
| `ponytail` | Main ruleset — active every response |
| `ponytail-review` | Review diffs for over-engineering |
| `ponytail-audit` | Audit entire repo for bloat |
| `ponytail-debt` | Track deferred shortcuts |
| `ponytail-gain` | Show measured impact (LOC, cost, speed) |

### The Ladder (How It Works)
```
1. Does this need to exist?   → no: skip it (YAGNI)
2. Stdlib does it?            → use it
3. Native platform feature?   → use it
4. Installed dependency?      → use it
5. One line?                  → one line
6. Only then: the minimum that works
```

**Safety guarantee**: Never cuts validation, error handling, security, or accessibility.

### Integration Plan
1. **Install on VPS** (commands below)
2. **Add to Kelly's skills** — preload `ponytail` skill on code generation tasks
3. **Add to Morgan's context** — pass ponytail ruleset to OpenManus before execution
4. **Use in Code Review** — `ponytail-review` runs after Kelly's code review

### Install on VPS
```bash
# Clone repo
cd /root && git clone https://github.com/DietrichGebert/ponytail.git

# Copy OpenClaw skills to Hermes skills directory
# (Hermes loads skills from ~/.hermes/skills/ or external_dirs)
mkdir -p /root/.hermes/skills/ponytail
cp -r /root/ponytail/skills/* /root/.hermes/skills/

# Or symlink (better for updates)
ln -sf /root/ponytail/skills/ponytail /root/.hermes/skills/ponytail
ln -sf /root/ponytail/skills/ponytail-review /root/.hermes/skills/ponytail-review
ln -sf /root/ponytail/skills/ponytail-audit /root/.hermes/skills/ponytail-audit
```

### Install on OpenClaw (TaqClaw)
```bash
# Already done — skills copied to ~/.openclaw/skills/
# Available now: ponytail, ponytail-review, ponytail-audit, etc.
```

---

## Training Kelly + Morgan (NEW — 2026-06-21)

**Goal:** Make Kelly and Morgan true assets that improve BuildAny both during development AND after launch.

### Kelly Training Plan
1. **Project Memory** — Save every decision, pattern, preference into persistent memory
2. **Domain Knowledge** — Feed top app examples, design patterns, Expo/Next.js best practices
3. **Code Style** — Lock in Playfair Display + Geist Sans, purple-pink gradient branding, clean card UI
4. **Error Recovery** — Train on past build failures so Kelly can auto-diagnose
5. **Post-Launch** — Customer support mode, feature request analysis, A/B test suggestions

### Morgan Training Plan
1. **Security Patterns** — Common Expo/RN vulnerabilities, dependency audits
2. **Build Failures** — Catalog EAS build errors and fixes
3. **Refactoring** — Common code smells in generated code (over-fetching, prop drilling, etc.)
4. **Post-Launch** — Automated monitoring, error alerting, performance audits

### How to Train
- **Skills**: Save successful patterns as reusable Hermes skills
- **Memory**: Use MCP memory server to persist learnings
- **Feedback Loop**: After every successful build, capture "what worked" as training data

---

*Created: 2026-06-21 11:39 AM*
*Updated: 2026-06-21 11:43 AM (added Ponytail)*
*Updated: 2026-06-21 11:49 AM (added Training Plan)*
*Next review: After P0 (CDN) resolved*
