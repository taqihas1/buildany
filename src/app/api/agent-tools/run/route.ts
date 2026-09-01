import { NextRequest, NextResponse } from "next/server";
import { runTool } from "@/lib/agent-tools/generator";
import { incrementUseCount } from "@/lib/agent-tools/registry";

/**
 * POST /api/agent-tools/run
 * Execute a registered tool
 * Body: { name: string, parameters: Record<string, any> }
 */
export async function POST(req: NextRequest) {
  try {
    const { name, parameters = {} } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Field 'name' is required (tool name)" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const result = await runTool(name, parameters);
    incrementUseCount(name);

    return NextResponse.json({
      success: result.success,
      output: result.output,
      error: result.error,
      executionTime: Date.now() - startTime,
      tool: name,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to run tool", details: err.message },
      { status: 500 }
    );
  }
}
