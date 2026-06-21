---
type: knowledge
scope: project
created: 2026-06-21
updated: 2026-06-21
tags: [buildany, project, history]
---

# BuildAny Project History

## What is BuildAny

Browser-based prompt-to-app builder platform. Users describe what they want → AI generates full app (frontend + backend + database) → Everything runs in browser, no local dev environment needed.

Competes with: Base44, Lovable, Replit

## Timeline

### 2026-06-05 — Initial Build
- Next.js 15 + React app deployed on VPS
- Traefik reverse proxy with SSL
- Domain: base66.cloud
- PM2 process manager on port 3000

### 2026-06-08 — API Key Updates
- Updated DeepSeek API key
- Fixed various configuration issues

### 2026-06-12 — CDN Issues Discovered
- HTTPS traffic not reaching VPS
- Hostinger CDN/WAF intercepting requests
- Projects stored in CDN backend, not VPS database
- VPS has correct code but HTTPS never reaches it

### 2026-06-15 — Hermes Integration (Kelly)
- Container: `hermes-gateway` (Nous Research)
- Port: 8642
- Skills: 37 from Addy Osmani + Superpowers repos
- API Bridge: `/api/hermes-chat`
- React Hook: `useHermesChat`
- Tested and working via curl

### 2026-06-20 — Kelly Chat Issues
- **Duplication bug:** Messages repeat 2-3 times in chat panel
- **JSON parse errors:** "Unexpected token 'K', \"Kelly erro\"..."
- **Diagnosis:** Hostinger CDN cache + API error response format issue

### 2026-06-21 — OpenManus Installed
- Location: `/root/OpenManus`
- Python: 3.13.13 (uv venv)
- LLM: DeepSeek API
- First code review: 19 issues found in hermes-chat/route.ts
- Security issues: no auth, no size limits, no timeouts

### 2026-06-21 — OKF Implemented
- VPS knowledge base: `/root/knowledge/`
- Workspace knowledge base: `/root/.openclaw/workspace/knowledge/`
- Structured knowledge format with YAML frontmatter

## Current Status

| Component | Status |
|-----------|--------|
| Homepage | ✅ Live |
| Auth | ✅ Clerk |
| Database | ✅ SQLite + Drizzle |
| Project Creation | ✅ Working |
| Wiki/Research | ✅ Working |
| AI Chat | ⚠️ Duplication + JSON errors |
| Code Review | ✅ OpenManus installed |
| Mobile Preview | ⏳ Evaluating rn-preview |
| Security | ❌ Critical issues found |

## Known Issues

1. **Hostinger CDN cache** — Stale JS files
2. **Kelly chat duplication** — Messages repeat
3. **JSON parse errors** — API returns non-JSON errors
4. **No auth on API** — Publicly accessible endpoints
5. **No request limits** — Size, history, timeout unbounded

## Next Priorities

1. Fix critical security issues (auth, size limits, timeouts)
2. Fix Kelly chat panel (duplication + JSON parse)
3. Resolve CDN cache issues
4. Add mobile preview pipeline
5. Add more automated testing

## Related Knowledge

- [User Profile](user-profile.md)
- [Decision Log](decision-log.md)
