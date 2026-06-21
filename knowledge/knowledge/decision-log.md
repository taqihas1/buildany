---
type: knowledge
scope: personal
created: 2026-06-21
updated: 2026-06-21
tags: [decisions, log, history]
---

# Decision Log

## 2026-06-21 — Implement OKF

**Decision:** Create structured knowledge bases using Google's Open Knowledge Format.

**VPS Knowledge Base:**
- Location: `/root/knowledge/`
- Purpose: Shared knowledge for BuildAny project
- Accessible by: OpenManus, Kelly, and all agents

**Workspace Knowledge Base:**
- Location: `/root/.openclaw/workspace/knowledge/`
- Purpose: My personal knowledge about user and projects
- Accessible by: Me (across sessions)

**Rationale:**
- Structured, persistent knowledge
- Survives session restarts
- Shared context between agents
- Portable and versionable

## 2026-06-21 — Install OpenManus

**Decision:** Install OpenManus on VPS for automated code review.

**Location:** `/root/OpenManus`
**LLM:** DeepSeek API
**First result:** 19 issues found in hermes-chat/route.ts

## 2026-06-20 — Kelly Chat Diagnosis

**Decision:** The duplication issue is caused by CDN cache + API error format.

**Evidence:**
- `X-VPS-Debug` header stale after nginx restart
- API returns 502 with plain text error

**Status:** Pending fix

## 2026-06-15 — Hermes Integration

**Decision:** Integrate Hermes (Nous Research) as Kelly AI architect.

**Features:**
- Market research
- Wiki generation
- Code generation
- Code review
- App preview

**Issues:** Chat duplication, JSON parse errors

## 2026-06-05 — BuildAny Launch

**Decision:** Deploy BuildAny on VPS with Next.js + Traefik + PM2.

**Stack:** Next.js 15, React, TypeScript, Tailwind, SQLite, Clerk

## 2026-05-26 — TradePulse Upgrade

**Decision:** Upgrade TradePulse with Portfolio + News screens.

**Status:** Running on iPhone via Expo Go

## Pending Decisions

1. When to fix security issues (auth, size limits, timeouts)
2. How to fix Kelly chat (cache vs code priority)
3. Mobile preview strategy (rn-preview vs custom)
4. Database scaling (SQLite vs PostgreSQL)

## Related Knowledge

- [User Profile](user-profile.md)
- [BuildAny Project](project-buildany.md)
