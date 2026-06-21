# BuildAny Security Review - June 21, 2026

**Reviewers:** Kelly (AI Architect) + Morgan (Code Specialist)
**Scope:** Full codebase security audit
**Status:** ⚠️ MEDIUM RISK - Multiple issues found

---

## 🔴 CRITICAL FINDINGS

### 1. Missing Authentication on Multiple API Endpoints
**Risk:** HIGH | **Impact:** Unauthorized access to project data, code generation, deployments

The middleware (`middleware.ts`) only adds cache headers — it does NOT enforce authentication. No `clerkMiddleware` or `authMiddleware` is imported.

**Unprotected API routes (NO AUTH CHECKS):**
| Endpoint | Risk |
|----------|------|
| `/api/ard-discover` | Exposes infrastructure catalog |
| `/api/ard-review` | Allows arbitrary file reading |
| `/api/auto-test` | Can trigger tests on any project |
| `/api/diag` | Exposes diagnostic info |
| `/api/hermes-orchestrate` | Can trigger AI orchestration |
| `/api/hermes-tool` | Can execute tools |
| `/api/memory` | Access to memory server |
| `/api/no-db-test` | Test endpoints exposed |
| `/api/publish-preview` | Can publish previews |
| `/api/screenshot` | Can take screenshots |
| `/api/test-db` | Database test endpoints |
| `/api/test-post` | Test endpoints exposed |

**Affected routes with database access:**
- `/api/decompose` - Can read/modify any project
- `/api/deploy` - Can deploy any project
- `/api/generate` - Can generate code for any project
- `/api/research` - Can trigger research for any project

**Fix:** Add `auth()` check from `@clerk/nextjs` to ALL API routes:
```typescript
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest of handler
}
```

---

## 🟠 MEDIUM FINDINGS

### 2. CORS Allowing All Origins
**Risk:** MEDIUM | **File:** `.well-known/ai-catalog.json/route.ts`, `memory-server.ts`

```typescript
'Access-Control-Allow-Origin': '*'
```

This allows any website to make requests to these endpoints.

**Fix:** Restrict to known origins:
```typescript
const allowedOrigins = ['https://base66.cloud', 'https://www.base66.cloud'];
```

### 3. ARD Review Allows Arbitrary File Reading
**Risk:** MEDIUM | **File:** `api/ard-review/route.ts`

The endpoint accepts a `filePath` parameter and reads files using `readFileSync`. No path sanitization:
```typescript
const filePath = join('/root/buildany/src', filePath); // Potentially bypassable
```

An attacker could potentially read:
- `/root/buildany/.env.local` (secrets)
- `/etc/passwd` (if path traversal works)
- Any source file

**Fix:** Validate filePath against whitelist:
```typescript
const allowedDirs = ['/root/buildany/src'];
const resolved = resolve(baseDir, filePath);
if (!allowedDirs.some(dir => resolved.startsWith(dir))) {
  return NextResponse.json({ error: "Invalid path" }, { status: 400 });
}
```

### 4. No Rate Limiting
**Risk:** MEDIUM | **Impact:** API abuse, excessive AI API costs

No rate limiting on:
- `/api/hermes-chat` (can rack up DeepSeek costs)
- `/api/generate` (expensive code generation)
- `/api/research` (expensive research calls)
- `/api/deploy` (can trigger deployments)

**Fix:** Add rate limiting middleware using `rate-limiter-flexible` or Redis.

---

## 🟡 LOW FINDINGS

### 5. Placeholder API Keys in Admin UI
**Risk:** LOW | **Files:** `admin/page.tsx`, `settings/page.tsx`

Placeholder text shows key format (`sk-...`) which leaks the expected format to attackers.

### 6. Error Messages Leak Information
**Risk:** LOW

Some error responses include stack traces or internal paths.

### 7. No HTTPS Enforcement on Internal APIs
**Risk:** LOW

Internal fetches use HTTP (not HTTPS):
```typescript
const catalogRes = await fetch('http://localhost:3000/.well-known/ai-catalog.json');
```

---

## ✅ POSITIVE FINDINGS

| Finding | Status |
|---------|--------|
| No hardcoded secrets in source | ✅ Clean |
| No `eval()` or `new Function()` usage | ✅ Clean |
| No `dangerouslySetInnerHTML` usage | ✅ Clean |
| Uses parameterized queries (Drizzle ORM) | ✅ Safe |
| Admin endpoint has auth check | ✅ Good |
| Environment variables properly used | ✅ Good |

---

## 📋 PRIORITY FIX LIST

### Immediate (This Week)
1. ✅ Add `auth()` checks to ALL API routes
2. ✅ Fix CORS to restrict origins
3. ✅ Sanitize file paths in ARD review

### Short Term (Next Sprint)
4. Add rate limiting to expensive endpoints
5. Add input validation to all API routes
6. Review error messages for info leakage

### Long Term
7. Add security headers (CSP, HSTS)
8. Implement API key rotation
9. Add audit logging for sensitive operations

---

## 🛠️ RECOMMENDED FIX: Add Auth to API Routes

Create a reusable auth wrapper:

```typescript
// src/lib/auth.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function requireAuth(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return userId;
}
```

Then use in each route:
```typescript
export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (userId instanceof NextResponse) return userId; // Auth failed
  
  // ... handler code
}
```

---

*Report generated by Kelly (AI Architect) and Morgan (Code Specialist)*
*Part of BuildAny Security Initiative*
