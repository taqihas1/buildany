import { NextRequest, NextResponse } from "next/server";

/**
 * HERMES-CHAT - DEPRECATED
 *
 * This route is deprecated. Use /api/kelly instead.
 *
 * All chat now goes through the unified Kelly endpoint.
 * Kelly has access to all tools: code generation, security audit, build, deploy, etc.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Map old format to new Kelly format
    const kellyBody = {
      message: body.message || body.query,
      projectId: body.projectId,
      history: body.history || body.messages || [],
    };

    const res = await fetch("http://localhost:3000/api/kelly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kellyBody),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: "hermes-chat deprecated. Use /api/kelly", details: e.message },
      { status: 500 }
    );
  }
}
