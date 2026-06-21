Subject: CDN/Cache Interference - base66.cloud Serving Stale Content (June 14 Cache)

Hello Hostinger Support,

I'm experiencing a critical issue where external traffic to base66.cloud is being served stale cached content from June 14, instead of reaching my VPS Nginx server.

---

ISSUE SUMMARY

My VPS (2.25.170.135) is running Nginx on ports 80/443 with a fresh configuration. However, external requests to https://base66.cloud are returning content cached from June 14, completely bypassing my current server configuration.

---

EVIDENCE

1. SSL CERTIFICATE MISMATCH
   - External test (openssl s_client -connect base66.cloud:443):
     Subject: CN = base66.cloud
     Issuer:  C = US, O = Let's Encrypt, CN = YE1
     Valid:   Jun 13 23:55:35 2026 GMT to Sep 11 2026
   
   - My VPS Nginx config uses:
     /etc/nginx/ssl/base66.cloud.crt (self-signed, valid Jun 14-15 2026)
   
   → The external cert is Let's Encrypt (YE1), NOT my self-signed cert.
   → This proves a proxy/CDN layer is terminating TLS before reaching my server.

2. ZERO EXTERNAL TRAFFIC IN NGINX LOGS
   - Command: tail -20 /var/log/nginx/access.log
   - Result: ONLY 127.0.0.1 (localhost) entries appear
   - No external IP addresses logged at all
   
   → External requests are NOT reaching my Nginx server.

3. STALE CACHED JAVASCRIPT CHUNKS
   - Response contains chunks from June 14 build:
     /_next/static/chunks/2wnf6avrs95iz.js
     /_next/static/chunks/230cajtm4gjqa.js
   
   - These chunks do NOT exist in my current build (verified via ls -la .next/static/chunks/)
   
   → The response is from a cached copy, not my live server.

4. CACHE BUSTING FAILS
   - Tested: https://base66.cloud/chat?v=2&cb=12345
   - Result: Same cached content returned
   - Query parameters are ignored by the cache layer

---

WHAT I NEED

Please do ONE of the following:

Option A (Preferred): Disable CDN/Proxy for base66.cloud
- Switch base66.cloud to "DNS Only" mode
- Or disable the CDN/proxy cache entirely
- This ensures traffic reaches my VPS directly

Option B: Purge ALL Cache
- Purge all cached content for base66.cloud
- Including HTML, JS, CSS, and API responses
- Not just browser cache - server-side CDN cache

Option C: Add chat.base66.cloud Subdomain
- Create A record: chat → 2.25.170.135
- Configure this subdomain to bypass CDN/proxy
- I will serve LobeChat on this subdomain

---

WHAT I'VE VERIFIED ON MY END

✓ Nginx is running and configured correctly
✓ /chat location block proxies to LobeChat on port 3210
✓ Local test (curl https://127.0.0.1/chat) returns LobeChat correctly
✓ PM2 process for BuildAny is running on port 3000
✓ Docker container for LobeChat is running on port 3210
✓ Only external traffic fails - everything works locally

---

SERVER DETAILS

- VPS IP: 2.25.170.135
- Domain: base66.cloud (and www.base66.cloud)
- Nginx ports: 80, 443, 8443
- App port: 3000 (BuildAny)
- LobeChat port: 3210

Please let me know which option works best, or if you need additional information.

Thank you,
[Your Name]
