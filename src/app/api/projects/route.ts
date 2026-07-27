import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const allProjects = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.updatedAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      projects: allProjects,
    });
  } catch (error) {
    console.error("[Projects] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
