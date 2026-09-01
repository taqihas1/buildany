import { NextRequest, NextResponse } from "next/server";
import { getTool } from "@/lib/agent-tools/registry";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const tool = getTool(name);

    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${name}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      code: tool.code,
      createdAt: tool.createdAt,
      useCount: tool.useCount,
      lastUsed: tool.lastUsed,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to get tool", details: err.message },
      { status: 500 }
    );
  }
}
