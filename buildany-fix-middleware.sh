cd /root/buildany

# Create fixed middleware.ts with /api/memory in public routes
cat > src/middleware.ts << 'EOF'
import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const PUBLIC_API_ROUTES = [
  '/api/generate',
  '/api/orchestrate',
  '/api/decompose',
  '/api/project',
  '/api/test-auth',
  '/api/hermes-chat',
  '/api/diag',
  '/api/test',
  '/api/memory',
];

export default clerkMiddleware(
  async (auth, req) => {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      const isPublic = PUBLIC_API_ROUTES.some(route =>
        req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(route + '/')
      );

      if (!isPublic) {
        const authData = await auth();
        if (!authData.userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      }
    }
    return NextResponse.next();
  },
  { debug: true }
);

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
EOF

# Verify
echo "=== middleware.ts (check for /api/memory) ==="
grep -n "memory" src/middleware.ts

# Build and restart
npm run build && pm2 restart buildany --update-env

# Test memory API
echo ""
echo "=== GET /api/memory ==="
curl -s http://localhost:3000/api/memory
echo ""

echo ""
echo "=== POST write ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"write","type":"preference","key":"buildany-test","content":"Memory API works!","priority":"hot","tags":["test"]}'
echo ""
