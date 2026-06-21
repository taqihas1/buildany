# BuildAny — Technical Architecture & Data Flow

## High-Level System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Dashboard│  │Project   │  │ Workspace│  │  Admin   │   │
│  │  (Home)  │  │Create    │  │ (Project │  │  Panel   │   │
│  └────┬─────┘  │  Page    │  │  Page)   │  └────┬─────┘   │
│       │        └────┬─────┘  └────┬─────┘       │          │
│       └─────────────┴─────────────┴─────────────┘          │
│                         │                                   │
│              ┌──────────┴──────────┐                       │
│              │   React Components  │                       │
│              │  ┌────┐┌────┐┌────┐ │                       │
│              │  │AI  ││Swrm││Code│ │                       │
│              │  │Chat││Dash││View│ │                       │
│              │  └────┘└────┘└────┘ │                       │
│              │  ┌────┐┌────┐┌────┐ │                       │
│              │  │Live││Resh││Wiki│ │                       │
│              │  │Prev││Pnel││View│ │                       │
│              │  └────┘└────┘└────┘ │                       │
│              └──────────┬──────────┘                       │
└─────────────────────────┼─────────────────────────────────┘
                          │ HTTPS / API Calls
┌─────────────────────────┼─────────────────────────────────┐
│                    NEXT.JS SERVER (VPS)                    │
│  ┌──────────────────────┴────────────────────────┐        │
│  │              API Routes (Next.js App Router)   │        │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │        │
│  │  │/api│ │/api│ │/api│ │/api│ │/api│ │/api│  │        │
│  │  │/proj│ │/decomp│ │/hermes│ │/orchestrate│ │/generate│  │
│  │  │ects│ │ose  │ │    │ │    │ │    │ │    │  │        │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘  │        │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │        │
│  │  │/api│ │/api│ │/api│ │/api│ │/api│ │/api│  │        │
│  │  │/proj│ │/proj│ │/proj│ │/proj│ │/proj│ │/proj│  │        │
│  │  │ect/│ │ect/│ │ect/│ │ect/│ │ect/│ │ect/│  │        │
│  │  │id/ │ │id/ │ │id/ │ │id/ │ │id/ │ │id/ │  │        │
│  │  │agnt│ │chat│ │task│ │file│ │wiki│ │rsch│  │        │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘  │        │
│  └──────────────────┬───────────────────────────┘        │
│                     │                                     │
│  ┌──────────────────┴───────────────────────────┐        │
│  │         AI Assistant (Orchestrator)            │        │
│  │  ┌─────────────────────────────────────────┐ │        │
│  │  │  HermesOrchestrator Class                │ │        │
│  │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │ │        │
│  │  │  │design│ │build │ │combine│ │test  │   │ │        │
│  │  │  │()    │ │()    │ │()    │ │()    │   │ │        │
│  │  │  └──────┘ └──────┘ └──────┘ └──────┘   │ │        │
│  │  │  ┌──────┐ ┌──────┐                      │ │        │
│  │  │  │preview│ │report│                      │ │        │
│  │  │  │()     │ │()    │                      │ │        │
│  │  │  └──────┘ └──────┘                      │ │        │
│  │  └─────────────────────────────────────────┘ │        │
│  │                                               │        │
│  │  ┌─────────────────────────────────────────┐  │        │
│  │  │  LLM Router (DeepSeek API)              │  │        │
│  │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │  │        │
│  │  │  │generate│ │stream│ │embed│ │code│ │  │  │        │
│  │  │  │()      │ │()    │ │()  │ │() │  │  │        │
│  │  │  └────┘ └────┘ └────┘ └────┘ └────┘  │  │        │
│  │  └─────────────────────────────────────────┘  │        │
│  └───────────────────────────────────────────────┘        │
│                                                           │
│  ┌───────────────────────────────────────────────┐        │
│  │         Database (SQLite + Drizzle ORM)       │        │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │        │
│  │  │projects│ │agents│ │tasks│ │conver│        │        │
│  │  │       │ │      │ │     │ │sations│        │        │
│  │  └──────┘ └──────┘ └──────┘ └──────┘        │        │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │        │
│  │  │project│ │wiki  │ │skills│ │deploy│        │        │
│  │  │Files  │ │Pages │ │      │ │ments │        │        │
│  │  └──────┘ └──────┘ └──────┘ └──────┘        │        │
│  └───────────────────────────────────────────────┘        │
│                                                           │
│  ┌───────────────────────────────────────────────┐        │
│  │  External Integrations                          │        │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐         │        │
│  │  │GitHub│ │Email│ │Discord│ │Telegram│ │WhatsApp│         │        │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘         │        │
│  └───────────────────────────────────────────────┘        │
└───────────────────────────────────────────────────────────┘
```

---

## Data Flow: Project Creation → AI Generation → Dashboard

### 1. Project Creation Flow

```
User (Browser)
    │
    │ POST /api/projects
    │ { name, description, type }
    ▼
