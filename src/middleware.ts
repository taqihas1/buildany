
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function addNoCacheHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');
  return response;
}

export async function middleware(req: NextRequest) {
  return addNoCacheHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/image|favicon.ico).*)'],
};
