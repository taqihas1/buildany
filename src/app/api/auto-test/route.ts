import { NextResponse } from "next/server";
import { runAutomatedTest, getProjectTestResults } from "@/lib/playwright-testing";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, url } = body;

    if (!projectId || !url) {
      return NextResponse.json(
        { error: "projectId and url are required" },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Run test asynchronously (don't wait for completion)
    const testPromise = runAutomatedTest(projectId, url);

    // Return immediately with test ID
    const test = await testPromise;

    return NextResponse.json({
      success: true,
      testId: test.id,
      status: test.status,
      summary: test.summary,
      screenshots: test.screenshots,
      checks: test.checks,
      startedAt: test.startedAt,
      completedAt: test.completedAt,
    });

  } catch (error) {
    console.error("Auto-test error:", error);
    return NextResponse.json(
      { error: "Failed to run automated test", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const results = getProjectTestResults(projectId);

    return NextResponse.json({
      success: true,
      results: results.map((r) => ({
        id: r.id,
        status: r.status,
        summary: r.summary,
        screenshots: r.screenshots,
        checks: r.checks,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        error: r.error,
      })),
    });

  } catch (error) {
    console.error("Get test results error:", error);
    return NextResponse.json(
      { error: "Failed to get test results" },
      { status: 500 }
    );
  }
}
