# BuildAny HTTPS Debug Plan

## CRITICAL FINDING (2026-06-12)

The HTTPS request to `https://base66.cloud/api/generate` is NOT reaching the VPS. It's going to a DIFFERENT server with an OLD version of the app.

### Evidence:
1. Changed Traefik to route to port 9999 (Python test server) - HTTPS still returned old Next.js response
2. Only one Next.js process running on VPS (port 3001, new code)
3. HTTPS response has old middleware (returns 401 for `/api/test` which is in new code)
4. Ping to `2.25.170.135` from VPS has 233ms RTT (too high for local loopback)
5. VPS actual outbound IP is `47.236.228.58` (Alibaba), DNS points to `2.25.170.135` (Hostinger)

### Root Cause:
Hostinger CDN, WAF, or load balancer is intercepting HTTPS traffic and serving cached/stale responses from an old version of the app.

### Next Steps:
- Ask user to check Hostinger control panel for CDN/WAF settings
- Disable CDN or clear cache if enabled
- Check for "LiteSpeed Cache" or "Hostinger CDN" options
- Once disabled, HTTPS will reach VPS directly

### Commands to check:
```bash
# Check DNS resolution
dig base66.cloud +short A

# Check if CDN is caching (should return 404 or Python response after Traefik change)
curl -s https://base66.cloud/api/test

# Check Traefik config
cat /docker/traefik/dynamic/buildany.yml
```

### Status: WAITING FOR USER TO CHECK HOSTINGER PANEL
