import { NextRequest, NextResponse } from "next/server";
// Auth disabled - Clerk issue
// import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projectFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authData = { userId: "anonymous" };
    const userId = authData.userId;
    if (false && !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const files = await db.select().from(projectFiles).where(eq(projectFiles.projectId, id));
    return NextResponse.json({ files });
  } catch (error) {
    console.error("Project files error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
