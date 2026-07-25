import { NextRequest, NextResponse } from "next/server";

/**
 * ORCHESTRATE - DEPRECATED
 *
 * This route is deprecated. Use /api/kelly instead.
 *
 * The old dual-agent architecture (Kelly plans → Morgan executes) has been
 * replaced with a unified architecture: Kelly is the single brain with rich tools.
 *
 * Redirects all requests to /api/kelly for backward compatibility.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Forward to the unified Kelly endpoint
    const res = await fetch("http://localhost:3000/api/kelly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Orchestration deprecated. Use /api/kelly", details: e.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "deprecated",
    message: "Use /api/kelly instead",
    newEndpoint: "/api/kelly",
    docs: "Kelly is now the single brain with rich tools. No more Morgan vs Kelly context switching.",
  });
}
