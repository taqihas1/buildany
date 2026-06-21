# 🎯 ACTIVE TODO — Kelly Takes Over BuildAny

> Last updated: 2026-06-18 20:49
> Status: IN PROGRESS — Hermes HTTP API confirmed working, deploying new route.ts

---

## 🏗️ Big Picture
**Kelly (Hermes) is the brain. BuildAny is the body. No more parallel flows.**

| What exists now | What Kelly should control |
|-----------------|---------------------------|
| ❌ "AI Assistant" toggle in chat | ✅ Only "Kelly/Hermes" |
| ❌ Old orchestrator (`/api/generate`, `/api/orchestrate`) | ✅ Kelly via `/api/hermes-chat` |
| ❌ "Future Release" tab | ✅ "Agents/Tasks" tab |
| ❌ Agents/Tasks created by old orchestrator | ✅ Agents/Tasks created by Kelly via tools |
| ❌ Research → Code → Review → Preview via orchestrator | ✅ Kelly decides sequence, calls tools as needed |

---

## 🚨 DECISION: HTTP API ONLY (2026-06-18)

**Kodee from Hostinger identified two issues:**
1. BuildAny app missing `.next` production build
2. `docker exec` calls timing out with SIGTERM

**Resolution: Use HTTP API exclusively. No more `docker exec`.**

- ✅ Hermes HTTP API confirmed reachable: `curl http://127.0.0.1:8642/health` → `{"status": "ok"}`
- ✅ Gateway container (`hermes-gateway`) exposes port `8642:8642` on host
- ✅ `.env.local` has `HERMES_URL=http://127.0.0.1:8642`
- ✅ Route.ts will use `fetch()` with `Authorization: Bearer` header
- ❌ `docker exec` approach ABANDONED — causes SIGTERM timeouts

---

## ✅ DONE

- [x] Kelly correctly calls `buildany_create_project` tool via `/api/hermes-chat`
- [x] Fixed "Unauthorized" error — replaced HTTP fetch to `/api/projects` with direct Drizzle ORM insert
- [x] Fixed `uuid` package missing — using `crypto.randomUUID()`
- [x] Identified correct schema: `id`, `userId` (notNull), `name`, `description`, `type` (NOT `platform`), `status`, `githubRepo`, `createdAt`, `updatedAt`
- [x] Hermes container healthy (`localhost:8642`, v0.16.0)
- [x] `stream: false` configured (SSE breaks JSON parsing)
- [x] `tool_choice: "auto"` (not `"required"`)
- [x] Kelly's system prompt strengthened: "You MUST use tools... You CANNOT write files directly"
- [x] SQLite permissions fixed (`chown root:root`, `chmod 664`)
- [x] PM2 process stable (`buildany` on port 3000)
- [x] **HTTP API only decision made** — no more `docker exec`, no more SIGTERM timeouts
- [x] Hermes gateway reachable at `http://127.0.0.1:8642` (confirmed via curl)
- [x] Complete route.ts written with full tool-calling + HTTP API support

---

## 🔧 IN PROGRESS

- [ ] **Deploy the new route.ts to VPS**
  - File ready at: `/root/.openclaw/workspace/route-kelly-complete.ts`
  - Need to copy to: `/root/buildany/src/app/api/hermes-chat/route.ts`
  - Include `Authorization: Bearer` header with `HERMES_API_KEY`
  - Then: `npm run build && pm2 restart buildany`

---

## 📋 NEXT STEPS (in order)

### Phase 1: Deploy (NOW)
1. ✅ HTTP API confirmed working on `127.0.0.1:8642`
2. ⏳ Update route.ts to include `Authorization: Bearer` header
3. ⏳ Copy complete route.ts to VPS
4. ⏳ Build: `cd /root/buildany && npm run build`
5. ⏳ Restart: `pm2 restart buildany`

### Phase 2: Verify Tool Calling Works
6. ⏳ Test via curl:
   ```bash
   curl -s -X POST http://localhost:3000/api/hermes-chat \
     -H "Content-Type: application/json" \
     -d '{"message":"Create a new project called TestApp","projectId":"e20859e1-eebb-4bcf-8096-3e2704f1ff79"}'
   ```
7. ⏳ Verify `toolCalls` array contains `buildany_create_project`
8. ⏳ Verify `toolResult` contains real project `id` (not error)

### Phase 3: Wire UI to Kelly
9. ⏳ Check if UI "Build" button calls `/api/hermes-chat` or old `/api/orchestrate`
10. ⏳ If old flow: update to use `useHermesChat` hook
11. ⏳ Verify browser end-to-end at `https://base66.cloud/project/...`

### Phase 4: Architecture Cleanup
12. ⏳ Remove old orchestrator routes (`/api/generate`, `/api/orchestrate`)
13. ⏳ Remove "AI Assistant" toggle — only Kelly
14. ⏳ Rename "Future Release" tab → "Agents/Tasks"
15. ⏳ Add Kelly tools: `buildany_create_agent`, `buildany_create_task`

---

## 🚨 CRITICAL CONTEXT

| Item | Value |
|------|-------|
| **Hermes Gateway** | `http://127.0.0.1:8642` (via `hermes-gateway` container) |
| **Hermes Health** | `curl http://127.0.0.1:8642/health` → `{"status": "ok"}` ✅ |
| **BuildAny API** | `http://localhost:3000/api/hermes-chat` |
| **Model** | `deepseek-chat` via Hermes gateway |
| **API Key** | `820a8890e58dfd3dadd4166cb2be9b8c4db1afce6514110039374ea1da7b84cc` (from `.env.local`) |
| **Test Project** | `e20859e1-eebb-4bcf-8096-3e2704f1ff79` |
| **GitHub Repo** | `github.com:taqihas1/buildany.git` |
| **VPS** | `root@srv1730121`, `base66.cloud` |
| **PM2 Process** | `buildany` |
| **Next.js** | `16.2.7` |

### Docker Port Mappings
```
hermes-gateway: 0.0.0.0:8642->8642/tcp  ← THIS is the HTTP API endpoint
hermes-agent-cvaj-hermes-agent-1: 0.0.0.0:32777->4860/tcp  ← container internal
```

### Schema (projects table)
```
id: text (primaryKey)
userId: text (notNull) ← REQUIRED
name: text (notNull)
description: text
type: text (notNull, default "web") ← NOT "platform"
status: text (default "draft")
githubRepo: text
createdAt: integer (auto)
updatedAt: integer (auto)
```

---

## 📝 NOTES

- **HTTP API ONLY:** No more `docker exec`. Use `fetch()` to `http://127.0.0.1:8642/v1/chat/completions`
- **Authorization Header Required:** Hermes gateway validates API key. Include `Authorization: Bearer ${HERMES_API_KEY}`
- **Build Check:** Always `npm run build` BEFORE `pm2 restart` — catches TS errors early
- **Auth:** Server-side `fetch` to `/api/projects` loses Clerk auth → use direct DB inserts
- **UUID:** Use `crypto.randomUUID()` — `uuid` package NOT installed
- **Type Narrowing:** Always `err instanceof Error ? err.message : 'Unknown error'`
- **Complete route file:** Saved at `/root/.openclaw/workspace/route-kelly-complete.ts`

---

## 🎯 SESSION GOAL

**Get Kelly to successfully create a project via the AI chat window in BuildAny.**

Success = User types "Create a project called X" → Kelly calls `buildany_create_project` → Project appears in database → User sees confirmation in chat.
