# Hostinger Support Ticket — CDN Caching Issue

## Subject
CDN/WAF on base66.cloud serving stale cached content — need to disable or bypass CDN for origin server access

---

## Account Information

- **Domain**: base66.cloud (and www.base66.cloud)
- **Server IP**: 2.25.170.135 (VPS)
- **Issue Type**: CDN / Performance / Caching

---

## Problem Description

My domain `base66.cloud` is behind Hostinger's CDN/WAF, and the CDN is **intercepting all HTTPS traffic** and serving a **stale cached version** of my web application from several days ago. This prevents my users from accessing the current version of the app running on my VPS.

### Evidence

1. **Old content served**: When visiting `https://base66.cloud`, the browser shows an outdated version of the app (from ~June 10) instead of the current build deployed on my VPS (updated today, June 16).

2. **Hard refresh doesn't help**: Tried `Cmd+Shift+R` (hard refresh) in multiple browsers (Safari, Chrome) — still shows old content.

3. **Cache-control headers ignored**: Added `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` and `Surrogate-Control: no-store` to all responses from the origin server, but CDN still serves cached content.

4. **Direct IP access works**: When accessing `http://2.25.170.135:3000` directly (bypassing CDN), the current version loads correctly.

5. **New data not persisted**: Projects created via the web app are stored in CDN's backend cache instead of my VPS database (SQLite), confirming HTTPS traffic never reaches the origin server.

---

## What I Need

**Option A — Disable CDN entirely**: Turn off the CDN/WAF for `base66.cloud` so all traffic goes directly to my VPS at `2.25.170.135`.

**Option B — Purge cache and disable caching**: Clear all cached content and disable future caching for this domain.

**Option C — Configure origin pull**: Ensure CDN always fetches fresh content from origin instead of serving stale cache.

---

## Technical Details

- **Origin server**: Ubuntu 24.04 VPS at `2.25.170.135`
- **Web server**: Next.js app running on port 3000 (via PM2)
- **Reverse proxy**: Traefik (handles SSL via Let's Encrypt)
- **DNS A record**: `base66.cloud` → `2.25.170.135`
- **SSL**: Let's Encrypt certificate (expires 2026-09-03)
- **CDN headers already set** (but ignored):
  ```
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
  Pragma: no-cache
  Expires: 0
  Surrogate-Control: no-store
  ```

---

## Request

Please help me **disable the CDN/WAF caching** for `base66.cloud` so that:
1. HTTPS traffic reaches my origin server directly
2. New deployments are immediately visible to users
3. User data is stored on my VPS, not in CDN cache

If CDN cannot be fully disabled, please provide instructions to bypass it or configure it to always fetch fresh content from origin.

---

## Contact

- **Preferred contact method**: Email
- **Urgency**: High — production app is currently serving stale content to users

---

*Thank you for your assistance!*
