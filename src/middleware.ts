import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/project/new",
  "/project/(.*)",
  "/api/hermes-chat",
  "/api/hermes-orchestrate",
  "/api/morgan-generate",
  "/api/morgan-chat",
  "/api/project-chat-init",
  "/api/build",
  "/api/preview/(.*)",
  "/api/project-files",
  "/api/project-status",
  "/api/git",
  "/api/test-post",
  "/api/diag",
  "/_next/static/(.*)",
  "/api/kelly",
  "/api/github-tool",
  "/api/cloudflare-tool",
  "/kelly-test",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\..*).*)"],
};
