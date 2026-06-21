# ADR: VPS Infrastructure Reality Check

**Date:** 2026-06-21
**Status:** Accepted

## Context

Critical discovery during troubleshooting: the AI assistant tools run in a **sandboxed environment** with different resources than the actual Hostinger VPS.

## The Problem

- **Sandbox (AI tools):** 40GB disk, 3GB free, wrong Nginx configs, wrong SSL certs
- **Actual VPS (user's server):** 96GB disk, 73GB free, correct configs, Let's Encrypt certs
- **Result:** All "fixes" applied via AI tools were modifying the wrong machine

## VPS Specifications (Actual)

```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        96G   24G   73G  25% /
```

## Key Services on VPS

| Service | Port | Status |
|---------|------|--------|
| BuildAny (Next.js) | 3000 | Running via PM2 |
| Hermes Gateway | 8642 | Docker container |
| LobeChat | 3210 | Docker container |
| Kelly Chat UI | 8002 | Python FastAPI |
| Nginx | 80/443 | Reverse proxy |
| OpenManusWeb | 8001 | Planned |

## Nginx Configuration

- **Config file:** `/etc/nginx/sites-available/base66`
- **SSL:** Let's Encrypt (managed by Hostinger VPS panel)
- **Routes:**
  - `/` → BuildAny (port 3000)
  - `/chat/` → LobeChat (port 3210)
  - `/kelly-chat/` → Kelly Chat (port 8002)
  - `/openmanus/` → OpenManusWeb (port 8001) - planned

## Lesson Learned

**Always verify which machine we're on.** The AI sandbox is NOT the user's VPS. Use manual commands or scripts for VPS changes.

## Related

- See `install-openmanus-web.sh` for automated VPS setup
- See `install-kelly-chat.sh` for lightweight chat UI setup
