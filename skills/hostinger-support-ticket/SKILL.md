# Hostinger Support Ticket

When to use: Whenever you have a VPS issue that requires Hostinger support, and you need to draft a clear, evidence-based support ticket.

## What This Skill Does

Drafts a professional, technically detailed support ticket with all the evidence Hostinger support needs to investigate quickly. No more back-and-forth "please provide more info" — you hit them with everything upfront.

## When to Use

- VPS not reachable from internet but works locally
- SSL certificate issues
- CDN/WAF/proxy layer suspected upstream
- Nginx config conflicts
- Port forwarding not working
- DNS not resolving correctly
- Database connection issues that look infrastructure-related

## Step-by-Step

### 1. Collect Evidence

Run these commands and capture the output:

```bash
# VPS identity
echo "=== VPS INFO ==="
echo "Hostname: $(hostname)"
echo "Public IP: $(curl -s ifconfig.me)"
echo "Date: $(date)"

# Process status
echo "=== PROCESSES ==="
pm2 list
ps aux | grep -E "nginx|next|node" | grep -v grep

# Network listeners
echo "=== LISTENING PORTS ==="
ss -tlnp

# Nginx config
echo "=== NGINX CONFIGS ==="
ls -la /etc/nginx/sites-enabled/
cat /etc/nginx/sites-enabled/base66.cloud 2>/dev/null || echo "No base66.cloud vhost"

# Nginx test
sudo nginx -t

# SSL certs
echo "=== SSL CERTS ==="
ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "No letsencrypt certs"
ls -la /etc/nginx/ssl/ 2>/dev/null || echo "No nginx ssl dir"

# DNS resolution
echo "=== DNS ==="
dig +short base66.cloud
dig +short NS base66.cloud

# Test from VPS (localhost)
echo "=== LOCAL TEST ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/no-db-test 2>/dev/null || echo "Port 3001 not responding"

# Test from VPS through nginx
echo "=== NGINX TEST ==="
curl -s -k -o /dev/null -w "%{http_code}" https://127.0.0.1/api/no-db-test -H "Host: base66.cloud" 2>/dev/null || echo "Nginx not responding"

# Test from external
echo "=== EXTERNAL TEST ==="
curl -s -k -o /dev/null -w "%{http_code} %{redirect_url}" https://base66.cloud/api/no-db-test 2>/dev/null || echo "External failed"

# Headers from external
echo "=== EXTERNAL HEADERS ==="
curl -s -k -I https://base66.cloud/api/no-db-test 2>/dev/null | head -20
```

### 2. Verify: Is This Really a Hostinger Issue?

Before opening a ticket, confirm the issue is infrastructure-level:

**Test A: Nginx Stop Test**
```bash
sudo systemctl stop nginx
curl -k -I https://base66.cloud/api/no-db-test 2>/dev/null | head -5
sudo systemctl start nginx
```
- If requests still succeed while nginx is stopped → **Hostinger issue** (upstream proxy)
- If requests fail with connection refused → **VPS issue** (nginx was actually serving them)

**Test B: Debug Header Injection**
```bash
# Add to nginx config:
add_header X-VPS-Debug "my-vps-unique-id" always;
sudo nginx -t && sudo systemctl reload nginx

# Test locally
curl -k -I https://127.0.0.1/api/no-db-test -H "Host: base66.cloud" | grep X-VPS-Debug

# Test externally
curl -k -I https://base66.cloud/api/no-db-test | grep X-VPS-Debug
```
- If local shows header but external doesn't → **Hostinger issue** (traffic bypassing VPS)

### 3. Draft the Ticket

Use this template:

