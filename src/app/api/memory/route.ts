/**
 * MCP Memory API Routes
 * 
 * HTTP endpoints for the memory system.
 * Used by the UI and orchestrator to read/write memories.
 */

import { NextRequest, NextResponse } from "next/server";
import { memoryClient } from "@/lib/mcp-memory-client";

// POST /api/memory/write
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "write": {
        const entry = memoryClient.write({
          content: body.content,
          category: body.category,
          importance: body.importance,
          projectId: body.projectId,
          tags: body.tags,
        });
        return NextResponse.json({ success: true, entry });
      }

      case "search": {
        const results = memoryClient.search({
          query: body.query,
          limit: body.limit,
          projectId: body.projectId,
          category: body.category,
        });
        return NextResponse.json({ success: true, results });
      }

      case "read-hot": {
        const { memories, tokenCount } = memoryClient.readHot(body.maxTokens, body.projectId);
        return NextResponse.json({ success: true, memories, tokenCount });
      }

      case "project-memories": {
        const results = memoryClient.getProjectMemories(body.projectId, body.limit);
        return NextResponse.json({ success: true, results });
      }

      case "delete": {
        const deleted = memoryClient.delete(body.id);
        return NextResponse.json({ success: deleted });
      }

      case "status": {
        const status = memoryClient.status();
        return NextResponse.json({ success: true, status });
      }

      case "consolidate": {
        const result = memoryClient.consolidate(body.archiveThreshold);
        return NextResponse.json({ success: true, result });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Memory API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET /api/memory?projectId=xxx&limit=50
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (projectId) {
      const results = memoryClient.getProjectMemories(projectId, limit);
      return NextResponse.json({ success: true, results });
    }

    // Return status if no project ID
    const status = memoryClient.status();
    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("[Memory API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
