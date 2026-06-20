import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const PUBLIC_API_ROUTES = [
  '/api/generate',
  '/api/orchestrate',
  '/api/decompose',
  '/api/project',
  '/api/test-auth',
  '/api/diag',
  '/api/test-db',
  '/api/test',
  '/api/no-db-test',
  '/api/hermes-chat',
  '/api/hermes-orchestrate',
  '/api/publish-preview',
  '/api/screenshot',
  '/api/auto-test',
  '/api/memory',
];

export default clerkMiddleware(
  async (auth, req) => {
    console.log('Middleware pathname:', req.nextUrl.pathname);
    if (req.nextUrl.pathname.startsWith('/api/')) {
      const isPublic = PUBLIC_API_ROUTES.some(route => 
        req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(route + '/')
      );
      console.log('Middleware isPublic:', isPublic, 'for', req.nextUrl.pathname);
      
      if (!isPublic) {
        const authData = await auth();
        if (!authData.userId) {
          const errorResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          errorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          errorResponse.headers.set('Pragma', 'no-cache');
          errorResponse.headers.set('Expires', '0');
          return errorResponse;
        }
      }
    }
    const response = NextResponse.next();
    
    // Prevent CDN caching - always get fresh content from origin
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    return response;
  },
  { debug: true }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