┌─────────────────────────────────┐
│  /api/projects/route.ts       │
│  • Creates project in DB      │
│  • Returns project ID           │
└──────────────┬──────────────────┘
               │
               │ { success, projectId }
               ▼
Browser redirects to /project/{projectId}
```

### 2. AI Chat / Prompt Flow

```
User types prompt in AI Chat Panel
    │
    │ POST /api/orchestrate
    │ { projectId, prompt, type }
    ▼
┌────────────────────────────────────────┐
│  /api/orchestrate/route.ts           │
│  • Creates HermesOrchestrator        │
│  • Starts async run()                 │
│  • Returns immediately:               │
│    "AI Assistant started!"            │
└──────────────┬─────────────────────────┘
               │
               │ (async background)
               ▼
┌────────────────────────────────────────┐
│  HermesOrchestrator.run()              │
│  1. design() → generates wiki pages   │
│  2. build() → creates agents + tasks  │
│  3. combine() → assembles code        │
│  4. test() → runs code review         │
│  5. preview() → generates preview     │
│  Each step calls report() → DB        │
└──────────────┬─────────────────────────┘
               │
               │ INSERT INTO conversations
               │ (role="system", content, projectId)
               ▼
               DB
```

### 3. Swarm Dashboard Data Flow

```
User opens Swarm tab
    │
    │ Browser polls every 5 seconds:
    │ GET /api/project/{id}/agents
    │ GET /api/project/{id}/tasks
    │ GET /api/decompose?projectId={id} (fallback)
    ▼
┌─────────────────────────────────────────┐
│  /api/project/{id}/agents/route.ts     │
│  • Query: SELECT * FROM agents         │
│    WHERE project_id = {id}             │
│  • Query: SELECT * FROM tasks          │
│    WHERE project_id = {id}             │
│  • Compute: active/completed/failed    │
│    counts per agent                    │
└──────────────┬──────────────────────────┘
               │ { agents: [...], tasks: [...] }
               ▼
SwarmDashboard.tsx
  • Renders agent cards with counts
  • Renders task list with status
  • Shows dependency graph
```

### 4. Code / Preview Tab Data Flow

```
User opens Code or Preview tab
    │
    │ GET /api/project/{id}/files
    ▼
┌─────────────────────────────────────────┐
│  /api/project/{id}/files/route.ts      │
│  • Query: SELECT * FROM project_files  │
│    WHERE project_id = {id}             │
│  • Returns: file list + content        │
└──────────────┬──────────────────────────┘
               │ { files: [{path, content, language}] }
               ▼
CodeViewer.tsx        LivePreview.tsx
  • Syntax highlight    • Detects __preview.html
  • File tree           • Renders in iframe
```

### 5. Live Preview Polling (During Generation)

```
Project status = "generating"
    │
    │ LivePreview.tsx polls every 3s:
    │ GET /api/project/{id}/files
    ▼
