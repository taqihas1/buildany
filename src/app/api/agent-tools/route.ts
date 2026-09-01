import { NextRequest, NextResponse } from "next/server";
import { listTools, getTool, deleteTool } from "@/lib/agent-tools/registry";

/**
 * GET /api/agent-tools
 * List all registered agent tools
 */
export async function GET() {
  try {
    const tools = listTools().map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      createdAt: t.createdAt,
      useCount: t.useCount,
      lastUsed: t.lastUsed,
    }));

    return NextResponse.json({ tools });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to list tools", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agent-tools
 * Body: { name: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Tool name required" }, { status: 400 });
    }

    const deleted = deleteTool(name);
    if (!deleted) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Tool "${name}" deleted` });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to delete tool", details: err.message },
      { status: 500 }
    );
  }
}
