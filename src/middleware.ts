import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware({
  afterAuth(auth, req, evt) {
    // Handle unauthenticated users
    if (!auth.userId) {
      // For API routes, return 401 JSON instead of redirecting to HTML sign-in page
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // For non-API routes, redirect to sign-in
      const signInUrl = new URL('/sign-in', req.url);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
