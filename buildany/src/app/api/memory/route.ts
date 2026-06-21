import { NextResponse } from "next/server";

const MEMORY_SERVER_URL = process.env.MEMORY_SERVER_URL || "http://localhost:3001";

// Simple proxy to MCP memory server
// GET  /api/memory          → health check
// POST /api/memory          → proxy to memory server
export async function GET() {
  try {
    const res = await fetch(`${MEMORY_SERVER_URL}/health`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...payload } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing action. Use: write, search, read, context, status" },
        { status: 400 }
      );
    }

    const endpointMap: Record<string, string> = {
      write: "/tools/memory_write",
      search: "/tools/memory_search",
      read: "/tools/memory_read",
      context: "/context",
      status: "/health",
    };

    const endpoint = endpointMap[action];
    if (!endpoint) {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

    const res = await fetch(`${MEMORY_SERVER_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
