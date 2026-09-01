import { NextRequest, NextResponse } from "next/server";
import { generateTool, runTool } from "@/lib/agent-tools/generator";

/**
 * POST /api/agent-tools/generate
 * Generate a new tool on demand
 * Body: { need: string, context?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { need, context } = await req.json();

    if (!need || typeof need !== "string") {
      return NextResponse.json(
        { error: "Field 'need' is required (string describing the capability needed)" },
        { status: 400 }
      );
    }

    const result = await generateTool({
      need,
      context,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tool: result.tool,
      testResult: result.executionResult,
      message: `Created new tool "${result.tool!.name}" for: ${need}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to generate tool", details: err.message },
      { status: 500 }
    );
  }
}