```
Subject: [VPS: <hostname>] <short problem description>

Hello Hostinger Support,

I'm experiencing an issue with my VPS (<hostname>, IP: <public IP>) where <describe problem in one sentence>.

VPS DETAILS:
- Hostname: <hostname>
- Public IP: <public IP>
- Domain: <domain>
- DNS A record: <domain> → <IP>

WHAT I EXPECT:
<describe expected behavior>

WHAT ACTUALLY HAPPENS:
<describe actual behavior with exact error messages>

EVIDENCE:

1. Local test (from VPS itself):
   $ curl http://localhost:<port>/api/test
   <output>

2. Through nginx (from VPS):
   $ curl -k https://127.0.0.1/api/test -H "Host: <domain>"
   <output>

3. External test:
   $ curl -k https://<domain>/api/test
   <output>

4. Nginx config:
   <paste relevant config>

5. SSL certificate:
   <paste cert info or 'openssl s_client -connect' output>

CRITICAL FINDING:
<if you did the nginx stop test, describe the result here>

WHAT I'VE TRIED:
- <list fixes attempted>

REQUEST:
Please investigate and <specific ask: disable proxy layer / fix port forwarding / etc.>

Thank you,
<your name>
```

### 4. Follow-Up

If they reply with wrong diagnosis (e.g., "duplicate nginx configs" when it's actually an upstream proxy):

```
Subject: Re: [VPS: <hostname>] <problem>

Hi <name>,

Thank you for the response. I appreciate the investigation, but I believe the issue is different. Here's additional evidence:

<describe the smoking gun test that disproves their theory>

<paste the specific output showing the discrepancy>

Please escalate this to your infrastructure team if needed. The evidence is clear that <state the actual issue>.

Thank you,
<your name>
```

## Key Rules

- **Always include the VPS hostname and IP** — support needs this to identify your server
- **Always include "before/after" curl outputs** — show what works locally vs what fails externally
- **Be polite but firm with facts** — "I stopped nginx and requests still succeeded" is a fact, not an opinion
- **Don't assume they know your setup** — paste the full nginx config, not just snippets
- **Use the nginx stop test as a smoking gun** — it's the single most convincing piece of evidence

## Example Ticket

```
Subject: [VPS: srv1730121.hstgr.cloud] External HTTPS traffic bypassing VPS nginx

Hello Hostinger Support,

I'm experiencing an issue where external HTTPS requests to my domain
base66.cloud are not reaching my VPS nginx. Instead, they appear to be
handled by an upstream proxy/CDN/WAF layer that serves stale responses.

VPS DETAILS:
- Hostname: srv1730121.hstgr.cloud
- Public IP: 2.25.170.135
- Domain: base66.cloud
- DNS A record: base66.cloud → 2.25.170.135

WHAT I EXPECT:
External requests to https://base66.cloud/api/generate should reach
my Next.js app on the VPS and create a project in the SQLite database.

WHAT ACTUALLY HAPPENS:
External POST returns: {"error":"attempt to write a readonly database"}
This is a stale response from an old build. The current app on the VPS
does not have this error.

EVIDENCE:

1. Local test (from VPS):
   $ curl http://localhost:3001/api/generate -d '{"prompt":"test"}'
   {"success":true,"project":{...}} ✅

2. Through nginx (from VPS):
   $ curl -k https://127.0.0.1/api/generate -H "Host: base66.cloud"
   {"success":true,"project":{...}} ✅

3. External test:
   $ curl -k https://base66.cloud/api/generate -d '{"prompt":"test"}'
   {"error":"attempt to write a readonly database"} ❌

CRITICAL FINDING:
I stopped nginx completely (systemctl stop nginx) and external requests
STILL returned HTTP 200 with responses. This proves an upstream layer is
answering external requests independently of my VPS.

REQUEST:
Please investigate what upstream proxy/CDN/WAF layer is intercepting
traffic for base66.cloud and disable it so requests reach my VPS directly.

Thank you,
Taq
```

## Quick Reference

| Symptom | Evidence to Collect | Likely Cause |
|---------|-------------------|--------------|
| Site works locally but not externally | Nginx stop test, debug header test | Upstream proxy/CDN |
| 502 Bad Gateway | Nginx error log, PM2 status | Wrong proxy port, app not running |
| SSL cert mismatch | `openssl s_client -connect` output | Wrong cert config, upstream SSL |
| Stale/old responses | GET handler test, git status | CDN cache, wrong vhost active |
| Connection timeout | `ss -tlnp`, firewall rules | Port not open, firewall blocking |
