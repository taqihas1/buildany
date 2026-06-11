import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const PUBLIC_API_ROUTES = [
  '/api/generate',
  '/api/orchestrate',
  '/api/decompose',
  '/api/test-auth',
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
  matcher: ['/((?!.+\.[\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
