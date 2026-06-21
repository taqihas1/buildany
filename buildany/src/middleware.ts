import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { logger } from "./lib/logger";

// Public routes that don't require authentication
const PUBLIC_API_ROUTES = [
  "/api/generate",
  "/api/hermes-chat",
  "/api/preview",
  "/api/memory",        // ← ADD THIS
  "/api/webhook",
  "/api/health",
];

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/about",
  "/pricing",
  "/api/webhook",
  "/api/memory",        // ← ADD THIS (if accessed directly)
];

function isPublicApi(path: string) {
  return PUBLIC_API_ROUTES.some((route) => path.startsWith(route));
}

export default async function middleware(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname;

  // Allow public paths
  if (PUBLIC_PATHS.includes(path)) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (isPublicApi(path)) {
    return NextResponse.next();
  }

  // Check auth for protected routes
  try {
    const session = await auth();
    
    if (!session.userId) {
      logger.warn("Unauthorized access attempt", { path });
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return NextResponse.next();
  } catch (error) {
    logger.error("Auth middleware error", { error, path });
    return new NextResponse(
      JSON.stringify({ error: "Authentication failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