┌─────────────────────────────────────────┐
│  If __preview.html exists:             │
│  • Render in iframe                    │
│  • Stop polling when status changes    │
│    to "generated" or "failed"          │
└─────────────────────────────────────────┘
```

---

## Database Schema & Relationships

```
┌────────────────────────────────────────────────────────────┐
│                     SQLite Database                         │
│                    (sqlite.db)                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │    projects      │         │     agents       │         │
│  │──────────────────│         │──────────────────│         │
│  │ id (PK)          │         │ id (PK)          │         │
│  │ user_id          │         │ project_id (FK)  │◄────────┤
│  │ name             │         │ name             │         │
│  │ description      │         │ type             │         │
│  │ type             │         │ status           │         │
│  │ status           │         │ capabilities     │         │
│  │ created_at       │         │ metadata         │         │
│  │ updated_at       │         │ created_at       │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                            │                    │
│           │ 1:N                        │ 1:N                │
│           │                            │                    │
│  ┌────────┴─────────┐         ┌────────┴─────────┐       │
│  │  project_files     │         │      tasks         │       │
│  │──────────────────  │         │──────────────────  │       │
│  │ id (PK)            │         │ id (PK)            │       │
│  │ project_id (FK)    │◄────────│ project_id (FK)    │       │
│  │ path               │         │ agent_id (FK)      │◄──────┤
│  │ content            │         │ type               │       │
│  │ language           │         │ status             │       │
│  │ is_generated       │         │ title              │       │
│  │ created_at         │         │ description        │       │
│  │ updated_at         │         │ input/output       │       │
│  └────────────────────┘         │ error_log          │       │
│                                 │ priority           │       │
│                                 │ created_at         │       │
│                                 └────────────────────┘       │
│                                                            │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  conversations   │         │   wiki_pages     │         │
│  │──────────────────│         │──────────────────│         │
│  │ id (PK)          │         │ id (PK)          │         │
│  │ project_id (FK)  │◄────────│ project_id (FK)  │◄────────┤
│  │ role (user|system│         │ page_type          │         │
│  │ content          │         │ title            │         │
│  │ model            │         │ content          │         │
│  │ created_at       │         │ auto_generated   │         │
│  └──────────────────┘         │ created_at       │         │
│                               └──────────────────┘         │
│                                                            │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │     skills       │         │   deployments    │         │
│  │──────────────────│         │──────────────────│         │
│  │ id (PK)          │         │ id (PK)          │         │
│  │ name             │         │ project_id (FK)  │◄────────┤
│  │ type             │         │ platform         │         │
│  │ capability       │         │ url              │         │
│  │ content          │         │ status           │         │
│  │ shared           │         │ created_at       │         │
│  └──────────────────┘         └──────────────────┘         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## HermesOrchestrator Lifecycle (AI Assistant)

```
┌────────────────────────────────────────────────────────────┐
│                     AI Assistant Flow                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  START: User sends prompt via AI Chat                       │
│       │                                                    │
│       ▼                                                    │
│  ┌─────────────┐                                           │
│  │   design()   │ ──► Generate design overview + ADR       │
│  │             │     Save to wiki_pages table              │
│  │             │     report("AI Assistant: Starting...")    │
│  └──────┬──────┘                                           │
│         │                                                  │
│         ▼                                                  │
│  ┌─────────────┐                                           │
│  │    build()   │ ──► Create 3 agents (html/css/js)       │
│  │             │     Create 3 tasks (pending)             │
│  │             │     For each task:                       │
│  │             │       1. Update status → running        │
│  │             │       2. Call LLM (DeepSeek)            │
│  │             │       3. Update status → completed      │
│  │             │       4. Save output to tasks.output    │
│  └──────┬──────┘                                           │
│         │                                                  │
│         ▼                                                  │
│  ┌─────────────┐                                           │
│  │  combine()   │ ──► Merge task outputs into index.html  │
│  │             │     Save to project_files table           │
│  │             │     report("Code assembled!")             │
│  └──────┬──────┘                                           │
│         │                                                  │
│         ▼                                                  │
│  ┌─────────────┐                                           │
│  │    test()    │ ──► LLM reviews code quality            │
│  │             │     Save test report to wiki_pages        │
│  └──────┬──────┘                                           │
│         │                                                  │
│         ▼                                                  │
│  ┌─────────────┐                                           │
│  │  preview()   │ ──► Save index.html as __preview.html │
│  │             │     Update project.status → generated     │
│  │             │     report("ALL PHASES COMPLETE!")       │
│  └──────┬──────┘                                           │
│         │                                                  │
│         ▼                                                  │
│  END: User sees app in Preview tab                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## API Route Map

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/projects` | GET | List all projects | Clerk |
| `/api/projects` | POST | Create new project | Clerk |
| `/api/projects?id={id}` | DELETE | Delete project | Clerk |
| `/api/orchestrate` | POST | Start AI generation | Clerk |
| `/api/decompose` | POST | Decompose into tasks | Clerk |
| `/api/decompose?projectId={id}` | GET | Get task plan | Clerk |
| `/api/hermes` | GET | List all agents | Clerk |
| `/api/hermes` | POST | Agent actions (claim, heartbeat, etc.) | Clerk |
| `/api/project/{id}/agents` | GET | Project agents + task counts | Clerk |
| `/api/project/{id}/tasks` | GET | Project tasks | Clerk |
| `/api/project/{id}/chat` | GET | Chat history | Clerk |
| `/api/project/{id}/files` | GET | Project files | Clerk |
| `/api/project/{id}/wiki` | GET | Wiki pages | Clerk |
| `/api/project/{id}/research` | GET | Research data | Clerk |
| `/api/project/{id}/review` | GET | Code review | Clerk |
| `/api/generate` | POST | Generic code generation | Clerk |
| `/api/generate/stream` | POST | Streaming generation | Clerk |
| `/api/deploy` | POST | Deploy to hosting | Clerk |
| `/api/skills` | GET | List skills | Clerk |
| `/api/test/deepseek` | GET | Test DeepSeek API | Clerk |
| `/api/webhook/{email, discord, telegram, whatsapp}` | POST | Send notifications | API Key |
| `/api/admin/emails` | GET | Admin email list | Admin Key |

---

## Frontend Component Hierarchy

```
App
├── Layout (RootLayout)
│   ├── ClerkProvider (Auth)
│   └── Header (Navigation)
│
├── Page (Home/Dashboard)
│   ├── ProjectCard[] (List of projects)
│   └── NewProjectButton
│
├── ProjectPage /project/{id}
│   ├── ProjectWorkspace (Main container)
│   │   ├── LeftPanel (340px, resizable)
│   │   │   ├── AIChatPanel (Chat interface)
│   │   │   ├── FileTree (Code files)
│   │   │   └── ProjectInfo (Metadata)
│   │   │
│   │   ├── CenterPanel (Flexible)
│   │   │   ├── TabBar (preview | code | research | swarm | wiki | review)
│   │   │   ├── LivePreview (iframe, __preview.html)
│   │   │   ├── CodeViewer (Syntax highlight)
│   │   │   ├── ResearchPanel (Competitor analysis)
│   │   │   ├── SwarmDashboard (Agent/task monitor)
│   │   │   ├── WikiViewer (Markdown docs)
│   │   │   └── CodeReviewPanel (AI review)
│   │   │
│   │   └── RightPanel (240px, resizable)
│   │       └── StatusPanel (Progress, logs)
│   │
│   └── StatusBar (Bottom)
│
├── AdminPage /admin
│   ├── AdminDashboard
│   └── EmailMonitor
│
└── SettingsPage /settings
    └── APIKeyManager
```

---

## Authentication & Authorization Flow

```
User visits site
    │
    ▼
┌─────────────────────┐
│ Clerk Middleware    │
│ • Check JWT token   │
│ • Extract userId    │
│ • API routes: 401   │
│   if unauthorized   │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
Authorized  Unauthorized
    │           │
    ▼           ▼
Access API  Redirect to
/data       /sign-in
```

---

## External Service Integrations

| Service | API Key | Purpose | Where Used |
|---------|---------|---------|------------|
| DeepSeek | `DEEPSEEK_API_KEY` | Code generation | `llm-router.ts` |
| Clerk | `CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | Auth | Middleware, all API routes |
| Resend | `RESEND_API_KEY` | Email notifications | `/api/webhook/email` |
| GitHub | `GITHUB_TOKEN` | Export code | `/api/github/create` |
| Exa.ai | `EXA_API_KEY` | Research/web search | `/api/research` |

---

## Deployment Architecture (VPS)

```
Internet
    │
    ▼
┌─────────────────────┐
│   Traefik (443)     │  Reverse Proxy + SSL
│   • Let's Encrypt   │  (Docker container)
│   • Auto HTTPS      │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
  HTTP        HTTPS
  (80)        (443)
    │           │
    ▼           ▼
┌─────────────────────┐
│   PM2 Process       │  Process Manager
│   • buildany (3000) │  (fork mode)
│   • Auto-restart    │
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│   Next.js App       │  Node.js Server
│   • Port 3000       │  (production build)
│   • SQLite DB       │
│   • .next/ static   │
└─────────────────────┘
```

---

## Known Issues & Fixes Applied

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Task counts show 0 | API returned HTML redirect instead of JSON | Fixed middleware to return 401 JSON for API routes |
| Agents missing project_id | Old DB schema | Added `project_id` column, migrated data |
| Preview not auto-showing | Server-side fetch, no polling | Added client-side polling in LivePreview |
| "Hermes" instead of "AI Assistant" | Old report() messages | Updated all user-facing strings |
| 67 orphaned agents | Old agents without project_id | Cleaned up orphaned data |
| API unauthorized from curl | Missing auth header | Expected — browser provides Clerk JWT |
| Deploy workflow timeout | Network/firewall between GitHub and VPS | Switched to manual pull |

---

## File Locations (Critical)

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Entry Point | `src/app/page.tsx` | Dashboard home |
| Project Page | `src/app/project/[id]/page.tsx` | Workspace with all panels |
| API Orchestrator | `src/app/api/orchestrate/route.ts` | AI generation entry |
| API Agents | `src/app/api/project/[id]/agents/route.ts` | Agent list + counts |
| API Tasks | `src/app/api/project/[id]/tasks/route.ts` | Task list |
| API Files | `src/app/api/project/[id]/files/route.ts` | File list |
| AI Chat Panel | `src/components/AIChatPanel.tsx` | Chat UI |
| Swarm Dashboard | `src/components/SwarmDashboard.tsx` | Agent monitor |
| Live Preview | `src/components/LivePreview.tsx` | App preview |
| Code Viewer | `src/components/CodeViewer.tsx` | Code display |
| DB Schema | `src/lib/db/schema.ts` | Drizzle schema |
| DB Connection | `src/lib/db/index.ts` | SQLite setup |
| LLM Router | `src/lib/llm-router.ts` | DeepSeek API |
| Middleware | `src/middleware.ts` | Auth + route protection |
| Environment | `.env.local` | API keys + config |
| Database | `sqlite.db` | SQLite data file |
| PM2 Config | `pm2 start npm --name buildany -- start` | Process manager |

---

## Key Design Decisions

1. **SQLite over PostgreSQL**: Single-file, zero-config, sufficient for current scale
2. **Next.js API Routes over separate backend**: Simpler deployment, shared code
3. **Async Orchestrator**: `run()` is fire-and-forget, client polls for updates
4. **Client-side polling**: Server-sent events not used; polling every 3-5s is sufficient
5. **Clerk for Auth**: JWT-based, integrates well with Next.js, handles OAuth
6. **DeepSeek API**: Cost-effective, fast code generation
7. **PM2 over Docker**: Simpler for single-node deployment, easier debugging
8. **Traefik reverse proxy**: Automatic SSL, config via Docker labels

---

## Next Steps / TODO

- [ ] Implement server-sent events for real-time updates
- [ ] Add proper database migrations (Drizzle Kit push)
- [ ] Implement caching layer for LLM responses
- [ ] Add retry logic for failed tasks with exponential backoff
- [ ] Implement agent swarm with actual concurrent execution
- [ ] Add GitHub Actions auto-deploy (fix SSH timeout)
- [ ] Implement mobile app generation pipeline (Expo SDK 54)
- [ ] Add proper logging and monitoring (not just PM2 logs)
- [ ] Implement database backups (automated SQLite dump)
- [ ] Add rate limiting on API routes
- [ ] Implement proper error boundaries in React components
