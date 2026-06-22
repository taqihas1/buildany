# BuildAny Security Audit Report
==================================================

## SQL INJECTION
Found: 0 issues
✅ No issues found

## UNSAFE EVAL
Found: 0 issues
✅ No issues found

## PATH TRAVERSAL
Found: 0 issues
✅ No issues found

## MISSING VALIDATION
Found: 15 issues
- /root/buildany/src/app/api/projects/route.ts:66: const body = await req.json();
- /root/buildany/src/app/api/decompose/route.ts:15: const body = await req.json();
- /root/buildany/src/app/api/hermes/route.ts:17: const body = await req.json();
- /root/buildany/src/app/api/skills/route.ts:50: const body = await req.json();
- /root/buildany/src/app/api/deploy/route.ts:17: const body = await req.json();
- /root/buildany/src/app/api/research/route.ts:15: const body = await req.json();
- /root/buildany/src/app/api/generate/route.ts:34: const body = await req.json();
- /root/buildany/src/app/api/generate/stream/route.ts:13: const body = await req.json();
- /root/buildany/src/app/api/test-post/route.ts:4: const body = await req.json().catch(() => ({}));
- /root/buildany/src/app/api/project/[id]/wiki/route.ts:74: const body = await req.json();

## HARDCODED SECRETS
Found: 0 issues
✅ No issues found